<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Facturas Anuladas</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 10.5px; color: #333; }
        h2 { text-align: center; margin-bottom: 4px; }
        p { text-align: center; font-size: 10px; margin-bottom: 15px; color: #555; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #999; padding: 5px 6px; }
        th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
        tr:nth-child(even) { background-color: #fafafa; }
        .totales { margin-top: 15px; }
        .totales table { width: 40%; margin-left: auto; border-collapse: collapse; }
        .totales th, .totales td { border: 1px solid #999; padding: 5px 6px; }
        .totales th { background-color: #eaeaea; text-align: left; }
    </style>
</head>
<body>
    <h2>Reporte de Facturas Anuladas</h2>
    <p>Período del {{ $fechaInicio }} al {{ $fechaFinal }}</p>

    <table>
        <thead>
            <tr>
                <th>No. Cotización</th>
                <th>Cliente</th>
                <th>No. Interno</th>
                <th>No. Factura</th>
                <th>UUID</th>
                <th>Fecha Certificación</th>
                <th>Fecha Anulación</th>
                <th>Usuario Anulación</th>
            </tr>
        </thead>
        <tbody>
            @forelse($registros as $r)
                <tr>
                    <td>{{ $r->nocotizacion }}</td>
                    <td>{{ $r->cliente }}</td>
                    <td>{{ $r->nointerno }}</td>
                    <td>{{ $r->numero }}</td>
                    <td>{{ $r->uuid }}</td>
                    <td>{{ $r->fecha_certificacion }}</td>
                    <td>{{ $r->fecha_anulacion }}</td>
                    <td>{{ $r->usuario_anulacion }}</td>
                </tr>
            @empty
                <tr><td colspan="8" style="text-align:center;">No se encontraron registros</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="totales">
        <h3 style="text-align:right; margin-right:15px;">Totales</h3>
        <table align="right">
            <thead>
                <tr>
                    <th>Usuario</th>
                    <th>Total Anuladas</th>
                </tr>
            </thead>
            <tbody>
                @foreach($porUsuario as $u)
                    <tr>
                        <td>{{ $u['usuario'] }}</td>
                        <td style="text-align:center;">{{ $u['total'] }}</td>
                    </tr>
                @endforeach
                <tr>
                    <th>Total General</th>
                    <th style="text-align:center;">{{ $totalGeneral }}</th>
                </tr>
            </tbody>
        </table>
    </div>
</body>
</html>
