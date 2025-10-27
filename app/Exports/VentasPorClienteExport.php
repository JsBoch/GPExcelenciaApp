<?php

namespace App\Exports;

use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Illuminate\Support\Facades\DB;

class VentasPorClienteExport implements FromView
{
    protected $filtros;

    public function __construct(array $filtros)
    {
        $this->filtros = $filtros;
    }

    public function view(): View
    {
        $desde = $this->filtros['desde'];
        $hasta = $this->filtros['hasta'];
        $vendedorId = $this->filtros['vendedor_id'] ?? null;

        $rows = DB::table('adm_cotizacion as ac')
            ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
            ->join('users as u', 'ac.idusuario', '=', 'u.id')
            ->join('adm_empleados as e', 'u.id', '=', 'e.iduser')
            ->select(
                'e.nombre as vendedor_nombre',
                'c.nit as cliente_codigo',
                'c.nombre as cliente_nombre',
                DB::raw('SUM(ac.total) as total_ventas')
            )
            ->whereIn('ac.estado', [4,5,6])
            ->whereNotNull('ac.fecha_prefacturacion')
            ->whereBetween(DB::raw('DATE(ac.fecha_prefacturacion)'), [$desde, $hasta])
            ->when($vendedorId, fn($q) => $q->where('e.id_empleado', $vendedorId))
            ->groupBy('e.nombre','c.nit','c.nombre')
            ->orderBy('e.nombre')
            ->get();

        // Totales por vendedor y general
        $totalesPorVendedor = $rows->groupBy('vendedor_nombre')->map(fn($group) => $group->sum(fn($r) => $r->total_ventas));
        $totalGeneral = $rows->sum(fn($r) => $r->total_ventas);

        return view('exports.ventas_por_cliente', [
            'rows' => $rows,
            'totalesPorVendedor' => $totalesPorVendedor,
            'totalGeneral' => $totalGeneral,
            'encabezado' => [
                'empresa' => 'GP Excelencia',
                'titulo' => 'REPORTE DE VENTAS POR CLIENTE',
                'periodo' => sprintf('%s a %s', $desde, $hasta),
                'fecha_impresion' => now()->format('Y-m-d H:i:s'),
            ],
        ]);
    }
}
