<?php

namespace Tests\Feature;

use App\Http\Controllers\MonitorFacturacionController;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use ReflectionMethod;
use RuntimeException;
use Tests\TestCase;

/**
 * Etapa 66: prueba DIRECTA de guardarNotaCertificadaFEL, rama idempotente
 * de nota YA certificada. No hace HTTP ni certifica documentos.
 * Requiere el metodo de la Etapa 64 instalado en MonitorFacturacionController.
 */
class GuardarNotaCertificadaFELIntegracionCxCTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (!app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false) {
            throw new RuntimeException('Etapa 66 bloqueada fuera de la base aislada de testing.');
        }
    }

    private function escenario(string $moneda = 'GTQ'): array
    {
        $uuidOrigen = (string) Str::uuid();
        $uuidNota = (string) Str::uuid();
        $identificador = (string) Str::uuid();

        $idfactura = DB::table('adm_facturacion')->insertGetId([
            'idcotizacion' => 900001,
            'resultado' => 'S',
            'estado' => 1,
            'uuid' => $uuidOrigen,
            'serie' => 'TEST',
            'numero' => '1',
            'total_factura' => '1000.00',
            'fecha_certificacion' => now(),
        ]);

        $idcuenta = 900000 + random_int(1000, 90000);
        DB::table('adm_cuentas_porcobrar')->insert([
            'idcuentaporcobrar' => $idcuenta,
            'idcotizacion' => 900001,
            'idcliente' => 900001,
            'fecha_emision' => now()->toDateString(),
            'fecha_vencimiento' => now()->addMonth()->toDateString(),
            'moneda' => $moneda,
            'tasa_cambio' => '1.000',
            'monto_original' => '1000.000',
            'saldo_pendiente' => '700.000',
            'monto_pagado' => '300.000',
            'descuento_aplicado' => '0.000',
            'idusuario_creacion' => 1,
            'usuario_creacion' => 'FEL TEST',
            'fecha_creacion' => now(),
            'origen_registro' => 'FEL TEST',
            'centro_costo' => '',
            'cuenta_contable' => '',
            'estatus_riesgo' => '',
            'estado' => 1,
            'idfactura' => $idfactura,
        ]);

        $idnota = DB::table('adm_notas_fel')->insertGetId([
            'idcotizacion' => 900001,
            'idcliente' => 900001,
            'tipo' => 'NCRE',
            'motivo' => 'SIMULACION SIN ENVIO',
            'monto_total' => '200.00',
            'uuid_origen' => $uuidOrigen,
            'idfactura_origen' => $idfactura,
            'identificador' => $identificador,
            'resultado' => 'S',
            'uuid_nota' => $uuidNota,
            'serie_nota' => 'SIM',
            'numero_nota' => '1',
            'fecha_nota' => now(),
        ]);

        DB::table('adm_fel_intentos')->insert([
            'idcotizacion' => 900001,
            'tipo_documento' => 'NCRE',
            'uuid_origen' => $uuidOrigen,
            'identificador' => $identificador,
            'xml_hash' => hash('sha256', 'SIMULACION'),
            'xml_enviado' => 'SIMULACION',
            'estado' => 'CERTIFICADO',
            'idnota' => $idnota,
            'uuid' => $uuidNota,
        ]);

        $idintento = (int) DB::table('adm_fel_intentos')->where('identificador', $identificador)->value('idintento');

        return compact('idintento', 'idnota', 'idcuenta', 'uuidNota');
    }

    private function guardar(int $idintento, string $uuid): array
    {
        $controlador = app(MonitorFacturacionController::class);
        $metodo = new ReflectionMethod($controlador, 'guardarNotaCertificadaFEL');

        return $metodo->invoke($controlador, $idintento, [
            'resultado' => true,
            'uuid' => $uuid,
            'serie' => 'SIM',
            'numero' => '1',
        ]);
    }

    public function test_controlador_conserva_certificacion_si_cxc_falla(): void
    {
        $d = $this->escenario('USD');
        $resultado = $this->guardar($d['idintento'], $d['uuidNota']);

        $this->assertTrue($resultado['valido']);
        $this->assertTrue($resultado['ya_existia']);
        $this->assertSame('CERTIFICADO', $resultado['estado']);
        $this->assertSame('PENDIENTE_REVISION', $resultado['cxc_estado']);
        $this->assertTrue($resultado['cxc_requiere_revision']);
        $this->assertDatabaseHas('adm_notas_fel', [
            'idnota' => $d['idnota'], 'resultado' => 'S', 'uuid_nota' => $d['uuidNota'],
        ]);
        $this->assertDatabaseHas('adm_cuentas_porcobrar', [
            'idcuentaporcobrar' => $d['idcuenta'],
            'saldo_pendiente' => '700.000',
            'monto_pagado' => '300.000',
        ]);
        $this->assertSame(0, DB::table('adm_cxc_movimientos_fel')
            ->where('idnota', $d['idnota'])->count());
    }

    public function test_controlador_reintenta_cxc_sin_duplicar_ni_recetificar(): void
    {
        $d = $this->escenario('USD');
        $primera = $this->guardar($d['idintento'], $d['uuidNota']);
        $this->assertSame('PENDIENTE_REVISION', $primera['cxc_estado']);

        // Solo fixture de testing: corregimos la moneda para permitir reintento.
        DB::table('adm_cuentas_porcobrar')
            ->where('idcuentaporcobrar', $d['idcuenta'])
            ->update(['moneda' => 'GTQ']);

        $segunda = $this->guardar($d['idintento'], $d['uuidNota']);
        $tercera = $this->guardar($d['idintento'], $d['uuidNota']);

        $this->assertSame('APLICADA', $segunda['cxc_estado']);
        $this->assertFalse($segunda['cxc_ya_existia']);
        $this->assertSame('APLICADA', $tercera['cxc_estado']);
        $this->assertTrue($tercera['cxc_ya_existia']);
        $this->assertSame($segunda['cxc_movimiento_id'], $tercera['cxc_movimiento_id']);
        $this->assertSame(1, DB::table('adm_cxc_movimientos_fel')
            ->where('idnota', $d['idnota'])->count());
        $this->assertDatabaseHas('adm_cuentas_porcobrar', [
            'idcuentaporcobrar' => $d['idcuenta'],
            'saldo_pendiente' => '500.000',
            'monto_original' => '1000.000',
            'monto_pagado' => '300.000',
        ]);
        $this->assertSame(1, DB::table('adm_notas_fel')
            ->where('idnota', $d['idnota'])->where('uuid_nota', $d['uuidNota'])->count());
    }
}
