<?php

namespace Tests\Feature;

use App\Services\AplicadorNotasFELCxC;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class RecuperacionNotasFELCxCTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (!app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false) {
            throw new RuntimeException('Test recuperación CXC FEL bloqueado: entorno no seguro.');
        }
    }

    /** Crea únicamente datos ficticios. Cada test se revierte con DatabaseTransactions. */
    private function escenario(string $tipo = 'NCRE', string $saldo = '700.000',
                               string $monto = '200.00', string $estado = 'CERTIFICADO',
                               string $resultado = 'S', string $moneda = 'GTQ'): array
    {
        $origen = (string) Str::uuid();
        $uuidNota = (string) Str::uuid();
        $identificador = (string) Str::uuid();

        $idfactura = DB::table('adm_facturacion')->insertGetId([
            'idcotizacion' => 900001, 'resultado' => 'S', 'estado' => 1,
            'uuid' => $origen, 'serie' => 'TEST', 'numero' => '1',
            'total_factura' => '1000.00', 'fecha_certificacion' => now(),
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
            'saldo_pendiente' => $saldo,
            'monto_pagado' => '300.000',
            'descuento_aplicado' => '0.000',
            'idusuario_creacion' => 1,
            'usuario_creacion' => 'FEL TEST',
            'fecha_creacion' => now(),
            'origen_registro' => 'FEL TEST',
            'centro_costo' => '', 'cuenta_contable' => '',
            'estatus_riesgo' => '', 'estado' => 1,
            'idfactura' => $idfactura,
        ]);

        $idnota = DB::table('adm_notas_fel')->insertGetId([
            'idcotizacion' => 900001, 'idcliente' => 900001,
            'tipo' => $tipo, 'motivo' => 'PRUEBA NO FISCAL',
            'monto_total' => $monto,
            'uuid_origen' => $origen,
            'idfactura_origen' => $idfactura,
            'identificador' => $identificador,
            'resultado' => $resultado,
            'uuid_nota' => $uuidNota,
            'serie_nota' => 'SIM', 'numero_nota' => '1',
            'fecha_nota' => now(),
        ]);

        DB::table('adm_fel_intentos')->insert([
            'idcotizacion' => 900001,
            'tipo_documento' => $tipo,
            'uuid_origen' => $origen,
            'identificador' => $identificador,
            'xml_hash' => hash('sha256', 'SIMULACION'),
            'xml_enviado' => 'SIMULACION',
            'estado' => $estado,
            'idnota' => $idnota,
            'uuid' => $uuidNota,
        ]);
        return [$idnota, $idcuenta];
    }

    private function saldo(int $idcuenta): string
    {
        return number_format((float) DB::table('adm_cuentas_porcobrar')
            ->where('idcuentaporcobrar', $idcuenta)->value('saldo_pendiente'), 3, '.', '');
    }

    /** Nota fiscal CERTIFICADA persistida, pero todavía no aplicada a CXC. */
    public function test_auditoria_detecta_nota_certificada_sin_movimiento(): void
    {
        [$nota, $cuenta] = $this->escenario();
        $pendientes = DB::table('adm_notas_fel as n')
            ->leftJoin('adm_cxc_movimientos_fel as m', 'm.idnota', '=', 'n.idnota')
            ->where('n.idnota', $nota)
            ->where('n.resultado', 'S')
            ->whereNotNull('n.uuid_nota')
            ->whereNull('m.idmovimiento')
            ->count();

        $this->assertSame(1, $pendientes);
        $this->assertSame('700.000', $this->saldo($cuenta));
    }

    /** Error financiero no debe invalidar ni alterar evidencia de certificación. */
    public function test_fallo_financiero_mantiene_certificacion_y_no_genera_movimiento(): void
    {
        [$nota, $cuenta] = $this->escenario('NCRE', '700.000', '200.00', 'CERTIFICADO', 'S', 'USD');
        $uuid = DB::table('adm_notas_fel')->where('idnota', $nota)->value('uuid_nota');
        $this->assertNotEmpty($uuid);

        try {
            app(AplicadorNotasFELCxC::class)->aplicar($nota);
            $this->fail('Debió rechazar cuenta con moneda incompatible.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('CxC inactiva', $e->getMessage());
        }

        $this->assertDatabaseHas('adm_notas_fel', [
            'idnota' => $nota, 'resultado' => 'S', 'uuid_nota' => $uuid,
        ]);
        $this->assertSame('CERTIFICADO', DB::table('adm_fel_intentos')
            ->where('idnota', $nota)->value('estado'));
        $this->assertSame(0, DB::table('adm_cxc_movimientos_fel')
            ->where('idnota', $nota)->count());
        $this->assertSame('700.000', $this->saldo($cuenta));
    }

    /** Regularización y reintento son idempotentes, sin nueva certificación. */
    public function test_regularizacion_financiera_posterior_no_duplica_ajuste(): void
    {
        [$nota, $cuenta] = $this->escenario('NCRE', '700.000', '200.00', 'CERTIFICADO', 'S', 'USD');
        $uuid = DB::table('adm_notas_fel')->where('idnota', $nota)->value('uuid_nota');
        try {
            app(AplicadorNotasFELCxC::class)->aplicar($nota);
            $this->fail('Se esperaba falla financiera previa.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('CxC inactiva', $e->getMessage());
        }

        // Reparación simulada exclusivamente dentro de DatabaseTransactions.
        DB::table('adm_cuentas_porcobrar')->where('idcuentaporcobrar', $cuenta)
            ->update(['moneda' => 'GTQ']);

        $primera = app(AplicadorNotasFELCxC::class)->aplicar($nota);
        $segunda = app(AplicadorNotasFELCxC::class)->aplicar($nota);
        $this->assertFalse($primera['ya_existia']);
        $this->assertTrue($segunda['ya_existia']);
        $this->assertSame($primera['idmovimiento'], $segunda['idmovimiento']);
        $this->assertSame('500.000', $this->saldo($cuenta));
        $this->assertSame(1, DB::table('adm_cxc_movimientos_fel')
            ->where('idnota', $nota)->count());
        $this->assertDatabaseHas('adm_notas_fel', [
            'idnota' => $nota, 'resultado' => 'S', 'uuid_nota' => $uuid,
        ]);
    }
}
