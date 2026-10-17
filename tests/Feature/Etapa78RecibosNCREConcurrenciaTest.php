<?php
namespace Tests\Feature;

use App\Services\AplicadorNotasFELCxC;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * Etapa 78: competencia real con procesos PHP separados y controladores/servicios reales.
 * SIN DatabaseTransactions; sin --parallel; solo gp_excelencia_fel_test.
 */
class Etapa78RecibosNCREConcurrenciaTest extends TestCase
{
    private ?int $cuenta=null, $factura=null, $nota=null, $usuario=null;
    private ?string $identificador=null, $dir=null;
    private array $procesos=[];
    private ?int $correlativoInicial=null;

    protected function setUp(): void
    {
        parent::setUp();
        if (!app()->environment('testing') || DB::connection()->getDriverName()!=='mysql'
            || DB::connection()->getDatabaseName()!=='gp_excelencia_fel_test'
            || config('services.infile.envio_intentos_habilitado',false)!==false) {
            throw new RuntimeException('Seguridad: solo testing MySQL aislado con INFILE desactivado');
        }
        if (!DB::table('clientes')->where('idcliente',900001)->exists()
            || !DB::table('adm_cotizacion')->where('idcotizacion',900001)->exists()
            || DB::table('adm_cuentas_porcobrar')->where('idcotizacion',900001)->exists()) {
            throw new RuntimeException('Fixture 900001 ausente u ocupado; no sobrescribir datos');
        }
        $cor=DB::table('cor_correlativo')->where('tabla','adm_recibos')->first();
        if (!$cor || DB::table('cor_correlativo')->where('tabla','adm_recibos')->count()!==1) {
            throw new RuntimeException('Se necesita un único correlativo ficticio adm_recibos en testing');
        }
        $this->correlativoInicial=(int)$cor->correlativo;
        if (DB::table('adm_recibos')->where('idrecibo',$this->correlativoInicial+(int)$cor->incremento)->exists()) {
            throw new RuntimeException('Siguiente correlativo de pruebas ya ocupado');
        }
        $this->dir=sys_get_temp_dir().DIRECTORY_SEPARATOR.'gp-fel-78-'.bin2hex(random_bytes(8));
        if (!mkdir($this->dir,0700)) throw new RuntimeException('No se creó directorio temporal');
        $origen=(string)Str::uuid(); $uuid=(string)Str::uuid();
        $this->identificador=(string)Str::uuid();
        $this->usuario=DB::table('users')->insertGetId([
            'name'=>'Etapa78','email'=>Str::uuid().'@example.invalid',
            'password'=>bcrypt(Str::random(24)),'created_at'=>now(),'updated_at'=>now(),
        ]);
        $this->factura=DB::table('adm_facturacion')->insertGetId([
            'idcotizacion'=>900001,'resultado'=>'S','estado'=>1,'uuid'=>$origen,
            'serie'=>'TEST','numero'=>'1','total_factura'=>'1000.00','fecha_certificacion'=>now(),
        ]);
        $this->cuenta=random_int(60000000,200000000);
        DB::table('adm_cuentas_porcobrar')->insert([
            'idcuentaporcobrar'=>$this->cuenta,'idcotizacion'=>900001,'idcliente'=>900001,
            'fecha_emision'=>'2026-01-01','fecha_vencimiento'=>'2026-02-01',
            'moneda'=>'GTQ','tasa_cambio'=>'1.000','monto_original'=>'1000.000',
            'saldo_pendiente'=>'700.000','monto_pagado'=>'300.000',
            'descuento_aplicado'=>'0.000','idusuario_creacion'=>$this->usuario,
            'usuario_creacion'=>'FEL TEST','fecha_creacion'=>now(),
            'origen_registro'=>'FEL TEST','centro_costo'=>'','cuenta_contable'=>'',
            'estatus_riesgo'=>'','estado'=>1,'idfactura'=>$this->factura,
        ]);
        $this->nota=DB::table('adm_notas_fel')->insertGetId([
            'idcotizacion'=>900001,'idcliente'=>900001,'tipo'=>'NCRE','motivo'=>'SIMULACION',
            'monto_total'=>'200.00','uuid_origen'=>$origen,'idfactura_origen'=>$this->factura,
            'identificador'=>$this->identificador,'resultado'=>'S','uuid_nota'=>$uuid,
            'serie_nota'=>'SIM','numero_nota'=>'1','fecha_nota'=>now(),
        ]);
        DB::table('adm_fel_intentos')->insert([
            'idcotizacion'=>900001,'tipo_documento'=>'NCRE','uuid_origen'=>$origen,
            'identificador'=>$this->identificador,'xml_hash'=>hash('sha256','SIMULACION'),
            'xml_enviado'=>'SIMULACION','estado'=>'CERTIFICADO','idnota'=>$this->nota,'uuid'=>$uuid,
        ]);
    }

    private function iniciar(string $accion): Process
    {
        $p=new Process([
            PHP_BINARY,base_path('tests/Support/Etapa78Worker.php'),$accion,
            (string)$this->cuenta,(string)$this->nota,(string)$this->usuario,$this->dir,'600.00',
        ],base_path(),[
            'APP_ENV'=>'testing','DB_CONNECTION'=>'mysql',
            'DB_DATABASE'=>'gp_excelencia_fel_test','INFILE_ENVIO_INTENTOS_HABILITADO'=>'false',
        ]);
        $p->setTimeout(30); $p->start(); $this->procesos[]=$p; return $p;
    }

    private function esperar(string $señal,Process $p,int $segundos=10): void
    {
        $fin=microtime(true)+$segundos;
        while (!file_exists($this->dir.'/'.$señal) && microtime(true)<$fin) {
            if (!$p->isRunning()) throw new RuntimeException('Worker terminó: '.$p->getErrorOutput().' '.$p->getOutput());
            usleep(50000);
        }
        $this->assertFileExists($this->dir.'/'.$señal);
    }

    private function iniciarYAgotarBloqueo(): void
    {
        $a=$this->iniciar('hold'); $this->esperar('locked',$a);
        $b=$this->iniciar('recibo'); $this->esperar('recibo_timeout',$b,12);
        $b->wait(); $this->assertTrue($b->isSuccessful(),$b->getErrorOutput());
        $this->assertSame(0,DB::table('adm_recibo_detalle')->where('idcuentaporcobrar',$this->cuenta)->count());
        $this->assertSame($this->correlativoInicial,(int)DB::table('cor_correlativo')->where('tabla','adm_recibos')->value('correlativo'));
        file_put_contents($this->dir.'/release','1'); $a->wait();
        $this->assertTrue($a->isSuccessful(),$a->getErrorOutput());
    }

    private function reciboDespues(): array
    {
        @unlink($this->dir.'/recibo_respuesta.json');
        $p=$this->iniciar('recibo'); $this->esperar('recibo_respuesta.json',$p);
        $p->wait(); $this->assertTrue($p->isSuccessful(),$p->getErrorOutput());
        return json_decode(file_get_contents($this->dir.'/recibo_respuesta.json'),true,512,JSON_THROW_ON_ERROR);
    }

    public function test_ncre_primero_rechaza_recibo_de_600_sin_consumir_correlativo(): void
    {
        $this->iniciarYAgotarBloqueo();
        $r=app(AplicadorNotasFELCxC::class)->aplicar($this->nota);
        $this->assertFalse($r['ya_existia']);
        $this->assertEquals('500.000',DB::table('adm_cuentas_porcobrar')->where('idcuentaporcobrar',$this->cuenta)->value('saldo_pendiente'));
        $respuesta=$this->reciboDespues();
        $this->assertSame(422,$respuesta['status']);
        $this->assertSame(0,DB::table('adm_recibo_detalle')->where('idcuentaporcobrar',$this->cuenta)->count());
        $this->assertSame($this->correlativoInicial,(int)DB::table('cor_correlativo')->where('tabla','adm_recibos')->value('correlativo'));
        $this->assertEquals('500.000',DB::table('adm_cuentas_porcobrar')->where('idcuentaporcobrar',$this->cuenta)->value('saldo_pendiente'));
        $this->assertSame(1,DB::table('adm_cxc_movimientos_fel')->where('idnota',$this->nota)->count());
    }

    public function test_recibo_primero_y_ncre_despues_registra_excedente_sin_duplicar(): void
    {
        $this->iniciarYAgotarBloqueo();
        $respuesta=$this->reciboDespues();
        $this->assertSame(200,$respuesta['status']);
        $this->assertEquals('100.000',DB::table('adm_cuentas_porcobrar')->where('idcuentaporcobrar',$this->cuenta)->value('saldo_pendiente'));
        $this->assertEquals('900.000',DB::table('adm_cuentas_porcobrar')->where('idcuentaporcobrar',$this->cuenta)->value('monto_pagado'));
        $uno=app(AplicadorNotasFELCxC::class)->aplicar($this->nota);
        $dos=app(AplicadorNotasFELCxC::class)->aplicar($this->nota);
        $this->assertFalse($uno['ya_existia']); $this->assertTrue($dos['ya_existia']);
        $this->assertEquals('100.000',$uno['excedente']);
        $this->assertEquals('0.000',DB::table('adm_cuentas_porcobrar')->where('idcuentaporcobrar',$this->cuenta)->value('saldo_pendiente'));
        $this->assertSame(1,DB::table('adm_recibo_detalle')->where('idcuentaporcobrar',$this->cuenta)->count());
        $this->assertSame(1,DB::table('adm_cxc_movimientos_fel')->where('idnota',$this->nota)->count());
    }

    protected function tearDown(): void
    {
        if ($this->dir && is_dir($this->dir)) @file_put_contents($this->dir.'/release','1');
        foreach ($this->procesos as $p) {
            try { if ($p->isRunning()) $p->wait(); } catch (\Throwable $e) { try{$p->stop(1);}catch(\Throwable $ignore){} }
        }
        try {
            if (DB::connection()->getDatabaseName()==='gp_excelencia_fel_test') {
                if ($this->cuenta) {
                    $recibos=DB::table('adm_recibo_detalle')->where('idcuentaporcobrar',$this->cuenta)->pluck('idrecibo');
                    DB::table('adm_recibo_detalle')->where('idcuentaporcobrar',$this->cuenta)->delete();
                    if ($recibos->isNotEmpty()) DB::table('adm_recibos')->whereIn('idrecibo',$recibos)->where('serie','T78')->delete();
                }
                if ($this->nota) DB::table('adm_cxc_movimientos_fel')->where('idnota',$this->nota)->delete();
                if ($this->identificador) DB::table('adm_fel_intentos')->where('identificador',$this->identificador)->delete();
                if ($this->nota) DB::table('adm_notas_fel')->where('idnota',$this->nota)->delete();
                if ($this->cuenta) DB::table('adm_cuentas_porcobrar')->where('idcuentaporcobrar',$this->cuenta)->where('idcotizacion',900001)->delete();
                if ($this->factura) DB::table('adm_facturacion')->where('idfactura',$this->factura)->where('idcotizacion',900001)->delete();
                if ($this->usuario) DB::table('users')->where('id',$this->usuario)->delete();
                // Restaurar correlativo de testing solo si pertenece a esta prueba y nadie más lo usa.
                if ($this->correlativoInicial!==null) DB::table('cor_correlativo')->where('tabla','adm_recibos')->where('correlativo',$this->correlativoInicial+1)->update(['correlativo'=>$this->correlativoInicial]);
            }
        } finally {
            if ($this->dir && is_dir($this->dir)) {foreach(glob($this->dir.'/*')?:[] as $f) @unlink($f); @rmdir($this->dir);}
            parent::tearDown();
        }
    }
}
