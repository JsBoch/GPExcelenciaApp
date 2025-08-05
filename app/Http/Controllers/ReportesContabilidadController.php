<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\CotizacionesContabilidadExport;
use Barryvdh\DomPDF\Facade\Pdf;

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
                DB::raw('CONCAT(\'CT\',CAST(ac.nocotizacion AS CHAR)) as nocotizacion'),
                DB::raw("
                CASE
                    WHEN ac.estado = 4 THEN ac.fecha_prefacturacion
                    WHEN ac.estado = 5 THEN ac.fecha_facturacion
                    ELSE ac.fecha_cotizacion
                END as fecha_cotizacion
            "),
                'ae.nombre as vendedor',
                'c.nombre as cliente',
                'ac.total_general',
                'ac.estado'
            )
            ->join('adm_empleados as ae', 'ac.idusuario', '=', 'ae.iduser')
            ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
            ->where('ac.estado', '>', 0);

            if($filtros['estado'] ?? null && $filtros['estado'] === 4) {
                $query->whereBetween(DB::raw('date(ac.fecha_prefacturacion)'), [$filtros['desde'], $filtros['hasta']]);
            }else if($filtros['estado'] ?? null && $filtros['estado'] === 5) {
                $query->whereBetween(DB::raw('date(ac.fecha_facturacion)'), [$filtros['desde'], $filtros['hasta']]);
            }else {
                $query->whereBetween(DB::raw('date(ac.fecha_cotizacion)'), [$filtros['desde'], $filtros['hasta']]);
            }
            

        if (!empty($filtros['vendedor_id'])) {
            $query->where('ae.id_empleado', $filtros['vendedor_id']);
        }

        if (!empty($filtros['estado'])) {
            $query->where('ac.estado', $filtros['estado']);
        }

        if (!empty($filtros['search'])) {
            $query->where(function ($q) use ($filtros) {
                $q->where('ac.nocotizacion', 'like', '%' . $filtros['search'] . '%')
                    ->orWhere('c.nombre', 'like', '%' . $filtros['search'] . '%');
            });
        }

        return $query;
    }
}
