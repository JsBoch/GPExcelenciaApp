<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{{ $titulo }}</title>
<style>
* { font-family: DejaVu Sans, Arial, Helvetica, sans-serif; }
body { font-size: 12px; }
.header { display:flex; justify-content:space-between; }
.group { background:#f4f6f8; padding:6px; margin-top:14px; }
table { width:100%; border-collapse:collapse; }
th,td { padding:6px; border-bottom:1px solid #ddd; }
th { background:#eef2f6; }
.right { text-align:right; }
.subtotal { font-weight:bold; background:#f9fafb; }
.grand { font-weight:bold; background:#e9f7ef; }
</style>
</head>
<body>

<div class="header">
    <div>
        <strong>{{ $titulo }}</strong><br>
        Rango: {{ $rango['inicio'] }} a {{ $rango['fin'] }}<br>
        Impreso: {{ $impreso_en }}
    </div>
</div>

@foreach($recibos as $rec)
<div class="group">
    <strong>Recibo:</strong> {{ $rec['serie'] }} {{ $rec['numero'] }} |
    <strong>Fecha:</strong> {{ $rec['fecha_recibo'] }}<br>
    <strong>Cliente:</strong> {{ $rec['cliente_codigo'] }} — {{ $rec['cliente_nombre'] }}
</div>

<table>
<thead>
<tr>
    <th>Fecha factura</th>
    <th>No. interno</th>
    <th class="right">Monto</th>
</tr>
</thead>
<tbody>
@foreach($rec['detalles'] as $d)
<tr>
    <td>{{ $d['fecha_emision'] }}</td>
    <td>{{ $d['nointerno'] }}</td>
    <td class="right">Q {{ number_format($d['monto_pagado'],2) }}</td>
</tr>
@endforeach
<tr class="subtotal">
    <td colspan="2" class="right">TOTAL RECIBO:</td>
    <td class="right">Q {{ number_format($rec['total_recibo'],2) }}</td>
</tr>
</tbody>
</table>
@endforeach

<table style="margin-top:12px;">
<tr class="grand">
    <td class="right" style="width:85%">TOTAL GENERAL:</td>
    <td class="right">Q {{ number_format($total_general,2) }}</td>
</tr>
</table>

</body>
</html>
