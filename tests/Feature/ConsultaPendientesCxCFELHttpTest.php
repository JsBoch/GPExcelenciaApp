<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class ConsultaPendientesCxCFELHttpTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (!app()->environment('testing') ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false) {
            throw new RuntimeException('Pruebas HTTP CXC FEL bloqueadas: entorno no seguro.');
        }

        foreach (['users', 'perfiles', 'perfil_usuario', 'opciones', 'opcion_perfil',
            'adm_cotizacion', 'clientes', 'adm_notas_fel', 'adm_fel_intentos',
            'adm_cuentas_porcobrar', 'adm_cxc_movimientos_fel'] as $tabla) {
            if (!DB::getSchemaBuilder()->hasTable($tabla)) {
                throw new RuntimeException("Falta tabla de testing: {$tabla}");
            }
        }
    }

    private function usuarioConPerfil(string $perfil): User
    {
        $idPerfil = DB::table('perfiles')->where('nombre', $perfil)->value('id_perfil');
        if (!$idPerfil) {
            throw new RuntimeException("No existe perfil ficticio {$perfil} en testing.");
        }

        $id = DB::table('users')->insertGetId([
            'name' => 'test-fel-' . Str::lower(Str::random(10)),
            'email' => Str::uuid() . '@example.invalid',
            'password' => bcrypt(Str::random(32)),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('perfil_usuario')->insert(['user_id' => $id, 'perfil_id' => $idPerfil]);
        return User::findOrFail($id);
    }

    /** Los valores 900001 son fixtures ya instalados de testing; cada inserción se revierte. */
    private function nota(string $estado = 'CERTIFICADO', string $resultado = 'S',
                          bool $coincide = true): int
    {
        $uuidOrigen = (string) Str::uuid();
        $uuidNota = (string) Str::uuid();
        $identificador = (string) Str::uuid();

        $idnota = DB::table('adm_notas_fel')->insertGetId([
            'idcotizacion' => 900001,
            'idcliente' => 900001,
            'tipo' => 'NCRE',
            'monto_total' => '200.00',
            'motivo' => 'SIMULACION PRUEBA HTTP',
            'uuid_origen' => $uuidOrigen,
            'identificador' => $identificador,
            'resultado' => $resultado,
            'uuid_nota' => $uuidNota,
            'serie_nota' => 'TEST',
            'numero_nota' => '1',
            'fecha_nota' => now(),
            'created_at' => now(),
        ]);

        DB::table('adm_fel_intentos')->insert([
            'idcotizacion' => 900001,
            'tipo_documento' => 'NCRE',
            'uuid_origen' => $uuidOrigen,
            'identificador' => $identificador,
            'xml_hash' => hash('sha256', 'PRUEBA SIN ENVIO'),
            'xml_enviado' => 'PRUEBA SIN ENVIO',
            'estado' => $estado,
            'idnota' => $idnota,
            'uuid' => $coincide ? $uuidNota : (string) Str::uuid(),
        ]);

        return $idnota;
    }

    private function insertarMovimiento(int $idnota): void
    {
        $idcxc = random_int(1100000, 1900000);
        $idfactura = 0; // La cuenta es únicamente fixture de FK, no una factura real.

        DB::table('adm_cuentas_porcobrar')->insert([
            'idcuentaporcobrar' => $idcxc, 'idcotizacion' => 900001,
            'idcliente' => 900001,
            'fecha_emision' => now()->toDateString(),
            'fecha_vencimiento' => now()->addMonth()->toDateString(),
            'moneda' => 'GTQ', 'tasa_cambio' => '1.000',
            'monto_original' => '1000.000', 'saldo_pendiente' => '500.000',
            'monto_pagado' => '300.000', 'descuento_aplicado' => '0.000',
            'idusuario_creacion' => 1, 'usuario_creacion' => 'FEL TEST',
            'fecha_creacion' => now(), 'origen_registro' => 'FEL TEST',
            'centro_costo' => '', 'cuenta_contable' => '',
            'estatus_riesgo' => '', 'estado' => 1,
            'idfactura' => $idfactura,
        ]);
        DB::table('adm_cxc_movimientos_fel')->insert([
            'idcuentaporcobrar' => $idcxc,
            'idnota' => $idnota, 'tipo' => 'NCRE',
            'monto_nota' => '200.000', 'monto_aplicado' => '200.000',
            'excedente' => '0.000', 'saldo_anterior' => '700.000',
            'saldo_nuevo' => '500.000', 'fecha_registro' => now(),
        ]);
    }

    public function test_no_autenticado_devuelve_401(): void
    {
        $this->getJson('/api/fel/notas/cxc/pendientes')->assertStatus(401);
    }

    public function test_perfil_sin_permiso_devuelve_403(): void
    {
        Sanctum::actingAs($this->usuarioConPerfil('VENTAS'));
        $this->getJson('/api/fel/notas/cxc/pendientes')->assertStatus(403);
    }

    public function test_autorizado_obtiene_pendiente_y_no_expone_xml(): void
    {
        $idnota = $this->nota();
        Sanctum::actingAs($this->usuarioConPerfil('ADMINISTRADOR'));

        $r = $this->getJson('/api/fel/notas/cxc/pendientes?idcotizacion=900001&limite=10');
        $r->assertOk()->assertJsonPath('resultado', true)
            ->assertJsonPath('solo_lectura', true)
            ->assertJsonPath('limite', 10)
            ->assertJsonPath('total_devueltos', 1)
            ->assertJsonPath('pendientes.0.idnota', $idnota);
        $this->assertArrayNotHasKey('xml_enviado', $r->json('pendientes.0'));
        $this->assertArrayNotHasKey('xml_certificado', $r->json('pendientes.0'));
        $this->assertArrayNotHasKey('respuesta_certificador', $r->json('pendientes.0'));
    }

    public function test_filtrar_otra_cotizacion_no_devuelve_la_nota(): void
    {
        $this->nota();
        Sanctum::actingAs($this->usuarioConPerfil('ADMINISTRADOR'));
        $this->getJson('/api/fel/notas/cxc/pendientes?idcotizacion=900002')
            ->assertOk()->assertJsonPath('total_devueltos', 0)
            ->assertJsonPath('pendientes', []);
    }

    public function test_nota_con_movimiento_ya_aplicado_no_aparece(): void
    {
        $idnota = $this->nota();
        $this->insertarMovimiento($idnota);
        Sanctum::actingAs($this->usuarioConPerfil('ADMINISTRADOR'));
        $this->getJson('/api/fel/notas/cxc/pendientes?idcotizacion=900001')
            ->assertOk()->assertJsonPath('total_devueltos', 0);
    }

    public function test_nota_con_intento_no_certificado_no_aparece(): void
    {
        $this->nota('INCIERTO');
        Sanctum::actingAs($this->usuarioConPerfil('ADMINISTRADOR'));
        $this->getJson('/api/fel/notas/cxc/pendientes?idcotizacion=900001')
            ->assertOk()->assertJsonPath('total_devueltos', 0);
    }

    public function test_nota_sin_resultado_s_no_aparece(): void
    {
        $this->nota('CERTIFICADO', 'N');
        Sanctum::actingAs($this->usuarioConPerfil('ADMINISTRADOR'));
        $this->getJson('/api/fel/notas/cxc/pendientes?idcotizacion=900001')
            ->assertOk()->assertJsonPath('total_devueltos', 0);
    }

    public function test_intento_con_uuid_distinto_no_aparece(): void
    {
        $this->nota('CERTIFICADO', 'S', false);
        Sanctum::actingAs($this->usuarioConPerfil('ADMINISTRADOR'));
        $this->getJson('/api/fel/notas/cxc/pendientes?idcotizacion=900001')
            ->assertOk()->assertJsonPath('total_devueltos', 0);
    }

    public function test_parametros_invalidos_devuelven_422(): void
    {
        Sanctum::actingAs($this->usuarioConPerfil('ADMINISTRADOR'));
        $this->getJson('/api/fel/notas/cxc/pendientes?limite=101&idcotizacion=-1')
            ->assertStatus(422)->assertJsonValidationErrors(['limite', 'idcotizacion']);
    }
}
