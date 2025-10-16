<table>
  <tr>
    <th colspan="4" style="font-size:16px;">{{ $encabezado['empresa'] }}</th>
  </tr>
  <tr>
    <th colspan="4" style="font-size:14px;">{{ $encabezado['titulo'] }}</th>
  </tr>
  <tr>
    <th>Período:</th>
    <td colspan="3">{{ $encabezado['periodo'] }}</td>
  </tr>
  <tr>
    <th>Impresión:</th>
    <td colspan="3">{{ $encabezado['fecha_impresion'] }}</td>
  </tr>
</table>

<br>

<table>
  <thead>
    <tr>
      <th>Vendedor</th>
      <th>Código Cliente</th>
      <th>Nombre Cliente</th>
      <th>Total Ventas</th>
    </tr>
  </thead>
  <tbody>
    @foreach ($rows as $r)
    <tr>
      <td>{{ $r->vendedor_nombre }}</td>
      <td>{{ $r->cliente_codigo }}</td>
      <td>{{ $r->cliente_nombre }}</td>
      <td style="text-align: right;">{{ number_format($r->total_ventas, 2) }}</td>
    </tr>
    @endforeach

    @foreach ($totalesPorVendedor as $vendedor => $suma)
    <tr>
      <td colspan="3" style="text-align: right;"><strong>Total {{ $vendedor }}</strong></td>
      <td style="text-align: right;"><strong>{{ number_format($suma,2) }}</strong></td>
    </tr>
    @endforeach
  </tbody>
</table>

<div style="page-break-inside: avoid; text-align: right; font-weight: bold; margin-top: 10px;">
  Total General: {{ number_format($totalGeneral, 2) }}
</div>
