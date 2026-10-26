<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AdmCotizacion;
use App\Models\AdmDetalleCotizacion;
use NumberToWords\NumberToWords;
use App\Models\Correlativo;
use App\Models\AdmCuentasPorCobrar;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Support\NitUtils;
use Carbon\Carbon;
use App\Models\ComentarioPreFacturacion;
use App\Models\AdmFacturacion;
use App\Services\CotizacionPdfService;
use App\Support\ClasificadorRespuestaFEL;
use App\Support\FCAMTimbreAutorizacion;



class MonitorFacturacionController extends Controller
{
    private CotizacionPdfService $cotizacionPdfService;

    public function __construct(
        CotizacionPdfService $cotizacionPdfService
    ) {
        $this->cotizacionPdfService = $cotizacionPdfService;
    }

    public function index(Request $request)
    {
        $estado      = $request->query('estado');
        $fechaInicio = $request->query('fechaInicio');
        $fechaFinal  = $request->query('fechaFinal');
        $idvendedor  = $request->query('idvendedor');

        $end   = $fechaFinal  ? Carbon::parse($fechaFinal)  : Carbon::today();
        $start = $fechaInicio ? Carbon::parse($fechaInicio) : $end->copy();

        $desde = $start->copy()->startOfDay()->toDateTimeString();
        $hasta = $end->copy()->addDay()->startOfDay()->toDateTimeString();

        // ==============================
        // 🔹 Consulta 1: Cotizaciones (estados 4 y 5)
        // ==============================
        $cotizacionesQuery = DB::table('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->join('users as u', 'c.idusuario', '=', 'u.id')
            ->join('adm_empleados as e', 'u.id', '=', 'e.iduser')
            ->select([
                'c.idcotizacion',
                'c.idcliente',
                DB::raw("CONCAT('CT',CAST(c.nocotizacion AS CHAR)) as nocotizacion"),
                DB::raw("DATE_FORMAT(c.fecha_cotizacion, '%Y-%m-%dT%H:%i:%s') AS fecha_cotizacion"),
                't.tipo as tipo_pago',
                'e.nombre as vendedor',
                DB::raw('CAST(c.total AS DECIMAL(15,2)) AS total_general'),
                DB::raw('CAST(COALESCE(c.timbre_prensa_monto, 0) AS DECIMAL(15,2)) AS timbre_prensa_monto'),
                DB::raw('CAST(
                    COALESCE(c.total, 0) +
                    COALESCE(c.timbre_prensa_monto, 0)
                    AS DECIMAL(15,2)
                ) AS total_a_pagar'),
                'cl.nombre as cliente',
                'ct.nombre as contacto',
                'c.tipo_facturacion as tipo_facturacion',
                'c.observaciones_cliente',
                'c.estado',
                DB::raw("
                CASE 
                    WHEN c.estado = 4 THEN 'PRE-FACTURACION'
                    WHEN c.estado = 5 THEN 'PARA FACTURAR'
                    ELSE 'DESCONOCIDO'
                END as estado_texto
            "),
                DB::raw('NULL as nofactura'),
                DB::raw('NULL as uuid'),
                DB::raw('NULL as serie'),
                DB::raw('NULL as numero_fel'),
                DB::raw('NULL as resultado'),
                DB::raw('NULL as errores'),
            ])
            ->whereIn('c.estado', [4, 5]);

        // ==============================
        // 🔹 Subconsulta: última factura por cotización
        // ==============================
        $ultimaFacturaSub = DB::table('adm_facturacion')
            ->select('idcotizacion', DB::raw('MAX(idfactura) AS idfactura'))
            ->groupBy('idcotizacion');

        // ==============================
        // 🔹 Consulta 2: Facturas (vigentes o anuladas)
        // ==============================
        $facturacionQuery = DB::table('adm_facturacion as f')
            ->joinSub($ultimaFacturaSub, 'ult', function ($join) {
                $join->on('f.idcotizacion', '=', 'ult.idcotizacion')
                    ->on('f.idfactura', '=', 'ult.idfactura');
            })
            ->join('adm_cotizacion as c', 'c.idcotizacion', '=', 'f.idcotizacion')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->join('users as u', 'c.idusuario', '=', 'u.id')
            ->join('adm_empleados as e', 'u.id', '=', 'e.iduser')
            ->select([
                'c.idcotizacion',
                'c.idcliente',
                DB::raw("CONCAT('CT',CAST(c.nocotizacion AS CHAR)) as nocotizacion"),
                DB::raw("DATE_FORMAT(COALESCE(f.fecha_certificacion, f.fecha_anulacion), '%Y-%m-%dT%H:%i:%s') AS fecha_cotizacion"),
                't.tipo as tipo_pago',
                'e.nombre as vendedor',
                DB::raw('CAST(COALESCE(f.total_factura, c.total) AS DECIMAL(15,2)) AS total_general'),
                DB::raw('CAST(COALESCE(f.timbre_prensa_monto, 0) AS DECIMAL(15,2)) AS timbre_prensa_monto'),
                DB::raw('CAST(COALESCE(f.total_factura, c.total) AS DECIMAL(15,2)) AS total_a_pagar'),
                'cl.nombre as cliente',
                'ct.nombre as contacto',
                'c.tipo_facturacion as tipo_facturacion',
                'c.observaciones_cliente',
                DB::raw("
                CASE 
                    WHEN f.estado = 1 THEN 6
                    WHEN f.estado = 0 THEN 7
                    ELSE 6
                END as estado
            "),
                DB::raw("
                CASE 
                    WHEN f.estado = 1 THEN 'FACTURADA'
                    WHEN f.estado = 0 THEN 'ANULADA'
                    ELSE 'FACTURADA'
                END as estado_texto
            "),
                'f.nofactura',
                'f.uuid',
                'f.serie',
                'f.numero as numero_fel',
                'f.resultado',
                'f.errores',
            ])
            ->where('f.resultado', 'S');

        // ==============================
        // 🔹 Filtros adicionales
        // ==============================
        foreach ([$cotizacionesQuery, $facturacionQuery] as $q) {
            if (!empty($idvendedor)) {
                $q->where('e.id_empleado', $idvendedor);
            }

            if ($fechaInicio && $fechaFinal) {
                if ($q === $cotizacionesQuery) {
                    $q->whereBetween('c.fecha_cotizacion', [$desde, $hasta]);
                } else {
                    $q->whereBetween(DB::raw("COALESCE(f.fecha_certificacion, f.fecha_anulacion)"), [$desde, $hasta]);
                }
            }
        }

        // ==============================
        // 🔹 Condición según estado
        // ==============================
        if (in_array($estado, ['4', '5'])) {
            $query = $cotizacionesQuery->where('c.estado', (int)$estado);
        } elseif ($estado === '6') {
            // FACTURADAS
            $query = $facturacionQuery->where('f.estado', 1);
        } elseif ($estado === '7' || $estado === '0') {
            // ANULADAS
            $query = $facturacionQuery->where('f.estado', 0);
        } else {
            // Todos → unir las dos
            $query = $cotizacionesQuery->unionAll($facturacionQuery);
        }

        // ==============================
        // 🔹 Ejecución y limpieza
        // ==============================
        $cotizaciones = DB::table(DB::raw("({$query->toSql()}) as sub"))
            ->mergeBindings($query)
            ->orderBy('fecha_cotizacion', 'desc')
            ->get();

        foreach ($cotizaciones as $cot) {
            if (is_string($cot->errores) && $this->isJson($cot->errores)) {
                $cot->errores = json_decode($cot->errores, true);
            }
            if (isset($cot->total_general)) {
                $cot->total_general = (float)$cot->total_general;
            }
        }

        return response()->json($cotizaciones);
    }




    private function isJson($string)
    {
        json_decode($string);
        return json_last_error() === JSON_ERROR_NONE;
    }

    // === Helpers para PDF de factura (usar snapshot de adm_facturacion) ===

    /** Devuelve la última factura vigente y certificada de una cotización */
    // private function facturaVigente(int $idcotizacion): ?AdmFacturacion
    // {
    //     return AdmFacturacion::where('idcotizacion', $idcotizacion)
    //     ->where('resultado', 'S') //certificada
    //         ->whereIn('estado', [0, 1])           // 0 anulada vigent
    //         ->latest('idfactura')
    //         ->first();
    // }
    private function facturaVigente(int $idcotizacion): ?AdmFacturacion
    {
        // 1️⃣ Buscar primero la factura vigente más reciente (estado=1)
        $vigente = AdmFacturacion::where('idcotizacion', $idcotizacion)
            ->where('estado', 1)
            ->where('resultado', 'S')
            ->latest('idfactura')
            ->first();

        if ($vigente) {
            // Log::info("🧾 Factura vigente seleccionada", [
            //     'idcotizacion' => $idcotizacion,
            //     'idfactura'    => $vigente->idfactura,
            //     'estado'       => $vigente->estado,
            //     'resultado'    => $vigente->resultado,
            // ]);
            return $vigente;
        }

        // 2️⃣ Si no hay vigente, buscar la anulada más reciente (estado=0)
        $anulada = AdmFacturacion::where('idcotizacion', $idcotizacion)
            ->where('estado', 0)
            ->where('resultado', 'S')
            ->latest('idfactura')
            ->first();

        if ($anulada) {
            // Log::info("🧾 Factura ANULADA seleccionada (no hay vigente)", [
            //     'idcotizacion' => $idcotizacion,
            //     'idfactura'    => $anulada->idfactura,
            //     'estado'       => $anulada->estado,
            //     'resultado'    => $anulada->resultado,
            // ]);
            return $anulada;
        }

        // 3️⃣ Si no hay ninguna, devolver null
        return null;
    }



    private function cabeceraParaVista(AdmFacturacion $f, AdmCotizacion $c): \stdClass
    {
        $obj = new \stdClass();

        // 🔹 Identificadores y datos base
        $obj->idcotizacion        = $c->idcotizacion;
        $obj->serie               = $f->serie;
        $obj->numero              = $f->numero;
        $obj->numero_autorizacion = $f->uuid; // Antes venía de c.uuid
        $obj->fecha_emision       = $f->fecha_certificacion
            ? Carbon::parse($f->fecha_certificacion)->toDateString()
            : Carbon::now()->toDateString();
        // Usar los importes históricos de la factura certificada.
        // Facturas antiguas: mantener el comportamiento anterior.
        $obj->total = $f->total_factura !== null
            ? (float) $f->total_factura
            : (float) $c->total;

        $obj->timbre_prensa_monto = $f->timbre_prensa_monto !== null
            ? (float) $f->timbre_prensa_monto
            : 0.00;

        $obj->descuento_monto = $f->descuento_factura !== null
            ? (float) $f->descuento_factura
            : 0.00;

        $obj->iva_factura = $f->iva_factura !== null
            ? (float) $f->iva_factura
            : null;

        // 🔹 Receptor: usar SIEMPRE lo fotografiado en adm_facturacion
        $obj->nit        = $f->numero_crtf;
        $obj->nombre     = $f->nombre_crtf;
        $obj->direccion  = $f->direccion_crtf;

        // 🔹 Correlativos que tu vista usa tal cual
        $obj->nofactura    = $f->nofactura;       // interno (ya se genera en certif.)
        $obj->nocotizacion = $c->nocotizacion;

        // 🔹 Estado: si la factura está anulada, reemplaza el estado de la cotización
        if (isset($f->estado) && (int) $f->estado === 0) {
            $obj->estado = 0; // Factura ANULADA
        } else {
            // Mantiene el estado de la cotización (por ejemplo, 6 = facturada)
            $obj->estado = $c->estado ?? 6;
        }

        // 🔹 Número interno con el mismo formato de siempre
        $facturaStr    = $this->pad((int) ($f->nofactura ?? 0), 6);
        $cotizacionStr = $this->pad((int) $c->nocotizacion, 6);
        $obj->numero_interno = "GP-{$cotizacionStr}-{$facturaStr}";

        return $obj;
    }


    public function generarPdf($id)
    {
        $cotizacion = AdmCotizacion::where('c.idcotizacion', $id)
            ->select(
                'c.idcotizacion',
                'c.nocotizacion',
                'c.fecha_cotizacion',
                't.tipo as tipo_pago',
                'c.total_general',
                'c.costear',
                'cl.nombre as cliente',
                'cl.nit as nit',
                'ct.nombre as contacto',
                'e.nombre as vendedor',
                'e.movil as telefono_vendedor',
                'e.correo_personal as correo_vendedor',
                'c.direccion_entrega',
                'c.observaciones_costeo',
                'c.observaciones_cliente',
                'c.costeo_observaciones',
                'c.trabajo',
                'c.version'
            )
            ->from('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_empleados as e', 'c.idusuario', '=', 'e.iduser')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->first();

        if (! $cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $detalles             = AdmDetalleCotizacion::where('idcotizacion', $id)->get();
        $cotizacion->detalles = $detalles;

        // Convertir total a letras (usando kwn/number-to-words)
        $numberToWords     = new NumberToWords();
        $numberTransformer = $numberToWords->getNumberTransformer('es');
        $totalEnLetras     = $numberTransformer->toWords($cotizacion->total_general); // no es necesario multiplicar por 100

        //$pdf = Pdf::loadView('pdf.cotizacion', compact('cotizacion', 'totalEnLetras'));
        //return $pdf->download('cotizacion-' . $cotizacion->nocotizacion . '.pdf');
        // return response()->json(['cotizacion' => $cotizacion, 'totalEnLetras' => $totalEnLetras]);
        $pdf = Pdf::loadView('pdf.cotizacion', [
            'cotizacion'    => $cotizacion,
            'detalles'      => $detalles,
            'totalEnLetras' => $totalEnLetras,
        ])->setPaper('letter');

        // Opción A: ver en el navegador
        return $pdf->stream('cotizacion_' . $cotizacion->nocotizacion . '.pdf');

        // Opción B: forzar descarga
        // return $pdf->download('cotizacion_'.$cotizacion->nocotizacion.'.pdf');

        // Si prefieres headers explícitos:
        // return response($pdf->output(), 200)
        //   ->header('Content-Type', 'application/pdf')
        //   ->header('Content-Disposition', 'inline; filename="cotizacion_'.$cotizacion->nocotizacion.'.pdf"');
    }

    public function generarPdfJson(Request $request, $id)
    {
        try {
            // Si algún día quieres permitir cambiar la fecha desde el front,
            // puedes recibir 'fecha_cotizacion' como en el otro componente:
            $fechaInput = $request->input('fecha_cotizacion');

            // $cotizacion = AdmCotizacion::where('c.idcotizacion', $id)
            //     ->select(
            //         'c.idcotizacion',
            //         'c.nocotizacion',
            //         'c.fecha_cotizacion',
            //         't.tipo as tipo_pago',
            //         'c.total_general',
            //         'c.costear',
            //         'cl.nombre as cliente',
            //         'cl.nit as nit',
            //         'ct.nombre as contacto',
            //         'e.nombre as vendedor',
            //         'e.movil as telefono_vendedor',
            //         'e.correo_personal as correo_vendedor',
            //         'c.direccion_entrega',
            //         'c.observaciones_costeo',
            //         'c.observaciones_cliente',
            //         'c.costeo_observaciones',
            //         'c.trabajo',
            //         'c.version',
            //         'c.tipo_facturacion',
            //         'c.descuento_monto',
            //         'c.subtotal',
            //         'c.impuesto_iva',
            //         'c.total',
            //     )
            //     ->from('adm_cotizacion as c')
            //     ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            //     ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            //     ->join('adm_empleados as e', 'c.idusuario', '=', 'e.iduser')
            //     ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            //     ->first();

            // if (!$cotizacion) {
            //     return response()->json(['message' => 'Cotización no encontrada'], 404);
            // }

            $cotizacion = $this->cotizacionPdfService->obtener($id);

            if (!$cotizacion) {
                return response()->json([
                    'message' => 'Cotización no encontrada'
                ], 404);
            }
            // $detalles = AdmDetalleCotizacion::where('idcotizacion', $id)->get();
            // $cotizacion->detalles = $detalles;

            // Si te mandan fecha por request y pasa el formato, úsala; si no, deja la original
            if ($fechaInput && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaInput)) {
                $cotizacion->fecha_cotizacion = $fechaInput;
            }

            // Total a letras:
            $numberToWords     = new NumberToWords();
            $numberTransformer = $numberToWords->getNumberTransformer('es');
            // $entero = floor($cotizacion->total_general);
            // $centavos = round(($cotizacion->total_general - $entero) * 100);
            // $totalEnLetras = strtoupper($numberTransformer->toWords($entero) . ' CON ' . str_pad($centavos, 2, '0', STR_PAD_LEFT) . '/100');
            $totalEnLetras = $this->convertirNumeroALetrasConCentavos($cotizacion->total);

            return response()->json([
                'cotizacion'    => $cotizacion,
                'totalEnLetras' => $totalEnLetras,
            ]);
        } catch (\Throwable $e) {
            Log::error('Error generando PDF (JSON) en MonitorFacturación: ' . $e->getMessage());
            return response()->json(['message' => 'Error generando el PDF.'], 500);
        }
    }

    public function desactivar(Request $request, $id)
    {
        $estado = $request->input('estado', 1); // Por defecto, desactivar a estado 1 (REGISTRO)
        $cotizacion = AdmCotizacion::find($id);
        if (! $cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $cotizacion->estado = $estado;
        $cotizacion->save();

        return response()->json(['message' => 'Cotización desactivada']);
    }

    private function validarCotizacionParaFEL(
        int $idcotizacion,
        float $totalSinTimbre,
        float $timbrePrensa,
        float $totalConTimbre,
        array $detalles
    ): array {

        $cotizacion = AdmCotizacion::find($idcotizacion);

        if (!$cotizacion) {
            return [
                'valido' => false,
                'mensaje' => 'La cotización no existe.',
            ];
        }

        // 1. Verificar que esté lista para facturar.
        if ((int) $cotizacion->estado !== 5) {
            return [
                'valido' => false,
                'mensaje' =>
                'La cotización no está en estado PARA FACTURAR.',
            ];
        }

        // 2. Verificar que no exista una factura vigente.
        $facturaExistente = AdmFacturacion::where(
            'idcotizacion',
            $idcotizacion
        )
            ->where('resultado', 'S')
            ->where('estado', 1)
            ->exists();

        if ($facturaExistente) {
            return [
                'valido' => false,
                'mensaje' =>
                'Esta cotización ya tiene una factura FEL vigente.',
            ];
        }

        // 3. Comprobar el total de los detalles.
        $totalDetallesCentavos = 0;

        foreach ($detalles as $detalle) {
            $totalDetallesCentavos += (int) round(
                (float) $detalle->total * 100
            );
        }

        $totalDetalles = $totalDetallesCentavos / 100;

        if (abs($totalDetalles - $totalSinTimbre) > 0.001) {
            return [
                'valido' => false,
                'mensaje' =>
                'El total de los detalles no coincide con la cotización.',
            ];
        }

        // 4. Verificar el total antes del timbre.
        if (
            abs(
                (float) $cotizacion->total - $totalSinTimbre
            ) > 0.001
        ) {
            return [
                'valido' => false,
                'mensaje' =>
                'El total guardado no coincide con el importe preparado para FEL.',
            ];
        }

        // 5. Verificar el Timbre de Prensa.
        if (
            abs(
                (float) ($cotizacion->timbre_prensa_monto ?? 0)
                    - $timbrePrensa
            ) > 0.001
        ) {
            return [
                'valido' => false,
                'mensaje' =>
                'El Timbre de Prensa no coincide con la cotización.',
            ];
        }

        // 6. Verificar total final.
        $totalEsperado = round(
            $totalSinTimbre + $timbrePrensa,
            2
        );

        if (abs($totalEsperado - $totalConTimbre) > 0.001) {
            return [
                'valido' => false,
                'mensaje' =>
                'El total final de la factura es inconsistente.',
            ];
        }

        return [
            'valido' => true,
            'mensaje' => 'Validaciones correctas.',
        ];
    }


    private function prepararIntentoFEL(
        int $idcotizacion,
        string $xmlString
    ): array {
        return DB::transaction(function () use (
            $idcotizacion,
            $xmlString
        ) {
            // Bloquear la cotización mientras verificamos
            // y registramos el intento.
            $cotizacion = AdmCotizacion::where(
                'idcotizacion',
                $idcotizacion
            )->lockForUpdate()->firstOrFail();

            if ((int) $cotizacion->estado !== 5) {
                return [
                    'valido' => false,
                    'mensaje' => 'La cotización no está en estado PARA FACTURAR.',
                ];
            }

            // Evitar intentar facturar si ya existe una
            // factura vigente y certificada.
            $facturaVigente = AdmFacturacion::where(
                'idcotizacion',
                $idcotizacion
            )
                ->where('resultado', 'S')
                ->where('estado', 1)
                ->exists();

            if ($facturaVigente) {
                return [
                    'valido' => false,
                    'mensaje' => 'La cotización ya tiene una factura certificada vigente.',
                ];
            }

            // No permitir nuevos intentos si existe
            // un intento pendiente o de resultado incierto.
            // Por seguridad, también bloqueamos intentos
            // rechazados hasta revisar su resultado.
            $intentoAnterior = DB::table('adm_fel_intentos')
                ->where('idcotizacion', $idcotizacion)
                ->orderByDesc('idintento')
                ->first();

            if ($intentoAnterior) {
                return [
                    'valido' => false,
                    'mensaje' =>
                    'Ya existe un intento FEL para esta cotización. ' .
                        'Debe revisarse antes de generar otro.',
                    'idintento' => $intentoAnterior->idintento,
                    'estado' => $intentoAnterior->estado,
                ];
            }

            $identificador = (string) Str::uuid();

            $idintento = DB::table('adm_fel_intentos')->insertGetId([
                'idcotizacion' => $idcotizacion,
                'tipo_documento' => 'FCAM',
                'identificador' => $identificador,
                'xml_hash' => hash('sha256', $xmlString),
                'xml_enviado' => $xmlString,
                'estado' => 'PREPARADO',
                'fecha_creacion' => now(),
            ]);

            return [
                'valido' => true,
                'mensaje' => 'Intento FEL preparado correctamente.',
                'idintento' => $idintento,
                'identificador' => $identificador,
                'estado' => 'PREPARADO',
            ];
        });
    }


    private function prepararIntentoNotaFEL(
        int $idcotizacion,
        string $tipo,
        string $uuidOrigen,
        string $xmlString,
        array $notaMeta
    ): array {
        if (!in_array($tipo, ['NCRE', 'NDEB'], true)) {
            throw new \InvalidArgumentException(
                'Tipo de nota FEL no permitido.'
            );
        }

        return DB::transaction(function () use (
            $idcotizacion,
            $tipo,
            $uuidOrigen,
            $xmlString,
            $notaMeta,
        ) {
            // Serializar operaciones relacionadas con la cotización.
            $cotizacion = AdmCotizacion::where(
                'idcotizacion',
                $idcotizacion
            )->lockForUpdate()->firstOrFail();

            $factura = $this->facturaVigente($idcotizacion);

            if (
                !$factura ||
                (int) $factura->estado !== 1 ||
                (string) $factura->resultado !== 'S' ||
                strcasecmp((string) $factura->uuid, $uuidOrigen) !== 0
            ) {

                return [
                    'valido' => false,
                    'mensaje' =>
                    'No existe una factura vigente que coincida con el origen de la nota.',
                ];
            }

            // Si hay una nota pendiente o incierta de la misma
            // factura, no iniciamos otra hasta conciliarla.
            $pendiente = DB::table('adm_fel_intentos')
                ->where('uuid_origen', $uuidOrigen)
                ->whereIn('tipo_documento', ['NCRE', 'NDEB'])
                ->whereIn('estado', [
                    'PREPARADO',
                    'ENVIANDO',
                    'INCIERTO',
                ])
                ->orderByDesc('idintento')
                ->first();

            if ($pendiente) {
                return [
                    'valido' => false,
                    'mensaje' =>
                    'Existe una nota FEL pendiente o incierta para esta factura.',
                    'idintento' => $pendiente->idintento,
                    'estado' => $pendiente->estado,
                ];
            }


            if (
                strcasecmp(
                    (string) ($notaMeta['origen']['uuid'] ?? ''),
                    $uuidOrigen
                ) !== 0 ||
                ($notaMeta['tipo'] ?? '') !== $tipo ||
                empty($notaMeta['idcliente']) ||
                (float) ($notaMeta['monto_total'] ?? 0) <= 0
            ) {
                return [
                    'valido' => false,
                    'mensaje' =>
                    'Los metadatos fiscales no coinciden con la nota FEL.',
                ];
            }

            if ($tipo === 'NCRE') {
                $disponibilidad = $this->validarSaldoDisponibleNCRE(
                    $factura,
                    (float) $notaMeta['monto_total']
                );
                if (!$disponibilidad['valido']) {
                    return [
                        'valido' => false,
                        'mensaje' => $disponibilidad['mensaje'],
                        'disponibilidad' => $disponibilidad,
                    ];
                }
            }


            $identificador = (string) Str::uuid();

            $idintento = DB::table('adm_fel_intentos')
                ->insertGetId([
                    'idcotizacion' => $idcotizacion,
                    'tipo_documento' => $tipo,
                    'uuid_origen' => $uuidOrigen,
                    'identificador' => $identificador,
                    'xml_hash' => hash('sha256', $xmlString),
                    'xml_enviado' => $xmlString,
                    'metadatos_fiscales' => json_encode(
                        $notaMeta,
                        JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
                    ),
                    'estado' => 'PREPARADO',
                    'fecha_creacion' => now(),
                ]);

            return [
                'valido' => true,
                'mensaje' =>
                'Intento de nota FEL preparado correctamente.',
                'idintento' => $idintento,
                'identificador' => $identificador,
                'tipo_documento' => $tipo,
                'uuid_origen' => $uuidOrigen,
                'estado' => 'PREPARADO',
            ];
        });
    }


    private function recuperarMetadatosIntentoNotaFEL(
        int $idintento
    ): array {
        $intento = DB::table('adm_fel_intentos')
            ->where('idintento', $idintento)
            ->first();

        if (!$intento) {
            return [
                'valido' => false,
                'mensaje' => 'El intento FEL no existe.',
            ];
        }

        if (!in_array(
            $intento->tipo_documento,
            ['NCRE', 'NDEB'],
            true
        )) {
            return [
                'valido' => false,
                'mensaje' => 'No corresponde a una nota FEL.',
            ];
        }

        if (empty($intento->metadatos_fiscales)) {
            return [
                'valido' => false,
                'mensaje' =>
                'Este intento no contiene metadatos fiscales persistidos.',
            ];
        }

        try {
            $meta = json_decode(
                $intento->metadatos_fiscales,
                true,
                512,
                JSON_THROW_ON_ERROR
            );
        } catch (\JsonException $e) {
            return [
                'valido' => false,
                'mensaje' => 'Los metadatos fiscales son inválidos.',
            ];
        }

        if (
            !is_array($meta) ||
            ($meta['tipo'] ?? null) !== $intento->tipo_documento ||
            strcasecmp(
                (string) ($meta['origen']['uuid'] ?? ''),
                (string) $intento->uuid_origen
            ) !== 0 ||
            empty($meta['idcliente']) ||
            (float) ($meta['monto_total'] ?? 0) <= 0
        ) {
            return [
                'valido' => false,
                'mensaje' =>
                'Los metadatos no coinciden con el intento registrado.',
            ];
        }

        if (
            empty($intento->xml_enviado) ||
            !hash_equals(
                (string) $intento->xml_hash,
                hash('sha256', $intento->xml_enviado)
            )
        ) {
            return [
                'valido' => false,
                'mensaje' => 'El XML almacenado no supera la validación.',
            ];
        }

        return [
            'valido' => true,
            'idintento' => (int) $intento->idintento,
            'identificador' => $intento->identificador,
            'tipo_documento' => $intento->tipo_documento,
            'estado' => $intento->estado,
            'metadatos' => $meta,
        ];
    }


    private function conciliarXMLConMetadatosNota(
        string $xmlString,
        array $meta
    ): array {
        $errores = [];

        $doc = new \DOMDocument();

        if (!@$doc->loadXML($xmlString, LIBXML_NONET)) {
            return [
                'valido' => false,
                'errores' => ['El XML no pudo interpretarse.'],
            ];
        }

        $xpath = new \DOMXPath($doc);

        $xpath->registerNamespace(
            'dte',
            'http://www.sat.gob.gt/dte/fel/0.2.0'
        );

        $centavos = static function ($valor): int {
            return (int) round((float) $valor * 100);
        };

        $tipoXml = trim((string) $xpath->evaluate(
            'string(//dte:DatosEmision/dte:DatosGenerales/@Tipo)'
        ));

        if ($tipoXml !== ($meta['tipo'] ?? '')) {
            $errores[] = 'El tipo de documento no coincide.';
        }

        $referencias = $xpath->query(
            '//*[local-name()="ReferenciasNota"]'
        );

        if ($referencias->length !== 1) {
            $errores[] = 'La referencia al documento original es inválida.';
        } else {
            $uuidOrigenXML = $referencias->item(0)
                ->getAttribute('NumeroAutorizacionDocumentoOrigen');

            if (strcasecmp(
                $uuidOrigenXML,
                (string) ($meta['origen']['uuid'] ?? '')
            ) !== 0) {
                $errores[] = 'El UUID de origen no coincide.';
            }
        }

        $items = $xpath->query(
            '//dte:DatosEmision/dte:Items/dte:Item'
        );

        if ($items->length === 0) {
            $errores[] = 'El XML no contiene renglones.';
        }

        $totalItems = 0;
        $ivaItems = 0;
        $timbreItems = 0;
        $baseTimbre = 0;

        foreach ($items as $item) {
            $totalItems += $centavos($xpath->evaluate(
                'string(./dte:Total)',
                $item
            ));

            $impuestos = $xpath->query(
                './dte:Impuestos/dte:Impuesto',
                $item
            );

            foreach ($impuestos as $impuesto) {
                $nombre = strtoupper(trim(
                    $xpath->evaluate(
                        'string(./dte:NombreCorto)',
                        $impuesto
                    )
                ));

                $monto = $centavos($xpath->evaluate(
                    'string(./dte:MontoImpuesto)',
                    $impuesto
                ));

                if ($nombre === 'IVA') {
                    $ivaItems += $monto;
                } elseif ($nombre === 'TIMBRE DE PRENSA') {
                    $timbreItems += $monto;

                    $baseTimbre += $centavos($xpath->evaluate(
                        'string(./dte:MontoGravable)',
                        $impuesto
                    ));
                } else {
                    $errores[] = 'Impuesto no soportado: ' . $nombre;
                }
            }
        }

        $granTotal = $centavos($xpath->evaluate(
            'string(//dte:DatosEmision/dte:Totales/dte:GranTotal)'
        ));

        $totalMeta = $centavos($meta['monto_total'] ?? 0);
        $ivaMeta = $centavos($meta['monto_impuesto'] ?? 0);

        $timbreMeta = $centavos(
            $meta['timbre_prensa_monto'] ?? 0
        );

        $baseTimbreMeta = $centavos(
            $meta['timbre_prensa_base'] ?? 0
        );

        if ($granTotal !== $totalItems) {
            $errores[] = 'La suma de renglones no coincide con GranTotal.';
        }

        if ($granTotal !== $totalMeta) {
            $errores[] = 'El total XML difiere del total de metadatos.';
        }

        if ($ivaItems !== $ivaMeta) {
            $errores[] = 'El IVA XML difiere del IVA de metadatos.';
        }


        $baseGravableXML = 0;

        foreach ($items as $item) {
            $impuestosIVA = $xpath->query(
                './dte:Impuestos/dte:Impuesto' .
                    '[dte:NombreCorto="IVA"]',
                $item
            );

            foreach ($impuestosIVA as $impuesto) {
                $baseGravableXML += $centavos(
                    $xpath->evaluate(
                        'string(./dte:MontoGravable)',
                        $impuesto
                    )
                );
            }
        }

        $baseGravableMeta = $centavos(
            $meta['monto_gravable'] ?? 0
        );

        if ($baseGravableXML !== $baseGravableMeta) {
            $errores[] =
                'La base gravable XML difiere de los metadatos.';
        }

        $receptorXML = trim((string) $xpath->evaluate(
            'string(//dte:DatosEmision/dte:Receptor/@IDReceptor)'
        ));

        $receptorMeta = trim((string) (
            $meta['receptor']['numero'] ?? ''
        ));

        if (
            $receptorXML === '' ||
            strcasecmp($receptorXML, $receptorMeta) !== 0
        ) {
            $errores[] =
                'La identificación del receptor no coincide.';
        }



        if ($timbreItems !== $timbreMeta) {
            $errores[] = 'El timbre XML difiere del timbre de metadatos.';
        }

        if ($baseTimbre !== $baseTimbreMeta) {
            $errores[] = 'La base del timbre no coincide.';
        }

        $totalesImpuestos = $xpath->query(
            '//dte:DatosEmision/dte:Totales/' .
                'dte:TotalImpuestos/dte:TotalImpuesto'
        );

        $declarados = [];

        foreach ($totalesImpuestos as $nodo) {
            $nombre = strtoupper(trim(
                $nodo->getAttribute('NombreCorto')
            ));

            $declarados[$nombre] =
                ($declarados[$nombre] ?? 0) +
                $centavos(
                    $nodo->getAttribute('TotalMontoImpuesto')
                );
        }

        if (($declarados['IVA'] ?? 0) !== $ivaItems) {
            $errores[] = 'El IVA declarado en Totales no coincide.';
        }

        if (
            ($declarados['TIMBRE DE PRENSA'] ?? 0)
            !== $timbreItems
        ) {
            $errores[] = 'El timbre declarado en Totales no coincide.';
        }

        foreach (array_keys($declarados) as $nombre) {
            if (!in_array(
                $nombre,
                ['IVA', 'TIMBRE DE PRENSA'],
                true
            )) {
                $errores[] = 'Total de impuesto desconocido: ' . $nombre;
            }
        }

        return [
            'valido' => empty($errores),
            'errores' => $errores,
            'resumen' => [
                'tipo' => $tipoXml,
                'cantidad_items' => $items->length,
                'total_items' => $totalItems / 100,
                'gran_total' => $granTotal / 100,
                'iva' => $ivaItems / 100,
                'timbre_prensa_base' => $baseTimbre / 100,
                'timbre_prensa_monto' => $timbreItems / 100,
                'monto_gravable' => $baseGravableXML / 100,
                'receptor_coincide' =>
                strcasecmp($receptorXML, $receptorMeta) === 0
                    && $receptorXML !== '',
            ],
        ];
    }



    private function validarIntentoNotaParaEnvio(int $idintento): array
    {
        $intento = DB::table('adm_fel_intentos')
            ->where('idintento', $idintento)
            ->first();

        if (!$intento) {
            return [
                'valido' => false,
                'mensaje' => 'No existe el intento FEL.',
            ];
        }

        if (!in_array(
            $intento->tipo_documento,
            ['NCRE', 'NDEB'],
            true
        )) {
            return [
                'valido' => false,
                'mensaje' => 'El intento no corresponde a una nota FEL.',
            ];
        }

        if ($intento->estado !== 'PREPARADO') {
            return [
                'valido' => false,
                'mensaje' =>
                'El intento no está disponible para iniciar el envío.',
            ];
        }

        if (empty($intento->xml_enviado)) {
            return [
                'valido' => false,
                'mensaje' => 'No existe XML almacenado.',
            ];
        }

        $hash = hash('sha256', $intento->xml_enviado);

        if (!hash_equals((string) $intento->xml_hash, $hash)) {
            return [
                'valido' => false,
                'mensaje' => 'El XML no coincide con su hash original.',
            ];
        }

        $factura = $this->facturaVigente(
            (int) $intento->idcotizacion
        );

        if (
            !$factura ||
            strcasecmp(
                (string) $factura->uuid,
                (string) $intento->uuid_origen
            ) !== 0
        ) {
            return [
                'valido' => false,
                'mensaje' =>
                'La factura de origen no coincide con el intento.',
            ];
        }

        // Un intento de nota debe contener una referencia
        // al UUID de la factura original.
        $doc = new \DOMDocument();

        if (!@$doc->loadXML(
            $intento->xml_enviado,
            LIBXML_NONET
        )) {
            return [
                'valido' => false,
                'mensaje' => 'XML de nota inválido.',
            ];
        }

        $xpath = new \DOMXPath($doc);

        $referencias = $xpath->query(
            '//*[local-name()="ReferenciasNota"]'
        );

        if ($referencias->length !== 1) {
            return [
                'valido' => false,
                'mensaje' =>
                'La nota debe contener una referencia al documento original.',
            ];
        }

        $uuidXML = $referencias->item(0)->getAttribute(
            'NumeroAutorizacionDocumentoOrigen'
        );

        if (strcasecmp(
            $uuidXML,
            (string) $intento->uuid_origen
        ) !== 0) {
            return [
                'valido' => false,
                'mensaje' =>
                'El UUID de origen del XML no coincide con el registrado.',
            ];
        }

        return [
            'valido' => true,
            'mensaje' => 'Intento de nota listo para revisión de envío.',
            'idintento' => (int) $intento->idintento,
            'tipo_documento' => $intento->tipo_documento,
            'uuid_origen' => $intento->uuid_origen,
            'identificador' => $intento->identificador,
            'estado' => $intento->estado,
            'xml_integro' => true,
        ];
    }


    private function cambiarEstadoIntentoFEL(
        int $idintento,
        string $estadoEsperado,
        string $nuevoEstado,
        array $datos = []
    ): bool {
        $transiciones = [
            'PREPARADO' => ['ENVIANDO'],
            'ENVIANDO' => [
                'CERTIFICADO',
                'RECHAZADO',
                'INCIERTO',
            ],
            'INCIERTO' => [
                'CERTIFICADO',
                'RECHAZADO',
            ],
            'CERTIFICADO' => [],
            'RECHAZADO' => [],
        ];

        if (
            !in_array(
                $nuevoEstado,
                $transiciones[$estadoEsperado] ?? [],
                true
            )
        ) {
            throw new \InvalidArgumentException(
                "Transición FEL no permitida: {$estadoEsperado} -> {$nuevoEstado}"
            );
        }

        // CERTIFICADO exige que la factura ya esté
        // registrada correctamente en adm_facturacion.
        if ($nuevoEstado === 'CERTIFICADO') {
            if (
                empty($datos['uuid']) ||
                empty($datos['idfactura'])
            ) {
                throw new \InvalidArgumentException(
                    'No se puede completar el intento FEL sin UUID e ID de factura.'
                );
            }

            $facturaRegistrada = AdmFacturacion::where(
                'idfactura',
                $datos['idfactura']
            )
                ->where('uuid', $datos['uuid'])
                ->where('estado', 1)
                ->exists();

            if (!$facturaRegistrada) {
                throw new \InvalidArgumentException(
                    'La factura certificada aún no está registrada correctamente.'
                );
            }
        }

        $actualizacion = [
            'estado' => $nuevoEstado,
        ];

        if ($nuevoEstado === 'ENVIANDO') {
            $actualizacion['fecha_envio'] = now();
        }

        if (
            in_array(
                $nuevoEstado,
                ['CERTIFICADO', 'RECHAZADO'],
                true
            )
        ) {
            $actualizacion['fecha_respuesta'] = now();
        }

        if (
            $nuevoEstado === 'CERTIFICADO'
        ) {
            $actualizacion['uuid'] = $datos['uuid'];
            $actualizacion['idfactura'] = $datos['idfactura'];
        }

        if (isset($datos['mensaje_error'])) {
            $actualizacion['mensaje_error'] =
                mb_substr($datos['mensaje_error'], 0, 2000);
        }

        // La actualización condicional impide que dos
        // solicitudes cambien simultáneamente el estado
        // esperado del mismo intento.
        $filasActualizadas = DB::table('adm_fel_intentos')
            ->where('idintento', $idintento)
            ->where('estado', $estadoEsperado)
            ->update($actualizacion);

        return $filasActualizadas === 1;
    }


    private function revisarIntentoFEL(int $idcotizacion): array
    {
        $intento = DB::table('adm_fel_intentos')
            ->where('idcotizacion', $idcotizacion)
            ->orderByDesc('idintento')
            ->first();

        if (!$intento) {
            return [
                'valido' => false,
                'mensaje' => 'No existe un intento FEL para esta cotización.',
            ];
        }

        if (empty($intento->xml_enviado)) {
            return [
                'valido' => false,
                'mensaje' => 'El intento no contiene un XML almacenado.',
            ];
        }

        $hashActual = hash('sha256', $intento->xml_enviado);

        if (!hash_equals((string) $intento->xml_hash, $hashActual)) {
            return [
                'valido' => false,
                'mensaje' => 'El XML almacenado no coincide con su hash original.',
            ];
        }

        $validacionXML = $this->validarMontosXmlFEL(
            $intento->xml_enviado
        );

        if (!$validacionXML['valido']) {
            return [
                'valido' => false,
                'mensaje' => 'El XML almacenado presenta inconsistencias.',
                'errores' => $validacionXML['errores'],
            ];
        }

        return [
            'valido' => true,
            'mensaje' => 'Intento FEL almacenado correctamente.',
            'idintento' => (int) $intento->idintento,
            'identificador' => $intento->identificador,
            'estado' => $intento->estado,
            'xml_integro' => true,
            'resumen' => $validacionXML['resumen'],
        ];
    }



    public function generarXMLFactura(Request $request, $idcotizacion)
    {
        // 1) Validación de payload recibido del modal
        $validated = $request->validate([
            'documento_tipo'  => 'required|in:NIT,CUI,PASAPORTE,CF',
            'documento_valor' => 'nullable|string|max:30',
            'nombre'          => 'required|string|max:200',
            'direccion'       => 'required|string|max:255',
            'email'           => 'nullable|email|max:150',
        ]);

        // 2) Consulta de detalles (igual a lo que ya está) — SIN usar datos de cliente para Receptor
        $detalles = DB::select("
        SELECT 
            ROW_NUMBER() OVER (ORDER BY d.iddetallecotizacion) AS numero_linea,
            d.iddetallecotizacion,
            d.cantidad,
            IF(CHAR_LENGTH(d.unidad_medida) > 3, LEFT(d.unidad_medida, 3), d.unidad_medida) AS unidad_medida,
            d.descripcion,
            d.precio_unitario,
            d.precio,
            d.descuento,
            d.subtotal AS monto_gravable,
            d.impuesto_iva AS monto_impuesto,
            d.total,
            d.aplica_timbre_prensa,
            c.timbre_prensa_base,
            c.timbre_prensa_porcentaje,
            c.timbre_prensa_monto,
            c.total AS gran_total,
            c.total AS monto_abono,
            cl.nombre,
            cl.nit,
            cl.cui,
            cl.direccion,
            cl.codigo_postal,
            cl.email as correo,
            m.nombre as municipio,
            dp.nombre as departamento,
            'GT' as pais,
            DATE_ADD(CURDATE(), INTERVAL 30 DAY) AS fecha_vencimiento,
            cl.extranjero,
            cl.pasaporte,
            cl.excento_iva
        FROM adm_cotizacion c 
        JOIN adm_detalle_cotizacion d on c.idcotizacion = d.idcotizacion 
        JOIN clientes cl on c.idcliente = cl.idcliente
        JOIN adm_municipio m on cl.id_municipio = m.id_municipio
        JOIN adm_departamentopais dp on cl.iddepartamento = dp.iddepartamentopais
        WHERE d.estado = 1 
        AND d.idcotizacion = ?
    ", [$idcotizacion]);

        if (empty($detalles)) {
            return response()->json(['error' => 'Detalle de cotización no encontrado'], 404);
        }

        $detalle = $detalles[0];

        // Timbre de Prensa - preparación FEL
        $totalSinTimbre = round((float) $detalle->gran_total, 2);

        $timbreCotizacion = round(
            (float) ($detalle->timbre_prensa_monto ?? 0),
            2
        );

        $baseTimbreCotizacion = round(
            (float) ($detalle->timbre_prensa_base ?? 0),
            2
        );

        $baseTimbreDetalles = 0.00;
        $timbrePorLineas = 0.00;
        $itemsConTimbre = 0;

        foreach ($detalles as $d) {

            if (($d->aplica_timbre_prensa ?? 'N') !== 'S') {
                continue;
            }

            $itemsConTimbre++;

            $base = round((float) $d->monto_gravable, 2);

            $baseTimbreDetalles += $base;

            // Cálculo individual para detectar diferencias de redondeo
            $timbreLinea = ceil(
                ($base * 0.005 * 100) - 0.000000001
            ) / 100;

            $timbrePorLineas += $timbreLinea;
        }

        $baseTimbreDetalles = round($baseTimbreDetalles, 2);
        $timbrePorLineas = round($timbrePorLineas, 2);

        $totalConTimbre = round(
            $totalSinTimbre + $timbreCotizacion,
            2
        );

        $validacionTimbre = [
            'idcotizacion' => (int) $idcotizacion,
            'items_con_timbre' => $itemsConTimbre,
            'base_cotizacion' => $baseTimbreCotizacion,
            'base_detalles' => $baseTimbreDetalles,
            'timbre_cotizacion' => $timbreCotizacion,
            'timbre_calculado_por_lineas' => $timbrePorLineas,
            'diferencia_redondeo' => round(
                $timbrePorLineas - $timbreCotizacion,
                2
            ),
            'total_sin_timbre' => $totalSinTimbre,
            'total_con_timbre' => $totalConTimbre,
        ];

        if (
            app()->environment('local') &&
            $request->boolean('vista_previa_timbre')
        ) {
            return response()->json([
                'resultado' => true,
                'modo' => 'VISTA_PREVIA_SIN_CERTIFICAR',
                'validacion_timbre' => $validacionTimbre,
            ]);
        }

        // 2.1) Obtener el tipo_facturacion de la cotización (BIEN | SERVICIO)
        $tipoFacturaDB = DB::table('adm_cotizacion')
            ->where('idcotizacion', $idcotizacion)
            ->value('tipo_facturacion');

        // Normalizar y mapear a B/S (default: B)
        $tipoFacturaNorm = strtoupper(trim((string)$tipoFacturaDB));
        $bienOServicio = ($tipoFacturaNorm === 'SERVICIO') ? 'S' : 'B';


        // 3) SE LEEN Y PREPARAN LOS DATOS DEL MODAL PARA EL RECEPTOR
        $docTipo   = $validated['documento_tipo'];        // NIT | CUI | PASAPORTE | CF
        $docValor  = trim((string)($validated['documento_valor'] ?? ''));
        $nombre    = $validated['nombre'];
        $direccion = $validated['direccion'];
        $correo    = $validated['email'] ?? '';

        // Reglas y normalización por tipo
        $clienteExentoIVA = "N"; // Si quieres, podrías traerlo aparte según tu lógica
        if (isset($detalle->excento_iva) && $detalle->excento_iva == "S") {
            $clienteExentoIVA = "S";
        }
        $idReceptor = '';
        $tipoEspecial = null;

        switch ($docTipo) {
            case 'CF':
                $idReceptor = 'CF';
                $tipoEspecial = null; // sin TipoEspecial
                break;

            case 'NIT':
                if (!NitUtils::esValido($docValor)) {
                    throw ValidationException::withMessages([
                        'documento_valor' => ['NIT no válido para Guatemala.'],
                    ]);
                }
                $idReceptor = NitUtils::normalizarParaFEL($docValor); // dígitos y K, sin guión
                $tipoEspecial = null; // sin TipoEspecial
                break;

            case 'CUI':
                $cui = preg_replace('/\D/', '', $docValor);
                if (strlen($cui) < 12 || strlen($cui) > 13) {
                    throw ValidationException::withMessages([
                        'documento_valor' => ['CUI/DPI debe tener 12 o 13 dígitos.'],
                    ]);
                }
                $idReceptor = $cui;
                $tipoEspecial = 'CUI'; // ⬅️ código esperado
                break;

            case 'PASAPORTE':
                $pasaporte = strtoupper(trim($docValor));
                if ($pasaporte === '') {
                    throw ValidationException::withMessages([
                        'documento_valor' => ['Ingrese un número de pasaporte.'],
                    ]);
                }
                // Opcional: sanitiza según reglas comunes (A-Z/0-9, 3–18 chars)
                $pasaporte = preg_replace('/[^A-Z0-9]/', '', $pasaporte);
                if (strlen($pasaporte) < 3 || strlen($pasaporte) > 18) {
                    throw ValidationException::withMessages([
                        'documento_valor' => ['El pasaporte debe tener entre 3 y 18 caracteres alfanuméricos.'],
                    ]);
                }
                $idReceptor   = $pasaporte;
                $tipoEspecial = 'EXT'; // ⬅️ código correcto para extranjero
                break;
        }


        if (
            $docTipo === 'CF' &&
            $totalConTimbre >= 2500
        ) {
            return response()->json([
                'resultado' => false,
                'message' =>
                'Las facturas de Q2,500.00 o más requieren ' .
                    'identificación del receptor. Seleccione NIT, ' .
                    'CUI o el documento permitido que corresponda.',
            ], 422);
        }


        /** FINALIZACIÓN DE LOS DATOS DEL MODAL PARA EL RECEPTOR */

        // Fecha única de referencia: emisión y vencimiento del complemento FCAM.
        $fechaEmisionFCAM = now();

        // Consultar la condición de pago registrada en la cotización.
        $tipoPagoFCAM = DB::table('adm_cotizacion as c')
            ->join('adm_tipo_pago as tp', 'tp.idtipopago', '=', 'c.idtipopago')
            ->where('c.idcotizacion', $idcotizacion)
            ->value('tp.tipo');

        $esContadoFCAM = strtoupper(trim((string) $tipoPagoFCAM)) === 'CONTADO';

        $fechaVencimientoFCAM = $esContadoFCAM
            ? $fechaEmisionFCAM->toDateString()
            : $fechaEmisionFCAM->copy()->addDays(30)->toDateString();

        //4
        $doc = new \DOMDocument('1.0', 'UTF-8');
        $doc->formatOutput = true;

        $GTDocumento = $doc->createElementNS('http://www.sat.gob.gt/dte/fel/0.2.0', 'dte:GTDocumento');
        $GTDocumento->setAttribute('xmlns:cfc', 'http://www.sat.gob.gt/dte/fel/CompCambiaria/0.1.0');
        $GTDocumento->setAttribute('Version', '0.1');
        $doc->appendChild($GTDocumento);

        $SAT = $doc->createElement('dte:SAT');
        $SAT->setAttribute('ClaseDocumento', 'dte');
        $GTDocumento->appendChild($SAT);

        $DTE = $doc->createElement('dte:DTE');
        $DTE->setAttribute('ID', 'DatosCertificados');
        $SAT->appendChild($DTE);

        $DatosEmision = $doc->createElement('dte:DatosEmision');
        $DatosEmision->setAttribute('ID', 'DatosEmision');
        $DTE->appendChild($DatosEmision);

        $DatosGenerales = $doc->createElement('dte:DatosGenerales');
        $DatosGenerales->setAttribute('CodigoMoneda', 'GTQ');
        $DatosGenerales->setAttribute('FechaHoraEmision', $fechaEmisionFCAM->format('Y-m-d\TH:i:s'));
        $DatosGenerales->setAttribute('Tipo', 'FCAM');
        $DatosEmision->appendChild($DatosGenerales);

        $Emisor = $doc->createElement('dte:Emisor');
        $Emisor->setAttribute('AfiliacionIVA', 'GEN');
        $Emisor->setAttribute('CodigoEstablecimiento', '1');
        $Emisor->setAttribute('CorreoEmisor', 'ventas@gpexcelencia.com');
        $Emisor->setAttribute('NombreComercial', 'GP EXCELENCIA');
        $Emisor->setAttribute('NITEmisor', '109126599');
        $Emisor->setAttribute('NombreEmisor', 'GP EXCELENCIA, SOCIEDAD ANÓNIMA');
        $DatosEmision->appendChild($Emisor);

        $dirEmisor = $doc->createElement('dte:DireccionEmisor');
        $Emisor->appendChild($dirEmisor);
        $dirEmisor->appendChild($doc->createElement('dte:Direccion', '11 CALLE 41-20 COLONIA EL NARANJITO ZONA 6 APARTAMENTO A'));
        $dirEmisor->appendChild($doc->createElement('dte:CodigoPostal', '01057'));
        $dirEmisor->appendChild($doc->createElement('dte:Municipio', 'MIXCO'));
        $dirEmisor->appendChild($doc->createElement('dte:Departamento', 'GUATEMALA'));
        $dirEmisor->appendChild($doc->createElement('dte:Pais', 'GT'));

        $Receptor = $doc->createElement('dte:Receptor');
        $Receptor->setAttribute('CorreoReceptor', $correo ?? '');
        $Receptor->setAttribute('IDReceptor', $idReceptor);
        $Receptor->setAttribute('NombreReceptor', $nombre);

        // ⬅️ TipoEspecial va como ATRIBUTO (no elemento)
        if (!empty($tipoEspecial)) {
            // valores válidos típicos: "CUI" o "EXT"
            $Receptor->setAttribute('TipoEspecial', $tipoEspecial);
        }

        $DatosEmision->appendChild($Receptor);

        // El ÚNICO hijo permitido de Receptor es DireccionReceptor:
        $dirReceptor = $doc->createElement('dte:DireccionReceptor');
        $Receptor->appendChild($dirReceptor);

        $dirReceptor->appendChild($doc->createElement('dte:Direccion', $direccion));
        $dirReceptor->appendChild($doc->createElement('dte:CodigoPostal', $detalle->codigo_postal ?? '01001'));
        $dirReceptor->appendChild($doc->createElement('dte:Municipio', $detalle->municipio));
        $dirReceptor->appendChild($doc->createElement('dte:Departamento', $detalle->departamento));

        // Sugerencia: si es extranjero (EXT) y NO reside en Guatemala, usa el país ISO real del receptor:
        $paisReceptor = $detalle->pais;
        if (($tipoEspecial ?? null) === 'EXT' && strtoupper($paisReceptor) === 'GT') {
            // $paisReceptor = 'PAIS_ISO'; // si tienes el país real, colócalo aquí
        }
        $dirReceptor->appendChild($doc->createElement('dte:Pais', $paisReceptor));

        /** AQUÍ TERMINAN LOS DATOS DEL MODAL PARA RECEPTOR */

        $Frases = $doc->createElement('dte:Frases');
        $DatosEmision->appendChild($Frases);
        // Frase estándar obligatoria (siempre va)
        $Frase1 = $doc->createElement('dte:Frase');
        $Frase1->setAttribute('CodigoEscenario', '1');
        $Frase1->setAttribute('TipoFrase', '1');
        $Frases->appendChild($Frase1);

        // Frase adicional si el cliente es exento
        if ($clienteExentoIVA === "S") {
            $Frase2 = $doc->createElement('dte:Frase');
            $Frase2->setAttribute('TipoFrase', '4'); // Exento o no afecto al IVA
            $Frase2->setAttribute('CodigoEscenario', '11'); // No exportación (u otro si aplica)
            $Frases->appendChild($Frase2);
        }

        $Items = $doc->createElement('dte:Items');
        $DatosEmision->appendChild($Items);

        $sumaImpuestos = 0.00; // acumulado de IVA para Totales
        $sumaTimbrePrensa = 0.00;

        foreach ($detalles as $d) {
            $Item = $doc->createElement('dte:Item');
            // $Item->setAttribute('BienOServicio', 'B');
            $Item->setAttribute('BienOServicio', $bienOServicio);
            $Item->setAttribute('NumeroLinea', $d->numero_linea);

            $Item->appendChild($doc->createElement('dte:Cantidad', $d->cantidad));
            $Item->appendChild($doc->createElement('dte:UnidadMedida', $d->unidad_medida));
            // $Item->appendChild($doc->createElement('dte:Descripcion', $d->descripcion));
            $descripcionNode = $doc->createElement('dte:Descripcion');
            $descripcionNode->appendChild(
                $doc->createCDATASection($d->descripcion)
            );
            $Item->appendChild($descripcionNode);
            $Item->appendChild($doc->createElement('dte:PrecioUnitario', number_format($d->precio_unitario, 3, '.', '')));
            $Item->appendChild($doc->createElement('dte:Precio', number_format($d->precio, 3, '.', '')));
            $Item->appendChild($doc->createElement('dte:Descuento', number_format($d->descuento, 3, '.', '')));

            // Siempre incluir Impuestos (FCAM lo exige)
            $Impuestos = $doc->createElement('dte:Impuestos');
            $Impuesto  = $doc->createElement('dte:Impuesto');
            $Impuesto->appendChild($doc->createElement('dte:NombreCorto', 'IVA'));

            if ($clienteExentoIVA === "S") {
                // EXENTO: UG=2, base plena, impuesto 0.00
                $Impuesto->appendChild($doc->createElement('dte:CodigoUnidadGravable', '2'));
                $baseExenta = (float)$d->precio - (float)$d->descuento; // tu SELECT pone descuento=0, igual queda correcto
                $Impuesto->appendChild($doc->createElement('dte:MontoGravable', number_format($baseExenta, 3, '.', '')));
                $Impuesto->appendChild($doc->createElement('dte:MontoImpuesto', number_format(0, 3, '.', '')));
                // $sumaImpuestos no cambia
            } else {
                // GRAVADO: UG=1, tu cálculo actual
                $Impuesto->appendChild($doc->createElement('dte:CodigoUnidadGravable', '1'));
                $Impuesto->appendChild($doc->createElement('dte:MontoGravable', number_format($d->monto_gravable, 3, '.', '')));
                $Impuesto->appendChild($doc->createElement('dte:MontoImpuesto', number_format($d->monto_impuesto, 3, '.', '')));
                $sumaImpuestos += (float)$d->monto_impuesto;
            }

            // $Impuestos->appendChild($Impuesto);
            // $Item->appendChild($Impuestos);

            // $Item->appendChild($doc->createElement('dte:Total', number_format($d->total, 3, '.', '')));
            $Impuestos->appendChild($Impuesto);

            // TIMBRE DE PRENSA
            $timbreLinea = 0.00;

            if (($d->aplica_timbre_prensa ?? 'N') === 'S') {

                $baseLinea = round((float) $d->monto_gravable, 2);

                $timbreLinea = ceil(
                    ($baseLinea * 0.005 * 100) - 0.000000001
                ) / 100;

                $ImpuestoPrensa = $doc->createElement('dte:Impuesto');

                $ImpuestoPrensa->appendChild(
                    $doc->createElement(
                        'dte:NombreCorto',
                        'TIMBRE DE PRENSA'
                    )
                );

                $ImpuestoPrensa->appendChild(
                    $doc->createElement(
                        'dte:CodigoUnidadGravable',
                        '1'
                    )
                );

                $ImpuestoPrensa->appendChild(
                    $doc->createElement(
                        'dte:MontoGravable',
                        number_format($baseLinea, 3, '.', '')
                    )
                );

                $ImpuestoPrensa->appendChild(
                    $doc->createElement(
                        'dte:MontoImpuesto',
                        number_format($timbreLinea, 3, '.', '')
                    )
                );

                $Impuestos->appendChild($ImpuestoPrensa);

                $sumaTimbrePrensa += $timbreLinea;
            }

            $Item->appendChild($Impuestos);

            $totalLinea = round(
                (float) $d->total + $timbreLinea,
                2
            );

            $Item->appendChild(
                $doc->createElement(
                    'dte:Total',
                    number_format($totalLinea, 3, '.', '')
                )
            );

            $Items->appendChild($Item);
        }

        $Totales = $doc->createElement('dte:Totales');
        $DatosEmision->appendChild($Totales);

        $TotalImpuestos = $doc->createElement('dte:TotalImpuestos');
        $TotalImpuesto  = $doc->createElement('dte:TotalImpuesto');
        $TotalImpuesto->setAttribute('NombreCorto', 'IVA');
        $TotalImpuesto->setAttribute('TotalMontoImpuesto', number_format($sumaImpuestos, 2, '.', ''));
        // $TotalImpuestos->appendChild($TotalImpuesto);
        // $Totales->appendChild($TotalImpuestos);
        $TotalImpuestos->appendChild($TotalImpuesto);

        if ($sumaTimbrePrensa > 0) {

            $TotalImpuestoPrensa = $doc->createElement(
                'dte:TotalImpuesto'
            );

            $TotalImpuestoPrensa->setAttribute(
                'NombreCorto',
                'TIMBRE DE PRENSA'
            );

            $TotalImpuestoPrensa->setAttribute(
                'TotalMontoImpuesto',
                number_format($sumaTimbrePrensa, 2, '.', '')
            );

            $TotalImpuestos->appendChild($TotalImpuestoPrensa);
        }

        $Totales->appendChild($TotalImpuestos);

        $sumaTimbrePrensa = round($sumaTimbrePrensa, 2);

        if (abs($sumaTimbrePrensa - $timbreCotizacion) > 0.001) {
            return response()->json([
                'resultado' => false,
                'message' => 'El Timbre de Prensa por líneas no coincide con la cotización.',
                'timbre_cotizacion' => $timbreCotizacion,
                'timbre_lineas' => $sumaTimbrePrensa,
            ], 422);
        }

        // Valores que se utilizarán para la factura certificada.
        $importesFactura = [
            'total_sin_timbre' => round($totalSinTimbre, 2),
            'timbre_prensa_base' => round($baseTimbreCotizacion, 2),
            'timbre_prensa_porcentaje' => 0.5000,
            'timbre_prensa_monto' => round($sumaTimbrePrensa, 2),
            'total_factura' => round($totalConTimbre, 2),
        ];

        //$Totales->appendChild($doc->createElement('dte:GranTotal', number_format($detalle->gran_total, 2, '.', '')));
        $Totales->appendChild(
            $doc->createElement(
                'dte:GranTotal',
                number_format($totalConTimbre, 2, '.', '')
            )
        );

        // Complemento de Factura Cambiaria
        $Complementos = $doc->createElement('dte:Complementos');
        $DatosEmision->appendChild($Complementos);

        $Complemento = $doc->createElement('dte:Complemento');
        $Complemento->setAttribute('IDComplemento', 'FacturaCambio');
        $Complemento->setAttribute('NombreComplemento', 'Factura Cambiaria');
        $Complemento->setAttribute('URIComplemento', 'http://www.sat.gob.gt/face2/ComplementoFacturaCambiaria');
        $Complementos->appendChild($Complemento);

        $Abonos = $doc->createElementNS('http://www.sat.gob.gt/dte/fel/CompCambiaria/0.1.0', 'cfc:AbonosFacturaCambiaria');
        $Abonos->setAttribute('Version', '1');
        $Abono = $doc->createElement('cfc:Abono');
        $Abono->appendChild($doc->createElement('cfc:NumeroAbono', '1'));
        $Abono->appendChild($doc->createElement('cfc:FechaVencimiento', $fechaVencimientoFCAM));
        //$Abono->appendChild($doc->createElement('cfc:MontoAbono', number_format($detalle->monto_abono, 2, '.', '')));
        $Abono->appendChild(
            $doc->createElement(
                'cfc:MontoAbono',
                number_format($totalConTimbre, 2, '.', '')
            )
        );
        $Abonos->appendChild($Abono);
        $Complemento->appendChild($Abonos);

        $xmlString = $doc->saveXML();

        $validacionXml = $this->validarMontosXmlFEL($xmlString);

        if (!$validacionXml['valido']) {
            return response()->json([
                'resultado' => false,
                'modo' => 'VALIDACION_XML_FEL',
                'mensaje' => 'El XML contiene inconsistencias.',
                'validacion_xml' => $validacionXml,
            ], 422);
        }

        /**
         * 2026-10-11 PRUEBA DE XML SIN CERTIFICAR
         */

        // if (
        //     app()->environment('local') &&
        //     $request->boolean('vista_previa_xml')
        // ) {
        //     return response()->json([
        //         'resultado' => true,
        //         'modo' => 'VISTA_PREVIA_XML_SIN_CERTIFICAR',
        //         'totales' => [
        //             'total_sin_timbre' => $totalSinTimbre,
        //             'timbre_cotizacion' => $timbreCotizacion,
        //             'timbre_xml' => $sumaTimbrePrensa,
        //             'total_con_timbre' => $totalConTimbre,
        //         ],
        //         'xml' => $xmlString,
        //         'validacion_xml' => $validacionXml,
        //     ]);
        // }

        if (
            $request->boolean('vista_previa_xml') &&
            (
                app()->environment('local') ||
                (
                    app()->environment('testing') &&
                    DB::connection()->getDatabaseName() === 'gp_excelencia_fel_test' &&
                    !config('services.infile.envio_intentos_habilitado', false) &&
                    !config('services.infile.fcam_intentos_habilitado', false)
                )
            )
        ) {
            return response()->json([
                'resultado' => true,
                'modo' => 'VISTA_PREVIA_XML_SIN_CERTIFICAR',
                'totales' => [
                    'total_sin_timbre' => $totalSinTimbre,
                    'timbre_cotizacion' => $timbreCotizacion,
                    'timbre_xml' => $sumaTimbrePrensa,
                    'total_con_timbre' => $totalConTimbre,
                ],
                'xml' => $xmlString,
                'validacion_xml' => $validacionXml,
            ]);
        }



        if ($timbreCotizacion > 0) {
            // Aquí va la llamada a validarCotizacionParaFEL()
        }

        // =====================================================
        // VALIDACIONES PREVIAS A LA CERTIFICACIÓN FEL
        // =====================================================

        $validacionFEL = $this->validarCotizacionParaFEL(
            (int) $idcotizacion,
            $totalSinTimbre,
            $timbreCotizacion,
            $totalConTimbre,
            $detalles
        );

        if (!$validacionFEL['valido']) {
            return response()->json([
                'resultado' => false,
                'message' => $validacionFEL['mensaje'],
            ], 422);
        }

        if (
            app()->environment('local') &&
            $request->boolean('validar_fel')
        ) {
            return response()->json([
                'resultado' => true,
                'modo' => 'VALIDACION_FEL_SIN_CERTIFICAR',
                'validacion' => $validacionFEL,
                'importes' => [
                    'total_sin_timbre' => $totalSinTimbre,
                    'timbre_prensa' => $timbreCotizacion,
                    'total_factura' => $totalConTimbre,
                ],
            ]);
        }


        // ====================================================
        // PRUEBA LOCAL: REVISAR INTENTO FEL ALMACENADO
        // ====================================================

        if (
            app()->environment('local') &&
            $request->boolean('revisar_intento_fel')
        ) {
            $revision = $this->revisarIntentoFEL(
                (int) $idcotizacion
            );

            return response()->json([
                'resultado' => $revision['valido'],
                'modo' => 'REVISION_INTENTO_FEL_SIN_CERTIFICAR',
                'revision' => $revision,
            ], $revision['valido'] ? 200 : 422);
        }


        // ====================================================
        // PRUEBA LOCAL: PREPARAR INTENTO SIN CERTIFICAR
        // ====================================================

        if (
            app()->environment('local') &&
            $request->boolean('preparar_intento_fel')
        ) {
            // Solo probaremos este flujo con cotizaciones
            // afectas al Timbre de Prensa.
            if ($timbreCotizacion <= 0) {
                return response()->json([
                    'resultado' => false,
                    'message' => 'Esta prueba requiere una cotización con Timbre de Prensa.',
                ], 422);
            }

            $validacion = $this->validarCotizacionParaFEL(
                (int) $idcotizacion,
                $totalSinTimbre,
                $timbreCotizacion,
                $totalConTimbre,
                $detalles
            );

            if (!$validacion['valido']) {
                return response()->json([
                    'resultado' => false,
                    'message' => $validacion['mensaje'],
                ], 422);
            }

            $resultado = $this->prepararIntentoFEL(
                (int) $idcotizacion,
                $xmlString
            );

            return response()->json([
                'resultado' => $resultado['valido'],
                'modo' => 'PREPARAR_INTENTO_SIN_CERTIFICAR',
                'intento' => $resultado,
            ], $resultado['valido'] ? 200 : 409);
        }



        if (
            app()->environment('local') &&
            $request->boolean('simular_desglose_nota')
        ) {
            $iva = round(
                (float) DB::table('adm_detalle_cotizacion')
                    ->where('idcotizacion', $idcotizacion)
                    ->where('estado', 1)
                    ->sum('impuesto_iva'),
                2
            );

            $simulacionNCRE = $this->calcularNotaCreditoTotalConTimbre(
                (int) $idcotizacion
            );

            return response()->json([
                'resultado' => true,
                'modo' => 'SIMULACION_FISCAL_SIN_CERTIFICAR',
                'nota' => 'No genera una nota ni modifica registros.',
                'desglose' => [
                    'total' => $totalConTimbre,
                    'base_sin_impuestos' => round(
                        $totalConTimbre - $iva - $timbreCotizacion,
                        2
                    ),
                    'iva' => $iva,
                    'timbre_prensa_base' => $baseTimbreCotizacion,
                    'timbre_prensa_monto' => $timbreCotizacion,
                ],
                'nota_credito_total' => $simulacionNCRE,
            ]);
        }


        // =======================================================
        // PROTECCIÓN TEMPORAL: FACTURAS CON TIMBRE DE PRENSA
        // =======================================================
        // Permite generar vistas previas,
        // pero bloquea la certificación real con timbre.

        $simulacionTimbreAislada =
            app()->environment('testing') &&
            DB::connection()->getDriverName() === 'mysql' &&
            DB::connection()->getDatabaseName() === 'gp_excelencia_fel_test' &&
            config('services.infile.fcam_timbre_simulacion_testing', false) === true &&
            config('services.infile.envio_intentos_habilitado', false) === true &&
            config('services.infile.fcam_intentos_habilitado', false) === true;

        $produccionTimbreAutorizada =
            $timbreCotizacion > 0 &&
            FCAMTimbreAutorizacion::permiteProduccion(
                (int) $idcotizacion,
                (float) $totalConTimbre
            );

        if (
            $timbreCotizacion > 0 &&
            !$simulacionTimbreAislada &&
            !$produccionTimbreAutorizada
        ) {
            return response()->json([
                'resultado' => false,
                'message' => 'La certificación FEL con Timbre de Prensa permanece bloqueada.',
            ], 422);
        }

        // Bloque 2: FCAM con intentos persistentes. La integración nueva permanece
        // DESACTIVADA hasta validación operativa. Sin activarla el flujo habitual
        // de FCAM sin timbre conserva su comportamiento previo.
        $fcamConIntentos =
            (bool) config('services.infile.fcam_intentos_habilitado', false) &&
            (
                !app()->environment('production') ||
                ($timbreCotizacion > 0 && $produccionTimbreAutorizada)
            );
        $idintentoFCAM = null;
        $hashXmlOriginalFCAM = hash('sha256', $xmlString);

        if ($fcamConIntentos) {
            if (!config('services.infile.envio_intentos_habilitado', false)) {
                return response()->json([
                    'resultado' => false,
                    'mensaje' => 'La transmisión FCAM controlada permanece deshabilitada.',
                ], 503);
            }
            // Bloquear cualquier intento preexistente, incluso PREPARADO histórico:
            // no es seguro reenviar un XML antiguo sin revisión y nueva fecha.
            $preparacion = $this->prepararIntentoFEL((int) $idcotizacion, $xmlString);
            if (empty($preparacion['valido'])) {
                return response()->json([
                    'resultado' => false,
                    'mensaje' => $preparacion['mensaje'] ?? 'Existe un intento FCAM previo.',
                    'intento' => $preparacion,
                ], 409);
            }
            $idintentoFCAM = (int) $preparacion['idintento'];
            $reserva = $this->reservarEnvioIntentoFEL($idintentoFCAM, 'FCAM');
            if (empty($reserva['valido'])) {
                return response()->json([
                    'resultado' => false,
                    'mensaje' => $reserva['mensaje'] ?? 'No se pudo reservar FCAM.',
                    'idintento' => $idintentoFCAM,
                ], 409);
            }
            $intentoReservado = DB::table('adm_fel_intentos')
                ->where('idintento', $idintentoFCAM)->first();
            if (!$intentoReservado || $intentoReservado->estado !== 'ENVIANDO') {
                return response()->json([
                    'resultado' => false,
                    'mensaje' => 'El intento FCAM no se encuentra reservado.',
                    'idintento' => $idintentoFCAM,
                ], 409);
            }
            $identificador = (string) $intentoReservado->identificador;
            $xmlString = (string) $intentoReservado->xml_enviado;
        } else {
            $identificador = Str::uuid()->toString();
        }

        $apiUrl = $fcamConIntentos
            ? config('services.infile.url')
            : 'https://certificador.feel.com.gt/fel/procesounificado/transaccion/v2/xml';
        $headers = $fcamConIntentos ? [
            'Content-Type' => 'application/xml',
            'UsuarioApi' => config('services.infile.usuario_api'),
            'LlaveApi' => config('services.infile.llave_api'),
            'UsuarioFirma' => config('services.infile.usuario_firma'),
            'llavefirma' => config('services.infile.llave_firma'),
            'Identificador' => $identificador,
        ] : [
            // Encabezados históricos intactos; migrar sus secretos antes del despliegue.
            'Content-Type' => 'application/xml',
            'UsuarioApi' => '109126599PRO',
            'LlaveApi' => 'EC7E300DF9F5EDD673FE02342E9C4293',
            'UsuarioFirma' => '109126599PRO',
            'llavefirma' => 'fd5ff1bd52eeb988de3ddd63abcf9324',
            'Identificador' => $identificador,
        ];
        if ($fcamConIntentos && (!$apiUrl || in_array(null, $headers, true) || in_array('', $headers, true))) {
            DB::table('adm_fel_intentos')->where('idintento', $idintentoFCAM)
                ->where('estado', 'ENVIANDO')->update([
                    'estado' => 'INCIERTO',
                    'mensaje_error' => 'Configuración INFILE incompleta; no se envió documento.',
                ]);
            return response()->json([
                'resultado' => false,
                'mensaje' => 'Configuración de INFILE incompleta. Revisión manual requerida.',
                'idintento' => $idintentoFCAM,
            ], 503);
        }


        /*
 * BLOQUE 9.1
 * Última barrera de seguridad antes de transmitir FCAM
 * con Timbre de Prensa en producción.
 */
        if (app()->environment('production') && $timbreCotizacion > 0) {

            $intentoFinal = $idintentoFCAM !== null
                ? DB::table('adm_fel_intentos')
                ->where('idintento', $idintentoFCAM)
                ->first()
                : null;

            $autorizacionVigente =
                FCAMTimbreAutorizacion::permiteProduccion(
                    (int) $idcotizacion,
                    (float) $totalConTimbre
                );

            // $intentoIntegro =
            //     $fcamConIntentos &&
            //     $intentoFinal !== null &&
            //     (int) $intentoFinal->idcotizacion === (int) $idcotizacion &&
            //     (string) $intentoFinal->tipo_documento === 'FCAM' &&
            //     (string) $intentoFinal->estado === 'ENVIANDO' &&
            //     (string) $intentoFinal->identificador === (string) $identificador &&
            //     hash_equals(
            //         (string) $intentoFinal->xml_hash,
            //         hash('sha256', (string) $intentoFinal->xml_enviado)
            //     ) &&
            //     hash_equals(
            //         (string) $hashXmlOriginalFCAM,
            //         (string) $intentoFinal->xml_hash
            //     ) &&
            //     hash_equals(
            //         (string) $intentoFinal->xml_enviado,
            //         (string) $xmlString
            //     );

            $intentoIntegro = \App\Support\FCAMTimbrePreEnvio::evaluar(
                $autorizacionVigente,
                (bool) $fcamConIntentos,
                $intentoFinal,
                (int) $idcotizacion,
                (int) $idintentoFCAM,
                (string) $identificador,
                (string) $hashXmlOriginalFCAM,
                (string) $xmlString
            );

            if (!$autorizacionVigente || !$intentoIntegro) {

                if ($idintentoFCAM !== null) {
                    DB::table('adm_fel_intentos')
                        ->where('idintento', $idintentoFCAM)
                        ->where('estado', 'ENVIANDO')
                        ->update([
                            'estado' => 'INCIERTO',
                            'mensaje_error' =>
                            'Bloqueo preventivo anterior al POST: ' .
                                'autorización vencida o XML inconsistente. ' .
                                'No se realizó transmisión en este control.',
                        ]);
                }

                return response()->json([
                    'resultado' => false,
                    'estado' => 'BLOQUEADO',
                    'mensaje' =>
                    'La autorización de certificación no está vigente ' .
                        'o el intento FEL no cumple los controles de integridad. ' .
                        'No se realizó el envío. Revisión manual requerida.',
                    'idintento' => $idintentoFCAM,
                ], 409);
            }
        }


        try {
            $response = \App\Support\FCAMEnvioProtegido::transmitir(
                function () use (
                    $timbreCotizacion,
                    $idcotizacion,
                    $totalConTimbre,
                    $fcamConIntentos,
                    $idintentoFCAM,
                    $identificador,
                    $hashXmlOriginalFCAM,
                    $xmlString
                ): bool {
                    // FCAM sin timbre conserva el flujo que ya funciona.
                    if (!app()->environment('production') || $timbreCotizacion <= 0) {
                        return true;
                    }

                    // Releer la autorización y el intento justo al despachar el POST.
                    $permiso = \App\Support\FCAMTimbreAutorizacion::permiteProduccion(
                        (int) $idcotizacion,
                        (float) $totalConTimbre
                    );

                    $intentoActual = $idintentoFCAM !== null
                        ? DB::table('adm_fel_intentos')
                        ->where('idintento', $idintentoFCAM)
                        ->first()
                        : null;

                    return \App\Support\FCAMTimbrePreEnvio::evaluar(
                        $permiso,
                        (bool) $fcamConIntentos,
                        $intentoActual,
                        (int) $idcotizacion,
                        (int) $idintentoFCAM,
                        (string) $identificador,
                        (string) $hashXmlOriginalFCAM,
                        (string) $xmlString
                    );
                },
                (string) $apiUrl,
                $headers,
                (string) $xmlString
            );

            if ($response === null) {
                throw new \RuntimeException(
                    'Bloqueo preventivo antes del POST: autorizacion caducada o intento FEL inconsistente; no hubo transmision.'
                );
            }


            if ($idintentoFCAM !== null) {
                // Guardar respuesta ANTES de interpretar y registrar fiscalmente.
                DB::table('adm_fel_intentos')->where('idintento', $idintentoFCAM)
                    ->where('estado', 'ENVIANDO')->update([
                        'respuesta_certificador' => $response->body(),
                        'fecha_respuesta' => now(),
                    ]);
            }
            $json = $response->json();
            if ($idintentoFCAM !== null && !(
                $response->successful() && is_array($json) &&
                ($json['resultado'] ?? false) === true &&
                !empty($json['uuid']) && !empty($json['serie']) &&
                isset($json['numero'])
            )) {
                DB::table('adm_fel_intentos')->where('idintento', $idintentoFCAM)
                    ->where('estado', 'ENVIANDO')->update([
                        'estado' => 'INCIERTO',
                        'mensaje_error' => 'Sin certificación confirmada. Conciliar antes de otro envío.',
                    ]);
                return response()->json([
                    'resultado' => false,
                    'estado' => 'INCIERTO',
                    'idintento' => $idintentoFCAM,
                    'mensaje' => 'INFILE no confirmó la certificación. No reintentar.',
                ], 409);
            }

            // Log::info($json);
            // DB::transaction(function () use ($json, $response, $idcotizacion, $identificador, $idReceptor, $docTipo, $tipoEspecial, $nombre, $correo, $direccion) {
            DB::transaction(function () use (
                $json,
                $response,
                $idcotizacion,
                $identificador,
                $idReceptor,
                $docTipo,
                $tipoEspecial,
                $nombre,
                $correo,
                $direccion,
                $importesFactura,
                $idintentoFCAM,
                $fechaVencimientoFCAM,
            ) {
                $cotizacion = AdmCotizacion::lockForUpdate()->findOrFail($idcotizacion);

                // Se graba en la base de datos la respuesta de SAT
                if ($response->successful() && ($json['resultado'] ?? false) === true) {
                    // ⭐ correlativo interno (igual que hoy)
                    $correlativo = Correlativo::lockForUpdate()->find('nofactura');
                    if (!$correlativo) {
                        throw new \RuntimeException('No se encontró el correlativo para el numero interno');
                    }
                    $noFactura = $correlativo->correlativo + $correlativo->incremento;
                    $correlativo->correlativo = $noFactura;
                    $correlativo->save();

                    // ⭐ crear fila en adm_facturacion (NO tocar campos “de factura” en cotización)
                    $factura = AdmFacturacion::create([
                        'idcotizacion'         => $cotizacion->idcotizacion,
                        'resultado'            => 'S',
                        'uuid'                 => $json['uuid']  ?? null,
                        'serie'                => $json['serie'] ?? null,
                        'numero'               => $json['numero'] ?? null,
                        'descripcion'          => $json['descripcion'] ?? null,

                        // normaliza formato a 'Y-m-d H:i:s'
                        'fecha_certificacion'  => isset($json['fecha'])
                            ? Carbon::parse($json['fecha'])->toDateTimeString()
                            : now()->toDateTimeString(),

                        // si ya viene como string (base64), guarda tal cual; si no, fuerza a string y codifica
                        'xml_certificado'      => is_string($json['xml_certificado'] ?? null)
                            ? $json['xml_certificado']
                            : base64_encode((string)($json['xml_certificado'] ?? '')),

                        // evita "Array to string conversion"
                        'alertas'              => isset($json['descripcion_alertas_infile'])
                            ? (is_array($json['descripcion_alertas_infile'])
                                ? json_encode($json['descripcion_alertas_infile'], JSON_UNESCAPED_UNICODE)
                                : (string)$json['descripcion_alertas_infile'])
                            : null,

                        'identificador'        => $identificador,
                        'numero_crtf'          => $idReceptor,
                        'tipo_crtf'            => $docTipo,
                        'tipo_especial_crtf'   => $tipoEspecial,
                        'nombre_crtf'          => $nombre,
                        'email_crtf'           => $correo,
                        'direccion_crtf'       => $direccion,
                        'estado'               => 1,
                        'nofactura'            => $noFactura,
                        // Fotografía de los importes de la factura certificada
                        'subtotal_factura' =>
                        round((float) $cotizacion->subtotal, 2),

                        'descuento_factura' =>
                        round((float) $cotizacion->descuento_monto, 2),

                        'iva_factura' =>
                        round((float) $cotizacion->impuesto_iva, 2),

                        'timbre_prensa_base' =>
                        $importesFactura['timbre_prensa_base'],

                        'timbre_prensa_porcentaje' =>
                        $importesFactura['timbre_prensa_porcentaje'],

                        'timbre_prensa_monto' =>
                        $importesFactura['timbre_prensa_monto'],

                        'total_factura' =>
                        $importesFactura['total_factura'],
                    ]);

                    if ($idintentoFCAM !== null) {
                        // El registro fiscal, la CXC y la transición del intento
                        // deben confirmarse en la misma transacción.
                        DB::table('adm_fel_intentos')->where('idintento', $idintentoFCAM)
                            ->where('estado', 'ENVIANDO')->update([
                                'idfactura' => $factura->idfactura,
                                'uuid' => $json['uuid'],
                            ]);
                    }

                    //mover la cotización de 5 → 6 (pero sin “ensuciar” con campos FEL)
                    $cotizacion->update(['estado' => 6]);

                    //CxC por factura (NO por cotización genérica)
                    //CxC por factura (NO por cotización genérica)
                    $cxcoriginal = AdmCuentasPorCobrar::where('idcotizacion', $cotizacion->idcotizacion)->first();

                    if ($cxcoriginal && $cxcoriginal->estado == 0) {
                        //Reactivar (ya estaba anulada)
                        // $montoOriginal = (float) $cotizacion->total_general;
                        // $descuento     = (float) ($cotizacion->descuento_monto ?? 0);
                        // $saldo         = (float) $cotizacion->total;
                        // Total original de productos, incluyendo el cargo del timbre
                        $montoOriginal = round(
                            (float) $cotizacion->total_general +
                                $importesFactura['timbre_prensa_monto'],
                            2
                        );

                        // Descuento comercial aplicado
                        $descuento = round(
                            (float) ($cotizacion->descuento_monto ?? 0),
                            2
                        );

                        // Saldo real de la factura, con timbre incluido
                        $saldo = $importesFactura['total_factura'];

                        $cxcoriginal->update([
                            'idfactura'          => $factura->idfactura,
                            'fecha_emision'      => now(),
                            'fecha_vencimiento' => $fechaVencimientoFCAM,
                            'monto_original'     => $montoOriginal,
                            'saldo_pendiente'    => $saldo,
                            'monto_pagado'       => 0,
                            'descuento_aplicado' => $descuento,
                            'estado'             => 1, // reactivada
                            'fecha_creacion'     => now(),
                        ]);
                    } elseif (!$cxcoriginal) {
                        // 🆕 Crear una nueva si no existe
                        $correlativoCXC = Correlativo::lockForUpdate()->find('adm_cuentas_porcobrar');
                        if (!$correlativoCXC) {
                            throw new \RuntimeException('No se encontró correlativo para cuentas por cobrar');
                        }

                        $nuevoIdCXC = $correlativoCXC->correlativo + $correlativoCXC->incremento;
                        $correlativoCXC->correlativo = $nuevoIdCXC;
                        $correlativoCXC->save();

                        // $montoOriginal = (float) $cotizacion->total_general;
                        // $descuento     = (float) ($cotizacion->descuento_monto ?? 0);
                        // $saldo         = (float) $cotizacion->total;
                        // Total original de productos, incluyendo el cargo del timbre
                        $montoOriginal = round(
                            (float) $cotizacion->total_general +
                                $importesFactura['timbre_prensa_monto'],
                            2
                        );

                        // Descuento comercial aplicado
                        $descuento = round(
                            (float) ($cotizacion->descuento_monto ?? 0),
                            2
                        );

                        // Saldo real de la factura, con timbre incluido
                        $saldo = $importesFactura['total_factura'];

                        AdmCuentasPorCobrar::create([
                            'idcuentaporcobrar'  => $nuevoIdCXC,
                            'idcotizacion'       => $cotizacion->idcotizacion,
                            'idfactura'          => $factura->idfactura,
                            'idcliente'          => $cotizacion->idcliente,
                            'fecha_emision'      => now(),
                            'fecha_vencimiento' => $fechaVencimientoFCAM,
                            'moneda'             => 'GTQ',
                            'tasa_cambio'        => 1,
                            'monto_original'     => $montoOriginal,
                            'saldo_pendiente'    => $saldo,
                            'monto_pagado'       => 0,
                            'descuento_aplicado' => $descuento,
                            'idusuario_creacion' => auth()->id(),
                            'usuario_creacion'   => auth()->user()->name ?? 'sistema',
                            'fecha_creacion'     => now(),
                            'origen_registro'    => 'sistema',
                            'centro_costo'       => 'produccion',
                            'cuenta_contable'    => '0',
                            'estatus_riesgo'     => 'medio',
                            'estado'             => 1,
                        ]);
                    }
                    if ($idintentoFCAM !== null) {
                        $transicion = DB::table('adm_fel_intentos')->where('idintento', $idintentoFCAM)
                            ->where('estado', 'ENVIANDO')->update([
                                'estado' => 'CERTIFICADO',
                                'fecha_respuesta' => now(),
                            ]);
                        if ($transicion !== 1) {
                            throw new \RuntimeException('No pudo confirmarse el intento FCAM.');
                        }
                    }
                } else {
                    // ⭐ guardar intento fallido como fila también (opcional pero útil)
                    AdmFacturacion::create([
                        'idcotizacion'   => $idcotizacion,
                        'resultado'      => 'N',
                        // evita "Array to string conversion"
                        'errores'        => isset($json['descripcion_errores'])
                            ? (is_array($json['descripcion_errores'])
                                ? json_encode($json['descripcion_errores'], JSON_UNESCAPED_UNICODE)
                                : (string)$json['descripcion_errores'])
                            : json_encode(['Error desconocido'], JSON_UNESCAPED_UNICODE),
                        'identificador'  => $identificador,
                        'estado'         => 0, // fallida/no vigente
                    ]);
                }
            });

            //fin de grabar en la base de datos

            if ($json['resultado'] === true) {
                return response()->json([
                    'resultado' => true,
                    'uuid' => $json['uuid'],
                    'serie' => $json['serie'],
                    'numero' => $json['numero'],
                    'descripcion' => $json['descripcion'],
                    'fecha_certificacion' => $json['fecha'],
                    'xml_certificado' => base64_encode($json['xml_certificado']),
                    'alertas' => $json['descripcion_alertas_infile'],
                ]);
            } else {
                return response()->json([
                    'resultado' => false,
                    'errores' => 'Ocurrió un error al realizar la certificación', //$json['descripcion_errores'],
                ], 422);
            }
        } catch (\Throwable $e) {
            if ($idintentoFCAM !== null) {
                try {
                    DB::table('adm_fel_intentos')->where('idintento', $idintentoFCAM)
                        ->where('estado', 'ENVIANDO')->update([
                            'estado' => 'INCIERTO',
                            'mensaje_error' => mb_substr('Fallo posterior a la reserva: ' . $e->getMessage(), 0, 2000),
                        ]);
                } catch (\Throwable $falloBD) {
                    Log::critical('No se pudo congelar intento FCAM', [
                        'idintento' => $idintentoFCAM,
                        'error_tipo' => get_class($falloBD),
                    ]);
                }
                Log::error('Error de certificación FCAM con resultado incierto', [
                    'idintento' => $idintentoFCAM,
                    'tipo' => get_class($e),
                ]);
                return response()->json([
                    'resultado' => false,
                    'estado' => 'INCIERTO',
                    'idintento' => $idintentoFCAM,
                    'mensaje' => 'No se confirmó el resultado FCAM. Conciliar sin reenviar.',
                ], 409);
            }
            Log::error('Error al certificar XML FEL', [
                'cotizacion_id' => $idcotizacion,
                'exception' => $e->getMessage(),
                'trace'         => $e->getTraceAsString(),
            ]);

            return response()->json([
                'resultado' => false,
                'errores' => $e->getMessage(),
            ], 500);
        }
    }




    public function vistaPreviaFacturaTimbre($id)
    {
        // Disponible exclusivamente en entorno local.
        abort_unless(app()->environment('local'), 404);

        $cot = AdmCotizacion::findOrFail($id);

        $detalles = AdmDetalleCotizacion::where(
            'idcotizacion',
            $id
        )
            ->where('estado', 1)
            ->orderBy('iddetallecotizacion')
            ->get();

        if ($detalles->isEmpty()) {
            return response()->json([
                'message' => 'La cotización no tiene detalles activos.'
            ], 422);
        }

        $timbre = round(
            (float) ($cot->timbre_prensa_monto ?? 0),
            2
        );

        $total = round(
            (float) $cot->total + $timbre,
            2
        );

        // Datos simulados exclusivamente para visualizar la factura.
        // No se genera ninguna certificación FEL.
        $cabecera = new \stdClass();

        $cabecera->idcotizacion = $cot->idcotizacion;
        $cabecera->nocotizacion = $cot->nocotizacion;
        $cabecera->serie = 'VISTA-PREVIA';
        $cabecera->numero = 'SIN-CERTIFICAR';
        $cabecera->numero_autorizacion = 'DOCUMENTO-NO-CERTIFICADO';
        $cabecera->fecha_emision = now()->toDateString();

        $cabecera->total = $total;
        $cabecera->timbre_prensa_monto = $timbre;
        $cabecera->descuento_monto =
            (float) ($cot->descuento_monto ?? 0);

        $cabecera->nit = $cot->cliente?->nit ?? 'CF';
        $cabecera->nombre =
            $cot->cliente?->nombre ?? 'CLIENTE PRUEBA';

        $cabecera->direccion =
            $cot->cliente?->direccion ?? 'CIUDAD';

        $cabecera->estado = 6;
        $cabecera->numero_interno =
            'PREVIA-CT' . $cot->nocotizacion;

        $totalEnLetras =
            $this->convertirNumeroALetrasConCentavos($total);

        $html = view('pdf.factura', [
            'cotizacion' => $cabecera,
            'detalles' => $detalles,
            'totalEnLetras' => $totalEnLetras,
            'esVistaPrevia' => true,
        ])->render();

        $pdf = Pdf::loadHTML($html)
            ->setPaper('letter', 'portrait');

        return response($pdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header(
                'Content-Disposition',
                'inline; filename="PREVIA-FACTURA-CT' .
                    $cot->nocotizacion . '.pdf"'
            )
            ->header('Cache-Control', 'no-store, private');
    }


    public function descargarXML($uuid)
    {
        // $registro = Cotizacion::where('uuid', $uuid)->firstOrFail();
        // $xmlBase64 = $registro->xml_certificado;
        // $xml = base64_decode($xmlBase64);

        // return response($xml, 200)
        //     ->header('Content-Type', 'application/xml')
        //     ->header('Content-Disposition', 'attachment; filename="FEL_' . $uuid . '.xml"');
    }
    public function generarImpresionFactura($id)
    {
        //Log::info("➡️ Entrando a generarImpresionFactura con ID={$id}");

        try {
            $fact = $this->facturaVigente((int)$id);
            if (!$fact) {
                //Log::warning("❌ No hay DTE vigente para cotización ID={$id}");
                return response()->json(['message' => 'No hay DTE vigente para esta cotización'], 404);
            }

            $cot = AdmCotizacion::select(
                'idcotizacion',
                'total',
                'nocotizacion',
                'estado',
                'descuento_monto'
            )->findOrFail($id);

            $cabecera = $this->cabeceraParaVista($fact, $cot);
            //Log::info("✅ Cabecera generada. Estado={$cabecera->estado}");

            $detalles = AdmDetalleCotizacion::where('idcotizacion', $id)->get();
            $totalEnLetras = $this->convertirNumeroALetrasConCentavos($cabecera->total);

            // ======= Paso 2: Intentar guardar HTML =======
            $html = view('pdf.factura', [
                'cotizacion'     => $cabecera,
                'detalles'       => $detalles,
                'totalEnLetras'  => $totalEnLetras,
            ])->render();

            $path = storage_path('app/debug_factura.html');
            file_put_contents($path, $html);
            //Log::info("📝 HTML guardado en {$path}");
            // ============================================

            $pdf = Pdf::loadHTML($html)->setPaper('letter', 'portrait');
            //Log::info("📄 PDF renderizado correctamente para {$cabecera->numero_interno}");
            return $pdf->stream('factura-' . $cabecera->serie . '-' . $cabecera->numero . '.pdf');
        } catch (\Throwable $e) {
            Log::error("⚠️ Error en generarImpresionFactura: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Error interno al generar PDF.'], 500);
        }
    }


    public function facturaData($id)
    {
        $fact = $this->facturaVigente((int)$id);
        if (!$fact) {
            return response()->json(['message' => 'No hay DTE vigente para esta cotización'], 404);
        }

        $cot = AdmCotizacion::select('idcotizacion', 'total_general', 'nocotizacion', 'estado')
            ->findOrFail($id);

        $cab = $this->cabeceraParaVista($fact, $cot);

        // Detalle
        $detalles = DB::table('adm_detalle_cotizacion as d')
            ->where('d.idcotizacion', $id)
            ->select('d.cantidad', 'd.descripcion', DB::raw('d.precio as precio_unitario'), 'd.total')
            ->orderBy('d.iddetallecotizacion', 'asc')
            ->get()
            ->map(function ($d) {
                return [
                    'cantidad' => (int) $d->cantidad,
                    'descripcion' => $d->descripcion,
                    'precio' => round((float) $d->precio_unitario, 2),
                    'total'  => round((float) $d->total, 2),
                ];
            });

        $totalEnLetras = $this->convertirNumeroALetrasConCentavos($cab->total);

        return response()->json([
            'cotizacion' => [
                'serie'               => $cab->serie,
                'numero'              => $cab->numero,
                'numero_autorizacion' => $cab->numero_autorizacion,
                'fecha_emision'       => Carbon::parse($cab->fecha_emision)->format('d/m/Y'),
                'total'               => (float) $cab->total,
                'nit'                 => $cab->nit,
                'nombre'              => $cab->nombre,
                'direccion'           => $cab->direccion,
                'numero_interno'      => $cab->numero_interno,
                'total_en_letras'     => $totalEnLetras,
            ],
            'detalles' => $detalles,
        ]);
    }


    private function convertirNumeroALetrasConCentavos($numero)
    {
        $numberToWords = new NumberToWords();
        $numberTransformer = $numberToWords->getNumberTransformer('es');

        $entero = floor($numero);
        $decimal = round(($numero - $entero) * 100);

        $letrasEntero = $numberTransformer->toWords($entero);
        $letrasCentavos = $decimal > 0 ? "CON {$decimal}/100" : "CON 00/100";

        //return ucfirst($letrasEntero) . ' ' . $letrasCentavos;
        return strtoupper($letrasEntero . ' ' . $letrasCentavos);
    }

    public function anularFactura(Request $request, $idcotizacion)
    {
        $request->validate([
            'motivo' => 'required|string|max:250',
        ]);

        // 1) Buscar la ÚLTIMA factura vigente y certificada para esta cotización
        $factura = AdmFacturacion::where('idcotizacion', $idcotizacion)
            ->where('estado', 1)              // vigente
            ->where('resultado', 'S')         // certificada OK
            ->latest('idfactura')
            ->first();

        if (!$factura || empty($factura->uuid)) {
            return response()->json(['error' => 'No hay factura vigente certificada para anular.'], 400);
        }

        $uuid           = strtoupper(trim($factura->uuid));
        $motivo         = $request->motivo;
        $nitEmisor      = '109126599';
        $idReceptor     = $factura->numero_crtf ?: 'CF'; // receptor tomado de la certificación almacenada
        $fechaEmision   = Carbon::parse($factura->fecha_certificacion)->format('Y-m-d\TH:i:s');
        $fechaAnulacion = now()->format('Y-m-d\TH:i:s');

        // 2) Construir XML de anulación
        $doc = new \DOMDocument('1.0', 'UTF-8');
        $doc->formatOutput = true;

        $GTAnulacion = $doc->createElementNS('http://www.sat.gob.gt/dte/fel/0.1.0', 'dte:GTAnulacionDocumento');
        $GTAnulacion->setAttribute('xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#');
        $GTAnulacion->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $GTAnulacion->setAttribute('Version', '0.1');
        // Nota: no es necesario incluir schemaLocation con rutas locales
        $doc->appendChild($GTAnulacion);

        $SAT = $doc->createElement('dte:SAT');
        $GTAnulacion->appendChild($SAT);

        $AnulacionDTE = $doc->createElement('dte:AnulacionDTE');
        $AnulacionDTE->setAttribute('ID', 'DatosCertificados');
        $SAT->appendChild($AnulacionDTE);

        $DatosGenerales = $doc->createElement('dte:DatosGenerales');
        $DatosGenerales->setAttribute('ID', 'DatosAnulacion');
        $DatosGenerales->setAttribute('NumeroDocumentoAAnular', $uuid);
        $DatosGenerales->setAttribute('NITEmisor', $nitEmisor);
        $DatosGenerales->setAttribute('IDReceptor', $idReceptor);
        $DatosGenerales->setAttribute('FechaEmisionDocumentoAnular', $fechaEmision);
        $DatosGenerales->setAttribute('FechaHoraAnulacion', $fechaAnulacion);
        $DatosGenerales->setAttribute('MotivoAnulacion', $motivo);
        $AnulacionDTE->appendChild($DatosGenerales);

        $xmlString = $doc->saveXML();

        // 3) Headers y URL INFILE
        $headers = [
            'Content-Type'  => 'application/xml',
            'UsuarioApi'    => '109126599PRO',
            'LlaveApi'      => 'EC7E300DF9F5EDD673FE02342E9C4293',
            'UsuarioFirma'  => '109126599PRO',
            'LlaveFirma'    => 'fd5ff1bd52eeb988de3ddd63abcf9324',
            'Identificador' => (string) Str::uuid(),
        ];
        $url = 'https://certificador.feel.com.gt/fel/procesounificado/transaccion/v2/xml';

        try {
            Log::info('XML Anulación FEL INFILE', ['xml' => $xmlString]);

            $response = Http::withHeaders($headers)->send('POST', $url, ['body' => $xmlString]);

            Log::info('Respuesta de anulación FEL INFILE', ['body' => $response->body()]);

            // Infile suele regresar JSON anidado
            $data     = json_decode($response->body(), true);
            $bodyData = isset($data['body']) ? json_decode($data['body'], true) : $data;

            if (($bodyData['resultado'] ?? false) === true) {
                // 4) Persistencia coherente y aislada
                DB::transaction(function () use ($factura, $motivo, $idcotizacion) {
                    // a) Marcar la fila de adm_facturacion como anulada
                    AdmFacturacion::where('idfactura', $factura->idfactura)->update([
                        'estado'           => 0,                 // anulada
                        'fecha_anulacion'  => now(),
                        'motivo_anulacion' => $motivo,
                        'idusuario_anula'  => auth()->id(),
                    ]);

                    // b) La cotización vuelve a estado 5 (lista para refacturar)
                    AdmCotizacion::where('idcotizacion', $idcotizacion)->update([
                        'estado' => 4,
                    ]);

                    // c) (Opcional/Recomendado) Cerrar la CxC de ESTA factura
                    AdmCuentasPorCobrar::where('idfactura', $factura->idfactura)
                        ->update(['estado' => 0, 'estatus_riesgo' => 'cerrado']);
                });

                return response()->json([
                    'resultado' => true,
                    'mensaje'   => 'Factura anulada con éxito.',
                    'uuid'      => $bodyData['uuid'] ?? '',
                ]);
            }

            // Error de anulación reportado por Infile/SAT
            return response()->json([
                'resultado' => false,
                'mensaje'   => $bodyData['descripcion'] ?? 'La anulación no fue aceptada.',
                'errores'   => $bodyData['descripcion_errores'] ?? ['Error desconocido.'],
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Error al procesar anulación FEL', [
                'mensaje' => $e->getMessage(),
                'uuid'    => $uuid ?? null,
            ]);

            return response()->json([
                'resultado' => false,
                'mensaje'   => 'Error al procesar la anulación.',
                'error'     => $e->getMessage(),
            ], 500);
        }
    }



    // public function generarXMLNotaCredito(Request $request, $idcotizacion)
    // {
    //     $validated = $request->validate([
    //         'motivo' => 'required|string|max:200',
    //         'monto'  => 'required|numeric|min:0.01',
    //     ]);

    //     $bloqueo = $this->validarFacturaOrigenNotaConTimbre(
    //         (int) $idcotizacion
    //     );

    //     if ($bloqueo) {
    //         return $bloqueo;
    //     }

    //     $res = $this->construirXMLNotaAjuste($idcotizacion, 'NCRE', $validated['motivo'], (float)$validated['monto']);
    //     if (!$res) return response()->json(['resultado' => false, 'errores' => 'No se pudo generar XML'], 422);

    //     return $this->enviarXMLAFEL($idcotizacion, $res['xml'], 'NCRE', $res['meta']);
    // }

    public function generarXMLNotaCredito(Request $request, $idcotizacion)
    {
        $validated = $request->validate([
            'motivo' => 'required|string|max:200',
            'monto'  => 'required|numeric|min:0.01',
        ]);


        if (
            app()->environment('local') &&
            $request->boolean('vista_previa_ncre_total_xml')
        ) {
            $factura = $this->facturaVigente((int) $idcotizacion);

            if (!$factura) {
                return response()->json([
                    'resultado' => false,
                    'message' => 'No existe factura certificada vigente.',
                ], 422);
            }

            $lectura = $this->leerXMLFacturaCertificada($factura);

            if (!$lectura['valido']) {
                return response()->json([
                    'resultado' => false,
                    'message' => $lectura['mensaje'] ?? 'XML de origen inválido.',
                ], 422);
            }

            $totalOrigen = round((float) $lectura['gran_total'], 2);

            $disponibilidadNCRE = $this->validarSaldoDisponibleNCRE(
                $factura,
                $totalOrigen
            );

            if (!$disponibilidadNCRE['valido']) {
                return response()->json([
                    'resultado' => false,
                    'message' => $disponibilidadNCRE['mensaje'],
                    'disponibilidad' => $disponibilidadNCRE,
                ], 422);
            }

            if (abs($totalOrigen - (float) $validated['monto']) > 0.001) {
                return response()->json([
                    'resultado' => false,
                    'message' => 'El monto no coincide con el total de la factura.',
                    'total_origen' => $totalOrigen,
                ], 422);
            }

            try {
                $res = $this->construirXMLNotaAjuste(
                    $idcotizacion,
                    'NCRE',
                    $validated['motivo'],
                    $totalOrigen,
                    true
                );


                $conciliacion = $this->conciliarXMLConMetadatosNota(
                    $res['xml'],
                    $res['meta']
                );

                if (!$conciliacion['valido']) {
                    return response()->json([
                        'resultado' => false,
                        'message' => 'El XML no coincide con los metadatos fiscales.',
                        'conciliacion' => $conciliacion,
                    ], 422);
                }

                if (
                    $request->boolean('preparar_intento_nota')
                ) {
                    $intento = $this->prepararIntentoNotaFEL(
                        (int) $idcotizacion,
                        'NCRE',
                        (string) $res['meta']['origen']['uuid'],
                        $res['xml'],
                        $res['meta']
                    );

                    return response()->json([
                        'resultado' => $intento['valido'],
                        'modo' => 'PREPARAR_NCRE_SIN_CERTIFICAR',
                        'intento' => $intento,
                    ], $intento['valido'] ? 200 : 409);
                }


                return response()->json([
                    'resultado' => true,
                    'modo' => 'PREVIA_NCRE_TOTAL_DESDE_XML',
                    'meta' => $res['meta'],
                    'xml' => $res['xml'],
                    'disponibilidad' => $disponibilidadNCRE,
                    'conciliacion' => $conciliacion,
                ]);
            } catch (\Throwable $e) {
                return response()->json([
                    'resultado' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }
        }


        // Protección de facturas con Timbre de Prensa.
        // Se mantiene hasta completar el cálculo fiscal.
        $bloqueo = $this->validarFacturaOrigenNotaConTimbre(
            (int) $idcotizacion
        );

        if ($bloqueo) {
            return $bloqueo;
        }

        $res = $this->construirXMLNotaAjuste(
            $idcotizacion,
            'NCRE',
            $validated['motivo'],
            (float) $validated['monto']
        );

        if (!$res) {
            return response()->json([
                'resultado' => false,
                'errores' => 'No se pudo generar XML',
            ], 422);
        }

        // Vista previa exclusivamente en desarrollo.
        // No envía documentos ni modifica la base de datos.
        if (
            app()->environment('local') &&
            $request->boolean('vista_previa_xml')
        ) {
            return response()->json([
                'resultado' => true,
                'modo' => 'VISTA_PREVIA_NCRE_SIN_CERTIFICAR',
                'tipo' => 'NCRE',
                'meta' => $res['meta'],
                'xml' => $res['xml'],
            ]);
        }

        return $this->enviarXMLAFEL(
            $idcotizacion,
            $res['xml'],
            'NCRE',
            $res['meta']
        );
    }


    // public function generarXMLNotaDebito(Request $request, $idcotizacion)
    // {
    //     $validated = $request->validate([
    //         'motivo' => 'required|string|max:200',
    //         'monto'  => 'required|numeric|min:0.01',
    //     ]);

    //     $bloqueo = $this->validarFacturaOrigenNotaConTimbre(
    //         (int) $idcotizacion
    //     );

    //     if ($bloqueo) {
    //         return $bloqueo;
    //     }

    //     $res = $this->construirXMLNotaAjuste($idcotizacion, 'NDEB', $validated['motivo'], (float)$validated['monto']);
    //     if (!$res) return response()->json(['resultado' => false, 'errores' => 'No se pudo generar XML'], 422);

    //     return $this->enviarXMLAFEL($idcotizacion, $res['xml'], 'NDEB', $res['meta']);
    // }


    // public function generarXMLNotaDebito(Request $request, $idcotizacion)
    // {
    //     $validated = $request->validate([
    //         'motivo' => 'required|string|max:200',
    //         'monto'  => 'required|numeric|min:0.01',
    //     ]);

    //     // Protección de facturas con Timbre de Prensa.
    //     $bloqueo = $this->validarFacturaOrigenNotaConTimbre(
    //         (int) $idcotizacion
    //     );

    //     if ($bloqueo) {
    //         return $bloqueo;
    //     }

    //     $res = $this->construirXMLNotaAjuste(
    //         $idcotizacion,
    //         'NDEB',
    //         $validated['motivo'],
    //         (float) $validated['monto']
    //     );

    //     if (!$res) {
    //         return response()->json([
    //             'resultado' => false,
    //             'errores' => 'No se pudo generar XML',
    //         ], 422);
    //     }

    //     // Vista previa exclusivamente en desarrollo.
    //     if (
    //         app()->environment('local') &&
    //         $request->boolean('vista_previa_xml')
    //     ) {
    //         return response()->json([
    //             'resultado' => true,
    //             'modo' => 'VISTA_PREVIA_NDEB_SIN_CERTIFICAR',
    //             'tipo' => 'NDEB',
    //             'meta' => $res['meta'],
    //             'xml' => $res['xml'],
    //         ]);
    //     }

    //     return $this->enviarXMLAFEL(
    //         $idcotizacion,
    //         $res['xml'],
    //         'NDEB',
    //         $res['meta']
    //     );
    // }

    public function generarXMLNotaDebito(Request $request, $idcotizacion)
    {
        $validated = $request->validate([
            'motivo' => 'required|string|max:200',
            'monto'  => 'required|numeric|min:0.01',
        ]);

        $bloqueo = $this->validarFacturaOrigenNotaConTimbre((int) $idcotizacion);
        if ($bloqueo) {
            return $bloqueo;
        }

        // Una factura anulada nunca debe servir como documento origen.
        $factura = AdmFacturacion::where('idcotizacion', (int) $idcotizacion)
            ->where('resultado', 'S')
            ->where('estado', 1)
            ->latest('idfactura')
            ->first();

        if (!$factura || empty($factura->uuid)) {
            return response()->json([
                'resultado' => false,
                'mensaje' => 'No existe factura certificada vigente para emitir una NDEB.',
            ], 422);
        }

        $res = $this->construirXMLNotaAjuste(
            $idcotizacion,
            'NDEB',
            $validated['motivo'],
            (float) $validated['monto']
        );

        if (!$res || !isset($res['xml'], $res['meta'])) {
            return response()->json([
                'resultado' => false,
                'mensaje' => 'No se pudo generar el XML de NDEB.',
            ], 422);
        }

        // Esta vía nueva solo se expone en desarrollo y jamás certifica.
        if (app()->environment('local') && $request->boolean('preparar_intento_nota')) {
            if (
                strcasecmp((string) ($res['meta']['origen']['uuid'] ?? ''), (string) $factura->uuid) !== 0 ||
                (int) ($res['meta']['idfactura_origen'] ?? 0) !== (int) $factura->idfactura
            ) {
                return response()->json([
                    'resultado' => false,
                    'mensaje' => 'La NDEB no corresponde a la factura certificada vigente.',
                ], 422);
            }

            $conciliacion = $this->conciliarXMLConMetadatosNota($res['xml'], $res['meta']);
            if (!$conciliacion['valido']) {
                return response()->json([
                    'resultado' => false,
                    'mensaje' => 'La NDEB no concilia con sus metadatos fiscales.',
                    'errores' => $conciliacion['errores'] ?? [],
                ], 422);
            }

            $intento = $this->prepararIntentoNotaFEL(
                (int) $idcotizacion,
                'NDEB',
                (string) $factura->uuid,
                $res['xml'],
                $res['meta']
            );

            return response()->json([
                'resultado' => (bool) $intento['valido'],
                'modo' => 'PREPARAR_NDEB_SIN_CERTIFICAR',
                'intento' => $intento,
            ], $intento['valido'] ? 200 : 409);
        }

        if (app()->environment('local') && $request->boolean('vista_previa_xml')) {
            return response()->json([
                'resultado' => true,
                'modo' => 'VISTA_PREVIA_NDEB_SIN_CERTIFICAR',
                'tipo' => 'NDEB',
                'meta' => $res['meta'],
                'xml' => $res['xml'],
            ]);
        }

        // El método de la etapa 44 mantiene bloqueado el envío real.
        return $this->enviarXMLAFEL($idcotizacion, $res['xml'], 'NDEB', $res['meta']);
    }


    private function construirXMLNotaAjuste(
        $idcotizacion,
        $tipo,
        $motivo,
        $monto,
        bool $totalDesdeXML = false
    ) {
        // 1) Documento origen (fotografía FEL vigente)
        $fact = $this->facturaVigente((int)$idcotizacion);
        if (!$fact) return null; // no hay DTE vigente que referenciar

        $lecturaOrigen = null;

        if ($totalDesdeXML) {
            $lecturaOrigen = $this->leerXMLFacturaCertificada($fact);

            if (!$lecturaOrigen['valido']) {
                throw new \RuntimeException(
                    $lecturaOrigen['mensaje']
                        ?? 'No se pudo validar el XML certificado.'
                );
            }

            if (empty($lecturaOrigen['receptor'])) {
                throw new \RuntimeException(
                    'El XML original no contiene datos del receptor.'
                );
            }
        }

        // 2) Datos adicionales del cliente (para dirección/código postal/municipio/departamento)
        $cli = DB::table('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('adm_municipio as m', 'cl.id_municipio', '=', 'm.id_municipio')
            ->join('adm_departamentopais as dp', 'cl.iddepartamento', '=', 'dp.iddepartamentopais')
            ->where('c.idcotizacion', $idcotizacion)
            ->select(
                'cl.idcliente',
                'cl.nombre         as cliente_nombre',
                'cl.direccion      as cliente_direccion',
                'cl.email          as cliente_email',
                'cl.codigo_postal',
                'cl.excento_iva',
                'm.nombre          as municipio',
                'dp.nombre         as departamento',
                'c.tipo_facturacion'
            )
            ->first();

        // Determina si es bien o servicio
        $bienOServicio = 'B'; // por defecto
        if (!empty($cli->tipo_facturacion) && strtoupper($cli->tipo_facturacion) === 'SERVICIO') {
            $bienOServicio = 'S';
        }


        // 3) Normalización de montos
        $monto = round((float)$monto, 2);
        if ($monto <= 0) return null;

        $exento = ($cli->excento_iva ?? 'N') === 'S';
        if ($exento) {
            $monto_gravable = 0.00;
            $monto_impuesto = 0.00;
        } else {
            $monto_gravable = round($monto / 1.12, 2);
            $monto_impuesto = round($monto - $monto_gravable, 2);
        }

        // 4) Armar XML (usando LA FACTURA como origen)
        $doc = new \DOMDocument('1.0', 'UTF-8');
        $doc->formatOutput = true;

        $GTDocumento = $doc->createElementNS('http://www.sat.gob.gt/dte/fel/0.2.0', 'dte:GTDocumento');
        $GTDocumento->setAttribute('xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#');
        $GTDocumento->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $GTDocumento->setAttribute('Version', '0.1');
        $doc->appendChild($GTDocumento);

        $SAT = $doc->createElement('dte:SAT');
        $SAT->setAttribute('ClaseDocumento', 'dte');
        $GTDocumento->appendChild($SAT);

        $DTE = $doc->createElement('dte:DTE');
        $DTE->setAttribute('ID', 'DatosCertificados');
        $SAT->appendChild($DTE);

        $DatosEmision = $doc->createElement('dte:DatosEmision');
        $DatosEmision->setAttribute('ID', 'DatosEmision');
        $DTE->appendChild($DatosEmision);

        $DatosGenerales = $doc->createElement('dte:DatosGenerales');
        $DatosGenerales->setAttribute('CodigoMoneda', 'GTQ');
        $DatosGenerales->setAttribute('FechaHoraEmision', now()->format('Y-m-d\TH:i:s'));
        $DatosGenerales->setAttribute('Tipo', $tipo); // NCRE | NDEB
        $DatosEmision->appendChild($DatosGenerales);

        // Emisor (tus datos)
        $Emisor = $doc->createElement('dte:Emisor');
        $Emisor->setAttribute('AfiliacionIVA', 'GEN');
        $Emisor->setAttribute('CodigoEstablecimiento', '1');
        $Emisor->setAttribute('CorreoEmisor', 'ventas@gpexcelencia.com');
        $Emisor->setAttribute('NITEmisor', '109126599');
        $Emisor->setAttribute('NombreComercial', 'GP EXCELENCIA');
        $Emisor->setAttribute('NombreEmisor', 'GP EXCELENCIA, SOCIEDAD ANÓNIMA');
        $DatosEmision->appendChild($Emisor);

        $dirEmisor = $doc->createElement('dte:DireccionEmisor');
        $dirEmisor->appendChild($doc->createElement('dte:Direccion', '11 CALLE 41-20 COLONIA EL NARANJITO ZONA 6 APARTAMENTO A'));
        $dirEmisor->appendChild($doc->createElement('dte:CodigoPostal', '01057'));
        $dirEmisor->appendChild($doc->createElement('dte:Municipio', 'MIXCO'));
        $dirEmisor->appendChild($doc->createElement('dte:Departamento', 'GUATEMALA'));
        $dirEmisor->appendChild($doc->createElement('dte:Pais', 'GT'));
        $Emisor->appendChild($dirEmisor);

        // Receptor: SIEMPRE desde la fotografía de la factura
        // Utilizar primero la identidad certificada de la factura.
        // Los datos actuales del cliente solo son respaldo histórico.
        $nombreReceptor = trim((string) (
            $fact->nombre_crtf
            ?: ($cli->cliente_nombre ?? '')
        ));

        $direccionReceptor = trim((string) (
            $fact->direccion_crtf
            ?: ($cli->cliente_direccion ?? '')
        ));

        $correoReceptor = trim((string) (
            $fact->email_crtf
            ?: ($cli->cliente_email ?? '')
        ));

        if ($totalDesdeXML && $lecturaOrigen !== null) {
            $receptorOriginal = $lecturaOrigen['receptor'];

            $nombreReceptor = $receptorOriginal['nombre'];
            $direccionReceptor = $receptorOriginal['direccion'];
            $correoReceptor = $receptorOriginal['email'];
        }

        // fallback a la “foto” de la factura solo si algo vino vacío
        if ($nombreReceptor    === '' && !empty($fact->nombre_crtf))    $nombreReceptor    = trim($fact->nombre_crtf);
        if ($direccionReceptor === '' && !empty($fact->direccion_crtf)) $direccionReceptor = trim($fact->direccion_crtf);
        if ($correoReceptor    === '' && !empty($fact->email_crtf))     $correoReceptor    = trim($fact->email_crtf);

        // valores mínimos para pasar XSD
        if ($nombreReceptor    === '') $nombreReceptor    = 'CONSUMIDOR FINAL';
        if ($direccionReceptor === '') $direccionReceptor = 'CIUDAD';

        $Receptor = $doc->createElement('dte:Receptor');
        $Receptor->setAttribute('CorreoReceptor', $correoReceptor);
        $numeroReceptor = $totalDesdeXML
            ? $lecturaOrigen['receptor']['numero']
            : ($fact->numero_crtf ?: 'CF');

        $Receptor->setAttribute(
            'IDReceptor',
            $numeroReceptor
        );
        $Receptor->setAttribute('NombreReceptor', mb_substr($nombreReceptor, 0, 200));

        if (!empty($fact->tipo_especial_crtf)) {
            //$Receptor->setAttribute('TipoEspecial', $fact->tipo_especial_crtf); // CUI | EXT
            $tipoEspecialReceptor = $totalDesdeXML
                ? ($lecturaOrigen['receptor']['tipo_especial'] ?? '')
                : ($fact->tipo_especial_crtf ?? '');

            if ($tipoEspecialReceptor !== '') {
                $Receptor->setAttribute(
                    'TipoEspecial',
                    $tipoEspecialReceptor
                );
            }
        }
        $DatosEmision->appendChild($Receptor);

        $dirReceptor = $doc->createElement('dte:DireccionReceptor');
        // $dirReceptor->appendChild($doc->createElement('dte:Direccion', mb_substr($direccionReceptor, 0, 512)));
        // $dirReceptor->appendChild($doc->createElement('dte:CodigoPostal', $cli->codigo_postal ?? '01001'));
        // $dirReceptor->appendChild($doc->createElement('dte:Municipio', $cli->municipio ?? 'GUATEMALA'));        
        //$dirReceptor->appendChild($doc->createElement('dte:Departamento', $cli->departamento ?? 'GUATEMALA'));
        //$dirReceptor->appendChild($doc->createElement('dte:Pais', 'GT'));

        $datosUbicacion = $totalDesdeXML
            ? $lecturaOrigen['receptor']
            : [
                'codigo_postal' => $cli->codigo_postal ?? '01001',
                'municipio' => $cli->municipio ?? 'GUATEMALA',
                'departamento' => $cli->departamento ?? 'GUATEMALA',
                'pais' => 'GT',
            ];

        $dirReceptor->appendChild(
            $doc->createElement(
                'dte:Direccion',
                mb_substr($direccionReceptor, 0, 512)
            )
        );

        $dirReceptor->appendChild(
            $doc->createElement(
                'dte:CodigoPostal',
                $datosUbicacion['codigo_postal']
            )
        );

        $dirReceptor->appendChild(
            $doc->createElement(
                'dte:Municipio',
                $datosUbicacion['municipio']
            )
        );

        $dirReceptor->appendChild(
            $doc->createElement(
                'dte:Departamento',
                $datosUbicacion['departamento']
            )
        );

        $dirReceptor->appendChild(
            $doc->createElement(
                'dte:Pais',
                $datosUbicacion['pais']
            )
        );

        $Receptor->appendChild($dirReceptor);

        // Frases
        $Frases = $doc->createElement('dte:Frases');
        $Frase = $doc->createElement('dte:Frase');
        $Frase->setAttribute('CodigoEscenario', '1');
        $Frase->setAttribute('TipoFrase', '1');
        $Frases->appendChild($Frase);
        $DatosEmision->appendChild($Frases);

        // Ítems de la nota
        $Items = $doc->createElement('dte:Items');

        $detallesOrigen = DB::select("
    SELECT 
        ROW_NUMBER() OVER (ORDER BY d.iddetallecotizacion) AS numero_linea,
        d.cantidad,
        IF(CHAR_LENGTH(d.unidad_medida) > 3, LEFT(d.unidad_medida, 3), d.unidad_medida) AS unidad_medida,
        d.descripcion,
        d.precio_unitario,
        d.precio,
        d.descuento,
        d.subtotal AS monto_gravable,
        d.impuesto_iva AS monto_impuesto,
        d.total
    FROM adm_detalle_cotizacion d
    WHERE d.estado = 1
    AND d.idcotizacion = ?
    ORDER BY d.iddetallecotizacion
", [$idcotizacion]);

        $sumaNota = 0.00;
        $sumaImpuestosNota = 0.00;


        $datosNotaTotal = null;

        if ($totalDesdeXML) {
            if ($tipo !== 'NCRE') {
                throw new \InvalidArgumentException(
                    'Esta modalidad solo admite NCRED total.'
                );
            }

            $datosNotaTotal = $this->calcularNCRETotalDesdeXML($fact);

            if (!$datosNotaTotal['valido']) {
                throw new \RuntimeException(
                    $datosNotaTotal['mensaje']
                        ?? 'No fue posible reconstruir la nota.'
                );
            }

            if (abs(
                (float) $monto -
                    (float) $datosNotaTotal['totales']['total']
            ) > 0.001) {
                throw new \InvalidArgumentException(
                    'El importe solicitado no coincide con el total certificado.'
                );
            }
        }


        $esNotaTotal = abs($monto - array_sum(array_map(fn($d) => (float)$d->total, $detallesOrigen))) < 0.01;

        if ($totalDesdeXML && $datosNotaTotal !== null) {

            $sumaNota = 0.00;
            $sumaImpuestosNota = 0.00;
            $sumaTimbreNota = 0.00;
            $baseTimbreNota = 0.00;

            foreach ($datosNotaTotal['lineas'] as $linea) {
                $Item = $doc->createElement('dte:Item');

                $Item->setAttribute(
                    'BienOServicio',
                    $linea['bien_o_servicio']
                );
                $Item->setAttribute('NumeroLinea', $linea['numero_linea']);

                $Item->appendChild(
                    $doc->createElement('dte:Cantidad', $linea['cantidad'])
                );

                $Item->appendChild(
                    $doc->createElement(
                        'dte:UnidadMedida',
                        $linea['unidad_medida']
                    )
                );

                $descripcion = $doc->createElement('dte:Descripcion');
                $descripcion->appendChild(
                    $doc->createCDATASection('NC: ' . $linea['descripcion'])
                );
                $Item->appendChild($descripcion);

                foreach (
                    [
                        'PrecioUnitario' => $linea['precio_unitario'],
                        'Precio' => $linea['precio'],
                        'Descuento' => $linea['descuento'],
                    ] as $campo => $valor
                ) {
                    $Item->appendChild(
                        $doc->createElement(
                            'dte:' . $campo,
                            number_format((float) $valor, 3, '.', '')
                        )
                    );
                }

                $Impuestos = $doc->createElement('dte:Impuestos');

                foreach ($linea['impuestos'] as $impuesto) {
                    $nombre = strtoupper(trim($impuesto['nombre']));

                    // No inventar el tratamiento de tributos desconocidos.
                    if (!in_array(
                        $nombre,
                        ['IVA', 'TIMBRE DE PRENSA'],
                        true
                    )) {
                        throw new \RuntimeException(
                            'Impuesto no soportado en nota: ' . $nombre
                        );
                    }

                    $nodoImpuesto = $doc->createElement('dte:Impuesto');

                    $nodoImpuesto->appendChild(
                        $doc->createElement('dte:NombreCorto', $nombre)
                    );

                    $nodoImpuesto->appendChild(
                        $doc->createElement(
                            'dte:CodigoUnidadGravable',
                            $impuesto['codigo_unidad_gravable']
                        )
                    );

                    $nodoImpuesto->appendChild(
                        $doc->createElement(
                            'dte:MontoGravable',
                            number_format($impuesto['base'], 3, '.', '')
                        )
                    );

                    $nodoImpuesto->appendChild(
                        $doc->createElement(
                            'dte:MontoImpuesto',
                            number_format($impuesto['monto'], 3, '.', '')
                        )
                    );

                    $Impuestos->appendChild($nodoImpuesto);

                    if ($nombre === 'IVA') {
                        $sumaImpuestosNota += $impuesto['monto'];
                    } elseif ($nombre === 'TIMBRE DE PRENSA') {
                        $sumaTimbreNota += $impuesto['monto'];
                        $baseTimbreNota += $impuesto['base'];
                    }
                }

                $Item->appendChild($Impuestos);

                $Item->appendChild(
                    $doc->createElement(
                        'dte:Total',
                        number_format($linea['total'], 3, '.', '')
                    )
                );

                $Items->appendChild($Item);
                $sumaNota += $linea['total'];
            }

            $monto = round($sumaNota, 2);
            $monto_impuesto = round($sumaImpuestosNota, 2);
            $monto_gravable = round(
                $monto - $monto_impuesto - $sumaTimbreNota,
                2
            );
        } elseif ($esNotaTotal && !empty($detallesOrigen)) {
            foreach ($detallesOrigen as $d) {
                $Item = $doc->createElement('dte:Item');
                $Item->setAttribute('BienOServicio', $bienOServicio);
                $Item->setAttribute('NumeroLinea', $d->numero_linea);

                $Item->appendChild($doc->createElement('dte:Cantidad', $d->cantidad));
                $Item->appendChild($doc->createElement('dte:UnidadMedida', $d->unidad_medida ?: 'UNI'));

                $descripcionNode = $doc->createElement('dte:Descripcion');
                $descripcionNode->appendChild(
                    $doc->createCDATASection(($tipo === 'NCRE' ? 'NC: ' : 'ND: ') . $d->descripcion)
                );
                $Item->appendChild($descripcionNode);

                $Item->appendChild($doc->createElement('dte:PrecioUnitario', number_format((float)$d->precio_unitario, 3, '.', '')));
                $Item->appendChild($doc->createElement('dte:Precio', number_format((float)$d->precio, 3, '.', '')));
                $Item->appendChild($doc->createElement('dte:Descuento', number_format((float)$d->descuento, 3, '.', '')));

                $Impuestos = $doc->createElement('dte:Impuestos');
                $Impuesto = $doc->createElement('dte:Impuesto');
                $Impuesto->appendChild($doc->createElement('dte:NombreCorto', 'IVA'));

                if ($exento) {
                    $Impuesto->appendChild($doc->createElement('dte:CodigoUnidadGravable', '2'));
                    $Impuesto->appendChild($doc->createElement('dte:MontoGravable', number_format((float)$d->total, 3, '.', '')));
                    $Impuesto->appendChild($doc->createElement('dte:MontoImpuesto', number_format(0, 3, '.', '')));
                } else {
                    $Impuesto->appendChild($doc->createElement('dte:CodigoUnidadGravable', '1'));
                    $Impuesto->appendChild($doc->createElement('dte:MontoGravable', number_format((float)$d->monto_gravable, 3, '.', '')));
                    $Impuesto->appendChild($doc->createElement('dte:MontoImpuesto', number_format((float)$d->monto_impuesto, 3, '.', '')));
                    $sumaImpuestosNota += (float)$d->monto_impuesto;
                }

                $Impuestos->appendChild($Impuesto);
                $Item->appendChild($Impuestos);

                $Item->appendChild($doc->createElement('dte:Total', number_format((float)$d->total, 3, '.', '')));

                $Items->appendChild($Item);

                $sumaNota += (float)$d->total;
            }

            $monto = round($sumaNota, 2);
            $monto_impuesto = round($sumaImpuestosNota, 2);
        } else {
            // Si es nota parcial, mantiene una sola línea,
            // pero evita que el IVA se pase por centavo.
            $monto_gravable = $exento ? 0.00 : round($monto / 1.12, 3);
            $monto_impuesto = $exento ? 0.00 : round($monto - $monto_gravable, 3);

            $Item = $doc->createElement('dte:Item');
            $Item->setAttribute('BienOServicio', $bienOServicio);
            $Item->setAttribute('NumeroLinea', 1);

            $Item->appendChild($doc->createElement('dte:Cantidad', '1'));
            $Item->appendChild($doc->createElement('dte:UnidadMedida', 'UNI'));
            $Item->appendChild($doc->createElement(
                'dte:Descripcion',
                ($tipo === 'NCRE' ? 'Ajuste Nota de Crédito: ' : 'Ajuste Nota de Débito: ') . $motivo
            ));
            $Item->appendChild($doc->createElement('dte:PrecioUnitario', number_format($monto, 3, '.', '')));
            $Item->appendChild($doc->createElement('dte:Precio', number_format($monto, 3, '.', '')));
            $Item->appendChild($doc->createElement('dte:Descuento', '0.000'));

            $Impuestos = $doc->createElement('dte:Impuestos');
            $Impuesto = $doc->createElement('dte:Impuesto');
            $Impuesto->appendChild($doc->createElement('dte:NombreCorto', 'IVA'));
            $Impuesto->appendChild($doc->createElement('dte:CodigoUnidadGravable', $exento ? '2' : '1'));
            $Impuesto->appendChild($doc->createElement('dte:MontoGravable', number_format($monto_gravable, 3, '.', '')));
            $Impuesto->appendChild($doc->createElement('dte:MontoImpuesto', number_format($monto_impuesto, 3, '.', '')));
            $Impuestos->appendChild($Impuesto);
            $Item->appendChild($Impuestos);

            $Item->appendChild($doc->createElement('dte:Total', number_format($monto, 3, '.', '')));

            $Items->appendChild($Item);
        }

        $DatosEmision->appendChild($Items);

        // Totales
        $Totales = $doc->createElement('dte:Totales');
        $TotalImpuestos = $doc->createElement('dte:TotalImpuestos');
        $TotalImpuesto = $doc->createElement('dte:TotalImpuesto');
        $TotalImpuesto->setAttribute('NombreCorto', 'IVA');
        //$TotalImpuesto->setAttribute('TotalMontoImpuesto', number_format($monto_impuesto, 2, '.', ''));
        $TotalImpuesto->setAttribute('TotalMontoImpuesto', number_format($monto_impuesto, 2, '.', ''));
        $TotalImpuestos->appendChild($TotalImpuesto);
        if ($totalDesdeXML && $sumaTimbreNota > 0) {
            $TotalImpuestoPrensa = $doc->createElement(
                'dte:TotalImpuesto'
            );

            $TotalImpuestoPrensa->setAttribute(
                'NombreCorto',
                'TIMBRE DE PRENSA'
            );

            $TotalImpuestoPrensa->setAttribute(
                'TotalMontoImpuesto',
                number_format($sumaTimbreNota, 2, '.', '')
            );

            $TotalImpuestos->appendChild($TotalImpuestoPrensa);
        }
        $Totales->appendChild($TotalImpuestos);
        //$Totales->appendChild($doc->createElement('dte:GranTotal', number_format($monto, 2, '.', '')));
        $Totales->appendChild($doc->createElement('dte:GranTotal', number_format($monto, 2, '.', '')));
        $DatosEmision->appendChild($Totales);

        // Complemento Referencias Nota (siempre con datos del DTE origen)
        $Complementos = $doc->createElement('dte:Complementos');
        $Complemento = $doc->createElement('dte:Complemento');
        $Complemento->setAttribute('IDComplemento', 'Notas');
        $Complemento->setAttribute('NombreComplemento', 'Notas');
        $Complemento->setAttribute('URIComplemento', 'http://www.sat.gob.gt/fel/notas.xsd');

        $ReferenciasNota = $doc->createElementNS('http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0', 'cno:ReferenciasNota');
        $ReferenciasNota->setAttribute('FechaEmisionDocumentoOrigen', Carbon::parse($fact->fecha_certificacion)->toDateString());
        $ReferenciasNota->setAttribute('MotivoAjuste', $motivo);
        $ReferenciasNota->setAttribute('NumeroAutorizacionDocumentoOrigen', $fact->uuid);
        $ReferenciasNota->setAttribute('NumeroDocumentoOrigen', $fact->numero);
        $ReferenciasNota->setAttribute('SerieDocumentoOrigen', $fact->serie);
        $ReferenciasNota->setAttribute('Version', '0.0');

        $Complemento->appendChild($ReferenciasNota);
        $Complementos->appendChild($Complemento);
        $DatosEmision->appendChild($Complementos);

        return [
            'xml'  => $doc->saveXML(),
            'meta' => [
                'idcliente'       => $cli->idcliente ?? null,
                'tipo'            => $tipo,
                'motivo'          => $motivo,
                'monto_total'     => $monto,
                'monto_gravable'  => $monto_gravable,
                'monto_impuesto'  => $monto_impuesto,
                'exento_iva'      => $exento ? 'S' : 'N',
                'receptor' => [
                    'numero'        => $fact->numero_crtf ?: 'CF',
                    'tipo'          => $fact->tipo_crtf,
                    'tipo_especial' => $fact->tipo_especial_crtf,
                    'nombre'        => $nombreReceptor,
                    'email'         => $correoReceptor,
                    'direccion'     => $direccionReceptor,
                ],
                'origen' => [
                    'uuid'          => $fact->uuid,
                    'serie'         => $fact->serie,
                    'numero'        => $fact->numero,
                    'fecha_emision' => Carbon::parse($fact->fecha_certificacion)->toDateString(),
                ],
                'timbre_prensa_base' => $totalDesdeXML
                    ? round($baseTimbreNota, 2) : 0.00,

                'timbre_prensa_porcentaje' => (
                    $totalDesdeXML &&
                    ($sumaTimbreNota ?? 0) > 0
                ) ? 0.5000 : 0.0000,

                'timbre_prensa_monto' => $totalDesdeXML
                    ? round($sumaTimbreNota, 2) : 0.00,

                'idfactura_origen' => $fact->idfactura,
            ],
        ];
    }
    // private function enviarXMLAFEL($idcotizacion, $xmlString, $tipo, $notaMeta = null)
    // {
    //     $identificador = Str::uuid()->toString();

    //     $headers = [
    //         'Content-Type'   => 'application/xml',
    //         'UsuarioApi'     => '109126599PRO',
    //         'LlaveApi'       => 'EC7E300DF9F5EDD673FE02342E9C4293',
    //         'UsuarioFirma'   => '109126599PRO',
    //         'LlaveFirma'     => 'fd5ff1bd52eeb988de3ddd63abcf9324',
    //         'Identificador'  => $identificador,
    //     ];

    //     $apiUrl = 'https://certificador.feel.com.gt/fel/procesounificado/transaccion/v2/xml';

    //     try {
    //         $response = Http::withHeaders($headers)->send('POST', $apiUrl, ['body' => $xmlString]);
    //         $json = $response->json() ?? [];

    //         //Log de la respuesta
    //         Log::info('Respuesta INFILE - ' . strtoupper($tipo), [
    //             'cotizacion_id' => $idcotizacion,
    //             'identificador' => $identificador,
    //             'response'      => $json,
    //         ]);

    //         // === Persistencia para Notas FEL ===
    //         if (in_array($tipo, ['NCRE', 'NDEB']) && is_array($notaMeta)) {
    //             $now  = now();
    //             $base = [
    //                 'idcotizacion'             => $idcotizacion,
    //                 'idcliente'                => $notaMeta['idcliente'] ?? null,
    //                 'tipo'                     => $tipo,
    //                 'motivo'                   => $notaMeta['motivo'] ?? '',
    //                 'monto_total'              => $notaMeta['monto_total'] ?? 0,
    //                 'monto_gravable'           => $notaMeta['monto_gravable'] ?? 0,
    //                 'monto_impuesto'           => $notaMeta['monto_impuesto'] ?? 0,
    //                 'exento_iva'               => $notaMeta['exento_iva'] ?? 'N',
    //                 'receptor_numero'          => $notaMeta['receptor']['numero'] ?? null,
    //                 'receptor_tipo'            => $notaMeta['receptor']['tipo'] ?? null,
    //                 'receptor_tipo_especial'   => $notaMeta['receptor']['tipo_especial'] ?? null,
    //                 'receptor_nombre'          => $notaMeta['receptor']['nombre'] ?? null,
    //                 'receptor_email'           => $notaMeta['receptor']['email'] ?? null,
    //                 'receptor_direccion'       => $notaMeta['receptor']['direccion'] ?? null,
    //                 // 👇 Datos del DOCUMENTO ORIGEN (factura)
    //                 'uuid_origen'              => $notaMeta['origen']['uuid'] ?? null,
    //                 'serie_origen'             => $notaMeta['origen']['serie'] ?? null,
    //                 'numero_origen'            => $notaMeta['origen']['numero'] ?? null,
    //                 'fecha_emision_origen'     => $notaMeta['origen']['fecha_emision'] ?? $now->toDateString(),

    //                 'identificador'            => $identificador,
    //                 'xml_enviado'              => $xmlString,
    //                 'created_by'               => optional(auth()->user())->id,
    //                 'created_at'               => $now,
    //                 'updated_at'               => $now,
    //             ];

    //             if (($json['resultado'] ?? false) === true) {
    //                 // ✅ Campos de la NOTA certificada
    //                 $save = array_merge($base, [
    //                     'resultado'        => 'S',
    //                     'uuid_nota'        => $json['uuid']  ?? null,
    //                     'serie_nota'       => $json['serie'] ?? null,
    //                     'numero_nota'      => $json['numero'] ?? null,
    //                     'fecha_nota'       => $json['fecha'] ?? null,
    //                     'descripcion'      => $json['descripcion'] ?? null,
    //                     'xml_certificado'  => isset($json['xml_certificado'])
    //                         ? base64_encode($json['xml_certificado'])
    //                         : null,
    //                     'alertas_infile'   => isset($json['descripcion_alertas_infile'])
    //                         ? json_encode($json['descripcion_alertas_infile'], JSON_UNESCAPED_UNICODE)
    //                         : null,
    //                     'alertas_sat'      => isset($json['descripcion_alertas_sat'])
    //                         ? json_encode($json['descripcion_alertas_sat'], JSON_UNESCAPED_UNICODE)
    //                         : null,
    //                     'errores'          => null,
    //                 ]);
    //             } else {
    //                 // ❌ Falla: conserva origen y deja los campos de nota en null
    //                 $save = array_merge($base, [
    //                     'resultado'        => 'N',
    //                     'uuid_nota'        => null,
    //                     'serie_nota'       => null,
    //                     'numero_nota'      => null,
    //                     'fecha_nota'       => null,
    //                     'descripcion'      => $json['descripcion'] ?? null,
    //                     'xml_certificado'  => null,
    //                     'alertas_infile'   => isset($json['descripcion_alertas_infile'])
    //                         ? json_encode($json['descripcion_alertas_infile'], JSON_UNESCAPED_UNICODE)
    //                         : null,
    //                     'alertas_sat'      => isset($json['descripcion_alertas_sat'])
    //                         ? json_encode($json['descripcion_alertas_sat'], JSON_UNESCAPED_UNICODE)
    //                         : null,
    //                     'errores'          => isset($json['descripcion_errores'])
    //                         ? json_encode($json['descripcion_errores'], JSON_UNESCAPED_UNICODE)
    //                         : json_encode(['Error desconocido'], JSON_UNESCAPED_UNICODE),
    //                 ]);
    //             }

    //             DB::table('adm_notas_fel')->insert($save);
    //         }

    //         // === Respuesta HTTP al frontend (igual que antes)
    //         if (($json['resultado'] ?? false) === true) {
    //             return response()->json([
    //                 'resultado'            => true,
    //                 'uuid'                 => $json['uuid'] ?? null,
    //                 'serie'                => $json['serie'] ?? null,
    //                 'numero'               => $json['numero'] ?? null,
    //                 'descripcion'          => $json['descripcion'] ?? null,
    //                 'fecha_certificacion'  => $json['fecha'] ?? null,
    //                 'xml_certificado'      => isset($json['xml_certificado']) ? base64_encode($json['xml_certificado']) : null,
    //                 'alertas'              => $json['descripcion_alertas_infile'] ?? null,
    //             ]);
    //         }

    //         return $this->respuestaErrorNota($tipo, $json, 422);
    //     } catch (\Exception $e) {
    //         Log::error('Error al certificar XML tipo ' . $tipo, [
    //             'cotizacion_id' => $idcotizacion,
    //             'exception'     => $e->getMessage(),
    //         ]);

    //         // Guarda intento fallido también
    //         if (in_array($tipo, ['NCRE', 'NDEB']) && is_array($notaMeta ?? null)) {
    //             DB::table('adm_notas_fel')->insert([
    //                 'idcotizacion'             => $idcotizacion,
    //                 'idcliente'                => $notaMeta['idcliente'] ?? null,
    //                 'tipo'                     => $tipo,
    //                 'motivo'                   => $notaMeta['motivo'] ?? '',
    //                 'monto_total'              => $notaMeta['monto_total'] ?? 0,
    //                 'monto_gravable'           => $notaMeta['monto_gravable'] ?? 0,
    //                 'monto_impuesto'           => $notaMeta['monto_impuesto'] ?? 0,
    //                 'exento_iva'               => $notaMeta['exento_iva'] ?? 'N',
    //                 'receptor_numero'          => $notaMeta['receptor']['numero'] ?? null,
    //                 'receptor_tipo'            => $notaMeta['receptor']['tipo'] ?? null,
    //                 'receptor_tipo_especial'   => $notaMeta['receptor']['tipo_especial'] ?? null,
    //                 'receptor_nombre'          => $notaMeta['receptor']['nombre'] ?? null,
    //                 'receptor_email'           => $notaMeta['receptor']['email'] ?? null,
    //                 'receptor_direccion'       => $notaMeta['receptor']['direccion'] ?? null,

    //                 // Origen intacto
    //                 'uuid_origen'              => $notaMeta['origen']['uuid'] ?? null,
    //                 'serie_origen'             => $notaMeta['origen']['serie'] ?? null,
    //                 'numero_origen'            => $notaMeta['origen']['numero'] ?? null,
    //                 'fecha_emision_origen'     => $notaMeta['origen']['fecha_emision'] ?? now()->toDateString(),

    //                 // Nota fallida (sin datos de nota)
    //                 'resultado'                => 'N',
    //                 'uuid_nota'                => null,
    //                 'serie_nota'               => null,
    //                 'numero_nota'              => null,
    //                 'fecha_nota'               => null,

    //                 'errores'                  => json_encode([$e->getMessage()], JSON_UNESCAPED_UNICODE),
    //                 'identificador'            => $identificador,
    //                 'xml_enviado'              => $xmlString,
    //                 'created_by'               => optional(auth()->user())->id,
    //                 'created_at'               => now(),
    //                 'updated_at'               => now(),
    //             ]);
    //         }

    //         return $this->respuestaErrorNota($tipo, [
    //             'descripcion'          => 'Excepción en servidor',
    //             'descripcion_errores'  => [$e->getMessage()],
    //         ], 500);
    //     }
    // }

    // private function enviarXMLAFEL($idcotizacion, $xmlString, $tipo, $notaMeta = null)
    // {
    //     // Fase de integración: ningún envío por el camino antiguo.
    //     // La bandera debe permanecer false hasta superar pruebas HTTP simuladas.
    //     if (!config('services.infile.envio_intentos_habilitado', false)) {
    //         return response()->json([
    //             'resultado' => false,
    //             'mensaje' => 'La certificación de notas FEL está temporalmente deshabilitada durante la integración segura.',
    //         ], 503);
    //     }

    //     $idcotizacion = (int) $idcotizacion;
    //     $tipo = strtoupper(trim((string) $tipo));

    //     if (
    //         !in_array($tipo, ['NCRE', 'NDEB'], true) ||
    //         !is_string($xmlString) || trim($xmlString) === '' ||
    //         !is_array($notaMeta)
    //     ) {
    //         return response()->json([
    //             'resultado' => false,
    //             'mensaje' => 'Documento o metadatos FEL inválidos.',
    //         ], 422);
    //     }

    //     // La modalidad de NCRE total desde XML solo tiene vista previa por ahora.
    //     // No transformar silenciosamente una NCRE parcial en total.
    //     $factura = AdmFacturacion::where('idcotizacion', $idcotizacion)
    //         ->where('resultado', 'S')
    //         ->where('estado', 1)
    //         ->latest('idfactura')
    //         ->first();

    //     if (
    //         !$factura || empty($factura->uuid) ||
    //         strcasecmp((string) ($notaMeta['origen']['uuid'] ?? ''), (string) $factura->uuid) !== 0 ||
    //         (int) ($notaMeta['idfactura_origen'] ?? 0) !== (int) $factura->idfactura
    //     ) {
    //         return response()->json([
    //             'resultado' => false,
    //             'mensaje' => 'La nota no corresponde a una factura vigente certificada.',
    //         ], 422);
    //     }

    //     // Defensa adicional: inspeccionar también el importe de la factura de origen.
    //     if (
    //         round((float) ($factura->timbre_prensa_monto ?? 0), 2) > 0 ||
    //         round((float) ($notaMeta['timbre_prensa_monto'] ?? 0), 2) > 0
    //     ) {
    //         return response()->json([
    //             'resultado' => false,
    //             'mensaje' => 'Notas relacionadas con Timbre de Prensa pendientes de validación tributaria.',
    //         ], 422);
    //     }

    //     $conciliacion = $this->conciliarXMLConMetadatosNota($xmlString, $notaMeta);
    //     if (!$conciliacion['valido']) {
    //         return response()->json([
    //             'resultado' => false,
    //             'mensaje' => 'El XML de la nota no coincide con sus metadatos.',
    //             'errores' => $conciliacion['errores'],
    //         ], 422);
    //     }

    //     // Aun con el interruptor habilitado, impedir emitir notas sin las
    //     // verificaciones de saldo y tratamiento fiscal específicas por modalidad.
    //     // Este bloqueo se levantará cuando pasen las pruebas integrales de ambas.
    //     return response()->json([
    //         'resultado' => false,
    //         'mensaje' => 'Preparación validada. El envío final de NCRED/NDEB permanece bloqueado hasta completar los controles de saldo, fiscalidad y pruebas HTTP simuladas.',
    //     ], 503);
    // }

    /**
     * ETAPA 53 - Puente temporal entre generación de NCRE/NDEB e intentos persistidos.
     * IMPORTANTE: SOLO PREPARA EN LOCAL. NO TRANSMITE DOCUMENTOS.
     * No sustituye el futuro endpoint administrativo de emisión por idintento.
     */
    private function enviarXMLAFEL($idcotizacion, $xmlString, $tipo, $notaMeta = null)
    {
        $tipo = strtoupper(trim((string) $tipo));
        $idcotizacion = (int) $idcotizacion;


        if (
            !in_array($tipo, ['NCRE', 'NDEB'], true) ||
            !is_string($xmlString) || trim($xmlString) === '' ||
            !is_array($notaMeta)
        ) {
            return response()->json([
                'resultado' => false,
                'mensaje' => 'Documento o metadatos inválidos.',
            ], 422);
        }

        // No permitir Timbre de Prensa hasta contar con confirmación fiscal.
        if ((float) ($notaMeta['timbre_prensa_monto'] ?? 0) > 0) {
            return response()->json([
                'resultado' => false,
                'mensaje' => 'Notas con Timbre de Prensa aún no habilitadas.',
            ], 422);
        }

        $factura = AdmFacturacion::where('idcotizacion', $idcotizacion)
            ->where('resultado', 'S')
            ->where('estado', 1)
            ->latest('idfactura')
            ->first();

        if (
            !$factura || empty($factura->uuid) ||
            strcasecmp((string) ($notaMeta['origen']['uuid'] ?? ''), (string) $factura->uuid) !== 0 ||
            (int) ($notaMeta['idfactura_origen'] ?? 0) !== (int) $factura->idfactura ||
            (float) ($factura->timbre_prensa_monto ?? 0) > 0
        ) {
            return response()->json([
                'resultado' => false,
                'mensaje' => 'Factura origen no vigente o datos fiscales incompatibles.',
            ], 422);
        }

        $conciliacion = $this->conciliarXMLConMetadatosNota($xmlString, $notaMeta);
        if (empty($conciliacion['valido'])) {
            return response()->json([
                'resultado' => false,
                'mensaje' => 'XML y metadatos no concilian.',
            ], 422);
        }

        // Preparación serializada: detecta intentos activos y revalida saldo NCRE.
        $intento = $this->prepararIntentoNotaFEL(
            $idcotizacion,
            $tipo,
            (string) $factura->uuid,
            $xmlString,
            $notaMeta
        );

        return response()->json([
            'resultado' => (bool) ($intento['valido'] ?? false),
            'modo' => 'PREPARADO_SIN_CERTIFICAR',
            'mensaje' => ($intento['valido'] ?? false)
                ? 'Nota preparada. No se ha enviado a INFILE ni emitido documento fiscal.'
                : ($intento['mensaje'] ?? 'No fue posible preparar el intento.'),
            'intento' => $intento,
        ], ($intento['valido'] ?? false) ? 202 : 409);
    }



    private function respuestaErrorNota(string $tipo, array $json = null, int $status = 422)
    {
        // Mensaje genérico para el usuario
        $payload = [
            'resultado' => false,
            'mensaje'   => 'No se pudo certificar la NC o ND.',
        ];

        return response()->json($payload, $status);
    }

    /**
     * Obtiene el siguiente correlativo para la 'tabla' indicada.
     * - Para 'nofactura': filtra por $anio (reinicio anual).
     * - Para 'nocotizacion': ignora el año (global).
     *
     * Concurrency-safe: usa transacción + lockForUpdate().
     */
    private function siguienteCorrelativoFactura(int $anio): int
    {
        return DB::transaction(function () use ($anio) {
            $row = Correlativo::where('tabla', 'nofactura')
                ->where('anio', $anio)
                ->lockForUpdate()
                ->first();

            if (!$row) {
                $row = Correlativo::create([
                    'tabla'       => 'nofactura',
                    'correlativo' => 0,
                    'incremento'  => 1,
                    'anio'        => $anio,
                ]);
            }

            $row->correlativo = (int) $row->correlativo + 1;
            $row->save();

            return (int) $row->correlativo;
        });
    }

    private function pad(int $valor, int $width = 6): string
    {
        return str_pad((string) $valor, $width, '0', STR_PAD_LEFT);
    }

    public function listarNotasFel(Request $request, int $idcotizacion)
    {
        $tipo = $request->query('tipo'); // NCRE | NDEB (opcional)

        $rows = DB::table('adm_notas_fel as nf')
            ->selectRaw("
            nf.idnota,
            nf.idcotizacion,
            nf.tipo,
            nf.motivo,
            nf.monto_total  as monto,
            nf.monto_gravable,
            nf.monto_impuesto,
            nf.exento_iva,

            -- receptor (foto de la certificación de la nota)
            nf.receptor_nombre    as cliente,
            nf.receptor_numero    as receptor_numero,
            nf.receptor_direccion as direccion,

            -- ⚠️ AHORA tomamos los campos de la NOTA (no los de origen)
            nf.uuid_nota,
            nf.serie_nota,
            nf.numero_nota,
            DATE(COALESCE(nf.fecha_nota, nf.created_at)) as fecha_nota,

            -- Referencia a la factura de origen (usamos lo que guardamos en la nota)
            nf.uuid_origen        as uuid_factura,
            nf.serie_origen       as serie_factura,
            nf.numero_origen      as numero_factura,
            DATE(nf.fecha_emision_origen) as fecha_factura
        ")
            ->where('nf.idcotizacion', $idcotizacion)
            ->when($tipo, fn($q) => $q->where('nf.tipo', $tipo))
            ->orderByDesc('nf.created_at')
            ->get();

        return response()->json($rows);
    }


    public function generarPdfNotaFel(int $idnota)
    {
        $nota = DB::table('adm_notas_fel as nf')
            ->selectRaw("
            nf.idnota,
            nf.idcotizacion,
            nf.tipo,
            nf.motivo,
            nf.monto_total  as monto,
            nf.monto_gravable,
            nf.monto_impuesto,
            nf.exento_iva,

            -- receptor
            nf.receptor_nombre    as cliente,
            nf.receptor_numero    as receptor_numero,
            nf.receptor_direccion as direccion,

            -- ⚠️ datos de la NOTA certificada
            nf.uuid_nota,
            nf.serie_nota,
            nf.numero_nota,
            DATE(COALESCE(nf.fecha_nota, nf.created_at)) as fecha_nota,

            -- referencia a FACTURA origen (desde lo que persistimos en nf.*_origen)
            nf.serie_origen       as serie_factura,
            nf.numero_origen      as numero_factura,
            nf.uuid_origen        as uuid_factura,
            DATE(nf.fecha_emision_origen) as fecha_factura
        ")
            ->where('nf.idnota', $idnota)
            ->first();

        if (!$nota) {
            return response()->json(['message' => 'Nota no encontrada'], 404);
        }

        // Datos de tu empresa
        $empresa = [
            'nombre'     => 'GP EXCELENCIA, S.A.',
            'nit'        => '109126599',
            'direccion'  => '11 calle 41-20 Aldea El Naranjito, Zona 6 de Mixco, Guatemala',
            'telefonos'  => '2309-9419 / 2294-9257',
            'email'      => 'ventas@gpexcelencia.com',
            'web'        => 'www.gpexcelencia.com',
        ];

        $html = view('pdf.nota_fel', [
            'nota'      => $nota,
            'empresa'   => $empresa,
            'esCredito' => $nota->tipo === 'NCRE',
        ])->render();

        $pdf = Pdf::loadHTML($html)->setPaper('letter', 'portrait');

        $fn = sprintf('%s_%s-%s.pdf', $nota->tipo, $nota->serie_nota ?? 'SN', $nota->numero_nota ?? '0');
        return $pdf->stream($fn);
    }


    public function generarPdfUltimaNotaPorTipo(Request $request, int $idcotizacion)
    {
        $tipo = $request->query('tipo', 'NCRE'); // NCRE | NDEB
        $idnota = DB::table('adm_notas_fel')
            ->where('idcotizacion', $idcotizacion)
            ->where('tipo', $tipo)
            ->orderByDesc('created_at')
            ->value('idnota');

        if (!$idnota) {
            return response()->json(['message' => 'No hay notas de ese tipo para esta factura'], 404);
        }
        return $this->generarPdfNotaFel((int)$idnota);
    }

    public function storeComentario(Request $request)
    {
        try {
            DB::beginTransaction();

            $request->validate([
                'idcotizacion' => 'required|integer|exists:adm_cotizacion,idcotizacion',
                'comentario'   => 'required|string|max:1000',
            ]);

            // correlativo seguro
            $correlativo = DB::table('cor_correlativo')
                ->where('tabla', 'adm_comentarios_prefacturacion')
                ->lockForUpdate()->first();

            if (!$correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para comentarios'], 400);
            }

            $idComentario = $correlativo->correlativo + $correlativo->incremento;

            DB::table('cor_correlativo')
                ->where('tabla', 'adm_comentarios_prefacturacion')
                ->update(['correlativo' => $idComentario]);

            $comentario = new ComentarioPreFacturacion();
            $comentario->idcomentarioprefacturacion = $idComentario;
            $comentario->idcotizacion     = $request->idcotizacion;
            $comentario->comentario       = $request->comentario;
            $comentario->fecha_registro   = now();
            $comentario->idusuario        = auth()->id();
            $comentario->estado           = 1;
            $comentario->save();

            DB::commit();

            return response()->json([
                'message'   => 'Comentario registrado exitosamente',
                'comentario' => $comentario,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al guardar comentario: ' . $e->getMessage()
            ], 500);
        }
    }

    public function comentarios(Request $request, $idcotizacion)
    {
        $query = ComentarioPreFacturacion::query()
            ->select('adm_comentarios_prefacturacion.*', 'adm_empleados.nombre as nombre_usuario')
            ->leftJoin('adm_empleados', 'adm_empleados.iduser', '=', 'adm_comentarios_prefacturacion.idusuario')
            ->where('adm_comentarios_prefacturacion.idcotizacion', $idcotizacion)
            ->orderByDesc('adm_comentarios_prefacturacion.fecha_registro');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('adm_comentarios_prefacturacion.comentario', 'LIKE', "%{$search}%");
        }

        $comentarios = $query->paginate(5);
        return response()->json($comentarios);
    }

    public function anularCotizacion(Request $request, $idcotizacion)
    {
        try {
            $cotizacion = DB::table('adm_cotizacion')->where('idcotizacion', $idcotizacion)->first();

            if (!$cotizacion) {
                return response()->json(['message' => 'Cotización no encontrada'], 404);
            }

            // Solo permitir anular estados 4 (Pre-facturación) o 5 (Para facturar)
            if (!in_array($cotizacion->estado, [4, 5])) {
                return response()->json(['message' => 'Solo se pueden anular cotizaciones en estado 4 o 5'], 400);
            }

            $motivo = trim($request->input('motivo'));
            if (empty($motivo)) {
                return response()->json(['message' => 'Debe ingresar un motivo de anulación'], 422);
            }

            $usuario = auth()->user()->name ?? 'sistema';

            DB::table('adm_cotizacion')
                ->where('idcotizacion', $idcotizacion)
                ->update([
                    'estado' => 0,
                    'motivo_anulacion' => $motivo,
                    'usuario_anulacion' => $usuario,
                    'fecha_anulacion' => now(),
                ]);

            return response()->json(['message' => 'Cotización anulada correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al anular cotización', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error al anular cotización'], 500);
        }
    }

    public function reporteAnuladas(Request $request)
    {
        $fechaInicio = $request->query('fechaInicio');
        $fechaFinal  = $request->query('fechaFinal');
        $format      = $request->query('format', 'json');

        $end   = $fechaFinal  ? Carbon::parse($fechaFinal)  : Carbon::today();
        $start = $fechaInicio ? Carbon::parse($fechaInicio) : $end->copy();

        $desde = $start->copy()->startOfDay()->toDateTimeString();
        $hasta = $end->copy()->addDay()->startOfDay()->toDateTimeString();

        // 🔹 Datos base
        $registros = DB::table('adm_facturacion as f')
            ->join('adm_cotizacion as c', 'c.idcotizacion', '=', 'f.idcotizacion')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->leftJoin('users as u', 'f.idusuario_anula', '=', 'u.id')
            ->leftJoin('adm_empleados as e', 'u.id', '=', 'e.iduser')
            ->select([
                DB::raw("CONCAT('CT', CAST(c.nocotizacion AS CHAR)) AS nocotizacion"),
                'cl.nombre AS cliente',
                DB::raw('f.nofactura AS nointerno'),
                'f.numero',
                'f.uuid',
                DB::raw("DATE_FORMAT(f.fecha_certificacion, '%Y-%m-%d %H:%i:%s') AS fecha_certificacion"),
                DB::raw("DATE_FORMAT(f.fecha_anulacion, '%Y-%m-%d %H:%i:%s') AS fecha_anulacion"),
                DB::raw("COALESCE(e.nombre, '—') AS usuario_anulacion"),
            ])
            ->where('f.estado', 0)
            ->whereBetween('f.fecha_anulacion', [$desde, $hasta])
            ->orderByDesc('f.fecha_anulacion')
            ->get();


        // 🔹 Totales por usuario
        $porUsuario = $registros->groupBy('usuario_anulacion')->map(function ($items, $usuario) {
            return [
                'usuario' => $usuario,
                'total' => $items->count(),
            ];
        })->values();

        $totalGeneral = $registros->count();

        // 🔹 Formato PDF
        if ($format === 'pdf') {
            $pdf = Pdf::loadView('pdf.reporte_anuladas', [
                'registros'     => $registros,
                'porUsuario'    => $porUsuario,
                'totalGeneral'  => $totalGeneral,
                'fechaInicio'   => $start->format('Y-m-d'),
                'fechaFinal'    => $end->format('Y-m-d'),
            ])->setPaper('letter', 'landscape');

            return $pdf->download("reporte_facturas_anuladas_{$start->format('Ymd')}_{$end->format('Ymd')}.pdf");
        }

        // 🔹 Formato JSON
        return response()->json([
            'registros'     => $registros,
            'porUsuario'    => $porUsuario,
            'totalGeneral'  => $totalGeneral,
        ]);
    }

    public function reporteNotasAjuste(Request $request)
    {
        $fechaInicio = $request->query('fechaInicio');
        $fechaFinal  = $request->query('fechaFinal');
        $tipo        = $request->query('tipo'); // NCRE | NDEB | TODOS
        $format      = $request->query('format', 'json');

        $end   = $fechaFinal  ? Carbon::parse($fechaFinal)  : Carbon::today();
        $start = $fechaInicio ? Carbon::parse($fechaInicio) : $end->copy();

        $desde = $start->copy()->startOfDay()->toDateTimeString();
        $hasta = $end->copy()->addDay()->startOfDay()->toDateTimeString();

        // 🔹 Datos base
        $query = DB::table('adm_notas_fel as n')
            ->join('adm_cotizacion as c', 'n.idcotizacion', '=', 'c.idcotizacion')
            ->join('adm_facturacion as f', 'c.idcotizacion', '=', 'f.idcotizacion')
            ->join('clientes as cl', 'n.idcliente', '=', 'cl.idcliente')
            ->select([
                DB::raw("CONCAT('CT', CAST(c.nocotizacion AS CHAR)) AS nocotizacion"),
                'cl.nombre AS cliente',
                DB::raw('f.nofactura AS nointerno'),
                'f.numero AS numero_factura',
                DB::raw("DATE_FORMAT(f.fecha_certificacion, '%Y-%m-%d %H:%i:%s') AS fecha_certificacion"),
                'n.tipo AS tipo_nota',
                'n.numero_nota',
                DB::raw("DATE_FORMAT(n.fecha_nota, '%Y-%m-%d %H:%i:%s') AS fecha_nota"),
                DB::raw('CAST(n.monto_total AS DECIMAL(15,2)) AS monto_total'),
            ])
            ->where('n.resultado', 'S')
            ->whereBetween('n.fecha_nota', [$desde, $hasta]);

        if (!empty($tipo) && $tipo !== 'TODOS') {
            $query->where('n.tipo', $tipo); // filtra por NCRE o NDEB
        }

        $registros = $query->orderByDesc('n.fecha_nota')->get();

        // 🔹 Totales por tipo
        $porTipo = $registros->groupBy('tipo_nota')->map(function ($items, $tipo) {
            return [
                'tipo' => $tipo,
                'total' => $items->count(),
                'monto' => $items->sum('monto_total'),
            ];
        })->values();

        $totalGeneral = $registros->count();
        $sumaGeneral  = $registros->sum('monto_total');

        // 🔹 Formato PDF
        if ($format === 'pdf') {
            $pdf = Pdf::loadView('pdf.reporte_notasajuste', [
                'registros'     => $registros,
                'porTipo'       => $porTipo,
                'totalGeneral'  => $totalGeneral,
                'sumaGeneral'   => $sumaGeneral,
                'fechaInicio'   => $start->format('Y-m-d'),
                'fechaFinal'    => $end->format('Y-m-d'),
                'tipo'          => $tipo ?? 'TODOS',
            ])->setPaper('letter', 'landscape');

            return $pdf->download("reporte_notas_ajuste_{$start->format('Ymd')}_{$end->format('Ymd')}.pdf");
        }

        // 🔹 Formato JSON
        return response()->json([
            'registros'     => $registros,
            'porTipo'       => $porTipo,
            'totalGeneral'  => $totalGeneral,
            'sumaGeneral'   => $sumaGeneral,
        ]);
    }


    private function validarMontosXmlFEL(string $xmlString): array
    {
        $errores = [];

        $doc = new \DOMDocument();

        if (!@$doc->loadXML($xmlString, LIBXML_NONET)) {
            return [
                'valido' => false,
                'errores' => ['El XML no tiene una estructura válida.'],
            ];
        }

        $xpath = new \DOMXPath($doc);
        $xpath->registerNamespace(
            'dte',
            'http://www.sat.gob.gt/dte/fel/0.2.0'
        );
        $xpath->registerNamespace(
            'cfc',
            'http://www.sat.gob.gt/dte/fel/CompCambiaria/0.1.0'
        );

        $centavos = static fn($valor) =>
        (int) round(((float) $valor) * 100);

        $valorNodo = static function ($ruta, $contexto = null)
        use ($xpath) {
            $nodos = $xpath->query($ruta, $contexto);
            return $nodos->length
                ? trim($nodos->item(0)->textContent)
                : null;
        };

        $sumaItems = 0;
        $impuestosCalculados = [];

        $items = $xpath->query('//dte:Items/dte:Item');

        if ($items->length === 0) {
            $errores[] = 'El XML no contiene ítems.';
        }

        foreach ($items as $item) {
            $numero = $item->getAttribute('NumeroLinea');

            $precio = $centavos(
                $valorNodo('./dte:Precio', $item)
            );

            $descuento = $centavos(
                $valorNodo('./dte:Descuento', $item)
            );

            $total = $centavos(
                $valorNodo('./dte:Total', $item)
            );

            $sumaImpuestosItem = 0;

            $impuestos = $xpath->query(
                './dte:Impuestos/dte:Impuesto',
                $item
            );

            foreach ($impuestos as $impuesto) {
                $nombre = $valorNodo(
                    './dte:NombreCorto',
                    $impuesto
                );

                $monto = $centavos(
                    $valorNodo('./dte:MontoImpuesto', $impuesto)
                );

                $base = $centavos(
                    $valorNodo('./dte:MontoGravable', $impuesto)
                );

                $sumaImpuestosItem += $monto;

                $impuestosCalculados[$nombre] =
                    ($impuestosCalculados[$nombre] ?? 0) + $monto;

                if ($nombre === 'TIMBRE DE PRENSA') {
                    $codigo = $valorNodo(
                        './dte:CodigoUnidadGravable',
                        $impuesto
                    );

                    if ($codigo !== '1') {
                        $errores[] =
                            "Ítem {$numero}: código de timbre incorrecto.";
                    }

                    // La base del timbre es el importe sin IVA.
                    $baseEsperada = (int) round(
                        ($precio - $descuento) / 1.12
                    );

                    if (abs($base - $baseEsperada) > 1) {
                        $errores[] =
                            "Ítem {$numero}: base del timbre incorrecta.";
                    }

                    $timbreEsperado = (int) ceil(
                        $base * 0.005 - 0.000000001
                    );

                    if ($monto !== $timbreEsperado) {
                        $errores[] =
                            "Ítem {$numero}: timbre incorrecto.";
                    }
                }
            }

            $timbreItem = 0;

            foreach ($impuestos as $impuesto) {
                if (
                    $valorNodo('./dte:NombreCorto', $impuesto)
                    === 'TIMBRE DE PRENSA'
                ) {
                    $timbreItem += $centavos(
                        $valorNodo('./dte:MontoImpuesto', $impuesto)
                    );
                }
            }

            $totalEsperado = $precio - $descuento + $timbreItem;

            if ($total !== $totalEsperado) {
                $errores[] =
                    "Ítem {$numero}: el total no coincide con precio, descuento y timbre.";
            }

            $sumaItems += $total;
        }

        $granTotal = $centavos(
            $valorNodo('//dte:Totales/dte:GranTotal')
        );

        if ($granTotal !== $sumaItems) {
            $errores[] =
                'GranTotal no coincide con la suma de los ítems.';
        }

        $totalesImpuestos = $xpath->query(
            '//dte:Totales/dte:TotalImpuestos/dte:TotalImpuesto'
        );

        foreach ($totalesImpuestos as $impuesto) {
            $nombre = $impuesto->getAttribute('NombreCorto');

            $monto = $centavos(
                $impuesto->getAttribute('TotalMontoImpuesto')
            );

            if (
                $monto !==
                ($impuestosCalculados[$nombre] ?? 0)
            ) {
                $errores[] =
                    "El total declarado del impuesto {$nombre} no coincide.";
            }
        }

        foreach ($impuestosCalculados as $nombre => $monto) {
            $nodoEncontrado = false;

            foreach ($totalesImpuestos as $impuesto) {
                if ($impuesto->getAttribute('NombreCorto') === $nombre) {
                    $nodoEncontrado = true;
                    break;
                }
            }

            if (!$nodoEncontrado) {
                $errores[] =
                    "Falta el total del impuesto {$nombre}.";
            }
        }

        // Complemento FCAM: el vencimiento no puede anteceder a la emisión.
        $fechaXml = trim((string) $xpath->evaluate(
            'string(//dte:DatosEmision/dte:DatosGenerales/@FechaHoraEmision)'
        ));
        $fechaVencimientoXml = $valorNodo('//cfc:FechaVencimiento');
        try {
            if (!$fechaXml || !$fechaVencimientoXml) {
                $errores[] = 'Falta fecha de emisión o vencimiento FCAM.';
            } elseif (Carbon::parse($fechaVencimientoXml)->startOfDay()
                ->lt(Carbon::parse($fechaXml)->startOfDay())
            ) {
                $errores[] = 'El vencimiento de FCAM es anterior a la emisión.';
            }
        } catch (\Throwable $e) {
            $errores[] = 'Fecha de emisión o vencimiento FCAM inválida.';
        }

        $montoAbono = $centavos(
            $valorNodo('//cfc:MontoAbono')
        );

        if ($granTotal !== $montoAbono) {
            $errores[] =
                'MontoAbono no coincide con GranTotal.';
        }

        return [
            'valido' => count($errores) === 0,
            'errores' => $errores,
            'resumen' => [
                'cantidad_items' => $items->length,
                'total_items' => $sumaItems / 100,
                'gran_total' => $granTotal / 100,
                'monto_abono' => $montoAbono / 100,
                'impuestos' => array_map(
                    fn($valor) => $valor / 100,
                    $impuestosCalculados
                ),
            ],
        ];
    }


    private function validarFacturaOrigenNotaConTimbre(
        int $idcotizacion
    ): ?\Illuminate\Http\JsonResponse {

        $factura = $this->facturaVigente($idcotizacion);

        if (!$factura) {
            return response()->json([
                'resultado' => false,
                'message' => 'No existe una factura FEL vigente para esta cotización.',
            ], 422);
        }

        $timbre = (float) ($factura->timbre_prensa_monto ?? 0);

        if ($timbre > 0) {
            return response()->json([
                'resultado' => false,
                'message' =>
                'Las notas de crédito y débito de facturas ' .
                    'con Timbre de Prensa están pendientes de ' .
                    'la nueva validación de ajustes fiscales.',
            ], 422);
        }

        return null;
    }


    private function obtenerResumenFiscalFacturaNota(
        int $idcotizacion
    ): array {
        $factura = $this->facturaVigente($idcotizacion);

        if (!$factura) {
            return [
                'valido' => false,
                'mensaje' => 'No existe una factura FEL vigente.',
            ];
        }

        // Para facturas nuevas, utilizaremos la fotografía
        // fiscal almacenada al momento de certificar.
        if ($factura->total_factura === null) {
            return [
                'valido' => false,
                'mensaje' =>
                'La factura no tiene desglose fiscal histórico. ' .
                    'Requiere revisión del documento certificado.',
            ];
        }

        $total = round((float) $factura->total_factura, 2);
        $timbre = round(
            (float) ($factura->timbre_prensa_monto ?? 0),
            2
        );

        $iva = round(
            (float) ($factura->iva_factura ?? 0),
            2
        );

        $base = round($total - $iva - $timbre, 2);

        if ($base < 0 || $timbre < 0 || $iva < 0) {
            return [
                'valido' => false,
                'mensaje' => 'La factura tiene importes fiscales inconsistentes.',
            ];
        }

        return [
            'valido' => true,
            'idfactura' => $factura->idfactura,
            'uuid' => $factura->uuid,
            'total' => $total,
            'base_sin_impuestos' => $base,
            'iva' => $iva,
            'timbre_prensa_base' => round(
                (float) ($factura->timbre_prensa_base ?? 0),
                2
            ),
            'timbre_prensa_monto' => $timbre,
            'porcentaje_timbre' => (float) (
                $factura->timbre_prensa_porcentaje ?? 0
            ),
        ];
    }


    private function calcularNotaCreditoTotalConTimbre(
        int $idcotizacion
    ): array {
        $detalles = DB::table('adm_detalle_cotizacion')
            ->where('idcotizacion', $idcotizacion)
            ->where('estado', 1)
            ->orderBy('iddetallecotizacion')
            ->get([
                'iddetallecotizacion',
                'descripcion',
                'cantidad',
                'precio_unitario',
                'precio',
                'descuento',
                'subtotal',
                'impuesto_iva',
                'total',
                'aplica_timbre_prensa',
            ]);

        if ($detalles->isEmpty()) {
            return [
                'valido' => false,
                'mensaje' => 'No hay detalles activos.',
            ];
        }

        $lineas = [];
        $sumaBase = 0;
        $sumaIVA = 0;
        $sumaTimbre = 0;
        $sumaTotal = 0;

        foreach ($detalles as $detalle) {
            $base = round((float) $detalle->subtotal, 2);
            $iva = round((float) $detalle->impuesto_iva, 2);
            $totalProducto = round((float) $detalle->total, 2);

            $aplicaTimbre =
                $detalle->aplica_timbre_prensa === 'S';

            $timbre = $aplicaTimbre
                ? ceil(($base * 0.005 * 100) - 0.000000001) / 100
                : 0.00;

            $timbre = round($timbre, 2);
            $totalLinea = round($totalProducto + $timbre, 2);

            $lineas[] = [
                'iddetallecotizacion' =>
                $detalle->iddetallecotizacion,
                'descripcion' => $detalle->descripcion,
                'cantidad' => (float) $detalle->cantidad,
                'precio_unitario' =>
                (float) $detalle->precio_unitario,
                'precio' => round((float) $detalle->precio, 2),
                'descuento' =>
                round((float) $detalle->descuento, 2),
                'base_iva' => $base,
                'iva' => $iva,
                'aplica_timbre_prensa' =>
                $aplicaTimbre ? 'S' : 'N',
                'base_timbre_prensa' =>
                $aplicaTimbre ? $base : 0.00,
                'timbre_prensa' => $timbre,
                'total' => $totalLinea,
            ];

            $sumaBase += $base;
            $sumaIVA += $iva;
            $sumaTimbre += $timbre;
            $sumaTotal += $totalLinea;
        }

        return [
            'valido' => true,
            'lineas' => $lineas,
            'totales' => [
                'base_iva' => round($sumaBase, 2),
                'iva' => round($sumaIVA, 2),
                'timbre_prensa' => round($sumaTimbre, 2),
                'total' => round($sumaTotal, 2),
            ],
        ];
    }


    private function leerXMLFacturaCertificada(AdmFacturacion $factura): array
    {
        $contenido = $factura->xml_certificado;

        if (empty($contenido)) {
            return [
                'valido' => false,
                'mensaje' => 'La factura no tiene XML certificado almacenado.',
            ];
        }

        // INFILE puede devolver el XML codificado en base64.
        $decodificado = base64_decode($contenido, true);

        if (
            $decodificado !== false &&
            str_contains($decodificado, '<')
        ) {
            $contenido = $decodificado;
        }

        $doc = new \DOMDocument();

        $cargado = $doc->loadXML(
            $contenido,
            LIBXML_NONET
        );

        if (!$cargado) {
            return [
                'valido' => false,
                'mensaje' => 'No fue posible interpretar el XML certificado.',
            ];
        }

        $xpath = new \DOMXPath($doc);
        $xpath->registerNamespace(
            'dte',
            'http://www.sat.gob.gt/dte/fel/0.2.0'
        );


        $receptorNodo = $xpath->query(
            '//dte:DatosEmision/dte:Receptor'
        )->item(0);

        $receptor = null;

        if ($receptorNodo) {
            $obtenerReceptor = static function ($campo) use (
                $xpath,
                $receptorNodo
            ) {
                return trim((string) $xpath->evaluate(
                    'string(./dte:DireccionReceptor/dte:' . $campo . ')',
                    $receptorNodo
                ));
            };

            $receptor = [
                'numero' => $receptorNodo->getAttribute('IDReceptor'),
                'nombre' => $receptorNodo->getAttribute('NombreReceptor'),
                'email' => $receptorNodo->getAttribute('CorreoReceptor'),
                'tipo_especial' => $receptorNodo->getAttribute('TipoEspecial'),
                'direccion' => $obtenerReceptor('Direccion'),
                'codigo_postal' => $obtenerReceptor('CodigoPostal'),
                'municipio' => $obtenerReceptor('Municipio'),
                'departamento' => $obtenerReceptor('Departamento'),
                'pais' => $obtenerReceptor('Pais'),
            ];
        }


        $items = [];

        foreach (
            $xpath->query('//dte:DatosEmision/dte:Items/dte:Item')
            as $item
        ) {
            $obtener = static function ($ruta) use ($xpath, $item) {
                $nodos = $xpath->query($ruta, $item);

                return $nodos->length
                    ? trim($nodos->item(0)->textContent)
                    : null;
            };

            $impuestos = [];

            foreach (
                $xpath->query('./dte:Impuestos/dte:Impuesto', $item)
                as $impuesto
            ) {
                $nombre = $xpath->evaluate(
                    'string(./dte:NombreCorto)',
                    $impuesto
                );


                $impuestos[] = [
                    'nombre' => trim($nombre),

                    'codigo_unidad_gravable' => trim(
                        $xpath->evaluate(
                            'string(./dte:CodigoUnidadGravable)',
                            $impuesto
                        )
                    ),

                    'base' => round((float) $xpath->evaluate(
                        'string(./dte:MontoGravable)',
                        $impuesto
                    ), 2),

                    'monto' => round((float) $xpath->evaluate(
                        'string(./dte:MontoImpuesto)',
                        $impuesto
                    ), 2),
                ];
            }

            $items[] = [
                'numero_linea' => $item->getAttribute('NumeroLinea'),
                'cantidad' => (float) $obtener('./dte:Cantidad'),
                'unidad_medida' => $obtener('./dte:UnidadMedida'),
                'descripcion' => $obtener('./dte:Descripcion'),
                'precio_unitario' => (float) $obtener('./dte:PrecioUnitario'),
                'precio' => (float) $obtener('./dte:Precio'),
                'descuento' => (float) $obtener('./dte:Descuento'),
                'total' => (float) $obtener('./dte:Total'),
                'impuestos' => $impuestos,
                'bien_o_servicio' => $item->getAttribute('BienOServicio'),
            ];
        }

        $granTotal = (float) $xpath->evaluate(
            'string(//dte:DatosEmision/dte:Totales/dte:GranTotal)'
        );


        // UUID del documento certificado.
        // Se obtiene del nodo DatosGenerales de certificación,
        // no del registro de MySQL.

        $uuidCertificado = trim((string) $xpath->evaluate(
            'string(//dte:Certificacion/dte:NumeroAutorizacion)'
        ));

        // Verificamos también la existencia de ese nodo.
        $existeAutorizacion = $xpath->query(
            '//dte:Certificacion/dte:NumeroAutorizacion'
        )->length > 0;

        $uuidCoincide = $existeAutorizacion &&
            strcasecmp(
                $uuidCertificado,
                (string) $factura->uuid
            ) === 0;



        return [
            'valido' => !empty($items)
                && $uuidCoincide
                && $granTotal > 0,

            'mensaje' => !$uuidCoincide
                ? 'El UUID del XML no coincide con la factura almacenada.'
                : null,

            'uuid' => $uuidCertificado,
            'uuid_coincide' => $uuidCoincide,
            'gran_total' => round($granTotal, 2),
            'items' => $items,
            'receptor' => $receptor,
        ];
    }


    private function calcularNCRETotalDesdeXML(
        AdmFacturacion $factura
    ): array {
        $lectura = $this->leerXMLFacturaCertificada($factura);

        if (!$lectura['valido']) {
            return [
                'valido' => false,
                'mensaje' => $lectura['mensaje']
                    ?? 'No se pudo validar el XML certificado.',
            ];
        }

        $centavos = static fn($valor) =>
        (int) round((float) $valor * 100);

        $lineas = [];
        $sumaTotal = 0;
        $sumaIVA = 0;
        $sumaTimbre = 0;
        $sumaBaseTimbre = 0;

        foreach ($lectura['items'] as $item) {
            $iva = 0;
            $timbre = 0;
            $baseTimbre = 0;
            $impuestos = [];

            foreach ($item['impuestos'] as $impuesto) {
                $nombre = strtoupper(trim($impuesto['nombre']));
                $monto = $centavos($impuesto['monto']);
                $base = $centavos($impuesto['base']);

                if ($nombre === 'IVA') {
                    $iva += $monto;
                }

                if ($nombre === 'TIMBRE DE PRENSA') {
                    $timbre += $monto;
                    $baseTimbre += $base;
                }

                $impuestos[] = [
                    'nombre' => $nombre,
                    'codigo_unidad_gravable' =>
                    $impuesto['codigo_unidad_gravable'],
                    'base' => $base / 100,
                    'monto' => $monto / 100,
                ];
            }

            $total = $centavos($item['total']);

            if ($total <= 0) {
                return [
                    'valido' => false,
                    'mensaje' =>
                    'Se encontró un renglón con total no válido.',
                ];
            }

            $lineas[] = [
                'numero_linea' => $item['numero_linea'],
                'descripcion' => $item['descripcion'],
                'cantidad' => $item['cantidad'],
                'precio_unitario' => $item['precio_unitario'],
                'precio' => $item['precio'],
                'descuento' => $item['descuento'],
                'impuestos' => $impuestos,
                'iva' => $iva / 100,
                'timbre_prensa' => $timbre / 100,
                'base_timbre_prensa' => $baseTimbre / 100,
                'total' => $total / 100,
                'bien_o_servicio' => $item['bien_o_servicio'],
                'unidad_medida' => $item['unidad_medida'],
            ];

            $sumaTotal += $total;
            $sumaIVA += $iva;
            $sumaTimbre += $timbre;
            $sumaBaseTimbre += $baseTimbre;
        }

        $granTotal = $centavos($lectura['gran_total']);

        if ($sumaTotal !== $granTotal) {
            return [
                'valido' => false,
                'mensaje' =>
                'La suma de los renglones no coincide con el GranTotal.',
            ];
        }

        return [
            'valido' => true,
            'uuid_origen' => $factura->uuid,
            'idfactura_origen' => $factura->idfactura,
            'tipo' => 'NCRE',
            'modalidad' => 'TOTAL',
            'lineas' => $lineas,
            'totales' => [
                'base_sin_impuestos' => ($sumaTotal - $sumaIVA - $sumaTimbre) / 100,
                'iva' => $sumaIVA / 100,
                'timbre_prensa_base' =>
                $sumaBaseTimbre / 100,
                'timbre_prensa_monto' =>
                $sumaTimbre / 100,
                'total' => $granTotal / 100,
            ],
        ];
    }


    // private function validarSaldoDisponibleNCRE(
    //     AdmFacturacion $factura,
    //     float $montoSolicitado
    // ): array {
    //     $lectura = $this->leerXMLFacturaCertificada($factura);

    //     if (!$lectura['valido']) {
    //         return [
    //             'valido' => false,
    //             'mensaje' => 'No se pudo validar la factura original.',
    //         ];
    //     }

    //     $totalFactura = (int) round(
    //         (float) $lectura['gran_total'] * 100
    //     );

    //     $montoCentavos = (int) round(
    //         $montoSolicitado * 100
    //     );

    //     // Revisar todas las notas asociadas al UUID original.
    //     $notas = DB::table('adm_notas_fel')
    //         ->where('uuid_origen', $factura->uuid)
    //         ->where('tipo', 'NCRE')
    //         ->get([
    //             'idnota',
    //             'resultado',
    //             'monto_total',
    //             'uuid_nota',
    //         ]);

    //     $totalAcreditado = 0;
    //     $pendientes = [];

    //     foreach ($notas as $nota) {
    //         if (
    //             $nota->resultado === 'S' &&
    //             !empty($nota->uuid_nota)
    //         ) {
    //             $totalAcreditado += (int) round(
    //                 (float) $nota->monto_total * 100
    //             );
    //         } else {
    //             // No asumimos que un error implica rechazo definitivo.
    //             $pendientes[] = $nota->idnota;
    //         }
    //     }

    //     $disponible = max(
    //         0,
    //         $totalFactura - $totalAcreditado
    //     );

    //     if (!empty($pendientes)) {
    //         return [
    //             'valido' => false,
    //             'mensaje' =>
    //             'Existen notas sin certificación confirmada. ' .
    //                 'Debe conciliarse su estado antes de emitir otra.',
    //             'notas_pendientes' => $pendientes,
    //         ];
    //     }

    //     return [
    //         'valido' => $montoCentavos > 0
    //             && $montoCentavos <= $disponible,

    //         'mensaje' => $montoCentavos > $disponible
    //             ? 'El monto supera el importe disponible.'
    //             : 'Importe disponible verificado.',

    //         'total_factura' => $totalFactura / 100,
    //         'total_acreditado' => $totalAcreditado / 100,
    //         'disponible' => $disponible / 100,
    //         'monto_solicitado' => $montoCentavos / 100,
    //     ];
    // }

    private function validarSaldoDisponibleNCRE(
        AdmFacturacion $factura,
        float $montoSolicitado,
        ?int $excluirIdIntento = null
    ): array {
        if (
            (int) $factura->estado !== 1 ||
            (string) $factura->resultado !== 'S' ||
            empty($factura->uuid)
        ) {
            return [
                'valido' => false,
                'mensaje' => 'La factura origen no está vigente y certificada.',
            ];
        }

        $lectura = $this->leerXMLFacturaCertificada($factura);
        if (empty($lectura['valido'])) {
            return [
                'valido' => false,
                'mensaje' => 'No se pudo validar el XML certificado de la factura original.',
            ];
        }

        $totalFactura = (int) round((float) $lectura['gran_total'] * 100);
        $montoCentavos = (int) round($montoSolicitado * 100);

        // Una nota sin resultado concluyente impide determinar el importe fiscal disponible.
        $notas = DB::table('adm_notas_fel')
            ->where('uuid_origen', $factura->uuid)
            ->where('tipo', 'NCRE')
            ->get(['idnota', 'resultado', 'monto_total', 'uuid_nota']);

        $totalAcreditado = 0;
        $notasPendientes = [];
        foreach ($notas as $nota) {
            if ((string) $nota->resultado === 'S' && !empty($nota->uuid_nota)) {
                $totalAcreditado += (int) round((float) $nota->monto_total * 100);
            } else {
                $notasPendientes[] = (int) $nota->idnota;
            }
        }

        // PREPARADO, ENVIANDO e INCIERTO: no abrir otra operación mientras se resuelve.
        // Se consideran tanto NCRE como NDEB para preservar un solo ajuste activo por origen.
        $consulta = DB::table('adm_fel_intentos')
            ->where('uuid_origen', $factura->uuid)
            ->whereIn('tipo_documento', ['NCRE', 'NDEB'])
            ->whereIn('estado', ['PREPARADO', 'ENVIANDO', 'INCIERTO']);

        if ($excluirIdIntento !== null) {
            $consulta->where('idintento', '<>', $excluirIdIntento);
        }

        $intentosPendientes = $consulta->orderBy('idintento')->pluck('idintento')->map(
            static fn($id) => (int) $id
        )->all();

        $disponible = max(0, $totalFactura - $totalAcreditado);
        $datos = [
            'total_factura' => $totalFactura / 100,
            'total_acreditado' => $totalAcreditado / 100,
            'disponible' => $disponible / 100,
            'monto_solicitado' => $montoCentavos / 100,
            'notas_pendientes' => $notasPendientes,
            'intentos_pendientes' => $intentosPendientes,
        ];

        if ($notasPendientes || $intentosPendientes) {
            return array_merge($datos, [
                'valido' => false,
                'mensaje' => 'Hay notas o intentos FEL sin resolver; conciliar antes de emitir otra NCRE.',
            ]);
        }

        if ($montoCentavos <= 0) {
            return array_merge($datos, [
                'valido' => false,
                'mensaje' => 'El monto de la NCRE debe ser mayor que cero.',
            ]);
        }

        if ($montoCentavos > $disponible) {
            return array_merge($datos, [
                'valido' => false,
                'mensaje' => 'El monto supera el importe fiscal disponible.',
            ]);
        }

        return array_merge($datos, [
            'valido' => true,
            'mensaje' => 'Importe fiscal disponible verificado.',
        ]);
    }


    public function probarLecturaXMLCertificado($idcotizacion)
    {
        // Esta herramienta solo funciona en desarrollo.
        abort_unless(app()->environment('local'), 404);

        $factura = $this->facturaVigente((int) $idcotizacion);

        if (!$factura) {
            return response()->json([
                'resultado' => false,
                'message' => 'No existe una factura FEL vigente.'
            ], 404);
        }

        $lectura = $this->leerXMLFacturaCertificada($factura);

        if (!$lectura['valido']) {
            return response()->json([
                'resultado' => false,
                'message' => $lectura['mensaje'] ??
                    'No fue posible leer el XML certificado.'
            ], 422);
        }

        $simulacionNCRE = $this->calcularNCRETotalDesdeXML(
            $factura
        );

        $totalXML = round((float) $lectura['gran_total'], 2);

        // Facturas recientes: importe histórico certificado.
        // Facturas antiguas: no asumimos que la cotización
        // actual equivale al documento certificado.
        $totalHistorico = $factura->total_factura !== null
            ? round((float) $factura->total_factura, 2)
            : null;

        $totalLineas = round(array_sum(array_map(
            static fn($item) => (float) $item['total'],
            $lectura['items']
        )), 2);

        $uuidXML = (string) ($lectura['uuid'] ?? '');

        return response()->json([
            'resultado' => true,
            'modo' => 'LECTURA_XML_CERTIFICADO_SIN_MODIFICACIONES',
            'factura' => [
                'idfactura' => $factura->idfactura,
                'idcotizacion' => (int) $idcotizacion,
                'uuid_base_datos' => $factura->uuid,
                'total_historico' => $totalHistorico,
            ],
            'xml' => [
                'uuid' => $uuidXML,
                'cantidad_items' => count($lectura['items']),
                'suma_items' => $totalLineas,
                'gran_total' => $totalXML,
                'items' => $lectura['items'],
            ],
            'validacion' => [
                'total_items_coincide' =>
                abs($totalXML - $totalLineas) < 0.001,
                'total_historico_coincide' =>
                $totalHistorico !== null
                    ? abs($totalXML - $totalHistorico) < 0.001
                    : null,
                'uuid_coincide' => $lectura['uuid_coincide'],
            ],
            'simulacion_ncre_total' => $simulacionNCRE,
            'receptor' => $lectura['receptor'] ?? null,
        ]);
    }


    public function probarIntentoNotaFEL($idintento)
    {
        abort_unless(app()->environment('local'), 404);

        $resultado = $this->validarIntentoNotaParaEnvio(
            (int) $idintento
        );

        return response()->json([
            'resultado' => $resultado['valido'],
            'modo' => 'VALIDACION_INTENTO_NOTA_SIN_CERTIFICAR',
            'validacion' => $resultado,
        ], $resultado['valido'] ? 200 : 422);
    }


    // private function reservarEnvioIntentoFEL(
    //     int $idintento,
    //     string $tipoDocumento
    // ): array {
    //     return DB::transaction(function () use (
    //         $idintento,
    //         $tipoDocumento
    //     ) {
    //         $intento = DB::table('adm_fel_intentos')
    //             ->where('idintento', $idintento)
    //             ->lockForUpdate()
    //             ->first();

    //         if (!$intento) {
    //             return [
    //                 'valido' => false,
    //                 'mensaje' => 'El intento FEL no existe.',
    //             ];
    //         }

    //         if ($intento->tipo_documento !== $tipoDocumento) {
    //             return [
    //                 'valido' => false,
    //                 'mensaje' => 'El tipo de documento no coincide.',
    //             ];
    //         }

    //         if ($intento->estado !== 'PREPARADO') {
    //             return [
    //                 'valido' => false,
    //                 'mensaje' =>
    //                 'El intento ya fue reservado o procesado.',
    //                 'estado' => $intento->estado,
    //             ];
    //         }

    //         if (
    //             empty($intento->xml_enviado) ||
    //             !hash_equals(
    //                 (string) $intento->xml_hash,
    //                 hash('sha256', $intento->xml_enviado)
    //             )
    //         ) {
    //             return [
    //                 'valido' => false,
    //                 'mensaje' => 'El XML almacenado no es íntegro.',
    //             ];
    //         }

    //         // Solo verificamos que el intento todavía tenga
    //         // un documento origen vigente, cuando es una nota.
    //         if (in_array($tipoDocumento, ['NCRE', 'NDEB'], true)) {
    //             $factura = $this->facturaVigente(
    //                 (int) $intento->idcotizacion
    //             );

    //             if (
    //     !$factura ||
    //     (int) $factura->estado !== 1 ||
    //     (string) $factura->resultado !== 'S' ||
    //     strcasecmp(
    //         (string) $factura->uuid,
    //         (string) $intento->uuid_origen
    //     ) !== 0
    // ) {

    //                 return [
    //                     'valido' => false,
    //                     'mensaje' =>
    //                     'La factura origen ya no coincide con el intento.',
    //                 ];
    //             }
    //         }

    //         DB::table('adm_fel_intentos')
    //             ->where('idintento', $idintento)
    //             ->where('estado', 'PREPARADO')
    //             ->update([
    //                 'estado' => 'ENVIANDO',
    //                 'fecha_envio' => now(),
    //             ]);

    //         return [
    //             'valido' => true,
    //             'idintento' => (int) $intento->idintento,
    //             'identificador' => $intento->identificador,
    //             'tipo_documento' => $intento->tipo_documento,
    //             'estado' => 'ENVIANDO',
    //         ];
    //     });
    // }


    private function reservarEnvioIntentoFEL(int $idintento, string $tipoDocumento): array
    {
        return DB::transaction(function () use ($idintento, $tipoDocumento) {
            // Lectura sin lock solo para conocer la cotización y fijar el orden
            // de bloqueo: cotización -> intento. Se vuelve a comprobar todo luego.
            $referencia = DB::table('adm_fel_intentos')
                ->where('idintento', $idintento)
                ->first(['idintento', 'idcotizacion']);

            if (!$referencia) {
                return ['valido' => false, 'mensaje' => 'El intento FEL no existe.'];
            }

            $cotizacion = AdmCotizacion::where('idcotizacion', $referencia->idcotizacion)
                ->lockForUpdate()->first();

            if (!$cotizacion) {
                return ['valido' => false, 'mensaje' => 'La cotización ya no existe.'];
            }

            $intento = DB::table('adm_fel_intentos')
                ->where('idintento', $idintento)
                ->lockForUpdate()->first();

            if (!$intento || (int) $intento->idcotizacion !== (int) $cotizacion->idcotizacion) {
                return ['valido' => false, 'mensaje' => 'El intento cambió o ya no existe.'];
            }

            if ($intento->tipo_documento !== $tipoDocumento) {
                return ['valido' => false, 'mensaje' => 'El tipo de documento no coincide.'];
            }

            if ($intento->estado !== 'PREPARADO') {
                return [
                    'valido' => false,
                    'mensaje' => 'El intento ya fue reservado o procesado.',
                    'estado' => $intento->estado,
                ];
            }

            if (
                empty($intento->xml_enviado) ||
                !hash_equals((string) $intento->xml_hash, hash('sha256', (string) $intento->xml_enviado))
            ) {
                return ['valido' => false, 'mensaje' => 'El XML almacenado no es íntegro.'];
            }

            if ($tipoDocumento === 'FCAM') {
                if (
                    (int) $cotizacion->estado !== 5 ||
                    AdmFacturacion::where('idcotizacion', $cotizacion->idcotizacion)
                    ->where('resultado', 'S')->where('estado', 1)->exists()
                ) {
                    return ['valido' => false, 'mensaje' => 'La cotización ya no puede certificarse como FCAM.'];
                }
            }

            if (in_array($tipoDocumento, ['NCRE', 'NDEB'], true)) {

                // Solo NCRE/NDEB: comprobar fecha del XML persistido.
                // No altera la rama FCAM.
                $xmlDoc = new \DOMDocument();

                $xmlAnterior = libxml_use_internal_errors(true);

                try {
                    $xmlCargado = $xmlDoc->loadXML(
                        (string) $intento->xml_enviado,
                        LIBXML_NONET
                    );
                } finally {
                    libxml_clear_errors();
                    libxml_use_internal_errors($xmlAnterior);
                }

                if (!$xmlCargado) {
                    return [
                        'valido' => false,
                        'mensaje' => 'El XML almacenado no es válido.',
                    ];
                }

                $xpath = new \DOMXPath($xmlDoc);

                $nodosFecha = $xpath->query(
                    '//*[local-name()="DatosGenerales"]/@FechaHoraEmision'
                );

                if (!$nodosFecha || $nodosFecha->length !== 1) {
                    return [
                        'valido' => false,
                        'mensaje' => 'No se encontró una fecha única de emisión en el XML.',
                    ];
                }

                $fechaXML = trim((string) $nodosFecha->item(0)->nodeValue);

                $fechaEmision = \DateTimeImmutable::createFromFormat(
                    '!Y-m-d\TH:i:s',
                    $fechaXML,
                    new \DateTimeZone(config('app.timezone'))
                );

                if (
                    !$fechaEmision ||
                    $fechaEmision->format('Y-m-d\TH:i:s') !== $fechaXML ||
                    $fechaEmision->format('Y-m-d') !== now()->format('Y-m-d') ||
                    $fechaEmision->getTimestamp() > now()->getTimestamp()
                ) {
                    return [
                        'valido' => false,
                        'mensaje' => 'La fecha del XML no corresponde al día actual. Se requiere revisión del intento antes de emitir.',
                    ];
                }
                $factura = $this->facturaVigente((int) $intento->idcotizacion);
                if (
                    !$factura ||
                    (int) $factura->estado !== 1 ||
                    (string) $factura->resultado !== 'S' ||
                    strcasecmp((string) $factura->uuid, (string) $intento->uuid_origen) !== 0
                ) {
                    return ['valido' => false, 'mensaje' => 'La factura origen no está vigente o no coincide.'];
                }

                $meta = json_decode((string) $intento->metadatos_fiscales, true);
                if (
                    !is_array($meta) ||
                    ($meta['tipo'] ?? null) !== $tipoDocumento ||
                    strcasecmp((string) ($meta['origen']['uuid'] ?? ''), (string) $intento->uuid_origen) !== 0 ||
                    (float) ($meta['monto_total'] ?? 0) <= 0 ||
                    (float) ($meta['timbre_prensa_monto'] ?? 0) > 0
                ) {
                    return ['valido' => false, 'mensaje' => 'Metadatos fiscales inválidos o timbre no habilitado.'];
                }

                if (
                    !empty($meta['idfactura_origen']) &&
                    (int) $meta['idfactura_origen'] !== (int) $factura->idfactura
                ) {
                    return ['valido' => false, 'mensaje' => 'La factura origen del intento cambió.'];
                }

                $conciliacion = $this->conciliarXMLConMetadatosNota((string) $intento->xml_enviado, $meta);
                if (empty($conciliacion['valido'])) {
                    return ['valido' => false, 'mensaje' => 'El XML no coincide con los metadatos fiscales.'];
                }

                // Un solo ajuste activo por UUID, sin contar este mismo intento.
                $competidor = DB::table('adm_fel_intentos')
                    ->where('uuid_origen', $intento->uuid_origen)
                    ->where('idintento', '<>', $idintento)
                    ->whereIn('tipo_documento', ['NCRE', 'NDEB'])
                    ->whereIn('estado', ['PREPARADO', 'ENVIANDO', 'INCIERTO'])
                    ->orderBy('idintento')->first(['idintento', 'estado']);

                if ($competidor) {
                    return [
                        'valido' => false,
                        'mensaje' => 'Existe otro intento pendiente o incierto. Conciliar antes de transmitir.',
                        'idintento_competidor' => (int) $competidor->idintento,
                    ];
                }

                if ($tipoDocumento === 'NCRE') {
                    $disponibilidad = $this->validarSaldoDisponibleNCRE(
                        $factura,
                        (float) $meta['monto_total'],
                        $idintento
                    );
                    if (empty($disponibilidad['valido'])) {
                        return [
                            'valido' => false,
                            'mensaje' => $disponibilidad['mensaje'],
                            'disponibilidad' => $disponibilidad,
                        ];
                    }
                }
            }

            $afectadas = DB::table('adm_fel_intentos')
                ->where('idintento', $idintento)
                ->where('estado', 'PREPARADO')
                ->update(['estado' => 'ENVIANDO', 'fecha_envio' => now()]);

            if ($afectadas !== 1) {
                throw new \RuntimeException('No se pudo reservar de forma única el intento FEL.');
            }

            return [
                'valido' => true,
                'idintento' => (int) $intento->idintento,
                'identificador' => $intento->identificador,
                'tipo_documento' => $intento->tipo_documento,
                'estado' => 'ENVIANDO',
            ];
        });
    }



    public function probarBloqueoEnvioFEL($idintento)
    {
        abort_unless(app()->environment('local'), 404);

        // No habilitar esta prueba si la transmisión está activa.
        abort_if(
            config('services.infile.envio_intentos_habilitado', false)
                || config('services.infile.notas_envio_habilitado', false),
            403
        );

        $intento = DB::table('adm_fel_intentos')
            ->where('idintento', $idintento)
            ->firstOrFail();

        $resultado = $this->transmitirIntentoFEL(
            (int) $idintento,
            $intento->tipo_documento
        );

        return response()->json([
            'resultado' => $resultado,
        ]);
    }


    // private function guardarNotaCertificadaFEL(int $idintento, array $json): array
    // {
    //     if (
    //         ($json['resultado'] ?? null) !== true ||
    //         !is_string($json['uuid'] ?? null) || trim($json['uuid']) === '' ||
    //         !is_string($json['serie'] ?? null) || trim($json['serie']) === '' ||
    //         !isset($json['numero']) || trim((string) $json['numero']) === ''
    //     ) {
    //         throw new \RuntimeException('Respuesta de certificación incompleta.');
    //     }

    //     return DB::transaction(function () use ($idintento, $json) {
    //         $intento = DB::table('adm_fel_intentos')
    //             ->where('idintento', $idintento)
    //             ->lockForUpdate()
    //             ->first();

    //         if (!$intento || !in_array($intento->tipo_documento, ['NCRE', 'NDEB'], true)) {
    //             throw new \RuntimeException('Intento de nota FEL inexistente o inválido.');
    //         }

    //         $uuid = trim($json['uuid']);
    //         $identificador = (string) $intento->identificador;

    //         // Idempotencia: solo admitir una nota existente si UUID e
    //         // identificador apuntan al mismo registro y al mismo intento.
    //         $porUuid = DB::table('adm_notas_fel')->where('uuid_nota', $uuid)->first();
    //         $porIdentificador = DB::table('adm_notas_fel')
    //             ->where('identificador', $identificador)->first();

    //         if ($porUuid || $porIdentificador) {
    //             if (
    //                 !$porUuid || !$porIdentificador ||
    //                 (int) $porUuid->idnota !== (int) $porIdentificador->idnota ||
    //                 (int) $porUuid->idcotizacion !== (int) $intento->idcotizacion ||
    //                 $porUuid->tipo !== $intento->tipo_documento ||
    //                 strcasecmp((string) $porUuid->uuid_origen, (string) $intento->uuid_origen) !== 0 ||
    //                 $porUuid->resultado !== 'S' ||
    //                 ($intento->idnota !== null && (int) $intento->idnota !== (int) $porUuid->idnota) ||
    //                 ($intento->uuid !== null && strcasecmp((string) $intento->uuid, $uuid) !== 0)
    //             ) {
    //                 throw new \RuntimeException('Conflicto de UUID o identificador FEL: requiere revisión manual.');
    //             }

    //             if (!in_array($intento->estado, ['ENVIANDO', 'INCIERTO', 'CERTIFICADO'], true)) {
    //                 throw new \RuntimeException('Estado incompatible con nota certificada existente.');
    //             }

    //             DB::table('adm_fel_intentos')->where('idintento', $idintento)->update([
    //                 'estado' => 'CERTIFICADO',
    //                 'uuid' => $uuid,
    //                 'idnota' => $porUuid->idnota,
    //                 'fecha_respuesta' => now(),
    //                 'mensaje_error' => null,
    //             ]);

    //             return [
    //                 'valido' => true,
    //                 'idintento' => $idintento,
    //                 'idnota' => (int) $porUuid->idnota,
    //                 'uuid' => $uuid,
    //                 'estado' => 'CERTIFICADO',
    //                 'ya_existia' => true,
    //             ];
    //         }

    //         if (!in_array($intento->estado, ['ENVIANDO', 'INCIERTO'], true)) {
    //             throw new \RuntimeException('El intento no admite guardar una nueva nota.');
    //         }

    //         if (empty($intento->xml_enviado) || !hash_equals(
    //             (string) $intento->xml_hash,
    //             hash('sha256', (string) $intento->xml_enviado)
    //         )) {
    //             throw new \RuntimeException('XML del intento alterado o inexistente.');
    //         }

    //         if (empty($intento->metadatos_fiscales)) {
    //             throw new \RuntimeException('El intento carece de metadatos fiscales persistidos.');
    //         }

    //         $meta = json_decode($intento->metadatos_fiscales, true, 512, JSON_THROW_ON_ERROR);
    //         if (
    //             !is_array($meta) ||
    //             ($meta['tipo'] ?? null) !== $intento->tipo_documento ||
    //             strcasecmp((string) ($meta['origen']['uuid'] ?? ''), (string) $intento->uuid_origen) !== 0 ||
    //             empty($meta['idcliente']) ||
    //             empty($meta['idfactura_origen'])
    //         ) {
    //             throw new \RuntimeException('Metadatos fiscales incompletos o incompatibles.');
    //         }

    //         $factura = AdmFacturacion::where('idfactura', (int) $meta['idfactura_origen'])
    //             ->where('idcotizacion', (int) $intento->idcotizacion)
    //             ->where('resultado', 'S')->where('estado', 1)->first();
    //         if (!$factura || strcasecmp((string) $factura->uuid, (string) $intento->uuid_origen) !== 0) {
    //             throw new \RuntimeException('La factura de origen no está vigente o no coincide.');
    //         }

    //         $conciliacion = $this->conciliarXMLConMetadatosNota(
    //             (string) $intento->xml_enviado,
    //             $meta
    //         );
    //         if (!$conciliacion['valido']) {
    //             throw new \RuntimeException('Conciliación fiscal rechazada: ' . implode('; ', $conciliacion['errores']));
    //         }

    //         // La respuesta HTTP ya debe estar conservada en adm_fel_intentos
    //         // antes de llamar a este método.
    //         if (empty($intento->respuesta_certificador)) {
    //             throw new \RuntimeException('No existe la respuesta original del certificador almacenada.');
    //         }

    //         $respuestaGuardada = json_decode((string) $intento->respuesta_certificador, true);
    //         if (
    //             !is_array($respuestaGuardada) ||
    //             ($respuestaGuardada['resultado'] ?? null) !== true ||
    //             strcasecmp((string) ($respuestaGuardada['uuid'] ?? ''), $uuid) !== 0 ||
    //             (string) ($respuestaGuardada['serie'] ?? '') !== (string) $json['serie'] ||
    //             (string) ($respuestaGuardada['numero'] ?? '') !== (string) $json['numero']
    //         ) {
    //             throw new \RuntimeException('La respuesta almacenada no coincide con la certificación.');
    //         }

    //         $jsonCampo = static function ($valor): ?string {
    //             if ($valor === null) return null;
    //             return json_encode($valor, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    //         };

    //         $fechaNota = !empty($json['fecha'])
    //             ? Carbon::parse($json['fecha'])->toDateTimeString()
    //             : null;

    //         $idnota = DB::table('adm_notas_fel')->insertGetId([
    //             'idcotizacion' => $intento->idcotizacion,
    //             'idcliente' => $meta['idcliente'],
    //             'idfactura_origen' => $meta['idfactura_origen'],
    //             'tipo' => $intento->tipo_documento,
    //             'motivo' => $meta['motivo'] ?? null,
    //             'monto_total' => $meta['monto_total'],
    //             'monto_gravable' => $meta['monto_gravable'] ?? null,
    //             'monto_impuesto' => $meta['monto_impuesto'] ?? null,
    //             'timbre_prensa_base' => $meta['timbre_prensa_base'] ?? 0,
    //             'timbre_prensa_porcentaje' => $meta['timbre_prensa_porcentaje'] ?? 0,
    //             'timbre_prensa_monto' => $meta['timbre_prensa_monto'] ?? 0,
    //             'exento_iva' => $meta['exento_iva'] ?? 'N',
    //             'receptor_numero' => $meta['receptor']['numero'] ?? null,
    //             'receptor_tipo' => $meta['receptor']['tipo'] ?? null,
    //             'receptor_tipo_especial' => $meta['receptor']['tipo_especial'] ?? null,
    //             'receptor_nombre' => $meta['receptor']['nombre'] ?? null,
    //             'receptor_email' => $meta['receptor']['email'] ?? null,
    //             'receptor_direccion' => $meta['receptor']['direccion'] ?? null,
    //             'uuid_origen' => $intento->uuid_origen,
    //             'serie_origen' => $meta['origen']['serie'] ?? null,
    //             'numero_origen' => $meta['origen']['numero'] ?? null,
    //             'fecha_emision_origen' => $meta['origen']['fecha_emision'] ?? null,
    //             'identificador' => $identificador,
    //             'xml_enviado' => $intento->xml_enviado,
    //             'resultado' => 'S',
    //             'uuid_nota' => $uuid,
    //             'serie_nota' => $json['serie'],
    //             'numero_nota' => (string) $json['numero'],
    //             'fecha_nota' => $fechaNota,
    //             'descripcion' => $json['descripcion'] ?? null,
    //             // Guardar tal cual: no aplicar base64_encode por segunda vez.
    //             'xml_certificado' => is_string($json['xml_certificado'] ?? null)
    //                 ? $json['xml_certificado'] : null,
    //             'alertas_infile' => $jsonCampo($json['descripcion_alertas_infile'] ?? null),
    //             'alertas_sat' => $jsonCampo($json['descripcion_alertas_sat'] ?? null),
    //             'errores' => null,
    //             'created_by' => auth()->id(),
    //             'created_at' => now(),
    //             'updated_at' => now(),
    //         ]);

    //         $actualizados = DB::table('adm_fel_intentos')
    //             ->where('idintento', $idintento)
    //             ->whereIn('estado', ['ENVIANDO', 'INCIERTO'])
    //             ->update([
    //                 'estado' => 'CERTIFICADO',
    //                 'uuid' => $uuid,
    //                 'idnota' => $idnota,
    //                 'fecha_respuesta' => now(),
    //                 'mensaje_error' => null,
    //             ]);

    //         if ($actualizados !== 1) {
    //             throw new \RuntimeException('No se pudo confirmar el estado FEL de la nota.');
    //         }

    //         return [
    //             'valido' => true,
    //             'idintento' => $idintento,
    //             'idnota' => $idnota,
    //             'uuid' => $uuid,
    //             'estado' => 'CERTIFICADO',
    //             'ya_existia' => false,
    //         ];
    //     });
    // }

    private function guardarNotaCertificadaFEL(int $idintento, array $json): array

    {

        if (

            ($json['resultado'] ?? null) !== true ||

            !is_string($json['uuid'] ?? null) || trim($json['uuid']) === '' ||

            !is_string($json['serie'] ?? null) || trim($json['serie']) === '' ||

            !isset($json['numero']) || trim((string) $json['numero']) === ''

        ) {

            throw new \RuntimeException('Respuesta de certificación incompleta.');
        }



        $resultadoFiscal = DB::transaction(function () use ($idintento, $json) {

            $intento = DB::table('adm_fel_intentos')

                ->where('idintento', $idintento)

                ->lockForUpdate()

                ->first();



            if (!$intento || !in_array($intento->tipo_documento, ['NCRE', 'NDEB'], true)) {

                throw new \RuntimeException('Intento de nota FEL inexistente o inválido.');
            }



            $uuid = trim($json['uuid']);

            $identificador = (string) $intento->identificador;



            // Idempotencia: solo admitir una nota existente si UUID e

            // identificador apuntan al mismo registro y al mismo intento.

            $porUuid = DB::table('adm_notas_fel')->where('uuid_nota', $uuid)->first();

            $porIdentificador = DB::table('adm_notas_fel')

                ->where('identificador', $identificador)->first();



            if ($porUuid || $porIdentificador) {

                if (

                    !$porUuid || !$porIdentificador ||

                    (int) $porUuid->idnota !== (int) $porIdentificador->idnota ||

                    (int) $porUuid->idcotizacion !== (int) $intento->idcotizacion ||

                    $porUuid->tipo !== $intento->tipo_documento ||

                    strcasecmp((string) $porUuid->uuid_origen, (string) $intento->uuid_origen) !== 0 ||

                    $porUuid->resultado !== 'S' ||

                    ($intento->idnota !== null && (int) $intento->idnota !== (int) $porUuid->idnota) ||

                    ($intento->uuid !== null && strcasecmp((string) $intento->uuid, $uuid) !== 0)

                ) {

                    throw new \RuntimeException('Conflicto de UUID o identificador FEL: requiere revisión manual.');
                }



                if (!in_array($intento->estado, ['ENVIANDO', 'INCIERTO', 'CERTIFICADO'], true)) {

                    throw new \RuntimeException('Estado incompatible con nota certificada existente.');
                }



                DB::table('adm_fel_intentos')->where('idintento', $idintento)->update([

                    'estado' => 'CERTIFICADO',

                    'uuid' => $uuid,

                    'idnota' => $porUuid->idnota,

                    'fecha_respuesta' => now(),

                    'mensaje_error' => null,

                ]);



                return [

                    'valido' => true,

                    'idintento' => $idintento,

                    'idnota' => (int) $porUuid->idnota,

                    'uuid' => $uuid,

                    'estado' => 'CERTIFICADO',

                    'ya_existia' => true,

                ];
            }



            if (!in_array($intento->estado, ['ENVIANDO', 'INCIERTO'], true)) {

                throw new \RuntimeException('El intento no admite guardar una nueva nota.');
            }



            if (empty($intento->xml_enviado) || !hash_equals(

                (string) $intento->xml_hash,

                hash('sha256', (string) $intento->xml_enviado)

            )) {

                throw new \RuntimeException('XML del intento alterado o inexistente.');
            }



            if (empty($intento->metadatos_fiscales)) {

                throw new \RuntimeException('El intento carece de metadatos fiscales persistidos.');
            }



            $meta = json_decode($intento->metadatos_fiscales, true, 512, JSON_THROW_ON_ERROR);

            if (

                !is_array($meta) ||

                ($meta['tipo'] ?? null) !== $intento->tipo_documento ||

                strcasecmp((string) ($meta['origen']['uuid'] ?? ''), (string) $intento->uuid_origen) !== 0 ||

                empty($meta['idcliente']) ||

                empty($meta['idfactura_origen'])

            ) {

                throw new \RuntimeException('Metadatos fiscales incompletos o incompatibles.');
            }



            $factura = AdmFacturacion::where('idfactura', (int) $meta['idfactura_origen'])

                ->where('idcotizacion', (int) $intento->idcotizacion)

                ->where('resultado', 'S')->where('estado', 1)->first();

            if (!$factura || strcasecmp((string) $factura->uuid, (string) $intento->uuid_origen) !== 0) {

                throw new \RuntimeException('La factura de origen no está vigente o no coincide.');
            }



            $conciliacion = $this->conciliarXMLConMetadatosNota(

                (string) $intento->xml_enviado,

                $meta

            );

            if (!$conciliacion['valido']) {

                throw new \RuntimeException('Conciliación fiscal rechazada: ' . implode('; ', $conciliacion['errores']));
            }



            // La respuesta HTTP ya debe estar conservada en adm_fel_intentos

            // antes de llamar a este método.

            if (empty($intento->respuesta_certificador)) {

                throw new \RuntimeException('No existe la respuesta original del certificador almacenada.');
            }



            $respuestaGuardada = json_decode((string) $intento->respuesta_certificador, true);

            if (

                !is_array($respuestaGuardada) ||

                ($respuestaGuardada['resultado'] ?? null) !== true ||

                strcasecmp((string) ($respuestaGuardada['uuid'] ?? ''), $uuid) !== 0 ||

                (string) ($respuestaGuardada['serie'] ?? '') !== (string) $json['serie'] ||

                (string) ($respuestaGuardada['numero'] ?? '') !== (string) $json['numero']

            ) {

                throw new \RuntimeException('La respuesta almacenada no coincide con la certificación.');
            }



            $jsonCampo = static function ($valor): ?string {

                if ($valor === null) return null;

                return json_encode($valor, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            };



            $fechaNota = !empty($json['fecha'])

                ? Carbon::parse($json['fecha'])->toDateTimeString()

                : null;



            $idnota = DB::table('adm_notas_fel')->insertGetId([

                'idcotizacion' => $intento->idcotizacion,

                'idcliente' => $meta['idcliente'],

                'idfactura_origen' => $meta['idfactura_origen'],

                'tipo' => $intento->tipo_documento,

                'motivo' => $meta['motivo'] ?? null,

                'monto_total' => $meta['monto_total'],

                'monto_gravable' => $meta['monto_gravable'] ?? null,

                'monto_impuesto' => $meta['monto_impuesto'] ?? null,

                'timbre_prensa_base' => $meta['timbre_prensa_base'] ?? 0,

                'timbre_prensa_porcentaje' => $meta['timbre_prensa_porcentaje'] ?? 0,

                'timbre_prensa_monto' => $meta['timbre_prensa_monto'] ?? 0,

                'exento_iva' => $meta['exento_iva'] ?? 'N',

                'receptor_numero' => $meta['receptor']['numero'] ?? null,

                'receptor_tipo' => $meta['receptor']['tipo'] ?? null,

                'receptor_tipo_especial' => $meta['receptor']['tipo_especial'] ?? null,

                'receptor_nombre' => $meta['receptor']['nombre'] ?? null,

                'receptor_email' => $meta['receptor']['email'] ?? null,

                'receptor_direccion' => $meta['receptor']['direccion'] ?? null,

                'uuid_origen' => $intento->uuid_origen,

                'serie_origen' => $meta['origen']['serie'] ?? null,

                'numero_origen' => $meta['origen']['numero'] ?? null,

                'fecha_emision_origen' => $meta['origen']['fecha_emision'] ?? null,

                'identificador' => $identificador,

                'xml_enviado' => $intento->xml_enviado,

                'resultado' => 'S',

                'uuid_nota' => $uuid,

                'serie_nota' => $json['serie'],

                'numero_nota' => (string) $json['numero'],

                'fecha_nota' => $fechaNota,

                'descripcion' => $json['descripcion'] ?? null,

                // Guardar tal cual: no aplicar base64_encode por segunda vez.

                'xml_certificado' => is_string($json['xml_certificado'] ?? null)

                    ? $json['xml_certificado'] : null,

                'alertas_infile' => $jsonCampo($json['descripcion_alertas_infile'] ?? null),

                'alertas_sat' => $jsonCampo($json['descripcion_alertas_sat'] ?? null),

                'errores' => null,

                'created_by' => auth()->id(),

                'created_at' => now(),

                'updated_at' => now(),

            ]);



            $actualizados = DB::table('adm_fel_intentos')

                ->where('idintento', $idintento)

                ->whereIn('estado', ['ENVIANDO', 'INCIERTO'])

                ->update([

                    'estado' => 'CERTIFICADO',

                    'uuid' => $uuid,

                    'idnota' => $idnota,

                    'fecha_respuesta' => now(),

                    'mensaje_error' => null,

                ]);



            if ($actualizados !== 1) {

                throw new \RuntimeException('No se pudo confirmar el estado FEL de la nota.');
            }



            return [

                'valido' => true,

                'idintento' => $idintento,

                'idnota' => $idnota,

                'uuid' => $uuid,

                'estado' => 'CERTIFICADO',

                'ya_existia' => false,

            ];
        });

        // La nota fiscal queda confirmada y comprometida ANTES del ajuste de CxC.
        // Si CxC falla, jamás se deshace ni se retransmite una certificación real.
        // Repetir este método con la respuesta original almacenada reintenta CxC
        // sin duplicar la nota ni su movimiento (UNIQUE idnota).
        try {
            $aplicacion = app(\App\Services\AplicadorNotasFELCxC::class)
                ->aplicar((int) $resultadoFiscal['idnota'], auth()->id());

            $resultadoFiscal['cxc_estado'] = 'APLICADA';
            $resultadoFiscal['cxc_requiere_revision'] = false;
            $resultadoFiscal['cxc_movimiento_id'] = $aplicacion['idmovimiento'] ?? null;
            $resultadoFiscal['cxc_ya_existia'] = (bool) ($aplicacion['ya_existia'] ?? false);
        } catch (\Throwable $e) {
            // Evitar poner datos personales o respuestas FEL completas en logs.
            Log::error('Nota FEL certificada con ajuste CxC pendiente', [
                'idintento' => $idintento,
                'idnota' => $resultadoFiscal['idnota'] ?? null,
                'tipo_excepcion' => get_class($e),
                'error' => $e->getMessage(),
            ]);

            $resultadoFiscal['cxc_estado'] = 'PENDIENTE_REVISION';
            $resultadoFiscal['cxc_requiere_revision'] = true;
            $resultadoFiscal['cxc_movimiento_id'] = null;
            $resultadoFiscal['cxc_ya_existia'] = false;
        }

        return $resultadoFiscal;
    }


    /**
     * Certifica exclusivamente un intento NCRE/NDEB ya preparado.
     * Nunca genera un XML nuevo.
     */
    public function transmitirNotaFEL(int $idintento)
    {
        \Illuminate\Support\Facades\Gate::authorize(
            'fel-transmitir-notas'
        );

        if (!config('services.infile.notas_envio_habilitado', false)) {
            return response()->json([
                'resultado' => false,
                'estado' => 'BLOQUEADO',
                'mensaje' => 'La certificación de notas FEL está deshabilitada.',
            ], 503);
        }

        $intento = DB::table('adm_fel_intentos')
            ->where('idintento', $idintento)
            ->whereIn('tipo_documento', ['NCRE', 'NDEB'])
            ->first([
                'idintento',
                'idcotizacion',
                'tipo_documento',
                'estado',
            ]);

        if (!$intento) {
            return response()->json([
                'resultado' => false,
                'mensaje' => 'No existe un intento de nota FEL válido.',
            ], 404);
        }

        if ($intento->estado !== 'PREPARADO') {
            return response()->json([
                'resultado' => false,
                'estado' => $intento->estado,
                'mensaje' => 'El intento ya fue procesado o requiere conciliación. No se reenviará.',
            ], 409);
        }

        // Revalida y reserva el intento usando el mecanismo existente.
        $resultado = $this->transmitirIntentoFEL(
            (int) $intento->idintento,
            (string) $intento->tipo_documento
        );

        $estado = $resultado['estado'] ?? 'BLOQUEADO';

        $httpStatus = match ($estado) {
            'CERTIFICADO' => 200,
            'INCIERTO' => 202,
            default => 409,
        };

        return response()->json([
            'resultado' => (bool) ($resultado['valido'] ?? false),
            'estado' => $estado,
            'idintento' => $idintento,
            'idnota' => $resultado['idnota'] ?? null,
            'uuid' => $resultado['uuid'] ?? null,
            'mensaje' => $resultado['mensaje'] ?? (
                $estado === 'CERTIFICADO'
                ? 'Nota FEL certificada correctamente.'
                : 'No fue posible completar la certificación.'
            ),
        ], $httpStatus);
    }

    private function transmitirIntentoFEL(int $idintento, string $tipoDocumento): array
    {
        if (!config('services.infile.notas_envio_habilitado', false)) {
            return [
                'valido' => false,
                'estado' => 'BLOQUEADO',
                'mensaje' => 'La certificación de notas FEL no está habilitada.',
            ];
        }

        // No habilitar FCAM aquí: su guardado y CXC aún usan el flujo anterior.
        if (!in_array($tipoDocumento, ['NCRE', 'NDEB'], true)) {
            return [
                'valido' => false,
                'estado' => 'BLOQUEADO',
                'mensaje' => 'El tipo de documento aún no admite este transmisor.',
            ];
        }

        $intento = DB::table('adm_fel_intentos')->where('idintento', $idintento)->first();
        if (!$intento || empty($intento->metadatos_fiscales)) {
            return [
                'valido' => false,
                'estado' => 'BLOQUEADO',
                'mensaje' => 'Intento inexistente o sin metadatos fiscales persistidos.',
            ];
        }

        // No permitir notas que apliquen timbre, hasta validación tributaria.
        $meta = json_decode((string) $intento->metadatos_fiscales, true);
        if (!is_array($meta) || (float) ($meta['timbre_prensa_monto'] ?? 0) > 0) {
            return [
                'valido' => false,
                'estado' => 'BLOQUEADO',
                'mensaje' => 'Metadatos inválidos o timbre pendiente de validación.',
            ];
        }

        $conciliacion = $this->conciliarXMLConMetadatosNota(
            (string) $intento->xml_enviado,
            $meta
        );
        if (!$conciliacion['valido']) {
            return [
                'valido' => false,
                'estado' => 'BLOQUEADO',
                'mensaje' => 'El XML no coincide con los metadatos fiscales.',
            ];
        }

        $url = config('services.infile.url');
        $credenciales = [
            'UsuarioApi' => config('services.infile.usuario_api'),
            'LlaveApi' => config('services.infile.llave_api'),
            'UsuarioFirma' => config('services.infile.usuario_firma'),
            'LlaveFirma' => config('services.infile.llave_firma'),
        ];
        if (!$url || in_array(null, $credenciales, true) || in_array('', $credenciales, true)) {
            return [
                'valido' => false,
                'estado' => 'BLOQUEADO',
                'mensaje' => 'Configuración de INFILE incompleta.',
            ];
        }

        $reserva = $this->reservarEnvioIntentoFEL($idintento, $tipoDocumento);
        if (!$reserva['valido']) {
            return [
                'valido' => false,
                'estado' => 'BLOQUEADO',
                'mensaje' => $reserva['mensaje'],
            ];
        }

        // Toda excepción a partir de esta reserva se considera incierta;
        // un timeout no demuestra que INFILE no haya certificado.
        try {
            $response = Http::timeout(30)->withHeaders(array_merge(
                ['Content-Type' => 'application/xml', 'Identificador' => $intento->identificador],
                $credenciales
            ))->withBody((string) $intento->xml_enviado, 'application/xml')->post($url);

            // Persistir el cuerpo de la respuesta antes de analizarla.
            DB::table('adm_fel_intentos')->where('idintento', $idintento)
                ->where('estado', 'ENVIANDO')->update([
                    'respuesta_certificador' => $response->body(),
                    'fecha_respuesta' => now(),
                ]);

            $json = $response->json();
            $clasificacion = ClasificadorRespuestaFEL::clasificar(
                $response->status(),
                is_array($json) ? $json : null
            );



            if ($clasificacion['estado'] === 'CERTIFICACION_RECIBIDA') {
                $guardado = $this->guardarNotaCertificadaFEL($idintento, $json);
                return [
                    'valido' => true,
                    'estado' => 'CERTIFICADO',
                    'idintento' => $idintento,
                    'idnota' => $guardado['idnota'],
                    'uuid' => $guardado['uuid'],
                    'identificador' => $intento->identificador,
                ];
            }

            DB::table('adm_fel_intentos')->where('idintento', $idintento)
                ->where('estado', 'ENVIANDO')->update([
                    'estado' => 'INCIERTO',
                    'mensaje_error' => 'Respuesta sin certificación confirmada; requiere conciliación.',
                ]);

            return [
                'valido' => false,
                'estado' => 'INCIERTO',
                'idintento' => $idintento,
                'mensaje' => 'Resultado FEL no confirmado. No reintentar automáticamente.',
            ];
        } catch (\Throwable $e) {
            // Esta escritura puede fallar si MySQL está caído. En tal caso
            // ENVIANDO permanece congelado y debe conciliarse manualmente.
            try {
                DB::table('adm_fel_intentos')->where('idintento', $idintento)
                    ->where('estado', 'ENVIANDO')->update([
                        'estado' => 'INCIERTO',
                        'mensaje_error' => mb_substr('Fallo tras reserva: ' . $e->getMessage(), 0, 2000),
                    ]);
            } catch (\Throwable $falloBD) {
                Log::critical('No fue posible persistir estado incierto FEL', [
                    'idintento' => $idintento,
                    'tipo' => $tipoDocumento,
                    'error_tipo' => get_class($falloBD),
                ]);
            }

            Log::error('Intento FEL requiere conciliación', [
                'idintento' => $idintento,
                'tipo' => $tipoDocumento,
                'error_tipo' => get_class($e),
            ]);

            return [
                'valido' => false,
                'estado' => 'INCIERTO',
                'idintento' => $idintento,
                'mensaje' => 'No se confirmó el resultado. Requiere conciliación; no reenviar.',
            ];
        }
    }



    private function conciliarIntentoNotaFELLocal(int $idintento): array
    {
        $intento = DB::table('adm_fel_intentos')->where('idintento', $idintento)->first();

        if (!$intento || !in_array($intento->tipo_documento, ['NCRE', 'NDEB'], true)) {
            return [
                'valido' => false,
                'estado' => 'BLOQUEADO',
                'mensaje' => 'Intento de nota FEL inexistente o inválido.'
            ];
        }

        if (!in_array($intento->estado, ['INCIERTO', 'ENVIANDO'], true)) {
            return [
                'valido' => false,
                'estado' => 'BLOQUEADO',
                'mensaje' => 'El estado del intento no admite conciliación local.'
            ];
        }

        if (!is_string($intento->respuesta_certificador) || trim($intento->respuesta_certificador) === '') {
            return [
                'valido' => false,
                'estado' => 'INCIERTO',
                'mensaje' => 'No hay respuesta almacenada. Consultar INFILE por identificador; nunca reenviar.'
            ];
        }

        try {
            $respuesta = json_decode($intento->respuesta_certificador, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            return [
                'valido' => false,
                'estado' => 'INCIERTO',
                'mensaje' => 'Respuesta almacenada inválida. Requiere conciliación externa.'
            ];
        }

        // Exigir confirmación inequívoca; HTTP 422, timeouts y JSON incompletos
        // no constituyen un rechazo definitivo ni permiten liberar el intento.
        if (
            !is_array($respuesta) || ($respuesta['resultado'] ?? null) !== true ||
            !is_string($respuesta['uuid'] ?? null) || trim($respuesta['uuid']) === '' ||
            !is_string($respuesta['serie'] ?? null) || trim($respuesta['serie']) === '' ||
            !isset($respuesta['numero']) || trim((string) $respuesta['numero']) === ''
        ) {
            return [
                'valido' => false,
                'estado' => 'INCIERTO',
                'mensaje' => 'Respuesta sin certificación completa; requiere verificación con INFILE.'
            ];
        }

        try {
            // El método existente bloquea el intento y valida UUID, XML,
            // metadatos, origen y respuesta guardada antes de insertar la nota.
            $resultado = $this->guardarNotaCertificadaFEL($idintento, $respuesta);
            return array_merge($resultado, [
                'mensaje' => 'Certificación recuperada desde respuesta local sin reenviar a INFILE.',
            ]);
        } catch (\Throwable $e) {
            // No modificar PREPARADO/INCIERTO/CERTIFICADO ni borrar la respuesta.
            // No revelar datos tributarios o respuesta completa en registros.
            Log::warning('Conciliación local FEL pendiente de revisión', [
                'idintento' => $idintento,
                'error_tipo' => get_class($e),
            ]);
            return [
                'valido' => false,
                'estado' => 'INCIERTO',
                'mensaje' => 'No fue posible validar o guardar la certificación. Requiere revisión; no reenviar.'
            ];
        }
    }

    public function consultarIntentoNotaFEL(int $idintento)
    {


        \Illuminate\Support\Facades\Gate::authorize('fel-consultar-intentos');

        $intento = DB::table('adm_fel_intentos')
            ->where('idintento', $idintento)
            ->whereIn('tipo_documento', ['NCRE', 'NDEB'])
            ->first([
                'idintento',
                'idcotizacion',
                'tipo_documento',
                'identificador',
                'estado',
                'uuid_origen',
                'uuid',
                'idnota',
                'fecha_creacion',
                'fecha_envio',
                'fecha_respuesta',
            ]);

        if (!$intento) {
            return response()->json([
                'resultado' => false,
                'mensaje' => 'Intento de nota FEL no encontrado.',
            ], 404);
        }

        return response()->json([
            'resultado' => true,
            'intento' => $intento,
            'permite_transmitir' =>
            $intento->estado === 'PREPARADO'
                && config('services.infile.notas_envio_habilitado', false)
                && \Illuminate\Support\Facades\Gate::allows('fel-transmitir-notas'),
            'requiere_conciliacion' => in_array($intento->estado, ['ENVIANDO', 'INCIERTO'], true),
        ]);
    }

    public function conciliarIntentoNotaFELDesdeRespuestaLocal(int $idintento)
    {
        abort_unless(app()->environment('local', 'testing'), 404);

        // Requiere sesión autenticada y permiso explícito definido en el proyecto.
        // Sin Gate/política configurada, deniega por defecto.
        \Illuminate\Support\Facades\Gate::authorize('fel-conciliar-intentos');

        // Este método NUNCA envía a INFILE ni cambia un PREPARADO a ENVIANDO.
        $resultado = $this->conciliarIntentoNotaFELLocal($idintento);

        return response()->json([
            'resultado' => (bool) ($resultado['valido'] ?? false),
            'estado' => $resultado['estado'] ?? 'INCIERTO',
            'mensaje' => $resultado['mensaje'] ?? 'Conciliación no completada.',
            'idintento' => $idintento,
            'idnota' => $resultado['idnota'] ?? null,
            'uuid' => $resultado['uuid'] ?? null,
        ], ($resultado['valido'] ?? false) ? 200 : 409);
    }

    public function listarIntentosNotaFELPorCotizacion(int $idcotizacion)
    {

        \Illuminate\Support\Facades\Gate::authorize('fel-consultar-intentos');

        $cotizacionExiste = DB::table('adm_cotizacion')
            ->where('idcotizacion', $idcotizacion)
            ->exists();

        if (!$cotizacionExiste) {
            return response()->json([
                'resultado' => false,
                'mensaje' => 'Cotización no encontrada.',
            ], 404);
        }

        $intentos = DB::table('adm_fel_intentos')
            ->where('idcotizacion', $idcotizacion)
            ->whereIn('tipo_documento', ['NCRE', 'NDEB'])
            ->orderByDesc('idintento')
            ->limit(100)
            ->get([
                'idintento',
                'idcotizacion',
                'tipo_documento',
                'identificador',
                'estado',
                'uuid_origen',
                'uuid',
                'idnota',
                'fecha_creacion',
                'fecha_envio',
                'fecha_respuesta',
            ]);

        $puedeCertificarNotas =
            config('services.infile.notas_envio_habilitado', false)
            && \Illuminate\Support\Facades\Gate::allows('fel-transmitir-notas');

        $intentos->transform(function ($intento) use ($puedeCertificarNotas) {
            $intento->permite_transmitir =
                $puedeCertificarNotas
                && $intento->estado === 'PREPARADO';

            return $intento;
        });

        return response()->json([
            'resultado' => true,
            'idcotizacion' => $idcotizacion,
            'intentos' => $intentos,
        ]);
    }

    public function listarNotasFELPendientesCXC(\Illuminate\Http\Request $request)
    {
        abort_unless(app()->environment('local', 'testing'), 404);
        \Illuminate\Support\Facades\Gate::authorize('fel-consultar-intentos');

        $filtros = $request->validate([
            'idcotizacion' => ['nullable', 'integer', 'min:1'],
            'limite' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $limite = (int) ($filtros['limite'] ?? 50);

        // Solo notas confirmadas, con intento certificado coincidente y SIN movimiento.
        // EXISTS evita duplicados si existen filas de intento históricas.
        $q = DB::table('adm_notas_fel as n')
            ->where('n.resultado', 'S')
            ->whereIn('n.tipo', ['NCRE', 'NDEB'])
            ->whereNotNull('n.uuid_nota')
            ->where('n.uuid_nota', '<>', '')
            ->whereNotNull('n.identificador')
            ->where('n.identificador', '<>', '')
            ->whereExists(function ($sub) {
                $sub->selectRaw('1')
                    ->from('adm_fel_intentos as i')
                    ->whereColumn('i.idnota', 'n.idnota')
                    ->whereColumn('i.idcotizacion', 'n.idcotizacion')
                    ->whereRaw('BINARY i.tipo_documento = BINARY n.tipo')
                    ->whereRaw('BINARY i.identificador = BINARY n.identificador')
                    ->whereRaw('BINARY i.uuid = BINARY n.uuid_nota')
                    ->whereRaw('BINARY i.uuid_origen = BINARY n.uuid_origen')
                    ->where('i.estado', 'CERTIFICADO');
            })
            ->whereNotExists(function ($sub) {
                $sub->selectRaw('1')
                    ->from('adm_cxc_movimientos_fel as m')
                    ->whereColumn('m.idnota', 'n.idnota');
            });

        if (isset($filtros['idcotizacion'])) {
            $q->where('n.idcotizacion', (int) $filtros['idcotizacion']);
        }

        // Campos mínimos; NO incluir XML, respuesta certificador, NIT ni datos receptor.
        $pendientes = $q->orderByDesc('n.idnota')->limit($limite)->get([
            'n.idnota',
            'n.idcotizacion',
            'n.tipo',
            'n.monto_total',
            'n.uuid_nota',
            'n.fecha_nota',
            'n.created_at',
        ]);

        return response()->json([
            'resultado' => true,
            'solo_lectura' => true,
            'limite' => $limite,
            'total_devueltos' => $pendientes->count(),
            'pendientes' => $pendientes,
            'aviso' => 'La ausencia de movimiento no demuestra por sí sola un error. Revisar cada caso antes de regularizar.',
        ]);
    }

    public function regularizarNotaFELCxC(Request $request, int $idnota, \App\Services\AplicadorNotasFELCxC $aplicador)
    {
        abort_unless(app()->environment('local', 'testing'), 404);
        \Illuminate\Support\Facades\Gate::authorize('fel-regularizar-cxc');

        $datos = $request->validate([
            'uuid_nota' => ['required', 'string', 'max:64'],
            'confirmacion' => ['required', 'in:REGULARIZAR_CXC'],
        ]);

        if ($idnota < 1) {
            return response()->json(['resultado' => false, 'mensaje' => 'ID de nota inválido.'], 422);
        }

        $nota = DB::table('adm_notas_fel')
            ->where('idnota', $idnota)
            ->first(['idnota', 'idcotizacion', 'tipo', 'resultado', 'uuid_nota', 'identificador']);

        if (!$nota) {
            return response()->json(['resultado' => false, 'mensaje' => 'Nota no encontrada.'], 404);
        }

        // Comparación deliberadamente estricta: quien regulariza debe confirmar la nota exacta.
        if (!hash_equals((string) $nota->uuid_nota, trim($datos['uuid_nota']))) {
            return response()->json(['resultado' => false, 'mensaje' => 'UUID de confirmación no coincide.'], 409);
        }

        if ((string) $nota->resultado !== 'S' || !in_array((string) $nota->tipo, ['NCRE', 'NDEB'], true)) {
            return response()->json(['resultado' => false, 'mensaje' => 'La nota no tiene certificación válida.'], 409);
        }

        try {
            // La validación del intento CERTIFICADO, factura, cliente, moneda,
            // bloqueo FOR UPDATE, unicidad de idnota y actualización atómica
            // se realizan en AplicadorNotasFELCxC.
            $r = $aplicador->aplicar($idnota, $request->user()?->id);

            Log::info('Regularización FEL-CxC ejecutada en entorno de pruebas', [
                'idnota' => $idnota,
                'idusuario' => $request->user()?->id,
                'idmovimiento' => $r['idmovimiento'] ?? null,
                'ya_existia' => $r['ya_existia'] ?? null,
            ]);

            return response()->json([
                'resultado' => true,
                'idnota' => $idnota,
                'estado_cxc' => 'APLICADA',
                'ya_existia' => (bool) ($r['ya_existia'] ?? false),
                'movimiento' => $r,
            ]);
        } catch (\RuntimeException $e) {
            Log::warning('Regularización FEL-CxC requiere revisión', [
                'idnota' => $idnota,
                'idusuario' => $request->user()?->id,
                'razon' => $e->getMessage(),
            ]);
            return response()->json([
                'resultado' => false,
                'idnota' => $idnota,
                'estado_cxc' => 'PENDIENTE_REVISION',
                'mensaje' => $e->getMessage(),
            ], 409);
        }
    }
}
