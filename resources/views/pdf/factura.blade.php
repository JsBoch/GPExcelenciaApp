<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <style>
        /* === Margen inferior = altura REAL del pie === */
        @page {
            margin: 15mm 12mm 18mm;
            /* antes 42mm */
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            position: relative;
            margin: 0;
        }

        /* Colchón para que el contenido nunca invada el pie */
        .content {
            position: relative;
            z-index: 2;
            /* padding-bottom: 75mm;   igual al margin-bottom de @page */
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

        .qr {
            width: 100px;
        }

        /* --- Marca de agua en todas las páginas --- */
        .watermark {
            position: fixed;
            top: 140mm;
            left: 50%;
            width: 140mm;
            height: 140mm;
            margin-left: -80mm;
            margin-top: -70mm;
            opacity: .06;
            z-index: 1;
        }

        /* Encabezado de la tabla (repite al saltar de página) */
        .tabla-detalles-head thead {
            display: table-header-group;
        }

        .tabla-detalles-head thead th {
            background: #000;
            color: #fff;
            border-color: #000;
        }

        .tabla-detalles-head thead th:first-child {
            border-top-left-radius: 8px;
        }

        .tabla-detalles-head thead th:last-child {
            border-top-right-radius: 8px;
        }

        table tbody tr {
            page-break-inside: avoid;
        }

        .tabla-detalles-body td {
            font-size: 10px;
            padding: 3px;
        }
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
        <table width="100%" style="border-collapse: separate; border-spacing: 0; margin-bottom: 10px; font-size: 10px; border: 1px solid #000; border-radius: 10px;">
            <tr>
                <td style="padding: 6px;">
                    <span>NIT:</span> {{ $cotizacion->nit }}<br>
                    <span>NOMBRE:</span> {{ $cotizacion->nombre }}<br>
                    <span>DIRECCIÓN:</span> {{ $cotizacion->direccion }}
                </td>
            </tr>
        </table>

        <!-- Encabezado detalle -->
        <table class="tabla-detalles-head" width="100%" style="border-collapse: separate; border-spacing: 0; font-size: 9px; border: 1px solid #000; border-radius: 8px;">
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
        <table width="100%" class="tabla-detalles-body" style="border-collapse: collapse;">
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
        <!-- Spacer SOLO para la última página (porque está al final del flujo) -->
        <div class="last-page-spacer" style="height:47mm;"></div>
    </div><!-- /content -->


    <!-- *** SIN footer HTML fijo *** -->


    <script type="text/php">
if (isset($pdf)) {
  $mm = 2.83465;

  // ==== Parámetros del pie (sin cambios de imágenes) ====
  $bottomMargin_mm = 18;     // igual al @page margin-bottom
  $imgH_mm         = 35;     // alto visible de la onda (footer_gp.jpg)
  $overlayH_mm     = 30;     // alto de la imagen con títulos (sujeto_pagos_gp.jpg)
  $txtPad_mm       = 2;      // padding superior para los valores

  // Parte de la onda que invade el área de contenido por encima del margen inferior
  $imgOverlap_mm   = max(0, $imgH_mm - $bottomMargin_mm);

  // Reserva REAL para la última página (overlay + solape de onda)
  $footerReserve_mm = $overlayH_mm + $imgOverlap_mm;   // 30 + (35-18)=47mm
  $footerReserve    = $footerReserve_mm * $mm;

  // Alturas en puntos
  $imgH     = $imgH_mm     * $mm;
  $overlayH = $overlayH_mm * $mm;
  $txtPad   = $txtPad_mm   * $mm;

  // Imágenes
  $footerImg  = public_path('images/footer_gp.jpg');           // onda
  $overlayImg = public_path('images/sujeto_pagos_gp.jpg');     // títulos

  // ===== Offsets hacia la derecha (en mm) =====
  // Aumenta estos valores si aún quieres correr más a la derecha.
  $letrasShift_pt = 36 * $mm;   // desplazamiento para "Total en letras" (valor)
  $autoShift_pt   = 25 * $mm;   // desplazamiento para "Número de autorización" (valor)
  $fechaShift_pt  = 16 * $mm;   // desplazamiento para "Fecha certificación" (valor)
  $montoRightPad_pt = 18 * $mm; // padding desde el borde derecho para el monto

  // Datos (solo valores)
  $fechaVenc   = "{{ \Carbon\Carbon::parse($cotizacion->fecha_emision)->format('d/m/Y') }}";
  $numAbono    = "1";
  $montoAb     = "{{ 'Q' . number_format($cotizacion->total ?? $cotizacion->total_general, 2, '.', ',') }}";
  $totalNum    = "{{ number_format($cotizacion->total_general ?? $cotizacion->total, 2, '.', ',') }}";
  $totalLetras = "{{ addslashes($totalEnLetras ?? '') }}";
  $numAuto     = "{{ addslashes($cotizacion->numero_autorizacion ?? '') }}";
  $fecCert     = "{{ addslashes($cotizacion->fecha_emision ?? '') }}";

  $shiftRightMm = 7;

  // Pre-escapar strings que irán dentro del page_script
  $txtMontoEsc  = addslashes($totalNum);
  $txtLetrasEsc = addslashes($totalLetras);
  $txtAutoEsc   = addslashes($numAuto);
  $txtFechaEsc  = addslashes($fecCert);
  $txtFELFecha  = addslashes($fechaVenc);
  $txtFELMonto  = addslashes($montoAb);

  // === NUEVO: bandera para sello ANULADA ===
  $__esAnulada = (int) {{ (int) $cotizacion->estado }} === 7 ? 1 : 0;

  $pdf->page_script('
  // ====== SELLO ANULADA EN TODAS LAS PÁGINAS ======
   if ('.$__esAnulada.') {
  $w = $pdf->get_width();
  $h = $pdf->get_height();
  $font  = $fontMetrics->getFont("DejaVu Sans", "bold");
  $text  = "ANULADA";
  $size  = 70;
  $angle = -30;

  // Encapsula cambios
  if (method_exists($pdf, "save")) { $pdf->save(); }

  // Fuerza estado limpio y color rojo
  if (method_exists($pdf, "set_opacity"))          { $pdf->set_opacity(1.0, "Normal"); } // SIN transparencia
  if (method_exists($pdf, "set_text_rendering_mode")) { $pdf->set_text_rendering_mode(0); } // 0 = fill
  if (method_exists($pdf, "set_text_color"))       { $pdf->set_text_color(255, 0, 0); }   // rojo puro
  if (method_exists($pdf, "set_stroke_color"))     { $pdf->set_stroke_color(255, 0, 0); } // por si el adapter usa stroke

  if (method_exists($pdf, "rotate")) { $pdf->rotate($angle, $w/2, $h/2); }

  $tw = $fontMetrics->getTextWidth($text, $font, $size);
  $pdf->text(($w/2) - ($tw/2), $h/2, $text, $font, $size);

  // Restablece estado para no afectar nada más
  if (method_exists($pdf, "restore")) { $pdf->restore(); }
}
    if ($PAGE_NUM == $PAGE_COUNT) {
      $mm = 2.83465;
      $w  = $pdf->get_width();
      $h  = $pdf->get_height();

      $imgH          = ' . $imgH . ';
      $overlayH      = ' . $overlayH . ';
      $footerReserve = ' . $footerReserve . ';
      $txtPad        = ' . $txtPad . ';
      $footerImg     = "' . addslashes($footerImg)  . '";
      $overlayImg    = "' . addslashes($overlayImg) . '";

      // Offsets calculados en puntos
      $letrasShift   = ' . $letrasShift_pt . ';
      $autoShift     = ' . $autoShift_pt   . ';
      $fechaShift    = ' . $fechaShift_pt  . ';
      $montoRightPad = ' . $montoRightPad_pt . ';

      // 1 Onda pegada abajo
      $pdf->image($footerImg, 0, $h - $imgH, $w, $imgH);

      // 2 Imagen con los títulos, justo encima de la onda
      $overlayY = $h - $imgH - $overlayH;
      $pdf->image($overlayImg, 0, $overlayY, $w, $overlayH);

      // 3 Solo VALORES, posicionados sobre la imagen de títulos
      $fontB = $fontMetrics->getFont("DejaVu Sans", "bold");
      $fontN = $fontMetrics->getFont("DejaVu Sans", "normal");

      $xL = 20 * $mm;                  // columna izquierda (ancla)
      $xR = $w - (80 * $mm);           // columna derecha (ancla aproximada)
      $yBase = $overlayY + $txtPad;    // base superior de la zona de textos

      // --- Total en letras (valor) -> corrido a la derecha ---
      $pdf->text($xL + $letrasShift, $yBase + (12 * $mm), "' . $txtLetrasEsc . '", $fontN, 8);

      // --- TOTAL Q. (valor) -> alineado a la derecha de su caja ---
      $montoTxt = "' . $txtMontoEsc . '";
      $montoSize = 10;
      $montoWidth = $fontMetrics->getTextWidth($montoTxt, $fontB, $montoSize);
      $xMonto = $w - $montoRightPad - $montoWidth;   // right-align
      $pdf->text($xMonto, $yBase + (10 * $mm), $montoTxt, $fontB, $montoSize);

      // --- Número de autorización (valor) -> corrido a la derecha ---
      $pdf->text($xL + $autoShift, $yBase + (22 * $mm), "' . $txtAutoEsc . '", $fontN, 7);

      // --- Fecha certificación (valor) -> corrido a la derecha ---
      $pdf->text($xR + $fechaShift, $yBase + (22 * $mm), "' . $txtFechaEsc . '", $fontN, 8);

      // 4 Campos FEL sobre la onda (siguen igual)
      $dx = (' . $shiftRightMm . ') * $mm;
      $pdf->text((29*$mm)+$dx, ($h-$imgH)+(6.5*$mm),  "' . $txtFELFecha . '", $fontB, 7);
      $pdf->text((30*$mm)+$dx, ($h-$imgH)+(9.5*$mm),  "1", $fontB, 7);
      $pdf->text((26*$mm)+$dx, ($h-$imgH)+(12*$mm), "' . $txtFELMonto . '", $fontB, 7);
    }
  ');
}
</script>




</body>

</html>