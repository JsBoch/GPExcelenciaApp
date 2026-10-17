<?php

namespace Tests\Feature;

use App\Http\Controllers\MonitorFacturacionController;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class ConciliarIntentoNotaFELLocalTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        // Protección explícita: nunca escribir en desarrollo o producción.
        if (
            !app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false
        ) {
            throw new RuntimeException('Prueba FEL bloqueada: entorno/base/configuración incorrectos.');
        }
    }

    private function xmlNota(string $uuidOrigen): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>' .
            '<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" xmlns:cno="http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0">' .
            '<dte:SAT><dte:DTE><dte:DatosEmision>' .
            '<dte:DatosGenerales Tipo="NCRE"/>' .
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
            'estado' => 'INCIERTO',
            'respuesta_certificador' => json_encode($respuesta, JSON_THROW_ON_ERROR),
        ]);

        return [$idintento, $identificador, $respuesta];
    }

    private function guardar(int $idintento, array $respuesta): array
    {
        $controlador = app(MonitorFacturacionController::class);
        $metodo = new \ReflectionMethod($controlador, 'guardarNotaCertificadaFEL');
        return $metodo->invoke($controlador, $idintento, $respuesta);
    }

    private function conciliar(int $idintento): array
    {
        $controlador = app(MonitorFacturacionController::class);
        $metodo = new \ReflectionMethod($controlador, 'conciliarIntentoNotaFELLocal');
        return $metodo->invoke($controlador, $idintento);
    }

    public function test_recupera_certificacion_guardada_sin_http(): void
    {
        [$id, $identificador, $respuesta] = $this->crearIntento();
        $resultado = $this->conciliar($id);
        $this->assertTrue($resultado['valido']);
        $this->assertSame('CERTIFICADO', $resultado['estado']);
        $this->assertDatabaseHas('adm_notas_fel', ['identificador' => $identificador, 'uuid_nota' => $respuesta['uuid']]);
        $this->assertDatabaseHas('adm_fel_intentos', ['idintento' => $id, 'estado' => 'CERTIFICADO']);
    }

    public function test_sin_respuesta_guardada_no_cambia_estado(): void
    {
        [$id, $identificador] = $this->crearIntento();
        DB::table('adm_fel_intentos')->where('idintento', $id)->update(['respuesta_certificador' => null]);
        $resultado = $this->conciliar($id);
        $this->assertFalse($resultado['valido']);
        $this->assertSame('INCIERTO', $resultado['estado']);
        $this->assertDatabaseHas('adm_fel_intentos', ['idintento' => $id, 'estado' => 'INCIERTO', 'idnota' => null]);
        $this->assertSame(0, DB::table('adm_notas_fel')->where('identificador', $identificador)->count());
    }

    public function test_respuesta_incompleta_no_certifica(): void
    {
        [$id, $identificador] = $this->crearIntento();
        DB::table('adm_fel_intentos')->where('idintento', $id)->update([
            'respuesta_certificador' => json_encode(['resultado' => true, 'serie' => 'X'], JSON_THROW_ON_ERROR),
        ]);
        $resultado = $this->conciliar($id);
        $this->assertFalse($resultado['valido']);
        $this->assertDatabaseHas('adm_fel_intentos', ['idintento' => $id, 'estado' => 'INCIERTO', 'idnota' => null]);
        $this->assertSame(0, DB::table('adm_notas_fel')->where('identificador', $identificador)->count());
    }

    public function test_metadatos_inconsistentes_no_guardan_nota(): void
    {
        [$id, $identificador] = $this->crearIntento(true);
        $resultado = $this->conciliar($id);
        $this->assertFalse($resultado['valido']);
        $this->assertDatabaseHas('adm_fel_intentos', ['idintento' => $id, 'estado' => 'INCIERTO', 'idnota' => null]);
        $this->assertSame(0, DB::table('adm_notas_fel')->where('identificador', $identificador)->count());
    }

    public function test_intento_preparado_no_puede_conciliarse(): void
    {
        [$id] = $this->crearIntento();
        DB::table('adm_fel_intentos')->where('idintento', $id)->update(['estado' => 'PREPARADO']);
        $resultado = $this->conciliar($id);
        $this->assertFalse($resultado['valido']);
        $this->assertSame('BLOQUEADO', $resultado['estado']);
        $this->assertDatabaseHas('adm_fel_intentos', ['idintento' => $id, 'estado' => 'PREPARADO']);
    }
}
