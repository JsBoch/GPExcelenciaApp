<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <style>
        /* deja espacio reservado para el footer en la página */
        @page {
            margin: 15mm 12mm 36mm;
            /* margen inferior >= altura del footer visible */
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            position: relative;
            margin: 0;
        }

        /* por si el motor ignora @page, reserva espacio manual también */
        .content {
            margin-bottom: 36mm;
            /* igual o mayor que altura del footer */
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
            border: 1px solid #000;
            border-collapse: collapse;
        }

        .tabla-detalles th,
        .tabla-detalles td {
            padding: 5px;
            font-size: 11px;
        }

        /* ===== Footer fijo con línea ondulada como background ===== */
        .footer {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            height: 32mm;
            /* alto total del área del pie */
            /* padding:10px 20px 35px;    deja espacio sobre la onda */
            font-size: 10px;
            /* background: url('{{ public_path("images/final_line.png") }}') no-repeat bottom center;
      background-size: 100% 45px; ajusta a tu imagen */
        }

        .footer .wrap {
            position: relative;
            padding: 8px 20px 14mm;
            /* deja despeje sobre la onda */
            z-index: 2;
            /* contenido por encima de la onda */
            background: transparent;
        }

        .footer .onda {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 12mm;
            /* alto visible de la onda */
            object-fit: cover;
            /* asegura estirado horizontal */
            z-index: 1;
        }

        .qr {
            width: 100px;
        }

        .bg-logo {
            position: absolute;
            top: 300px;
            left: 25%;
            opacity: 0.1;
            width: 400px;
        }

        .encabezado-doc {
            border: 1px solid #000;
            padding: 6px;
            display: inline-block;
            font-size: 11px;
        }

        .bold {
            font-weight: 700;
        }
    </style>
</head>

<body>

    <div class="content">
        <!-- Encabezado -->
        <table width="100%" style="border-collapse: collapse; margin-bottom: 10px;">
            <tr>
                <td style="width: 15%; text-align: left;">
                    <img src="{{ public_path('images/LogoGP.png') }}" style="height: 180px;">
                </td>

                <td style="width: 45%; text-align: center; font-size: 11px;">
                    <strong style="font-size: 14px;">GP EXCELENCIA, S.A.</strong><br>
                    Tel: 2309-9419 &nbsp;&nbsp; 2294-9257<br>
                    11 calle, 41-20 Aldea “El Naranjito”,<br>
                    Zona 6 de Mixco, Guatemala<br>
                    <span style="color: red;">Ventas: serviciocliente@gpexcelencia.com</span><br>
                    Contabilidad: creditos@gpexcelencia.com<br>
                    <span style="color: #0074cc;">Número Interno: {{ $cotizacion->numero_interno }}</span>
                </td>

                <td style="width: 40%; text-align: right; font-size: 10px;">
                    <span>DOCUMENTO TRIBUTARIO ELECTRONICO</span><br>

                    <div style="
          display:inline-block; text-align:left; border:1px solid #000; border-radius:16px;
          position:relative; padding:26px 14px 10px; font-size:12px; background:#fff; margin-top:10px;">
                        <div style="
            position:absolute; top:-10px; left:1px; right:1px; background:#fff;
            border:1px solid #000; border-radius:18px; padding:4px 0; font-weight:700; text-align:center; white-space:nowrap;">
                            Factura Cambiaria Electrónica
                        </div>
                        <div style="padding:4px 6px 6px;">
                            <strong>Serie:</strong> {{ $cotizacion->serie }}<br>
                            <strong>No.:</strong> {{ $cotizacion->numero }}<br>
                            <strong>Fecha Emisión:</strong> {{ \Carbon\Carbon::parse($cotizacion->fecha_emision)->format('d/m/Y') }}
                        </div>
                    </div><br>
                    <strong>NIT.: <span style="font-size: 13px;">109126599</span></strong><br>
                    GP Excelencia, Sociedad Anónima
                </td>
            </tr>
        </table>

        <!-- Información del cliente -->
        <table width="100%" style="border-collapse: separate; border-spacing: 0; margin-bottom: 10px; font-size: 12px; border: 1px solid #000; border-radius: 10px;">
            <tr>
                <td style="padding: 6px;">
                    <span>NIT:</span> {{ $cotizacion->nit }}<br>
                    <span>NOMBRE:</span> {{ $cotizacion->nombre }}<br>
                    <span>DIRECCIÓN:</span> {{ $cotizacion->direccion }}
                </td>
            </tr>
        </table>

        <!-- Encabezado detalle -->
        <table width="100%" style="border-collapse: separate; border-spacing: 0; font-size: 12px; border: 1px solid #000; border-radius: 8px;">
            <thead>
                <tr>
                    <th style="width: 10%; border-right: 1px solid #000; padding: 4px; border-top-left-radius: 8px;">Cant.</th>
                    <th style="width: 60%; border-right: 1px solid #000; padding: 4px;">Descripción</th>
                    <th style="width: 15%; border-right: 1px solid #000; padding: 4px; text-align: right;">Precio</th>
                    <th style="width: 15%; padding: 4px; text-align: right; border-top-right-radius: 8px;">Total</th>
                </tr>
            </thead>
        </table>

        <!-- Detalle (sin bordes) -->
        <table width="100%" style="border-collapse: collapse; font-size: 12px;">
            <tbody>
                @foreach ($detalles as $item)
                <tr>
                    <td style="padding: 4px; text-align: center; width: 10%;">{{ number_format($item->cantidad, 0) }}</td>
                    <td style="padding: 4px; width: 60%;">{{ $item->descripcion }}</td>
                    <td style="padding: 4px; text-align: right; width: 15%;">{{ number_format($item->precio, 2) }}</td>
                    <td style="padding: 4px; text-align: right; width: 15%;">{{ number_format($item->total, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div> <!-- /content -->

    <!-- Pie de página fijo -->
    <div class="footer">


        <!-- Contenido del pie -->
        <div class="wrap">
            <table width="100%" style="font-size:10px;">
                <tr>
                    <td colspan="3"><strong>Sujeto a Pagos Trimestrales</strong></td>
                </tr>
                <tr>
                    <td style="width:60%;">
                        <strong>Total en Letras</strong><br>
                        {{ $totalEnLetras }}
                    </td>
                    <td style="width:40%; text-align:right; font-weight:700;">TOTAL Q.TOTAL Q. {{ number_format($cotizacion->total_general ?? $cotizacion->total, 2, '.', ',') }}</td>
                </tr>
                <tr>
                    <td style="width:50%;">
                        <strong>Número de Autorización</strong><br>
                        <div style="border:1px solid #000; padding:3px; border-radius:8px;">
                            {{ $cotizacion->numero_autorizacion }}
                        </div>
                    </td>
                    <td style="width:50%;">
                        <strong>Fecha certificación</strong><br>
                        <div style="border:1px solid #000; padding:3px; border-radius:8px;">
                            {{ $cotizacion->fecha_emision }}
                        </div>
                    </td>
                </tr>
                <tr>
                    <td colspan="2"><strong>CERTIFICADOR: INFILE, S.A. NIT: 12521337</strong></td>
                </tr>
            </table>

            <table width="100%" style="margin-top:6px; font-size:10px;">
                <tr>
                    <td style="width:30%; vertical-align:top;">
                        <table style="width:100%; border:1px solid #ccc; border-collapse:collapse;">
                            <tr>
                                <td style="padding:4px; border:1px solid #ccc;">Fecha vencimiento:</td>
                                <td style="padding:4px; border:1px solid #ccc;">
                                    {{ \Carbon\Carbon::parse($cotizacion->fecha_emision)->format('d/m/Y') }}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:4px; border:1px solid #ccc;">Número de abono:</td>
                                <td style="padding:4px; border:1px solid #ccc;">1</td>
                            </tr>
                            <tr>
                                <td style="padding:4px; border:1px solid #ccc;">Monto de abono:</td>
                                <td style="padding:4px; border:1px solid #ccc;">Q{{ number_format($cotizacion->total, 2, '.', ',') }}</td>
                            </tr>
                        </table>
                    </td>

                    <td style="width:40%; vertical-align:top;">
                        <table style="width:100%; border-collapse:collapse;">
                            <tr>
                                <td style="width:50%;">NOMBRE ________________</td>
                                <td style="width:50%;">SELLO ___________</td>
                            </tr>
                            <tr>
                                <td>&nbsp;&nbsp;&nbsp;FIRMA ________________</td>
                                <td>FECHA ___________</td>
                            </tr>
                        </table>
                    </td>

                    <td style="width:30%; text-align:center; vertical-align:top;">
                        <table style="margin:6px auto; border-collapse:collapse;">
                            <tr>
                                <td style="text-align:center; padding-right:20px;">
                                    <img src="{{ public_path('images/qrfel.png') }}" width="80" height="80" alt="Código QR"><br>
                                    <span style="font-size:10px;">Escanee el código QR</span>
                                </td>
                                <td style="text-align:center;">
                                    <img src="{{ public_path('images/fel.jpg') }}" width="50" height="50" alt="FEL">
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
        <!-- Imagen ondulada al fondo, pegada al borde -->
        <!-- <img class="onda" src="{{ public_path('images/final_line.png') }}" alt=""> -->
    </div>
    <!-- Imagen ondulada al fondo, pegada al borde -->
    <!-- <img class="onda" src="{{ public_path('images/final_line.png') }}" alt=""> -->
    <!-- Marca de agua -->
    <img src="{{ public_path('images/marca_agua_gp.png') }}" class="bg-logo">

</body>

</html>