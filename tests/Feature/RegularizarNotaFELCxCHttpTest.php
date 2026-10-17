<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

/**
 * Etapa 70: HTTP real -> Gate -> controlador -> AplicadorNotasFELCxC.
 * Solo gp_excelencia_fel_test. NO invoca INFILE.
 */
class RegularizarNotaFELCxCHttpTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (!app()->environment('testing')
            || DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test'
            || config('services.infile.envio_intentos_habilitado', false) !== false) {
            throw new RuntimeException('Prueba de escritura bloqueada: entorno o base inseguros.');
        }
        foreach (['users','perfiles','perfil_usuario','opciones','opcion_perfil',
            'clientes','adm_cotizacion','adm_facturacion','adm_notas_fel',
            'adm_fel_intentos','adm_cuentas_porcobrar','adm_cxc_movimientos_fel'] as $tabla) {
            if (!DB::getSchemaBuilder()->hasTable($tabla)) {
                throw new RuntimeException("Tabla de testing faltante: {$tabla}");
            }
        }
    }

    private function usuario(string $perfil = 'ADMINISTRADOR'): User
    {
        $idPerfil = DB::table('perfiles')->where('nombre', $perfil)->value('id_perfil');
        if (!$idPerfil) throw new RuntimeException("Perfil sintético {$perfil} no encontrado.");
        $id = DB::table('users')->insertGetId([
            'name' => 'fel-escritura-' . Str::random(10),
            'email' => Str::uuid() . '@example.invalid',
            'password' => bcrypt(Str::random(24)),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('perfil_usuario')->insert(['user_id' => $id, 'perfil_id' => $idPerfil]);
        return User::findOrFail($id);
    }

    private function autorizarPrueba(): void
    {
        // Reutiliza SOLO DURANTE LA TRANSACCION el permiso sintético de consulta
        // instalado en gp_excelencia_fel_test. DatabaseTransactions revierte el cambio.
        $op = DB::table('opciones')->where('ruta', 'fel-consultar-intentos')->first();
        if (!$op || DB::table('opciones')->where('ruta', 'fel-regularizar-cxc')->exists()) {
            throw new RuntimeException('Opciones de testing inesperadas; revisar fixtures antes de continuar.');
        }
        DB::table('opciones')->where('ruta', 'fel-consultar-intentos')
            ->update(['ruta' => 'fel-regularizar-cxc']);
    }

    private function escenario(string $tipo = 'NCRE', string $moneda = 'GTQ',
                               string $estadoIntento = 'CERTIFICADO', string $resultado = 'S'): array
    {
        $uuidOrigen = (string) Str::uuid();
        $uuidNota = (string) Str::uuid();
        $identificador = (string) Str::uuid();
        $idfactura = DB::table('adm_facturacion')->insertGetId([
            'idcotizacion' => 900001, 'resultado' => 'S', 'estado' => 1,
            'uuid' => $uuidOrigen, 'serie' => 'TEST', 'numero' => '1',
            'total_factura' => '1000.00', 'fecha_certificacion' => now(),
        ]);
        $idcuenta = random_int(1100000, 1900000);
        DB::table('adm_cuentas_porcobrar')->insert([
            'idcuentaporcobrar' => $idcuenta, 'idcotizacion' => 900001,
            'idcliente' => 900001, 'fecha_emision' => now()->toDateString(),
            'fecha_vencimiento' => now()->addMonth()->toDateString(),
            'moneda' => $moneda, 'tasa_cambio' => '1.000',
            'monto_original' => '1000.000', 'saldo_pendiente' => '700.000',
            'monto_pagado' => '300.000', 'descuento_aplicado' => '0.000',
            'idusuario_creacion' => 1, 'usuario_creacion' => 'FEL TEST',
            'fecha_creacion' => now(), 'origen_registro' => 'FEL TEST',
            'centro_costo' => '', 'cuenta_contable' => '', 'estatus_riesgo' => '',
            'estado' => 1, 'idfactura' => $idfactura,
        ]);
        $idnota = DB::table('adm_notas_fel')->insertGetId([
            'idcotizacion' => 900001, 'idcliente' => 900001, 'tipo' => $tipo,
            'motivo' => 'SIMULACION HTTP SIN ENVIO', 'monto_total' => '200.00',
            'uuid_origen' => $uuidOrigen, 'idfactura_origen' => $idfactura,
            'identificador' => $identificador, 'resultado' => $resultado,
            'uuid_nota' => $uuidNota, 'serie_nota' => 'SIM',
            'numero_nota' => '1', 'fecha_nota' => now(),
        ]);
        DB::table('adm_fel_intentos')->insert([
            'idcotizacion' => 900001, 'tipo_documento' => $tipo,
            'uuid_origen' => $uuidOrigen, 'identificador' => $identificador,
            'xml_hash' => hash('sha256', 'SIMULACION'),
            'xml_enviado' => 'SIMULACION', 'estado' => $estadoIntento,
            'idnota' => $idnota, 'uuid' => $uuidNota,
        ]);
        return compact('idnota', 'idcuenta', 'uuidNota');
    }

    private function url(int $idnota): string
    {
        return "/api/fel/notas/{$idnota}/regularizar-cxc";
    }

    private function cuerpo(string $uuid): array
    {
        return ['uuid_nota' => $uuid, 'confirmacion' => 'REGULARIZAR_CXC'];
    }

    public function test_no_autenticado_recibe_401(): void
    {
        $d = $this->escenario();
        $this->postJson($this->url($d['idnota']), $this->cuerpo($d['uuidNota']))->assertStatus(401);
        $this->assertSame(0, DB::table('adm_cxc_movimientos_fel')->where('idnota', $d['idnota'])->count());
    }

    public function test_sin_permiso_de_escritura_recibe_403(): void
    {
        $d = $this->escenario();
        Sanctum::actingAs($this->usuario('ADMINISTRADOR'));
        $this->postJson($this->url($d['idnota']), $this->cuerpo($d['uuidNota']))->assertStatus(403);
        $this->assertSame(0, DB::table('adm_cxc_movimientos_fel')->where('idnota', $d['idnota'])->count());
    }

    public function test_confirmacion_incorrecta_recibe_422(): void
    {
        $d = $this->escenario(); $this->autorizarPrueba();
        Sanctum::actingAs($this->usuario());
        $this->postJson($this->url($d['idnota']), [
            'uuid_nota' => $d['uuidNota'], 'confirmacion' => 'APLICAR',
        ])->assertStatus(422)->assertJsonValidationErrors('confirmacion');
    }

    public function test_uuid_distinto_recibe_409_y_no_modifica(): void
    {
        $d = $this->escenario(); $this->autorizarPrueba();
        Sanctum::actingAs($this->usuario());
        $this->postJson($this->url($d['idnota']), $this->cuerpo((string) Str::uuid()))
            ->assertStatus(409)->assertJsonPath('resultado', false);
        $this->assertDatabaseHas('adm_cuentas_porcobrar', [
            'idcuentaporcobrar' => $d['idcuenta'], 'saldo_pendiente' => '700.000',
        ]);
    }

    public function test_nota_no_certificada_recibe_409(): void
    {
        $d = $this->escenario('NCRE', 'GTQ', 'CERTIFICADO', 'N');
        $this->autorizarPrueba(); Sanctum::actingAs($this->usuario());
        $this->postJson($this->url($d['idnota']), $this->cuerpo($d['uuidNota']))
            ->assertStatus(409)->assertJsonPath('resultado', false);
    }

    public function test_regularizacion_ncre_exitosa_actualiza_una_vez(): void
    {
        $d = $this->escenario(); $this->autorizarPrueba(); Sanctum::actingAs($this->usuario());
        $this->postJson($this->url($d['idnota']), $this->cuerpo($d['uuidNota']))
            ->assertOk()->assertJsonPath('resultado', true)
            ->assertJsonPath('estado_cxc', 'APLICADA')
            ->assertJsonPath('ya_existia', false);
        $this->assertDatabaseHas('adm_cuentas_porcobrar', [
            'idcuentaporcobrar' => $d['idcuenta'], 'saldo_pendiente' => '500.000',
            'monto_pagado' => '300.000', 'monto_original' => '1000.000',
        ]);
        $this->assertSame(1, DB::table('adm_cxc_movimientos_fel')->where('idnota', $d['idnota'])->count());
    }

    public function test_segunda_regularizacion_no_duplica_movimiento(): void
    {
        $d = $this->escenario(); $this->autorizarPrueba(); Sanctum::actingAs($this->usuario());
        $primera = $this->postJson($this->url($d['idnota']), $this->cuerpo($d['uuidNota']))->assertOk();
        $segunda = $this->postJson($this->url($d['idnota']), $this->cuerpo($d['uuidNota']))
            ->assertOk()->assertJsonPath('ya_existia', true);
        $this->assertSame($primera->json('movimiento.idmovimiento'), $segunda->json('movimiento.idmovimiento'));
        $this->assertSame(1, DB::table('adm_cxc_movimientos_fel')->where('idnota', $d['idnota'])->count());
        $this->assertDatabaseHas('adm_cuentas_porcobrar', [
            'idcuentaporcobrar' => $d['idcuenta'], 'saldo_pendiente' => '500.000',
        ]);
    }

    public function test_error_financiero_conserva_la_nota_y_el_saldo(): void
    {
        $d = $this->escenario('NCRE', 'USD'); $this->autorizarPrueba(); Sanctum::actingAs($this->usuario());
        $this->postJson($this->url($d['idnota']), $this->cuerpo($d['uuidNota']))
            ->assertStatus(409)->assertJsonPath('estado_cxc', 'PENDIENTE_REVISION');
        $this->assertDatabaseHas('adm_notas_fel', [
            'idnota' => $d['idnota'], 'uuid_nota' => $d['uuidNota'], 'resultado' => 'S',
        ]);
        $this->assertDatabaseHas('adm_cuentas_porcobrar', [
            'idcuentaporcobrar' => $d['idcuenta'], 'saldo_pendiente' => '700.000',
            'monto_pagado' => '300.000',
        ]);
        $this->assertSame(0, DB::table('adm_cxc_movimientos_fel')->where('idnota', $d['idnota'])->count());
    }

    public function test_intento_no_certificado_rechazado_por_servicio(): void
    {
        $d = $this->escenario('NCRE', 'GTQ', 'INCIERTO');
        $this->autorizarPrueba(); Sanctum::actingAs($this->usuario());
        $this->postJson($this->url($d['idnota']), $this->cuerpo($d['uuidNota']))
            ->assertStatus(409)->assertJsonPath('estado_cxc', 'PENDIENTE_REVISION');
        $this->assertSame(0, DB::table('adm_cxc_movimientos_fel')->where('idnota', $d['idnota'])->count());
    }
}
