<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AdmCotizacion;
use App\Models\AdmDetalleCotizacion;
use NumberToWords\NumberToWords;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class MonitorFacturacionController extends Controller
{
    public function index()
    {
        $query = AdmCotizacion::where('c.estado', 3)
            ->select(
                'c.idcotizacion',
                DB::raw('CONCAT(\'CT\',CAST(c.nocotizacion AS CHAR)) as nocotizacion'),
                'c.fecha_cotizacion',
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
            )
            ->from('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago');

        $cotizaciones = $query->get();
        return response()->json($cotizaciones);
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
                'cl.nit as nit', // Asegúrate de tener este campo en tu tabla Clientes
                'ct.nombre as contacto',
                'e.nombre as vendedor',                 // Asegúrate de tener este campo en tu tabla (o relación)
                'e.movil as telefono_vendedor',         // Ajusta según tu estructura
                'e.correo_personal as correo_vendedor', // Ajusta según tu estructura
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
        return response()->json(['cotizacion' => $cotizacion, 'totalEnLetras' => $totalEnLetras]);
    }

    public function desactivar($id)
    {
        $cotizacion = AdmCotizacion::find($id);
        if (! $cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $cotizacion->estado = 1;
        $cotizacion->save();

        return response()->json(['message' => 'Cotización desactivada']);
    }

    public function generarXMLFactura($idcotizacion)
    {
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
            date(c.fecha_registro) as fecha_vencimiento
        FROM adm_cotizacion c 
        JOIN adm_detalle_cotizacion d on c.idcotizacion = d.idcotizacion 
        JOIN clientes cl on c.idcliente = cl.idcliente
        JOIN adm_municipio m on cl.id_municipio = m.id_municipio
        JOIN adm_departamentopais dp on cl.iddepartamento = dp.iddepartamentopais
        WHERE d.estado = 1 
        AND d.idcotizacion = ?
    ", [$idcotizacion]);

        if (empty($detalles)) {
            return response()->json(['error' => 'Cotización no encontrada'], 404);
        }

        $detalle = $detalles[0];

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
        $Emisor->setAttribute('NombreComercial', 'GP Excelencia S.A.');
        $Emisor->setAttribute('NITEmisor', '11201359K');
        $Emisor->setAttribute('NombreEmisor', 'GP Excelencia S.A.');
        $DatosEmision->appendChild($Emisor);

        $dirEmisor = $doc->createElement('dte:DireccionEmisor');
        $Emisor->appendChild($dirEmisor);
        $dirEmisor->appendChild($doc->createElement('dte:Direccion', 'Zona 1'));
        $dirEmisor->appendChild($doc->createElement('dte:CodigoPostal', '01001'));
        $dirEmisor->appendChild($doc->createElement('dte:Municipio', 'Guatemala'));
        $dirEmisor->appendChild($doc->createElement('dte:Departamento', 'Guatemala'));
        $dirEmisor->appendChild($doc->createElement('dte:Pais', 'GT'));

        $Receptor = $doc->createElement('dte:Receptor');
        $Receptor->setAttribute('CorreoReceptor', $detalle->correo ?? '');
        $Receptor->setAttribute('IDReceptor', $detalle->nit);
        $Receptor->setAttribute('NombreReceptor', $detalle->nombre);
        $DatosEmision->appendChild($Receptor);

        $dirReceptor = $doc->createElement('dte:DireccionReceptor');
        $Receptor->appendChild($dirReceptor);
        $dirReceptor->appendChild($doc->createElement('dte:Direccion', $detalle->direccion));
        $dirReceptor->appendChild($doc->createElement('dte:CodigoPostal', $detalle->codigo_postal ?? '01001'));
        $dirReceptor->appendChild($doc->createElement('dte:Municipio', $detalle->municipio));
        $dirReceptor->appendChild($doc->createElement('dte:Departamento', $detalle->departamento));
        $dirReceptor->appendChild($doc->createElement('dte:Pais', $detalle->pais));

        $Frases = $doc->createElement('dte:Frases');
        $DatosEmision->appendChild($Frases);
        $Frase = $doc->createElement('dte:Frase');
        $Frase->setAttribute('CodigoEscenario', '1');
        $Frase->setAttribute('TipoFrase', '1');
        $Frases->appendChild($Frase);

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
            $Impuesto->appendChild($doc->createElement('dte:MontoGravable', number_format($d->monto_gravable, 3, '.', '')));
            $Impuesto->appendChild($doc->createElement('dte:MontoImpuesto', number_format($d->monto_impuesto, 3, '.', '')));
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

        $sumaImpuestos = array_sum(array_column($detalles, 'monto_impuesto'));
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

        // URL del proveedor o SAT a donde enviarás el XML
        $apiUrl = 'https://certificador.feel.com.gt/fel/procesounificado/transaccion/v2/xml'; // ← cambia esta URL por la real

        // Aquí puedes agregar cualquier encabezado requerido por el API
        $identificador = Str::uuid()->toString(); // Genera un UUID único para cada solicitud
        $headers = [
            'Content-Type' => 'application/xml',
            'UsuarioApi' => 'DEMO_GP',
            'LlaveApi' => '49D7ADECD323FC85C417223AB706094D',
            'UsuarioFirma' => 'DEMO_GP',
            'LlaveFirma' => '41841aff97e60b3400cd9968097ba13d',
            'Identificador' => $identificador,
        ];

        try {
            $response = Http::withHeaders($headers)->send('POST', $apiUrl, [
                'body' => $xmlString,
            ]);

            $json = $response->json();

            //Se graba en la base de datos la respuesta del SAT
            $cotizacion = AdmCotizacion::find($idcotizacion);
            if ($cotizacion) {
                if ($response->successful() && isset($json['resultado']) && $json['resultado'] === true) {
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
                    ]);
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
                    'errores' => $json['descripcion_errores'],
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

    public function generarImpresionFactura($id)
    {
        $cotizacion = AdmCotizacion::where('c.idcotizacion', $id)
            ->select(
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
            )
            ->from('adm_cotizacion as c')
            ->join('adm_detalle_cotizacion as d', 'c.idcotizacion', '=', 'd.idcotizacion')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->first();

        if (! $cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        // $detalles                     = AdmDetalleCotizacion::where('idcotizacion', $id)->get();
        // $cotizacion->detalles         = $detalles;
        // $cotizacion->fecha_cotizacion = date('Y-m-d', strtotime($cotizacion->fecha_cotizacion)); // Formatea la fecha

        // Convertir total a letras (usando kwn/number-to-words)
        $numberToWords     = new NumberToWords();
        $numberTransformer = $numberToWords->getNumberTransformer('es');
        $totalEnLetras = $this->convertirNumeroALetrasConCentavos($cotizacion->total);

        $detalles = AdmDetalleCotizacion::where('idcotizacion', $id)->get();

        // $pdf = Pdf::loadView('pdf.cotizacion', compact('cotizacion', 'totalEnLetras'));
        // return $pdf->download('cotizacion-' . $cotizacion->nocotizacion . '.pdf');
        // return response()->json([
        //     'cotizacion'    => $cotizacion,
        //     'totalEnLetras' => $totalEnLetras,
        // ]);
        $pdf = Pdf::loadView('pdf.factura', compact('cotizacion', 'totalEnLetras','detalles'));
        //return $pdf->download('factura-' . $cotizacion->serie . '-' . $cotizacion->numero . '.pdf');
        return $pdf->stream('factura-' . $cotizacion->serie . '-' . $cotizacion->numero . '.pdf');
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
}
