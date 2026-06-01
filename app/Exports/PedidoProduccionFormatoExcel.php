<?php

namespace App\Exports;

use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\WithDrawings;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class PedidoProduccionFormatoExcel implements WithEvents, WithDrawings, WithTitle, WithColumnWidths
{
    protected int $idPedido;
    protected $pedido;
    protected $detalles;
    protected $areas;
    protected array $imagenes = [];

    public function __construct(int $idPedido)
    {
        $this->idPedido = $idPedido;

        $this->pedido = DB::table('adm_pedidos_produccion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->leftJoin('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_empleados as e', 'c.idusuario', '=', 'e.iduser')
            ->where('c.idpedidoproduccion', $idPedido)
            ->select(
                'c.idpedidoproduccion',
                DB::raw("CONCAT('P-', CAST(c.nopedido AS CHAR)) as nopedido"),
                'c.nocotizacion',
                'c.fecha_pedido',
                'c.fecha_entrega',
                'c.trabajo',
                'c.direccion_entrega',
                'cl.nombre as cliente',
                'cl.nit',
                'ct.nombre as contacto',
                'e.nombre as asesor'
            )
            ->first();

        $this->detalles = DB::table('adm_detalle_pedidosproduccion')
            ->where('idpedidoproduccion', $idPedido)
            ->select(
                'iddetallepedidoproduccion',
                'cantidad',
                'material',
                'caras',
                'ancho',
                'alto',
                'unidad_medida',
                'version',
                'acabados',
                'medida_real',
                'imagen'
            )
            ->get();

        foreach ($this->detalles as $detalle) {

            $maquinas = DB::table('adm_detalle_pedidosproduccion_maquinas as dm')
                ->join(
                    'adm_maquinas_produccion as m',
                    'dm.idmaquina',
                    '=',
                    'm.idmaquina'
                )
                ->where(
                    'dm.iddetallepedidoproduccion',
                    $detalle->iddetallepedidoproduccion
                )
                ->pluck('m.nombre');

            $detalle->maquinas_texto = $maquinas->implode(', ');
        }

        $this->areas = DB::table('adm_pedido_produccion_areas as pa')
            ->join('area_trabajo as a', 'pa.id_areatrabajo', '=', 'a.id_areatrabajo')
            ->where('pa.idpedidoproduccion', $idPedido)
            ->where('pa.estado', 1)
            ->orderBy('pa.orden')
            ->select(
                'a.nombre',
                'pa.fecha_programada',
                'pa.orden'
            )
            ->get();

        $startRow = 15 + $this->areas->count();

        foreach ($this->detalles as $index => $detalle) {
            if (!empty($detalle->imagen)) {
                $imagePath = public_path(
                    'images_pedidosproduccion/' . $detalle->imagen
                );

                if (file_exists($imagePath)) {
                    $this->imagenes[] = [
                        'path' => $imagePath,
                        'cell' => 'L' . ($startRow + $index),
                    ];
                }
            }
        }
    }

    public function title(): string
    {
        return 'Pedido Producción';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 6,
            'B' => 12,
            'C' => 22,
            'D' => 10,
            'E' => 10,
            'F' => 10,
            'G' => 14,
            'H' => 14,
            'I' => 22,
            'J' => 18,
            'K' => 35,
            'L' => 18,
        ];
    }

    public function drawings()
    {
        $drawings = [];

        $logoPath = public_path('images/LogoGP.png');

        if (file_exists($logoPath)) {
            $logo = new Drawing();
            $logo->setName('Logo');
            $logo->setDescription('Logo');
            $logo->setPath($logoPath);
            $logo->setHeight(70);
            $logo->setCoordinates('A1');
            $drawings[] = $logo;
        }

        foreach ($this->imagenes as $img) {
            if (file_exists($img['path'])) {
                $drawing = new Drawing();
                $drawing->setName('Imagen item');
                $drawing->setDescription('Imagen item');
                $drawing->setPath($img['path']);
                $drawing->setHeight(48);
                $drawing->setCoordinates($img['cell']);
                $drawing->setOffsetX(15);
                $drawing->setOffsetY(6);
                $drawings[] = $drawing;
            }
        }

        return $drawings;
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {

                $sheet = $event->sheet->getDelegate();

                $sheet->mergeCells('A1:L3');
                $sheet->setCellValue('A4', 'PEDIDO A PRODUCCIÓN');
                $sheet->mergeCells('A4:L4');

                $sheet->getStyle('A4')->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 16,
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                    ],
                ]);

                $row = 6;

                $sheet->setCellValue("A{$row}", 'No. Pedido');
                $sheet->setCellValue("B{$row}", $this->pedido->nopedido ?? '');
                $sheet->setCellValue("D{$row}", 'No. Cotización');
                $sheet->setCellValue("E{$row}", $this->pedido->nocotizacion ?? 'N/A');
                $sheet->setCellValue("G{$row}", 'Fecha Pedido');
                $sheet->setCellValue("H{$row}", $this->formatDate($this->pedido->fecha_pedido ?? null));
                $sheet->setCellValue("J{$row}", 'Fecha Entrega');
                $sheet->setCellValue("K{$row}", $this->formatDate($this->pedido->fecha_entrega ?? null));

                $row += 2;

                $sheet->setCellValue("A{$row}", 'Cliente');
                $sheet->mergeCells("B{$row}:E{$row}");
                $sheet->setCellValue("B{$row}", $this->pedido->cliente ?? '');

                $sheet->setCellValue("F{$row}", 'NIT');
                $sheet->setCellValue("G{$row}", $this->pedido->nit ?? '');

                $sheet->setCellValue("H{$row}", 'Contacto');
                $sheet->mergeCells("I{$row}:K{$row}");
                $sheet->setCellValue("I{$row}", $this->pedido->contacto ?? '');

                $row++;

                $sheet->setCellValue("A{$row}", 'Asesor');
                $sheet->mergeCells("B{$row}:E{$row}");
                $sheet->setCellValue("B{$row}", $this->pedido->asesor ?? '');

                $sheet->setCellValue("F{$row}", 'Trabajo');
                $sheet->mergeCells("G{$row}:K{$row}");
                $sheet->setCellValue("G{$row}", $this->pedido->trabajo ?? '');

                $row++;

                $sheet->setCellValue("A{$row}", 'Dirección');
                $sheet->mergeCells("B{$row}:L{$row}");
                $sheet->setCellValue("B{$row}", $this->pedido->direccion_entrega ?? '');

                $sheet->getStyle("A6:L{$row}")->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                        ],
                    ],
                    'alignment' => [
                        'vertical' => Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                ]);

                $sheet->getStyle("A6:A{$row}")->getFont()->setBold(true);
                $sheet->getStyle("D6:D6")->getFont()->setBold(true);
                $sheet->getStyle("G6:G6")->getFont()->setBold(true);
                $sheet->getStyle("J6:J6")->getFont()->setBold(true);
                $sheet->getStyle("F8:F9")->getFont()->setBold(true);
                $sheet->getStyle("H8:H8")->getFont()->setBold(true);

                $row += 2;

                $sheet->setCellValue("A{$row}", 'ÁREAS ASIGNADAS');
                $sheet->mergeCells("A{$row}:L{$row}");

                $sheet->getStyle("A{$row}")->applyFromArray([
                    'font' => [
                        'bold' => true,
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => [
                            'rgb' => 'FCE4D6',
                        ],
                    ],
                ]);

                $row++;

                if ($this->areas->isEmpty()) {
                    $sheet->setCellValue("A{$row}", 'Sin áreas asignadas');
                    $sheet->mergeCells("A{$row}:L{$row}");
                    $row++;
                } else {
                    foreach ($this->areas as $area) {
                        $sheet->setCellValue(
                            "A{$row}",
                            $area->orden . '. ' . $area->nombre . ' - ' . $this->formatDate($area->fecha_programada)
                        );
                        $sheet->mergeCells("A{$row}:L{$row}");
                        $row++;
                    }
                }

                $row++;

                $headerRow = $row;

                $headers = [
                    'A' => '#',
                    'B' => 'Cantidad',
                    'C' => 'Material',
                    'D' => 'Caras',
                    'E' => 'Ancho',
                    'F' => 'Alto',
                    'G' => 'Unidad',
                    'H' => 'Versión',
                    'I' => 'Acabados',
                    'J' => 'Medida Real',
                    'K' => 'Máquinas',
                    'L' => 'Imagen',
                ];

                foreach ($headers as $col => $title) {
                    $sheet->setCellValue("{$col}{$headerRow}", $title);
                }

                $sheet->getStyle("A{$headerRow}:L{$headerRow}")->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'color' => [
                            'rgb' => 'FFFFFF',
                        ],
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => [
                            'rgb' => '1F4E78',
                        ],
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                        ],
                    ],
                ]);

                $row++;

                foreach ($this->detalles as $index => $detalle) {
                    $sheet->setCellValue("A{$row}", $index + 1);
                    $sheet->setCellValue("B{$row}", $detalle->cantidad);
                    $sheet->setCellValue("C{$row}", $detalle->material);
                    $sheet->setCellValue("D{$row}", $detalle->caras);
                    $sheet->setCellValue("E{$row}", $detalle->ancho);
                    $sheet->setCellValue("F{$row}", $detalle->alto);
                    $sheet->setCellValue("G{$row}", $detalle->unidad_medida);
                    $sheet->setCellValue("H{$row}", $detalle->version);
                    $sheet->setCellValue("I{$row}", $detalle->acabados);
                    $sheet->setCellValue("J{$row}", $detalle->medida_real);
                    $sheet->setCellValue("K{$row}", $detalle->maquinas_texto);

                    $sheet->getRowDimension($row)->setRowHeight(42);

                    $row++;
                }

                $lastRow = $row - 1;

                $sheet->getStyle("A{$headerRow}:L{$lastRow}")->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                        ],
                    ],
                    'alignment' => [
                        'vertical' => Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                ]);

                $sheet->getStyle("A{$headerRow}:B{$lastRow}")
                    ->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $sheet->getStyle("D{$headerRow}:H{$lastRow}")
                    ->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $sheet->getStyle("L{$headerRow}:L{$lastRow}")
                    ->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $sheet->getPageSetup()
                    ->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE)
                    ->setPaperSize(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::PAPERSIZE_A4)
                    ->setFitToWidth(1)
                    ->setFitToHeight(0);

                $sheet->getPageMargins()->setTop(0.3);
                $sheet->getPageMargins()->setRight(0.25);
                $sheet->getPageMargins()->setLeft(0.25);
                $sheet->getPageMargins()->setBottom(0.3);
            },
        ];
    }

    private function formatDate($fecha): string
    {
        if (!$fecha) {
            return '';
        }

        return date('d/m/Y', strtotime($fecha));
    }
}
