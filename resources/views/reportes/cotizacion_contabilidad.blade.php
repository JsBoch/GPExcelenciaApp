<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Listado de Cotizaciones</title>
    <style>
        @page {
            margin: 120px 40px 80px 40px;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 9px;
        }

        header {
            position: fixed;
            top: -100px;
            left: 0;
            right: 0;
            height: 100px;
            text-align: center;
        }

        footer {
            position: fixed;
            bottom: -60px;
            left: 0;
            right: 0;
            height: 60px;
            font-size: 9px;
        }

        footer .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .footer-line {
            border-top: 1px solid #000;
            margin-bottom: 2px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
        }

        th,
        td {
            border: 1px solid #000;
            padding: 4px;
            text-align: left;
        }

        th {
            background-color: #f0f0f0;
        }

        .header-table td {
            border: none;
        }

        .titulo {
            font-size: 16px;
            font-weight: bold;
            margin: 0;
        }
    </style>
</head>

<body>
    <header>
        <table width="100%" class="header-table">
            <tr>
                <td width="100" style="text-align: left;">
                    <img src="{{ public_path('images/LogoGP.jpg') }}" alt="Logo" height="60">
                </td>
                <td style="text-align: center;">
                    <h3 style="margin:0;">GP Excelencia S.A.</h3>
                    <div class="titulo">LISTADO DE COTIZACIONES</div>
                    <!-- <small>Período: {{ \Carbon\Carbon::parse($rows->first()->fecha_cotizacion ?? now())->format('d/m/Y') }} al {{ \Carbon\Carbon::parse($rows->last()->fecha_cotizacion ?? now())->format('d/m/Y') }}</small> -->
                    @php
                    $desdeFecha = optional($rows->first())->fecha_cotizacion ?? now();
                    $hastaFecha = optional($rows->last())->fecha_cotizacion ?? now();
                    @endphp
                    <small>Período: {{ \Carbon\Carbon::parse($desdeFecha)->format('d/m/Y') }} al {{ \Carbon\Carbon::parse($hastaFecha)->format('d/m/Y') }}</small>
                </td>
                <td width="100"></td>
            </tr>
        </table>
    </header>

    <footer>
        <div class="footer-line"></div>
        <div class="footer-content">
            <div>
                Generado por: {{ Auth::user()->name ?? 'Usuario' }}<br>
                {{ \Carbon\Carbon::now()->format('d/m/Y') }}
            </div>
        </div>
    </footer>


    <main>
        <table>
            <thead>
                <tr>
                    <th>No. Cotización</th>
                    <th>Fecha</th>
                    <th>Días Vencidos</th>
                    <th>Vendedor</th>
                    <th>Cliente</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($rows as $row)
                <tr>
                    <td>{{ $row->nocotizacion }}</td>
                    <td>{{ \Carbon\Carbon::parse($row->fecha_cotizacion)->format('d/m/Y') }}</td>
                    <td>{{ $row->dias_desde_prefacturacion }}</td>
                    <td>{{ $row->vendedor }}</td>
                    <td>{{ $row->cliente }}</td>
                    <td>{{ number_format($row->total_general, 2, '.', ',') }}</td>
                </tr>
                @endforeach
                <tr>
                    <td colspan="5" style="text-align: right; font-weight: bold;">TOTAL GENERAL</td>
                    <td style="font-weight: bold;">
                        Q{{ number_format($rows->sum('total_general'), 2, '.', ',') }}
                    </td>
                </tr>

            </tbody>
        </table>
    </main>
    
    <script type="text/php">
        if (isset($pdf)) {
    $font = $fontMetrics->get_font("DejaVu Sans", "normal");
    // Paginación fija en cada página (evita strings anidados)
    $pdf->page_text(500, 810, "Página {PAGE_NUM} de {PAGE_COUNT}", $font, 9, [0,0,0]);
}
</script>
</body>

</html>