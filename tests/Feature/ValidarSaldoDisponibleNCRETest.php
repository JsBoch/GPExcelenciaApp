<?php

namespace Tests\Feature;

use App\Http\Controllers\MonitorFacturacionController;
use App\Models\AdmFacturacion;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class ValidarSaldoDisponibleNCRETest extends TestCase
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
            throw new RuntimeException('Pruebas de saldo NCRE bloqueadas: entorno/base/configuración incorrectos.');
        }
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

    private function crearFactura(int $estado = 1): AdmFacturacion
    {
        $uuid = (string) Str::uuid();
        $id = DB::table('adm_facturacion')->insertGetId([
            'idcotizacion' => 900001,
            'resultado' => 'S',
            'estado' => $estado,
            'uuid' => $uuid,
            'serie' => 'TEST',
            'numero' => '100',
            'fecha_certificacion' => now(),
            'total_factura' => 215.00,
            'xml_certificado' => $this->xmlOrigen($uuid),
        ]);

        return AdmFacturacion::where('idfactura', $id)->firstOrFail();
    }

    private function validar(AdmFacturacion $factura, float $monto): array
    {
        $metodo = new \ReflectionMethod(app(MonitorFacturacionController::class), 'validarSaldoDisponibleNCRE');
        return $metodo->invoke(app(MonitorFacturacionController::class), $factura, $monto);
    }

    private function crearNotaCertificada(AdmFacturacion $factura, float $monto): void
    {
        DB::table('adm_notas_fel')->insert([
            'idcotizacion' => 900001,
            'idcliente' => 900001,
            'tipo' => 'NCRE',
            'resultado' => 'S',
            'uuid_origen' => $factura->uuid,
            'uuid_nota' => (string) Str::uuid(),
            'identificador' => (string) Str::uuid(),
            'monto_total' => $monto,
        ]);
    }

    private function crearIntentoPendiente(AdmFacturacion $factura, string $estado, string $tipo = 'NCRE'): void
    {
        DB::table('adm_fel_intentos')->insert([
            'idcotizacion' => 900001,
            'tipo_documento' => $tipo,
            'uuid_origen' => $factura->uuid,
            'identificador' => (string) Str::uuid(),
            'xml_hash' => hash('sha256', 'INTENTO-FICTICIO-' . Str::uuid()),
            'estado' => $estado,
        ]);
    }

    public function test_factura_sin_notas_tiene_disponible_215(): void
    {
        $resultado = $this->validar($this->crearFactura(), 215.00);
        $this->assertTrue($resultado['valido'], $resultado['mensaje'] ?? '');
        $this->assertEqualsWithDelta(215.00, $resultado['total_factura'], 0.001);
        $this->assertEqualsWithDelta(215.00, $resultado['disponible'], 0.001);
    }

    public function test_nota_certificada_100_reduce_disponible_a_115(): void
    {
        $factura = $this->crearFactura();
        $this->crearNotaCertificada($factura, 100.00);

        $resultado = $this->validar($factura, 115.00);
        $this->assertTrue($resultado['valido'], $resultado['mensaje'] ?? '');
        $this->assertEqualsWithDelta(100.00, $resultado['total_acreditado'], 0.001);
        $this->assertEqualsWithDelta(115.00, $resultado['disponible'], 0.001);
    }

    public function test_nota_116_es_rechazada_si_solo_quedan_115(): void
    {
        $factura = $this->crearFactura();
        $this->crearNotaCertificada($factura, 100.00);

        $resultado = $this->validar($factura, 116.00);
        $this->assertFalse($resultado['valido']);
        $this->assertEqualsWithDelta(115.00, $resultado['disponible'], 0.001);
        $this->assertStringContainsString('supera', $resultado['mensaje']);
    }

    public function test_intento_incierto_impide_nueva_ncre(): void
    {
        $factura = $this->crearFactura();
        $this->crearIntentoPendiente($factura, 'INCIERTO');

        $resultado = $this->validar($factura, 50.00);
        $this->assertFalse($resultado['valido']);
        $this->assertCount(1, $resultado['intentos_pendientes']);
    }

    public function test_intento_preparado_de_ndeb_tambien_bloquea(): void
    {
        $factura = $this->crearFactura();
        $this->crearIntentoPendiente($factura, 'PREPARADO', 'NDEB');

        $resultado = $this->validar($factura, 50.00);
        $this->assertFalse($resultado['valido']);
        $this->assertCount(1, $resultado['intentos_pendientes']);
    }

    public function test_factura_anulada_no_permite_ncre(): void
    {
        $resultado = $this->validar($this->crearFactura(0), 50.00);
        $this->assertFalse($resultado['valido']);
        $this->assertStringContainsString('vigente', $resultado['mensaje']);
    }

    public function test_preparar_intento_rechaza_saldo_insuficiente_sin_insertar(): void
    {
        $factura = $this->crearFactura();
        $this->crearNotaCertificada($factura, 100.00);
        $xmlNuevo = '<?xml version="1.0"?><NotaFicticia>No enviar</NotaFicticia>';
        $meta = [
            'tipo' => 'NCRE',
            'idcliente' => 900001,
            'monto_total' => 116.00,
            'origen' => ['uuid' => $factura->uuid],
        ];
        $controlador = app(MonitorFacturacionController::class);
        $metodo = new \ReflectionMethod($controlador, 'prepararIntentoNotaFEL');
        $resultado = $metodo->invoke($controlador, 900001, 'NCRE', $factura->uuid, $xmlNuevo, $meta);

        $this->assertFalse($resultado['valido']);
        $this->assertSame(0, DB::table('adm_fel_intentos')
            ->where('uuid_origen', $factura->uuid)->count());
    }
}
