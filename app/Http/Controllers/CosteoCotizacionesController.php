<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AdmCotizacion;
use App\Models\AdmDetalleCotizacion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth; // <-- Importar Log si quieres registrar errores detallados
use NumberToWords\NumberToWords;

class CosteoCotizacionesController extends Controller
{
    public function index(Request $request)
    {
        $user              = Auth::user();              // Obtiene el usuario autenticado
        $cotizacionesTodas = $user->cotizaciones_todas; // Obtiene el valor de cotizaciones_todas

        $query = AdmCotizacion::query()
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
                //'c.idtipopago',
                'c.estado',
                'c.archivo_costeo'
            )
            ->from('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago');            
                                            
        $query->where('c.estado', '!=', 0); // Estado diferente de 0 por defecto
                                            //}

        // Filtro por rango de fechas
        if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
            $query->whereBetween('c.fecha_cotizacion', [$request->fecha_inicio, $request->fecha_fin]);
        } elseif ($request->has('fecha_inicio')) {
            $query->where('c.fecha_cotizacion', '>=', $request->fecha_inicio);
        } elseif ($request->has('fecha_fin')) {
            $query->where('c.fecha_cotizacion', '<=', $request->fecha_fin);
        }

        // Aplica el filtro condicional basado en cotizaciones_todas
        if ($cotizacionesTodas == 'N') {
            $query->where('c.idusuario', $user->id); // Filtra por el usuario logueado
        }

        $cotizaciones = $query->orderBy('c.nocotizacion', 'desc')->get();
        //$cotizaciones = $query->get();
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

        $detalles                     = AdmDetalleCotizacion::where('idcotizacion', $id)->get();
        $cotizacion->detalles         = $detalles;
        $cotizacion->fecha_cotizacion = date('Y-m-d', strtotime($cotizacion->fecha_cotizacion)); // Formatea la fecha

        // Convertir total a letras (usando kwn/number-to-words)
        $numberToWords     = new NumberToWords();
        $numberTransformer = $numberToWords->getNumberTransformer('es');
        $totalEnLetras     = $numberTransformer->toWords($cotizacion->total_general); // no es necesario multiplicar por 100

        // $pdf = Pdf::loadView('pdf.cotizacion', compact('cotizacion', 'totalEnLetras'));
        // return $pdf->download('cotizacion-' . $cotizacion->nocotizacion . '.pdf');
        return response()->json([
            'cotizacion'    => $cotizacion,
            'totalEnLetras' => $totalEnLetras,
        ]);
    }
}
