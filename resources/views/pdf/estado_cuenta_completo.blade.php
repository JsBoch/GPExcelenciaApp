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
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            border: 1px solid #555;
            padding: 5px;
            text-align: right;
        }
        th.desc, td.desc {
            text-align: left;
        }
        .subtitulo {
            margin-top: 20px;
            font-weight: bold;
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

@foreach ($cuentas as $cuenta)
    <p class="subtitulo">Cuenta por Cobrar #{{ $cuenta->idcuentaporcobrar }}</p>

    <table>
        <thead>
            <tr>
                <th class="desc">Fecha Emisión</th>
                <th class="desc">Fecha Vencimiento</th>
                <th>Moneda</th>
                <th>Monto Original</th>
                <th>Monto Pagado</th>
                <th>Saldo Pendiente</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="desc">{{ \Carbon\Carbon::parse($cuenta->fecha_emision)->format('d/m/Y') }}</td>
                <td class="desc">{{ \Carbon\Carbon::parse($cuenta->fecha_vencimiento)->format('d/m/Y') }}</td>
                <td>{{ $cuenta->moneda }}</td>
                <td>Q {{ number_format($cuenta->monto_original, 2) }}</td>
                <td>Q {{ number_format($cuenta->monto_pagado, 2) }}</td>
                <td>Q {{ number_format($cuenta->saldo_pendiente, 2) }}</td>
            </tr>
        </tbody>
    </table>

    @php
        $totalOriginal += $cuenta->monto_original;
        $totalPagado += $cuenta->monto_pagado;
        $totalPendiente += $cuenta->saldo_pendiente;
    @endphp

    @if ($cuenta->recibos->count())
        <p><strong>Recibos Asociados:</strong></p>
        <table>
            <thead>
                <tr>
                    <th class="desc" style="width: 20%;">Fecha</th>
                    <th class="desc" style="width: 20%;">Método</th>
                    <th style="width: 20%;">Monto</th>
                    <th style="width: 40%;">Referencia</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($cuenta->recibos as $recibo)
                    <tr>
                        <td class="desc">{{ \Carbon\Carbon::parse($recibo->fecha_recibo)->format('d/m/Y') }}</td>
                        <td class="desc">{{ $recibo->metodo_pago }}</td>
                        <td>Q {{ number_format($recibo->monto_recibido, 2) }}</td>
                        <td>{{ $recibo->referencia }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <p><em>No hay recibos registrados.</em></p>
    @endif
@endforeach

<p class="subtitulo">Totales Generales</p>
<table>
    <tr>
        <th class="desc">Total Monto Original</th>
        <td>Q {{ number_format($totalOriginal, 2) }}</td>
    </tr>
    <tr>
        <th class="desc">Total Monto Pagado</th>
        <td>Q {{ number_format($totalPagado, 2) }}</td>
    </tr>
    <tr>
        <th class="desc">Total Saldo Pendiente</th>
        <td>Q {{ number_format($totalPendiente, 2) }}</td>
    </tr>
</table>

</body>
</html>
