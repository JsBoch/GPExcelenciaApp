<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\CotizacionesContabilidadExport;
use Illuminate\Support\Facades\Schema;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ReportesContabilidadController extends Controller
{
    public function cotizacionesPorFiltro(Request $request)
    {
        $request->validate([
            'desde' => 'required|date',
            'hasta' => 'required|date',
            'vendedor_id' => 'nullable|integer|exists:adm_empleados,id_empleado',
            'estado' => 'nullable|integer|between:1,8',
            'search' => 'nullable|string',
            'page' => 'nullable|integer',
            'per_page' => 'nullable|integer',
        ]);

        $query = $this->construirConsultaCotizaciones($request->all());

        $perPage = $request->input('per_page', 10);
        $page = $request->input('page', 1);

        return response()->json($query->paginate($perPage, ['*'], 'page', $page));
    }

    public function exportCotizacionesExcel(Request $request)
    {
        $request->validate([
            'desde' => 'required|date',
            'hasta' => 'required|date',
            'vendedor_id' => 'nullable|integer|exists:adm_empleados,id_empleado',
            'estado' => 'nullable|integer|between:1,8',
            'search' => 'nullable|string',
        ]);

        return Excel::download(new CotizacionesContabilidadExport($request->all()), 'cotizaciones.xlsx');
    }

    public function exportCotizacionesPdf(Request $request)
    {
        $request->validate([
            'desde' => 'required|date',
            'hasta' => 'required|date',
            'vendedor_id' => 'nullable|integer|exists:adm_empleados,id_empleado',
            'estado' => 'nullable|integer|between:1,8',
            'search' => 'nullable|string',
        ]);

        $rows = $this->construirConsultaCotizaciones($request->all())->get();

        // $pdf = Pdf::loadView('reportes.cotizacion_contabilidad', compact('rows'));
        $html = view('reportes.cotizacion_contabilidad', compact('rows'))->render();

        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper('letter', 'portrait');

        return $pdf->download('cotizaciones.pdf');
    }

    public function vendedoresActivos()
    {
        $empleados = DB::table('adm_empleados')
            ->select('id_empleado', 'nombre')
            ->where('estado', 1)
            ->orderBy('nombre')
            ->get();

        return response()->json($empleados);
    }

    public function fechaServidor()
    {
        return response()->json(['fecha' => now()->toDateString()]);
    }

    // private function construirConsultaCotizaciones(array $filtros)
    // {
    //     // Subquery: una fila por idcotizacion con la fecha de certificación (NO anuladas)
    //     $facAgg = DB::table('adm_facturacion as f')
    //         ->joinSub(
    //             DB::table('adm_facturacion')
    //                 ->select(
    //                     'idcotizacion',
    //                     DB::raw("
    //                 MAX(CASE WHEN estado = 1 THEN nofactura END) AS nofactura_activa
    //             "),
    //                     DB::raw("MAX(nofactura) AS nofactura_ultima")
    //                 )
    //                 ->groupBy('idcotizacion'),
    //             'x',
    //             fn($join) => $join->on('x.idcotizacion', '=', 'f.idcotizacion')
    //         )
    //         ->where(function ($q) {
    //             $q->where(function ($q2) {
    //                 $q2->whereNotNull('x.nofactura_activa')
    //                     ->whereColumn('f.nofactura', 'x.nofactura_activa');
    //             })->orWhere(function ($q2) {
    //                 $q2->whereNull('x.nofactura_activa')
    //                     ->whereColumn('f.nofactura', 'x.nofactura_ultima');
    //             });
    //         })
    //         ->select(
    //             'f.idcotizacion',
    //             'f.nofactura',
    //             'f.fecha_certificacion',
    //             'f.estado',
    //             'f.fecha_anulacion'
    //         );




    //     // Expresión reutilizable para certificación (nueva en fac o histórica en ac)
    //     $fechaCertExpr = DB::raw("DATE(COALESCE(fac.fecha_certificacion, ac.fecha_certificacion))");

    //     $esFacturada = !empty($filtros['estado']) && (int)$filtros['estado'] === 6;

    //     $selectCliente = $esFacturada
    //         ? DB::raw("
    //     CASE
    //         WHEN fac.fecha_anulacion IS NOT NULL THEN 'ANULADA'
    //         ELSE c.nombre
    //     END AS cliente
    // ")
    //         : DB::raw("c.nombre AS cliente");

    //     $selectTotal = $esFacturada
    //         ? DB::raw("
    //     CASE
    //         WHEN fac.fecha_anulacion IS NOT NULL THEN 0
    //         ELSE ac.total
    //     END AS total_general
    // ")
    //         : DB::raw("ac.total AS total_general");

    //     $selectFacturaAnulada = $esFacturada
    //         ? DB::raw("
    //     CASE
    //         WHEN fac.fecha_anulacion IS NOT NULL THEN 1
    //         ELSE 0
    //     END AS factura_anulada
    // ")
    //         : DB::raw("0 AS factura_anulada");


    //     $query = DB::table('adm_cotizacion as ac')
    //         // Evita duplicados: join contra el agregado
    //         ->leftJoinSub($facAgg, 'fac', function ($join) {
    //             $join->on('fac.idcotizacion', '=', 'ac.idcotizacion');
    //         })
    //         ->join('adm_empleados as ae', 'ac.idusuario', '=', 'ae.iduser')
    //         ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
    //         ->select(
    //             'ac.idcotizacion',
    //             DB::raw("CONCAT('CT', CAST(ac.nocotizacion AS CHAR)) AS nocotizacion"),
    //             'fac.nofactura as nointerno',
    //             DB::raw("
    //             CASE
    //                 WHEN ac.estado = 4 THEN DATE(ac.fecha_prefacturacion)
    //                 WHEN ac.estado IN (6,0) THEN DATE(COALESCE(fac.fecha_certificacion, ac.fecha_certificacion))
    //                 ELSE DATE(ac.fecha_cotizacion)
    //             END AS fecha_cotizacion
    //             "),
    //             'fac.nofactura AS nofactura',
    //             'ae.nombre AS vendedor',
    //             $selectCliente,
    //             $selectTotal,
    //             'ac.estado',
    //             $selectFacturaAnulada,
    //             DB::raw("
    //             COALESCE(
    //                 GREATEST(DATEDIFF(CURDATE(), DATE(ac.fecha_prefacturacion)), 0),
    //                 0
    //             ) AS dias_desde_prefacturacion
    //         ")
    //         )
    //         // ->where('ac.estado', '>', 0)

    //         // Opcional: si la tabla tiene fecha_anulacion en cotizaciones, exclúyelas
    //         ->when(
    //             Schema::hasColumn('adm_cotizacion', 'fecha_anulacion'),
    //             fn($q) => $q->whereNull('ac.fecha_anulacion')
    //         );

    //     // Estados visibles
    //     if (!empty($filtros['estado']) && (int)$filtros['estado'] === 6) {
    //         // Facturadas = cotizaciones que TIENEN factura
    //         $query->whereNotNull('fac.nofactura');
    //     } else {
    //         $query->where('ac.estado', '>', 0);
    //     }



    //     // Filtros
    //     $desde = $filtros['desde'] ?? null;
    //     $hasta = $filtros['hasta'] ?? null;

    //     if ($desde && $hasta) {
    //         if (!empty($filtros['estado']) && (int)$filtros['estado'] === 4) {
    //             $query->whereBetween(DB::raw('DATE(ac.fecha_prefacturacion)'), [$desde, $hasta]);
    //         } elseif (!empty($filtros['estado']) && (int)$filtros['estado'] === 6) {
    //             // Filtra por la fecha coalescida (fac válida o histórica en ac)
    //             $query->whereBetween(DB::raw('DATE(fac.fecha_certificacion)'), [$desde, $hasta]);
    //         } else {
    //             $query->whereBetween(DB::raw('DATE(ac.fecha_cotizacion)'), [$desde, $hasta]);
    //         }
    //     }

    //     if (!empty($filtros['vendedor_id'])) {
    //         $query->where('ae.id_empleado', $filtros['vendedor_id']);
    //     }

    //     // if (!empty($filtros['estado'])) {
    //     //     $query->where('ac.estado', (int)$filtros['estado']);
    //     // }
    //     if (!empty($filtros['estado']) && (int)$filtros['estado'] !== 6) {
    //         $query->where('ac.estado', (int)$filtros['estado']);
    //     }


    //     if (!empty($filtros['search'])) {
    //         $query->where(function ($q) use ($filtros) {
    //             $q->where('ac.nocotizacion', 'like', '%' . $filtros['search'] . '%')
    //                 ->orWhere('c.nombre', 'like', '%' . $filtros['search'] . '%');
    //         });
    //     }

    //     //$query->orderBy('fecha_cotizacion', 'asc'); // alias del SELECT

    //     // 🔽 ORDENAMIENTO
    //     if (!empty($filtros['estado']) && (int)$filtros['estado'] === 6) {
    //         // FACTURADAS → ordenar por número interno
    //         $query
    //             ->orderByRaw('fac.nofactura IS NULL') // NULLs al final
    //             ->orderBy('fac.nofactura', 'asc');
    //     } else {
    //         // Cualquier otro estado → ordenar por fecha
    //         $query->orderBy('fecha_cotizacion', 'asc');
    //     }


    //     return $query;
    // }

    private function construirConsultaCotizaciones(array $filtros)
    {
        $esFacturada = !empty($filtros['estado']) && (int)$filtros['estado'] === 6;

        /* =====================================================
     * CASO 1: ESTADO = 6 (FACTURADAS)
     * → Reporte POR FACTURA (no por cotización)
     * ===================================================== */
        if ($esFacturada) {

            $query = DB::table('adm_cotizacion as ac')
                ->join('adm_facturacion as fac', 'fac.idcotizacion', '=', 'ac.idcotizacion')
                ->join('adm_empleados as ae', 'ac.idusuario', '=', 'ae.iduser')
                ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
                ->select(
                    'ac.idcotizacion',
                    DB::raw("CONCAT('CT', CAST(ac.nocotizacion AS CHAR)) AS nocotizacion"),
                    'fac.nofactura AS nointerno',
                    DB::raw("DATE(fac.fecha_certificacion) AS fecha_cotizacion"),
                    'fac.nofactura',
                    'ae.nombre AS vendedor',
                    DB::raw("
                    CASE
                        WHEN fac.estado = 0 THEN 'ANULADA'
                        ELSE c.nombre
                    END AS cliente
                "),
                    DB::raw("
                    CASE
                        WHEN fac.estado = 0 THEN 0
                        ELSE ac.total
                    END AS total_general
                "),
                    DB::raw("6 AS estado"),
                    DB::raw("
                    CASE
                        WHEN fac.estado = 0 THEN 1
                        ELSE 0
                    END AS factura_anulada
                "),
                    DB::raw("
                    COALESCE(
                        GREATEST(DATEDIFF(CURDATE(), DATE(ac.fecha_prefacturacion)), 0),
                        0
                    ) AS dias_desde_prefacturacion
                ")
                )
                ->whereIn('fac.estado', [0, 1]);

            // Excluir cotizaciones anuladas (si existe el campo)
            if (Schema::hasColumn('adm_cotizacion', 'fecha_anulacion')) {
                $query->whereNull('ac.fecha_anulacion');
            }

            // Filtro de fechas (por factura)
            if (!empty($filtros['desde']) && !empty($filtros['hasta'])) {
                $query->whereBetween(
                    DB::raw('DATE(fac.fecha_certificacion)'),
                    [$filtros['desde'], $filtros['hasta']]
                );
            }

            // Filtro vendedor
            if (!empty($filtros['vendedor_id'])) {
                $query->where('ae.id_empleado', $filtros['vendedor_id']);
            }

            // Búsqueda
            if (!empty($filtros['search'])) {
                $query->where(function ($q) use ($filtros) {
                    $q->where('fac.nofactura', 'like', '%' . $filtros['search'] . '%')
                        ->orWhere('c.nombre', 'like', '%' . $filtros['search'] . '%')
                        ->orWhere('ac.nocotizacion', 'like', '%' . $filtros['search'] . '%');
                });
            }

            // Orden por correlativo
            $query->orderBy('fac.nofactura', 'asc');

            return $query;
        }

        /* =====================================================
     * CASO 2: CUALQUIER OTRO ESTADO
     * → Reporte POR COTIZACIÓN (lógica original)
     * ===================================================== */

        $facAgg = DB::table('adm_facturacion')
            ->select(
                'idcotizacion',
                DB::raw('MIN(fecha_certificacion) AS fecha_certificacion'),
                DB::raw('MAX(nofactura) AS nofactura')
            )
            ->groupBy('idcotizacion');

        $query = DB::table('adm_cotizacion as ac')
            ->leftJoinSub($facAgg, 'fac', fn($j) => $j->on('fac.idcotizacion', '=', 'ac.idcotizacion'))
            ->join('adm_empleados as ae', 'ac.idusuario', '=', 'ae.iduser')
            ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
            ->select(
                'ac.idcotizacion',
                DB::raw("CONCAT('CT', CAST(ac.nocotizacion AS CHAR)) AS nocotizacion"),
                'fac.nofactura AS nointerno',
                DB::raw("
                CASE
                    WHEN ac.estado = 4 THEN DATE(ac.fecha_prefacturacion)
                    ELSE DATE(ac.fecha_cotizacion)
                END AS fecha_cotizacion
            "),
                'fac.nofactura',
                'ae.nombre AS vendedor',
                'c.nombre AS cliente',
                'ac.total AS total_general',
                'ac.estado',
                DB::raw("0 AS factura_anulada"),
                DB::raw("
                COALESCE(
                    GREATEST(DATEDIFF(CURDATE(), DATE(ac.fecha_prefacturacion)), 0),
                    0
                ) AS dias_desde_prefacturacion
            ")
            );

        if (Schema::hasColumn('adm_cotizacion', 'fecha_anulacion')) {
            $query->whereNull('ac.fecha_anulacion');
        }

        if (!empty($filtros['estado'])) {
            $query->where('ac.estado', (int)$filtros['estado']);

            // 🔴 CLAVE: estado 4 SOLO si tiene fecha de pre-facturación
            if ((int)$filtros['estado'] === 4) {
                $query->whereNotNull('ac.fecha_prefacturacion');
            }
        }

        if (!empty($filtros['desde']) && !empty($filtros['hasta'])) {
            $query->whereBetween(
                DB::raw('DATE(ac.fecha_cotizacion)'),
                [$filtros['desde'], $filtros['hasta']]
            );
        }

        if (!empty($filtros['vendedor_id'])) {
            $query->where('ae.id_empleado', $filtros['vendedor_id']);
        }

        if (!empty($filtros['search'])) {
            $query->where(function ($q) use ($filtros) {
                $q->where('ac.nocotizacion', 'like', '%' . $filtros['search'] . '%')
                    ->orWhere('c.nombre', 'like', '%' . $filtros['search'] . '%');
            });
        }

        $query->orderBy('fecha_cotizacion', 'asc');

        return $query;
    }

    /**
     * Construye el query base con buckets de antigüedad.
     * - Días transcurridos = max(DATEDIFF(fecha_reporte, fecha_vencimiento), 0)
     * - Buckets: 0-30, 31-60, 61-90, >90 en función de días transcurridos.
     */
    protected function baseQuery(Carbon $fechaReporte)
    {
        $fecha = $fechaReporte->toDateString();

        return DB::table('adm_cuentas_porcobrar as cxc')
            ->join('clientes as cli', 'cli.idcliente', '=', 'cxc.idcliente')
            ->leftJoin('adm_cotizacion as cot', 'cot.idcotizacion', '=', 'cxc.idcotizacion')
            ->leftJoin('adm_facturacion as fac', function ($join) {
                $join->on('cot.idcotizacion', '=', 'fac.idcotizacion')
                    ->where('fac.estado', '>', 0); // ← evita tomar facturas estado 0
            })
            ->leftJoin('adm_departamentopais as dep', 'dep.iddepartamentopais', '=', 'cli.iddepartamento')
            ->leftJoin('adm_empleados as emp', 'emp.iduser', '=', 'cot.idusuario')
            ->selectRaw("
                cli.idcliente,
                cli.nombre as cliente,
                cli.nit,
                dep.iddepartamentopais as iddepartamento,
                dep.nombre as departamento,
                emp.id_empleado,
                emp.nombre as vendedor,
                cot.idcotizacion,
                cot.nocotizacion,
                fac.nofactura,
                fac.numero,
                'FCAM' as tipo,
                cxc.idcuentaporcobrar,
                cxc.fecha_emision,
                cxc.fecha_vencimiento,
                cxc.moneda,
                cxc.monto_original,
                cxc.saldo_pendiente,
                cxc.monto_pagado,
                GREATEST(DATEDIFF(?, cxc.fecha_vencimiento), 0) as dias_transcurridos,
                CASE
                    WHEN GREATEST(DATEDIFF(?, cxc.fecha_vencimiento), 0) BETWEEN 0 AND 30 THEN cxc.saldo_pendiente
                    ELSE 0
                END as bucket_0_30,
                CASE
                    WHEN GREATEST(DATEDIFF(?, cxc.fecha_vencimiento), 0) BETWEEN 31 AND 60 THEN cxc.saldo_pendiente
                    ELSE 0
                END as bucket_31_60,
                CASE
                    WHEN GREATEST(DATEDIFF(?, cxc.fecha_vencimiento), 0) BETWEEN 61 AND 90 THEN cxc.saldo_pendiente
                    ELSE 0
                END as bucket_61_90,
                CASE
                    WHEN GREATEST(DATEDIFF(?, cxc.fecha_vencimiento), 0) > 90 THEN cxc.saldo_pendiente
                    ELSE 0
                END as bucket_mas_90
            ", [$fecha, $fecha, $fecha, $fecha, $fecha]);
    }

    protected function buildCarteraData(Request $request): array
    {
        $request->validate([
            'departamento_id' => 'nullable|integer',
            'vendedor_id'     => 'nullable|integer',
            'fecha_reporte'   => 'nullable|date_format:Y-m-d',
        ]);

        $fechaReporte = Carbon::parse($request->get('fecha_reporte', now()->toDateString()));
        $q = $this->baseQuery($fechaReporte);

        if ($request->filled('departamento_id')) {
            $q->where('dep.iddepartamentopais', $request->integer('departamento_id'));
        }
        if ($request->filled('vendedor_id')) {
            $q->where('emp.id_empleado', $request->integer('vendedor_id'));
        }

        $q->where('cxc.saldo_pendiente', '>', 0);
        $q->where("cxc.estado", ">", "0"); // Solo CxC activas

        // DEBUG
        // Log::info('SQL CARTERA', [
        //     'sql' => $q->toSql(),
        //     'bindings' => $q->getBindings()
        // ]);


        $rows = $q->orderBy('cli.nombre')
            ->orderBy('cxc.fecha_vencimiento')
            ->get();

        $grupos = $rows->groupBy('idcliente')->map(function ($items) {
            $first = $items->first();
            return [
                'idcliente'    => $first->idcliente,
                'cliente'      => $first->cliente,
                'nit'          => $first->nit,
                'departamento' => $first->departamento,
                'vendedor'     => $first->vendedor,
                'items'        => $items, // ← Collection de objetos, no array
                'totales'      => [
                    'saldo'    => $items->sum('saldo_pendiente'),
                    'b_0_30'   => $items->sum('bucket_0_30'),
                    'b_31_60'  => $items->sum('bucket_31_60'),
                    'b_61_90'  => $items->sum('bucket_61_90'),
                    'b_mas_90' => $items->sum('bucket_mas_90'),
                ],
            ];
        })->values();

        $totalesGenerales = [
            'saldo'    => $rows->sum('saldo_pendiente'),
            'b_0_30'   => $rows->sum('bucket_0_30'),
            'b_31_60'  => $rows->sum('bucket_31_60'),
            'b_61_90'  => $rows->sum('bucket_61_90'),
            'b_mas_90' => $rows->sum('bucket_mas_90'),
        ];

        $encabezado = [
            'empresa'       => 'GP Excelencia',
            'titulo'        => 'CARTERA GENERAL DE CLIENTES',
            'fecha_reporte' => $fechaReporte->format('d-m-Y'),
            'departamento'  => $request->filled('departamento_id')
                ? optional($rows->first())->departamento ?? 'Filtrado'
                : 'Todos',
            'vendedor'      => $request->filled('vendedor_id')
                ? optional($rows->first())->vendedor ?? 'Filtrado'
                : 'Todos',
        ];

        return [
            'encabezado'        => $encabezado,
            'grupos'            => $grupos,
            'totales_generales' => $totalesGenerales,
        ];
    }

    public function index(Request $request)
    {
        return response()->json($this->buildCarteraData($request));
    }

    public function html(Request $request)
    {
        $data = $this->buildCarteraData($request);
        return response()
            ->view('reportes.cartera', $data)
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }


    public function pdf(Request $request)
    {
        $data = $this->buildCarteraData($request);

        // Opciones vía querystring: ?landscape=1&break_por_cliente=1
        $landscape = $request->boolean('landscape');
        $breakPorCliente = $request->boolean('break_por_cliente');

        // Pásalas a la vista
        $data['opciones'] = [
            'landscape' => $landscape,
            'break_por_cliente' => $breakPorCliente,
        ];

        $html = view('reportes.cartera', $data)->render();

        $pdf = Pdf::loadHTML($html)
            ->setPaper('letter', $landscape ? 'landscape' : 'portrait');

        $filename = sprintf(
            'cartera_%s.pdf',
            $data['encabezado']['fecha_reporte']
        );

        return $pdf->download($filename);
    }

    /**
     * Genera PDF de cotizaciones (prefacturación) filtrado por fecha y vendedor.
     * Request esperado: { desde: Y-m-d, hasta: Y-m-d, vendedor_id?: int }
     */
    public function cotizacionesPrefacturacionPdf(Request $request)
    {
        $request->validate([
            'desde'       => 'required|date',
            'hasta'       => 'required|date|after_or_equal:desde',
            'vendedor_id' => 'nullable|integer|exists:adm_empleados,id_empleado',
        ]);

        $desde = $request->date('desde')->toDateString();
        $hasta = $request->date('hasta')->toDateString();
        $vendedorId = $request->input('vendedor_id');

        $rows = DB::table('adm_cotizacion as ac')
            ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
            ->join('adm_tipo_pago as atp', 'ac.idtipopago', '=', 'atp.idtipopago')
            ->leftJoin('adm_empleados as ae', 'ac.idusuario', '=', 'ae.iduser')
            ->selectRaw("
            ac.idcotizacion,
            CONCAT('CT', ac.nocotizacion) as nocotizacion,
            ac.nofactura,
            DATE(ac.fecha_prefacturacion) as fecha_prefacturacion,
            ac.total_general as total,
            atp.tipo as tipo_pago,
            c.nombre as cliente,
            ae.nombre as vendedor,
            CASE
                WHEN ac.estado = 1 THEN 'REGISTRO'
                WHEN ac.estado = 2 THEN 'COSTEO'
                WHEN ac.estado = 3 THEN 'COSTEADA'
                WHEN ac.estado = 4 THEN 'PRE-FACTURACION'
                WHEN ac.estado = 5 THEN 'PARA FACTURAR'
                WHEN ac.estado = 6 THEN 'FACTURADA'
                WHEN ac.estado = 7 THEN 'ANULADA'
                WHEN ac.estado = 8 THEN 'RECHAZADA'
                ELSE 'NO APLICA'
            END as estado
        ")
            ->whereBetween(DB::raw('DATE(ac.fecha_prefacturacion)'), [$desde, $hasta])
            ->when($vendedorId, function ($q) use ($vendedorId) {
                $q->where('ae.id_empleado', $vendedorId);
            })
            ->orderBy('fecha_prefacturacion')
            ->orderBy('nocotizacion')
            ->get();

        // Datos de encabezado para la vista
        $encabezado = [
            'titulo' => 'REPORTE DE COTIZACIONES (PREFacturación)',
            'rango'  => sprintf('%s a %s', $desde, $hasta),
            'vendedor' => $vendedorId
                ? optional(DB::table('adm_empleados')->where('id_empleado', $vendedorId)->first())->nombre
                : 'Todos',
            'generado' => now()->format('Y-m-d H:i'),
        ];

        $html = view('reportes.cotizaciones_prefacturacion', [
            'rows' => $rows,
            'encabezado' => $encabezado,
            'totales' => [
                'total_general' => $rows->sum('total'),
                'conteo' => $rows->count(),
            ],
        ])->render();

        $pdf = Pdf::loadHTML($html)->setPaper('letter', 'portrait');

        $filename = sprintf(
            'cotizaciones_prefacturacion_%s_%s.pdf',
            str_replace('-', '', $desde),
            str_replace('-', '', $hasta)
        );

        // Puedes usar ->stream($filename) si prefieres abrir directamente en el navegador.
        return $pdf->download($filename);
    }

    public function cotizacionesPrefacturacionData(Request $request)
    {
        $request->validate([
            'desde'       => 'required|date',
            'hasta'       => 'required|date|after_or_equal:desde',
            'vendedor_id' => 'nullable|integer|exists:adm_empleados,id_empleado',
        ]);

        $desde = $request->date('desde')->toDateString();
        $hasta = $request->date('hasta')->toDateString();
        $vendedorId = $request->integer('vendedor_id');

        $rows = DB::table('adm_cotizacion as ac')
            ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
            ->join('adm_tipo_pago as atp', 'ac.idtipopago', '=', 'atp.idtipopago')
            ->leftJoin('adm_empleados as ae', 'ac.idusuario', '=', 'ae.iduser')
            ->selectRaw("
            ac.idcotizacion,
            CONCAT('CT', ac.nocotizacion) as nocotizacion,
            ac.nofactura,
            DATE(ac.fecha_prefacturacion) as fecha_prefacturacion,
            ac.total as total,
            atp.tipo as tipo_pago,
            c.nombre as cliente,
            ae.nombre as vendedor,
            CASE
                WHEN ac.estado = 1 THEN 'REGISTRO'
                WHEN ac.estado = 2 THEN 'COSTEO'
                WHEN ac.estado = 3 THEN 'COSTEADA'
                WHEN ac.estado = 4 THEN 'PRE-FACTURACION'
                WHEN ac.estado = 5 THEN 'PARA FACTURAR'
                WHEN ac.estado = 6 THEN 'FACTURADA'
                WHEN ac.estado = 7 THEN 'ANULADA'
                WHEN ac.estado = 8 THEN 'RECHAZADA'
                ELSE 'NO APLICA'
            END as estado
        ")
            ->whereBetween(DB::raw('DATE(ac.fecha_prefacturacion)'), [$desde, $hasta])
            ->where('ac.estado', '>', 0)
            ->when($vendedorId, fn($q) => $q->where('ae.id_empleado', $vendedorId))
            ->orderBy('fecha_prefacturacion')
            ->orderBy('nocotizacion')
            ->get();

        $vendedorNombre = $vendedorId
            ? optional(DB::table('adm_empleados')->where('id_empleado', $vendedorId)->first())->nombre
            : 'Todos';

        return response()->json([
            'encabezado' => [
                'titulo'   => 'REPORTE DE COTIZACIONES (PREFACTURACIÓN)',
                'rango'    => sprintf('%s a %s', $desde, $hasta),
                'vendedor' => $vendedorNombre,
                'generado' => now()->format('Y-m-d H:i'),
            ],
            'rows' => $rows,
            'totales' => [
                'total_general' => $rows->sum('total'),
                'conteo'        => $rows->count(),
            ],
        ]);
    }

    /**
     * Devuelve la data agrupada por Cliente → Recibo → CxC afectadas
     * Filtra por rango [fecha_inicio, fecha_fin] aplicado a rec.fecha_recibo
     */
    public function resumenFacturasPagadasData(Request $request)
    {
        $validated = $request->validate([
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin' => ['required', 'date', 'after_or_equal:fecha_inicio'],
        ]);


        $start = $validated['fecha_inicio'];
        $end = $validated['fecha_fin'];
        $tipo = $request->input('tipo', 'TODO');


        $rows = $this->buildResumenQuery($start, $end, $tipo)->get();
        $grouped = $this->groupRows($rows);

        return response()->json([
            'rango' => ['inicio' => $start, 'fin' => $end],
            'clientes' => array_values($grouped['clientes']),
            'total_general' => $grouped['total_general'],
        ]);
    }

    /**
     * Genera el PDF del resumen.
     */
    public function resumenFacturasPagadasPdf(Request $request)
    {
        $request->validate([
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin' => ['required', 'date', 'after_or_equal:fecha_inicio'],
        ]);


        $start = $request->input('fecha_inicio');
        $end = $request->input('fecha_fin');
        $tipo = $request->input('tipo', 'TODO');


        $rows = $this->buildResumenQuery($start, $end, $tipo)->get();
        $grouped = $this->groupRows($rows);


        // Fecha/hora impresión en zona GT
        $impreso_en = Carbon::now('America/Guatemala')->format('d/m/Y H:i');


        $pdf = Pdf::loadView('pdf.resumen_facturas_pagadas', [
            'rango' => ['inicio' => $start, 'fin' => $end],
            'clientes' => array_values($grouped['clientes']),
            'total_general' => $grouped['total_general'],
            'impreso_en' => $impreso_en,
            'titulo' => 'RESUMEN DE FACTURAS PAGADAS',
        ])->setPaper('letter', 'portrait');


        return $pdf->download('resumen_facturas_pagadas_' . now('America/Guatemala')->format('Ymd_His') . '.pdf');
        // Si prefieres ver en el navegador:
        // return $pdf->stream('resumen_facturas_pagadas.pdf');
    }


    /**
     * Query base para el reporte.
     * Une: recibo → cliente → cxc → facturación.
     */
    private function buildResumenQuery(string $start, string $end, string $tipo)
    {
        // Detecta la tabla real del detalle (adm_recibo_detalle o adm_detalle_recibo)
        $tableDet = null;
        if (Schema::hasTable('adm_recibo_detalle')) {
            $tableDet = 'adm_recibo_detalle';
        } elseif (Schema::hasTable('adm_detalle_recibo')) {
            $tableDet = 'adm_detalle_recibo';
        } else {
            abort(500, 'No existe tabla de detalle de recibo (adm_recibo_detalle / adm_detalle_recibo).');
        }

        // Campos opcionales en adm_recibos: serie/numero
        $serieExpr  = DB::raw("COALESCE(rec.serie, '') as serie");
        $numeroExpr = DB::raw("COALESCE(rec.numero, '') as numero");

        // Detecta la columna de monto aplicada en el detalle
        $detAmountCol = null;
        foreach (['monto_aplicado', 'monto_pagado', 'pago', 'monto'] as $col) {
            if (Schema::hasColumn($tableDet, $col)) {
                $detAmountCol = "det.$col";
                break;
            }
        }
        // Fallback: usa cxc.monto_pagado si existiera
        if (!$detAmountCol && Schema::hasColumn('adm_cuentas_porcobrar', 'monto_pagado')) {
            $detAmountCol = 'cxc.monto_pagado';
        }
        // Si nada existe, al menos que no rompa
        $amountExpr = DB::raw("COALESCE($detAmountCol, 0) as monto_pagado");

        $query = DB::table('adm_recibos as rec')
            ->join('clientes as cl', 'cl.idcliente', '=', 'rec.idcliente')
            // 👉 Enlace por detalle
            ->join($tableDet . ' as det', 'det.idrecibo', '=', 'rec.idrecibo')
            ->join('adm_cuentas_porcobrar as cxc', 'cxc.idcuentaporcobrar', '=', 'det.idcuentaporcobrar')
            ->leftJoin('adm_facturacion as fac', 'fac.idfactura', '=', 'cxc.idfactura')
            ->whereBetween('rec.fecha_recibo', [$start, $end])
            ->where('rec.estado', '<>', 0)
            ->when($tipo && $tipo !== 'TODO', function ($q) use ($tipo) {
                $q->where('rec.tipo', $tipo);
            })
            ->select([
                'cl.idcliente',
                'cl.codigo as cliente_codigo',
                'cl.nombre as cliente_nombre',
                'rec.idrecibo',
                'rec.fecha_recibo',
                $serieExpr,
                $numeroExpr,
                'cxc.idcuentaporcobrar',
                'cxc.fecha_emision',
                DB::raw("COALESCE(fac.nofactura, '') as nointerno"),
                $amountExpr, // 👈 monto desde el detalle (o fallback)
            ])
            ->orderBy('cl.codigo')
            ->orderBy('rec.fecha_recibo')
            ->orderBy('rec.idrecibo');

        //log::info('Resumen Facturas Pagadas Query:', ['start' => $start, 'end' => $end, 'query' => $query->toSql(), 'bindings' => $query->getBindings()]);

        return $query;
    }


    /**
     * Agrupa filas en la estructura: Cliente → Recibo → Detalles CxC
     */
    private function groupRows($rows): array
    {
        $clientes = [];
        $totalGeneral = 0.0;


        foreach ($rows as $r) {
            $cid = $r->idcliente;
            if (!isset($clientes[$cid])) {
                $clientes[$cid] = [
                    'idcliente' => $cid,
                    'codigo' => $r->cliente_codigo,
                    'nombre' => $r->cliente_nombre,
                    'recibos' => [],
                    'total_cliente' => 0.0,
                ];
            }


            $recKey = $r->idrecibo;
            if (!isset($clientes[$cid]['recibos'][$recKey])) {
                $clientes[$cid]['recibos'][$recKey] = [
                    'idrecibo' => $r->idrecibo,
                    'fecha_recibo' => $r->fecha_recibo,
                    'serie' => $r->serie,
                    'numero' => $r->numero,
                    'detalles' => [],
                    'total_recibo' => 0.0,
                ];
            }


            $detalle = [
                'idcuentaporcobrar' => $r->idcuentaporcobrar,
                'fecha_emision' => $r->fecha_emision,
                'nointerno' => $r->nointerno,
                'monto_pagado' => (float)$r->monto_pagado,
            ];
            $clientes[$cid]['recibos'][$recKey]['detalles'][] = $detalle;


            $clientes[$cid]['recibos'][$recKey]['total_recibo'] += (float)$r->monto_pagado;
            $clientes[$cid]['total_cliente'] += (float)$r->monto_pagado;
            $totalGeneral += (float)$r->monto_pagado;
        }


        // Normaliza índices (recibos como arrays consecutivos)
        foreach ($clientes as $cid => $cData) {
            $clientes[$cid]['recibos'] = array_values($cData['recibos']);
        }


        return [
            'clientes' => $clientes,
            'total_general' => $totalGeneral,
        ];
    }

    //REPORTE DE VENTAS POR VENDEDOR
    /**
     * Devuelve los datos agregados por vendedor → cliente
     */
    public function VentasPorVendedor(Request $request)
    {
        $request->validate([
            'desde' => 'required|date',
            'hasta' => 'required|date',
            'vendedor_id' => 'nullable|integer|exists:adm_empleados,id_empleado',
        ]);

        $desde = $request->input('desde');
        $hasta = $request->input('hasta');
        $vendedorId = $request->input('vendedor_id');

        // Consulta agregada
        $rows = DB::table('adm_cotizacion as ac')
            ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
            ->join('users as u', 'ac.idusuario', '=', 'u.id')
            ->join('adm_empleados as e', 'u.id', '=', 'e.iduser')
            ->select(
                'e.id_empleado as vendedor_id',
                'e.nombre as vendedor_nombre',
                'c.idcliente as cliente_id',
                'c.nit as cliente_codigo',
                'c.nombre as cliente_nombre',
                DB::raw('SUM(ac.total) as total_ventas')
            )
            ->whereIn('ac.estado', [4, 5, 6])
            ->whereNotNull('ac.fecha_prefacturacion')
            ->whereBetween(DB::raw('DATE(ac.fecha_prefacturacion)'), [$desde, $hasta])
            ->when($vendedorId, fn($q) => $q->where('e.id_empleado', $vendedorId))
            ->groupBy('e.id_empleado', 'e.nombre', 'c.idcliente', 'c.nit', 'c.nombre')
            ->orderBy('e.nombre')
            ->get();

        // Reestructura agrupado por vendedor
        $agrupado = $rows->groupBy('vendedor_id')->map(function ($rowsByVendedor, $vendedorId) {
            $first = $rowsByVendedor->first();
            return (object)[
                'vendedor_id' => $vendedorId,
                'vendedor_nombre' => $first->vendedor_nombre,
                'clientes' => $rowsByVendedor->map(fn($r) => (object)[
                    'cliente_id' => $r->cliente_id,
                    'codigo' => $r->cliente_codigo,
                    'nombre' => $r->cliente_nombre,
                    'total_ventas' => (float)$r->total_ventas,
                ])->values(),
                'total_por_vendedor' => $rowsByVendedor->sum(fn($r) => (float)$r->total_ventas),
            ];
        })->values();

        $total_general = $rows->sum(fn($r) => (float)$r->total_ventas);

        $encabezado = [
            'empresa' => 'GP Excelencia',
            'titulo' => 'REPORTE DE VENTAS POR CLIENTE',
            'periodo' => sprintf('%s a %s', $desde, $hasta),
            'fecha_impresion' => Carbon::now()->format('Y-m-d H:i:s'),
        ];

        return response()->json([
            'encabezado' => $encabezado,
            'data' => $agrupado,
            'total_general' => $total_general,
        ]);
    }

    /**
     * Exportar a Excel
     */
    public function exportVentasVendedorExcel(Request $request)
    {
        $request->validate([
            'desde' => 'required|date',
            'hasta' => 'required|date',
            'vendedor_id' => 'nullable|integer|exists:adm_empleados,id_empleado',
        ]);

        return Excel::download(new \App\Exports\VentasPorClienteExport($request->all()), 'ventas_por_cliente.xlsx');
    }

    /**
     * Exportar a PDF (generado desde Blade)
     */
    public function exportVentasVendedorPdf(Request $request)
    {
        $request->validate([
            'desde' => 'required|date',
            'hasta' => 'required|date',
            'vendedor_id' => 'nullable|integer|exists:adm_empleados,id_empleado',
        ]);

        // Reusar los datos agrupados
        $resp = $this->VentasPorVendedor($request);
        $json = $resp->getData();

        // Contar vendedores y clientes
        $totalVendedores = count($json->data);
        $totalClientes = collect($json->data)->sum(fn($v) => count($v->clientes));

        // Paleta multicolor
        $colors = [
            '#F44336',
            '#E91E63',
            '#9C27B0',
            '#673AB7',
            '#3F51B5',
            '#2196F3',
            '#03A9F4',
            '#00BCD4',
            '#009688',
            '#4CAF50',
            '#8BC34A',
            '#CDDC39',
            '#FFC107',
            '#FF9800',
            '#FF5722',
            '#795548',
            '#607D8B',
            '#9E9E9E'
        ];

        // 🔹 Generar una gráfica por vendedor
        $graficasPorVendedor = [];
        foreach ($json->data as $vendedor) {
            $clientes = collect($vendedor->clientes)
                ->sortByDesc('total_ventas')
                ->values();

            $labels = $clientes->pluck('nombre')->values();
            $data = $clientes->pluck('total_ventas')->values();

            // 🔸 Configuración de la gráfica
            $chartConfig = [
                'type' => 'bar',
                'data' => [
                    'labels' => $labels,
                    'datasets' => [[
                        'label' => 'Total Ventas (Q)',
                        'data' => $data,
                        'backgroundColor' => array_slice($colors, 0, count($labels)),
                    ]],
                ],
                'options' => [
                    'indexAxis' => count($labels) > 10 ? 'y' : 'x',
                    'plugins' => [
                        'legend' => ['position' => 'bottom'],
                        'title' => [
                            'display' => true,
                            'text' => "Ventas por Cliente - {$vendedor->vendedor_nombre}",
                            'font' => ['size' => 16],
                        ],
                        // ✅ Mostrar los valores sobre las barras
                        'datalabels' => [
                            'anchor' => 'end',
                            'align' => 'top',
                            'color' => '#000',
                            'font' => ['size' => 10],
                            'formatter' => 'function(value) {
                            return value.toLocaleString("es-GT", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            });
                        }',
                        ],
                    ],
                    'responsive' => true,
                    'maintainAspectRatio' => false,
                    'scales' => [
                        'x' => ['title' => ['display' => true, 'text' => 'Clientes']],
                        'y' => [
                            'title' => ['display' => true, 'text' => 'Monto (Q)'],
                            'ticks' => [
                                'callback' => 'function(value){return value.toLocaleString();}',
                            ],
                        ],
                    ],
                ],
                'plugins' => [
                    // Activa el plugin datalabels para QuickChart
                    'datalabels' => true
                ]
            ];

            $chartUrl = 'https://quickchart.io/chart?width=1100&height=700&devicePixelRatio=2&c='
                . urlencode(json_encode($chartConfig));

            try {
                $graficasPorVendedor[$vendedor->vendedor_nombre] = base64_encode(file_get_contents($chartUrl));
            } catch (\Exception $e) {
                $graficasPorVendedor[$vendedor->vendedor_nombre] = null;
            }
        }

        // Renderizar la vista
        $html = view('reportes.ventas_por_cliente_pdf', [
            'encabezado' => (array)$json->encabezado,
            'agrupado' => $json->data,
            'total_general' => $json->total_general,
            'graficasPorVendedor' => $graficasPorVendedor,
        ])->render();

        // 📄 Orientación automática
        $orientation = ($totalVendedores > 1 || $totalClientes > 15) ? 'landscape' : 'portrait';

        $pdf = Pdf::loadHTML($html)
            ->setPaper('letter', $orientation);

        $filename = 'ventas_por_cliente_' . now()->format('Ymd_His') . '.pdf';
        return $pdf->download($filename);
    }

    public function resumenFacturasPagadasPorReciboPdf(Request $request)
    {
        $request->validate([
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin' => ['required', 'date', 'after_or_equal:fecha_inicio'],
        ]);

        $start = $request->input('fecha_inicio');
        $end   = $request->input('fecha_fin');
        $tipo  = $request->input('tipo', 'TODO');

        // reutilizamos el mismo query base (perfecto como está)
        $rows = $this->buildResumenQuery($start, $end, $tipo)->get();

        $grouped = $this->groupRowsByRecibo($rows);

        $impreso_en = Carbon::now('America/Guatemala')->format('d/m/Y H:i');

        $pdf = Pdf::loadView('pdf.resumen_facturas_pagadas_por_recibo', [
            'rango' => ['inicio' => $start, 'fin' => $end],
            'recibos' => array_values($grouped['recibos']),
            'total_general' => $grouped['total_general'],
            'impreso_en' => $impreso_en,
            'titulo' => 'RESUMEN DE FACTURAS PAGADAS POR RECIBO',
        ])->setPaper('letter', 'portrait');

        return $pdf->download(
            'resumen_facturas_pagadas_por_recibo_' . now('America/Guatemala')->format('Ymd_His') . '.pdf'
        );
    }

    private function groupRowsByRecibo($rows): array
    {
        $recibos = [];
        $totalGeneral = 0.0;

        foreach ($rows as $r) {
            $rid = $r->idrecibo;

            if (!isset($recibos[$rid])) {
                $recibos[$rid] = [
                    'idrecibo' => $rid,
                    'fecha_recibo' => $r->fecha_recibo,
                    'serie' => $r->serie,
                    'numero' => $r->numero,
                    'cliente_codigo' => $r->cliente_codigo,
                    'cliente_nombre' => $r->cliente_nombre,
                    'detalles' => [],
                    'total_recibo' => 0.0,
                ];
            }

            $recibos[$rid]['detalles'][] = [
                'fecha_emision' => $r->fecha_emision,
                'nointerno' => $r->nointerno,
                'monto_pagado' => (float)$r->monto_pagado,
            ];

            $recibos[$rid]['total_recibo'] += (float)$r->monto_pagado;
            $totalGeneral += (float)$r->monto_pagado;
        }

        // 🔥 ORDENAR POR NÚMERO DE RECIBO
        usort($recibos, fn($a, $b) => strcmp($a['numero'], $b['numero']));

        return [
            'recibos' => $recibos,
            'total_general' => $totalGeneral,
        ];
    }
}
