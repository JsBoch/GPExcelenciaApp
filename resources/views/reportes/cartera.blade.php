<!doctype html>
<html lang="es">

<head>
    <meta charset="utf-8">
    <title>{{ $encabezado['empresa'] }} - {{ $encabezado['titulo'] }}</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            color: #111;
        }

        .container {
            width: 98%;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 12px;
        }

        .header h1 {
            font-size: 18px;
            margin: 2px 0;
        }

        .header h2 {
            font-size: 14px;
            margin: 2px 0;
            font-weight: normal;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }

        th,
        td {
            border: 1px solid #ccc;
            padding: 6px 8px;
            text-align: left;
        }

        th {
            background: #f4f4f4;
        }

        .right {
            text-align: right;
        }

        .group-title {
            background: #eef;
            font-weight: bold;
            padding: 6px 8px;
        }

        .subtotal {
            background: #f9f9f9;
            font-weight: bold;
        }

        .totales {
            background: #e9ffe9;
            font-weight: bold;
        }

        .muted {
            color: #666;
        }

        .page-break {
            page-break-after: always;
        }

        .rojo {
            color: #b30000;
            font-weight: bold;
        }
    </style>
    <style>
        .pdf-footer {
            position: fixed;
            bottom: -35px;
            left: 0;
            right: 0;
            height: 30px;
            text-align: right;
            font-size: 10px;
            color: #666;
        }
    </style>
</head>

<body>
    <div class="pdf-footer">
        <span>Página {PAGE_NUM} de {PAGE_COUNT}</span>
    </div>

    <div class="container">
        <div class="header">
            <h1>{{ $encabezado['empresa'] }}</h1>
            <h1>{{ $encabezado['titulo'] }}</h1>
            <h2>
                Vendedor: <strong>{{ $encabezado['vendedor'] }}</strong> &nbsp; | &nbsp;
                Departamento: <strong>{{ $encabezado['departamento'] }}</strong> &nbsp; | &nbsp;
                Fecha de reporte: <strong>{{ $encabezado['fecha_reporte'] }}</strong>
            </h2>
        </div>

        @foreach ($grupos as $g)
        <div class="group-title">
            Cliente: {{ $g['cliente'] }} (NIT: {{ $g['nit'] ?? '—' }})
            @if(!empty($g['departamento'])) &nbsp; | &nbsp; Dpto: {{ $g['departamento'] }} @endif
            @if(!empty($g['vendedor'])) &nbsp; | &nbsp; Vendedor: {{ $g['vendedor'] }} @endif
        </div>

        <table>
            <thead>
                <tr>
                    <th>No.Documento</th>
                    <th>Número FEL</th>
                    <th>Tipo</th>
                    <th>Fecha Emisión</th>
                    <th>Fecha Venc.</th>
                    <th class="right">Saldo Pendiente</th>
                    <th class="right">0–30</th>
                    <th class="right">31–60</th>
                    <th class="right">61–90</th>
                    <th class="right">&gt;90</th>
                    <th class="right">Días</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($g['items'] as $it)
                <tr>
                    <td>{{ $it->nofactura }}</td>
                    <td>{{ $it->numero }}</td>
                    <td>{{ $it->tipo }}</td>
                    <td>{{ \Illuminate\Support\Str::of($it->fecha_emision)->limit(10, '') }}</td>
                    <td>{{ \Illuminate\Support\Str::of($it->fecha_vencimiento)->limit(10, '') }}</td>
                    <td class="right">{{ number_format($it->saldo_pendiente, 2) }}</td>
                    <td class="right">{{ number_format($it->bucket_0_30, 2) }}</td>
                    <td class="right">{{ number_format($it->bucket_31_60, 2) }}</td>
                    <td class="right">{{ number_format($it->bucket_61_90, 2) }}</td>
                    <!-- <td class="right">{{ number_format($it->bucket_mas_90, 2) }}</td> -->
                    <td class="right {{ $it->bucket_mas_90 > 0 ? 'rojo' : '' }}">
                        {{ number_format($it->bucket_mas_90) }}
                    </td>
                    <td class="right">{{ (int) $it->dias_transcurridos }}</td>
                </tr>
                @endforeach
                <tr class="subtotal">
                    <td colspan="5" class="right">Subtotal cliente</td>
                    <td class="right">{{ number_format($g['totales']['saldo'], 2) }}</td>
                    <td class="right">{{ number_format($g['totales']['b_0_30'], 2) }}</td>
                    <td class="right">{{ number_format($g['totales']['b_31_60'], 2) }}</td>
                    <td class="right">{{ number_format($g['totales']['b_61_90'], 2) }}</td>
                    <!-- <td class="right">{{ number_format($g['totales']['b_mas_90'], 2) }}</td> -->
                    <td class="right {{ $g['totales']['b_mas_90'] > 0 ? 'rojo' : '' }}">
                        {{ number_format($g['totales']['b_mas_90']) }}
                    </td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        {{-- Salto de página por cliente si la opción viene activa y no es el último --}}
        @if(($opciones['break_por_cliente'] ?? false) && !$loop->last)
        <div class="page-break"></div>
        @endif

        @endforeach

        {{-- Totales generales al final (si quieres mantenerlos en el cuerpo) --}}
        <table>
            <tbody>
                <tr class="totales">
                    <td class="right"><strong>Total General</strong></td>
                    <td class="right"><strong>Saldo</strong></td>
                    <td class="right"><strong>0–30</strong></td>
                    <td class="right"><strong>31–60</strong></td>
                    <td class="right"><strong>61–90</strong></td>
                    <td class="right"><strong>&gt;90</strong></td>
                </tr>
                <tr class="totales">
                    <td></td>
                    <td class="right">{{ number_format($totales_generales['saldo'], 2) }}</td>
                    <td class="right">{{ number_format($totales_generales['b_0_30'], 2) }}</td>
                    <td class="right">{{ number_format($totales_generales['b_31_60'], 2) }}</td>
                    <td class="right">{{ number_format($totales_generales['b_61_90'], 2) }}</td>
                    <!-- <td class="right">{{ number_format($totales_generales['b_mas_90'], 2) }}</td> -->
                    <td class="right {{ $totales_generales['b_mas_90'] > 0 ? 'rojo' : '' }}">
                        {{ number_format($totales_generales['b_mas_90']) }}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</body>

</html>