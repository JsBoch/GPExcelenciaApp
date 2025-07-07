<?php

namespace App\Http\Controllers;

use App\Models\AdmCotizacion;
use App\Models\AdmDetalleCotizacion;
use App\Models\AdmTipoPago;
use App\Models\AdmUnidadMedida;
use App\Models\Clientes;
use App\Models\ContactoCliente;
use App\Models\AdmMotivosRechazo;
use App\Models\Correlativo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // <-- Importar Log si quieres registrar errores detallados
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use NumberToWords\NumberToWords;

class CotizacionController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();              // Obtiene el usuario autenticado
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
                END as estado_texto")
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

    public function store(Request $request)
    {
        try {
            DB::beginTransaction();

            $correlativo = Correlativo::find('adm_cotizacion');

            if (!$correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para cotizacion'], 400);
            }

            $idCotizacion = $correlativo->correlativo + $correlativo->incremento;
            $correlativo->correlativo = $idCotizacion;
            $correlativo->save();

            $correlativonocotizacion = Correlativo::find('no_cotizacion');
            if (!$correlativonocotizacion) {
                return response()->json(['message' => 'No se encontró el correlativo para el no de cotizacion'], 400);
            }

            $nocotizacion = $correlativonocotizacion->correlativo + $correlativonocotizacion->incremento;
            $correlativonocotizacion->correlativo = $nocotizacion;
            $correlativonocotizacion->save();

            $datosCotizacion = $request->all();
            $datosCotizacion['idcotizacion'] = $idCotizacion;
            $datosCotizacion['nocotizacion'] = $nocotizacion;
            $datosCotizacion['usuario_registro'] = auth()->user()->name;
            $datosCotizacion['fecha_registro'] = date('Y-m-d H:i:s');
            //$datosCotizacion['estado']           = 1;
            $datosCotizacion['idusuario'] = auth()->user()->id;

            $cotizacion = AdmCotizacion::create($datosCotizacion);

            // Guardar detalles de la cotización

            $correlativoDetalle = Correlativo::find('adm_detalle_cotizacion');

            if (!$correlativoDetalle) {
                return response()->json(['message' => 'No se encontró el correlativo para el detalle de cotizacion'], 400);
            }

            $detalles = $request->input('detalles', []); // Asegúrate de que el frontend envíe los detalles como 'detalles'
            if (!is_array($detalles)) {
                Log::error('Los detalles no son un array: ' . print_r($detalles, true));
                DB::rollback();
                return response()->json(['message' => 'Error: Los detalles deben ser un array'], 500);
            }

            $idDetalleCotizacion = $correlativoDetalle->correlativo + $correlativoDetalle->incremento;

            foreach ($detalles as $index => $detalleData) {
                //Log::info("Procesando detalle en índice: {$index}");
                //Log::info("¿Request tiene archivo detalles[{$index}][imagen]?: " . ($request->hasFile("detalles.{$index}.imagen") ? 'Sí' : 'No'));
                $imagenRuta = null;
                if ($request->hasFile("detalles.{$index}.imagen")) {
                    //Log::info("Archivo detectado para índice: {$index}");
                    $imagen = $request->file("detalles.{$index}.imagen");
                    $nombreImagen = uniqid('detalle_') . '.' . $imagen->getClientOriginalExtension();
                    $imagen->move(public_path('images_cotizaciones'), $nombreImagen);
                    $imagenRuta = $nombreImagen;
                }
                AdmDetalleCotizacion::create([
                    'iddetallecotizacion' => $idDetalleCotizacion,
                    'idcotizacion' => $idCotizacion,
                    'idproducto' => 0,
                    'producto' => $detalleData['descripcion'], // Asegúrate de que el nombre del campo coincida
                    'titulo' => '',
                    'descripcion' => $detalleData['descripcion'],
                    'cantidad' => $detalleData['cantidad'],
                    'ancho' => $detalleData['ancho'],
                    'alto' => $detalleData['alto'],
                    'profundidad' => $detalleData['profundidad'],
                    'precio' => $detalleData['precio'],
                    'total' => $detalleData['total'],
                    'fecha_registro' => date('Y-m-d H:i:s'),
                    'usuario_registro' => auth()->user()->name,
                    'costeado' => 'N',
                    'incluye_foto' => $imagenRuta ? 'S' : 'N',
                    'estado' => 1,
                    'unidad_medida' => $detalleData['unidad_medida'],
                    'm2' => $detalleData['m2'],
                    'imagen' => $imagenRuta,
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
        if (!$cotizaciones) {
            return response()->json(['message' => 'No se encontró el registro de la cotización'], 404);
        }
        // Obtener los detalles de la cotización
        $detalles = AdmDetalleCotizacion::where('d.idcotizacion', $id)
            ->select(
                'd.iddetallecotizacion',
                'idcotizacion',
                'idproducto',
                'producto',
                'titulo',
                'descripcion',
                'cantidad',
                'ancho',
                'alto',
                'profundidad',
                'precio',
                'total',
                'fecha_registro',
                'usuario_registro',
                'costeado',
                'fecha_costeo',
                'usuario_costeo',
                'estado',
                'incluye_foto',
                'unidad_medida',
                'm2',
                //'imagen',
                'imagen as imagen_ruta',
            )
            ->from('adm_detalle_cotizacion as d')
            ->get();

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
            if (!$cotizacion) {
                DB::rollback(); // Revertir si no se encuentra
                return response()->json(['message' => 'Cotización no encontrada'], 404);
            }

            // Obtener todos los datos, incluyendo los detalles
            $datosCotizacion = $request->all();

            // Excluir 'detalles' del array para la actualización de la cabecera
            $datosCabecera = $request->except('detalles');

            // Añadir campos de auditoría para la cabecera
            $datosCabecera['usuario_modificacion'] = auth()->user()->name;
            $datosCabecera['fecha_modificacion'] = now(); // Usar now() es más conveniente
            // Quitar la línea de estado si no la envías o quieres mantener la existente
            // $datosCabecera['estado'] = $datosCotizacion['estado'] ?? $cotizacion->estado; // Mantiene estado si no viene, o usa el de la BD

            $cotizacion->update($datosCabecera);

            // 2. Eliminar los detalles existentes para esta cotización
            // Es importante hacer esto DENTRO de la transacción
            AdmDetalleCotizacion::where('idcotizacion', $id)->delete();

            // 3. Obtener y procesar los nuevos detalles (como en store)
            $detalles = $request->input('detalles', []); // Asegúrate de que el frontend envíe los detalles como 'detalles'

            if (!empty($detalles)) { // Solo procesar si hay detalles
                // Obtener el correlativo para los detalles (igual que en store)
                $correlativoDetalle = Correlativo::find('adm_detalle_cotizacion');
                if (!$correlativoDetalle) {
                    DB::rollback();
                    // Log::error('No se encontró el correlativo para adm_detalle_cotizacion'); // Opcional: Loguear el error
                    return response()->json(['message' => 'No se encontró el correlativo para el detalle de cotización'], 500); // Error 500 porque es un problema de configuración/BD
                }

                // Determinar el siguiente ID disponible basado en el correlativo actual
                // Asumimos que 'correlativo' guarda el ÚLTIMO ID usado. El siguiente es + incremento.
                $idDetalleCotizacion = $correlativoDetalle->correlativo + $correlativoDetalle->incremento;
                $ultimoIdUsado = $correlativoDetalle->correlativo; // Guardamos el último ID antes de empezar

                foreach ($detalles as $index => $detalleData) {
                    $imagenRuta = null;
                    if ($request->hasFile("detalles.{$index}.imagen")) {
                        $imagen = $request->file("detalles.{$index}.imagen");
                        $nombreImagen = uniqid('detalle_') . '.' . $imagen->getClientOriginalExtension();
                        //$imagen->move(public_path('images_cotizaciones'), $nombreImagen);
                        //$imagenRuta = $nombreImagen;
                        if ($imagen->move(public_path('images_cotizaciones'), $nombreImagen)) {
                            $imagenRuta = $nombreImagen;
                            // Log::info("UPDATE: Nuevo archivo movido. Ruta: {$imagenRuta}"); // Puedes descomentar para depurar
                        } else {
                            // Log::error("UPDATE: FALLÓ al mover el nuevo archivo para índice: {$index}"); // Puedes descomentar para depurar
                            // Si falla al mover el nuevo archivo, $imagenRuta sigue siendo null
                            // Considera qué hacer aquí: ¿abortar la operación? ¿guardar el detalle sin imagen?
                        }
                    } elseif (isset($detalleData['imagen_ruta']) && $detalleData['imagen_ruta']) {
                        // Si ya existe una ruta de imagen y no se subió una nueva, la mantenemos
                        $imagenRuta = $detalleData['imagen_ruta'];
                    }
                    // Validar que los campos necesarios existan en $detalle, si no, usar null o valor por defecto
                    AdmDetalleCotizacion::create([
                        'iddetallecotizacion' => $idDetalleCotizacion,
                        'idcotizacion' => $id,                                                            // Usar el $id de la cotización que estamos actualizando
                        'idproducto' => $detalleData['idproducto'] ?? 0,                                // Usar ?? para valores por defecto si no vienen
                        'producto' => $detalleData['producto'] ?? ($detalle['descripcion'] ?? 'N/A'), // Asigna producto o descripción
                        'titulo' => $detalleData['titulo'] ?? '',
                        'descripcion' => $detalleData['descripcion'] ?? '',
                        'cantidad' => $detalleData['cantidad'] ?? 0,
                        'ancho' => $detalleData['ancho'] ?? 0,
                        'alto' => $detalleData['alto'] ?? 0,
                        'profundidad' => $detalleData['profundidad'] ?? 0,
                        'precio' => $detalleData['precio'] ?? 0,
                        'total' => $detalleData['total'] ?? 0,
                        'fecha_registro' => now(), // Usar now() para la fecha actual
                        'usuario_registro' => auth()->user()->name,
                        'costeado' => $detalleData['costeado'] ?? 'N',
                        'incluye_foto' => $imagenRuta ? 'S' : 'N',
                        'estado' => $detalleData['estado'] ?? 1,
                        'unidad_medida' => $detalleData['unidad_medida'] ?? null,
                        'm2' => $detalleData['m2'] ?? 0,
                        'imagen' => $imagenRuta, // Guardar o mantener la ruta de la imagen
                    ]);

                    $ultimoIdUsado = $idDetalleCotizacion;                   // Actualizar el último ID que acabamos de usar
                    $idDetalleCotizacion += $correlativoDetalle->incremento; // Incrementar para el siguiente ciclo
                }

                // Actualizar el correlativo con el ÚLTIMO ID que se usó
                $correlativoDetalle->correlativo = $ultimoIdUsado;
                $correlativoDetalle->save();
            }

            // Devolver la cotización actualizada (quizás con los detalles recién guardados?)
            // Para devolverla con detalles, necesitas volver a cargar la relación
            $cotizacion->load('detalles'); // Asume que tienes definida la relación 'detalles' en el modelo AdmCotizacion
            // Si todo fue bien, confirmar la transacción
            DB::commit();

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
        if (!$cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $cotizacion->delete();
        AdmDetalleCotizacion::where('idcotizacion', $id)->delete();

        return response()->json(['message' => 'Cotización eliminada']);
    }

    /**
     * Obtiene los detalles de una cotización específica. para utilizarlos en el
     * modal que se utilizará para cambiar los precios ya sea del total de la coización
     * o de los detalles de la cotización. En la consulta de cotizaciones como en el
     * módulo de costeo.
     */
    public function detalle($id)
    {
        // Obtener los detalles de la cotización
        $detalles = AdmDetalleCotizacion::where('d.idcotizacion', $id)
            ->select(
                'd.iddetallecotizacion',
                'idcotizacion',
                'idproducto',
                'producto',
                'titulo',
                'descripcion',
                'cantidad',
                'ancho',
                'alto',
                'profundidad',
                'precio',
                'total',
                'fecha_registro',
                'usuario_registro',
                'costeado',
                'fecha_costeo',
                'usuario_costeo',
                'estado',
                'incluye_foto',
                'unidad_medida',
                'm2',
                //'imagen',
                'imagen as imagen_ruta',
                'porcentaje_aplicado',
            )
            ->from('adm_detalle_cotizacion as d')
            ->get();

        return response()->json($detalles);
    }

    public function desactivar($id)
    {
        $cotizacion = AdmCotizacion::find($id);
        if (!$cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $cotizacion->estado = 0;
        $cotizacion->save();

        return response()->json(['message' => 'Cotización desactivada']);
    }

    public function activarFacturacion(Request $request, $id)
    {
        $estado = $request->input("estado");

        if (!is_numeric($estado)) {
            return response()->json(['error' => 'Estado inválido'], 422);
        }

        $cotizacion = AdmCotizacion::find($id);
        if (!$cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $cotizacion->estado = $estado;
        $cotizacion->save();
        $mensajes = [
            4 => "Cotización enviada a pre-facturación",
            5 => "Cotización enviada para facturar",
            2 => "Cotización enviada a costeo",
        ];

        $mensaje = $mensajes[$estado] ?? "Estado actualizado correctamente";

        return response()->json(['message' => $mensaje]);
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

        if (!$cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $detalles = AdmDetalleCotizacion::where('idcotizacion', $id)->get();
        $cotizacion->detalles = $detalles;
        $cotizacion->fecha_cotizacion = date('Y-m-d', strtotime($cotizacion->fecha_cotizacion)); // Formatea la fecha

        // Convertir total a letras (usando kwn/number-to-words)
        $numberToWords = new NumberToWords();
        $numberTransformer = $numberToWords->getNumberTransformer('es');
        // $totalEnLetras     = $numberTransformer->toWords($cotizacion->total_general); // no es necesario multiplicar por 100
        $totalEnLetras = $this->convertirNumeroALetrasConCentavos($cotizacion->total_general);

        // $pdf = Pdf::loadView('pdf.cotizacion', compact('cotizacion', 'totalEnLetras'));
        // return $pdf->download('cotizacion-' . $cotizacion->nocotizacion . '.pdf');
        return response()->json([
            'cotizacion' => $cotizacion,
            'totalEnLetras' => $totalEnLetras,
        ]);
    }

    public function guardarDetalle(Request $request, $cotizacion)
    {
        $cotizacion = AdmCotizacion::findOrFail($cotizacion);
        $request->validate([
            'detalle' => 'required|array',
            'detalle.*.iddetallecotizacion' => 'nullable|exists:adm_detalle_cotizacion,iddetallecotizacion',
            'detalle.*.porcentaje_aplicado' => 'nullable|numeric|min:0|max:10',
            'detalle.*.precio' => 'required|numeric|min:0',
            'detalle.*.total' => 'required|numeric|min:0',
            // Puedes agregar más reglas de validación según tus necesidades
        ]);

        try {
            DB::beginTransaction();

            foreach ($request->input('detalle') as $item) {
                $detalle = AdmDetalleCotizacion::find($item['iddetallecotizacion']);
                if ($detalle && $detalle->idcotizacion === $cotizacion->idcotizacion) {
                    $detalle->porcentaje_aplicado = $item['porcentaje_aplicado'];
                    $detalle->precio = $item['precio'];
                    $detalle->total = $item['total'];
                    $detalle->save();
                }
            }

            // Recalcular el total general de la cotización
            $totalGeneral = $cotizacion->detalles()->sum('total');
            $cotizacion->total_general = $totalGeneral;
            $cotizacion->save();

            DB::commit();

            return response()->json(['message' => 'Detalle de cotización actualizado correctamente']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al guardar el detalle de la cotización', 'error' => $e->getMessage()], 500);
        }
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

    public function generarNotaEnvio($id)
    {
        $nota = DB::table('adm_cotizacion as ct')
            ->join('clientes as cl', 'ct.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ctt', 'ct.idcontacto', '=', 'ctt.id_contactocliente')
            ->join('adm_detalle_cotizacion as dc', 'ct.idcotizacion', '=', 'dc.idcotizacion')
            ->where('ct.idcotizacion', $id)
            ->where('cl.estado', 1)
            ->where('ctt.estado', 1)
            ->where('dc.estado', 1)
            ->select(
                DB::raw("CONCAT('CT', ct.nocotizacion) as noenvio"),
                'cl.nombre as cliente',
                'ct.direccion_entrega',
                'ct.fecha_cotizacion',
                'ctt.nombre as contacto',
                'ctt.telefono',
                'dc.cantidad',
                'dc.descripcion'
            )
            ->get();

        if ($nota->isEmpty()) {
            return response()->json(['message' => 'No se encontró la cotización o sus detalles'], 404);
        }

        return response()->json($nota);
    }

    public function motivosRechazo()
    {
        return AdmMotivosRechazo::where('estado', 1)->get(['idmotivorechazo', 'motivo']);
    }

    public function rechazar(Request $request, $id)
    {
        $request->validate([
            'idmotivorechazo' => 'required|exists:adm_motivos_rechazo,idmotivorechazo',
        ]);

        $cotizacion = AdmCotizacion::find($id);

        if (!$cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        if (!in_array($cotizacion->estado, [1, 3])) {
            return response()->json(['message' => 'Solo se pueden rechazar cotizaciones en estado 1 o 3'], 422);
        }

        $cotizacion->estado = 8; // Estado rechazado
        $cotizacion->idmotivorechazo = $request->idmotivorechazo;
        $cotizacion->fecha_rechazo = now();
        $cotizacion->usuario_rechazo = auth()->user()->name;
        $cotizacion->save();

        return response()->json(['message' => 'Cotización rechazada correctamente.']);
    }
}
