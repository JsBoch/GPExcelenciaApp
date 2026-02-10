<?php

namespace App\Exports\Sheets;

use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\{FromCollection, WithHeadings};

class PedidosDetalleSheet implements FromCollection, WithHeadings
{
    protected int $idPedido;
    protected $user;

    public function __construct(int $idPedido, $user)
    {
        $this->idPedido = $idPedido;
        $this->user     = $user;
    }

    public function collection()
    {
        return DB::table('adm_detalle_pedidosproduccion as d')
            ->join(
                'adm_pedidos_produccion as c',
                'd.idpedidoproduccion',
                '=',
                'c.idpedidoproduccion'
            )
            ->where('c.idpedidoproduccion', $this->idPedido)
            ->orderBy('d.iddetallepedidoproduccion')
            ->get([
                DB::raw("CONCAT('P-', c.nopedido) as pedido"),
                'd.cantidad',
                'd.material',
                'd.ancho',
                'd.alto',
                'd.cnc',
                'd.laser',
                'd.uv',
                'd.summa',
                'd.acabados',
                'd.unidad_medida',
                'd.medida_real',
                'd.version',
                'd.incluye_foto',
            ]);
    }

    public function headings(): array
    {
        return [
            'Pedido',
            'Cantidad',
            'Material',
            'Ancho',
            'Alto',
            'CNC',
            'Láser',
            'UV',
            'Summa',
            'Acabados',
            'Unidad',
            'Medida Real',
            'Versión',
            'Incluye Foto',
        ];
    }
}
