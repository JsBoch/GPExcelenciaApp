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
 * Etapa 75A: validaciones de store(), SIN insertar recibos reales.
 * Estos casos rechazan antes de reservar correlativo.
 */
class RegistroRecibosStoreFELTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (!app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false) {
            throw new RuntimeException('Etapa 75: base o configuración de pruebas insegura.');
        }
        foreach (['users', 'clientes', 'adm_cotizacion', 'adm_cuentas_porcobrar',
            'adm_recibos', 'adm_recibo_detalle', 'adm_notas_fel',
            'adm_cxc_movimientos_fel'] as $tabla) {
            if (!Schema::hasTable($tabla)) {
                throw new RuntimeException("Falta tabla de testing: {$tabla}");
            }
        }
        if (!DB::table('clientes')->where('idcliente', 900001)->exists() ||
            !DB::table('adm_cotizacion')->where('idcotizacion', 900001)->exists()) {
            throw new RuntimeException('Faltan fixtures cliente/cotización 900001 en testing.');
        }
    }

    private function cuenta(string $saldo = '700.000', bool $excedente = false): int
    {
        $uid = DB::table('users')->insertGetId([
            'name' => 'store-fel-' . Str::random(8),
            'email' => Str::uuid() . '@example.invalid',
            'password' => bcrypt(Str::random(20)),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs(User::findOrFail($uid));
        $id = random_int(4000000, 4900000);
        DB::table('adm_cuentas_porcobrar')->insert([
            'idcuentaporcobrar' => $id, 'idcotizacion' => 900001,
            'idcliente' => 900001, 'fecha_emision' => today()->toDateString(),
            'fecha_vencimiento' => today()->addMonth()->toDateString(),
            'moneda' => 'GTQ', 'tasa_cambio' => '1.000',
            'monto_original' => '1000.000', 'saldo_pendiente' => $saldo,
            'monto_pagado' => '300.000', 'descuento_aplicado' => '0.000',
            'idusuario_creacion' => $uid, 'usuario_creacion' => 'FEL TEST',
            'fecha_creacion' => now(), 'origen_registro' => 'FEL TEST',
            'centro_costo' => '', 'cuenta_contable' => '', 'estatus_riesgo' => '',
            'estado' => 1, 'idfactura' => 0,
        ]);
        if ($excedente) {
            $nota = DB::table('adm_notas_fel')->insertGetId([
                'idcotizacion' => 900001, 'idcliente' => 900001,
                'tipo' => 'NCRE', 'monto_total' => '400.00',
                'identificador' => (string) Str::uuid(),
                'uuid_nota' => (string) Str::uuid(),
                'resultado' => 'S', 'created_at' => now(),
            ]);
            DB::table('adm_cxc_movimientos_fel')->insert([
                'idcuentaporcobrar' => $id, 'idnota' => $nota,
                'tipo' => 'NCRE', 'monto_nota' => '400.000',
                'monto_aplicado' => '300.000', 'excedente' => '100.000',
                'saldo_anterior' => '300.000', 'saldo_nuevo' => '0.000',
                'fecha_registro' => now(),
            ]);
        }
        return $id;
    }

    private function solicitud(array $detalle, string $total): Request
    {
        return Request::create('/prueba-recibos-store', 'POST', [
            'idcliente' => 900001, 'fecha_recibo' => today()->toDateString(),
            'metodo_pago' => 'DEPOSITO', 'moneda' => 'GTQ',
            'serie' => 'TF', 'numero' => 123456, 'tipo' => 'RECIBO',
            'monto_recibido' => $total, 'detalle' => $detalle,
        ]);
    }

    private function partida(int $id, string $monto): array
    {
        return ['idcuentaporcobrar' => $id, 'monto' => $monto];
    }

    private function sinCambios(int $id, string $saldo): void
    {
        $this->assertDatabaseHas('adm_cuentas_porcobrar', [
            'idcuentaporcobrar' => $id, 'saldo_pendiente' => $saldo,
            'monto_pagado' => '300.000',
        ]);
        $this->assertSame(0, DB::table('adm_recibo_detalle')
            ->where('idcuentaporcobrar', $id)->count());
    }

    public function test_cxc_duplicada_retorna_422_sin_crear_recibo(): void
    {
        $id = $this->cuenta();
        $antes = DB::table('adm_recibos')->count();
        $r = app(AdmRecibosController::class)->store(
            $this->solicitud([$this->partida($id, '100.00'), $this->partida($id, '50.00')], '150.00')
        );
        $this->assertSame(422, $r->getStatusCode());
        $this->assertSame($antes, DB::table('adm_recibos')->count());
        $this->sinCambios($id, '700.000');
    }

    public function test_excedente_fel_retorna_422_sin_crear_recibo(): void
    {
        $id = $this->cuenta('0.000', true);
        $antes = DB::table('adm_recibos')->count();
        $r = app(AdmRecibosController::class)->store(
            $this->solicitud([$this->partida($id, '10.00')], '10.00')
        );
        $this->assertSame(422, $r->getStatusCode());
        $this->assertSame($antes, DB::table('adm_recibos')->count());
        $this->sinCambios($id, '0.000');
    }

    public function test_pago_superior_al_saldo_retorna_422_sin_crear_recibo(): void
    {
        $id = $this->cuenta();
        $antes = DB::table('adm_recibos')->count();
        $r = app(AdmRecibosController::class)->store(
            $this->solicitud([$this->partida($id, '701.00')], '701.00')
        );
        $this->assertSame(422, $r->getStatusCode());
        $this->assertSame($antes, DB::table('adm_recibos')->count());
        $this->sinCambios($id, '700.000');
    }

    public function test_suma_de_detalle_incorrecta_retorna_422_sin_crear_recibo(): void
    {
        $id = $this->cuenta();
        $antes = DB::table('adm_recibos')->count();
        $r = app(AdmRecibosController::class)->store(
            $this->solicitud([$this->partida($id, '100.00')], '150.00')
        );
        $this->assertSame(422, $r->getStatusCode());
        $this->assertSame($antes, DB::table('adm_recibos')->count());
        $this->sinCambios($id, '700.000');
    }
}
