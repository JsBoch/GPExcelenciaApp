<?php

namespace Tests\Feature;

use App\Http\Controllers\MonitorFacturacionController;
use App\Models\User;
use App\Models\Correlativo;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

/**
 * Simulacion de certificacion FCAM y persistencia fiscal/financiera, SIN INFILE.
 * Requiere una cotizacion COMPLETA en gp_excelencia_fel_test, seleccionada
 * expresamente por variable de entorno FCAM_TEST_COTIZACION_ID.
 */
class FCAMCertificacionSimuladaIntegralTest extends TestCase
{
    use DatabaseTransactions;

    private int $idCotizacion;
    private string $uuidSimulado;

    protected function setUp(): void
    {
        parent::setUp();

        if (!app()->environment('testing') ||
            DB::connection()->getDriverName() !== 'mysql' ||
            DB::connection()->getDatabaseName() !== 'gp_excelencia_fel_test' ||
            config('services.infile.envio_intentos_habilitado', false) !== false ||
            config('services.infile.fcam_intentos_habilitado', false) !== false) {
            throw new RuntimeException('BLOQUEADO: requiere testing MySQL aislado con ambas banderas deshabilitadas.');
        }

        $this->idCotizacion = 890078;
        $this->crearCotizacionFicticia();
        $this->prepararCorrelativosFicticios();

        // Autenticacion ficticia en memoria: no requiere datos en `users`.
        // Este controlador se invoca directamente y solo usa auth para auditoria.
        $usuario = new User();
        $usuario->id = 890078;
        $usuario->name = 'OPERADOR FCAM TEST';
        $usuario->nombre = 'OPERADOR FCAM TEST';
        $usuario->exists = true;
        $this->actingAs($usuario);
        $this->uuidSimulado = strtoupper((string) Str::uuid());
        Http::preventStrayRequests();
        Http::fake(['*' => Http::response([
            'resultado' => true,
            'uuid' => $this->uuidSimulado,
            'serie' => 'SIMULADA',
            'numero' => '123456',
            'descripcion' => 'RESPUESTA SIMULADA SIN VALIDEZ FISCAL',
            'fecha' => now()->format('Y-m-d\TH:i:s'),
            'xml_certificado' => base64_encode('<DTE>SOLO SIMULACION</DTE>'),
            'descripcion_alertas_infile' => [],
        ], 200)]);
    }

    private function crearCotizacionFicticia(): void
    {
        foreach (['adm_detalle_cotizacion', 'adm_municipio', 'adm_departamentopais'] as $tabla) {
            if (!Schema::hasTable($tabla)) {
                throw new RuntimeException("Falta la tabla {$tabla}; ejecuta FCAM_Testing_Estructura.sql SOLO en gp_excelencia_fel_test.");
            }
        }
        $id = $this->idCotizacion;
        foreach (['adm_cotizacion' => 'idcotizacion',
                  'adm_facturacion' => 'idcotizacion',
                  'adm_cuentas_porcobrar' => 'idcotizacion',
                  'adm_fel_intentos' => 'idcotizacion'] as $tabla => $columna) {
            if (DB::table($tabla)->where($columna, $id)->exists()) {
                throw new RuntimeException("Fixture id {$id} ya utilizado en {$tabla}. No se modifica.");
            }
        }
        // La tabla adm_pais del esquema aislado puede ser una version minima
        // anterior sin codigo_iso. No dependemos de columnas opcionales.
        if (!Schema::hasTable('adm_pais')) {
            throw new RuntimeException('Falta adm_pais en gp_excelencia_fel_test.');
        }
        $pais = DB::table('adm_pais')->orderBy('idpais')->value('idpais');
        if ($pais === null) {
            // Crear un pais estrictamente ficticio, respetando las columnas
            // presentes en la version de la tabla de testing.
            $nuevoPais = ['idpais' => 890078];
            if (Schema::hasColumn('adm_pais', 'codigo_iso')) {
                $nuevoPais['codigo_iso'] = 'GT';
            }
            if (Schema::hasColumn('adm_pais', 'nombre')) {
                $nuevoPais['nombre'] = 'GUATEMALA TEST';
            }
            if (Schema::hasColumn('adm_pais', 'estado')) {
                $nuevoPais['estado'] = 1;
            }
            DB::table('adm_pais')->insert($nuevoPais);
            $pais = 890078;
        }
        $departamento = 245;
        $municipio = 30001;
        if (!DB::table('adm_departamentopais')->where('iddepartamentopais', $departamento)->exists()) {
            DB::table('adm_departamentopais')->insert([
                'iddepartamentopais' => $departamento, 'nombre' => 'GUATEMALA TEST',
                'estado' => 1, 'iniciales' => 'GT', 'codigo_postal' => '01001',
            ]);
        }
        if (!DB::table('adm_municipio')->where('id_municipio', $municipio)->exists()) {
            DB::table('adm_municipio')->insert([
                'id_municipio' => $municipio, 'id_departamento' => $departamento,
                'nombre' => 'MUNICIPIO TEST', 'estado' => 1,
            ]);
        }
        $cliente = 890078;
        if (DB::table('clientes')->where('idcliente', $cliente)->exists()) {
            throw new RuntimeException('El ID de cliente fixture 890078 esta ocupado.');
        }
        DB::table('clientes')->insert([
            'idcliente' => $cliente, 'nit' => 'CF', 'nombre' => 'CLIENTE FICTICIO FCAM',
            'direccion' => 'DIRECCION FICTICIA', 'email' => null,
            'iddepartamento' => $departamento, 'idpais' => $pais,
            'razonsocial' => 'CLIENTE FICTICIO FCAM', 'id_municipio' => $municipio,
            'codigo_postal' => '01001', 'excento_iva' => 'N', 'extranjero' => 'N',
            'estado' => 1,
        ]);
        DB::table('adm_cotizacion')->insert([
            'idcotizacion' => $id, 'idcliente' => $cliente, 'estado' => 5,
            'nocotizacion' => 890078, 'tipo_facturacion' => 'BIEN',
            'subtotal' => 100, 'descuento_monto' => 0,
            'impuesto_iva' => 12, 'total' => 112, 'total_general' => 112,
            'timbre_prensa_base' => 0, 'timbre_prensa_porcentaje' => 0.5,
            'timbre_prensa_monto' => 0,
        ]);
        DB::table('adm_detalle_cotizacion')->insert([
            'iddetallecotizacion' => 890078, 'idcotizacion' => $id,
            'cantidad' => 1, 'unidad_medida' => 'UNI',
            'descripcion' => 'PRODUCTO FICTICIO SIN TIMBRE',
            'precio_unitario' => 112, 'precio' => 112, 'descuento' => 0,
            'subtotal' => 100, 'impuesto_iva' => 12, 'total' => 112,
            'aplica_timbre_prensa' => 'N', 'estado' => 1,
        ]);
        // Todo permanece dentro de DatabaseTransactions y se revierte al finalizar.
    }

    private function prepararCorrelativosFicticios(): void
    {
        if (!Schema::hasTable('cor_correlativo')) {
            throw new RuntimeException('Falta cor_correlativo en la base de testing.');
        }

        // El controlador exige ambos correlativos. Se insertan SOLAMENTE
        // si no existen y se revierten junto al resto de la fixture.
        foreach ([
            'nofactura' => 910000,
            'adm_cuentas_porcobrar' => 920000,
        ] as $tabla => $numeroInicial) {
            if (!DB::table('cor_correlativo')->where('tabla', $tabla)->exists()) {
                DB::table('cor_correlativo')->insert([
                    'tabla' => $tabla,
                    'correlativo' => $numeroInicial,
                    'incremento' => 1,
                    'anio' => 2026,
                ]);
            }
            // Validar la ruta de lectura que usa el controlador real.
            if (!Correlativo::query()->find($tabla)) {
                throw new RuntimeException(
                    "El modelo Correlativo no encuentra '{$tabla}'. Revisar primaryKey y tabla del modelo."
                );
            }
        }
    }

    public function test_fcam_sin_timbre_guarda_factura_cxc_e_intento_una_sola_vez(): void
    {
        // Solo durante esta prueba: habilita el NUEVO flujo en memoria.
        // En .env/.env.testing ambas banderas siguen siendo FALSE.
        config()->set('services.infile.fcam_intentos_habilitado', true);
        config()->set('services.infile.envio_intentos_habilitado', true);
        config()->set('services.infile.url', 'https://certificador.feel.com.gt/fel/procesounificado/transaccion/v2/xml');
        config()->set('services.infile.usuario_api', 'SIMULADO');
        config()->set('services.infile.llave_api', 'SIMULADA');
        config()->set('services.infile.usuario_firma', 'SIMULADO');
        config()->set('services.infile.llave_firma', 'SIMULADA');

        $solicitud = Request::create('/api/facturar/'.$this->idCotizacion, 'POST', [
            'documento_tipo' => 'CF',
            'documento_valor' => '',
            'nombre' => 'CONSUMIDOR FINAL',
            'direccion' => 'CIUDAD DE GUATEMALA',
            'email' => '',
        ]);
        $response = app(MonitorFacturacionController::class)->generarXMLFactura($solicitud, $this->idCotizacion);
        $data = json_decode($response->getContent(), true);

        // Diagnostico local: la respuesta INCIERTO oculta una excepcion de BD.
        // Nunca reenviar el DTE para averiguarla; consultar el intento persistido.
        $intentoDiagnostico = DB::table('adm_fel_intentos')
            ->where('idcotizacion', $this->idCotizacion)
            ->orderByDesc('idintento')
            ->first();
        $diagnostico = [
            'http' => $response->getStatusCode(),
            'respuesta' => $data,
            'intento_estado' => $intentoDiagnostico->estado ?? null,
            'intento_error' => $intentoDiagnostico->mensaje_error ?? null,
            'respuesta_certificador_simulada_guardada' =>
                !empty($intentoDiagnostico->respuesta_certificador),
            'facturas_registradas' => DB::table('adm_facturacion')
                ->where('idcotizacion', $this->idCotizacion)->count(),
            'cxc_registradas' => DB::table('adm_cuentas_porcobrar')
                ->where('idcotizacion', $this->idCotizacion)->count(),
        ];
        $this->assertSame(200, $response->getStatusCode(),
            json_encode($diagnostico, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $this->assertTrue($data['resultado'] ?? false, json_encode($data));
        $this->assertSame($this->uuidSimulado, $data['uuid'] ?? null);
        Http::assertSentCount(1);

        $facturas = DB::table('adm_facturacion')->where('idcotizacion', $this->idCotizacion)->get();
        $this->assertCount(1, $facturas);
        $this->assertSame($this->uuidSimulado, (string) $facturas[0]->uuid);
        $this->assertSame('S', (string) $facturas[0]->resultado);
        $this->assertSame(0.0, (float) $facturas[0]->timbre_prensa_monto);

        $cuentas = DB::table('adm_cuentas_porcobrar')->where('idcotizacion', $this->idCotizacion)->get();
        $this->assertCount(1, $cuentas);
        $this->assertEqualsWithDelta((float) $facturas[0]->total_factura, (float) $cuentas[0]->saldo_pendiente, 0.001);
        $this->assertSame((int) $facturas[0]->idfactura, (int) $cuentas[0]->idfactura);

        $intentos = DB::table('adm_fel_intentos')->where('idcotizacion', $this->idCotizacion)->get();
        $this->assertCount(1, $intentos);
        $this->assertSame('CERTIFICADO', $intentos[0]->estado);
        $this->assertSame($this->uuidSimulado, (string) $intentos[0]->uuid);
        $this->assertSame((int) $facturas[0]->idfactura, (int) $intentos[0]->idfactura);
        $this->assertSame(6, (int) DB::table('adm_cotizacion')->where('idcotizacion', $this->idCotizacion)->value('estado'));
        // DatabaseTransactions revierte todos los cambios de la base al finalizar.
    }
}
