<!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: sans-serif;
      font-size: 12px;
      color: #333;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
    }

    .header .empresa {
      font-size: 18px;
      font-weight: bold;
    }

    .header .titulo {
      font-size: 16px;
      margin-top: 5px;
    }

    .header .info {
      margin-top: 5px;
      font-size: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    th,
    td {
      border: 1px solid #bbb;
      padding: 6px;
    }

    th {
      background-color: #eee;
    }

    .totales-vendedor {
      background-color: #f9f9f9;
      font-weight: bold;
    }

    .total-general {
      font-size: 14px;
      font-weight: bold;
      text-align: right;
      margin-top: 10px;
    }

    .page-break {
      page-break-after: always;
    }
  </style>
</head>

<body>
  <div class="header">
    <div class="empresa">{{ $encabezado['empresa'] }}</div>
    <div class="titulo">{{ $encabezado['titulo'] }}</div>
    <div class="info">Período: {{ $encabezado['periodo'] }}</div>
    <div class="info">Impreso: {{ $encabezado['fecha_impresion'] }}</div>
  </div>

  {{-- 🔹 Recorrer vendedores --}}
  @foreach ($agrupado as $vendedor)
  <table>
    <thead>
      <tr>
        <th colspan="3">Vendedor: {{ $vendedor->vendedor_nombre }}</th>
      </tr>
      <tr>
        <th>Código Cliente</th>
        <th>Nombre Cliente</th>
        <th>Total Ventas</th>
      </tr>
    </thead>
    <tbody>
      @foreach ($vendedor->clientes as $cliente)
      <tr>
        <td>{{ $cliente->codigo }}</td>
        <td>{{ $cliente->nombre }}</td>
        <td style="text-align: right;">{{ number_format($cliente->total_ventas, 2) }}</td>
      </tr>
      @endforeach
      <tr class="totales-vendedor">
        <td colspan="2" style="text-align: right;">Subtotal {{ $vendedor->vendedor_nombre }}</td>
        <td style="text-align: right;">{{ number_format($vendedor->total_por_vendedor, 2) }}</td>
      </tr>
    </tbody>
  </table>

  {{-- 🔹 Gráfica del vendedor --}}
  @if (isset($graficasPorVendedor[$vendedor->vendedor_nombre]) && $graficasPorVendedor[$vendedor->vendedor_nombre])
  <div style="text-align:center; margin: 15px 0;">
    <img src="data:image/png;base64,{{ $graficasPorVendedor[$vendedor->vendedor_nombre] }}"
         alt="Gráfica de {{ $vendedor->vendedor_nombre }}"
         style="max-width: 100%; height: auto;">
  </div>
  @endif

  {{-- Salto de página si no es el último --}}
  @if (!$loop->last)
  <div class="page-break"></div>
  @endif
  @endforeach

  <div class="total-general">
    Total General: {{ number_format($total_general, 2) }}
  </div>
</body>

</html>
