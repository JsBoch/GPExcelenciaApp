<?php

namespace Tests\Feature;

use App\Http\Controllers\MonitorFacturacionController;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class GuardarNotaCertificadaFELTest extends TestCase
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

    public function test_guarda_nota_y_certifica_intento_en_una_transaccion(): void
    {
        [$id, $identificador, $respuesta] = $this->crearIntento();
        $resultado = $this->guardar($id, $respuesta);

        $this->assertTrue($resultado['valido']);
        $this->assertFalse($resultado['ya_existia']);
        $this->assertDatabaseHas('adm_notas_fel', [
            'idnota' => $resultado['idnota'],
            'identificador' => $identificador,
            'resultado' => 'S',
            'uuid_nota' => $respuesta['uuid'],
        ]);
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id,
            'estado' => 'CERTIFICADO',
            'idnota' => $resultado['idnota'],
        ]);
    }

    public function test_repetir_misma_respuesta_no_crea_duplicado(): void
    {
        [$id, $identificador, $respuesta] = $this->crearIntento();
        $primera = $this->guardar($id, $respuesta);
        $segunda = $this->guardar($id, $respuesta);

        $this->assertTrue($segunda['ya_existia']);
        $this->assertSame($primera['idnota'], $segunda['idnota']);
        $this->assertSame(1, DB::table('adm_notas_fel')
            ->where('identificador', $identificador)->count());
    }

    public function test_importes_incorrectos_impiden_cualquier_guardado(): void
    {
        [$id, $identificador, $respuesta] = $this->crearIntento(true);

        try {
            $this->guardar($id, $respuesta);
            $this->fail('Se esperaba rechazo por discrepancia entre XML y metadatos.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('Conciliación fiscal rechazada', $e->getMessage());
        }

        $this->assertSame(0, DB::table('adm_notas_fel')
            ->where('identificador', $identificador)->count());
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id,
            'estado' => 'INCIERTO',
            'idnota' => null,
        ]);
    }

    public function test_fallo_de_mysql_revierte_la_nota_y_no_certifica_el_intento(): void
    {
        // El cliente inexistente provoca una violación real de la FK de MySQL.
        // No hace falta alterar esquemas ni utilizar mocks sobre la conexión.
        [$id, $identificador, $respuesta] = $this->crearIntento(false, true);

        try {
            $this->guardar($id, $respuesta);
            $this->fail('Se esperaba un error de llave foránea al insertar la nota.');
        } catch (QueryException $e) {
            $this->assertSame('23000', (string) $e->getCode());
        }

        $this->assertSame(
            0,
            DB::table('adm_notas_fel')->where('identificador', $identificador)->count()
        );
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id,
            'estado' => 'INCIERTO',
            'idnota' => null,
        ]);
    }

    public function test_recupera_guardado_tras_fallo_local_sin_duplicar_nota(): void
    {
        [$id, $identificador, $respuesta] = $this->crearIntento(false, true);

        // Primer intento: falla MySQL; INFILE no se consulta ni reenvía.
        try {
            $this->guardar($id, $respuesta);
            $this->fail('Se esperaba un error de llave foránea.');
        } catch (QueryException $e) {
            $this->assertSame('23000', (string) $e->getCode());
        }

        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id,
            'estado' => 'INCIERTO',
            'idnota' => null,
        ]);

        // Exclusivamente en esta base ficticia: corregir el ID referencial
        // que se introdujo deliberadamente mal para simular el fallo.
        // Nunca editar metadatos de intentos fiscales reales de este modo.
        $meta = json_decode(
            DB::table('adm_fel_intentos')
                ->where('idintento', $id)
                ->value('metadatos_fiscales'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );
        $meta['idcliente'] = 900001;

        DB::table('adm_fel_intentos')->where('idintento', $id)->update([
            'metadatos_fiscales' => json_encode($meta, JSON_THROW_ON_ERROR),
        ]);

        // Recuperar a partir de la misma respuesta almacenada.
        $respuestaPersistida = json_decode(
            DB::table('adm_fel_intentos')
                ->where('idintento', $id)
                ->value('respuesta_certificador'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        $resultado = $this->guardar($id, $respuestaPersistida);

        $this->assertTrue($resultado['valido']);
        $this->assertFalse($resultado['ya_existia']);
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id,
            'estado' => 'CERTIFICADO',
            'idnota' => $resultado['idnota'],
        ]);
        $this->assertSame(
            1,
            DB::table('adm_notas_fel')->where('identificador', $identificador)->count()
        );

        $repeticion = $this->guardar($id, $respuestaPersistida);
        $this->assertTrue($repeticion['ya_existia']);
        $this->assertSame($resultado['idnota'], $repeticion['idnota']);
    }

}