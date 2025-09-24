<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>{{ $titulo }}</title>
    <style>
        * { font-family: DejaVu Sans, Arial, Helvetica, sans-serif; }
        body { font-size: 12px; color: #111; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .title { font-size: 16px; font-weight: 700; letter-spacing: .5px; }
        .meta { font-size: 11px; color: #555; }
        .range { margin-top: 2px; }
        .hr { height: 2px; background: #222; margin: 6px 0 10px 0; }
        .group { background: #f4f6f8; border: 1px solid #e1e4e8; padding: 6px 8px; margin: 14px 0 6px 0; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 6px 6px; border-bottom: 1px solid #e9ecef; }
        thead th { background: #eef2f6; font-weight: 700; text-align: left; }
        .right { text-align: right; }
        .subtotal { background: #f9fafb; font-weight: 700; }
        .grand-total { background: #e9f7ef; font-weight: 900; border-top: 2px solid #2e7d32; }
        .muted { color: #777; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="title">{{ $titulo }}</div>
            <div class="meta">Impreso: {{ $impreso_en }}</div>
            <div class="meta range">Rango: {{ $rango['inicio'] }} a {{ $rango['fin'] }} (por fecha de recibo)</div>
        </div>
        <div class="meta">Página: <span class="pagenum"></span></div>
    </div>
    <div class="hr"></div>

    @if(empty($clientes))
        <p class="muted">Sin resultados para el rango seleccionado.</p>
    @else
        @foreach($clientes as $cli)
            <div class="group">
                <strong>Cliente:</strong> {{ $cli['codigo'] }} — {{ $cli['nombre'] }}
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width:12%">Fecha recibo</th>
                        <th style="width:8%">Serie</th>
                        <th style="width:10%">Número</th>
                        <th style="width:12%">Fecha emisión</th>
                        <th style="width:18%">No interno</th>
                        <th class="right" style="width:12%">Monto pagado</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($cli['recibos'] as $rec)
                        @foreach($rec['detalles'] as $d)
                            <tr>
                                <td>{{ $rec['fecha_recibo'] }}</td>
                                <td>{{ $rec['serie'] }}</td>
                                <td>{{ $rec['numero'] }}</td>
                                <td>{{ $d['fecha_emision'] ?? '' }}</td>
                                <td>{{ $d['nointerno'] ?? '' }}</td>
                                {{-- 👇 CAMBIO 1 --}}
                                <td class="right">Q {{ number_format((float)$d['monto_pagado'], 2, '.', ',') }}</td>
                            </tr>
                        @endforeach
                    @endforeach
                    <tr class="subtotal">
                        <td colspan="5" class="right">TOTAL CLIENTE:</td>
                        {{-- 👇 CAMBIO 2 --}}
                        <td class="right">Q {{ number_format((float)$cli['total_cliente'], 2, '.', ',') }}</td>
                    </tr>
                </tbody>
            </table>
        @endforeach

        <table style="margin-top:12px;">
            <tbody>
                <tr class="grand-total">
                    <td class="right" style="width:88%">TOTAL GENERAL COBRADO:</td>
                    {{-- 👇 CAMBIO 3 --}}
                    <td class="right" style="width:12%">Q {{ number_format((float)$total_general, 2, '.', ',') }}</td>
                </tr>
            </tbody>
        </table>
    @endif

    {{-- numeración de páginas DomPDF --}}
    <script type="text/php">
        if (isset($pdf)) {
            $text = "Página {PAGE_NUM} de {PAGE_COUNT}";
            $size = 8;
            $font = $fontMetrics->get_font("DejaVu Sans", "normal");
            $width = $fontMetrics->get_text_width($text, $font, $size);
            $x = ($pdf->get_width() - $width) / 2;
            $y = $pdf->get_height() - 24;
            $pdf->page_text($x, $y, $text, $font, $size, [0,0,0]);
        }
    </script>
</body>
</html>
