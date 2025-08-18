<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{{ $esCredito ? 'NOTA DE CRÉDITO' : 'NOTA DE DÉBITO' }}</title>
<style>
  *{ box-sizing: border-box; }
  body{ font-family: DejaVu Sans, sans-serif; font-size:12px; color:#222; }
  .row{ display:flex; gap:16px; }
  .col{ flex:1; }
  .header{ border-bottom:2px solid #273238; padding-bottom:8px; margin-bottom:12px; }
  .empresa h2{ margin:0 0 4px 0; }
  .badge{ display:inline-block; padding:4px 8px; border-radius:4px; color:#fff; font-weight:bold; }
  .badge.credito{ background:#0d6efd; } /* azul */
  .badge.debito{ background:#6c757d; }   /* gris */
  table{ width:100%; border-collapse: collapse; margin-top:8px; }
  th, td{ border:1px solid #bbb; padding:6px; vertical-align:top; }
  th{ background:#f4f5f7; text-align:left; }
  .t-right{ text-align:right; }
  .small{ font-size:10px; color:#666; }
</style>
</head>
<body>

<div class="header row">
  <div class="col empresa">
    <h2>{{ $empresa['nombre'] }}</h2>
    <div>NIT: {{ $empresa['nit'] }}</div>
    <div>{{ $empresa['direccion'] }}</div>
    <div>Tel: {{ $empresa['telefonos'] }} — {{ $empresa['email'] }}</div>
    <div>{{ $empresa['web'] }}</div>
  </div>
  <div class="col" style="text-align:right">
    <div class="badge {{ $esCredito ? 'credito':'debito' }}">
      {{ $esCredito ? 'NOTA DE CRÉDITO' : 'NOTA DE DÉBITO' }}
    </div>
    <div style="margin-top:8px">
      <strong>Serie/No.:</strong> {{ $nota->serie_nota ?? '-' }}-{{ $nota->numero_nota ?? '-' }}<br>
      <strong>UUID:</strong> <span class="small">{{ $nota->uuid_nota ?? '-' }}</span><br>
      <strong>Fecha:</strong> {{ $nota->fecha_nota ?? '-' }}
    </div>
  </div>
</div>

<table>
  <tr>
    <th style="width:35%">Cliente</th>
    <td style="width:65%">
      <strong>{{ $nota->cliente }}</strong><br>
      {{ $nota->direccion }}<br>
      Doc: {{ $nota->receptor_numero }}
    </td>
  </tr>
  <tr>
    <th>Motivo</th>
    <td>{{ $nota->motivo }}</td>
  </tr>
</table>

<table>
  <thead>
    <tr>
      <th>Descripción</th>
      <th class="t-right">Monto gravable</th>
      <th class="t-right">IVA</th>
      <th class="t-right">Total nota</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>{{ $esCredito ? 'Ajuste Nota de Crédito' : 'Ajuste Nota de Débito' }}</td>
      <td class="t-right">{{ number_format($nota->monto_gravable ?? 0, 2) }}</td>
      <td class="t-right">
        {{ $nota->exento_iva === 'S' ? '0.00' : number_format($nota->monto_impuesto ?? 0, 2) }}
      </td>
      <td class="t-right"><strong>{{ number_format($nota->monto ?? 0, 2) }}</strong></td>
    </tr>
  </tbody>
</table>

<table style="margin-top:8px">
  <tr>
    <th style="width:35%">Documento origen (Factura)</th>
    <td style="width:65%">
      Serie/No.: {{ $nota->serie_factura ?? '-' }}-{{ $nota->numero_factura ?? '-' }}<br>
      UUID: <span class="small">{{ $nota->uuid_factura ?? '-' }}</span><br>
      Fecha: {{ $nota->fecha_factura ?? '-' }}
    </td>
  </tr>
</table>

<p class="small" style="margin-top:10px">
  Documento generado electrónicamente conforme a la normativa FEL – SAT Guatemala.
</p>

</body>
</html>
