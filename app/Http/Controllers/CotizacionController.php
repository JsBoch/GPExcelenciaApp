<?php
namespace App\Http\Controllers;

use App\Models\AdmCotizacion;
use App\Models\AdmDetalleCotizacion;
use App\Models\AdmTipoPago;
use App\Models\AdmUnidadMedida;
use App\Models\Clientes;
use App\Models\ContactoCliente;
use App\Models\Correlativo;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; // <-- Importar Log si quieres registrar errores detallados
use Illuminate\Support\Facades\Log;
use NumberToWords\NumberToWords;
class CotizacionController extends Controller
{
    public function index()
    {
        $cotizaciones = AdmCotizacion::where('c.estado', 1)
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
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->get();
        return response()->json($cotizaciones);
    }

    public function store(Request $request)
    {        
        try {
            DB::beginTransaction();

            $correlativo = Correlativo::find('adm_cotizacion');

            if (! $correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para cotizacion'], 400);
            }

            $idCotizacion             = $correlativo->correlativo + $correlativo->incremento;
            $correlativo->correlativo = $idCotizacion;
            $correlativo->save();

            $correlativonocotizacion = Correlativo::find('no_cotizacion');
            if (! $correlativonocotizacion) {
                return response()->json(['message' => 'No se encontró el correlativo para el no de cotizacion'], 400);
            }

            $nocotizacion = $correlativonocotizacion->correlativo + $correlativonocotizacion->incremento;
            $correlativonocotizacion->correlativo = $nocotizacion;
            $correlativonocotizacion->save();
            
            $datosCotizacion                     = $request->all();
            $datosCotizacion['idcotizacion']     = $idCotizacion;
            $datosCotizacion['nocotizacion']     = $nocotizacion;
            $datosCotizacion['usuario_registro'] = auth()->user()->name;
            $datosCotizacion['fecha_registro']   = date('Y-m-d H:i:s');
            $datosCotizacion['estado']           = 1;
            $datosCotizacion['idusuario']        = auth()->user()->id;

            $cotizacion = AdmCotizacion::create($datosCotizacion);

            // Guardar detalles de la cotización

            $correlativoDetalle = Correlativo::find('adm_detalle_cotizacion');

            if (! $correlativoDetalle) {
                return response()->json(['message' => 'No se encontró el correlativo para el detalle de cotizacion'], 400);
            }

            $detalles = $request->input('detalles', []); // Asegúrate de que el frontend envíe los detalles como 'detalles'
            if (! is_array($detalles)) {
                Log::error('Los detalles no son un array: ' . print_r($detalles, true));
                DB::rollback();
                return response()->json(['message' => 'Error: Los detalles deben ser un array'], 500);
            }

            $idDetalleCotizacion = $correlativoDetalle->correlativo + $correlativoDetalle->incremento;

            foreach ($detalles as $detalle) {
                AdmDetalleCotizacion::create([
                    'iddetallecotizacion' => $idDetalleCotizacion,
                    'idcotizacion'        => $idCotizacion,
                    'idproducto'          => 0,
                    'producto'            => $detalle['descripcion'], // Asegúrate de que el nombre del campo coincida
                    'titulo'              => '',
                    'descripcion'         => $detalle['descripcion'],
                    'cantidad'            => $detalle['cantidad'],
                    'ancho'               => $detalle['ancho'],
                    'alto'                => $detalle['alto'],
                    'profundidad'         => $detalle['profundidad'],
                    'precio'              => $detalle['precio'],
                    'total'               => $detalle['total'],
                    'fecha_registro'      => date('Y-m-d H:i:s'),
                    'usuario_registro'    => auth()->user()->name,
                    'costeado'            => 'N',
                    'incluyefoto'         => 'N',
                    'estado'              => 1,
                    'unidad_medida'       => $detalle['unidad_medida'],
                    'm2'                  => $detalle['m2'],
                ]);

                $idDetalleCotizacion += 1;
            }

            $correlativoDetalle->correlativo = $idDetalleCotizacion;
            $correlativoDetalle->save();

            DB::commit();

            return response()->json($cotizacion, 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['message' => 'Error al crear la cotización: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $cotizaciones = AdmCotizacion::where('c.idcotizacion', $id)
            ->select(
                'c.idcotizacionoriginal',
                'c.idcotizacion',
                'c.idcliente',
                'cl.nombre as cliente',
                'c.idcontacto',
                'ct.nombre as contacto',
                'c.fecha_cotizacion',
                'c.trabajo',
                'c.observaciones_costeo',
                'c.observaciones_cliente',
                'c.total_general',
                'c.costeo_observaciones',
                'c.nocotizacion',
                'c.version',
                'c.idtipopago',
                't.tipo as tipo_pago',
                'c.direccion_entrega',
                'c.costear',
                'c.total_general',
            )
            ->from('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->first();
        if (! $cotizaciones) {
            return response()->json(['message' => 'No se encontró el registro de la cotización'], 404);
        }
        // Obtener los detalles de la cotización
        $detalles = AdmDetalleCotizacion::where('idcotizacion', $id)->get();

        // Agregar los detalles a la respuesta
        $cotizaciones->detalles = $detalles;

        return response()->json($cotizaciones);
    }

    public function update(Request $request, $id)
    {
        // Iniciar transacción para asegurar atomicidad
        DB::beginTransaction();
        try {
            // 1. Encontrar y actualizar la cotización principal
            $cotizacion = AdmCotizacion::find($id);
            if (! $cotizacion) {
                DB::rollback(); // Revertir si no se encuentra
                return response()->json(['message' => 'Cotización no encontrada'], 404);
            }

            // Obtener todos los datos, incluyendo los detalles
            $datosCotizacion = $request->all();

            // Excluir 'detalles' del array para la actualización de la cabecera
            $datosCabecera = $request->except('detalles');

            // Añadir campos de auditoría para la cabecera
            $datosCabecera['usuario_modificacion'] = auth()->user()->name;
            $datosCabecera['fecha_modificacion']   = now(); // Usar now() es más conveniente
                                                            // Quitar la línea de estado si no la envías o quieres mantener la existente
                                                            // $datosCabecera['estado'] = $datosCotizacion['estado'] ?? $cotizacion->estado; // Mantiene estado si no viene, o usa el de la BD

            $cotizacion->update($datosCabecera);

            // 2. Eliminar los detalles existentes para esta cotización
            // Es importante hacer esto DENTRO de la transacción
            AdmDetalleCotizacion::where('idcotizacion', $id)->delete();

                                                         // 3. Obtener y procesar los nuevos detalles (como en store)
            $detalles = $request->input('detalles', []); // Asegúrate de que el frontend envíe los detalles como 'detalles'

            if (! empty($detalles)) { // Solo procesar si hay detalles
                                         // Obtener el correlativo para los detalles (igual que en store)
                $correlativoDetalle = Correlativo::find('adm_detalle_cotizacion');
                if (! $correlativoDetalle) {
                    DB::rollback();
                                                                                                                                  // Log::error('No se encontró el correlativo para adm_detalle_cotizacion'); // Opcional: Loguear el error
                    return response()->json(['message' => 'No se encontró el correlativo para el detalle de cotización'], 500); // Error 500 porque es un problema de configuración/BD
                }

                // Determinar el siguiente ID disponible basado en el correlativo actual
                // Asumimos que 'correlativo' guarda el ÚLTIMO ID usado. El siguiente es + incremento.
                $idDetalleCotizacion = $correlativoDetalle->correlativo + $correlativoDetalle->incremento;
                $ultimoIdUsado       = $correlativoDetalle->correlativo; // Guardamos el último ID antes de empezar

                foreach ($detalles as $detalle) {
                    // Validar que los campos necesarios existan en $detalle, si no, usar null o valor por defecto
                    AdmDetalleCotizacion::create([
                        'iddetallecotizacion' => $idDetalleCotizacion,
                        'idcotizacion'        => $id,                                                        // Usar el $id de la cotización que estamos actualizando
                        'idproducto'          => $detalle['idproducto'] ?? 0,                                // Usar ?? para valores por defecto si no vienen
                        'producto'            => $detalle['producto'] ?? ($detalle['descripcion'] ?? 'N/A'), // Asigna producto o descripción
                        'titulo'              => $detalle['titulo'] ?? '',
                        'descripcion'         => $detalle['descripcion'] ?? '',
                        'cantidad'            => $detalle['cantidad'] ?? 0,
                        'ancho'               => $detalle['ancho'] ?? 0,
                        'alto'                => $detalle['alto'] ?? 0,
                        'profundidad'         => $detalle['profundidad'] ?? 0,
                        'precio'              => $detalle['precio'] ?? 0,
                        'total'               => $detalle['total'] ?? 0,
                        'fecha_registro'      => now(), // Usar now() para la fecha actual
                        'usuario_registro'    => auth()->user()->name,
                        'costeado'            => $detalle['costeado'] ?? 'N',
                        'incluyefoto'         => $detalle['incluyefoto'] ?? 'N',
                        'estado'              => $detalle['estado'] ?? 1,
                        'unidad_medida'       => $detalle['unidad_medida'] ?? null,
                        'm2'                  => $detalle['m2'] ?? 0,
                    ]);

                    $ultimoIdUsado = $idDetalleCotizacion;                   // Actualizar el último ID que acabamos de usar
                    $idDetalleCotizacion += $correlativoDetalle->incremento; // Incrementar para el siguiente ciclo
                }

                // Actualizar el correlativo con el ÚLTIMO ID que se usó
                $correlativoDetalle->correlativo = $ultimoIdUsado;
                $correlativoDetalle->save();
            }

            // Si todo fue bien, confirmar la transacción
            DB::commit();

                                           // Devolver la cotización actualizada (quizás con los detalles recién guardados?)
                                           // Para devolverla con detalles, necesitas volver a cargar la relación
            $cotizacion->load('detalles'); // Asume que tienes definida la relación 'detalles' en el modelo AdmCotizacion

            return response()->json($cotizacion);

        } catch (\Exception $e) {
            // Si algo falla, revertir la transacción
            DB::rollback();
            Log::error('Error al actualizar la cotización ID ' . $id . ': ' . $e->getMessage()); // Loguear el error para depuración
            return response()->json(['message' => 'Error al actualizar la cotización: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $cotizacion = AdmCotizacion::find($id);
        if (! $cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $cotizacion->delete();
        AdmDetalleCotizacion::where('idcotizacion', $id)->delete();

        return response()->json(['message' => 'Cotización eliminada']);
    }

    public function desactivar($id)
    {
        $cotizacion = AdmCotizacion::find($id);
        if (! $cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $cotizacion->estado = 0;
        $cotizacion->save();

        return response()->json(['message' => 'Cotización desactivada']);
    }

    public function listarClientes()
    {
        $clientes = Clientes::where('estado', 1)->get(['idcliente', 'nombre']);
        return response()->json($clientes);
    }

    public function listarContactos(Request $request)
    {
        $idcliente = $request->input('idcliente');
        $contactos = ContactoCliente::where('idcliente', $idcliente)->get(['id_contactocliente', 'nombre']);
        return response()->json($contactos);
    }

    public function listarTiposPago()
    {
        $tiposPago = AdmTipoPago::where('estado', 1)->get(['idtipopago', 'tipo']);
        return response()->json($tiposPago);
    }

    public function listarUnidadesMedida()
    {
        $unidadesMedida = AdmUnidadMedida::where('estado', 1)->get(['idunidadmedida', 'unidad']);
        return response()->json($unidadesMedida);
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

        $pdf = Pdf::loadView('pdf.cotizacion', compact('cotizacion', 'totalEnLetras'));
        return $pdf->download('cotizacion-' . $cotizacion->nocotizacion . '.pdf');
    }
}
