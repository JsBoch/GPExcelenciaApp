<?php

namespace Tests\Feature;

use App\Services\AplicadorNotasFELCxC;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class AplicadorNotasFELCxCTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (!app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false) {
            throw new RuntimeException('Test CXC FEL bloqueado: entorno no seguro.');
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

    public function test_ncre_reduce_saldo_sin_alterar_pagos_ni_original(): void
    {
        [$nota, $cuenta] = $this->escenario();
        $r = app(AplicadorNotasFELCxC::class)->aplicar($nota);
        $this->assertTrue($r['valido']);
        $this->assertFalse($r['ya_existia']);
        $this->assertSame('500.000', $this->saldo($cuenta));
        $this->assertSame('0.000', $r['excedente']);
        $this->assertDatabaseHas('adm_cuentas_porcobrar', [
            'idcuentaporcobrar' => $cuenta,
            'monto_original' => '1000.000',
            'monto_pagado' => '300.000',
        ]);
        $this->assertDatabaseHas('adm_cxc_movimientos_fel', [
            'idnota' => $nota, 'tipo' => 'NCRE', 'saldo_nuevo' => '500.000',
        ]);
    }

    public function test_ndeb_incrementa_saldo(): void
    {
        [$nota, $cuenta] = $this->escenario('NDEB', '700.000', '100.00');
        $r = app(AplicadorNotasFELCxC::class)->aplicar($nota);
        $this->assertSame('800.000', $this->saldo($cuenta));
        $this->assertSame('800.000', $r['saldo_nuevo']);
        $this->assertSame('0.000', $r['excedente']);
    }

    public function test_ncre_mayor_que_saldo_registra_excedente(): void
    {
        [$nota, $cuenta] = $this->escenario('NCRE', '100.000', '250.00');
        $r = app(AplicadorNotasFELCxC::class)->aplicar($nota);
        $this->assertSame('0.000', $this->saldo($cuenta));
        $this->assertSame('150.000', $r['excedente']);
        $this->assertDatabaseHas('adm_cxc_movimientos_fel', [
            'idnota' => $nota, 'monto_aplicado' => '100.000',
            'excedente' => '150.000',
        ]);
    }

    public function test_repetir_nota_no_modifica_dos_veces(): void
    {
        [$nota, $cuenta] = $this->escenario();
        $s = app(AplicadorNotasFELCxC::class);
        $primero = $s->aplicar($nota);
        $segundo = $s->aplicar($nota);
        $this->assertTrue($segundo['ya_existia']);
        $this->assertSame($primero['idmovimiento'], $segundo['idmovimiento']);
        $this->assertSame('500.000', $this->saldo($cuenta));
        $this->assertSame(1, DB::table('adm_cxc_movimientos_fel')->where('idnota', $nota)->count());
    }

    public function test_intento_no_certificado_es_rechazado_sin_movimiento(): void
    {
        [$nota, $cuenta] = $this->escenario('NCRE', '700.000', '200.00', 'INCIERTO');
        try {
            app(AplicadorNotasFELCxC::class)->aplicar($nota);
            $this->fail('Se esperaba rechazo de intento incierto.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('No hay intento FEL certificado', $e->getMessage());
        }
        $this->assertSame('700.000', $this->saldo($cuenta));
        $this->assertSame(0, DB::table('adm_cxc_movimientos_fel')->where('idnota', $nota)->count());
    }

    public function test_moneda_distinta_gtq_es_rechazada(): void
    {
        [$nota, $cuenta] = $this->escenario('NCRE', '700.000', '200.00', 'CERTIFICADO', 'S', 'USD');
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('CxC inactiva, de otro cliente, moneda o factura');
        app(AplicadorNotasFELCxC::class)->aplicar($nota);
    }

    public function test_nota_no_confirmada_es_rechazada(): void
    {
        [$nota, $cuenta] = $this->escenario('NCRE', '700.000', '200.00', 'CERTIFICADO', 'N');
        try {
            app(AplicadorNotasFELCxC::class)->aplicar($nota);
            $this->fail('Se esperaba rechazo de nota no confirmada.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('Nota FEL sin certificación', $e->getMessage());
        }
        $this->assertSame('700.000', $this->saldo($cuenta));
        $this->assertSame(0, DB::table('adm_cxc_movimientos_fel')->where('idnota', $nota)->count());
    }
}
