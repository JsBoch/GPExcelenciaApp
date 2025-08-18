<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; }
        .mb-4 { margin-bottom: 12px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #888; padding: 6px; }
        th { background: #eee; }
        .small { font-size: 10px; color: #555; }
    </style>
</head>
<body>
    <h3 class="text-center">{{ $encabezado['titulo'] }}</h3>
    <div class="mb-4">
        <strong>Rango:</strong> {{ $encabezado['rango'] }} &nbsp; | &nbsp;
        <strong>Vendedor:</strong> {{ $encabezado['vendedor'] }} &nbsp; | &nbsp;
        <span class="small">Generado: {{ $encabezado['generado'] }}</span>
    </div>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Número</th>
                <th>No. Factura</th>
                <th>Fecha Prefact.</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Tipo Pago</th>
                <th class="text-right">Total</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $i => $r)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $r->nocotizacion }}</td>
                    <td>{{ $r->nofactura }}</td>
                    <td>{{ $r->fecha_prefacturacion }}</td>
                    <td>{{ $r->cliente }}</td>
                    <td>{{ $r->vendedor }}</td>
                    <td>{{ $r->tipo_pago }}</td>
                    <td class="text-right">{{ number_format($r->total, 2) }}</td>
                    <td>{{ $r->estado }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="9" class="text-center">No hay datos para los filtros seleccionados.</td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr>
                <th colspan="7" class="text-right">Total general</th>
                <th class="text-right">{{ number_format($totales['total_general'] ?? 0, 2) }}</th>
                <th>{{ $totales['conteo'] ?? 0 }} registros</th>
            </tr>
        </tfoot>
    </table>
</body>
</html>