<?php

namespace App\Exports;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Illuminate\Support\Facades\Schema;

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

        // Subquery: 1 fila por idcotizacion con la fecha de certificación (NO anuladas)
        $facAgg = DB::table('adm_facturacion')
            ->select(
                'idcotizacion',
                DB::raw('MIN(fecha_certificacion) AS fecha_certificacion'),
                DB::raw('MAX(nofactura) AS nofactura'),
                DB::raw('MAX(fecha_anulacion) AS fecha_anulacion')
            )
            ->groupBy('idcotizacion');


        // Expresión reutilizable (coalesce entre nueva y histórica)
        $fechaCertExpr = DB::raw('DATE(COALESCE(fac.fecha_certificacion, ac.fecha_certificacion))');

        $query = DB::table('adm_cotizacion as ac')
            ->leftJoinSub($facAgg, 'fac', function ($join) {
                $join->on('fac.idcotizacion', '=', 'ac.idcotizacion');
            })
            ->join('adm_empleados as ae', 'ac.idusuario', '=', 'ae.iduser')
            ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
            ->select(
                DB::raw("CONCAT('CT', CAST(ac.nocotizacion AS CHAR)) as nocotizacion"),
                'fac.nofactura as nointerno',
                // Fecha mostrada
                DB::raw("
                CASE
                    WHEN fac.nofactura IS NOT NULL
                        THEN DATE(COALESCE(fac.fecha_certificacion, ac.fecha_certificacion))
                    WHEN ac.estado = 4
                        THEN DATE(ac.fecha_prefacturacion)
                    ELSE
                        DATE(ac.fecha_cotizacion)
                END AS fecha_cotizacion
                "),

                // Días desde prefacturación (NULL si no tiene)
                DB::raw("
                CASE
                    WHEN ac.fecha_prefacturacion IS NULL THEN NULL
                    ELSE DATEDIFF(CURDATE(), DATE(ac.fecha_prefacturacion))
                END AS dias_desde_prefacturacion
            "),
                'ae.nombre as vendedor',
                DB::raw("
                    CASE
                        WHEN fac.fecha_anulacion IS NOT NULL THEN 'ANULADA'
                        ELSE c.nombre
                    END AS cliente
                "),

                DB::raw("
                    CASE
                        WHEN fac.fecha_anulacion IS NOT NULL THEN 0
                        ELSE ac.total
                    END AS total_general
                "),

            )
            ->where('ac.estado', '>', 0)
            // ⬇️ opcional: ignora cotizaciones anuladas si tu tabla tiene este campo
            ->when(
                Schema::hasColumn('adm_cotizacion', 'fecha_anulacion'),
                fn($q) => $q->whereNull('ac.fecha_anulacion')
            );

        // Rango de fechas
        $desde = $filtros['desde'] ?? null;
        $hasta = $filtros['hasta'] ?? null;

        if ($desde && $hasta) {

            if (!empty($filtros['estado']) && (int)$filtros['estado'] === 4) {

                // Prefacturación
                $query->whereBetween(
                    DB::raw('DATE(ac.fecha_prefacturacion)'),
                    [$desde, $hasta]
                );
            } elseif (!empty($filtros['estado']) && (int)$filtros['estado'] === 6) {

                // Facturadas (incluye ANULADAS)
                $query->whereBetween(
                    DB::raw('DATE(COALESCE(fac.fecha_certificacion, ac.fecha_certificacion))'),
                    [$desde, $hasta]
                );
            } else {

                $query->whereBetween(
                    DB::raw('DATE(ac.fecha_cotizacion)'),
                    [$desde, $hasta]
                );
            }
        }



        // Vendedor
        if (!empty($filtros['vendedor_id'])) {
            $query->where('ae.id_empleado', $filtros['vendedor_id']);
        }

        // Estado
        // Estado
        if (!empty($filtros['estado'])) {
            if ((int)$filtros['estado'] === 6) {
                // Facturadas = todas las que tienen factura (incluso anuladas)
                $query->whereNotNull('fac.nofactura');
            } else {
                $query->where('ac.estado', (int)$filtros['estado']);
            }
        }


        // Búsqueda
        if (!empty($filtros['search'])) {
            $search = $filtros['search'];
            $query->where(function ($q) use ($search) {
                $q->where('ac.nocotizacion', 'like', "%{$search}%")
                    ->orWhere('c.nombre', 'like', "%{$search}%");
            });
        }

        // Orden por la fecha expuesta
        // 🔽 ORDENAMIENTO
        if (!empty($filtros['estado']) && (int)$filtros['estado'] === 6) {
            // Facturadas → ordenar por No. Interno
            $query
                ->orderByRaw('fac.nofactura IS NULL') // NULLs al final
                ->orderBy('fac.nofactura', 'asc');
        } else {
            // Otros estados → ordenar por fecha
            $query->orderBy('fecha_cotizacion', 'asc');
        }


        return $query->get();
    }




    public function headings(): array
    {
        return ['No. Cotización', 'No.Interno', 'Fecha', 'Dias Vencidos', 'Vendedor', 'Cliente', 'Total'];
    }
}
