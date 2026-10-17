<?php
/** Worker CLI exclusivamente para test en base aislada. NO exponer como ruta web. */
if (PHP_SAPI !== 'cli' || ($argv[1] ?? '') === '' || count($argv) !== 5) {
    fwrite(STDERR, "Uso: php Etapa77Worker.php hold|apply idcxc idnota directorio\n"); exit(2);
}
[$script, $accion, $idcuenta, $idnota, $directorio] = $argv;
if (!in_array($accion, ['hold','apply'], true) || !ctype_digit($idcuenta) || !ctype_digit($idnota) || !is_dir($directorio)) exit(2);
$root = dirname(__DIR__, 2); // instalado en tests/Support/Etapa77Worker.php
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$db = Illuminate\Support\Facades\DB::connection();
if (!app()->environment('testing') || $db->getDriverName() !== 'mysql' ||
    $db->getDatabaseName() !== 'gp_excelencia_fel_test' ||
    config('services.infile.envio_intentos_habilitado', false) !== false) {
    fwrite(STDERR, 'ERROR SEGURIDAD: entorno, BD o INFILE no seguros'.PHP_EOL); exit(3);
}
$db->statement('SET SESSION innodb_lock_wait_timeout = 2');
try {
    if ($accion === 'hold') {
        $db->beginTransaction();
        try {
            $row = $db->table('adm_cuentas_porcobrar')->where('idcuentaporcobrar', (int)$idcuenta)->lockForUpdate()->first();
            if (!$row) throw new RuntimeException('CxC ficticia no encontrada');
            file_put_contents($directorio.'/locked', '1');
            $deadline = microtime(true) + 15;
            while (!file_exists($directorio.'/release') && microtime(true) < $deadline) usleep(40000);
            if (!file_exists($directorio.'/release')) throw new RuntimeException('Timeout esperando release');
        } finally { $db->rollBack(); }
        file_put_contents($directorio.'/released', '1');
    } else {
        // La sesión A retiene el bloqueo más de 2 segundos: se espera 1205, SIN efectos parciales.
        try {
            app(App\Services\AplicadorNotasFELCxC::class)->aplicar((int)$idnota);
            file_put_contents($directorio.'/applied_unexpectedly', '1');
            exit(4);
        } catch (Illuminate\Database\QueryException $e) {
            if ((int)($e->errorInfo[1] ?? 0) !== 1205) throw $e;
            file_put_contents($directorio.'/timeout_ok', '1');
        }
    }
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, $e::class.': '.$e->getMessage().PHP_EOL); exit(5);
}
