<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte Notas de Crédito y Débito</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; }
        h2 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #000; padding: 4px; text-align: left; }
        th { background-color: #f0f0f0; }
        .right { text-align: right; }
        .summary { margin-top: 20px; }
    </style>
</head>
<body>
    <h2>Reporte de Notas de {{ $tipo === 'TODOS' ? 'Crédito y Débito' : ($tipo === 'NCRE' ? 'Crédito' : 'Débito') }}</h2>
    <p><strong>Período:</strong> {{ $fechaInicio }} a {{ $fechaFinal }}</p>

    <table>
        <thead>
            <tr>
                <th>No. Cotización</th>
                <th>Cliente</th>
                <th>No. Interno</th>
                <th>No. Factura</th>
                <th>Fecha Certificación</th>
                <th>Tipo Nota</th>
                <th>No. Nota</th>
                <th>Fecha Nota</th>
                <th class="right">Monto Total (Q)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($registros as $r)
                <tr>
                    <td>{{ $r->nocotizacion }}</td>
                    <td>{{ $r->cliente }}</td>
                    <td>{{ $r->nointerno }}</td>
                    <td>{{ $r->numero_factura }}</td>
                    <td>{{ $r->fecha_certificacion }}</td>
                    <td>{{ $r->tipo_nota }}</td>
                    <td>{{ $r->numero_nota }}</td>
                    <td>{{ $r->fecha_nota }}</td>
                    <td class="right">{{ number_format($r->monto_total, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="summary">
        <h4>Resumen por tipo</h4>
        <table>
            <thead>
                <tr>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th class="right">Monto Total (Q)</th>
                </tr>
            </thead>
            <tbody>
                @foreach($porTipo as $t)
                    <tr>
                        <td>{{ $t['tipo'] }}</td>
                        <td>{{ $t['total'] }}</td>
                        <td class="right">{{ number_format($t['monto'], 2) }}</td>
                    </tr>
                @endforeach
                <tr>
                    <td><strong>Total General</strong></td>
                    <td><strong>{{ $totalGeneral }}</strong></td>
                    <td class="right"><strong>{{ number_format($sumaGeneral, 2) }}</strong></td>
                </tr>
            </tbody>
        </table>
    </div>
</body>
</html>
