<!-- resources/views/pdf/partials/encabezado.blade.php -->
<header style="text-align: center; margin-bottom: 20px;">
    <h2>Estado de Cuenta Detallado</h2>
    <p><strong>Cliente:</strong> {{ $cliente->nombre ?? 'N/D' }}</p>
    <p><strong>Rango de Fechas:</strong> {{ $fechaInicio }} - {{ $fechaFinal }}</p>
</header>
