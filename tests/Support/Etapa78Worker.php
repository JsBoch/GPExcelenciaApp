<?php
/** Etapa 78: CLI exclusivamente para gp_excelencia_fel_test. No exponer por HTTP. */
if (PHP_SAPI !== 'cli' || count($argv) !== 7) { fwrite(STDERR, "Argumentos invalidos\n"); exit(2); }
[$script,$accion,$idCxc,$idNota,$idUsuario,$dir,$monto] = $argv;
if (!in_array($accion,['hold','recibo'],true) || !ctype_digit($idCxc) || !ctype_digit($idNota) || !ctype_digit($idUsuario) || !is_dir($dir) || $monto !== '600.00') exit(2);
$root = dirname(__DIR__,2);
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$db = Illuminate\Support\Facades\DB::connection();
if (!app()->environment('testing') || $db->getDriverName() !== 'mysql' || $db->getDatabaseName() !== 'gp_excelencia_fel_test' || config('services.infile.envio_intentos_habilitado',false) !== false) {
    fwrite(STDERR,"Entorno inseguro\n"); exit(3);
}
$db->statement('SET SESSION innodb_lock_wait_timeout = 2');
try {
    if ($accion === 'hold') {
        $db->beginTransaction();
        try {
            if (!$db->table('adm_cuentas_porcobrar')->where('idcuentaporcobrar',(int)$idCxc)->lockForUpdate()->first()) throw new RuntimeException('CXC no existe');
            file_put_contents($dir.'/locked','1');
            $fin = microtime(true)+15;
            while (!file_exists($dir.'/release') && microtime(true)<$fin) usleep(40000);
            if (!file_exists($dir.'/release')) throw new RuntimeException('No se libero el bloqueo');
        } finally { $db->rollBack(); }
        file_put_contents($dir.'/released','1');
    } else {
        Illuminate\Support\Facades\Auth::login(App\Models\User::findOrFail((int)$idUsuario));
        $request = Illuminate\Http\Request::create('/prueba-concurrencia-78','POST',[
            'idcliente'=>900001,'fecha_recibo'=>date('Y-m-d'),'metodo_pago'=>'DEPOSITO',
            'moneda'=>'GTQ','serie'=>'T78','numero'=>780001,'tipo'=>'RECIBO',
            'monto_recibido'=>$monto,
            'detalle'=>[['idcuentaporcobrar'=>(int)$idCxc,'monto'=>$monto]],
        ]);
        try {
            $response = app(App\Http\Controllers\AdmRecibosController::class)->store($request);
            file_put_contents($dir.'/recibo_respuesta.json',json_encode(['status'=>$response->getStatusCode(),'body'=>$response->getData(true)]));
        } catch (Illuminate\Database\QueryException $e) {
            if ((int)($e->errorInfo[1] ?? 0) !== 1205) throw $e;
            file_put_contents($dir.'/recibo_timeout','1');
        }
    }
    exit(0);
} catch (Throwable $e) { fwrite(STDERR,$e::class.': '.$e->getMessage().PHP_EOL); exit(5); }
