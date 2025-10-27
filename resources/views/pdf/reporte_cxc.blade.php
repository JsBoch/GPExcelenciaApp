<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte Cuentas por Cobrar</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; }
        h2 { text-align: center; margin: 0; }
        .meta { margin: 6px 0 12px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px; }
        th { background: #f2f2f2; }
        .right { text-align: right; }
        .small { font-size: 11px; }
    </style>
</head>
<body>
    <h2>Reporte de Cuentas por Cobrar</h2>
    <div class="meta">
        <strong>Período:</strong> {{ $fechaInicio }} a {{ $fechaFinal }} &nbsp; |
        <strong>Cliente:</strong> {{ $clienteLabel }} &nbsp; |
        <strong>Filtro saldo:</strong> {{ $saldo }}
    </div>

    <table>
        <thead>
            <tr>
                <th>Cliente</th>
                <th>No. Cotización</th>
                <th>No. Interno</th>
                <th>No. Factura</th>
                <th>Fecha Emisión</th>
                <th>Fecha Venc.</th>
                <th class="right">Días Emisión</th>
                <th class="right">Días Vencidos</th>
                <th class="right">Monto Original</th>
                <th class="right">Pagado</th>
                <th class="right">Saldo Pendiente</th>
            </tr>
        </thead>
        <tbody>
            @foreach($cuentas as $r)
            <tr>
                <td class="small">{{ $r->cliente }}</td>
                <td>{{ $r->nocotizacion }}</td>
                <td>{{ $r->nointerno }}</td>
                <td>{{ $r->numero }}</td>
                <td>{{ $r->fecha_emision }}</td>
                <td>{{ $r->fecha_vencimiento }}</td>
                <td class="right">{{ $r->dias_desde_emision }}</td>
                <td class="right">{{ $r->dias_vencidos }}</td>
                <td class="right">{{ number_format($r->monto_original, 2) }}</td>
                <td class="right">{{ number_format($r->monto_pagado, 2) }}</td>
                <td class="right">{{ number_format($r->monto_total_saldo_pendiente, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <br>
    <table>
        <thead>
            <tr>
                <th>Total registros</th>
                <th class="right">Monto Original</th>
                <th class="right">Pagado</th>
                <th class="right">Saldo Pendiente</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{{ $totales['cantidad'] }}</td>
                <td class="right">{{ number_format($totales['montoOriginal'], 2) }}</td>
                <td class="right">{{ number_format($totales['montoPagado'], 2) }}</td>
                <td class="right">{{ number_format($totales['saldoPendiente'], 2) }}</td>
            </tr>
        </tbody>
    </table>
</body>
</html>
