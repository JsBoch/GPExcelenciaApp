<?php

namespace Tests\Feature;

use App\Http\Controllers\MonitorFacturacionController;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class ReservarEnvioIntentoFELTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (
            !app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false ||
            config('services.infile.fcam_intentos_habilitado', false) !== false
        ) {
            throw new RuntimeException('Prueba de reserva FEL bloqueada: entorno/base/configuración incorrectos.');
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

    private function xmlNota(string $uuidOrigen, ?string $fecha = null): string
    {
        $fecha ??= now()->format('Y-m-d\TH:i:s');
        $fechaSegura = htmlspecialchars($fecha, ENT_QUOTES | ENT_XML1, 'UTF-8');

        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0" xmlns:cno="http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0">'
            . '<dte:SAT><dte:DTE><dte:DatosEmision>'
            . '<dte:DatosGenerales Tipo="NCRE" FechaHoraEmision="' . $fechaSegura . '"/>'
            . '<dte:Receptor IDReceptor="TEST-NO-VALIDO"/>'
            . '<dte:Items><dte:Item NumeroLinea="1">'
            . '<dte:Impuestos><dte:Impuesto><dte:NombreCorto>IVA</dte:NombreCorto>'
            . '<dte:MontoGravable>191.97</dte:MontoGravable>'
            . '<dte:MontoImpuesto>23.03</dte:MontoImpuesto>'
            . '</dte:Impuesto></dte:Impuestos><dte:Total>215.00</dte:Total>'
            . '</dte:Item></dte:Items><dte:Totales><dte:TotalImpuestos>'
            . '<dte:TotalImpuesto NombreCorto="IVA" TotalMontoImpuesto="23.03"/>'
            . '</dte:TotalImpuestos><dte:GranTotal>215.00</dte:GranTotal></dte:Totales>'
            . '<dte:Complementos><cno:ReferenciasNota NumeroAutorizacionDocumentoOrigen="'
            . htmlspecialchars($uuidOrigen, ENT_QUOTES | ENT_XML1, 'UTF-8')
            . '"/></dte:Complementos>'
            . '</dte:DatosEmision></dte:DTE></dte:SAT></dte:GTDocumento>';
    }

    private function crearIntento(?string $fechaXML = null): array
    {
        $uuidOrigen = (string) Str::uuid();
        $identificador = (string) Str::uuid();
        $xml = $this->xmlNota($uuidOrigen, $fechaXML);

        $idfactura = DB::table('adm_facturacion')->insertGetId([
            'idcotizacion' => 900001,
            'resultado' => 'S',
            'estado' => 1,
            'uuid' => $uuidOrigen,
            'serie' => 'TEST',
            'numero' => '100',
            'total_factura' => 215.00,
            'fecha_certificacion' => now(),
            'xml_certificado' => $this->xmlOrigen($uuidOrigen),
        ]);

        $meta = [
            'idcliente' => 900001,
            'idfactura_origen' => $idfactura,
            'tipo' => 'NCRE',
            'motivo' => 'SIMULACION AUTOMATIZADA - NO FISCAL',
            'monto_total' => 215.00,
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

        return [$idintento, $idfactura, $uuidOrigen];
    }

    private function reservar(int $idintento): array
    {
        $controlador = app(MonitorFacturacionController::class);
        $metodo = new \ReflectionMethod($controlador, 'reservarEnvioIntentoFEL');
        return $metodo->invoke($controlador, $idintento, 'NCRE');
    }

    private function comprobarPreparado(int $idintento): void
    {
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $idintento,
            'estado' => 'PREPARADO',
            'fecha_envio' => null,
        ]);
    }

    public function test_reserva_valida_pasa_a_enviando(): void
    {
        [$id] = $this->crearIntento();
        $resultado = $this->reservar($id);
        $this->assertTrue($resultado['valido'], $resultado['mensaje'] ?? '');
        $this->assertSame('ENVIANDO', $resultado['estado']);
        $this->assertDatabaseHas('adm_fel_intentos', ['idintento' => $id, 'estado' => 'ENVIANDO']);
        $this->assertNotNull(DB::table('adm_fel_intentos')->where('idintento', $id)->value('fecha_envio'));
        $this->assertSame(0, DB::table('adm_notas_fel')->where('idcotizacion', 900001)->count());
    }

    public function test_factura_anulada_despues_de_preparar_impide_reserva(): void
    {
        [$id, $idfactura] = $this->crearIntento();
        DB::table('adm_facturacion')->where('idfactura', $idfactura)->update(['estado' => 0]);
        $resultado = $this->reservar($id);
        $this->assertFalse($resultado['valido']);
        $this->assertStringContainsString('factura origen', strtolower($resultado['mensaje']));
        $this->comprobarPreparado($id);
    }

    public function test_saldo_reducido_despues_de_preparar_impide_reserva(): void
    {
        [$id, , $uuid] = $this->crearIntento();
        DB::table('adm_notas_fel')->insert([
            'idcotizacion' => 900001,
            'idcliente' => 900001,
            'tipo' => 'NCRE',
            'resultado' => 'S',
            'uuid_origen' => $uuid,
            'uuid_nota' => (string) Str::uuid(),
            'identificador' => (string) Str::uuid(),
            'monto_total' => 100.00,
        ]);
        $resultado = $this->reservar($id);
        $this->assertFalse($resultado['valido']);
        $this->assertStringContainsString('supera', strtolower($resultado['mensaje']));
        $this->comprobarPreparado($id);
    }

    public function test_otro_intento_pendiente_impide_reserva(): void
    {
        [$id, , $uuid] = $this->crearIntento();
        $idCompetidor = DB::table('adm_fel_intentos')->insertGetId([
            'idcotizacion' => 900001,
            'tipo_documento' => 'NDEB',
            'uuid_origen' => $uuid,
            'identificador' => (string) Str::uuid(),
            'xml_hash' => hash('sha256', 'INTENTO-COMPETIDOR-FICTICIO'),
            'estado' => 'INCIERTO',
        ]);
        $resultado = $this->reservar($id);
        $this->assertFalse($resultado['valido']);
        $this->assertSame($idCompetidor, $resultado['idintento_competidor']);
        $this->comprobarPreparado($id);
    }

    public function test_intento_ya_reservado_no_puede_reservarse_dos_veces(): void
    {
        [$id] = $this->crearIntento();
        $primera = $this->reservar($id);
        $segunda = $this->reservar($id);
        $this->assertTrue($primera['valido']);
        $this->assertFalse($segunda['valido']);
        $this->assertSame('ENVIANDO', $segunda['estado']);
        $this->assertSame('ENVIANDO', DB::table('adm_fel_intentos')->where('idintento', $id)->value('estado'));
    }

    public function test_intento_de_ayer_no_puede_reservarse(): void
    {
        [$id] = $this->crearIntento(now()->subDay()->format('Y-m-d\TH:i:s'));
        $resultado = $this->reservar($id);
        $this->assertFalse($resultado['valido']);
        $this->assertStringContainsString('fecha', strtolower($resultado['mensaje']));
        $this->comprobarPreparado($id);
    }
}
