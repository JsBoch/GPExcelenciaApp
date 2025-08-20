<?php

namespace App\Exports;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class CotizacionesContabilidadExport implements FromCollection, WithHeadings
{
    protected $filtros;

    public function __construct(array $filtros)
    {
        $this->filtros = $filtros;
    }

    public function collection()
    {
        // Usa SIEMPRE la misma fuente de filtros
        $filtros = $this->filtros ?? [];

        $query = DB::table('adm_cotizacion as ac')
            ->select(
                DB::raw("CONCAT('CT', CAST(ac.nocotizacion AS CHAR)) as nocotizacion"),
                DB::raw("
                CASE
                    WHEN ac.estado = 4 THEN COALESCE(ac.fecha_prefacturacion, ac.fecha_cotizacion)
                    WHEN ac.estado = 6 THEN COALESCE(ac.fecha_certificacion, ac.fecha_cotizacion)
                    ELSE ac.fecha_cotizacion
                END as fecha_cotizacion
            "),
                // Días desde prefacturación (NULL si no tiene)
                DB::raw("
                CASE
                    WHEN ac.fecha_prefacturacion IS NULL THEN NULL
                    ELSE DATEDIFF(CURDATE(), DATE(ac.fecha_prefacturacion))
                END AS dias_desde_prefacturacion
            "),
                'ae.nombre as vendedor',
                'c.nombre as cliente',
                'ac.total_general',

            )
            ->join('adm_empleados as ae', 'ac.idusuario', '=', 'ae.iduser')
            ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
            ->where('ac.estado', '>', 0);

        // Rango de fechas
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

        // Vendedor
        if (!empty($filtros['vendedor_id'])) {
            $query->where('ae.id_empleado', $filtros['vendedor_id']);
        }

        // Estado
        if (!empty($filtros['estado'])) {
            $query->where('ac.estado', (int)$filtros['estado']);
        }

        // Búsqueda
        if (!empty($filtros['search'])) {
            $search = $filtros['search'];
            $query->where(function ($q) use ($search) {
                $q->where('ac.nocotizacion', 'like', "%{$search}%")
                    ->orWhere('c.nombre', 'like', "%{$search}%");
            });
        }

        // Orden (por la misma columna "fecha_cotizacion" que expones)
        $query->orderBy('fecha_cotizacion', 'asc');

        // ⬅️ Imprescindible para FromCollection
        return $query->get();
    }


    public function headings(): array
    {
        return ['No. Cotización', 'Fecha', 'Dias Vencidos','Vendedor', 'Cliente', 'Total'];
    }
}
