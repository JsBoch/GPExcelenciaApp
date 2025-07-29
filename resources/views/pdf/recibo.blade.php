<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Recibo</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 14px; }
        .encabezado { text-align: center; margin-bottom: 20px; }
        .tabla { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .tabla td, .tabla th { border: 1px solid #000; padding: 8px; }
    </style>
</head>
<body>
    <div class="encabezado">
        <h2>RECIBO DE PAGO</h2>
        <p>Fecha: {{ $fecha }}</p>
    </div>

    <p><strong>Recibo No.:</strong> {{ $recibo->idrecibo }}</p>
    <p><strong>Cliente:</strong> {{ $recibo->idcliente }}</p>
    <p><strong>Cuenta por Cobrar:</strong> #{{ $recibo->idcuentaporcobrar }}</p>

    <table class="tabla">
        <tr>
            <th>Monto Recibido</th>
            <td>Q {{ number_format($recibo->monto_recibido, 2) }}</td>
        </tr>
        <tr>
            <th>Método de Pago</th>
            <td>{{ $recibo->metodo_pago }}</td>
        </tr>
        <tr>
            <th>Referencia</th>
            <td>{{ $recibo->referencia }}</td>
        </tr>
        <tr>
            <th>Observaciones</th>
            <td>{{ $recibo->observaciones }}</td>
        </tr>
        <tr>
            <th>Registrado por</th>
            <td>{{ $recibo->usuario_creacion }}</td>
        </tr>
    </table>
</body>
</html>
