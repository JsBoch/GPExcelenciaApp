<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

/**
 * Pruebas HTTP de NCRE/NDEB. Solo entorno testing, base aislada y HTTP simulado.
 * Gate::define en las pruebas autorizadas simula explícitamente el permiso;
 * NO sustituye las pruebas de asignación real de perfiles y opciones.
 */
class TransmitirNotaFELHttpTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (
            !app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false ||
            config('services.infile.fcam_intentos_habilitado', false) !== false ||
            config('services.infile.notas_envio_habilitado', false) !== false
        ) {
            throw new RuntimeException('Prueba HTTP de notas bloqueada: entorno/base/banderas incorrectos.');
        }

        // Nunca permitir peticiones externas reales en esta clase.
        // Cada prueba que necesite HTTP registra su propio fake.
        Http::preventStrayRequests();
        config()->set('services.infile.url', 'https://fel-test.invalid/transaccion');
        foreach (['usuario_api', 'llave_api', 'usuario_firma', 'llave_firma'] as $clave) {
            config()->set("services.infile.{$clave}", 'TEST-SIN-VALIDEZ-FISCAL');
        }
    }

    private function usuarioConPerfil(string $perfil = 'ADMINISTRADOR'): User
    {
        $idPerfil = DB::table('perfiles')->where('nombre', $perfil)->value('id_perfil');
        if (!$idPerfil) {
            throw new RuntimeException("No existe perfil {$perfil} en base testing.");
        }

        $id = DB::table('users')->insertGetId([
            'name' => 'nota-test-' . Str::lower(Str::random(10)),
            'email' => (string) Str::uuid() . '@example.invalid',
            'password' => bcrypt((string) Str::random(32)),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('perfil_usuario')->insert(['user_id' => $id, 'perfil_id' => $idPerfil]);
        return User::findOrFail($id);
    }

    private function autorizarSimuladamente(): void
    {
        Gate::define('fel-transmitir-notas', fn (User $user) => true);
        Sanctum::actingAs($this->usuarioConPerfil());
    }

    private function url(int $id): string
    {
        return "/api/fel/notas/intentos/{$id}/transmitir";
    }

    public function test_sin_autenticacion_devuelve_401_sin_http(): void
    {
        [$id] = $this->crearIntento();
        $this->postJson($this->url($id))->assertStatus(401);
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id, 'estado' => 'PREPARADO', 'fecha_envio' => null,
        ]);
        Http::assertNothingSent();
    }

    public function test_ventas_sin_permiso_devuelve_403_sin_http(): void
    {
        [$id] = $this->crearIntento();
        Sanctum::actingAs($this->usuarioConPerfil('VENTAS'));
        $this->postJson($this->url($id))->assertStatus(403);
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id, 'estado' => 'PREPARADO', 'fecha_envio' => null,
        ]);
        Http::assertNothingSent();
    }

    public function test_con_permiso_y_bandera_apagada_devuelve_503_sin_http(): void
    {
        [$id] = $this->crearIntento();
        $this->autorizarSimuladamente();
        $this->postJson($this->url($id))
            ->assertStatus(503)
            ->assertJsonPath('estado', 'BLOQUEADO');
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id, 'estado' => 'PREPARADO', 'fecha_envio' => null,
        ]);
        Http::assertNothingSent();
    }

    public function test_estado_procesado_no_puede_reenviar(): void
    {
        [$id] = $this->crearIntento();
        DB::table('adm_fel_intentos')->where('idintento', $id)->update(['estado' => 'INCIERTO']);
        $this->autorizarSimuladamente();
        config()->set('services.infile.notas_envio_habilitado', true);
        $this->postJson($this->url($id))
            ->assertStatus(409)
            ->assertJsonPath('estado', 'INCIERTO');
        Http::assertNothingSent();
    }

    public function test_certificacion_simulada_devuelve_uuid_y_segundo_envio_es_bloqueado(): void
    {
        [$id, $identificador, $respuesta] = $this->crearIntento();
        $this->autorizarSimuladamente();
        config()->set('services.infile.notas_envio_habilitado', true);
        Http::fake(['https://fel-test.invalid/*' => Http::response(
            $respuesta, 200, ['Content-Type' => 'application/json']
        )]);

        $this->postJson($this->url($id))
            ->assertOk()
            ->assertJsonPath('estado', 'CERTIFICADO')
            ->assertJsonPath('uuid', $respuesta['uuid']);
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id, 'estado' => 'CERTIFICADO', 'uuid' => $respuesta['uuid'],
        ]);
        $this->assertDatabaseHas('adm_notas_fel', [
            'identificador' => $identificador,
            'uuid_nota' => $respuesta['uuid'],
            'resultado' => 'S',
        ]);
        Http::assertSentCount(1);

        $this->postJson($this->url($id))->assertStatus(409);
        Http::assertSentCount(1);
        $this->assertSame(1, DB::table('adm_notas_fel')
            ->where('identificador', $identificador)->count());
    }

    private function xmlNota(string $uuidOrigen): string
    
        {
    
            return '<?xml version="1.0" encoding="UTF-8"?>' .
    
                '<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" xmlns:cno="http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0">' .
    
                '<dte:SAT><dte:DTE><dte:DatosEmision>' .
    
                '<dte:DatosGenerales Tipo="NCRE" FechaHoraEmision="' . now()->format('Y-m-d\TH:i:s') . '"/>' .
    
                '<dte:Receptor IDReceptor="TEST-NO-VALIDO"/>' .
    
                '<dte:Items><dte:Item NumeroLinea="1">' .
    
                '<dte:Impuestos><dte:Impuesto><dte:NombreCorto>IVA</dte:NombreCorto>' .
    
                '<dte:MontoGravable>191.97</dte:MontoGravable>' .
    
                '<dte:MontoImpuesto>23.03</dte:MontoImpuesto>' .
    
                '</dte:Impuesto></dte:Impuestos><dte:Total>215.00</dte:Total>' .
    
                '</dte:Item></dte:Items><dte:Totales><dte:TotalImpuestos>' .
    
                '<dte:TotalImpuesto NombreCorto="IVA" TotalMontoImpuesto="23.03"/>' .
    
                '</dte:TotalImpuestos><dte:GranTotal>215.00</dte:GranTotal></dte:Totales>' .
    
                '<dte:Complementos><cno:ReferenciasNota NumeroAutorizacionDocumentoOrigen="' .
    
                htmlspecialchars($uuidOrigen, ENT_QUOTES | ENT_XML1, 'UTF-8') .
    
                '"/></dte:Complementos>' .
    
                '</dte:DatosEmision></dte:DTE></dte:SAT></dte:GTDocumento>';
    
        }
    
    private function crearIntento(bool $alterarMeta = false, bool $clienteInvalido = false): array
    
        {
    
            $uuidOrigen = (string) Str::uuid();
    
            $identificador = (string) Str::uuid();
    
            $xml = $this->xmlNota($uuidOrigen);
    
    
    
           $idfactura = DB::table('adm_facturacion')->insertGetId([
    
        'idcotizacion' => 900001,
    
        'resultado' => 'S',
    
        'estado' => 1,
    
        'uuid' => $uuidOrigen,
    
        'serie' => 'TEST',
    
        'numero' => '100',
    
        'total_factura' => 215,
    
        'fecha_certificacion' => now(),
    
    
    
        // XML certificado ficticio de la factura original.
        'xml_certificado' => $this->xmlOrigen($uuidOrigen),
    
    ]);
    
    
    
            $meta = [
    
                'idcliente' => $clienteInvalido ? 999999999 : 900001,
    
                'idfactura_origen' => $idfactura,
    
                'tipo' => 'NCRE',
    
                'motivo' => 'SIMULACION AUTOMATIZADA - NO FISCAL',
    
                'monto_total' => $alterarMeta ? 216 : 215,
    
                'monto_gravable' => 191.97,
    
                'monto_impuesto' => 23.03,
    
                'exento_iva' => 'N',
    
                'timbre_prensa_base' => 0,
    
                'timbre_prensa_porcentaje' => 0,
    
                'timbre_prensa_monto' => 0,
    
                'receptor' => [
    
                    'numero' => 'TEST-NO-VALIDO',
    
                    'tipo' => 'NIT',
    
                    'tipo_especial' => null,
    
                    'nombre' => 'CLIENTE FICTICIO FEL',
    
                    'email' => '',
    
                    'direccion' => 'DIRECCION DE PRUEBA',
    
                ],
    
                'origen' => [
    
                    'uuid' => $uuidOrigen,
    
                    'serie' => 'TEST',
    
                    'numero' => '100',
    
                    'fecha_emision' => now()->toDateString(),
    
                ],
    
            ];
    
    
    
            $respuesta = [
    
                'resultado' => true,
    
                'uuid' => (string) Str::uuid(),
    
                'serie' => 'NOTA-TEST',
    
                'numero' => '200',
    
                'fecha' => now()->toDateTimeString(),
    
                'xml_certificado' => 'BASE64-SIMULADO-NO-VALIDO',
    
            ];
    
    
    
            $idintento = DB::table('adm_fel_intentos')->insertGetId([
    
                'idcotizacion' => 900001,
    
                'tipo_documento' => 'NCRE',
    
                'uuid_origen' => $uuidOrigen,
    
                'identificador' => $identificador,
    
                'xml_hash' => hash('sha256', $xml),
    
                'xml_enviado' => $xml,
    
                'metadatos_fiscales' => json_encode($meta, JSON_THROW_ON_ERROR),
    
                'estado' => 'PREPARADO',
    
                'respuesta_certificador' => null,            
    
            ]);
    
    
    
            return [$idintento, $identificador, $respuesta];
    
        }
    
    private function xmlOrigen(string $uuid, float $importe = 215.00): string
    
        {
    
            $total = number_format($importe, 2, '.', '');
    
            $uuidSeguro = htmlspecialchars($uuid, ENT_QUOTES | ENT_XML1, 'UTF-8');
    
    
    
            return '<?xml version="1.0" encoding="UTF-8"?>'
    
                . '<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0">'
    
                . '<dte:SAT><dte:DTE><dte:DatosEmision>'
    
                . '<dte:Receptor IDReceptor="TEST-NO-VALIDO" NombreReceptor="CLIENTE FICTICIO FEL"/>'
    
                . '<dte:Items><dte:Item NumeroLinea="1" BienOServicio="S">'
    
                . '<dte:Cantidad>1</dte:Cantidad><dte:UnidadMedida>UNI</dte:UnidadMedida>'
    
                . '<dte:Descripcion>Servicio ficticio</dte:Descripcion>'
    
                . '<dte:PrecioUnitario>' . $total . '</dte:PrecioUnitario>'
    
                . '<dte:Precio>' . $total . '</dte:Precio><dte:Descuento>0.00</dte:Descuento>'
    
                . '<dte:Total>' . $total . '</dte:Total>'
    
                . '</dte:Item></dte:Items>'
    
                . '<dte:Totales><dte:GranTotal>' . $total . '</dte:GranTotal></dte:Totales>'
    
                . '</dte:DatosEmision></dte:DTE>'
    
                . '<dte:Certificacion><dte:NumeroAutorizacion>' . $uuidSeguro
    
                . '</dte:NumeroAutorizacion></dte:Certificacion>'
    
                . '</dte:SAT></dte:GTDocumento>';
    
        }
}
