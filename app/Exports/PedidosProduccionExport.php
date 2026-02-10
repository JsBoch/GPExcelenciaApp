<?php

namespace App\Exports;

use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class PedidosProduccionExport implements FromCollection, WithHeadings, WithMapping
{
    protected $fechaInicio;
    protected $fechaFin;
    protected $user;
    protected $pedidosTodos;

    public function __construct($fechaInicio, $fechaFin, $user)
    {
        $this->fechaInicio   = $fechaInicio;
        $this->fechaFin      = $fechaFin;
        $this->user          = $user;
        $this->pedidosTodos  = $user->cotizaciones_todas;
    }

    public function collection()
    {
        $query = DB::table('adm_pedidos_produccion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_empleados as e', 'c.idusuario', '=', 'e.iduser')
            ->where('c.estado', '!=', 0);

        if ($this->fechaInicio && $this->fechaFin) {
            $query->whereBetween('c.fecha_pedido', [$this->fechaInicio, $this->fechaFin]);
        }

        if ($this->pedidosTodos === 'N') {
            $query->where('c.idusuario', $this->user->id);
        }

        return $query
            ->orderBy('c.nopedido', 'desc')
            ->get();
    }

    public function headings(): array
    {
        return [
            'No Pedido',
            'Fecha Pedido',
            'Fecha Entrega',
            'Cliente',
            'Contacto',
            'Asesor',
            'Dirección Entrega',
            'Estado',
        ];
    }

    public function map($row): array
    {
        return [
            'P-' . $row->nopedido,
            $row->fecha_pedido,
            $row->fecha_entrega,
            $row->nombre ?? $row->cliente,
            $row->contacto,
            $row->nombre ?? $row->asesor,
            $row->direccion_entrega,
            match ($row->estado) {
                1 => 'REGISTRO',
                2 => 'COSTEO',
                3 => 'COSTEADA',
                4 => 'PRE-FACTURACIÓN',
                5 => 'PARA FACTURAR',
                6 => 'FACTURADA',
                7 => 'ANULADA',
                8 => 'RECHAZADA',
                default => 'DESCONOCIDO',
            },
        ];
    }
}
