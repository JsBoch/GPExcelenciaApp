<?php

namespace Tests\Feature;

use App\Http\Controllers\MonitorFacturacionController;
use Carbon\Carbon;
use DOMDocument;
use DOMXPath;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class NCREConstructorRealFrase922Test extends TestCase
{
    use DatabaseTransactions;

    private const COTIZACION = 900001;
    private const NS_DTE = 'http://www.sat.gob.gt/dte/fel/0.2.0';
    private const NS_CNO = 'http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0';

    protected function setUp(): void
    {
        parent::setUp();

        if (
            !app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false ||
            config('services.infile.notas_envio_habilitado', false) !== false
        ) {
            throw new RuntimeException(
                'Prueba del constructor NCRE bloqueada: entorno inseguro.'
            );
        }

        $this->assertDatabaseHas('adm_cotizacion', [
            'idcotizacion' => self::COTIZACION,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public static function escenarios(): array
    {
        return [
    'NCRE vencida' => [
        '2026-08-28',
        '2026-11-10 10:00:00',
        true,
    ],
    'NCRE ultimo dia' => [
        '2026-10-05',
        '2026-12-05 10:00:00',
        false,
    ],
    'NCRE antes vigencia' => [
        '2026-08-28',
        '2026-11-09 10:00:00',
        false,
    ],
];
    }

    private function xmlOrigen(string $uuid, string $fecha): string
    {
        $uuid = htmlspecialchars(
            $uuid,
            ENT_QUOTES | ENT_XML1,
            'UTF-8'
        );

        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<dte:GTDocumento xmlns:dte="' . self::NS_DTE . '">'
            . '<dte:SAT><dte:DTE><dte:DatosEmision>'
            . '<dte:DatosGenerales Tipo="FCAM" CodigoMoneda="GTQ" '
            . 'FechaHoraEmision="' . $fecha . 'T09:00:00"/>'
            . '<dte:Receptor IDReceptor="TEST-NO-VALIDO" '
            . 'NombreReceptor="CLIENTE FICTICIO">'
            . '<dte:DireccionReceptor>'
            . '<dte:Direccion>DIRECCION DE PRUEBA</dte:Direccion>'
            . '<dte:CodigoPostal>01001</dte:CodigoPostal>'
            . '<dte:Municipio>GUATEMALA</dte:Municipio>'
            . '<dte:Departamento>GUATEMALA</dte:Departamento>'
            . '<dte:Pais>GT</dte:Pais>'
            . '</dte:DireccionReceptor>'
            . '</dte:Receptor>'
            . '<dte:Items>'
            . '<dte:Item NumeroLinea="1" BienOServicio="S">'
            . '<dte:Cantidad>1</dte:Cantidad>'
            . '<dte:UnidadMedida>UNI</dte:UnidadMedida>'
            . '<dte:Descripcion>Servicio de prueba</dte:Descripcion>'
            . '<dte:PrecioUnitario>215.00</dte:PrecioUnitario>'
            . '<dte:Precio>215.00</dte:Precio>'
            . '<dte:Descuento>0.00</dte:Descuento>'
            . '<dte:Impuestos><dte:Impuesto>'
            . '<dte:NombreCorto>IVA</dte:NombreCorto>'
            . '<dte:CodigoUnidadGravable>1</dte:CodigoUnidadGravable>'
            . '<dte:MontoGravable>191.97</dte:MontoGravable>'
            . '<dte:MontoImpuesto>23.03</dte:MontoImpuesto>'
            . '</dte:Impuesto></dte:Impuestos>'
            . '<dte:Total>215.00</dte:Total>'
            . '</dte:Item></dte:Items>'
            . '<dte:Totales><dte:TotalImpuestos>'
            . '<dte:TotalImpuesto NombreCorto="IVA" '
            . 'TotalMontoImpuesto="23.03"/>'
            . '</dte:TotalImpuestos>'
            . '<dte:GranTotal>215.00</dte:GranTotal>'
            . '</dte:Totales>'
            . '</dte:DatosEmision></dte:DTE>'
            . '<dte:Certificacion>'
            . '<dte:NumeroAutorizacion>' . $uuid
            . '</dte:NumeroAutorizacion>'
            . '</dte:Certificacion>'
            . '</dte:SAT></dte:GTDocumento>';
    }

    #[DataProvider('escenarios')]
    public function test_constructor_real_ncre(
        string $fechaOrigen,
        string $fechaNota,
        bool $esperaFrase
    ): void {
        Carbon::setTestNow(
            Carbon::parse($fechaNota, 'America/Guatemala')
        );

        $uuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

        DB::table('adm_facturacion')->insert([
            'idcotizacion' => self::COTIZACION,
            'resultado' => 'S',
            'estado' => 1,
            'uuid' => $uuid,
            'serie' => 'TEST',
            'numero' => '100',
            'total_factura' => 215.00,

            // Intencionalmente distinta de la fecha fiscal.
            'fecha_certificacion' => '2026-10-27 12:00:00',

            'xml_certificado' => $this->xmlOrigen(
                $uuid,
                $fechaOrigen
            ),
        ]);

        $controlador = app(MonitorFacturacionController::class);

        $metodo = new \ReflectionMethod(
            $controlador,
            'construirXMLNotaAjuste'
        );

        $resultado = $metodo->invoke(
            $controlador,
            self::COTIZACION,
            'NCRE',
            'AJUSTE FICTICIO PARA PRUEBA',
            50.00,
            false
        );

        $this->assertNotNull($resultado);
        $this->assertArrayHasKey('xml', $resultado);
        $this->assertArrayHasKey('meta', $resultado);

        $doc = new DOMDocument();

        $this->assertTrue(
            $doc->loadXML($resultado['xml'])
        );

        $xpath = new DOMXPath($doc);
        $xpath->registerNamespace('dte', self::NS_DTE);
        $xpath->registerNamespace('cno', self::NS_CNO);

        $fraseHabitual = $xpath->query(
            '//dte:Frases/dte:Frase'
            . '[@TipoFrase="1"][@CodigoEscenario="1"]'
        )->length;

        $frase922 = $xpath->query(
            '//dte:Frases/dte:Frase'
            . '[@TipoFrase="9"][@CodigoEscenario="22"]'
        )->length;

        $this->assertSame(1, $fraseHabitual);
        $this->assertSame(
            $esperaFrase ? 1 : 0,
            $frase922
        );

        $referencia = $xpath->query(
            '//cno:ReferenciasNota'
        )->item(0);

        $this->assertNotNull($referencia);

        $this->assertSame(
            $fechaOrigen,
            $referencia->getAttribute(
                'FechaEmisionDocumentoOrigen'
            )
        );

        $this->assertSame(
            $uuid,
            $referencia->getAttribute(
                'NumeroAutorizacionDocumentoOrigen'
            )
        );

        $this->assertSame(
            $fechaOrigen,
            $resultado['meta']['origen']['fecha_emision']
        );
    }
}
