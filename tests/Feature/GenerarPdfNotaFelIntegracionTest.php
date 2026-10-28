<?php

namespace Tests\Feature;

use App\Http\Controllers\MonitorFacturacionController;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class GenerarPdfNotaFelIntegracionTest extends TestCase
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
            throw new RuntimeException('No se permite ejecutar fuera de la base FEL aislada.');
        }

        $this->assertDatabaseHas('adm_cotizacion', ['idcotizacion' => 900001]);
    }

    public static function casos(): array
    {
        return [
            'NCRE 9-22' => ['NCRE', true, false, true],
            'NCRE normal' => ['NCRE', false, false, false],
            'NDEB sin 9-22' => ['NDEB', false, false, false],
            'Hash manipulado' => ['NCRE', true, true, null],
        ];
    }

    private function xmlNota(bool $conFrase): string
    {
        $frase = $conFrase
            ? '<dte:Frases><dte:Frase TipoFrase="1" CodigoEscenario="1"/>'
                . '<dte:Frase TipoFrase="9" CodigoEscenario="22"/></dte:Frases>'
            : '<dte:Frases><dte:Frase TipoFrase="1" CodigoEscenario="1"/></dte:Frases>';

        return '<?xml version="1.0" encoding="UTF-8"?>'
            . '<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0">'
            . '<dte:SAT><dte:DTE><dte:DatosEmision>'
            . '<dte:DatosGenerales Tipo="NCRE" FechaHoraEmision="2026-10-29T10:00:00"/>'
            . $frase
            . '</dte:DatosEmision></dte:DTE></dte:SAT></dte:GTDocumento>';
    }

    #[DataProvider('casos')]
    public function test_pdf_certificado_desde_xml_persistido(
        string $tipo,
        bool $frase,
        bool $hashInvalido,
        ?bool $esperado
    ): void {
        $uuidOrigen = (string) Str::uuid();
        $uuidNota = (string) Str::uuid();
        $identificador = (string) Str::uuid();
        $xml = $this->xmlNota($frase);

        $idfactura = DB::table('adm_facturacion')->insertGetId([
            'idcotizacion' => 900001,
            'resultado' => 'S',
            'estado' => 1,
            'uuid' => $uuidOrigen,
            'serie' => 'ORIGEN',
            'numero' => '100',
            'total_factura' => 215.00,
            'fecha_certificacion' => now(),
            'xml_certificado' => $xml,
        ]);

        $idnota = DB::table('adm_notas_fel')->insertGetId([
            'idcotizacion' => 900001,
            'idcliente' => 900001,
            'idfactura_origen' => $idfactura,
            'tipo' => $tipo,
            'motivo' => 'PRUEBA DE PDF SIN VALIDEZ FISCAL',
            'monto_total' => 215.00,
            'monto_gravable' => 191.97,
            'monto_impuesto' => 23.03,
            'exento_iva' => 'N',
            'receptor_nombre' => 'CLIENTE FICTICIO',
            'receptor_numero' => 'TEST',
            'receptor_direccion' => 'DIRECCION DE PRUEBA',
            'uuid_origen' => $uuidOrigen,
            'serie_origen' => 'ORIGEN',
            'numero_origen' => '100',
            'fecha_emision_origen' => '2026-08-28',
            'identificador' => $identificador,
            'xml_enviado' => $xml,
            'resultado' => 'S',
            'uuid_nota' => $uuidNota,
            'serie_nota' => 'NOTA-TEST',
            'numero_nota' => '200',
            'fecha_nota' => '2026-10-29 10:00:00',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('adm_fel_intentos')->insert([
            'idcotizacion' => 900001,
            'tipo_documento' => $tipo,
            'uuid_origen' => $uuidOrigen,
            'identificador' => $identificador,
            'xml_hash' => $hashInvalido ? str_repeat('0', 64) : hash('sha256', $xml),
            'xml_enviado' => $xml,
            'metadatos_fiscales' => '{}',
            'estado' => 'CERTIFICADO',
            'uuid' => $uuidNota,
            'idnota' => $idnota,
        ]);

        $capturado = null;
        View::composer('pdf.nota_fel', function ($vista) use (&$capturado) {
            $capturado = $vista->getData()['mostrarFrase922'] ?? null;
        });

        $response = app(MonitorFacturacionController::class)->generarPdfNotaFel((int) $idnota);

        if ($hashInvalido) {
            $this->assertSame(409, $response->getStatusCode());
            return;
        }

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame($esperado, $capturado);
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type', ''));
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }
}
