<?php

namespace App\Exports;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
        $filtros = $this->filtros ?? [];
        $esFacturada = !empty($filtros['estado']) && (int)$filtros['estado'] === 6;

        /* =====================================================
         * CASO 1: ESTADO = 6 (FACTURADAS)
         * → REPORTE POR FACTURA (IGUAL AL LISTADO)
         * ===================================================== */
        if ($esFacturada) {

            $query = DB::table('adm_cotizacion as ac')
                ->join('adm_facturacion as fac', 'fac.idcotizacion', '=', 'ac.idcotizacion')
                ->join('adm_empleados as ae', 'ac.idusuario', '=', 'ae.iduser')
                ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
                ->select(
                    DB::raw("CONCAT('CT', CAST(ac.nocotizacion AS CHAR)) AS nocotizacion"),
                    'fac.nofactura AS nointerno',
                    DB::raw('DATE(fac.fecha_certificacion) AS fecha'),
                    DB::raw("
                        COALESCE(
                            GREATEST(DATEDIFF(CURDATE(), DATE(ac.fecha_prefacturacion)), 0),
                            0
                        ) AS dias_vencidos
                    "),
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
                        END AS total
                    ")
                )
                ->whereIn('fac.estado', [0, 1]);

            // Excluir cotizaciones anuladas (si existe)
            if (Schema::hasColumn('adm_cotizacion', 'fecha_anulacion')) {
                $query->whereNull('ac.fecha_anulacion');
            }

            // Rango de fechas (FACTURA)
            if (!empty($filtros['desde']) && !empty($filtros['hasta'])) {
                $query->whereBetween(
                    DB::raw('DATE(fac.fecha_certificacion)'),
                    [$filtros['desde'], $filtros['hasta']]
                );
            }

            // Vendedor
            if (!empty($filtros['vendedor_id'])) {
                $query->where('ae.id_empleado', $filtros['vendedor_id']);
            }

            // Búsqueda
            if (!empty($filtros['search'])) {
                $search = $filtros['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('fac.nofactura', 'like', "%{$search}%")
                        ->orWhere('c.nombre', 'like', "%{$search}%")
                        ->orWhere('ac.nocotizacion', 'like', "%{$search}%");
                });
            }

            // Orden por correlativo
            $query->orderBy('fac.nofactura', 'asc');

            return $query->get();
        }

        /* =====================================================
         * CASO 2: OTROS ESTADOS
         * → REPORTE POR COTIZACIÓN (IGUAL AL LISTADO)
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
                DB::raw("CONCAT('CT', CAST(ac.nocotizacion AS CHAR)) AS nocotizacion"),
                'fac.nofactura AS nointerno',
                DB::raw("
                    CASE
                        WHEN ac.estado = 4 THEN DATE(ac.fecha_prefacturacion)
                        ELSE DATE(ac.fecha_cotizacion)
                    END AS fecha
                "),
                DB::raw("
                    COALESCE(
                        GREATEST(DATEDIFF(CURDATE(), DATE(ac.fecha_prefacturacion)), 0),
                        0
                    ) AS dias_vencidos
                "),
                'ae.nombre AS vendedor',
                'c.nombre AS cliente',
                'ac.total AS total'
            );

        // Excluir cotizaciones anuladas
        if (Schema::hasColumn('adm_cotizacion', 'fecha_anulacion')) {
            $query->whereNull('ac.fecha_anulacion');
        }

        // Estado
        if (!empty($filtros['estado'])) {
            $query->where('ac.estado', (int)$filtros['estado']);

            // 🔴 CLAVE: prefacturación SOLO si tiene fecha
            if ((int)$filtros['estado'] === 4) {
                $query->whereNotNull('ac.fecha_prefacturacion');
            }
        }

        // Rango de fechas (COTIZACIÓN)
        if (!empty($filtros['desde']) && !empty($filtros['hasta'])) {
            $query->whereBetween(
                DB::raw('DATE(ac.fecha_cotizacion)'),
                [$filtros['desde'], $filtros['hasta']]
            );
        }

        // Vendedor
        if (!empty($filtros['vendedor_id'])) {
            $query->where('ae.id_empleado', $filtros['vendedor_id']);
        }

        // Búsqueda
        if (!empty($filtros['search'])) {
            $search = $filtros['search'];
            $query->where(function ($q) use ($search) {
                $q->where('ac.nocotizacion', 'like', "%{$search}%")
                    ->orWhere('c.nombre', 'like', "%{$search}%");
            });
        }

        // Orden por fecha
        $query->orderBy('fecha', 'asc');

        return $query->get();
    }

    public function headings(): array
    {
        return [
            'No. Cotización',
            'No. Interno',
            'Fecha',
            'Días Vencidos',
            'Vendedor',
            'Cliente',
            'Total'
        ];
    }
}