<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AdmCotizacion;
use App\Models\AdmDetalleCotizacion;
use NumberToWords\NumberToWords;
use App\Models\Correlativo;
use App\Models\AdmCuentasPorCobrar;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Support\NitUtils;
use Carbon\Carbon;


class MonitorFacturacionController extends Controller
{
    // public function index(Request $request)
    // {
    //     $fechaInicio = $request->query('fechaInicio');
    //     $fechaFinal = $request->query('fechaFinal');
    //     $estado = $request->query('estado');

    //     $query = AdmCotizacion::whereIn('c.estado', [4, 5, 6])
    //         ->select(
    //             'c.idcotizacion',
    //             DB::raw('CONCAT(\'CT\',CAST(c.nocotizacion AS CHAR)) as nocotizacion'),
    //             'c.fecha_cotizacion',
    //             't.tipo as tipo_pago',
    //             'c.total_general',
    //             'c.costear',
    //             'cl.nombre as cliente',
    //             'ct.nombre as contacto',
    //             'c.direccion_entrega',
    //             'c.observaciones_costeo',
    //             'c.observaciones_cliente',
    //             'c.costeo_observaciones',
    //             'c.idcotizacionoriginal',
    //             'c.idcliente',
    //             'c.idcontacto',
    //             'c.trabajo',
    //             'c.version',
    //             'c.idtipopago',
    //             'c.estado',
    //             DB::raw("CASE
    //                 WHEN c.estado = 1 THEN 'REGISTRO'
    //                 WHEN c.estado = 2 THEN 'COSTEO'
    //                 WHEN c.estado = 3 THEN 'COSTEADA'
    //                 WHEN c.estado = 4 THEN 'PRE-FACTURACION'
    //                 WHEN c.estado = 5 THEN 'PARA FACTURAR'
    //                 WHEN c.estado = 6 THEN 'FACTURADA'
    //                 WHEN c.estado = 7 THEN 'ANULADA'
    //                 ELSE 'DESCONOCIDO'
    //             END as estado_texto"),
    //             'c.uuid',
    //             'c.serie',
    //             'c.numero',
    //             'c.errores',
    //             'c.resultado',
    //         )
    //         ->from('adm_cotizacion as c')
    //         ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
    //         ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
    //         ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago');

    //     // 👇 Aplica el filtro por fechas si están definidos
    //     if ($estado) {
    //         $query->where('c.estado', $estado);

    //         // Si estado = 5 (PARA FACTURAR), no aplicar filtro de fecha
    //         if ($estado != 5 && $fechaInicio && $fechaFinal) {
    //             $query->whereRaw("DATE(c.fecha_cotizacion) BETWEEN ? AND ?", [$fechaInicio, $fechaFinal]);
    //         }
    //     } elseif ($fechaInicio && $fechaFinal) {
    //         $query->whereRaw("DATE(c.fecha_cotizacion) BETWEEN ? AND ?", [$fechaInicio, $fechaFinal]);
    //     }
    //     // if ($fechaInicio && $fechaFinal) {
    //     //     $query->whereRaw("DATE(c.fecha_cotizacion) BETWEEN ? AND ?", [$fechaInicio, $fechaFinal]);
    //     // }

    //     // Log::info($query);
    //     $cotizaciones = $query->get();
    //     // Decodificar errores para cada cotización
    //     foreach ($cotizaciones as $cot) {
    //         if (is_string($cot->errores) && $this->isJson($cot->errores)) {
    //             $cot->errores = json_decode($cot->errores, true);
    //         }
    //     }
    //     return response()->json($cotizaciones);
    // }
    public function index(Request $request)
    {
        $estado      = $request->query('estado');
        $fechaInicio = $request->query('fechaInicio');
        $fechaFinal  = $request->query('fechaFinal');

        $end   = $fechaFinal  ? Carbon::parse($fechaFinal)  : Carbon::today();
        $start = $fechaInicio ? Carbon::parse($fechaInicio) : $end->copy();

        $desde = $start->copy()->startOfDay()->toDateTimeString();
        $hasta = $end->copy()->addDay()->startOfDay()->toDateTimeString();

        // ⬇️ Fecha dinámica SIN comparar con '0000-00-00 ...'
        $fechaDinamica = "
        CASE
            WHEN c.estado = 4 THEN FROM_UNIXTIME(NULLIF(UNIX_TIMESTAMP(c.fecha_prefacturacion),0))
            WHEN c.estado = 6 THEN FROM_UNIXTIME(NULLIF(UNIX_TIMESTAMP(c.fecha_certificacion),0))
            ELSE FROM_UNIXTIME(NULLIF(UNIX_TIMESTAMP(c.fecha_cotizacion),0))
        END
    ";

        $query = AdmCotizacion::from('adm_cotizacion as c')
            ->select(
                'c.idcotizacion',
                DB::raw("CONCAT('CT',CAST(c.nocotizacion AS CHAR)) as nocotizacion"),
                DB::raw("$fechaDinamica AS fecha_cotizacion"),
                't.tipo as tipo_pago',
                'c.total_general',
                'c.costear',
                'cl.nombre as cliente',
                'ct.nombre as contacto',
                'c.direccion_entrega',
                'c.observaciones_costeo',
                'c.observaciones_cliente',
                'c.costeo_observaciones',
                'c.idcotizacionoriginal',
                'c.idcliente',
                'c.idcontacto',
                'c.trabajo',
                'c.version',
                'c.idtipopago',
                'c.estado',
                DB::raw("CASE
                WHEN c.estado = 1 THEN 'REGISTRO'
                WHEN c.estado = 2 THEN 'COSTEO'
                WHEN c.estado = 3 THEN 'COSTEADA'
                WHEN c.estado = 4 THEN 'PRE-FACTURACION'
                WHEN c.estado = 5 THEN 'PARA FACTURAR'
                WHEN c.estado = 6 THEN 'FACTURADA'
                WHEN c.estado = 7 THEN 'ANULADA'
                WHEN c.estado = 8 THEN 'RECHAZADA'
                ELSE 'DESCONOCIDO'
            END as estado_texto"),
                'c.nofactura',
                'c.uuid',
                'c.serie',
                'c.numero',
                'c.errores',
                'c.resultado'
            )
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago');

        if ($estado !== null && $estado !== '') {
            $query->where('c.estado', (int)$estado);
        } else {
            $query->whereIn('c.estado', [4, 5, 6]);
        }

        // ⬇️ filtra solo cuando la fecha dinámica es válida
        $query->whereRaw("($fechaDinamica) IS NOT NULL AND ($fechaDinamica) >= ? AND ($fechaDinamica) < ?", [$desde, $hasta]);

        // Si tu MySQL no deja ordenar por alias, usa orderByRaw:
        $query->orderByRaw("($fechaDinamica) DESC");

        $cotizaciones = $query->get();

        foreach ($cotizaciones as $cot) {
            if (is_string($cot->errores) && $this->isJson($cot->errores)) {
                $cot->errores = json_decode($cot->errores, true);
            }
        }
        return response()->json($cotizaciones);
    }



    private function isJson($string)
    {
        json_decode($string);
        return json_last_error() === JSON_ERROR_NONE;
    }

    public function generarPdf($id)
    {
        $cotizacion = AdmCotizacion::where('c.idcotizacion', $id)
            ->select(
                'c.idcotizacion',
                'c.nocotizacion',
                'c.fecha_cotizacion',
                't.tipo as tipo_pago',
                'c.total_general',
                'c.costear',
                'cl.nombre as cliente',
                'cl.nit as nit',
                'ct.nombre as contacto',
                'e.nombre as vendedor',
                'e.movil as telefono_vendedor',
                'e.correo_personal as correo_vendedor',
                'c.direccion_entrega',
                'c.observaciones_costeo',
                'c.observaciones_cliente',
                'c.costeo_observaciones',
                'c.trabajo',
                'c.version'
            )
            ->from('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_empleados as e', 'c.idusuario', '=', 'e.iduser')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->first();

        if (! $cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $detalles             = AdmDetalleCotizacion::where('idcotizacion', $id)->get();
        $cotizacion->detalles = $detalles;

        // Convertir total a letras (usando kwn/number-to-words)
        $numberToWords     = new NumberToWords();
        $numberTransformer = $numberToWords->getNumberTransformer('es');
        $totalEnLetras     = $numberTransformer->toWords($cotizacion->total_general); // no es necesario multiplicar por 100

        //$pdf = Pdf::loadView('pdf.cotizacion', compact('cotizacion', 'totalEnLetras'));
        //return $pdf->download('cotizacion-' . $cotizacion->nocotizacion . '.pdf');
        // return response()->json(['cotizacion' => $cotizacion, 'totalEnLetras' => $totalEnLetras]);
        $pdf = Pdf::loadView('pdf.cotizacion', [
            'cotizacion'    => $cotizacion,
            'detalles'      => $detalles,
            'totalEnLetras' => $totalEnLetras,
        ])->setPaper('letter');

        // Opción A: ver en el navegador
        return $pdf->stream('cotizacion_' . $cotizacion->nocotizacion . '.pdf');

        // Opción B: forzar descarga
        // return $pdf->download('cotizacion_'.$cotizacion->nocotizacion.'.pdf');

        // Si prefieres headers explícitos:
        // return response($pdf->output(), 200)
        //   ->header('Content-Type', 'application/pdf')
        //   ->header('Content-Disposition', 'inline; filename="cotizacion_'.$cotizacion->nocotizacion.'.pdf"');
    }

    public function generarPdfJson(Request $request, $id)
    {
        try {
            // Si algún día quieres permitir cambiar la fecha desde el front,
            // puedes recibir 'fecha_cotizacion' como en el otro componente:
            $fechaInput = $request->input('fecha_cotizacion');

            $cotizacion = AdmCotizacion::where('c.idcotizacion', $id)
                ->select(
                    'c.idcotizacion',
                    'c.nocotizacion',
                    'c.fecha_cotizacion',
                    't.tipo as tipo_pago',
                    'c.total_general',
                    'c.costear',
                    'cl.nombre as cliente',
                    'cl.nit as nit',
                    'ct.nombre as contacto',
                    'e.nombre as vendedor',
                    'e.movil as telefono_vendedor',
                    'e.correo_personal as correo_vendedor',
                    'c.direccion_entrega',
                    'c.observaciones_costeo',
                    'c.observaciones_cliente',
                    'c.costeo_observaciones',
                    'c.trabajo',
                    'c.version'
                )
                ->from('adm_cotizacion as c')
                ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
                ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
                ->join('adm_empleados as e', 'c.idusuario', '=', 'e.iduser')
                ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
                ->first();

            if (!$cotizacion) {
                return response()->json(['message' => 'Cotización no encontrada'], 404);
            }

            $detalles = AdmDetalleCotizacion::where('idcotizacion', $id)->get();
            $cotizacion->detalles = $detalles;

            // Si te mandan fecha por request y pasa el formato, úsala; si no, deja la original
            if ($fechaInput && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaInput)) {
                $cotizacion->fecha_cotizacion = $fechaInput;
            }

            // Total a letras:
            $numberToWords     = new NumberToWords();
            $numberTransformer = $numberToWords->getNumberTransformer('es');
            $entero = floor($cotizacion->total_general);
            $centavos = round(($cotizacion->total_general - $entero) * 100);
            $totalEnLetras = strtoupper($numberTransformer->toWords($entero) . ' CON ' . str_pad($centavos, 2, '0', STR_PAD_LEFT) . '/100');

            return response()->json([
                'cotizacion'    => $cotizacion,
                'totalEnLetras' => $totalEnLetras,
            ]);
        } catch (\Throwable $e) {
            Log::error('Error generando PDF (JSON) en MonitorFacturación: ' . $e->getMessage());
            return response()->json(['message' => 'Error generando el PDF.'], 500);
        }
    }

    public function desactivar(Request $request, $id)
    {
        $estado = $request->input('estado', 1); // Por defecto, desactivar a estado 1 (REGISTRO)
        $cotizacion = AdmCotizacion::find($id);
        if (! $cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $cotizacion->estado = $estado;
        $cotizacion->save();

        return response()->json(['message' => 'Cotización desactivada']);
    }

    public function generarXMLFactura(Request $request, $idcotizacion)
    {
        // 1) Validación de payload recibido del modal
        $validated = $request->validate([
            'documento_tipo'  => 'required|in:NIT,CUI,PASAPORTE,CF',
            'documento_valor' => 'nullable|string|max:30',
            'nombre'          => 'required|string|max:200',
            'direccion'       => 'required|string|max:255',
            'email'           => 'nullable|email|max:150',
        ]);

        // 2) Consulta de detalles (igual a lo que ya está) — SIN usar datos de cliente para Receptor
        $detalles = DB::select("
        SELECT 
            ROW_NUMBER() OVER (ORDER BY d.iddetallecotizacion) AS numero_linea,
            d.iddetallecotizacion,
            d.cantidad,
            IF(CHAR_LENGTH(d.unidad_medida) > 3, LEFT(d.unidad_medida, 3), d.unidad_medida) AS unidad_medida,
            d.descripcion,
            ROUND(d.precio, 3) AS precio_unitario,
            ROUND(d.total, 3) AS precio,
            0 AS descuento,
            ROUND(d.total / 1.12, 3) AS monto_gravable,
            ROUND(d.total - (d.total / 1.12), 3) AS monto_impuesto,
            ROUND(d.total, 3) AS total,
            ROUND(c.total_general,3) AS gran_total,
            ROUND(c.total_general,3) AS monto_abono,
            cl.nombre,
            cl.nit,
            cl.cui,
            cl.direccion,
            cl.codigo_postal,
            cl.email as correo,
            m.nombre as municipio,
            dp.nombre as departamento,
            'GT' as pais,
            date(c.fecha_registro) as fecha_vencimiento,
            cl.extranjero,
            cl.pasaporte,
            cl.excento_iva
        FROM adm_cotizacion c 
        JOIN adm_detalle_cotizacion d on c.idcotizacion = d.idcotizacion 
        JOIN clientes cl on c.idcliente = cl.idcliente
        JOIN adm_municipio m on cl.id_municipio = m.id_municipio
        JOIN adm_departamentopais dp on cl.iddepartamento = dp.iddepartamentopais
        WHERE d.estado = 1 
        AND d.idcotizacion = ?
    ", [$idcotizacion]);

        if (empty($detalles)) {
            return response()->json(['error' => 'Detalle de cotización no encontrado'], 404);
        }

        $detalle = $detalles[0];

        // 3) SE LEEN Y PREPARAN LOS DATOS DEL MODAL PARA EL RECEPTOR
        $docTipo   = $validated['documento_tipo'];        // NIT | CUI | PASAPORTE | CF
        $docValor  = trim((string)($validated['documento_valor'] ?? ''));
        $nombre    = $validated['nombre'];
        $direccion = $validated['direccion'];
        $correo    = $validated['email'] ?? '';

        // Reglas y normalización por tipo
        $clienteExentoIVA = "N"; // Si quieres, podrías traerlo aparte según tu lógica
        if (isset($detalle->excento_iva) && $detalle->excento_iva == "S") {
            $clienteExentoIVA = "S";
        }
        $idReceptor = '';
        $tipoEspecial = null;

        // switch ($docTipo) {
        //     case 'CF':
        //         $idReceptor = 'CF';
        //         break;

        //     case 'NIT':
        //         if (!NitUtils::esValido($docValor)) {
        //             throw ValidationException::withMessages([
        //                 'documento_valor' => ['NIT no válido para Guatemala.'],
        //             ]);
        //         }
        //         $idReceptor = NitUtils::normalizarParaFEL($docValor); // dígitos y K, sin guión
        //         break;

        //     case 'CUI':
        //         $cui = preg_replace('/\D/', '', $docValor);
        //         if (strlen($cui) < 12 || strlen($cui) > 13) {
        //             throw ValidationException::withMessages([
        //                 'documento_valor' => ['CUI/DPI debe tener 12 o 13 dígitos.'],
        //             ]);
        //         }
        //         $idReceptor = $cui;
        //         $tipoEspecial = 'CUI';
        //         break;

        //     case 'PASAPORTE':
        //         if ($docValor === '') {
        //             throw ValidationException::withMessages([
        //                 'documento_valor' => ['Ingrese un número de pasaporte.'],
        //             ]);
        //         }
        //         $idReceptor = strtoupper($docValor);
        //         $tipoEspecial = 'EXT';
        //         break;
        // }
        switch ($docTipo) {
            case 'CF':
                $idReceptor = 'CF';
                $tipoEspecial = null; // sin TipoEspecial
                break;

            case 'NIT':
                if (!NitUtils::esValido($docValor)) {
                    throw ValidationException::withMessages([
                        'documento_valor' => ['NIT no válido para Guatemala.'],
                    ]);
                }
                $idReceptor = NitUtils::normalizarParaFEL($docValor); // dígitos y K, sin guión
                $tipoEspecial = null; // sin TipoEspecial
                break;

            case 'CUI':
                $cui = preg_replace('/\D/', '', $docValor);
                if (strlen($cui) < 12 || strlen($cui) > 13) {
                    throw ValidationException::withMessages([
                        'documento_valor' => ['CUI/DPI debe tener 12 o 13 dígitos.'],
                    ]);
                }
                $idReceptor = $cui;
                $tipoEspecial = 'CUI'; // ⬅️ código esperado
                break;

            case 'PASAPORTE':
                $pasaporte = strtoupper(trim($docValor));
                if ($pasaporte === '') {
                    throw ValidationException::withMessages([
                        'documento_valor' => ['Ingrese un número de pasaporte.'],
                    ]);
                }
                // Opcional: sanitiza según reglas comunes (A-Z/0-9, 3–18 chars)
                $pasaporte = preg_replace('/[^A-Z0-9]/', '', $pasaporte);
                if (strlen($pasaporte) < 3 || strlen($pasaporte) > 18) {
                    throw ValidationException::withMessages([
                        'documento_valor' => ['El pasaporte debe tener entre 3 y 18 caracteres alfanuméricos.'],
                    ]);
                }
                $idReceptor   = $pasaporte;
                $tipoEspecial = 'EXT'; // ⬅️ código correcto para extranjero
                break;
        }

        /** FINALIZACIÓN DE LOS DATOS DEL MODAL PARA EL RECEPTOR */

        //4
        $doc = new \DOMDocument('1.0', 'UTF-8');
        $doc->formatOutput = true;

        $GTDocumento = $doc->createElementNS('http://www.sat.gob.gt/dte/fel/0.2.0', 'dte:GTDocumento');
        $GTDocumento->setAttribute('xmlns:cfc', 'http://www.sat.gob.gt/dte/fel/CompCambiaria/0.1.0');
        $GTDocumento->setAttribute('Version', '0.1');
        $doc->appendChild($GTDocumento);

        $SAT = $doc->createElement('dte:SAT');
        $SAT->setAttribute('ClaseDocumento', 'dte');
        $GTDocumento->appendChild($SAT);

        $DTE = $doc->createElement('dte:DTE');
        $DTE->setAttribute('ID', 'DatosCertificados');
        $SAT->appendChild($DTE);

        $DatosEmision = $doc->createElement('dte:DatosEmision');
        $DatosEmision->setAttribute('ID', 'DatosEmision');
        $DTE->appendChild($DatosEmision);

        $DatosGenerales = $doc->createElement('dte:DatosGenerales');
        $DatosGenerales->setAttribute('CodigoMoneda', 'GTQ');
        $DatosGenerales->setAttribute('FechaHoraEmision', now()->format('Y-m-d\TH:i:s'));
        $DatosGenerales->setAttribute('Tipo', 'FCAM');
        $DatosEmision->appendChild($DatosGenerales);

        $Emisor = $doc->createElement('dte:Emisor');
        $Emisor->setAttribute('AfiliacionIVA', 'GEN');
        $Emisor->setAttribute('CodigoEstablecimiento', '1');
        $Emisor->setAttribute('CorreoEmisor', 'ventas@gpexcelencia.com');
        $Emisor->setAttribute('NombreComercial', 'GP EXCELENCIA');
        $Emisor->setAttribute('NITEmisor', '109126599');
        $Emisor->setAttribute('NombreEmisor', 'GP EXCELENCIA, SOCIEDAD ANÓNIMA');
        $DatosEmision->appendChild($Emisor);

        $dirEmisor = $doc->createElement('dte:DireccionEmisor');
        $Emisor->appendChild($dirEmisor);
        $dirEmisor->appendChild($doc->createElement('dte:Direccion', '11 CALLE 41-20 COLONIA EL NARANJITO ZONA 6 APARTAMENTO A'));
        $dirEmisor->appendChild($doc->createElement('dte:CodigoPostal', '01057'));
        $dirEmisor->appendChild($doc->createElement('dte:Municipio', 'MIXCO'));
        $dirEmisor->appendChild($doc->createElement('dte:Departamento', 'GUATEMALA'));
        $dirEmisor->appendChild($doc->createElement('dte:Pais', 'GT'));

        /**
         * DATOS DEL MODAL PARA RECEPTOR
         */
        // $Receptor = $doc->createElement('dte:Receptor');
        // $Receptor->setAttribute('CorreoReceptor', $correo ?? '');
        // $Receptor->setAttribute('IDReceptor', $idReceptor);

        // if ($tipoEspecial) {
        //     $TipoEspecial = $doc->createElement('dte:TipoEspecial', $tipoEspecial);
        //     $Receptor->appendChild($TipoEspecial);
        // }

        // $Receptor->setAttribute('NombreReceptor', $nombre);
        // $DatosEmision->appendChild($Receptor);

        // $dirReceptor = $doc->createElement('dte:DireccionReceptor');
        // $Receptor->appendChild($dirReceptor);
        // $dirReceptor->appendChild($doc->createElement('dte:Direccion', $direccion));
        // $dirReceptor->appendChild($doc->createElement('dte:CodigoPostal', $detalle->codigo_postal ?? '01001'));
        // $dirReceptor->appendChild($doc->createElement('dte:Municipio', $detalle->municipio));
        // $dirReceptor->appendChild($doc->createElement('dte:Departamento', $detalle->departamento));
        // $dirReceptor->appendChild($doc->createElement('dte:Pais', $detalle->pais));

        $Receptor = $doc->createElement('dte:Receptor');
        $Receptor->setAttribute('CorreoReceptor', $correo ?? '');
        $Receptor->setAttribute('IDReceptor', $idReceptor);
        $Receptor->setAttribute('NombreReceptor', $nombre);

        // ⬅️ TipoEspecial va como ATRIBUTO (no elemento)
        if (!empty($tipoEspecial)) {
            // valores válidos típicos: "CUI" o "EXT"
            $Receptor->setAttribute('TipoEspecial', $tipoEspecial);
        }

        $DatosEmision->appendChild($Receptor);

        // El ÚNICO hijo permitido de Receptor es DireccionReceptor:
        $dirReceptor = $doc->createElement('dte:DireccionReceptor');
        $Receptor->appendChild($dirReceptor);

        $dirReceptor->appendChild($doc->createElement('dte:Direccion', $direccion));
        $dirReceptor->appendChild($doc->createElement('dte:CodigoPostal', $detalle->codigo_postal ?? '01001'));
        $dirReceptor->appendChild($doc->createElement('dte:Municipio', $detalle->municipio));
        $dirReceptor->appendChild($doc->createElement('dte:Departamento', $detalle->departamento));

        // Sugerencia: si es extranjero (EXT) y NO reside en Guatemala, usa el país ISO real del receptor:
        $paisReceptor = $detalle->pais;
        if (($tipoEspecial ?? null) === 'EXT' && strtoupper($paisReceptor) === 'GT') {
            // $paisReceptor = 'PAIS_ISO'; // si tienes el país real, colócalo aquí
        }
        $dirReceptor->appendChild($doc->createElement('dte:Pais', $paisReceptor));

        /** AQUÍ TERMINAN LOS DATOS DEL MODAL PARA RECEPTOR */

        $Frases = $doc->createElement('dte:Frases');
        $DatosEmision->appendChild($Frases);
        // Frase estándar obligatoria (siempre va)
        $Frase1 = $doc->createElement('dte:Frase');
        $Frase1->setAttribute('CodigoEscenario', '1');
        $Frase1->setAttribute('TipoFrase', '1');
        $Frases->appendChild($Frase1);

        // Frase adicional si el cliente es exento
        if ($clienteExentoIVA === "S") {
            $Frase2 = $doc->createElement('dte:Frase');
            $Frase2->setAttribute('TipoFrase', '4'); // Exento o no afecto al IVA
            $Frase2->setAttribute('CodigoEscenario', '2'); // No exportación (u otro si aplica)
            $Frases->appendChild($Frase2);
        }

        $Items = $doc->createElement('dte:Items');
        $DatosEmision->appendChild($Items);

        foreach ($detalles as $d) {
            $Item = $doc->createElement('dte:Item');
            $Item->setAttribute('BienOServicio', 'B');
            $Item->setAttribute('NumeroLinea', $d->numero_linea);

            $Item->appendChild($doc->createElement('dte:Cantidad', $d->cantidad));
            $Item->appendChild($doc->createElement('dte:UnidadMedida', $d->unidad_medida));
            $Item->appendChild($doc->createElement('dte:Descripcion', $d->descripcion));
            $Item->appendChild($doc->createElement('dte:PrecioUnitario', number_format($d->precio_unitario, 3, '.', '')));
            $Item->appendChild($doc->createElement('dte:Precio', number_format($d->precio, 3, '.', '')));
            $Item->appendChild($doc->createElement('dte:Descuento', number_format($d->descuento, 3, '.', '')));

            $Impuestos = $doc->createElement('dte:Impuestos');
            $Impuesto = $doc->createElement('dte:Impuesto');
            $Impuesto->appendChild($doc->createElement('dte:NombreCorto', 'IVA'));
            $Impuesto->appendChild($doc->createElement('dte:CodigoUnidadGravable', '1'));

            if ($clienteExentoIVA === "S") {
                $Impuesto->appendChild($doc->createElement('dte:MontoGravable', '0.00'));
                $Impuesto->appendChild($doc->createElement('dte:MontoImpuesto', '0.00'));
            } else {
                $Impuesto->appendChild($doc->createElement('dte:MontoGravable', number_format($d->monto_gravable, 3, '.', '')));
                $Impuesto->appendChild($doc->createElement('dte:MontoImpuesto', number_format($d->monto_impuesto, 3, '.', '')));
            }
            // $Impuesto->appendChild($doc->createElement('dte:MontoGravable', number_format($d->monto_gravable, 3, '.', '')));
            // $Impuesto->appendChild($doc->createElement('dte:MontoImpuesto', number_format($d->monto_impuesto, 3, '.', '')));


            $Impuestos->appendChild($Impuesto);
            $Item->appendChild($Impuestos);

            $Item->appendChild($doc->createElement('dte:Total', number_format($d->total, 3, '.', '')));
            $Items->appendChild($Item);
        }

        $Totales = $doc->createElement('dte:Totales');
        $DatosEmision->appendChild($Totales);
        $TotalImpuestos = $doc->createElement('dte:TotalImpuestos');
        $TotalImpuesto = $doc->createElement('dte:TotalImpuesto');
        $TotalImpuesto->setAttribute('NombreCorto', 'IVA');

        // $sumaImpuestos = array_sum(array_column($detalles, 'monto_impuesto'));        
        // $TotalImpuesto->setAttribute('TotalMontoImpuesto', number_format($sumaImpuestos, 2, '.', ''));
        $TotalImpuesto->setAttribute(
            'TotalMontoImpuesto',
            number_format(
                $clienteExentoIVA === "S" ? 0.00 : array_sum(array_column($detalles, 'monto_impuesto')),
                2,
                '.',
                ''
            )
        );

        $TotalImpuestos->appendChild($TotalImpuesto);
        $Totales->appendChild($TotalImpuestos);
        $Totales->appendChild($doc->createElement('dte:GranTotal', number_format($detalle->gran_total, 2, '.', '')));

        // Complemento de Factura Cambiaria
        $Complementos = $doc->createElement('dte:Complementos');
        $DatosEmision->appendChild($Complementos);

        $Complemento = $doc->createElement('dte:Complemento');
        $Complemento->setAttribute('IDComplemento', 'FacturaCambio');
        $Complemento->setAttribute('NombreComplemento', 'Factura Cambiaria');
        $Complemento->setAttribute('URIComplemento', 'http://www.sat.gob.gt/face2/ComplementoFacturaCambiaria');
        $Complementos->appendChild($Complemento);

        $Abonos = $doc->createElementNS('http://www.sat.gob.gt/dte/fel/CompCambiaria/0.1.0', 'cfc:AbonosFacturaCambiaria');
        $Abonos->setAttribute('Version', '1');
        $Abono = $doc->createElement('cfc:Abono');
        $Abono->appendChild($doc->createElement('cfc:NumeroAbono', '1'));
        $Abono->appendChild($doc->createElement('cfc:FechaVencimiento', $detalle->fecha_vencimiento));
        $Abono->appendChild($doc->createElement('cfc:MontoAbono', number_format($detalle->monto_abono, 2, '.', '')));
        $Abonos->appendChild($Abono);
        $Complemento->appendChild($Abonos);

        $xmlString = $doc->saveXML();

        // URL del proveedor o SAT a donde enviarás el XML
        $apiUrl = 'https://certificador.feel.com.gt/fel/procesounificado/transaccion/v2/xml';

        // encabezado requerido por el API
        $identificador = Str::uuid()->toString(); // Genera un UUID único para cada solicitud
        $headers = [
            'Content-Type' => 'application/xml',
            'UsuarioApi' => '109126599PRO',
            'LlaveApi' => 'EC7E300DF9F5EDD673FE02342E9C4293',
            'UsuarioFirma' => '109126599PRO',
            'LlaveFirma' => '9bbfaf68b130aaa6b69535ac6f1ca5db',
            'Identificador' => $identificador,
        ];

        try {
            $response = Http::withHeaders($headers)->send('POST', $apiUrl, [
                'body' => $xmlString,
            ]);

            $json = $response->json();

            // Log::info($json);
            //Se graba en la base de datos la respuesta del SAT
            $cotizacion = AdmCotizacion::find($idcotizacion);

            if ($cotizacion) {
                if ($response->successful() && isset($json['resultado']) && $json['resultado'] === true) {

                    $correlativo = Correlativo::find('nofactura');
                    if (!$correlativo) {
                        return response()->json(['message' => 'No se encontró el correlativo para el numero interno'], 400);
                    }

                    $noFactura = $correlativo->correlativo + $correlativo->incremento;
                    $correlativo->correlativo = $noFactura;
                    $correlativo->save();

                    $cotizacion->update([
                        'resultado'            => 'S',
                        'uuid'                 => $json['uuid'],
                        'serie'                => $json['serie'],
                        'numero'               => $json['numero'],
                        'descripcion'          => $json['descripcion'],
                        'fecha_certificacion'  => $json['fecha'],
                        'xml_certificado'      => base64_encode($json['xml_certificado']),
                        'alertas'              => $json['descripcion_alertas_infile'] ?? null,
                        'identificador'        => $identificador,
                        'estado'               => 6,
                        'nofactura'            => $noFactura,
                        'numero_crtf'          => $idReceptor,          // CF, NIT normalizado, CUI, PASAPORTE
                        'tipo_crtf'            => $docTipo,             // NIT | CUI | PASAPORTE | CF
                        'tipo_especial_crtf'   => $tipoEspecial,        // 'CUI' o 'Número de documento...' o NULL
                        'nombre_crtf'          => $nombre,
                        'email_crtf'           => $correo,
                        'direccion_crtf'       => $direccion,
                    ]);

                    // === Crear cuenta por cobrar ===
                    if (!AdmCuentasPorCobrar::where('idcotizacion', $cotizacion->idcotizacion)->exists()) {
                        $correlativoCXC = Correlativo::find('adm_cuentas_porcobrar');

                        if (! $correlativoCXC) {
                            return response()->json(['message' => 'No se encontró correlativo para cuentas por cobrar'], 400);
                        }

                        $nuevoIdCXC = $correlativoCXC->correlativo + $correlativoCXC->incremento;
                        $correlativoCXC->correlativo = $nuevoIdCXC;
                        $correlativoCXC->save();

                        AdmCuentasPorCobrar::create([
                            'idcuentaporcobrar'     => $nuevoIdCXC,
                            'idcotizacion'          => $cotizacion->idcotizacion,
                            'idcliente'             => $cotizacion->idcliente,
                            'fecha_emision'         => now(),
                            'fecha_vencimiento'     => now()->addDays(30),
                            'moneda'                => 'GTQ',
                            'tasa_cambio'           => 1,
                            'monto_original'        => $cotizacion->total_general,
                            'saldo_pendiente'       => $cotizacion->total_general,
                            'monto_pagado'          => 0,
                            'descuento_aplicado'    => 0,
                            'idusuario_creacion'    => auth()->user()->id,
                            'usuario_creacion'      => auth()->user()->name,
                            'fecha_creacion'        => now(),
                            'origen_registro'       => 'sistema',
                            'centro_costo'          => 'produccion',
                            'cuenta_contable'       => '0',
                            'estatus_riesgo'        => 'medio',
                            'estado'                => 1,
                        ]);
                    }
                } else {
                    $cotizacion->update([
                        'resultado'     => 'N',
                        'errores'       => $json['descripcion_errores'],
                        'identificador' => $identificador,
                    ]);
                }
            }
            //fin de grabar en la base de datos

            if ($json['resultado'] === true) {
                return response()->json([
                    'resultado' => true,
                    'uuid' => $json['uuid'],
                    'serie' => $json['serie'],
                    'numero' => $json['numero'],
                    'descripcion' => $json['descripcion'],
                    'fecha_certificacion' => $json['fecha'],
                    'xml_certificado' => base64_encode($json['xml_certificado']),
                    'alertas' => $json['descripcion_alertas_infile'],
                ]);
            } else {
                return response()->json([
                    'resultado' => false,
                    'errores' => 'Ocurrió un error al realizar la certificación', //$json['descripcion_errores'],
                ], 422);
            }
        } catch (\Exception $e) {
            Log::error('Error al certificar XML FEL', [
                'cotizacion_id' => $idcotizacion,
                'exception' => $e->getMessage(),
                'response' => $response->body() ?? 'Sin respuesta'
            ]);

            return response()->json([
                'resultado' => false,
                'errores' => $e->getMessage(),
            ], 500);
        }
    }

    public function descargarXML($uuid)
    {
        // $registro = Cotizacion::where('uuid', $uuid)->firstOrFail();
        // $xmlBase64 = $registro->xml_certificado;
        // $xml = base64_decode($xmlBase64);

        // return response($xml, 200)
        //     ->header('Content-Type', 'application/xml')
        //     ->header('Content-Disposition', 'attachment; filename="FEL_' . $uuid . '.xml"');
    }

    // public function generarImpresionFactura($id)
    // {
    //     $cotizacion = AdmCotizacion::where('c.idcotizacion', $id)
    //         ->select(
    //             'c.serie',
    //             'c.numero',
    //             'c.uuid as numero_autorizacion',
    //             DB::raw('DATE(c.fecha_certificacion) as fecha_emision'),
    //             'c.total_general as total',
    //             'cl.nit',
    //             'cl.nombre',
    //             'cl.direccion',
    //             'd.cantidad',
    //             'd.descripcion',
    //             'd.precio as precio_unitario',
    //             'd.total as precio_total',
    //             'c.nofactura',
    //             'c.nocotizacion',
    //         )
    //         ->from('adm_cotizacion as c')
    //         ->join('adm_detalle_cotizacion as d', 'c.idcotizacion', '=', 'd.idcotizacion')
    //         ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
    //         ->first();


    //     if (!$cotizacion) {
    //         return response()->json(['message' => 'Cotización no encontrada'], 404);
    //     }

    //     // Crear número interno
    //     // $fechaFormateada = \Carbon\Carbon::parse($cotizacion->fecha_emision)->format('Ymd');
    //     // $cotizacion->numero_interno = 'GP-' . $fechaFormateada . '-' . $cotizacion->nocotizacion;
    //     // Año de la factura (usa fecha de emisión si existe, sino el año actual)
    //     $anio = $cotizacion->fecha_emision
    //         ? Carbon::parse($cotizacion->fecha_emision)->year
    //         : now()->year;

    //     // Generar número de factura si no existe
    //     DB::transaction(function () use (&$cotizacion, $anio) {
    //         if (empty($cotizacion->nofactura)) {
    //             $nuevoNoFactura = $this->siguienteCorrelativoFactura($anio);
    //             AdmCotizacion::where('idcotizacion', $cotizacion->idcotizacion)
    //                 ->update(['nofactura' => $nuevoNoFactura]);
    //             $cotizacion->nofactura = $nuevoNoFactura;
    //         }
    //     });

    //     // Formato: GP-{AÑO}-{FACTURA}-{COTIZACION}
    //     $anioStr       = (string) $anio;
    //     $facturaStr    = $this->pad((int) $cotizacion->nofactura, 6);
    //     $cotizacionStr = $this->pad((int) $cotizacion->nocotizacion, 6);

    //     $cotizacion->numero_interno = "GP-{$facturaStr}-{$cotizacionStr}";



    //     // Convertir total a letras (usando kwn/number-to-words)
    //     $numberToWords     = new NumberToWords();
    //     $numberTransformer = $numberToWords->getNumberTransformer('es');
    //     $totalEnLetras = $this->convertirNumeroALetrasConCentavos($cotizacion->total);

    //     $detalles = AdmDetalleCotizacion::where('idcotizacion', $id)->get();

    //     $pdf = Pdf::loadView('pdf.factura', compact('cotizacion', 'totalEnLetras', 'detalles'))
    //         ->setPaper('letter', 'portrait');

    //     // ⭐ Habilita la ejecución de PHP en Dompdf para que corra <script type="text/php">
    //     // (según versión de barryvdh; cualquiera de las dos líneas funciona)
    //     $pdf->getDomPDF()->set_option('isPhpEnabled', true);
    //     // $pdf->set_option('isPhpEnabled', true);

    //     // Opcional: por si cargas imágenes desde ruta absoluta/remota
    //     $pdf->getDomPDF()->set_option('isRemoteEnabled', true);

    //     return $pdf->stream('factura-' . $cotizacion->serie . '-' . $cotizacion->numero . '.pdf');
    // }
    public function generarImpresionFactura($id)
    {
        $cotizacion = AdmCotizacion::where('c.idcotizacion', $id)
            ->select(
                'c.idcotizacion',
                'c.serie',
                'c.numero',
                'c.uuid as numero_autorizacion',
                DB::raw('DATE(c.fecha_certificacion) as fecha_emision'),
                'c.total_general as total',
                'cl.nit',
                'cl.nombre',
                'cl.direccion',
                'd.cantidad',
                'd.descripcion',
                'd.precio as precio_unitario',
                'd.total as precio_total',
                'c.nofactura',
                'c.nocotizacion',
                'c.estado',
            )
            ->from('adm_cotizacion as c')
            ->join('adm_detalle_cotizacion as d', 'c.idcotizacion', '=', 'd.idcotizacion')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->first();

        if (!$cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $anio = $cotizacion->fecha_emision
            ? Carbon::parse($cotizacion->fecha_emision)->year
            : now()->year;

        DB::transaction(function () use (&$cotizacion, $anio) {
            if (empty($cotizacion->nofactura)) {
                $nuevoNoFactura = $this->siguienteCorrelativoFactura($anio);
                AdmCotizacion::where('idcotizacion', $cotizacion->idcotizacion)
                    ->update(['nofactura' => $nuevoNoFactura]);
                $cotizacion->nofactura = $nuevoNoFactura;
            }
        });

        $facturaStr    = $this->pad((int) $cotizacion->nofactura, 6);
        $cotizacionStr = $this->pad((int) $cotizacion->nocotizacion, 6);
        $cotizacion->numero_interno = "GP-{$facturaStr}-{$cotizacionStr}";

        $totalEnLetras = $this->convertirNumeroALetrasConCentavos($cotizacion->total);
        $detalles = AdmDetalleCotizacion::where('idcotizacion', $id)->get();

        $pdf = Pdf::loadView('pdf.factura', compact('cotizacion', 'totalEnLetras', 'detalles'))
            ->setPaper('letter', 'portrait');


        return $pdf->stream('factura-' . $cotizacion->serie . '-' . $cotizacion->numero . '.pdf');
    }

    public function facturaData($id)
    {
        // 1) Cabecera (sin join al detalle)
        $c = DB::table('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->where('c.idcotizacion', $id)
            ->select(
                'c.idcotizacion',
                'c.serie',
                'c.numero',
                'c.uuid as numero_autorizacion',
                DB::raw('DATE(c.fecha_certificacion) as fecha_emision'),
                'c.total_general as total',
                'cl.nit',
                'cl.nombre',
                'cl.direccion',
                'c.nofactura',
                'c.nocotizacion'
            )
            ->first();

        if (!$c) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        // 2) Correlativo / No. factura (igual que antes)
        $anio = $c->fecha_emision ? Carbon::parse($c->fecha_emision)->year : now()->year;

        DB::transaction(function () use (&$c, $anio) {
            if (empty($c->nofactura)) {
                $nuevoNoFactura = $this->siguienteCorrelativoFactura($anio);
                DB::table('adm_cotizacion')
                    ->where('idcotizacion', $c->idcotizacion)
                    ->update(['nofactura' => $nuevoNoFactura]);
                $c->nofactura = $nuevoNoFactura;
            }
        });

        // 3) Número interno y total en letras
        $facturaStr    = $this->pad((int) $c->nofactura, 6);
        $cotizacionStr = $this->pad((int) $c->nocotizacion, 6);
        $numeroInterno = "GP-{$facturaStr}-{$cotizacionStr}";

        $totalEnLetras = $this->convertirNumeroALetrasConCentavos($c->total);

        // 4) Detalle (lista completa)
        $detalles = DB::table('adm_detalle_cotizacion as d')
            ->where('d.idcotizacion', $id)
            ->select('d.cantidad', 'd.descripcion', DB::raw('d.precio as precio_unitario'), 'd.total')
            ->orderBy('d.iddetallecotizacion', 'asc') // ajusta si tu PK es otra
            ->get()
            ->map(function ($d) {
                return [
                    'cantidad' => (int) $d->cantidad,
                    'descripcion' => $d->descripcion,
                    'precio' => round((float) $d->precio_unitario, 2),
                    'total'  => round((float) $d->total, 2),
                ];
            });

        // 5) Respuesta JSON para el front
        return response()->json([
            'cotizacion' => [
                'serie'              => $c->serie,
                'numero'             => $c->numero,
                'numero_autorizacion' => $c->numero_autorizacion,
                'fecha_emision'      => $c->fecha_emision ? Carbon::parse($c->fecha_emision)->format('d/m/Y') : null,
                'total'              => (float) $c->total,
                'nit'                => $c->nit,
                'nombre'             => $c->nombre,
                'direccion'          => $c->direccion,
                'numero_interno'     => $numeroInterno,
                'total_en_letras'    => $totalEnLetras,
            ],
            'detalles' => $detalles,
        ]);
    }

    private function convertirNumeroALetrasConCentavos($numero)
    {
        $numberToWords = new NumberToWords();
        $numberTransformer = $numberToWords->getNumberTransformer('es');

        $entero = floor($numero);
        $decimal = round(($numero - $entero) * 100);

        $letrasEntero = $numberTransformer->toWords($entero);
        $letrasCentavos = $decimal > 0 ? "CON {$decimal}/100" : "CON 00/100";

        //return ucfirst($letrasEntero) . ' ' . $letrasCentavos;
        return strtoupper($letrasEntero . ' ' . $letrasCentavos);
    }

    public function anularFactura(Request $request, $idcotizacion)
    {
        $request->validate([
            'motivo' => 'required|string|max:250',
        ]);

        $cotizacion = DB::table('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->where('c.idcotizacion', $idcotizacion)
            ->select(
                'c.idcotizacion',
                'c.uuid',
                'c.resultado',
                'c.fecha_certificacion',
                'cl.nit as receptor_nit'
            )
            ->first();

        if ($cotizacion->resultado !== 'S' || empty($cotizacion->uuid)) {
            return response()->json(['error' => 'La factura no puede ser anulada.'], 400);
        }

        $uuid = strtoupper(trim($cotizacion->uuid));
        $motivo = $request->motivo;
        $nitEmisor = '109126599';
        $idReceptor = $cotizacion->receptor_nit ?: 'CF';
        $fechaEmision = date('Y-m-d\TH:i:s', strtotime($cotizacion->fecha_certificacion));
        $fechaAnulacion = now()->format('Y-m-d\TH:i:s');

        // Crear documento XML de anulación con la estructura correcta
        $doc = new \DOMDocument('1.0', 'UTF-8');
        $doc->formatOutput = true;

        // Elemento raíz con namespaces y atributos
        $GTAnulacion = $doc->createElementNS('http://www.sat.gob.gt/dte/fel/0.1.0', 'dte:GTAnulacionDocumento');
        $GTAnulacion->setAttribute('xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#');
        $GTAnulacion->setAttribute('xmlns:n1', 'http://www.altova.com/samplexml/other-namespace');
        $GTAnulacion->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $GTAnulacion->setAttribute('Version', '0.1');
        $GTAnulacion->setAttribute(
            'xsi:schemaLocation',
            'http://www.sat.gob.gt/dte/fel/0.1.0 C:\\Users\\User\\Desktop\\FEL\\Esquemas\\GT_AnulacionDocumento-0.1.0.xsd'
        );
        $doc->appendChild($GTAnulacion);

        // SAT > AnulacionDTE > DatosGenerales
        $SAT = $doc->createElement('dte:SAT');
        $GTAnulacion->appendChild($SAT);

        $AnulacionDTE = $doc->createElement('dte:AnulacionDTE');
        $AnulacionDTE->setAttribute('ID', 'DatosCertificados');
        $SAT->appendChild($AnulacionDTE);

        $DatosGenerales = $doc->createElement('dte:DatosGenerales');
        $DatosGenerales->setAttribute('ID', 'DatosAnulacion');
        $DatosGenerales->setAttribute('NumeroDocumentoAAnular', $uuid);
        $DatosGenerales->setAttribute('NITEmisor', $nitEmisor);
        $DatosGenerales->setAttribute('IDReceptor', $idReceptor);
        $DatosGenerales->setAttribute('FechaEmisionDocumentoAnular', $fechaEmision);
        $DatosGenerales->setAttribute('FechaHoraAnulacion', $fechaAnulacion);
        $DatosGenerales->setAttribute('MotivoAnulacion', $motivo);

        $AnulacionDTE->appendChild($DatosGenerales);

        $xmlString = $doc->saveXML();

        // Headers y URL del API de INFILE
        $headers = [
            'Content-Type' => 'application/xml',
            'UsuarioApi' => '109126599PRO',
            'LlaveApi' => 'EC7E300DF9F5EDD673FE02342E9C4293',
            'UsuarioFirma' => '109126599PRO',
            'LlaveFirma' => '9bbfaf68b130aaa6b69535ac6f1ca5db',
            'Identificador' => (string) Str::uuid(),
        ];

        $url = 'https://certificador.feel.com.gt/fel/procesounificado/transaccion/v2/xml';

        try {
            Log::info('XML Anulación FEL INFILE', ['xml' => $xmlString]);

            $response = Http::withHeaders($headers)->send('POST', $url, [
                'body' => $xmlString,
            ]);

            Log::info('Respuesta de anulación FEL INFILE', ['body' => $response->body()]);

            $json = $response->json();
            // 1. Decodifica directamente todo el JSON como objeto
            $data = json_decode($response->body(), true);

            // 2. Si contiene 'body', decodifica su contenido (también es JSON embebido)
            $bodyData = isset($data['body']) ? json_decode($data['body'], true) : $data;

            // 3. Verifica si hay un resultado exitoso
            if (isset($bodyData['resultado']) && $bodyData['resultado'] === true) {
                DB::table('adm_cotizacion')
                    ->where('idcotizacion', $idcotizacion)
                    ->update([
                        'estado' => 7,
                        'anulacion_resultado' => 'S',
                        'fecha_anulacion_certificacion' => $bodyData['fecha'] ?? now(),
                        'anulacion_descripcion' => $bodyData['descripcion'] ?? null,
                        'anulacion_alertas' => json_encode([
                            'infile' => $bodyData['descripcion_alertas_infile'] ?? [],
                            'sat' => $bodyData['descripcion_alertas_sat'] ?? []
                        ]),
                        'anulacion_informacion_adicional' => $bodyData['informacion_adicional'] ?? null,
                        'anulacion_uuid' => $bodyData['uuid'] ?? null,
                        'anulacion_serie' => $bodyData['serie'] ?? null,
                        'anulacion_numero' => $bodyData['numero'] ?? null,
                        'anulacion_xml_certificado' => $bodyData['xml_certificado'] ?? null,
                    ]);

                return response()->json([
                    'resultado' => true,
                    'mensaje' => 'Factura anulada con éxito.',
                    'uuid' => $bodyData['uuid'] ?? '',
                ]);
            } else {
                return response()->json([
                    'resultado' => false,
                    'mensaje' => $bodyData['descripcion'] ?? 'La anulación no fue aceptada.',
                    'errores' => $bodyData['descripcion_errores'] ?? ['Error desconocido.'],
                ], 422);
            }
        } catch (\Exception $e) {
            Log::error('Error al procesar anulación FEL', [
                'mensaje' => $e->getMessage(),
                'uuid' => $uuid,
            ]);

            return response()->json([
                'resultado' => false,
                'mensaje' => 'Error al procesar la anulación.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    public function generarXMLNotaCredito(Request $request, $idcotizacion)
    {
        $validated = $request->validate([
            'motivo' => 'required|string|max:200',
            'monto'  => 'required|numeric|min:0.01',
        ]);

        $res = $this->construirXMLNotaAjuste($idcotizacion, 'NCRE', $validated['motivo'], (float)$validated['monto']);
        if (!$res) return response()->json(['resultado' => false, 'errores' => 'No se pudo generar XML'], 422);

        return $this->enviarXMLAFEL($idcotizacion, $res['xml'], 'NCRE', $res['meta']);
    }

    public function generarXMLNotaDebito(Request $request, $idcotizacion)
    {
        $validated = $request->validate([
            'motivo' => 'required|string|max:200',
            'monto'  => 'required|numeric|min:0.01',
        ]);

        $res = $this->construirXMLNotaAjuste($idcotizacion, 'NDEB', $validated['motivo'], (float)$validated['monto']);
        if (!$res) return response()->json(['resultado' => false, 'errores' => 'No se pudo generar XML'], 422);

        return $this->enviarXMLAFEL($idcotizacion, $res['xml'], 'NDEB', $res['meta']);
    }

    private function construirXMLNotaAjuste($idcotizacion, $tipo, $motivo, $monto)
    {
        // Trae datos mínimos del documento origen y del receptor
        $row = DB::table('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('adm_municipio as m', 'cl.id_municipio', '=', 'm.id_municipio')
            ->join('adm_departamentopais as dp', 'cl.iddepartamento', '=', 'dp.iddepartamentopais')
            ->where('c.idcotizacion', $idcotizacion)
            ->select(
                'c.idcliente',
                'c.uuid as uuid_origen',
                'c.serie as serie_origen',
                'c.numero as numero_origen',
                DB::raw('DATE(c.fecha_certificacion) as fecha_emision'),
                'c.nombre_crtf as nombre',
                'c.numero_crtf as nit',
                'c.direccion_crtf as direccion',
                'cl.codigo_postal',
                'c.email_crtf as correo',
                'c.tipo_crtf as tipo',
                'c.tipo_especial_crtf as tipo_especial',
                'm.nombre as municipio',
                'dp.nombre as departamento',
                DB::raw("'GT' as pais"),
                'cl.excento_iva'
            )
            ->first();

        if (!$row || empty($row->uuid_origen)) {
            return null; // Debe existir un DTE origen certificado
        }

        // Normaliza montos
        $monto = round($monto, 2);
        if ($monto <= 0) {
            return null;
        }

        $exento = ($row->excento_iva ?? 'N') === 'S';

        // Cálculo de base/IVA para una sola línea
        if ($exento) {
            $monto_gravable = 0.00;
            $monto_impuesto = 0.00;
        } else {
            $monto_gravable = round($monto / 1.12, 2);
            $monto_impuesto = round($monto - $monto_gravable, 2);
        }

        // ——— XML ———
        $doc = new \DOMDocument('1.0', 'UTF-8');
        $doc->formatOutput = true;

        $GTDocumento = $doc->createElementNS('http://www.sat.gob.gt/dte/fel/0.2.0', 'dte:GTDocumento');
        $GTDocumento->setAttribute('xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#');
        $GTDocumento->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $GTDocumento->setAttribute('Version', '0.1');
        $doc->appendChild($GTDocumento);

        $SAT = $doc->createElement('dte:SAT');
        $SAT->setAttribute('ClaseDocumento', 'dte');
        $GTDocumento->appendChild($SAT);

        $DTE = $doc->createElement('dte:DTE');
        $DTE->setAttribute('ID', 'DatosCertificados');
        $SAT->appendChild($DTE);

        $DatosEmision = $doc->createElement('dte:DatosEmision');
        $DatosEmision->setAttribute('ID', 'DatosEmision');
        $DTE->appendChild($DatosEmision);

        $DatosGenerales = $doc->createElement('dte:DatosGenerales');
        $DatosGenerales->setAttribute('CodigoMoneda', 'GTQ');
        $DatosGenerales->setAttribute('FechaHoraEmision', now()->format('Y-m-d\TH:i:s'));
        $DatosGenerales->setAttribute('Tipo', $tipo); // NCRE | NDEB
        $DatosEmision->appendChild($DatosGenerales);

        // Emisor (tus datos)
        $Emisor = $doc->createElement('dte:Emisor');
        $Emisor->setAttribute('AfiliacionIVA', 'GEN');
        $Emisor->setAttribute('CodigoEstablecimiento', '1');
        $Emisor->setAttribute('CorreoEmisor', 'ventas@gpexcelencia.com');
        $Emisor->setAttribute('NITEmisor', '109126599');
        $Emisor->setAttribute('NombreComercial', 'GP EXCELENCIA');
        $Emisor->setAttribute('NombreEmisor', 'GP EXCELENCIA, SOCIEDAD ANÓNIMA');
        $DatosEmision->appendChild($Emisor);

        $dirEmisor = $doc->createElement('dte:DireccionEmisor');
        $dirEmisor->appendChild($doc->createElement('dte:Direccion', '11 CALLE 41-20 COLONIA EL NARANJITO ZONA 6 APARTAMENTO A'));
        $dirEmisor->appendChild($doc->createElement('dte:CodigoPostal', '01057'));
        $dirEmisor->appendChild($doc->createElement('dte:Municipio', 'MIXCO'));
        $dirEmisor->appendChild($doc->createElement('dte:Departamento', 'GUATEMALA'));
        $dirEmisor->appendChild($doc->createElement('dte:Pais', 'GT'));
        $Emisor->appendChild($dirEmisor);

        // Receptor (del documento original)
        $Receptor = $doc->createElement('dte:Receptor');
        $Receptor->setAttribute('CorreoReceptor', $row->correo ?? '');
        $Receptor->setAttribute('IDReceptor', $row->nit ?: 'CF');
        $Receptor->setAttribute('NombreReceptor', $row->nombre);
        $DatosEmision->appendChild($Receptor);

        $dirReceptor = $doc->createElement('dte:DireccionReceptor');
        $dirReceptor->appendChild($doc->createElement('dte:Direccion', $row->direccion));
        $dirReceptor->appendChild($doc->createElement('dte:CodigoPostal', $row->codigo_postal ?? '01001'));
        $dirReceptor->appendChild($doc->createElement('dte:Municipio', $row->municipio));
        $dirReceptor->appendChild($doc->createElement('dte:Departamento', $row->departamento));
        $dirReceptor->appendChild($doc->createElement('dte:Pais', 'GT'));
        $Receptor->appendChild($dirReceptor);

        // Frases
        $Frases = $doc->createElement('dte:Frases');
        $Frase = $doc->createElement('dte:Frase');
        $Frase->setAttribute('CodigoEscenario', '1');
        $Frase->setAttribute('TipoFrase', '1');
        $Frases->appendChild($Frase);
        $DatosEmision->appendChild($Frases);

        // Ítems: UNA sola línea de ajuste
        $Items = $doc->createElement('dte:Items');
        $Item = $doc->createElement('dte:Item');
        $Item->setAttribute('BienOServicio', 'B');
        $Item->setAttribute('NumeroLinea', 1);
        $Item->appendChild($doc->createElement('dte:Cantidad', '1'));
        $Item->appendChild($doc->createElement('dte:UnidadMedida', 'UND'));
        $Item->appendChild($doc->createElement(
            'dte:Descripcion',
            ($tipo === 'NCRE' ? 'Ajuste Nota de Crédito: ' : 'Ajuste Nota de Débito: ') . $motivo
        ));
        $Item->appendChild($doc->createElement('dte:PrecioUnitario', number_format($monto, 2, '.', '')));
        $Item->appendChild($doc->createElement('dte:Precio', number_format($monto, 2, '.', '')));
        $Item->appendChild($doc->createElement('dte:Descuento', '0.00'));

        $Impuestos = $doc->createElement('dte:Impuestos');
        $Impuesto = $doc->createElement('dte:Impuesto');
        $Impuesto->appendChild($doc->createElement('dte:NombreCorto', 'IVA'));
        $Impuesto->appendChild($doc->createElement('dte:CodigoUnidadGravable', '1'));
        $Impuesto->appendChild($doc->createElement('dte:MontoGravable', number_format($monto_gravable, 2, '.', '')));
        $Impuesto->appendChild($doc->createElement('dte:MontoImpuesto', number_format($monto_impuesto, 2, '.', '')));
        $Impuestos->appendChild($Impuesto);
        $Item->appendChild($Impuestos);

        $Item->appendChild($doc->createElement('dte:Total', number_format($monto, 2, '.', '')));
        $Items->appendChild($Item);
        $DatosEmision->appendChild($Items);

        // Totales
        $Totales = $doc->createElement('dte:Totales');
        $TotalImpuestos = $doc->createElement('dte:TotalImpuestos');
        $TotalImpuesto = $doc->createElement('dte:TotalImpuesto');
        $TotalImpuesto->setAttribute('NombreCorto', 'IVA');
        $TotalImpuesto->setAttribute('TotalMontoImpuesto', number_format($monto_impuesto, 2, '.', ''));
        $TotalImpuestos->appendChild($TotalImpuesto);
        $Totales->appendChild($TotalImpuestos);
        $Totales->appendChild($doc->createElement('dte:GranTotal', number_format($monto, 2, '.', '')));
        $DatosEmision->appendChild($Totales);

        // Complemento Referencias Nota (obligatorio)
        $Complementos = $doc->createElement('dte:Complementos');
        $Complemento = $doc->createElement('dte:Complemento');
        $Complemento->setAttribute('IDComplemento', 'Notas');
        $Complemento->setAttribute('NombreComplemento', 'Notas');
        $Complemento->setAttribute('URIComplemento', 'http://www.sat.gob.gt/fel/notas.xsd');

        $ReferenciasNota = $doc->createElementNS('http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0', 'cno:ReferenciasNota');
        $ReferenciasNota->setAttribute('FechaEmisionDocumentoOrigen', $row->fecha_emision);
        $ReferenciasNota->setAttribute('MotivoAjuste', $motivo);
        $ReferenciasNota->setAttribute('NumeroAutorizacionDocumentoOrigen', $row->uuid_origen);
        $ReferenciasNota->setAttribute('NumeroDocumentoOrigen', $row->numero_origen);
        $ReferenciasNota->setAttribute('SerieDocumentoOrigen', $row->serie_origen);
        $ReferenciasNota->setAttribute('Version', '0.0');
        $ReferenciasNota->setAttribute('xsi:schemaLocation', 'http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0 http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0.xsd');

        $Complemento->appendChild($ReferenciasNota);
        $Complementos->appendChild($Complemento);
        $DatosEmision->appendChild($Complementos);

        $xml = $doc->saveXML();
        return [
            'xml'  => $xml,
            'meta' => [
                'idcliente'       => $row->idcliente,
                'tipo'            => $tipo,           // NCRE | NDEB
                'motivo'          => $motivo,
                'monto_total'     => $monto,
                'monto_gravable'  => $monto_gravable,
                'monto_impuesto'  => $monto_impuesto,
                'exento_iva'      => $exento ? 'S' : 'N',
                'receptor' => [
                    'numero'        => $row->nit ?: 'CF',
                    'tipo'          => $row->tipo,
                    'tipo_especial' => $row->tipo_especial,
                    'nombre'        => $row->nombre,
                    'email'         => $row->correo,
                    'direccion'     => $row->direccion,
                ],
                'origen' => [
                    'uuid'          => $row->uuid_origen,
                    'serie'         => $row->serie_origen,
                    'numero'        => $row->numero_origen,
                    'fecha_emision' => $row->fecha_emision,
                ],
            ],
        ];
    }


    private function enviarXMLAFEL($idcotizacion, $xmlString, $tipo, $notaMeta = null)
    {
        $identificador = Str::uuid()->toString();
        $headers = [
            'Content-Type' => 'application/xml',
            'UsuarioApi' => '109126599PRO',
            'LlaveApi' => 'EC7E300DF9F5EDD673FE02342E9C4293',
            'UsuarioFirma' => '109126599PRO',
            'LlaveFirma' => '9bbfaf68b130aaa6b69535ac6f1ca5db',
            'Identificador' => $identificador,
        ];

        $apiUrl = 'https://certificador.feel.com.gt/fel/procesounificado/transaccion/v2/xml';

        try {
            $response = Http::withHeaders($headers)->send('POST', $apiUrl, [
                'body' => $xmlString,
            ]);

            $json = $response->json();

            // Log de la respuesta
            Log::info('Respuesta INFILE - ' . strtoupper($tipo), [
                'cotizacion_id' => $idcotizacion,
                'identificador' => $identificador,
                'response' => $json
            ]);


            // === Persistencia para Notas ===
            if (in_array($tipo, ['NCRE', 'NDEB']) && is_array($notaMeta)) {
                $now = now();
                $base = [
                    'idcotizacion'       => $idcotizacion,
                    'idcliente'          => $notaMeta['idcliente'] ?? null,
                    'tipo'               => $tipo,
                    'motivo'             => $notaMeta['motivo'] ?? '',
                    'monto_total'        => $notaMeta['monto_total'] ?? 0,
                    'monto_gravable'     => $notaMeta['monto_gravable'] ?? 0,
                    'monto_impuesto'     => $notaMeta['monto_impuesto'] ?? 0,
                    'exento_iva'         => $notaMeta['exento_iva'] ?? 'N',
                    'receptor_numero'    => $notaMeta['receptor']['numero'] ?? null,
                    'receptor_tipo'      => $notaMeta['receptor']['tipo'] ?? null,
                    'receptor_tipo_especial' => $notaMeta['receptor']['tipo_especial'] ?? null,
                    'receptor_nombre'    => $notaMeta['receptor']['nombre'] ?? null,
                    'receptor_email'     => $notaMeta['receptor']['email'] ?? null,
                    'receptor_direccion' => $notaMeta['receptor']['direccion'] ?? null,
                    'uuid_origen'        => $notaMeta['origen']['uuid'] ?? null,
                    'serie_origen'       => $notaMeta['origen']['serie'] ?? null,
                    'numero_origen'      => $notaMeta['origen']['numero'] ?? null,
                    'fecha_emision_origen' => $notaMeta['origen']['fecha_emision'] ?? $now->toDateString(),
                    'identificador'      => $identificador,
                    'xml_enviado'        => $xmlString,
                    'created_by'         => optional(auth()->user())->id,
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ];

                if ($json['resultado'] === true) {
                    $save = array_merge($base, [
                        'resultado'          => 'S',
                        'uuid_origen'               => $json['uuid'] ?? null,
                        'serie_origen'              => $json['serie'] ?? null,
                        'numero_origen'             => $json['numero'] ?? null,
                        'descripcion'        => $json['descripcion'] ?? null,
                        'fecha_emision_origen' => $json['fecha'] ?? null,
                        'xml_certificado'    => isset($json['xml_certificado']) ? base64_encode($json['xml_certificado']) : null,
                        'alertas_infile'     => isset($json['descripcion_alertas_infile']) ? json_encode($json['descripcion_alertas_infile']) : null,
                        'alertas_sat'        => isset($json['descripcion_alertas_sat']) ? json_encode($json['descripcion_alertas_sat']) : null,
                        'errores'            => null,
                    ]);
                } else {
                    $save = array_merge($base, [
                        'resultado'          => 'N',
                        'uuid_origen'               => null,
                        'serie_origen'              => null,
                        'numero_origen'             => null,
                        'descripcion'        => $json['descripcion'] ?? null,
                        'fecha_emision_origen' => null,
                        'xml_certificado'    => null,
                        'alertas_infile'     => isset($json['descripcion_alertas_infile']) ? json_encode($json['descripcion_alertas_infile']) : null,
                        'alertas_sat'        => isset($json['descripcion_alertas_sat']) ? json_encode($json['descripcion_alertas_sat']) : null,
                        'errores'            => isset($json['descripcion_errores']) ? json_encode($json['descripcion_errores']) : json_encode(['Error desconocido']),
                    ]);
                }

                DB::table('adm_notas_fel')->insert($save);
            }

            // === Respuesta HTTP (sin cambios)
            if ($json['resultado'] === true) {
                return response()->json([
                    'resultado' => true,
                    'uuid' => $json['uuid'],
                    'serie' => $json['serie'],
                    'numero' => $json['numero'],
                    'descripcion' => $json['descripcion'],
                    'fecha_certificacion' => $json['fecha'],
                    'xml_certificado' => base64_encode($json['xml_certificado']),
                    'alertas' => $json['descripcion_alertas_infile'] ?? null,
                ]);
            } else {

                return $this->respuestaErrorNota($tipo, $json, 422);
            }
        } catch (\Exception $e) {
            Log::error('Error al certificar XML tipo ' . $tipo, [
                'cotizacion_id' => $idcotizacion,
                'exception' => $e->getMessage(),
            ]);

            // Si es nota, guarda intento fallido también
            if (in_array($tipo, ['NCRE', 'NDEB']) && is_array($notaMeta ?? null)) {
                DB::table('adm_notas_fel')->insert([
                    'idcotizacion'   => $idcotizacion,
                    'idcliente'      => $notaMeta['idcliente'] ?? null,
                    'tipo'           => $tipo,
                    'motivo'         => $notaMeta['motivo'] ?? '',
                    'monto_total'    => $notaMeta['monto_total'] ?? 0,
                    'monto_gravable' => $notaMeta['monto_gravable'] ?? 0,
                    'monto_impuesto' => $notaMeta['monto_impuesto'] ?? 0,
                    'exento_iva'     => $notaMeta['exento_iva'] ?? 'N',
                    'receptor_numero'    => $notaMeta['receptor']['numero'] ?? null,
                    'receptor_tipo'      => $notaMeta['receptor']['tipo'] ?? null,
                    'receptor_tipo_especial' => $notaMeta['receptor']['tipo_especial'] ?? null,
                    'receptor_nombre'    => $notaMeta['receptor']['nombre'] ?? null,
                    'receptor_email'     => $notaMeta['receptor']['email'] ?? null,
                    'receptor_direccion' => $notaMeta['receptor']['direccion'] ?? null,
                    'uuid_origen'    => $notaMeta['origen']['uuid'] ?? null,
                    'serie_origen'   => $notaMeta['origen']['serie'] ?? null,
                    'numero_origen'  => $notaMeta['origen']['numero'] ?? null,
                    'fecha_emision_origen' => $notaMeta['origen']['fecha_emision'] ?? now()->toDateString(),
                    'resultado'      => 'N',
                    'errores'        => json_encode([$e->getMessage()]),
                    'identificador'  => $identificador,
                    'xml_enviado'    => $xmlString,
                    'created_by'     => optional(auth()->user())->id,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            return $this->respuestaErrorNota($tipo, [
                'descripcion' => 'Excepción en servidor',
                'descripcion_errores' => [$e->getMessage()],
            ], 500);
        }
    }

    private function respuestaErrorNota(string $tipo, array $json = null, int $status = 422)
    {
        // Mensaje genérico para el usuario
        $payload = [
            'resultado' => false,
            'mensaje'   => 'No se pudo certificar la NC o ND.',
        ];

        return response()->json($payload, $status);
    }

    /**
     * Obtiene el siguiente correlativo para la 'tabla' indicada.
     * - Para 'nofactura': filtra por $anio (reinicio anual).
     * - Para 'nocotizacion': ignora el año (global).
     *
     * Concurrency-safe: usa transacción + lockForUpdate().
     */
    private function siguienteCorrelativoFactura(int $anio): int
    {
        return DB::transaction(function () use ($anio) {
            $row = Correlativo::where('tabla', 'nofactura')
                ->where('anio', $anio)
                ->lockForUpdate()
                ->first();

            if (!$row) {
                $row = Correlativo::create([
                    'tabla'       => 'nofactura',
                    'correlativo' => 0,
                    'incremento'  => 1,
                    'anio'        => $anio,
                ]);
            }

            $row->correlativo = (int) $row->correlativo + 1;
            $row->save();

            return (int) $row->correlativo;
        });
    }

    private function pad(int $valor, int $width = 6): string
    {
        return str_pad((string) $valor, $width, '0', STR_PAD_LEFT);
    }

    public function listarNotasFel(Request $request, int $idcotizacion)
    {
        $tipo = $request->query('tipo'); // NCRE | NDEB (opcional)

        $rows = DB::table('adm_notas_fel as nf')
            ->leftJoin('adm_cotizacion as c', 'nf.idcotizacion', '=', 'c.idcotizacion')
            ->selectRaw("
            nf.idnota,
            nf.idcotizacion,
            nf.tipo,
            nf.motivo,
            nf.monto_total  as monto,
            nf.monto_gravable,
            nf.monto_impuesto,
            nf.exento_iva,
            nf.receptor_nombre as cliente,
            nf.receptor_numero as receptor_numero,
            nf.receptor_direccion as direccion,
            -- en tu persistencia estos campos terminan guardando la info de la nota certificada
            nf.uuid_origen   as uuid_nota,
            nf.serie_origen  as serie_nota,
            nf.numero_origen as numero_nota,
            DATE(COALESCE(nf.fecha_emision_origen, nf.created_at)) as fecha_nota,
            -- referencia a la factura origen (por si quieres mostrarla)
            c.serie  as serie_factura,
            c.numero as numero_factura,
            c.uuid   as uuid_factura,
            DATE(c.fecha_certificacion) as fecha_factura
        ")
            ->where('nf.idcotizacion', $idcotizacion)
            ->when($tipo, fn($q) => $q->where('nf.tipo', $tipo))
            ->orderByDesc('nf.created_at')
            ->get();

        return response()->json($rows);
    }

    public function generarPdfNotaFel(int $idnota)
    {
        $nota = DB::table('adm_notas_fel as nf')
            ->leftJoin('adm_cotizacion as c', 'nf.idcotizacion', '=', 'c.idcotizacion')
            ->selectRaw("
            nf.idnota,
            nf.idcotizacion,
            nf.tipo,
            nf.motivo,
            nf.monto_total  as monto,
            nf.monto_gravable,
            nf.monto_impuesto,
            nf.exento_iva,
            nf.receptor_nombre  as cliente,
            nf.receptor_numero  as receptor_numero,
            nf.receptor_direccion as direccion,
            nf.uuid_origen   as uuid_nota,
            nf.serie_origen  as serie_nota,
            nf.numero_origen as numero_nota,
            DATE(COALESCE(nf.fecha_emision_origen, nf.created_at)) as fecha_nota,
            c.serie  as serie_factura,
            c.numero as numero_factura,
            c.uuid   as uuid_factura,
            DATE(c.fecha_certificacion) as fecha_factura
        ")
            ->where('nf.idnota', $idnota)
            ->first();

        if (!$nota) {
            return response()->json(['message' => 'Nota no encontrada'], 404);
        }

        // Datos fijos de la empresa (ajusta a los tuyos)
        $empresa = [
            'nombre'   => 'GP EXCELENCIA, S.A.',
            'nit'      => '109126599',
            'direccion' => '11 calle 41-20 Aldea El Naranjito, Zona 6 de Mixco, Guatemala',
            'telefonos' => '2309-9419 / 2294-9257',
            'email'    => 'ventas@gpexcelencia.com',
            'web'      => 'www.gpexcelencia.com',
        ];

        $html = view('pdf.nota_fel', [
            'nota'    => $nota,
            'empresa' => $empresa,
            'esCredito' => $nota->tipo === 'NCRE',
        ])->render();

        $pdf = Pdf::loadHTML($html)->setPaper('letter', 'portrait');

        $fn = sprintf('%s_%s-%s.pdf', $nota->tipo, $nota->serie_nota ?? 'SN', $nota->numero_nota ?? '0');
        return $pdf->stream($fn);
    }

    public function generarPdfUltimaNotaPorTipo(Request $request, int $idcotizacion)
    {
        $tipo = $request->query('tipo', 'NCRE'); // NCRE | NDEB
        $idnota = DB::table('adm_notas_fel')
            ->where('idcotizacion', $idcotizacion)
            ->where('tipo', $tipo)
            ->orderByDesc('created_at')
            ->value('idnota');

        if (!$idnota) {
            return response()->json(['message' => 'No hay notas de ese tipo para esta factura'], 404);
        }
        return $this->generarPdfNotaFel((int)$idnota);
    }
}
