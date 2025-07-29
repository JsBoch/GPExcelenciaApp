<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Reporte de Recibos</title>
    <!-- <style>
        body { font-family: Arial, sans-serif; font-size: 13px; }
        .encabezado { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #444; padding: 6px; text-align: left; }
        th { background-color: #f2f2f2; }
        .monto { text-align: right; white-space: nowrap; }
        .cliente, .referencia { width: 25%; }
    </style> -->
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            /* ↓ Tamaño reducido */
        }

        .titulo {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .subtitulo {
            text-align: center;
            margin-bottom: 5px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        th,
        td {
            border: 1px solid #000;
            padding: 6px;
            vertical-align: top;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
            font-size: 11px;
        }

        .cliente-col,
        .referencia-col {
            width: 25%;
        }

        .monto-col {
            text-align: right;
            white-space: nowrap;
        }

        .fecha-col {
            white-space: nowrap;
        }
    </style>
</head>

<body>
    <div class="titulo">REPORTE DE RECIBOS</div>
    <div class="subtitulo">Desde {{ $fechaInicio }} hasta {{ $fechaFin }}</div>
    <div class="subtitulo">Generado el {{ \Carbon\Carbon::now()->format('d/m/Y') }}</div>

    <table>
        <thead>
            <tr>
                <th>No Recibo</th>
                <th class="fecha-col">Fecha</th>
                <th>CxC</th>
                <th class="monto-col">Monto</th>
                <th class="cliente-col">Cliente</th>
                <th>Forma de Pago</th>
                <th class="referencia-col">Referencia</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($recibos as $recibo)
            <tr>
                <td>{{ $recibo->idrecibo }}</td>
                <td class="fecha-col">{{ $recibo->fecha_recibo }}</td>
                <td>{{ $recibo->idcuentaporcobrar }}</td>
                <td class="monto-col">Q {{ number_format($recibo->monto_recibido, 2) }}</td>
                <td class="cliente-col">{{ $recibo->cliente->nombre ?? 'Sin nombre' }}</td>
                <td>{{ $recibo->metodo_pago }}</td>
                <td class="referencia-col">{{ $recibo->referencia }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>

</html>