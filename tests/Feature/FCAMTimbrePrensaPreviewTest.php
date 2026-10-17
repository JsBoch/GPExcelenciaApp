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
class FCAMTimbrePrensaPreviewTest extends TestCase
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
            'subtotal' => 1558.03, 'descuento_monto' => 0,
            'impuesto_iva' => 186.97, 'total' => 1745, 'total_general' => 1752.47,
            'timbre_prensa_base' => 1491.07, 'timbre_prensa_porcentaje' => 0.5,
            'timbre_prensa_monto' => 7.47,
        ]);
        // Cuatro líneas: tres publicitarias y una sin timbre.
        // Base gravable IVA y gravable de timbre coinciden en las tres primeras.
        $lineas = [
            [400.00, 357.14, 42.86, 'S'],
            [400.00, 357.14, 42.86, 'S'],
            [870.00, 776.79, 93.21, 'S'],
            [75.00, 66.96, 8.04, 'N'],
        ];
        foreach ($lineas as $numero => [$total, $base, $iva, $timbre]) {
            DB::table('adm_detalle_cotizacion')->insert([
                'iddetallecotizacion' => 890078 + $numero,
                'idcotizacion' => $id,
                'cantidad' => 1,
                'unidad_medida' => 'UNI',
                'descripcion' => $timbre === 'S' ? 'PUBLICIDAD FICTICIA '.($numero + 1) : 'SERVICIO SIN PUBLICIDAD',
                'precio_unitario' => $total,
                'precio' => $total,
                'descuento' => 0,
                'subtotal' => $base,
                'impuesto_iva' => $iva,
                'total' => $total,
                'aplica_timbre_prensa' => $timbre,
                'estado' => 1,
            ]);
        }
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

    private function solicitud(array $extra = []): Request
    {
        return Request::create('/api/facturar/'.$this->idCotizacion, 'POST', array_merge([
            'documento_tipo' => 'CF',
            'documento_valor' => '',
            'nombre' => 'CONSUMIDOR FINAL',
            'direccion' => 'CIUDAD DE GUATEMALA',
            'email' => '',
        ], $extra));
    }

    public function test_xml_previo_contiene_timbre_y_cuadra_totales(): void
    {
        $respuesta = app(MonitorFacturacionController::class)
            ->generarXMLFactura($this->solicitud(['vista_previa_xml' => true]), $this->idCotizacion);
        $this->assertSame(200, $respuesta->getStatusCode(), $respuesta->getContent());
        $datos = json_decode($respuesta->getContent(), true);
        $this->assertSame('VISTA_PREVIA_XML_SIN_CERTIFICAR', $datos['modo'] ?? null);
        $this->assertEqualsWithDelta(1745, (float) ($datos['totales']['total_sin_timbre'] ?? 0), .001);
        $this->assertEqualsWithDelta(7.47, (float) ($datos['totales']['timbre_xml'] ?? 0), .001);
        $this->assertEqualsWithDelta(1752.47, (float) ($datos['totales']['total_con_timbre'] ?? 0), .001);
        $xml = new \DOMDocument();
        $this->assertTrue($xml->loadXML($datos['xml']));
        $xp = new \DOMXPath($xml);
        $xp->registerNamespace('dte', 'http://www.sat.gob.gt/dte/fel/0.2.0');
        $this->assertSame(4, $xp->query('//dte:Items/dte:Item')->length);
        $this->assertSame(3, $xp->query('//dte:Items/dte:Item/dte:Impuestos/dte:Impuesto[dte:NombreCorto="TIMBRE DE PRENSA"]')->length);
        $this->assertEqualsWithDelta(7.47, (float) $xp->evaluate('string(//dte:Totales/dte:TotalImpuestos/dte:TotalImpuesto[@NombreCorto="TIMBRE DE PRENSA"]/@TotalMontoImpuesto)'), .001);
        $this->assertEqualsWithDelta(1752.47, (float) $xp->evaluate('string(//dte:Totales/dte:GranTotal)'), .001);
        $this->assertEqualsWithDelta(1752.47, (float) $xp->evaluate('string(//*[local-name()="MontoAbono"])'), .001);
        Http::assertNothingSent();
        $this->assertSame(0, DB::table('adm_fel_intentos')->where('idcotizacion', $this->idCotizacion)->count());
        $this->assertSame(0, DB::table('adm_facturacion')->where('idcotizacion', $this->idCotizacion)->count());
    }

    public function test_certificacion_con_timbre_sigue_bloqueada(): void
    {
        $respuesta = app(MonitorFacturacionController::class)
            ->generarXMLFactura($this->solicitud(), $this->idCotizacion);
        $this->assertSame(422, $respuesta->getStatusCode(), $respuesta->getContent());
        $this->assertStringContainsString('Timbre de Prensa', $respuesta->getContent());
        Http::assertNothingSent();
        $this->assertSame(0, DB::table('adm_facturacion')->where('idcotizacion', $this->idCotizacion)->count());
        $this->assertSame(0, DB::table('adm_cuentas_porcobrar')->where('idcotizacion', $this->idCotizacion)->count());
    }
}
