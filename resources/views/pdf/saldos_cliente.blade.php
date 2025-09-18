<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            margin: 20px;
        }

        table.line-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        table.line-table thead th {
            text-align: left;
            font-weight: bold;
            background: #eee;
            padding: 6px 5px;
            border-bottom: 1px solid #555;
        }

        table.line-table td {
            padding: 6px 5px;
            border-bottom: 1px solid #ddd;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .desc {
            text-align: left;
        }

        .totales-box {
            margin-top: 16px;
            padding: 10px;
            background: #f2f6ff;
            border: 1px solid #b9c6ff;
        }

        .totales-row {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 4px;
        }

        .totales-label {
            font-weight: bold;
            font-size: 12px;
        }

        .totales-value {
            font-weight: bold;
            font-size: 13px;
        }
    </style>
</head>

<body>

    @include('pdf.partials.encabezado')

    @php
    $totalOriginal = 0;
    $totalPagado = 0;
    $totalPendiente = 0;
    @endphp

    <table class="line-table">
        <thead>
            <tr>
                <th class="desc">Fecha Emisión</th>
                <th class="desc">Fecha Vencimiento</th>
                <th class="text-center">Moneda</th>
                <th class="desc">No.Interno</th> {{-- ahora mostramos nofactura --}}
                <th class="text-right">Monto Original</th>
                <th class="text-right">Monto Pagado</th>
                <th class="text-right">Saldo Pendiente</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($cuentas as $cuenta)
            @php
            $abonado = $cuenta->recibos->sum(fn($r) => (float) ($r->pivot->monto ?? 0));
            $totalOriginal += (float) ($cuenta->monto_original ?? 0);
            $totalPagado += (float) $abonado;
            $totalPendiente += (float) ($cuenta->saldo_pendiente ?? 0);

            $fe = $cuenta->fecha_emision ? \Carbon\Carbon::parse($cuenta->fecha_emision)->format('d/m/Y') : '';
            $fv = $cuenta->fecha_vencimiento ? \Carbon\Carbon::parse($cuenta->fecha_vencimiento)->format('d/m/Y') : '';
            $noInterno = optional($cuenta->cotizacion)->nofactura; // <- número de factura
                @endphp
                <tr>
                <td class="desc">{{ $fe }}</td>
                <td class="desc">{{ $fv }}</td>
                <td class="text-center">{{ $cuenta->moneda }}</td>
                <td class="desc">{{ $noInterno ?: '' }}</td>
                <td class="text-right">Q {{ number_format((float) ($cuenta->monto_original ?? 0), 2) }}</td>
                <td class="text-right">Q {{ number_format((float) $abonado, 2) }}</td>
                <td class="text-right">Q {{ number_format((float) ($cuenta->saldo_pendiente ?? 0), 2) }}</td>
                </tr>
                @empty
                <tr>
                    <td colspan="7" class="text-center">No hay datos para los filtros seleccionados.</td>
                </tr>
                @endforelse
        </tbody>
    </table>

    <div class="totales-box">
        <div class="totales-row">
            <div class="totales-label">Total Monto Original:</div>
            <div class="totales-value">Q {{ number_format($totalOriginal, 2) }}</div>
        </div>
        <div class="totales-row">
            <div class="totales-label">Total Monto Pagado:</div>
            <div class="totales-value">Q {{ number_format($totalPagado, 2) }}</div>
        </div>
        <div class="totales-row">
            <div class="totales-label">Total Saldo Pendiente:</div>
            <div class="totales-value">Q {{ number_format($totalPendiente, 2) }}</div>
        </div>
    </div>

</body>

</html>