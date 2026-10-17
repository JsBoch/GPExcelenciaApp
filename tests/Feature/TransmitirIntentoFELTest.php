<?php

namespace Tests\Feature;

use App\Http\Controllers\MonitorFacturacionController;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class TransmitirIntentoFELTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (
            !app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false
        ) {
            throw new RuntimeException('Prueba HTTP FEL bloqueada: entorno/base/configuración incorrectos.');
        }

        // NUNCA permitir peticiones HTTP reales desde esta clase.
        Http::preventStrayRequests();

        // Habilitar solo la bandera del servicio dentro de esta prueba.
        // URL ficticia + credenciales sin validez fiscal.
        config()->set('services.infile.envio_intentos_habilitado', true);
        config()->set('services.infile.url', 'https://fel-test.invalid/transaccion');
        config()->set('services.infile.usuario_api', 'TEST');
        config()->set('services.infile.llave_api', 'TEST');
        config()->set('services.infile.usuario_firma', 'TEST');
        config()->set('services.infile.llave_firma', 'TEST');
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

    private function guardar(int $idintento, array $respuesta): array
    {
        $controlador = app(MonitorFacturacionController::class);
        $metodo = new \ReflectionMethod($controlador, 'guardarNotaCertificadaFEL');
        return $metodo->invoke($controlador, $idintento, $respuesta);
    }


    private function transmitir(int $idintento): array
    {
        $controlador = app(MonitorFacturacionController::class);
        $metodo = new \ReflectionMethod($controlador, 'transmitirIntentoFEL');
        return $metodo->invoke($controlador, $idintento, 'NCRE');
    }

    public function test_certificacion_simulada_guarda_nota_y_no_reenvia(): void
    {
        [$id, $identificador, $respuesta] = $this->crearIntento();

       Http::fake([
    'https://fel-test.invalid/*' => Http::response(
        $respuesta,
        200,
        ['Content-Type' => 'application/json']
    ),
]);
        $this->assertTrue($respuesta['resultado']);
$this->assertNotEmpty($respuesta['uuid']);
$this->assertNotEmpty($respuesta['serie']);
$this->assertNotEmpty($respuesta['numero']);
        // $resultado = $this->transmitir($id);

        // $this->assertTrue($resultado['valido']);
        $resultado = $this->transmitir($id);

$this->assertTrue($resultado['valido']);

        $this->assertSame('CERTIFICADO', $resultado['estado']);
        $this->assertDatabaseHas('adm_notas_fel', [
            'identificador' => $identificador,
            'uuid_nota' => $respuesta['uuid'],
            'resultado' => 'S',
        ]);
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id,
            'estado' => 'CERTIFICADO',
            'uuid' => $respuesta['uuid'],
        ]);
        Http::assertSentCount(1);
        Http::assertSent(fn ($request) =>
            $request->hasHeader('Identificador', $identificador)
        );

        $segundo = $this->transmitir($id);
        $this->assertFalse($segundo['valido']);
        $this->assertSame('BLOQUEADO', $segundo['estado']);
        Http::assertSentCount(1);
        $this->assertSame(1, DB::table('adm_notas_fel')
            ->where('identificador', $identificador)->count());
    }

    public function test_respuesta_422_es_incierta_y_no_reenvia(): void
    {
        [$id, $identificador] = $this->crearIntento();
        Http::fake([
    'https://fel-test.invalid/*' => Http::response([
        'resultado' => false,
        'descripcion' => 'RECHAZO SIMULADO',
    ], 422),
]);

        $resultado = $this->transmitir($id);
        $this->assertFalse($resultado['valido']);
        $this->assertSame('INCIERTO', $resultado['estado']);
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id,
            'estado' => 'INCIERTO',
            'idnota' => null,
        ]);
        $this->assertSame(0, DB::table('adm_notas_fel')
            ->where('identificador', $identificador)->count());
        $this->assertNotEmpty(DB::table('adm_fel_intentos')
            ->where('idintento', $id)->value('respuesta_certificador'));
        Http::assertSentCount(1);

        $segundo = $this->transmitir($id);
        $this->assertSame('BLOQUEADO', $segundo['estado']);
        Http::assertSentCount(1);
    }

    
public function test_timeout_simulado_congela_intento_sin_reenvio(): void
{
    [$id, $identificador] = $this->crearIntento();

    $llamadas = 0;

    Http::fake([
        'https://fel-test.invalid/*' => function () use (&$llamadas) {
            $llamadas++;

            throw new ConnectionException('TIMEOUT SIMULADO');
        },
    ]);

    $resultado = $this->transmitir($id);

    $this->assertFalse($resultado['valido']);
    $this->assertSame('INCIERTO', $resultado['estado']);
    $this->assertSame(1, $llamadas);

    $this->assertDatabaseHas('adm_fel_intentos', [
        'idintento' => $id,
        'estado' => 'INCIERTO',
        'idnota' => null,
    ]);

    $this->assertSame(
        0,
        DB::table('adm_notas_fel')
            ->where('identificador', $identificador)
            ->count()
    );

    // Una segunda ejecución debe bloquearse sin realizar otro envío.
    $segundo = $this->transmitir($id);

    $this->assertFalse($segundo['valido']);
    $this->assertSame('BLOQUEADO', $segundo['estado']);

    // El callback únicamente debe haberse ejecutado una vez.
    $this->assertSame(1, $llamadas);
}


    public function test_certificacion_recibida_pero_guardado_mysql_falla(): void
    {
        [$id, $identificador, $respuesta] = $this->crearIntento(false, true);
        Http::fake(['fel-test.invalid/*' => Http::response($respuesta, 200)]);

        $resultado = $this->transmitir($id);
        $this->assertFalse($resultado['valido']);
        $this->assertSame('INCIERTO', $resultado['estado']);
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id,
            'estado' => 'INCIERTO',
            'idnota' => null,
        ]);
        $this->assertSame(0, DB::table('adm_notas_fel')
            ->where('identificador', $identificador)->count());
        $this->assertNotEmpty(DB::table('adm_fel_intentos')
            ->where('idintento', $id)->value('respuesta_certificador'));
        Http::assertSentCount(1);

        $segundo = $this->transmitir($id);
        $this->assertSame('BLOQUEADO', $segundo['estado']);
        Http::assertSentCount(1);
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
