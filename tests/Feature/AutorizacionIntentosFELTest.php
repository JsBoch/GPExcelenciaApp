<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class AutorizacionIntentosFELTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (!app()->environment('testing')
            || DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test'
            || config('services.infile.envio_intentos_habilitado', false) !== false) {
            throw new RuntimeException('Pruebas de autorización FEL bloqueadas: entorno inseguro.');
        }

        foreach (['users', 'perfiles', 'opciones', 'perfil_usuario', 'opcion_perfil', 'adm_fel_intentos'] as $tabla) {
            if (!DB::getSchemaBuilder()->hasTable($tabla)) {
                throw new RuntimeException("Falta tabla de testing: {$tabla}");
            }
        }
    }

    private function intentoPreparado(): int
    {
        return DB::table('adm_fel_intentos')->insertGetId([
            'idcotizacion' => 900001,
            'tipo_documento' => 'NCRE',
            'uuid_origen' => (string) \Illuminate\Support\Str::uuid(),
            'identificador' => (string) \Illuminate\Support\Str::uuid(),
            'xml_hash' => hash('sha256', '<xml/>'),
            'xml_enviado' => '<xml/>',
            'metadatos_fiscales' => '{}',
            'estado' => 'PREPARADO',
            'respuesta_certificador' => null,
        ]);
    }

    private function usuarioConPerfil(string $perfil): User
    {
        $idPerfil = DB::table('perfiles')->where('nombre', $perfil)->value('id_perfil');
        if (!$idPerfil) {
            throw new RuntimeException("No existe perfil ficticio {$perfil} en la base testing.");
        }

        $id = DB::table('users')->insertGetId([
            'name' => 'fel-test-' . \Illuminate\Support\Str::lower((string) \Illuminate\Support\Str::random(10)),
            'email' => (string) \Illuminate\Support\Str::uuid() . '@example.invalid',
            'password' => bcrypt((string) \Illuminate\Support\Str::random(32)),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('perfil_usuario')->insert(['user_id' => $id, 'perfil_id' => $idPerfil]);

        return User::findOrFail($id);
    }

    public function test_consulta_sin_autenticacion_devuelve_401(): void
    {
        $id = $this->intentoPreparado();
        $this->getJson("/api/fel/notas/intentos/{$id}")->assertStatus(401);
    }

    public function test_ventas_no_puede_consultar_devuelve_403(): void
    {
        $id = $this->intentoPreparado();
        Sanctum::actingAs($this->usuarioConPerfil('VENTAS'));
        $this->getJson("/api/fel/notas/intentos/{$id}")->assertStatus(403);
    }

    public function test_administrador_puede_consultar_devuelve_200(): void
    {
        $id = $this->intentoPreparado();
        Sanctum::actingAs($this->usuarioConPerfil('ADMINISTRADOR'));
        $this->getJson("/api/fel/notas/intentos/{$id}")
            ->assertOk()
            ->assertJsonPath('resultado', true)
            ->assertJsonPath('intento.idintento', $id)
            ->assertJsonPath('intento.estado', 'PREPARADO')
            ->assertJsonPath('permite_transmitir', false);
    }

    public function test_facturacion_no_puede_conciliar_devuelve_403(): void
    {
        $id = $this->intentoPreparado();
        Sanctum::actingAs($this->usuarioConPerfil('FACTURACIÓN'));
        $this->postJson("/api/fel/notas/intentos/{$id}/conciliar-local")
            ->assertStatus(403);
    }

    public function test_administrador_con_intento_preparado_recibe_409_sin_modificarlo(): void
    {
        $id = $this->intentoPreparado();
        Sanctum::actingAs($this->usuarioConPerfil('ADMINISTRADOR'));
        $this->postJson("/api/fel/notas/intentos/{$id}/conciliar-local")
            ->assertStatus(409)
            ->assertJsonPath('resultado', false);
        $this->assertDatabaseHas('adm_fel_intentos', [
            'idintento' => $id,
            'estado' => 'PREPARADO',
            'idnota' => null,
        ]);
    }
}
