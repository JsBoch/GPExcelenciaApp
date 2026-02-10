<?php

namespace App\Exports\Sheets;

use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\{
    FromCollection,
    WithHeadings,
    WithMapping,
    WithStyles,
    WithColumnWidths,
    WithEvents
};
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Maatwebsite\Excel\Events\AfterSheet;

class PedidosResumenSheet implements FromCollection, WithHeadings, WithMapping, WithStyles, WithColumnWidths, WithEvents
{
    protected int $idPedido;
    protected $user;
    protected int $rowCount = 0;

    public function __construct(int $idPedido, $user)
    {
        $this->idPedido = $idPedido;
        $this->user     = $user;
    }

    public function collection()
    {
        $data = DB::table('adm_pedidos_produccion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('adm_empleados as e', 'c.idusuario', '=', 'e.iduser')
            ->where('c.idpedidoproduccion', $this->idPedido)
            ->orderBy('c.nopedido', 'desc')
            ->get();

        $this->rowCount = $data->count();

        return $data;
    }

    public function headings(): array
    {
        return [
            'No Pedido',
            'Fecha Pedido',
            'Fecha Entrega',
            'Cliente',
            'Asesor',
            'Dirección',
            'Estado',
            'Total Q'
        ];
    }

    public function map($r): array
    {
        return [
            'P-' . $r->nopedido,
            $r->fecha_pedido,
            $r->fecha_entrega,
            $r->nombre, // cliente
            $r->nombre, // asesor (ajustable si separas alias)
            $r->direccion_entrega,
            match ($r->estado) {
                1 => 'REGISTRO',
                2 => 'COSTEO',
                3 => 'COSTEADA',
                4 => 'PRE-FACTURACIÓN',
                5 => 'PARA FACTURAR',
                6 => 'FACTURADA',
                7 => 'ANULADA',
                8 => 'RECHAZADA',
            },
            $r->total_general,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'color' => ['rgb' => 'E9ECEF'],
                ],
            ],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 12,
            'B' => 15,
            'C' => 15,
            'D' => 30,
            'E' => 20,
            'F' => 35,
            'G' => 18,
            'H' => 15,
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $totalRow = $this->rowCount + 2;

                $event->sheet->setCellValue("G{$totalRow}", 'TOTAL');
                $event->sheet->setCellValue(
                    "H{$totalRow}",
                    "=SUM(H2:H" . ($totalRow - 1) . ")"
                );

                $event->sheet->getStyle("G{$totalRow}:H{$totalRow}")
                    ->getFont()
                    ->setBold(true);
            },
        ];
    }
}