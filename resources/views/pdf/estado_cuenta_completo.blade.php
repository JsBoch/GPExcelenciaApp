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

        th,
        td {
            border: 1px solid #555;
            padding: 5px;
            text-align: right;
        }

        th.desc,
        td.desc {
            text-align: left;
        }

        .subtitulo {
            margin-top: 20px;
            font-weight: bold;
        }

        .doc {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
        }

        .doc td {
            border: 1px solid #555;
            padding: 4px;
            text-align: left;
        }

        .uuid {
            font-size: 10px;
            word-break: break-all;
        }

        .nowrap {
            white-space: nowrap;
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

    {{-- Bloque informativo del documento FEL (si existe factura enlazada) --}}
    @php
    $f = $cuenta->factura ?? null; // relación ->factura (adm_facturacion)
    $docFel = ($f && $f->serie && $f->numero) ? ($f->serie.'-'.$f->numero) : '—';
    $uuidFel = $f->uuid ?? '—';
    $noInterno = isset($f->nofactura) ? str_pad((string)$f->nofactura, 6, '0', STR_PAD_LEFT) : '—';
    @endphp

    <table class="doc">
        <tr>
            <td><strong>Doc. FEL:</strong> <span class="nowrap">{{ $docFel }}</span></td>
            <td><strong>UUID:</strong> <span class="uuid">{{ $uuidFel }}</span></td>
            <td><strong>No. interno:</strong> <span class="nowrap">{{ $noInterno }}</span></td>
        </tr>
    </table>

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
                <td>Q {{ number_format((float)$cuenta->monto_original, 2) }}</td>
                <td>Q {{ number_format((float)$cuenta->monto_pagado, 2) }}</td>
                <td>Q {{ number_format((float)$cuenta->saldo_pendiente, 2) }}</td>
            </tr>
        </tbody>
    </table>

    @php
    $totalOriginal += (float) $cuenta->monto_original;
    $totalPagado += (float) $cuenta->monto_pagado;
    $totalPendiente += (float) $cuenta->saldo_pendiente;
    @endphp

    @if ($cuenta->recibos->isNotEmpty())
    <p><strong>Documentos Asociados:</strong></p>
    <table>
        <thead>
            <tr>
                <th class="desc" style="width: 20%;">Fecha</th>
                <th class="desc" style="width: 20%;">Documento</th>
                <th class="desc" style="width: 20%;">Método</th>
                <th style="width: 20%;">Monto</th>
                <th style="width: 20%;">Referencia</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($cuenta->recibos as $recibo)
            <tr>
                <td class="desc">{{ \Carbon\Carbon::parse($recibo->fecha_recibo)->format('d/m/Y') }}</td>
                <td>{{ ($recibo->serie ?? '').'-'.($recibo->numero ?? '') }}</td>
                <td class="desc">{{ $recibo->metodo_pago }}</td>
                <td>Q {{ number_format((float)($recibo->pivot->monto ?? 0), 2) }}</td>
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