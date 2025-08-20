<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <style>
        /* deja espacio reservado para el footer en la página */
        @page {
            margin: 15mm 12mm 36mm;

            /* margen inferior >= altura del footer visible */
            @bottom-center {
                content: element(footer);
            }
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            position: relative;
            margin: 0;
        }

        /* por si el motor ignora @page, reserva espacio manual también */
        .content {
            margin-bottom: 0;
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


        .footer .wrap {
            position: relative;
            /* padding: 8px 20px 14mm; */
            /* padding: 6px 20px 6mm; */
            padding-bottom: 0mm;
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

        .fel-footer-bg {
            position: absolute;
            inset: 0;
            /* top/right/bottom/left = 0 */
            width: 100%;
            height: 100%;
            object-fit: cover;
            /* que la imagen se estire ancho completo */
        }

        /* Los tres valores que se imprimen sobre la imagen */
        .fel-field {
            position: absolute;
            font-size: 7px;
            font-weight: 700;
            letter-spacing: .2px;
        }

        /* Coordenadas: ajústalas a tu imagen hasta calzar con las líneas  */
        .fel-fecha {
            left: 29mm;
            top: 7mm;
        }

        /* FECHA DE VENCIMIENTO */
        .fel-nabono {
            left: 30mm;
            top: 10mm;
        }

        /* NÚMERO DE ABONO */
        .fel-monto {
            left: 26mm;
            top: 12mm;
        }

        /* --- Marca de agua en todas las páginas --- */
        .watermark {
            position: fixed;
            /* aparece en todas las páginas */
            top: 140mm;
            left: 50%;
            width: 140mm;
            /* ajusta al tamaño que te guste */
            height: 140mm;
            /* pon un alto fijo para poder centrarla */
            margin-left: -80mm;
            /* -width/2  -> centra horizontal */
            margin-top: -70mm;
            /* -height/2 -> centra vertical */
            opacity: 0.06;
            /* transparencia */
            z-index: 1;
            /* debajo del contenido y del footer */
        }

        .content {
            position: relative;
            z-index: 2;
        }

        .footer {
            position: relative;
            margin-top: 0;
            page-break-inside: avoid;
            /* no cortar el footer en dos */
        }

        /* ya lo tienes fixed */

        .tabla-detalles-head thead th {
            background: #000;
            color: #fff;
            border-color: #000;
            /* evita borde claro sobre el fondo */
        }

        .tabla-detalles-head thead th:first-child {
            border-top-left-radius: 8px;
        }

        .tabla-detalles-head thead th:last-child {
            border-top-right-radius: 8px;
        }

        /* MONTO DE ABONO */
    </style>
</head>

<body>
    <img src="{{ public_path('images/marca_agua_gp.png') }}" class="watermark" alt="Marca de agua">

    <div class="content">
        <!-- Encabezado -->
        <table width="100%" style="border-collapse: collapse; margin-bottom: 10px;">
            <tr>
                <td style="width: 15%; text-align: left;">
                    <img src="{{ public_path('images/LogoGP.jpg') }}" style="height: 180px;">
                </td>

                <td style="width: 45%; text-align: center; font-size: 11px;">
                    <strong style="font-size: 14px;">GP EXCELENCIA, S.A.</strong><br>
                    Tel: 2309-9419 &nbsp;&nbsp; 2294-9257<br>
                    11 calle, 41-20 Aldea “El Naranjito”,<br>
                    Zona 6 de Mixco, Guatemala<br>
                    <span>Ventas: serviciocliente@gpexcelencia.com</span><br>
                    Contabilidad: creditos@gpexcelencia.com<br>
                    <span>Número Interno: {{ $cotizacion->numero_interno }}</span>
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
        <table class="tabla-detalles-head" width="100%" style="border-collapse: separate; border-spacing: 0; font-size: 12px; border: 1px solid #000; border-radius: 8px;">
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
            <!-- ↓ Empuje para bajar el bloque superior -->
            <div style="height: 80mm;"></div> <!-- ajusta 16–24mm según necesites -->

            <!-- Bloque superior: sujeto a pagos + total en letras -->
            <table width="100%" style="font-size:10px;">
                <tr>
                    <td colspan="3"><strong>Sujeto a Pagos Trimestrales</strong></td>
                </tr>
                <tr>
                    <td style="width:60%;">
                        <strong>Total en Letras</strong><br>
                        {{ $totalEnLetras }}
                    </td>
                    <td style="width:40%; text-align:right; font-weight:700;">
                        TOTAL Q. {{ number_format($cotizacion->total_general ?? $cotizacion->total, 2, '.', ',') }}
                    </td>
                </tr>
            </table>

            <!-- ↓ Empuje para mantener “Número de Autorización / Fecha…” donde está -->
            <div style="height: 2mm;"></div> <!-- 82mm - 20mm = 62mm -->

            <!-- Bloque inferior: autorización y fecha -->
            <table width="100%" style="font-size:10px;">
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
            </table>
        </div>


        <!-- Imagen ondulada al fondo, pegada al borde -->
        <!-- <img class="onda" src="{{ public_path('images/final_line.png') }}" alt=""> -->
    </div>


    <script type="text/php">
        if (isset($pdf)) {
    $mm = 2.83465;
    $footerHeightPt = 36 * $mm;
    $footerImg      = public_path('images/footer_gp.jpg');

    // Valores desde Blade
    $fechaVenc = "{{ \Carbon\Carbon::parse($cotizacion->fecha_emision)->format('d/m/Y') }}";
    $numAbono  = "1";
    $montoAb   = "{{ 'Q' . number_format($cotizacion->total ?? $cotizacion->total_general, 2, '.', ',') }}";

    // >>> Desplazamiento hacia la derecha en milímetros (ajusta 4–10 mm a gusto)
    $shiftRightMm = 7;

    $pdf->page_script('
        if ($PAGE_NUM == $PAGE_COUNT) {
            $w = $pdf->get_width();
            $h = $pdf->get_height();
            $mm = 2.83465;

            // Imagen del footer, pegada abajo
            $img = "'.addslashes($footerImg).'";
            $fh  = '.$footerHeightPt.';
            $pdf->image($img, 0, $h - $fh, $w, $fh);

            $font = $fontMetrics->getFont("DejaVu Sans", "bold");
            $size = 7;

            // Desplazamiento a la derecha
            $dx = '.$shiftRightMm.' * $mm;

            // Coordenadas (X + dx)
            $x_fecha = (29 * $mm) + $dx;  $y_fecha = ($h - $fh) +  (7 * $mm);
            $x_abono = (30 * $mm) + $dx;  $y_abono = ($h - $fh) + (10 * $mm);
            $x_monto = (26 * $mm) + $dx;  $y_monto = ($h - $fh) + (12 * $mm);

            $pdf->text($x_fecha, $y_fecha, "'.addslashes($fechaVenc).'", $font, $size);
            $pdf->text($x_abono, $y_abono, "'.addslashes($numAbono).'",  $font, $size);
            $pdf->text($x_monto, $y_monto, "'.addslashes($montoAb).'",   $font, $size);
        }
    ');
}
</script>

</body>

</html>