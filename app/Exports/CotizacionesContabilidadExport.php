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
        $q = DB::table('adm_cotizacion as ac')
            ->select(
                'ac.nocotizacion',
                'ac.fecha_cotizacion',
                'ae.nombre as vendedor',
                'c.nombre as cliente',
                'ac.total_general'
            )
            ->join('adm_empleados as ae', 'ac.idusuario', '=', 'ae.iduser')
            ->join('clientes as c', 'ac.idcliente', '=', 'c.idcliente')
            ->where('ac.estado', '>', 0)
            ->whereBetween(DB::raw('date(ac.fecha_cotizacion)'), [$this->filtros['desde'], $this->filtros['hasta']]);

        if (!empty($this->filtros['vendedor_id'])) {
            $q->where('ae.id_empleado', $this->filtros['vendedor_id']);
        }

        if (!empty($this->filtros['estado'])) {
            $q->where('ac.estado', $this->filtros['estado']);
        }

        if (!empty($this->filtros['search'])) {
            $q->where(function ($s) {
                $s->where('ac.nocotizacion', 'like', '%' . $this->filtros['search'] . '%')
                    ->orWhere('c.nombre', 'like', '%' . $this->filtros['search'] . '%');
            });
        }

        return $q->get();
    }

    public function headings(): array
    {
        return ['No. Cotización', 'Fecha', 'Vendedor', 'Cliente', 'Total'];
    }
}
