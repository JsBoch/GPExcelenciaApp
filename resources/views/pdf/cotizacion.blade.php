<!DOCTYPE html>
<html>

<head>
    <title>Cotización {{ $cotizacion->nocotizacion }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }

        .header {
            display: flex; /* Usamos flexbox para alinear la imagen y el texto */
            align-items: center; /* Alinea verticalmente los elementos */
            margin-bottom: 20px;
        }

        .logo {
            margin-right: 20px; /* Espacio entre el logo y el texto */
            width: 150px;   /* Ajusta el ancho según lo necesites */
            height: auto;
        }

        .header-text {
            /* Estilos para el texto del encabezado si los necesitas */
        }

        .customer-info {
            margin-bottom: 20px;
        }

        .table-container {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        table,
        th,
        td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
        }

        .footer {
            text-align: right;
        }
    </style>
</head>

<body>
    <div class="header">
        <img src="{{ public_path('images/LogoGP.jpg') }}" alt="Logo GP Excelencia" class="logo">
        <h2>GP EXCELENCIA, S.A.</h2>
        <p>Tel: 2309-9419 / 2294-9257</p>
        <p>11 calle 41-20 Aldea "El Naranjito"</p>
        <p>Zona 6 de Mixco Guatemala</p>
        <p>Ventas: servicioalcliente@gpexcelencia.com</p>
        <p>Contabilidad: creditos@gpexcelencia.com</p>
        <p>www.gpexcelencia.com</p>
    </div>

    <div class="customer-info">
        <p><b>Número de Cotización:</b> {{ $cotizacion->nocotizacion }}</p>
        <p><b>Fecha de Cotización:</b> {{ \Carbon\Carbon::parse($cotizacion->fecha_cotizacion)->format('d/m/Y') }}</p>
        <p><b>Cliente:</b> {{ $cotizacion->cliente }}</p>
        <p><b>NIT:</b> {{ $cotizacion->nit ?? 'N/A' }}</p> {{-- Suponiendo que tienes NIT --}}
        <p><b>Contacto:</b> {{ $cotizacion->contacto }}</p>
        <p><b>Vendedor:</b> {{ $cotizacion->vendedor ?? 'N/A' }}</p> {{-- Suponiendo que tienes Vendedor --}}
        <p><b>Teléfono Vendedor:</b> {{ $cotizacion->telefono_vendedor ?? 'N/A' }}</p>
        {{-- Suponiendo que tienes Telefono Vendedor --}}
        <p><b>Correo Vendedor:</b> {{ $cotizacion->correo_vendedor ?? 'N/A' }}</p>
        {{-- Suponiendo que tienes Correo Vendedor --}}
        <p><b>Forma de Pago:</b> {{ $cotizacion->tipo_pago }}</p>
    </div>

    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Cantidad</th>
                    <th>Descripción</th>
                    <th>Precio</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($cotizacion->detalles as $detalle)
                    <tr>
                        <td>{{ $detalle->cantidad }}</td>
                        <td>{{ $detalle->descripcion }}</td>
                        <td>{{ number_format($detalle->precio, 2) }}</td>
                        <td>{{ number_format($detalle->total, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="footer">
        <p><b>Total:</b> {{ number_format($cotizacion->total_general, 2) }}</p>
        @if (isset($totalEnLetras))
            <p><b>Total en Letras:</b> {{ $totalEnLetras }}</p>
        @endif
    </div>
</body>

</html>