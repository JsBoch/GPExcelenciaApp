<?php
namespace Tests\Feature;

use App\Services\AplicadorNotasFELCxC;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * Etapa 77A: dos procesos PHP reales (distintas conexiones/sesiones MySQL).
 * NO usar DatabaseTransactions: los fixtures deben estar visibles a los procesos hijos.
 * Ejecutar SOLO en gp_excelencia_fel_test y SIN --parallel.
 */
class Etapa77ConcurrenciaServicioFELTest extends TestCase
{
    private ?int $cuenta = null;
    private ?int $factura = null;
    private ?int $nota = null;
    private ?string $identificador = null;
    private ?string $dir = null;
    private array $procesos = [];

    protected function setUp(): void
    {
        parent::setUp();
        $c = DB::connection();
        if (!app()->environment('testing') || $c->getDriverName() !== 'mysql' ||
            $c->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false) {
            throw new RuntimeException('Seguridad: únicamente MySQL gp_excelencia_fel_test, INFILE desactivado.');
        }
        if (!DB::table('clientes')->where('idcliente',900001)->exists() ||
            !DB::table('adm_cotizacion')->where('idcotizacion',900001)->exists() ||
            DB::table('adm_cuentas_porcobrar')->where('idcotizacion',900001)->exists()) {
            throw new RuntimeException('Fixtures 900001 ausentes u ocupados; no se modifica información preexistente.');
        }
        $this->dir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'gp-fel-77-'.bin2hex(random_bytes(8));
        if (!mkdir($this->dir, 0700)) throw new RuntimeException('No se pudo crear directorio temporal');
        $origen = (string) Str::uuid();
        $uuid = (string) Str::uuid();
        $this->identificador = (string) Str::uuid();
        $this->factura = DB::table('adm_facturacion')->insertGetId([
            'idcotizacion'=>900001, 'resultado'=>'S', 'estado'=>1,
            'uuid'=>$origen, 'serie'=>'TEST', 'numero'=>'1',
            'total_factura'=>'1000.00', 'fecha_certificacion'=>now(),
        ]);
        $this->cuenta = random_int(60000000,200000000);
        DB::table('adm_cuentas_porcobrar')->insert([
            'idcuentaporcobrar'=>$this->cuenta, 'idcotizacion'=>900001,
            'idcliente'=>900001, 'fecha_emision'=>'2026-01-01',
            'fecha_vencimiento'=>'2026-02-01', 'moneda'=>'GTQ',
            'tasa_cambio'=>'1.000', 'monto_original'=>'1000.000',
            'saldo_pendiente'=>'700.000', 'monto_pagado'=>'300.000',
            'descuento_aplicado'=>'0.000', 'idusuario_creacion'=>1,
            'usuario_creacion'=>'FEL TEST', 'fecha_creacion'=>now(),
            'origen_registro'=>'FEL TEST', 'centro_costo'=>'',
            'cuenta_contable'=>'', 'estatus_riesgo'=>'', 'estado'=>1,
            'idfactura'=>$this->factura,
        ]);
        $this->nota = DB::table('adm_notas_fel')->insertGetId([
            'idcotizacion'=>900001, 'idcliente'=>900001, 'tipo'=>'NCRE',
            'motivo'=>'SIMULACION', 'monto_total'=>'200.00',
            'uuid_origen'=>$origen, 'idfactura_origen'=>$this->factura,
            'identificador'=>$this->identificador, 'resultado'=>'S',
            'uuid_nota'=>$uuid, 'serie_nota'=>'SIM', 'numero_nota'=>'1',
            'fecha_nota'=>now(),
        ]);
        DB::table('adm_fel_intentos')->insert([
            'idcotizacion'=>900001, 'tipo_documento'=>'NCRE',
            'uuid_origen'=>$origen, 'identificador'=>$this->identificador,
            'xml_hash'=>hash('sha256','SIMULACION'), 'xml_enviado'=>'SIMULACION',
            'estado'=>'CERTIFICADO', 'idnota'=>$this->nota, 'uuid'=>$uuid,
        ]);
    }

    private function iniciar(string $accion): Process
    {
        $env = [
            'APP_ENV'=>'testing',
            'DB_CONNECTION'=>'mysql',
            'DB_DATABASE'=>'gp_excelencia_fel_test',
            'INFILE_ENVIO_INTENTOS_HABILITADO'=>'false',
        ];
        $p = new Process([
            PHP_BINARY, base_path('tests/Support/Etapa77Worker.php'),
            $accion, (string)$this->cuenta, (string)$this->nota, $this->dir,
        ], base_path(), $env);
        $p->setTimeout(30);
        $p->start();
        $this->procesos[] = $p;
        return $p;
    }

    private function esperarArchivo(string $nombre, Process $proceso, int $segundos = 10): void
    {
        $fin = microtime(true) + $segundos;
        while (!file_exists($this->dir.'/'.$nombre) && microtime(true) < $fin) {
            if (!$proceso->isRunning()) {
                throw new RuntimeException('Proceso terminó anticipadamente: '.$proceso->getErrorOutput().' '.$proceso->getOutput());
            }
            usleep(50000);
        }
        $this->assertFileExists($this->dir.'/'.$nombre, "No apareció señal {$nombre}. {$proceso->getErrorOutput()}");
    }

    public function test_bloqueo_impide_aplicacion_parcial_y_reintento_aplica_una_sola_vez(): void
    {
        $a = $this->iniciar('hold');
        $this->esperarArchivo('locked', $a);
        $b = $this->iniciar('apply');
        $this->esperarArchivo('timeout_ok', $b, 12);
        $b->wait();
        $this->assertTrue($b->isSuccessful(), $b->getErrorOutput());
        $this->assertEquals('700.000', DB::table('adm_cuentas_porcobrar')->where('idcuentaporcobrar',$this->cuenta)->value('saldo_pendiente'));
        $this->assertSame(0, DB::table('adm_cxc_movimientos_fel')->where('idnota',$this->nota)->count());
        file_put_contents($this->dir.'/release','1');
        $a->wait();
        $this->assertTrue($a->isSuccessful(), $a->getErrorOutput());
        $uno = app(AplicadorNotasFELCxC::class)->aplicar($this->nota);
        $dos = app(AplicadorNotasFELCxC::class)->aplicar($this->nota);
        $this->assertFalse($uno['ya_existia']);
        $this->assertTrue($dos['ya_existia']);
        $this->assertSame($uno['idmovimiento'], $dos['idmovimiento']);
        $this->assertEquals('500.000', DB::table('adm_cuentas_porcobrar')->where('idcuentaporcobrar',$this->cuenta)->value('saldo_pendiente'));
        $this->assertSame(1, DB::table('adm_cxc_movimientos_fel')->where('idnota',$this->nota)->count());
    }

    protected function tearDown(): void
    {
        if ($this->dir && is_dir($this->dir)) @file_put_contents($this->dir.'/release','1');
        foreach ($this->procesos as $p) {
            try { if ($p->isRunning()) { $p->wait(); } } catch (\Throwable $e) { try { $p->stop(1); } catch (\Throwable $ignore) {} }
        }
        try {
            if (DB::connection()->getDatabaseName() === 'gp_excelencia_fel_test') {
                if ($this->nota) DB::table('adm_cxc_movimientos_fel')->where('idnota',$this->nota)->delete();
                if ($this->identificador) DB::table('adm_fel_intentos')->where('identificador',$this->identificador)->delete();
                if ($this->nota) DB::table('adm_notas_fel')->where('idnota',$this->nota)->delete();
                if ($this->cuenta) DB::table('adm_cuentas_porcobrar')->where('idcuentaporcobrar',$this->cuenta)->where('idcotizacion',900001)->delete();
                if ($this->factura) DB::table('adm_facturacion')->where('idfactura',$this->factura)->where('idcotizacion',900001)->delete();
            }
        } finally {
            if ($this->dir && is_dir($this->dir)) {
                foreach (glob($this->dir.'/*') ?: [] as $f) @unlink($f);
                @rmdir($this->dir);
            }
            parent::tearDown();
        }
    }
}
