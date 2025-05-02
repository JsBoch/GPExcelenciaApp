<?php
namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Illuminate\Support\Collection;

class CotizacionDetallesExport implements FromCollection, WithHeadings
{
    protected $detalles;

    public function __construct(Collection $detalles) // Es mejor tipar como Collection
    {
        $this->detalles = $detalles;
    }

    public function collection(): Collection
    {
        return $this->detalles->map(function ($detalle) {
            return [
                'Unidad Medida' => $detalle->unidad_medida,
                'Descripción' => $detalle->descripcion,
                'Cantidad' => $detalle->cantidad,
                'Ancho' => $detalle->ancho,
                'Alto' => $detalle->alto,
                'M2' => $detalle->m2,
                'Profundidad' => $detalle->profundidad,
                'Precio' => $detalle->precio,
                'Total' => $detalle->total,
                // Puedes incluir más campos aquí
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Unidad Medida',
            'Descripción',
            'Cantidad',
            'Ancho',
            'Alto',
            'M2',
            'Profundidad',
            'Precio',
            'Total',
            // Define los encabezados de tus columnas
        ];
    }
}

?>