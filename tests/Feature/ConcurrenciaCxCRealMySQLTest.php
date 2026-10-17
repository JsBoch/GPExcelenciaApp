<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

/**
 * Etapa 76A: bloqueos reales de una CXC en dos sesiones MySQL.
 * Esta prueba NO usa DatabaseTransactions: la fila debe ser visible a ambas sesiones.
 * Crea una fila ficticia, y la borra al finalizar incluso si falla una aserción.
 * NO prueba aún los controladores completos de recibos/regularización concurrentes.
 */
class ConcurrenciaCxCRealMySQLTest extends TestCase
{
    private const DB_TEST = 'gp_excelencia_fel_test';
    private const CONEXION_B = 'cxc_concurrencia_b';

    private ?int $idCuenta = null;

    protected function setUp(): void
    {
        parent::setUp();

        $a = DB::connection();
        if (
            !app()->environment('testing') ||
            $a->getDriverName() !== 'mysql' ||
            $a->getDatabaseName() !== self::DB_TEST ||
            config('services.infile.envio_intentos_habilitado', false) !== false
        ) {
            throw new RuntimeException('Prueba bloqueada: debe usar MySQL gp_excelencia_fel_test y envío INFILE desactivado.');
        }
        if (!Schema::hasTable('adm_cuentas_porcobrar') ||
            !DB::table('adm_cotizacion')->where('idcotizacion', 900001)->exists() ||
            !DB::table('clientes')->where('idcliente', 900001)->exists()) {
            throw new RuntimeException('Faltan tablas o fixtures 900001 en la BD de testing.');
        }

        config()->set('database.connections.' . self::CONEXION_B, config('database.connections.mysql'));
        DB::purge(self::CONEXION_B);
        DB::connection(self::CONEXION_B)->statement('SET SESSION innodb_lock_wait_timeout = 1');
        $a->statement('SET SESSION innodb_lock_wait_timeout = 2');

        // Hay una restricción UNIQUE(idcotizacion). No tocar ninguna CXC preexistente.
        if ($a->table('adm_cuentas_porcobrar')->where('idcotizacion', 900001)->exists()) {
            throw new RuntimeException('La cotización ficticia 900001 ya tiene CXC; no se modifica.');
        }

        // ID alto y aleatorio para minimizar colisiones dentro de la base ficticia.
        $this->idCuenta = random_int(60000000, 200000000);
        $a->table('adm_cuentas_porcobrar')->insert([
            'idcuentaporcobrar' => $this->idCuenta,
            'idcotizacion' => 900001,
            'idcliente' => 900001,
            'fecha_emision' => '2026-01-01',
            'fecha_vencimiento' => '2026-02-01',
            'moneda' => 'GTQ',
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
            'idfactura' => 0,
        ]);
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
                // El tearDown sigue limpiando la otra conexión.
            }
        }
        try {
            if ($this->idCuenta !== null &&
                DB::connection()->getDatabaseName() === self::DB_TEST) {
                DB::table('adm_cuentas_porcobrar')
                    ->where('idcuentaporcobrar', $this->idCuenta)
                    ->where('idcotizacion', 900001)
                    ->delete();
            }
        } finally {
            DB::disconnect(self::CONEXION_B);
            DB::purge(self::CONEXION_B);
            parent::tearDown();
        }
    }

    public function test_una_segunda_sesion_no_puede_actualizar_cxc_bloqueada_y_luego_si(): void
    {
        $a = DB::connection();
        $b = DB::connection(self::CONEXION_B);
        $id = $this->idCuenta;

        $this->assertNotSame(
            (int) $a->selectOne('SELECT CONNECTION_ID() id')->id,
            (int) $b->selectOne('SELECT CONNECTION_ID() id')->id
        );

        $a->beginTransaction();
        try {
            $fila = $a->table('adm_cuentas_porcobrar')
                ->where('idcuentaporcobrar', $id)->lockForUpdate()->first();
            $this->assertNotNull($fila);

            $b->beginTransaction();
            try {
                $b->table('adm_cuentas_porcobrar')
                    ->where('idcuentaporcobrar', $id)
                    ->update(['saldo_pendiente' => '600.000']);
                $this->fail('La segunda sesión actualizó una CXC bloqueada.');
            } catch (QueryException $e) {
                $this->assertSame(1205, (int) ($e->errorInfo[1] ?? 0));
            } finally {
                if ($b->transactionLevel() > 0) $b->rollBack();
            }
        } finally {
            if ($a->transactionLevel() > 0) $a->rollBack();
        }

        $this->assertEquals('700.000', $a->table('adm_cuentas_porcobrar')
            ->where('idcuentaporcobrar', $id)->value('saldo_pendiente'));

        $b->beginTransaction();
        try {
            $filas = $b->table('adm_cuentas_porcobrar')
                ->where('idcuentaporcobrar', $id)
                ->update(['saldo_pendiente' => '600.000']);
            $this->assertSame(1, $filas);
            $this->assertEquals('600.000', $b->table('adm_cuentas_porcobrar')
                ->where('idcuentaporcobrar', $id)->value('saldo_pendiente'));
        } finally {
            if ($b->transactionLevel() > 0) $b->rollBack();
        }
        $this->assertEquals('700.000', $a->table('adm_cuentas_porcobrar')
            ->where('idcuentaporcobrar', $id)->value('saldo_pendiente'));
    }

    public function test_rollback_de_primera_sesion_descarta_cambio_y_libera_bloqueo(): void
    {
        $a = DB::connection();
        $b = DB::connection(self::CONEXION_B);
        $id = $this->idCuenta;

        $a->beginTransaction();
        try {
            $a->table('adm_cuentas_porcobrar')
                ->where('idcuentaporcobrar', $id)->lockForUpdate()->first();
            $a->table('adm_cuentas_porcobrar')
                ->where('idcuentaporcobrar', $id)
                ->update(['saldo_pendiente' => '100.000']);
        } finally {
            if ($a->transactionLevel() > 0) $a->rollBack();
        }

        $b->beginTransaction();
        try {
            $this->assertEquals('700.000', $b->table('adm_cuentas_porcobrar')
                ->where('idcuentaporcobrar', $id)->lockForUpdate()->value('saldo_pendiente'));
        } finally {
            if ($b->transactionLevel() > 0) $b->rollBack();
        }
    }
}
