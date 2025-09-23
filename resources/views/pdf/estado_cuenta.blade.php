<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            color: #333;
            margin: 0 40px;
        }
        header { text-align: center; margin-bottom: 30px; }
        header h2 { margin-bottom: 5px; }

        .info-cliente {
            margin-bottom: 20px; padding: 10px; border: 1px solid #000;
        }
        .info-cliente td { padding: 5px; }

        table.detalle {
            width: 100%; border-collapse: collapse;
        }
        table.detalle th, table.detalle td {
            border: 1px solid #000; padding: 8px; text-align: right;
        }
        table.detalle th { background-color: #f2f2f2; }

        table.detalle td.desc, th.desc { text-align: left; }
        .small { font-size: 10px; }
        .nowrap { white-space: nowrap; }
        .uuid { font-size: 10px; word-break: break-all; }

        .totales { margin-top: 15px; text-align: right; font-weight: bold; }

        .footer {
            position: fixed; bottom: 30px; font-size: 10px; text-align: center; width: 100%;
        }
    </style>
</head>
<body>

<header>
    <h2>Estado de Cuenta</h2>
    <p><strong>Cliente:</strong> {{ $cliente->nombre ?? 'N/D' }}</p>
    <p><strong>Rango de Fechas:</strong> {{ $fechaInicio }} - {{ $fechaFinal }}</p>
</header>

<table class="info-cliente" width="100%">
    <tr>
        <td><strong>NIT:</strong> {{ $cliente->nit ?? 'N/D' }}</td>
        <td><strong>Dirección:</strong> {{ $cliente->direccion ?? 'N/D' }}</td>
    </tr>
</table>

<table class="detalle">
    <thead>
        <tr>
            <th class="desc">Fecha Emisión</th>
            <th class="desc">Fecha Vencimiento</th>

            {{-- Nuevas columnas ligadas a adm_facturacion (si existe) --}}
            <th class="desc nowrap">Doc. FEL (Serie-No.)</th>
            <th class="desc">UUID FEL</th>
            <th class="desc nowrap">No. Interno</th>

            <th>Moneda</th>
            <th>Monto Original</th>
            <th>Monto Pagado</th>
            <th>Saldo Pendiente</th>
        </tr>
    </thead>
    <tbody>
        @php
            $totalOriginal = 0;
            $totalPagado = 0;
            $totalPendiente = 0;
        @endphp

        @foreach ($cuentas as $c)
            @php
                $totalOriginal  += (float) $c->monto_original;
                $totalPagado    += (float) $c->monto_pagado;
                $totalPendiente += (float) $c->saldo_pendiente;

                // Relación factura (puede venir nula si es una CxC histórica sin enlace)
                $f          = $c->factura ?? null;
                $serie      = $f->serie   ?? null;
                $numeroDoc  = $f->numero  ?? null;
                $uuid       = $f->uuid    ?? null;
                $noInterno  = $f->nofactura ?? null; // entero

                // Formatos amistosos
                $docFel     = ($serie && $numeroDoc) ? ($serie . '-' . $numeroDoc) : '—';
                $uuidFel    = $uuid ?: '—';
                $noIntStr   = is_null($noInterno) ? '—' : str_pad((string)$noInterno, 6, '0', STR_PAD_LEFT);
            @endphp
            <tr>
                <td class="desc">{{ \Carbon\Carbon::parse($c->fecha_emision)->format('d/m/Y') }}</td>
                <td class="desc">{{ \Carbon\Carbon::parse($c->fecha_vencimiento)->format('d/m/Y') }}</td>

                {{-- Nuevos datos desde adm_facturacion (si existen) --}}
                <td class="desc nowrap">{{ $docFel }}</td>
                <td class="desc uuid">{{ $uuidFel }}</td>
                <td class="desc nowrap">{{ $noIntStr }}</td>

                <td>{{ $c->moneda }}</td>
                <td>Q {{ number_format((float)$c->monto_original, 2) }}</td>
                <td>Q {{ number_format((float)$c->monto_pagado, 2) }}</td>
                <td>Q {{ number_format((float)$c->saldo_pendiente, 2) }}</td>
            </tr>
        @endforeach
    </tbody>
</table>

<div class="totales">
    <p>Total Monto Original: Q {{ number_format($totalOriginal, 2) }}</p>
    <p>Total Monto Pagado: Q {{ number_format($totalPagado, 2) }}</p>
    <p>Total Saldo Pendiente: Q {{ number_format($totalPendiente, 2) }}</p>
</div>

<div class="footer">
    Estado de cuenta generado el {{ now()->format('d/m/Y H:i') }} - GP EXCELENCIA, S.A.
</div>

</body>
</html>
