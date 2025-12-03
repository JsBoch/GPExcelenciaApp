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
use App\Models\ComentarioPreFacturacion;
use App\Models\AdmFacturacion;


class MonitorFacturacionController extends Controller
{
    public function index(Request $request)
    {
        $estado      = $request->query('estado');
        $fechaInicio = $request->query('fechaInicio');
        $fechaFinal  = $request->query('fechaFinal');
        $idvendedor  = $request->query('idvendedor');

        $end   = $fechaFinal  ? Carbon::parse($fechaFinal)  : Carbon::today();
        $start = $fechaInicio ? Carbon::parse($fechaInicio) : $end->copy();

        $desde = $start->copy()->startOfDay()->toDateTimeString();
        $hasta = $end->copy()->addDay()->startOfDay()->toDateTimeString();

        // ==============================
        // 🔹 Consulta 1: Cotizaciones (estados 4 y 5)
        // ==============================
        $cotizacionesQuery = DB::table('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->join('users as u', 'c.idusuario', '=', 'u.id')
            ->join('adm_empleados as e', 'u.id', '=', 'e.iduser')
            ->select([
                'c.idcotizacion',
                'c.idcliente',
                DB::raw("CONCAT('CT',CAST(c.nocotizacion AS CHAR)) as nocotizacion"),
                DB::raw("DATE_FORMAT(c.fecha_cotizacion, '%Y-%m-%dT%H:%i:%s') AS fecha_cotizacion"),
                't.tipo as tipo_pago',
                'e.nombre as vendedor',
                DB::raw('CAST(c.total AS DECIMAL(15,2)) AS total_general'),
                'cl.nombre as cliente',
                'ct.nombre as contacto',
                'c.tipo_facturacion as tipo_facturacion',
                'c.observaciones_cliente',
                'c.estado',
                DB::raw("
                CASE 
                    WHEN c.estado = 4 THEN 'PRE-FACTURACION'
                    WHEN c.estado = 5 THEN 'PARA FACTURAR'
                    ELSE 'DESCONOCIDO'
                END as estado_texto
            "),
                DB::raw('NULL as nofactura'),
                DB::raw('NULL as uuid'),
                DB::raw('NULL as serie'),
                DB::raw('NULL as numero_fel'),
                DB::raw('NULL as resultado'),
                DB::raw('NULL as errores'),
            ])
            ->whereIn('c.estado', [4, 5]);

        // ==============================
        // 🔹 Subconsulta: última factura por cotización
        // ==============================
        $ultimaFacturaSub = DB::table('adm_facturacion')
            ->select('idcotizacion', DB::raw('MAX(idfactura) AS idfactura'))
            ->groupBy('idcotizacion');

        // ==============================
        // 🔹 Consulta 2: Facturas (vigentes o anuladas)
        // ==============================
        $facturacionQuery = DB::table('adm_facturacion as f')
            ->joinSub($ultimaFacturaSub, 'ult', function ($join) {
                $join->on('f.idcotizacion', '=', 'ult.idcotizacion')
                    ->on('f.idfactura', '=', 'ult.idfactura');
            })
            ->join('adm_cotizacion as c', 'c.idcotizacion', '=', 'f.idcotizacion')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->join('users as u', 'c.idusuario', '=', 'u.id')
            ->join('adm_empleados as e', 'u.id', '=', 'e.iduser')
            ->select([
                'c.idcotizacion',
                'c.idcliente',
                DB::raw("CONCAT('CT',CAST(c.nocotizacion AS CHAR)) as nocotizacion"),
                DB::raw("DATE_FORMAT(COALESCE(f.fecha_certificacion, f.fecha_anulacion), '%Y-%m-%dT%H:%i:%s') AS fecha_cotizacion"),
                't.tipo as tipo_pago',
                'e.nombre as vendedor',
                DB::raw('CAST(c.total AS DECIMAL(15,2)) AS total_general'),
                'cl.nombre as cliente',
                'ct.nombre as contacto',
                'c.tipo_facturacion as tipo_facturacion',
                'c.observaciones_cliente',
                DB::raw("
                CASE 
                    WHEN f.estado = 1 THEN 6
                    WHEN f.estado = 0 THEN 7
                    ELSE 6
                END as estado
            "),
                DB::raw("
                CASE 
                    WHEN f.estado = 1 THEN 'FACTURADA'
                    WHEN f.estado = 0 THEN 'ANULADA'
                    ELSE 'FACTURADA'
                END as estado_texto
            "),
                'f.nofactura',
                'f.uuid',
                'f.serie',
                'f.numero as numero_fel',
                'f.resultado',
                'f.errores',
            ])
            ->where('f.resultado', 'S');

        // ==============================
        // 🔹 Filtros adicionales
        // ==============================
        foreach ([$cotizacionesQuery, $facturacionQuery] as $q) {
            if (!empty($idvendedor)) {
                $q->where('e.id_empleado', $idvendedor);
            }

            if ($fechaInicio && $fechaFinal) {
                if ($q === $cotizacionesQuery) {
                    $q->whereBetween('c.fecha_cotizacion', [$desde, $hasta]);
                } else {
                    $q->whereBetween(DB::raw("COALESCE(f.fecha_certificacion, f.fecha_anulacion)"), [$desde, $hasta]);
                }
            }
        }

        // ==============================
        // 🔹 Condición según estado
        // ==============================
        if (in_array($estado, ['4', '5'])) {
            $query = $cotizacionesQuery->where('c.estado', (int)$estado);
        } elseif (in_array($estado, ['6', '7', '0'])) {
            $query = $facturacionQuery->where('c.estado', 6);
        } else {
            // Todos → unir las dos
            $query = $cotizacionesQuery->unionAll($facturacionQuery);
        }

        // ==============================
        // 🔹 Ejecución y limpieza
        // ==============================
        $cotizaciones = DB::table(DB::raw("({$query->toSql()}) as sub"))
            ->mergeBindings($query)
            ->orderBy('fecha_cotizacion', 'desc')
            ->get();

        foreach ($cotizaciones as $cot) {
            if (is_string($cot->errores) && $this->isJson($cot->errores)) {
                $cot->errores = json_decode($cot->errores, true);
            }
            if (isset($cot->total_general)) {
                $cot->total_general = (float)$cot->total_general;
            }
        }

        return response()->json($cotizaciones);
    }




    private function isJson($string)
    {
        json_decode($string);
        return json_last_error() === JSON_ERROR_NONE;
    }

    // === Helpers para PDF de factura (usar snapshot de adm_facturacion) ===

    /** Devuelve la última factura vigente y certificada de una cotización */
    // private function facturaVigente(int $idcotizacion): ?AdmFacturacion
    // {
    //     return AdmFacturacion::where('idcotizacion', $idcotizacion)
    //     ->where('resultado', 'S') //certificada
    //         ->whereIn('estado', [0, 1])           // 0 anulada vigent
    //         ->latest('idfactura')
    //         ->first();
    // }
    private function facturaVigente(int $idcotizacion): ?AdmFacturacion
    {
        // 1️⃣ Buscar primero la factura vigente más reciente (estado=1)
        $vigente = AdmFacturacion::where('idcotizacion', $idcotizacion)
            ->where('estado', 1)
            ->where('resultado', 'S')
            ->latest('idfactura')
            ->first();

        if ($vigente) {
            // Log::info("🧾 Factura vigente seleccionada", [
            //     'idcotizacion' => $idcotizacion,
            //     'idfactura'    => $vigente->idfactura,
            //     'estado'       => $vigente->estado,
            //     'resultado'    => $vigente->resultado,
            // ]);
            return $vigente;
        }

        // 2️⃣ Si no hay vigente, buscar la anulada más reciente (estado=0)
        $anulada = AdmFacturacion::where('idcotizacion', $idcotizacion)
            ->where('estado', 0)
            ->where('resultado', 'S')
            ->latest('idfactura')
            ->first();

        if ($anulada) {
            // Log::info("🧾 Factura ANULADA seleccionada (no hay vigente)", [
            //     'idcotizacion' => $idcotizacion,
            //     'idfactura'    => $anulada->idfactura,
            //     'estado'       => $anulada->estado,
            //     'resultado'    => $anulada->resultado,
            // ]);
            return $anulada;
        }

        // 3️⃣ Si no hay ninguna, devolver null
        return null;
    }



    private function cabeceraParaVista(AdmFacturacion $f, AdmCotizacion $c): \stdClass
    {
        $obj = new \stdClass();

        // 🔹 Identificadores y datos base
        $obj->idcotizacion        = $c->idcotizacion;
        $obj->serie               = $f->serie;
        $obj->numero              = $f->numero;
        $obj->numero_autorizacion = $f->uuid; // Antes venía de c.uuid
        $obj->fecha_emision       = $f->fecha_certificacion
            ? Carbon::parse($f->fecha_certificacion)->toDateString()
            : Carbon::now()->toDateString();
        $obj->total               = $c->total;

        // 🔹 Receptor: usar SIEMPRE lo fotografiado en adm_facturacion
        $obj->nit        = $f->numero_crtf;
        $obj->nombre     = $f->nombre_crtf;
        $obj->direccion  = $f->direccion_crtf;

        // 🔹 Correlativos que tu vista usa tal cual
        $obj->nofactura    = $f->nofactura;       // interno (ya se genera en certif.)
        $obj->nocotizacion = $c->nocotizacion;

        // 🔹 Estado: si la factura está anulada, reemplaza el estado de la cotización
        if (isset($f->estado) && (int) $f->estado === 0) {
            $obj->estado = 0; // Factura ANULADA
        } else {
            // Mantiene el estado de la cotización (por ejemplo, 6 = facturada)
            $obj->estado = $c->estado ?? 6;
        }

        // 🔹 Número interno con el mismo formato de siempre
        $facturaStr    = $this->pad((int) ($f->nofactura ?? 0), 6);
        $cotizacionStr = $this->pad((int) $c->nocotizacion, 6);
        $obj->numero_interno = "GP-{$facturaStr}-{$cotizacionStr}";

        return $obj;
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
                    'c.version',
                    'c.tipo_facturacion',
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
            d.precio_unitario,
            d.precio,
            d.descuento,
            d.subtotal AS monto_gravable,
            d.impuesto_iva AS monto_impuesto,
            d.total,
            c.total AS gran_total,
            c.total AS monto_abono,
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

        // 2.1) Obtener el tipo_facturacion de la cotización (BIEN | SERVICIO)
        $tipoFacturaDB = DB::table('adm_cotizacion')
            ->where('idcotizacion', $idcotizacion)
            ->value('tipo_facturacion');

        // Normalizar y mapear a B/S (default: B)
        $tipoFacturaNorm = strtoupper(trim((string)$tipoFacturaDB));
        $bienOServicio = ($tipoFacturaNorm === 'SERVICIO') ? 'S' : 'B';


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
            $Frase2->setAttribute('CodigoEscenario', '11'); // No exportación (u otro si aplica)
            $Frases->appendChild($Frase2);
        }

        $Items = $doc->createElement('dte:Items');
        $DatosEmision->appendChild($Items);

        $sumaImpuestos = 0.00; // acumulado de IVA para Totales

        foreach ($detalles as $d) {
            $Item = $doc->createElement('dte:Item');
            // $Item->setAttribute('BienOServicio', 'B');
            $Item->setAttribute('BienOServicio', $bienOServicio);
            $Item->setAttribute('NumeroLinea', $d->numero_linea);

            $Item->appendChild($doc->createElement('dte:Cantidad', $d->cantidad));
            $Item->appendChild($doc->createElement('dte:UnidadMedida', $d->unidad_medida));
            // $Item->appendChild($doc->createElement('dte:Descripcion', $d->descripcion));
            $descripcionNode = $doc->createElement('dte:Descripcion');
            $descripcionNode->appendChild(
                $doc->createCDATASection($d->descripcion)
            );
            $Item->appendChild($descripcionNode);
            $Item->appendChild($doc->createElement('dte:PrecioUnitario', number_format($d->precio_unitario, 3, '.', '')));
            $Item->appendChild($doc->createElement('dte:Precio', number_format($d->precio, 3, '.', '')));
            $Item->appendChild($doc->createElement('dte:Descuento', number_format($d->descuento, 3, '.', '')));

            // Siempre incluir Impuestos (FCAM lo exige)
            $Impuestos = $doc->createElement('dte:Impuestos');
            $Impuesto  = $doc->createElement('dte:Impuesto');
            $Impuesto->appendChild($doc->createElement('dte:NombreCorto', 'IVA'));

            if ($clienteExentoIVA === "S") {
                // EXENTO: UG=2, base plena, impuesto 0.00
                $Impuesto->appendChild($doc->createElement('dte:CodigoUnidadGravable', '2'));
                $baseExenta = (float)$d->precio - (float)$d->descuento; // tu SELECT pone descuento=0, igual queda correcto
                $Impuesto->appendChild($doc->createElement('dte:MontoGravable', number_format($baseExenta, 3, '.', '')));
                $Impuesto->appendChild($doc->createElement('dte:MontoImpuesto', number_format(0, 3, '.', '')));
                // $sumaImpuestos no cambia
            } else {
                // GRAVADO: UG=1, tu cálculo actual
                $Impuesto->appendChild($doc->createElement('dte:CodigoUnidadGravable', '1'));
                $Impuesto->appendChild($doc->createElement('dte:MontoGravable', number_format($d->monto_gravable, 3, '.', '')));
                $Impuesto->appendChild($doc->createElement('dte:MontoImpuesto', number_format($d->monto_impuesto, 3, '.', '')));
                $sumaImpuestos += (float)$d->monto_impuesto;
            }

            $Impuestos->appendChild($Impuesto);
            $Item->appendChild($Impuestos);

            $Item->appendChild($doc->createElement('dte:Total', number_format($d->total, 3, '.', '')));
            $Items->appendChild($Item);
        }

        $Totales = $doc->createElement('dte:Totales');
        $DatosEmision->appendChild($Totales);

        $TotalImpuestos = $doc->createElement('dte:TotalImpuestos');
        $TotalImpuesto  = $doc->createElement('dte:TotalImpuesto');
        $TotalImpuesto->setAttribute('NombreCorto', 'IVA');
        $TotalImpuesto->setAttribute('TotalMontoImpuesto', number_format($sumaImpuestos, 2, '.', ''));
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
        // Log::info("XML generado para cotización {$idcotizacion}:\n" . $xmlString);
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
            DB::transaction(function () use ($json, $response, $idcotizacion, $identificador, $idReceptor, $docTipo, $tipoEspecial, $nombre, $correo, $direccion) {
                $cotizacion = AdmCotizacion::lockForUpdate()->findOrFail($idcotizacion);

                // Se graba en la base de datos la respuesta de SAT
                if ($response->successful() && ($json['resultado'] ?? false) === true) {
                    // ⭐ correlativo interno (igual que hoy)
                    $correlativo = Correlativo::lockForUpdate()->find('nofactura');
                    if (!$correlativo) {
                        throw new \RuntimeException('No se encontró el correlativo para el numero interno');
                    }
                    $noFactura = $correlativo->correlativo + $correlativo->incremento;
                    $correlativo->correlativo = $noFactura;
                    $correlativo->save();

                    // ⭐ crear fila en adm_facturacion (NO tocar campos “de factura” en cotización)
                    $factura = AdmFacturacion::create([
                        'idcotizacion'         => $cotizacion->idcotizacion,
                        'resultado'            => 'S',
                        'uuid'                 => $json['uuid']  ?? null,
                        'serie'                => $json['serie'] ?? null,
                        'numero'               => $json['numero'] ?? null,
                        'descripcion'          => $json['descripcion'] ?? null,

                        // normaliza formato a 'Y-m-d H:i:s'
                        'fecha_certificacion'  => isset($json['fecha'])
                            ? Carbon::parse($json['fecha'])->toDateTimeString()
                            : now()->toDateTimeString(),

                        // si ya viene como string (base64), guarda tal cual; si no, fuerza a string y codifica
                        'xml_certificado'      => is_string($json['xml_certificado'] ?? null)
                            ? $json['xml_certificado']
                            : base64_encode((string)($json['xml_certificado'] ?? '')),

                        // evita "Array to string conversion"
                        'alertas'              => isset($json['descripcion_alertas_infile'])
                            ? (is_array($json['descripcion_alertas_infile'])
                                ? json_encode($json['descripcion_alertas_infile'], JSON_UNESCAPED_UNICODE)
                                : (string)$json['descripcion_alertas_infile'])
                            : null,

                        'identificador'        => $identificador,
                        'numero_crtf'          => $idReceptor,
                        'tipo_crtf'            => $docTipo,
                        'tipo_especial_crtf'   => $tipoEspecial,
                        'nombre_crtf'          => $nombre,
                        'email_crtf'           => $correo,
                        'direccion_crtf'       => $direccion,
                        'estado'               => 1,
                        'nofactura'            => $noFactura,
                    ]);

                    // ⭐ mover la cotización de 5 → 6 (pero sin “ensuciar” con campos FEL)
                    $cotizacion->update(['estado' => 6]);

                    // ⭐ CxC por factura (NO por cotización genérica)
                    // ⭐ CxC por factura (NO por cotización genérica)
                    $cxcoriginal = AdmCuentasPorCobrar::where('idcotizacion', $cotizacion->idcotizacion)->first();

                    if ($cxcoriginal && $cxcoriginal->estado == 0) {
                        // 🟢 Reactivar (ya estaba anulada)
                        $cxcoriginal->update([
                            'idfactura'          => $factura->idfactura,
                            'fecha_emision'      => now(),
                            'fecha_vencimiento'  => now()->addDays(30),
                            'monto_original'     => $cotizacion->total_general,
                            'saldo_pendiente'    => $cotizacion->total_general,
                            'monto_pagado'       => 0,
                            'descuento_aplicado' => 0,
                            'estado'             => 1, // reactivada
                            'fecha_creacion'     => now(),
                        ]);
                    } elseif (!$cxcoriginal) {
                        // 🆕 Crear una nueva si no existe
                        $correlativoCXC = Correlativo::lockForUpdate()->find('adm_cuentas_porcobrar');
                        if (!$correlativoCXC) {
                            throw new \RuntimeException('No se encontró correlativo para cuentas por cobrar');
                        }
                        $nuevoIdCXC = $correlativoCXC->correlativo + $correlativoCXC->incremento;
                        $correlativoCXC->correlativo = $nuevoIdCXC;
                        $correlativoCXC->save();

                        AdmCuentasPorCobrar::create([
                            'idcuentaporcobrar'  => $nuevoIdCXC,
                            'idcotizacion'       => $cotizacion->idcotizacion,
                            'idfactura'          => $factura->idfactura,
                            'idcliente'          => $cotizacion->idcliente,
                            'fecha_emision'      => now(),
                            'fecha_vencimiento'  => now()->addDays(30),
                            'moneda'             => 'GTQ',
                            'tasa_cambio'        => 1,
                            'monto_original'     => $cotizacion->total,
                            'saldo_pendiente'    => $cotizacion->total,
                            'monto_pagado'       => 0,
                            'descuento_aplicado' => $cotizacion->descuento_monto,
                            'idusuario_creacion' => auth()->id(),
                            'usuario_creacion'   => auth()->user()->name ?? 'sistema',
                            'fecha_creacion'     => now(),
                            'origen_registro'    => 'sistema',
                            'centro_costo'       => 'produccion',
                            'cuenta_contable'    => '0',
                            'estatus_riesgo'     => 'medio',
                            'estado'             => 1,
                        ]);
                    }
                } else {
                    // ⭐ guardar intento fallido como fila también (opcional pero útil)
                    AdmFacturacion::create([
                        'idcotizacion'   => $idcotizacion,
                        'resultado'      => 'N',
                        // evita "Array to string conversion"
                        'errores'        => isset($json['descripcion_errores'])
                            ? (is_array($json['descripcion_errores'])
                                ? json_encode($json['descripcion_errores'], JSON_UNESCAPED_UNICODE)
                                : (string)$json['descripcion_errores'])
                            : json_encode(['Error desconocido'], JSON_UNESCAPED_UNICODE),
                        'identificador'  => $identificador,
                        'estado'         => 0, // fallida/no vigente
                    ]);
                }
            });

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
                'trace'         => $e->getTraceAsString(),
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
    public function generarImpresionFactura($id)
    {
        //Log::info("➡️ Entrando a generarImpresionFactura con ID={$id}");

        try {
            $fact = $this->facturaVigente((int)$id);
            if (!$fact) {
                //Log::warning("❌ No hay DTE vigente para cotización ID={$id}");
                return response()->json(['message' => 'No hay DTE vigente para esta cotización'], 404);
            }

            $cot = AdmCotizacion::select('idcotizacion', 'total', 'nocotizacion', 'estado')
                ->findOrFail($id);

            $cabecera = $this->cabeceraParaVista($fact, $cot);
            //Log::info("✅ Cabecera generada. Estado={$cabecera->estado}");

            $detalles = AdmDetalleCotizacion::where('idcotizacion', $id)->get();
            $totalEnLetras = $this->convertirNumeroALetrasConCentavos($cabecera->total);

            // ======= Paso 2: Intentar guardar HTML =======
            $html = view('pdf.factura', [
                'cotizacion'     => $cabecera,
                'detalles'       => $detalles,
                'totalEnLetras'  => $totalEnLetras,
            ])->render();

            $path = storage_path('app/debug_factura.html');
            file_put_contents($path, $html);
            //Log::info("📝 HTML guardado en {$path}");
            // ============================================

            $pdf = Pdf::loadHTML($html)->setPaper('letter', 'portrait');
            //Log::info("📄 PDF renderizado correctamente para {$cabecera->numero_interno}");
            return $pdf->stream('factura-' . $cabecera->serie . '-' . $cabecera->numero . '.pdf');
        } catch (\Throwable $e) {
            Log::error("⚠️ Error en generarImpresionFactura: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Error interno al generar PDF.'], 500);
        }
    }


    public function facturaData($id)
    {
        $fact = $this->facturaVigente((int)$id);
        if (!$fact) {
            return response()->json(['message' => 'No hay DTE vigente para esta cotización'], 404);
        }

        $cot = AdmCotizacion::select('idcotizacion', 'total_general', 'nocotizacion', 'estado')
            ->findOrFail($id);

        $cab = $this->cabeceraParaVista($fact, $cot);

        // Detalle
        $detalles = DB::table('adm_detalle_cotizacion as d')
            ->where('d.idcotizacion', $id)
            ->select('d.cantidad', 'd.descripcion', DB::raw('d.precio as precio_unitario'), 'd.total')
            ->orderBy('d.iddetallecotizacion', 'asc')
            ->get()
            ->map(function ($d) {
                return [
                    'cantidad' => (int) $d->cantidad,
                    'descripcion' => $d->descripcion,
                    'precio' => round((float) $d->precio_unitario, 2),
                    'total'  => round((float) $d->total, 2),
                ];
            });

        $totalEnLetras = $this->convertirNumeroALetrasConCentavos($cab->total);

        return response()->json([
            'cotizacion' => [
                'serie'               => $cab->serie,
                'numero'              => $cab->numero,
                'numero_autorizacion' => $cab->numero_autorizacion,
                'fecha_emision'       => Carbon::parse($cab->fecha_emision)->format('d/m/Y'),
                'total'               => (float) $cab->total,
                'nit'                 => $cab->nit,
                'nombre'              => $cab->nombre,
                'direccion'           => $cab->direccion,
                'numero_interno'      => $cab->numero_interno,
                'total_en_letras'     => $totalEnLetras,
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

        // 1) Buscar la ÚLTIMA factura vigente y certificada para esta cotización
        $factura = AdmFacturacion::where('idcotizacion', $idcotizacion)
            ->where('estado', 1)              // vigente
            ->where('resultado', 'S')         // certificada OK
            ->latest('idfactura')
            ->first();

        if (!$factura || empty($factura->uuid)) {
            return response()->json(['error' => 'No hay factura vigente certificada para anular.'], 400);
        }

        $uuid           = strtoupper(trim($factura->uuid));
        $motivo         = $request->motivo;
        $nitEmisor      = '109126599';
        $idReceptor     = $factura->numero_crtf ?: 'CF'; // receptor tomado de la certificación almacenada
        $fechaEmision   = Carbon::parse($factura->fecha_certificacion)->format('Y-m-d\TH:i:s');
        $fechaAnulacion = now()->format('Y-m-d\TH:i:s');

        // 2) Construir XML de anulación
        $doc = new \DOMDocument('1.0', 'UTF-8');
        $doc->formatOutput = true;

        $GTAnulacion = $doc->createElementNS('http://www.sat.gob.gt/dte/fel/0.1.0', 'dte:GTAnulacionDocumento');
        $GTAnulacion->setAttribute('xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#');
        $GTAnulacion->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $GTAnulacion->setAttribute('Version', '0.1');
        // Nota: no es necesario incluir schemaLocation con rutas locales
        $doc->appendChild($GTAnulacion);

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

        // 3) Headers y URL INFILE
        $headers = [
            'Content-Type'  => 'application/xml',
            'UsuarioApi'    => '109126599PRO',
            'LlaveApi'      => 'EC7E300DF9F5EDD673FE02342E9C4293',
            'UsuarioFirma'  => '109126599PRO',
            'LlaveFirma'    => '9bbfaf68b130aaa6b69535ac6f1ca5db',
            'Identificador' => (string) Str::uuid(),
        ];
        $url = 'https://certificador.feel.com.gt/fel/procesounificado/transaccion/v2/xml';

        try {
            Log::info('XML Anulación FEL INFILE', ['xml' => $xmlString]);

            $response = Http::withHeaders($headers)->send('POST', $url, ['body' => $xmlString]);

            Log::info('Respuesta de anulación FEL INFILE', ['body' => $response->body()]);

            // Infile suele regresar JSON anidado
            $data     = json_decode($response->body(), true);
            $bodyData = isset($data['body']) ? json_decode($data['body'], true) : $data;

            if (($bodyData['resultado'] ?? false) === true) {
                // 4) Persistencia coherente y aislada
                DB::transaction(function () use ($factura, $motivo, $idcotizacion) {
                    // a) Marcar la fila de adm_facturacion como anulada
                    AdmFacturacion::where('idfactura', $factura->idfactura)->update([
                        'estado'           => 0,                 // anulada
                        'fecha_anulacion'  => now(),
                        'motivo_anulacion' => $motivo,
                        'idusuario_anula'  => auth()->id(),
                    ]);

                    // b) La cotización vuelve a estado 5 (lista para refacturar)
                    AdmCotizacion::where('idcotizacion', $idcotizacion)->update([
                        'estado' => 4,
                    ]);

                    // c) (Opcional/Recomendado) Cerrar la CxC de ESTA factura
                    AdmCuentasPorCobrar::where('idfactura', $factura->idfactura)
                        ->update(['estado' => 0, 'estatus_riesgo' => 'cerrado']);
                });

                return response()->json([
                    'resultado' => true,
                    'mensaje'   => 'Factura anulada con éxito.',
                    'uuid'      => $bodyData['uuid'] ?? '',
                ]);
            }

            // Error de anulación reportado por Infile/SAT
            return response()->json([
                'resultado' => false,
                'mensaje'   => $bodyData['descripcion'] ?? 'La anulación no fue aceptada.',
                'errores'   => $bodyData['descripcion_errores'] ?? ['Error desconocido.'],
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Error al procesar anulación FEL', [
                'mensaje' => $e->getMessage(),
                'uuid'    => $uuid ?? null,
            ]);

            return response()->json([
                'resultado' => false,
                'mensaje'   => 'Error al procesar la anulación.',
                'error'     => $e->getMessage(),
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
        // 1) Documento origen (fotografía FEL vigente)
        $fact = $this->facturaVigente((int)$idcotizacion);
        if (!$fact) return null; // no hay DTE vigente que referenciar

        // 2) Datos adicionales del cliente (para dirección/código postal/municipio/departamento)
        $cli = DB::table('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('adm_municipio as m', 'cl.id_municipio', '=', 'm.id_municipio')
            ->join('adm_departamentopais as dp', 'cl.iddepartamento', '=', 'dp.iddepartamentopais')
            ->where('c.idcotizacion', $idcotizacion)
            ->select(
                'cl.idcliente',
                'cl.nombre         as cliente_nombre',
                'cl.direccion      as cliente_direccion',
                'cl.email          as cliente_email',
                'cl.codigo_postal',
                'cl.excento_iva',
                'm.nombre          as municipio',
                'dp.nombre         as departamento',
                'c.tipo_facturacion'
            )
            ->first();

        // Determina si es bien o servicio
        $bienOServicio = 'B'; // por defecto
        if (!empty($cli->tipo_facturacion) && strtoupper($cli->tipo_facturacion) === 'SERVICIO') {
            $bienOServicio = 'S';
        }


        // 3) Normalización de montos
        $monto = round((float)$monto, 2);
        if ($monto <= 0) return null;

        $exento = ($cli->excento_iva ?? 'N') === 'S';
        if ($exento) {
            $monto_gravable = 0.00;
            $monto_impuesto = 0.00;
        } else {
            $monto_gravable = round($monto / 1.12, 2);
            $monto_impuesto = round($monto - $monto_gravable, 2);
        }

        // 4) Armar XML (usando LA FACTURA como origen)
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

        // Receptor: SIEMPRE desde la fotografía de la factura
        $nombreReceptor    = trim((string)($cli->cliente_nombre   ?? ''));
        $direccionReceptor = trim((string)($cli->cliente_direccion ?? ''));
        $correoReceptor    = trim((string)($cli->cliente_email     ?? ''));

        // fallback a la “foto” de la factura solo si algo vino vacío
        if ($nombreReceptor    === '' && !empty($fact->nombre_crtf))    $nombreReceptor    = trim($fact->nombre_crtf);
        if ($direccionReceptor === '' && !empty($fact->direccion_crtf)) $direccionReceptor = trim($fact->direccion_crtf);
        if ($correoReceptor    === '' && !empty($fact->email_crtf))     $correoReceptor    = trim($fact->email_crtf);

        // valores mínimos para pasar XSD
        if ($nombreReceptor    === '') $nombreReceptor    = 'CONSUMIDOR FINAL';
        if ($direccionReceptor === '') $direccionReceptor = 'CIUDAD';

        $Receptor = $doc->createElement('dte:Receptor');
        $Receptor->setAttribute('CorreoReceptor', $correoReceptor);
        $Receptor->setAttribute('IDReceptor', $fact->numero_crtf ?: 'CF');
        $Receptor->setAttribute('NombreReceptor', mb_substr($nombreReceptor, 0, 200));

        if (!empty($fact->tipo_especial_crtf)) {
            $Receptor->setAttribute('TipoEspecial', $fact->tipo_especial_crtf); // CUI | EXT
        }
        $DatosEmision->appendChild($Receptor);

        $dirReceptor = $doc->createElement('dte:DireccionReceptor');
        $dirReceptor->appendChild($doc->createElement('dte:Direccion', mb_substr($direccionReceptor, 0, 512)));
        $dirReceptor->appendChild($doc->createElement('dte:CodigoPostal', $cli->codigo_postal ?? '01001'));
        $dirReceptor->appendChild($doc->createElement('dte:Municipio', $cli->municipio ?? 'GUATEMALA'));
        $dirReceptor->appendChild($doc->createElement('dte:Departamento', $cli->departamento ?? 'GUATEMALA'));
        $dirReceptor->appendChild($doc->createElement('dte:Pais', 'GT'));
        $Receptor->appendChild($dirReceptor);

        // Frases
        $Frases = $doc->createElement('dte:Frases');
        $Frase = $doc->createElement('dte:Frase');
        $Frase->setAttribute('CodigoEscenario', '1');
        $Frase->setAttribute('TipoFrase', '1');
        $Frases->appendChild($Frase);
        $DatosEmision->appendChild($Frases);

        // Ítems: una única línea de ajuste
        $Items = $doc->createElement('dte:Items');
        $Item = $doc->createElement('dte:Item');
        $Item->setAttribute('BienOServicio', $bienOServicio);
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

        // Complemento Referencias Nota (siempre con datos del DTE origen)
        $Complementos = $doc->createElement('dte:Complementos');
        $Complemento = $doc->createElement('dte:Complemento');
        $Complemento->setAttribute('IDComplemento', 'Notas');
        $Complemento->setAttribute('NombreComplemento', 'Notas');
        $Complemento->setAttribute('URIComplemento', 'http://www.sat.gob.gt/fel/notas.xsd');

        $ReferenciasNota = $doc->createElementNS('http://www.sat.gob.gt/face2/ComplementoReferenciaNota/0.1.0', 'cno:ReferenciasNota');
        $ReferenciasNota->setAttribute('FechaEmisionDocumentoOrigen', Carbon::parse($fact->fecha_certificacion)->toDateString());
        $ReferenciasNota->setAttribute('MotivoAjuste', $motivo);
        $ReferenciasNota->setAttribute('NumeroAutorizacionDocumentoOrigen', $fact->uuid);
        $ReferenciasNota->setAttribute('NumeroDocumentoOrigen', $fact->numero);
        $ReferenciasNota->setAttribute('SerieDocumentoOrigen', $fact->serie);
        $ReferenciasNota->setAttribute('Version', '0.0');

        $Complemento->appendChild($ReferenciasNota);
        $Complementos->appendChild($Complemento);
        $DatosEmision->appendChild($Complementos);

        return [
            'xml'  => $doc->saveXML(),
            'meta' => [
                'idcliente'       => $cli->idcliente ?? null,
                'tipo'            => $tipo,
                'motivo'          => $motivo,
                'monto_total'     => $monto,
                'monto_gravable'  => $monto_gravable,
                'monto_impuesto'  => $monto_impuesto,
                'exento_iva'      => $exento ? 'S' : 'N',
                'receptor' => [
                    'numero'        => $fact->numero_crtf ?: 'CF',
                    'tipo'          => $fact->tipo_crtf,
                    'tipo_especial' => $fact->tipo_especial_crtf,
                    'nombre'        => $nombreReceptor,
                    'email'         => $correoReceptor,
                    'direccion'     => $direccionReceptor,
                ],
                'origen' => [
                    'uuid'          => $fact->uuid,
                    'serie'         => $fact->serie,
                    'numero'        => $fact->numero,
                    'fecha_emision' => Carbon::parse($fact->fecha_certificacion)->toDateString(),
                ],
            ],
        ];
    }
    private function enviarXMLAFEL($idcotizacion, $xmlString, $tipo, $notaMeta = null)
    {
        $identificador = Str::uuid()->toString();

        $headers = [
            'Content-Type'   => 'application/xml',
            'UsuarioApi'     => '109126599PRO',
            'LlaveApi'       => 'EC7E300DF9F5EDD673FE02342E9C4293',
            'UsuarioFirma'   => '109126599PRO',
            'LlaveFirma'     => '9bbfaf68b130aaa6b69535ac6f1ca5db',
            'Identificador'  => $identificador,
        ];

        $apiUrl = 'https://certificador.feel.com.gt/fel/procesounificado/transaccion/v2/xml';

        try {
            $response = Http::withHeaders($headers)->send('POST', $apiUrl, ['body' => $xmlString]);
            $json = $response->json() ?? [];

            // Log de la respuesta
            // Log::info('Respuesta INFILE - ' . strtoupper($tipo), [
            //     'cotizacion_id' => $idcotizacion,
            //     'identificador' => $identificador,
            //     'response'      => $json,
            // ]);

            // === Persistencia para Notas FEL ===
            if (in_array($tipo, ['NCRE', 'NDEB']) && is_array($notaMeta)) {
                $now  = now();
                $base = [
                    'idcotizacion'             => $idcotizacion,
                    'idcliente'                => $notaMeta['idcliente'] ?? null,
                    'tipo'                     => $tipo,
                    'motivo'                   => $notaMeta['motivo'] ?? '',
                    'monto_total'              => $notaMeta['monto_total'] ?? 0,
                    'monto_gravable'           => $notaMeta['monto_gravable'] ?? 0,
                    'monto_impuesto'           => $notaMeta['monto_impuesto'] ?? 0,
                    'exento_iva'               => $notaMeta['exento_iva'] ?? 'N',
                    'receptor_numero'          => $notaMeta['receptor']['numero'] ?? null,
                    'receptor_tipo'            => $notaMeta['receptor']['tipo'] ?? null,
                    'receptor_tipo_especial'   => $notaMeta['receptor']['tipo_especial'] ?? null,
                    'receptor_nombre'          => $notaMeta['receptor']['nombre'] ?? null,
                    'receptor_email'           => $notaMeta['receptor']['email'] ?? null,
                    'receptor_direccion'       => $notaMeta['receptor']['direccion'] ?? null,
                    // 👇 Datos del DOCUMENTO ORIGEN (factura)
                    'uuid_origen'              => $notaMeta['origen']['uuid'] ?? null,
                    'serie_origen'             => $notaMeta['origen']['serie'] ?? null,
                    'numero_origen'            => $notaMeta['origen']['numero'] ?? null,
                    'fecha_emision_origen'     => $notaMeta['origen']['fecha_emision'] ?? $now->toDateString(),

                    'identificador'            => $identificador,
                    'xml_enviado'              => $xmlString,
                    'created_by'               => optional(auth()->user())->id,
                    'created_at'               => $now,
                    'updated_at'               => $now,
                ];

                if (($json['resultado'] ?? false) === true) {
                    // ✅ Campos de la NOTA certificada
                    $save = array_merge($base, [
                        'resultado'        => 'S',
                        'uuid_nota'        => $json['uuid']  ?? null,
                        'serie_nota'       => $json['serie'] ?? null,
                        'numero_nota'      => $json['numero'] ?? null,
                        'fecha_nota'       => $json['fecha'] ?? null,
                        'descripcion'      => $json['descripcion'] ?? null,
                        'xml_certificado'  => isset($json['xml_certificado'])
                            ? base64_encode($json['xml_certificado'])
                            : null,
                        'alertas_infile'   => isset($json['descripcion_alertas_infile'])
                            ? json_encode($json['descripcion_alertas_infile'], JSON_UNESCAPED_UNICODE)
                            : null,
                        'alertas_sat'      => isset($json['descripcion_alertas_sat'])
                            ? json_encode($json['descripcion_alertas_sat'], JSON_UNESCAPED_UNICODE)
                            : null,
                        'errores'          => null,
                    ]);
                } else {
                    // ❌ Falla: conserva origen y deja los campos de nota en null
                    $save = array_merge($base, [
                        'resultado'        => 'N',
                        'uuid_nota'        => null,
                        'serie_nota'       => null,
                        'numero_nota'      => null,
                        'fecha_nota'       => null,
                        'descripcion'      => $json['descripcion'] ?? null,
                        'xml_certificado'  => null,
                        'alertas_infile'   => isset($json['descripcion_alertas_infile'])
                            ? json_encode($json['descripcion_alertas_infile'], JSON_UNESCAPED_UNICODE)
                            : null,
                        'alertas_sat'      => isset($json['descripcion_alertas_sat'])
                            ? json_encode($json['descripcion_alertas_sat'], JSON_UNESCAPED_UNICODE)
                            : null,
                        'errores'          => isset($json['descripcion_errores'])
                            ? json_encode($json['descripcion_errores'], JSON_UNESCAPED_UNICODE)
                            : json_encode(['Error desconocido'], JSON_UNESCAPED_UNICODE),
                    ]);
                }

                DB::table('adm_notas_fel')->insert($save);
            }

            // === Respuesta HTTP al frontend (igual que antes)
            if (($json['resultado'] ?? false) === true) {
                return response()->json([
                    'resultado'            => true,
                    'uuid'                 => $json['uuid'] ?? null,
                    'serie'                => $json['serie'] ?? null,
                    'numero'               => $json['numero'] ?? null,
                    'descripcion'          => $json['descripcion'] ?? null,
                    'fecha_certificacion'  => $json['fecha'] ?? null,
                    'xml_certificado'      => isset($json['xml_certificado']) ? base64_encode($json['xml_certificado']) : null,
                    'alertas'              => $json['descripcion_alertas_infile'] ?? null,
                ]);
            }

            return $this->respuestaErrorNota($tipo, $json, 422);
        } catch (\Exception $e) {
            Log::error('Error al certificar XML tipo ' . $tipo, [
                'cotizacion_id' => $idcotizacion,
                'exception'     => $e->getMessage(),
            ]);

            // Guarda intento fallido también
            if (in_array($tipo, ['NCRE', 'NDEB']) && is_array($notaMeta ?? null)) {
                DB::table('adm_notas_fel')->insert([
                    'idcotizacion'             => $idcotizacion,
                    'idcliente'                => $notaMeta['idcliente'] ?? null,
                    'tipo'                     => $tipo,
                    'motivo'                   => $notaMeta['motivo'] ?? '',
                    'monto_total'              => $notaMeta['monto_total'] ?? 0,
                    'monto_gravable'           => $notaMeta['monto_gravable'] ?? 0,
                    'monto_impuesto'           => $notaMeta['monto_impuesto'] ?? 0,
                    'exento_iva'               => $notaMeta['exento_iva'] ?? 'N',
                    'receptor_numero'          => $notaMeta['receptor']['numero'] ?? null,
                    'receptor_tipo'            => $notaMeta['receptor']['tipo'] ?? null,
                    'receptor_tipo_especial'   => $notaMeta['receptor']['tipo_especial'] ?? null,
                    'receptor_nombre'          => $notaMeta['receptor']['nombre'] ?? null,
                    'receptor_email'           => $notaMeta['receptor']['email'] ?? null,
                    'receptor_direccion'       => $notaMeta['receptor']['direccion'] ?? null,

                    // Origen intacto
                    'uuid_origen'              => $notaMeta['origen']['uuid'] ?? null,
                    'serie_origen'             => $notaMeta['origen']['serie'] ?? null,
                    'numero_origen'            => $notaMeta['origen']['numero'] ?? null,
                    'fecha_emision_origen'     => $notaMeta['origen']['fecha_emision'] ?? now()->toDateString(),

                    // Nota fallida (sin datos de nota)
                    'resultado'                => 'N',
                    'uuid_nota'                => null,
                    'serie_nota'               => null,
                    'numero_nota'              => null,
                    'fecha_nota'               => null,

                    'errores'                  => json_encode([$e->getMessage()], JSON_UNESCAPED_UNICODE),
                    'identificador'            => $identificador,
                    'xml_enviado'              => $xmlString,
                    'created_by'               => optional(auth()->user())->id,
                    'created_at'               => now(),
                    'updated_at'               => now(),
                ]);
            }

            return $this->respuestaErrorNota($tipo, [
                'descripcion'          => 'Excepción en servidor',
                'descripcion_errores'  => [$e->getMessage()],
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
            ->selectRaw("
            nf.idnota,
            nf.idcotizacion,
            nf.tipo,
            nf.motivo,
            nf.monto_total  as monto,
            nf.monto_gravable,
            nf.monto_impuesto,
            nf.exento_iva,

            -- receptor (foto de la certificación de la nota)
            nf.receptor_nombre    as cliente,
            nf.receptor_numero    as receptor_numero,
            nf.receptor_direccion as direccion,

            -- ⚠️ AHORA tomamos los campos de la NOTA (no los de origen)
            nf.uuid_nota,
            nf.serie_nota,
            nf.numero_nota,
            DATE(COALESCE(nf.fecha_nota, nf.created_at)) as fecha_nota,

            -- Referencia a la factura de origen (usamos lo que guardamos en la nota)
            nf.uuid_origen        as uuid_factura,
            nf.serie_origen       as serie_factura,
            nf.numero_origen      as numero_factura,
            DATE(nf.fecha_emision_origen) as fecha_factura
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
            ->selectRaw("
            nf.idnota,
            nf.idcotizacion,
            nf.tipo,
            nf.motivo,
            nf.monto_total  as monto,
            nf.monto_gravable,
            nf.monto_impuesto,
            nf.exento_iva,

            -- receptor
            nf.receptor_nombre    as cliente,
            nf.receptor_numero    as receptor_numero,
            nf.receptor_direccion as direccion,

            -- ⚠️ datos de la NOTA certificada
            nf.uuid_nota,
            nf.serie_nota,
            nf.numero_nota,
            DATE(COALESCE(nf.fecha_nota, nf.created_at)) as fecha_nota,

            -- referencia a FACTURA origen (desde lo que persistimos en nf.*_origen)
            nf.serie_origen       as serie_factura,
            nf.numero_origen      as numero_factura,
            nf.uuid_origen        as uuid_factura,
            DATE(nf.fecha_emision_origen) as fecha_factura
        ")
            ->where('nf.idnota', $idnota)
            ->first();

        if (!$nota) {
            return response()->json(['message' => 'Nota no encontrada'], 404);
        }

        // Datos de tu empresa
        $empresa = [
            'nombre'     => 'GP EXCELENCIA, S.A.',
            'nit'        => '109126599',
            'direccion'  => '11 calle 41-20 Aldea El Naranjito, Zona 6 de Mixco, Guatemala',
            'telefonos'  => '2309-9419 / 2294-9257',
            'email'      => 'ventas@gpexcelencia.com',
            'web'        => 'www.gpexcelencia.com',
        ];

        $html = view('pdf.nota_fel', [
            'nota'      => $nota,
            'empresa'   => $empresa,
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

    public function storeComentario(Request $request)
    {
        try {
            DB::beginTransaction();

            $request->validate([
                'idcotizacion' => 'required|integer|exists:adm_cotizacion,idcotizacion',
                'comentario'   => 'required|string|max:1000',
            ]);

            // correlativo seguro
            $correlativo = DB::table('cor_correlativo')
                ->where('tabla', 'adm_comentarios_prefacturacion')
                ->lockForUpdate()->first();

            if (!$correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para comentarios'], 400);
            }

            $idComentario = $correlativo->correlativo + $correlativo->incremento;

            DB::table('cor_correlativo')
                ->where('tabla', 'adm_comentarios_prefacturacion')
                ->update(['correlativo' => $idComentario]);

            $comentario = new ComentarioPreFacturacion();
            $comentario->idcomentarioprefacturacion = $idComentario;
            $comentario->idcotizacion     = $request->idcotizacion;
            $comentario->comentario       = $request->comentario;
            $comentario->fecha_registro   = now();
            $comentario->idusuario        = auth()->id();
            $comentario->estado           = 1;
            $comentario->save();

            DB::commit();

            return response()->json([
                'message'   => 'Comentario registrado exitosamente',
                'comentario' => $comentario,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al guardar comentario: ' . $e->getMessage()
            ], 500);
        }
    }

    public function comentarios(Request $request, $idcotizacion)
    {
        $query = ComentarioPreFacturacion::query()
            ->select('adm_comentarios_prefacturacion.*', 'adm_empleados.nombre as nombre_usuario')
            ->leftJoin('adm_empleados', 'adm_empleados.iduser', '=', 'adm_comentarios_prefacturacion.idusuario')
            ->where('adm_comentarios_prefacturacion.idcotizacion', $idcotizacion)
            ->orderByDesc('adm_comentarios_prefacturacion.fecha_registro');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('adm_comentarios_prefacturacion.comentario', 'LIKE', "%{$search}%");
        }

        $comentarios = $query->paginate(5);
        return response()->json($comentarios);
    }

    public function anularCotizacion(Request $request, $idcotizacion)
    {
        try {
            $cotizacion = DB::table('adm_cotizacion')->where('idcotizacion', $idcotizacion)->first();

            if (!$cotizacion) {
                return response()->json(['message' => 'Cotización no encontrada'], 404);
            }

            // Solo permitir anular estados 4 (Pre-facturación) o 5 (Para facturar)
            if (!in_array($cotizacion->estado, [4, 5])) {
                return response()->json(['message' => 'Solo se pueden anular cotizaciones en estado 4 o 5'], 400);
            }

            $motivo = trim($request->input('motivo'));
            if (empty($motivo)) {
                return response()->json(['message' => 'Debe ingresar un motivo de anulación'], 422);
            }

            $usuario = auth()->user()->name ?? 'sistema';

            DB::table('adm_cotizacion')
                ->where('idcotizacion', $idcotizacion)
                ->update([
                    'estado' => 0,
                    'motivo_anulacion' => $motivo,
                    'usuario_anulacion' => $usuario,
                    'fecha_anulacion' => now(),
                ]);

            return response()->json(['message' => 'Cotización anulada correctamente']);
        } catch (\Throwable $e) {
            Log::error('Error al anular cotización', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error al anular cotización'], 500);
        }
    }

    public function reporteAnuladas(Request $request)
    {
        $fechaInicio = $request->query('fechaInicio');
        $fechaFinal  = $request->query('fechaFinal');
        $format      = $request->query('format', 'json');

        $end   = $fechaFinal  ? Carbon::parse($fechaFinal)  : Carbon::today();
        $start = $fechaInicio ? Carbon::parse($fechaInicio) : $end->copy();

        $desde = $start->copy()->startOfDay()->toDateTimeString();
        $hasta = $end->copy()->addDay()->startOfDay()->toDateTimeString();

        // 🔹 Datos base
        $registros = DB::table('adm_facturacion as f')
            ->join('adm_cotizacion as c', 'c.idcotizacion', '=', 'f.idcotizacion')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->leftJoin('users as u', 'f.idusuario_anula', '=', 'u.id')
            ->leftJoin('adm_empleados as e', 'u.id', '=', 'e.iduser')
            ->select([
                DB::raw("CONCAT('CT', CAST(c.nocotizacion AS CHAR)) AS nocotizacion"),
                'cl.nombre AS cliente',
                DB::raw('f.nofactura AS nointerno'),
                'f.numero',
                'f.uuid',
                DB::raw("DATE_FORMAT(f.fecha_certificacion, '%Y-%m-%d %H:%i:%s') AS fecha_certificacion"),
                DB::raw("DATE_FORMAT(f.fecha_anulacion, '%Y-%m-%d %H:%i:%s') AS fecha_anulacion"),
                DB::raw("COALESCE(e.nombre, '—') AS usuario_anulacion"),
            ])
            ->where('f.estado', 0)
            ->whereBetween('f.fecha_anulacion', [$desde, $hasta])
            ->orderByDesc('f.fecha_anulacion')
            ->get();


        // 🔹 Totales por usuario
        $porUsuario = $registros->groupBy('usuario_anulacion')->map(function ($items, $usuario) {
            return [
                'usuario' => $usuario,
                'total' => $items->count(),
            ];
        })->values();

        $totalGeneral = $registros->count();

        // 🔹 Formato PDF
        if ($format === 'pdf') {
            $pdf = Pdf::loadView('pdf.reporte_anuladas', [
                'registros'     => $registros,
                'porUsuario'    => $porUsuario,
                'totalGeneral'  => $totalGeneral,
                'fechaInicio'   => $start->format('Y-m-d'),
                'fechaFinal'    => $end->format('Y-m-d'),
            ])->setPaper('letter', 'landscape');

            return $pdf->download("reporte_facturas_anuladas_{$start->format('Ymd')}_{$end->format('Ymd')}.pdf");
        }

        // 🔹 Formato JSON
        return response()->json([
            'registros'     => $registros,
            'porUsuario'    => $porUsuario,
            'totalGeneral'  => $totalGeneral,
        ]);
    }

    public function reporteNotasAjuste(Request $request)
    {
        $fechaInicio = $request->query('fechaInicio');
        $fechaFinal  = $request->query('fechaFinal');
        $tipo        = $request->query('tipo'); // NCRE | NDEB | TODOS
        $format      = $request->query('format', 'json');

        $end   = $fechaFinal  ? Carbon::parse($fechaFinal)  : Carbon::today();
        $start = $fechaInicio ? Carbon::parse($fechaInicio) : $end->copy();

        $desde = $start->copy()->startOfDay()->toDateTimeString();
        $hasta = $end->copy()->addDay()->startOfDay()->toDateTimeString();

        // 🔹 Datos base
        $query = DB::table('adm_notas_fel as n')
            ->join('adm_cotizacion as c', 'n.idcotizacion', '=', 'c.idcotizacion')
            ->join('adm_facturacion as f', 'c.idcotizacion', '=', 'f.idcotizacion')
            ->join('clientes as cl', 'n.idcliente', '=', 'cl.idcliente')
            ->select([
                DB::raw("CONCAT('CT', CAST(c.nocotizacion AS CHAR)) AS nocotizacion"),
                'cl.nombre AS cliente',
                DB::raw('f.nofactura AS nointerno'),
                'f.numero AS numero_factura',
                DB::raw("DATE_FORMAT(f.fecha_certificacion, '%Y-%m-%d %H:%i:%s') AS fecha_certificacion"),
                'n.tipo AS tipo_nota',
                'n.numero_nota',
                DB::raw("DATE_FORMAT(n.fecha_nota, '%Y-%m-%d %H:%i:%s') AS fecha_nota"),
                DB::raw('CAST(n.monto_total AS DECIMAL(15,2)) AS monto_total'),
            ])
            ->where('n.resultado', 'S')
            ->whereBetween('n.fecha_nota', [$desde, $hasta]);

        if (!empty($tipo) && $tipo !== 'TODOS') {
            $query->where('n.tipo', $tipo); // filtra por NCRE o NDEB
        }

        $registros = $query->orderByDesc('n.fecha_nota')->get();

        // 🔹 Totales por tipo
        $porTipo = $registros->groupBy('tipo_nota')->map(function ($items, $tipo) {
            return [
                'tipo' => $tipo,
                'total' => $items->count(),
                'monto' => $items->sum('monto_total'),
            ];
        })->values();

        $totalGeneral = $registros->count();
        $sumaGeneral  = $registros->sum('monto_total');

        // 🔹 Formato PDF
        if ($format === 'pdf') {
            $pdf = Pdf::loadView('pdf.reporte_notasajuste', [
                'registros'     => $registros,
                'porTipo'       => $porTipo,
                'totalGeneral'  => $totalGeneral,
                'sumaGeneral'   => $sumaGeneral,
                'fechaInicio'   => $start->format('Y-m-d'),
                'fechaFinal'    => $end->format('Y-m-d'),
                'tipo'          => $tipo ?? 'TODOS',
            ])->setPaper('letter', 'landscape');

            return $pdf->download("reporte_notas_ajuste_{$start->format('Ymd')}_{$end->format('Ymd')}.pdf");
        }

        // 🔹 Formato JSON
        return response()->json([
            'registros'     => $registros,
            'porTipo'       => $porTipo,
            'totalGeneral'  => $totalGeneral,
            'sumaGeneral'   => $sumaGeneral,
        ]);
    }
}
