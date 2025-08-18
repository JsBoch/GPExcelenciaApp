<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <style>
        /* Fuente y tamaños base */
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11pt;
            line-height: 1.25;
        }

        /* Márgenes por modo (carta vs media carta) */
        @if($isHalf)

        /* MEDIA CARTA: sin header/footer fijos, márgenes compactos */
        @page {
            size: 612pt 396pt;
            margin: 18pt 28pt 22pt 28pt;
        }

        @else

        /* CARTA: pie fijo, reservamos margen inferior */
        @page {
            size: letter portrait;
            margin: 28pt 32pt 110pt 32pt;
        }

        @endif

        /* Encabezado */
        .header {
            display: table;
            width: 100%;
            margin-bottom: 8pt;
        }

        .hcell {
            display: table-cell;
            vertical-align: top;
        }

        .h-left {
            width: 33%;
        }

        .h-mid {
            width: 34%;
            text-align: center;
        }

        .h-right {
            width: 33%;
            text-align: right;
        }

        .title {
            font-size: 14pt;
            font-weight: bold;
            margin: 0 0 2pt 0;
        }

        .contact {
            font-size: 9pt;
            margin: 0;
        }

        .phones {
            margin-top: 2pt;
            font-weight: bold;
        }

        .logo {
            width: 100px;
        }

        /* Bloques de datos generales */
        .block {
            margin-bottom: 10pt;
        }

        .label {
            font-weight: bold;
        }

        /* Tabla simple (dos columnas) */
        .thead {
            margin: 6pt 0 4pt 0;
            border-bottom: 1pt solid #000;
            padding-bottom: 2pt;
            font-weight: bold;
        }

        .row-item {
            margin: 2pt 0;
        }

        /* Pie */
        @if( !$isHalf) .footer {
            position: fixed;
            left: 32pt;
            right: 32pt;
            bottom: 32pt;
        }

        @else .footer {
            margin-top: 10pt;
        }

        /* en media carta, pie "normal" */
        @endif .red {
            color: #c00;
            font-weight: bold;
            text-align: center;
            margin: 8pt 0;
        }

        .line {
            border-bottom: 1pt solid #000;
            height: 14pt;
            margin-top: 12pt;
        }

        .signatures {
            display: table;
            width: 100%;
            margin-top: 8pt;
        }

        .sig {
            display: table-cell;
            width: 33%;
            text-align: center;
            padding: 0 6pt;
        }
    </style>
</head>

<body>

    {{-- ENCABEZADO (NO FIXED para que no se repita en cada página) --}}
    <div class="header">
        <div class="hcell h-left">
            @if($logoBase64)
            <img class="logo" src="{{ $logoBase64 }}" alt="Logo">
            @endif
        </div>
        <div class="hcell h-mid">
            <div class="title">GP Excelencia S.A.</div>
            <p class="contact" style="margin-top:2pt;">ventas@gpexcelencia.com</p>
            <p class="contact">www.gpexcelencia.com</p>
            <p class="contact">11 Calle 41-21 Aldea "El Naranjo" Zona 6 de Mixco, Guatemala</p>
            <p class="contact phones">Tel: 2309-9419 &nbsp;&nbsp; WhatsApp: 3595-5875</p>
        </div>
        <div class="hcell h-right">
            <div class="title" style="margin-bottom:4pt;">NOTA DE ENVÍO</div>
            <div style="font-size: 12pt; font-weight: bold;">N° {{ $encabezado->noenvio }}</div>
        </div>
    </div>

    {{-- DATOS PRINCIPALES --}}
    <div class="block">
        <div><span class="label">EMPRESA:</span> {{ $encabezado->cliente }}</div>
        <div><span class="label">DIRECCIÓN:</span> {{ $encabezado->direccion_entrega }}</div>
        <div><span class="label">FECHA:</span> {{ \Carbon\Carbon::parse($encabezado->fecha_cotizacion)->format('d/m/Y') }}</div>
        <div><span class="label">CONTACTO:</span> {{ $encabezado->contacto }}</div>
        <div><span class="label">TELÉFONO:</span> {{ $encabezado->telefono }}</div>
    </div>

    {{-- CABECERA DETALLE --}}
    <div class="thead">
        <div style="display: table; width: 100%;">
            <div style="display: table-cell; width: 110pt;">CANTIDAD</div>
            <div style="display: table-cell;">DESCRIPCIÓN</div>
        </div>
    </div>

    {{-- DETALLE --}}
    @foreach($items as $it)
    <div class="row-item">
        <div style="display: table; width: 100%;">
            <div style="display: table-cell; width: 110pt; vertical-align: top;">
                {{ $it->cantidad }}
            </div>
            <div style="display: table-cell; vertical-align: top;">
                {{ $it->descripcion }}
            </div>
        </div>
    </div>
    @endforeach

    {{-- PIE --}}
    <div class="footer">
        <div class="red">Verificar producto, no se aceptan cambios ni devoluciones.</div>
        <div>OBSERVACIÓN: ___________________________________________</div>

        <div class="signatures">
            <div class="sig">
                <div class="line"></div>
                <div>NOMBRE DE QUIEN RECIBE</div>
            </div>
            <div class="sig">
                <div class="line"></div>
                <div>FIRMA</div>
            </div>
            <div class="sig">
                <div class="line"></div>
                <div>HORA</div>
            </div>
        </div>
    </div>

</body>

</html>