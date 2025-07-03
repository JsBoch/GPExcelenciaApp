<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            position: relative;
        }

        .empresa-info {
            width: 100%;
            margin-bottom: 10px;
        }

        .empresa-info td {
            vertical-align: top;
        }

        .empresa-contacto {
            font-size: 10px;
        }

        .tabla-detalles,
        .tabla-detalles th,
        .tabla-detalles td {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .tabla-detalles th,
        .tabla-detalles td {
            padding: 5px;
            font-size: 11px;
        }

        .footer {
            position: fixed;
            bottom: 20px;
            width: 100%;
            font-size: 10px;
        }

        .qr {
            width: 100px;
        }

        .bg-logo {
            position: absolute;
            top: 200px;
            left: 30%;
            opacity: 0.1;
            width: 300px;
        }

        .encabezado-doc {
            border: 1px solid black;
            padding: 6px;
            display: inline-block;
            font-size: 11px;
        }

        .bold {
            font-weight: bold;
        }
    </style>
</head>

<body>
    <!-- Encabezado -->
    <table width="100%" style="border-collapse: collapse; margin-bottom: 10px;">
        <tr>
            <!-- Columna 1: Logo -->
            <td style="width: 20%; text-align: left;">
                <img src="{{ public_path('images/LogoGP.png') }}" style="height: 90px;">
            </td>

            <!-- Columna 2: Info Empresa -->
            <td style="width: 50%; text-align: center; font-size: 11px;">
                <strong style="font-size: 14px;">GP EXCELENCIA, S.A.</strong><br>
                Tel: 2309-9419 &nbsp;&nbsp; 2294-9257<br>
                11 calle, 41-20 Aldea “El Naranjito”,<br>
                Zona 6 de Mixco, Guatemala<br>
                <span style="color: red;">Ventas: serviciocliente@gpexcelencia.com</span><br>
                Contabilidad: creditos@gpexcelencia.com<br>
                <span style="color: #0074cc;">Número Interno: {{ $cotizacion->numero_interno }}</span>
            </td>

            <!-- Columna 3: Info DTE -->
            <td style="width: 30%; text-align: right; font-size: 10px;">
                <strong>DOCUMENTO TRIBUTARIO ELECTRONICO</strong><br>
                <div style="border: 1px solid #000; padding: 5px; display: inline-block; text-align: left;">
                    <strong style="font-size: 11px;">Factura Cambiaria Electrónica</strong><br>
                    <strong>Serie:</strong> {{ $cotizacion->serie }}<br>
                    <strong>No.:</strong> {{ $cotizacion->numero }}<br>
                    <strong>Fecha Emisión:</strong> {{ \Carbon\Carbon::parse($cotizacion->fecha_emision)->format('d/m/Y') }}
                </div><br>
                <strong>NIT.: <span style="font-size: 13px;">109126599</span></strong><br>
                GP Excelencia, Sociedad Anónima
            </td>
        </tr>
    </table>

    <!-- Información del cliente -->
    <table width="100%" style="border-collapse: collapse; margin-bottom: 10px; font-size: 12px;">
        <tr>
            <td style="border: 1px solid #000; padding: 6px;">
                <strong>NIT:</strong> {{ $cotizacion->nit }}<br>
                <strong>NOMBRE:</strong> {{ $cotizacion->nombre }}<br>
                <strong>DIRECCIÓN:</strong> {{ $cotizacion->direccion }}
            </td>
        </tr>
    </table>

    <!-- Datos cliente -->
    <table width="100%" style="border-collapse: collapse; margin-top: 15px; font-size: 12px;">
        <thead>
            <tr>
                <th style="width: 10%; border: 1px solid #000; padding: 4px;">Cant.</th>
                <th style="width: 60%; border: 1px solid #000; padding: 4px;">Descripción</th>
                <th style="width: 15%; border: 1px solid #000; padding: 4px; text-align: right;">Precio</th>
                <th style="width: 15%; border: 1px solid #000; padding: 4px; text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($detalles as $item)
            <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">
                    {{ number_format($item->cantidad, 0) }}
                </td>
                <td style="border: 1px solid #000; padding: 4px; word-wrap: break-word; white-space: normal;">
                    {{ $item->descripcion }}
                </td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">
                    {{ number_format($item->precio, 2) }}
                </td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">
                    {{ number_format($item->total, 2) }}
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Pie de página -->
    <div class="footer">
        <table width="100%" style="font-size: 10px;">
            <tr>
                <td colspan="3"><strong>Sujeto a Pagos Trimestrales</strong></td>
            </tr>
            <tr>
                <td style="width: 40%;">
                    <strong>Total en Letras</strong><br>

                    {{ $totalEnLetras }}

                </td>
            </tr>
            <tr>
                <td style="width: 30%;">
                    <strong>Número de Autorización</strong><br>
                    <div style="border: 1px solid black; padding: 3px; border-radius: 8px;">
                        {{ $cotizacion->numero_autorizacion }}
                    </div>
                </td>
                <td style="width: 30%;">
                    <strong>Fecha certificación</strong><br>
                    <div style="border: 1px solid black; padding: 3px; border-radius: 8px;">
                        {{ $cotizacion->fecha_emision }}
                    </div>
                </td>
            </tr>
            <tr>
                <strong>CERTIFICADOR: INFILE, S.A. NIT: 12521337</strong><br>
            </tr>
        </table>

        <table width="100%" style="margin-top: 8px; font-size: 10px;">
            <tr>

                <div style="margin-top: 30px; font-size: 10px;">
                    <table style="width: 100%; border: 1px solid #ccc; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 4px; border: 1px solid #ccc;">Fecha vencimiento:</td>
                            <td style="padding: 4px; border: 1px solid #ccc;">
                                {{ \Carbon\Carbon::parse($cotizacion->fecha_emision)->format('d/m/Y') }}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; border: 1px solid #ccc;">Número de abono:</td>
                            <td style="padding: 4px; border: 1px solid #ccc;">1</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px; border: 1px solid #ccc;">Monto de abono:</td>
                            <td style="padding: 4px; border: 1px solid #ccc;">
                                Q{{ number_format($cotizacion->total, 2, '.', ',') }}
                            </td>
                        </tr>
                    </table>
                </div>
                <td style="width: 40%;">

                    NOMBRE ______________________ &nbsp; SELLO _____________<br>
                    FIRMA ______________________ &nbsp; FECHA _____________
                </td>
                <td style="width: 20%; text-align: center;">
                    <div style="margin-top: 20px; display: flex; justify-content: center; align-items: flex-start; gap: 20px;">
                        <!-- Columna izquierda: Imagen QR con texto -->
                        <div style="text-align: center;">
                            <img src="{{ public_path('images/qrfel.png') }}" width="80" height="80" alt="Código QR">
                            <div style="font-size: 10px; margin-top: 4px;">Escanee el código QR</div>
                        </div>

                        <!-- Columna derecha: Logo FEL -->
                        <div style="text-align: center;">
                            <img src="{{ public_path('images/fel.jpg') }}" width="50" height="50" alt="FEL">
                        </div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- <img src="{{ public_path('images/final_line.png') }}" style="width: 100%; margin-top: 10px;"> -->
    </div>

    <!-- Marca de agua -->
    <img src="{{ public_path('images/marca_agua_gp.png') }}" class="bg-logo">
</body>

</html>