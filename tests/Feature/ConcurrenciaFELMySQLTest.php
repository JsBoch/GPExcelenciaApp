<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

/**
 * Comprueba bloqueos InnoDB mediante dos conexiones PDO realmente separadas.
 * No utiliza DatabaseTransactions: las pruebas gestionan sus transacciones
 * explícitamente para no ocultar los bloqueos entre conexiones.
 * No envía HTTP, no modifica filas y no necesita migraciones.
 */
class ConcurrenciaFELMySQLTest extends TestCase
{
    private const COTIZACION_PRUEBA = 900001;
    private const CONEXION_B = 'fel_concurrencia_b';

    protected function setUp(): void
    {
        parent::setUp();

        if (
            !app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false ||
            DB::connection()->getDriverName() !== 'mysql'
        ) {
            throw new RuntimeException('Concurrencia FEL bloqueada: entorno/base/configuracion incorrectos.');
        }

        if (!DB::table('adm_cotizacion')->where('idcotizacion', self::COTIZACION_PRUEBA)->exists()) {
            throw new RuntimeException('Falta cotizacion ficticia 900001 en la base de testing.');
        }

        $config = config('database.connections.mysql');
        config()->set('database.connections.' . self::CONEXION_B, $config);
        DB::purge(self::CONEXION_B);

        // Fallar pronto en vez de bloquear la suite durante mucho tiempo.
        DB::connection(self::CONEXION_B)->statement('SET SESSION innodb_lock_wait_timeout = 1');
    }

    protected function tearDown(): void
    {
        foreach ([self::CONEXION_B, config('database.default')] as $nombre) {
            try {
                $c = DB::connection($nombre);
                while ($c->transactionLevel() > 0) {
                    $c->rollBack();
                }
            } catch (\Throwable $e) {
                // No ocultar la excepcion principal del test.
            }
        }
        DB::disconnect(self::CONEXION_B);
        DB::purge(self::CONEXION_B);
        parent::tearDown();
    }

    public function test_otra_conexion_no_puede_bloquear_cotizacion_mientras_primera_la_reserva(): void
    {
        $a = DB::connection();
        $b = DB::connection(self::CONEXION_B);

        $this->assertNotSame(
            (int) $a->selectOne('SELECT CONNECTION_ID() AS id')->id,
            (int) $b->selectOne('SELECT CONNECTION_ID() AS id')->id,
            'La prueba requiere conexiones MySQL independientes.'
        );

        $a->beginTransaction();
        try {
            $fila = $a->table('adm_cotizacion')
                ->where('idcotizacion', self::COTIZACION_PRUEBA)
                ->lockForUpdate()->first();
            $this->assertNotNull($fila);

            $b->beginTransaction();
            try {
                $b->table('adm_cotizacion')
                    ->where('idcotizacion', self::COTIZACION_PRUEBA)
                    ->lockForUpdate()->first();
                $this->fail('La conexion B logro el bloqueo mientras A lo mantenia.');
            } catch (QueryException $e) {
                // MySQL ER_LOCK_WAIT_TIMEOUT=1205, SQLSTATE HY000.
                $this->assertSame(1205, (int) ($e->errorInfo[1] ?? 0), $e->getMessage());
            } finally {
                if ($b->transactionLevel() > 0) {
                    $b->rollBack();
                }
            }
        } finally {
            if ($a->transactionLevel() > 0) {
                $a->rollBack();
            }
        }

        // Liberado el bloqueo de A, B puede entrar.
        $b->beginTransaction();
        try {
            $filaB = $b->table('adm_cotizacion')
                ->where('idcotizacion', self::COTIZACION_PRUEBA)
                ->lockForUpdate()->first();
            $this->assertNotNull($filaB);
            $this->assertSame(self::COTIZACION_PRUEBA, (int) $filaB->idcotizacion);
        } finally {
            if ($b->transactionLevel() > 0) {
                $b->rollBack();
            }
        }
    }
}
