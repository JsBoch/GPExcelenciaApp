<?php

namespace Tests\Feature;

use App\Http\Controllers\AdmRecibosController;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

/**
 * Etapa 72. Invoca directamente los metodos reales del controlador.
 * No invoca endpoints FEL, no usa INFILE ni toca cuentas fuera de testing.
 */
class ProteccionRecibosExcedenteFELTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (!app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false) {
            throw new RuntimeException('Etapa 72: ambiente de pruebas no seguro.');
        }
        foreach (['users', 'clientes', 'adm_cotizacion', 'adm_cuentas_porcobrar',
            'adm_recibos', 'adm_recibo_detalle', 'adm_notas_fel', 'adm_cxc_movimientos_fel'] as $table) {
            if (!Schema::hasTable($table)) {
                throw new RuntimeException("Falta tabla de testing: {$table}");
            }
        }
    }

    private function escenario(bool $conExcedente = false, string $tipo = 'NCRE'): array
    {
        $uid = DB::table('users')->insertGetId([
            'name' => 'recibo-fel-' . Str::random(8),
            'email' => Str::uuid() . '@example.invalid',
            'password' => bcrypt(Str::random(20)),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs(User::findOrFail($uid));
        // La cotizacion 900001 y el cliente 900001 son fixtures aislados existentes de FEL.
        if (!DB::table('adm_cotizacion')->where('idcotizacion', 900001)->exists() ||
            !DB::table('clientes')->where('idcliente', 900001)->exists()) {
            throw new RuntimeException('Faltan fixtures FEL de testing (cotizacion/cliente 900001).');
        }
        $cuenta = random_int(2000000, 2800000);
        $recibo = random_int(3000000, 3800000);
        DB::table('adm_cuentas_porcobrar')->insert([
            'idcuentaporcobrar' => $cuenta, 'idcotizacion' => 900001,
            'idcliente' => 900001, 'fecha_emision' => today()->toDateString(),
            'fecha_vencimiento' => today()->addMonth()->toDateString(),
            'moneda' => 'GTQ', 'tasa_cambio' => '1.000',
            'monto_original' => '1000.000', 'saldo_pendiente' => '200.000',
            'monto_pagado' => '800.000', 'descuento_aplicado' => '0.000',
            'idusuario_creacion' => $uid, 'usuario_creacion' => 'FEL TEST',
            'fecha_creacion' => now(), 'origen_registro' => 'FEL TEST',
            'centro_costo' => '', 'cuenta_contable' => '', 'estatus_riesgo' => '',
            'estado' => 1, 'idfactura' => 0,
        ]);
        DB::table('adm_recibos')->insert([
            'idrecibo' => $recibo, 'idcliente' => 900001,
            'fecha_recibo' => today()->toDateString(), 'monto_recibido' => '800.000',
            'metodo_pago' => 'DEPOSITO', 'moneda' => 'GTQ',
            'estado' => 1, 'serie' => 'TF', 'numero' => $recibo,
            'tipo' => 'RECIBO', 'idusuario_creacion' => $uid,
            'usuario_creacion' => 'FEL TEST', 'fecha_creacion' => now(),
        ]);
        DB::table('adm_recibo_detalle')->insert([
            'idrecibo' => $recibo, 'idcuentaporcobrar' => $cuenta,
            'monto' => '800.00',
        ]);
        if ($conExcedente) {
            $nota = DB::table('adm_notas_fel')->insertGetId([
                'idcotizacion' => 900001, 'idcliente' => 900001,
                'tipo' => $tipo, 'monto_total' => '300.00',
                'identificador' => (string) Str::uuid(),
                'uuid_nota' => (string) Str::uuid(),
                'resultado' => 'S', 'created_at' => now(),
            ]);
            DB::table('adm_cxc_movimientos_fel')->insert([
                'idcuentaporcobrar' => $cuenta, 'idnota' => $nota,
                'tipo' => $tipo, 'monto_nota' => '300.000',
                'monto_aplicado' => '200.000', 'excedente' => '100.000',
                'saldo_anterior' => '200.000', 'saldo_nuevo' => '0.000',
                'fecha_registro' => now(),
            ]);
            // Reflejar el saldo ya ajustado por FEL.
            DB::table('adm_cuentas_porcobrar')->where('idcuentaporcobrar', $cuenta)
                ->update(['saldo_pendiente' => '0.000']);
        }
        return compact('cuenta', 'recibo');
    }

    private function datosEdicion(array $s): Request
    {
        return Request::create('/prueba-local-recibo', 'PUT', [
            'idcliente' => 900001, 'fecha_recibo' => today()->toDateString(),
            'metodo_pago' => 'DEPOSITO', 'moneda' => 'GTQ',
            'serie' => 'TF', 'numero' => $s['recibo'], 'tipo' => 'RECIBO',
            'monto_recibido' => '800.00',
            'detalle' => [['idcuentaporcobrar' => $s['cuenta'], 'monto' => '800.00']],
        ]);
    }

    private function confirmarSinCambios(array $s, string $saldo): void
    {
        $this->assertDatabaseHas('adm_cuentas_porcobrar', [
            'idcuentaporcobrar' => $s['cuenta'],
            'saldo_pendiente' => $saldo, 'monto_pagado' => '800.000',
        ]);
        $this->assertDatabaseHas('adm_recibos', [
            'idrecibo' => $s['recibo'], 'estado' => 1,
        ]);
        $this->assertDatabaseHas('adm_recibo_detalle', [
            'idrecibo' => $s['recibo'],
            'idcuentaporcobrar' => $s['cuenta'], 'monto' => '800.00',
        ]);
        $this->assertSame(1, DB::table('adm_recibo_detalle')->where('idrecibo', $s['recibo'])->count());
    }

    public function test_anulacion_destroy_con_excedente_retorna_409_y_no_altera_datos(): void
    {
        $s = $this->escenario(true);
        $r = app(AdmRecibosController::class)->destroy($s['recibo']);
        $this->assertSame(409, $r->getStatusCode());
        $this->confirmarSinCambios($s, '0.000');
    }

    public function test_desactivar_con_excedente_retorna_409_y_no_altera_datos(): void
    {
        $s = $this->escenario(true);
        $r = app(AdmRecibosController::class)->desactivar($s['recibo']);
        $this->assertSame(409, $r->getStatusCode());
        $this->confirmarSinCambios($s, '0.000');
    }

    public function test_edicion_con_excedente_retorna_422_y_no_altera_datos(): void
    {
        $s = $this->escenario(true);
        $r = app(AdmRecibosController::class)->update($this->datosEdicion($s), $s['recibo']);
        $this->assertSame(422, $r->getStatusCode());
        $this->confirmarSinCambios($s, '0.000');
    }

    public function test_anulacion_sin_movimientos_fel_sigue_permitida(): void
    {
        $s = $this->escenario();
        $r = app(AdmRecibosController::class)->destroy($s['recibo']);
        $this->assertSame(200, $r->getStatusCode());
        $this->assertDatabaseHas('adm_recibos', ['idrecibo' => $s['recibo'], 'estado' => 0]);
        $this->assertDatabaseHas('adm_cuentas_porcobrar', [
            'idcuentaporcobrar' => $s['cuenta'],
            'saldo_pendiente' => '1000.000', 'monto_pagado' => '0.000',
        ]);
    }

    public function test_anulacion_ya_realizada_sigue_siendo_idempotente(): void
    {
        $s = $this->escenario();
        DB::table('adm_recibos')->where('idrecibo', $s['recibo'])->update(['estado' => 0]);
        $r = app(AdmRecibosController::class)->destroy($s['recibo']);
        $this->assertSame(200, $r->getStatusCode());
        $this->assertDatabaseHas('adm_cuentas_porcobrar', [
            'idcuentaporcobrar' => $s['cuenta'],
            'saldo_pendiente' => '200.000', 'monto_pagado' => '800.000',
        ]);
    }
}
