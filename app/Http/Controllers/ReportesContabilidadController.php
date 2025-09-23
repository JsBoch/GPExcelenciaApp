<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\CotizacionesContabilidadExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

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

    private function construirConsultaCotizaciones(array $filtros)
{
    $query = DB::table('adm_cotizacion as ac')
        ->select(
            'ac.idcotizacion',
            DB::raw("CONCAT('CT', CAST(ac.nocotizacion AS CHAR)) AS nocotizacion"),

            // La fecha que se mostrará en la columna "Fecha" (como ya la tenías)
            DB::raw("
                CASE
                    WHEN ac.estado = 4 THEN DATE(ac.fecha_prefacturacion)
                    WHEN ac.estado = 6 THEN DATE(ac.fecha_certificacion)
                    ELSE DATE(ac.fecha_cotizacion)
                END AS fecha_cotizacion
            "),

            'ae.nombre AS vendedor',
            'c.nombre AS cliente',
            'ac.total_general',
            'ac.estado',

            // ✅ DÍAS DESDE PRE-FACTURACIÓN: solo si existe la fecha; si no, 0.
            DB::raw("
                COALESCE(
                    GREATEST(DATEDIFF(CURDATE(), DATE(ac.fecha_prefacturacion)), 0),
                    0
                ) AS dias_desde_prefacturacion
            ")
        )
        ->join('adm_empleados as ae', 'ac.idusuario', '=', 'ae.iduser')
        ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
        ->where('ac.estado', '>', 0);

    // Filtro de rango por la columna adecuada (igual que lo tenías)
    $desde = $filtros['desde'] ?? null;
    $hasta = $filtros['hasta'] ?? null;

    if ($desde && $hasta) {
        if (!empty($filtros['estado']) && (int)$filtros['estado'] === 4) {
            $query->whereBetween(DB::raw('DATE(ac.fecha_prefacturacion)'), [$desde, $hasta]);
        } elseif (!empty($filtros['estado']) && (int)$filtros['estado'] === 6) {
            $query->whereBetween(DB::raw('DATE(ac.fecha_certificacion)'), [$desde, $hasta]);
        } else {
            $query->whereBetween(DB::raw('DATE(ac.fecha_cotizacion)'), [$desde, $hasta]);
        }
    }

    if (!empty($filtros['vendedor_id'])) {
        $query->where('ae.id_empleado', $filtros['vendedor_id']);
    }

    if (!empty($filtros['estado'])) {
        $query->where('ac.estado', (int)$filtros['estado']);
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
                cot.nofactura,
                cot.numero,
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
            'fecha_reporte' => $fechaReporte->format('Y-m-d'),
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
}
