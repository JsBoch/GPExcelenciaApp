<?php

namespace Tests\Feature;

use App\Http\Controllers\MonitorFacturacionController;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class FCAMIntentosAisladosTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (!app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false ||
            config('services.infile.fcam_intentos_habilitado', false) !== false) {
            throw new RuntimeException('FCAM: entorno de testing aislado y banderas apagadas son obligatorios.');
        }

        Http::preventStrayRequests();
        Http::fake();

        $this->assertDatabaseHas('adm_cotizacion', ['idcotizacion' => 900001]);

        // No alterar cotizaciones con historia fiscal o intentos preexistentes.
        $this->assertSame(0, DB::table('adm_fel_intentos')
            ->where('idcotizacion', 900001)->count(),
            'Existen intentos persistentes sobre la cotizacion ficticia: no borrar automaticamente.');
        $this->assertSame(0, DB::table('adm_facturacion')
            ->where('idcotizacion', 900001)->count(),
            'La cotizacion ficticia ya tiene registros de facturacion: usar otra fixture.');

        // DatabaseTransactions revierte esta preparacion al terminar cada prueba.
        // La fixture 900001 es compartida: puede quedar en estado 6 por pruebas previas.
        DB::table('adm_cotizacion')->where('idcotizacion', 900001)
            ->update(['estado' => 5]);
        $this->assertSame(5, (int) DB::table('adm_cotizacion')
            ->where('idcotizacion', 900001)->value('estado'));
    }

    private function invocar(string $metodo, ...$argumentos): array
    {
        return (new \ReflectionMethod(app(MonitorFacturacionController::class), $metodo))
            ->invoke(app(MonitorFacturacionController::class), ...$argumentos);
    }

    private function xml(): string
    {
        return '<GTDocumento><Tipo>FCAM</Tipo><Monto>50.00</Monto></GTDocumento>';
    }

    public function test_reserva_una_sola_vez_e_impide_reserva_duplicada(): void
    {
        $preparado = $this->invocar('prepararIntentoFEL', 900001, $this->xml());
        $this->assertTrue($preparado['valido'] ?? false, json_encode($preparado));
        $this->assertSame('PREPARADO', $preparado['estado']);

        $id = (int) $preparado['idintento'];
        $reservado = $this->invocar('reservarEnvioIntentoFEL', $id, 'FCAM');
        $this->assertTrue($reservado['valido'] ?? false, json_encode($reservado));
        $this->assertSame('ENVIANDO', DB::table('adm_fel_intentos')->where('idintento', $id)->value('estado'));

        $duplicado = $this->invocar('reservarEnvioIntentoFEL', $id, 'FCAM');
        $this->assertFalse($duplicado['valido'] ?? true);
        $nuevo = $this->invocar('prepararIntentoFEL', 900001, $this->xml());
        $this->assertFalse($nuevo['valido'] ?? true);
        $this->assertSame(1, DB::table('adm_fel_intentos')->where('idcotizacion', 900001)->count());
        Http::assertNothingSent();
    }

    public function test_intento_historico_preparado_bloquea_otra_preparacion(): void
    {
        $primero = $this->invocar('prepararIntentoFEL', 900001, $this->xml());
        $this->assertTrue($primero['valido'] ?? false, json_encode($primero));
        $otro = $this->invocar('prepararIntentoFEL', 900001, $this->xml());
        $this->assertFalse($otro['valido'] ?? true);
        $this->assertSame((int) $primero['idintento'], (int) ($otro['idintento'] ?? 0));
        $this->assertSame('PREPARADO', DB::table('adm_fel_intentos')
            ->where('idintento', $primero['idintento'])->value('estado'));
        Http::assertNothingSent();
    }

    public function test_xml_modificado_no_puede_reservarse(): void
    {
        $preparado = $this->invocar('prepararIntentoFEL', 900001, $this->xml());
        $this->assertTrue($preparado['valido'] ?? false, json_encode($preparado));
        $id = (int) $preparado['idintento'];
        DB::table('adm_fel_intentos')->where('idintento', $id)
            ->update(['xml_enviado' => $this->xml() . '<ALTERADO/>']);

        $reservado = $this->invocar('reservarEnvioIntentoFEL', $id, 'FCAM');
        $this->assertFalse($reservado['valido'] ?? true);
        $this->assertSame('PREPARADO', DB::table('adm_fel_intentos')->where('idintento', $id)->value('estado'));
        Http::assertNothingSent();
    }
}
