<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Ajuste comercial AJ-{{ str_pad((string) $ajuste->idajuste, 5, '0', STR_PAD_LEFT) }}</title>
    <style>
        @page { margin: 29px 35px 46px; }
        body { font-family: DejaVu Sans, sans-serif; color: #263340; font-size: 10px; }
        .header { border-bottom: 3px solid #0b477a; padding-bottom: 12px; margin-bottom: 16px; }
        .brand { width: 100%; border-collapse: collapse; }
        .brand td { vertical-align: middle; }
        .logo { max-width: 116px; max-height: 68px; }
        h1 { margin: 0; color: #0b477a; font-size: 17px; }
        .subtitle { color: #607285; margin-top: 4px; }
        .number { color: #0b477a; text-align: right; font-size: 13px; font-weight: bold; }
        .info { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .info td { width: 50%; padding: 4px 6px; vertical-align: top; }
        .label { font-weight: bold; color: #475569; }
        .box { padding: 9px 10px; background: #f2f6fa; border-left: 3px solid #2eaf3e; margin: 9px 0 13px; line-height: 1.45; }
        h2 { color: #0b477a; margin: 17px 0 8px; font-size: 12px; }
        table.detalles { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .detalles th { background: #eaf1f7; color: #1a3c5a; padding: 8px 5px; border-bottom: 1px solid #cad6e0; font-size: 8px; }
        .detalles td { padding: 8px 5px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 8px; overflow-wrap: break-word; }
        .detalles tr { page-break-inside: avoid; }
        .right { text-align: right; }
        .totals { width: 53%; margin: 15px 0 0 auto; border-collapse: collapse; }
        .totals td { padding: 7px 9px; border-bottom: 1px solid #dbe4eb; }
        .totals .last { font-weight: bold; font-size: 12px; background: #eaf1f7; color: #0b477a; }
        .negative { color: #b42318; }
        .positive { color: #157347; }
        .legal { margin-top: 19px; border-top: 1px solid #cad6e0; padding-top: 9px; color: #586879; font-size: 8px; line-height: 1.5; }
        .foot { position: fixed; bottom: -31px; left: 0; right: 0; text-align: center; color: #738194; font-size: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <table class="brand">
            <tr>
                <td style="width:20%">
                    @if ($logo)
                        <img class="logo" src="{{ $logo }}" alt="GP Excelencia">
                    @endif
                </td>
                <td style="width:55%">
                    <h1>AJUSTE COMERCIAL DE VENTA</h1>
                    <div class="subtitle">GP Excelencia · Documento de modificación comercial</div>
                </td>
                <td class="number" style="width:25%">
                    AJ-{{ str_pad((string) $ajuste->idajuste, 5, '0', STR_PAD_LEFT) }}
                </td>
            </tr>
        </table>
    </div>

    <table class="info">
        <tr>
            <td><span class="label">Cotización:</span> CT{{ $ajuste->nocotizacion }}</td>
            <td><span class="label">Fecha efectiva:</span> {{ \Carbon\Carbon::parse($ajuste->fecha_efectiva)->format('d/m/Y') }}</td>
        </tr>
        <tr>
            <td><span class="label">Cliente:</span> {{ $ajuste->cliente ?: 'No especificado' }}</td>
            <td><span class="label">Tipo:</span> {{ $ajuste->tipo_ajuste === 'REDUCCION' ? 'REDUCCIÓN' : 'AUMENTO' }}</td>
        </tr>
        <tr>
            <td><span class="label">Solicitado por:</span> {{ $ajuste->solicitante ?: '—' }}</td>
            <td><span class="label">Autorizado por:</span> {{ $ajuste->autorizador ?: '—' }}</td>
        </tr>
    </table>

    <div class="box"><strong>Motivo autorizado:</strong> {{ $ajuste->motivo }}</div>
    @if ($ajuste->observaciones)
        <p><span class="label">Observaciones:</span> {{ $ajuste->observaciones }}</p>
    @endif

    <h2>Detalle de los renglones modificados</h2>
    <table class="detalles">
        <thead>
            <tr>
                <th style="width:33%">Descripción</th>
                <th style="width:10%">Cant. ant.</th>
                <th style="width:10%">Cant. nueva</th>
                <th style="width:15%">Total ant.</th>
                <th style="width:15%">Total nuevo</th>
                <th style="width:17%">Diferencia</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($detalles as $detalle)
                <tr>
                    <td>{{ $detalle->descripcion ?: 'Renglón ' . $detalle->iddetallecotizacion }}</td>
                    <td class="right">{{ number_format((float) $detalle->cantidad_anterior, 0) }}</td>
                    <td class="right">{{ number_format((float) $detalle->cantidad_nueva, 0) }}</td>
                    <td class="right">Q {{ number_format((float) $detalle->total_anterior, 2) }}</td>
                    <td class="right">Q {{ number_format((float) $detalle->total_nuevo, 2) }}</td>
                    <td class="right {{ (float) $detalle->diferencia < 0 ? 'negative' : 'positive' }}">{{ (float) $detalle->diferencia > 0 ? '+' : '' }}Q {{ number_format((float) $detalle->diferencia, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr><td>Valor comercial anterior</td><td class="right">Q {{ number_format((float) $ajuste->monto_anterior, 2) }}</td></tr>
        <tr><td>Variación autorizada</td><td class="right {{ (float) $ajuste->diferencia < 0 ? 'negative' : 'positive' }}">{{ (float) $ajuste->diferencia > 0 ? '+' : '' }}Q {{ number_format((float) $ajuste->diferencia, 2) }}</td></tr>
        <tr class="last"><td>Nuevo valor comercial</td><td class="right">Q {{ number_format((float) $ajuste->monto_nuevo, 2) }}</td></tr>
    </table>

    @if ($ajuste->observacion_aprobacion)
        <p style="margin-top:15px"><span class="label">Observación de autorización:</span> {{ $ajuste->observacion_aprobacion }}</p>
    @endif

    <div class="legal">
        <strong>Importante:</strong> Este documento refleja exclusivamente la modificación comercial aprobada sobre la cotización indicada.
        No constituye factura, nota de crédito, nota de débito ni documento tributario electrónico FEL.
        No modifica por sí mismo saldos de cuentas por cobrar ni órdenes de producción. La aplicación fiscal, contable y operativa debe gestionarse por separado.
    </div>
    <div class="foot">GP Excelencia · Documento comercial AJ-{{ str_pad((string) $ajuste->idajuste, 5, '0', STR_PAD_LEFT) }}</div>
</body>
</html>
