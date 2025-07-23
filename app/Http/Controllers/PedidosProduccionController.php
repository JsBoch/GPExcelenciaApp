<?php

namespace App\Http\Controllers;

use App\Models\AdmCotizacion;
use App\Models\AdmPedidosProduccion;
use App\Models\AdmDetallePedidosProduccion;
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

class PedidosProduccionController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();              // Obtiene el usuario autenticado
        $pedidosTodos = $user->cotizaciones_todas; // Obtiene el valor de cotizaciones_todas que se utilizará también para mostrar todos le pedidos a producción

        $query = AdmPedidosProduccion::query()
            ->select(
                'c.idpedidoproduccion',
                DB::raw('CONCAT(\'P-\',CAST(c.nocotizacion AS CHAR),\'-\',CAST(c.nopedido AS CHAR)) as nopedido'),
                'c.fecha_pedido',
                //'\'NA\' as tipo_pago',
                'c.fecha_entrega',
                'c.total_general',
                'c.costear',
                'cl.nombre as cliente',
                'ct.nombre as contacto',
                'c.direccion_entrega',
                'c.observaciones_costeo',
                'c.observaciones_cliente',
                'c.costeo_observaciones',
                'c.idpedidoproduccionoriginal',
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
                'e.nombre as asesor'
            )
            ->from('adm_pedidos_produccion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_empleados as e', 'c.idusuario', '=', 'e.iduser');

        $query->where('c.estado', '!=', 0); // Estado diferente de 0 por defecto
        //}

        // Filtro por rango de fechas
        if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
            $query->whereBetween('c.fecha_pedido', [$request->fecha_inicio, $request->fecha_fin]);
        } elseif ($request->has('fecha_inicio')) {
            $query->where('c.fecha_pedido', '>=', $request->fecha_inicio);
        } elseif ($request->has('fecha_fin')) {
            $query->where('c.fecha_pedido', '<=', $request->fecha_fin);
        }

        // Aplica el filtro condicional basado en cotizaciones_todas
        if ($pedidosTodos == 'N') {
            $query->where('c.idusuario', $user->id); // Filtra por el usuario logueado
        }

        $pedidos = $query->orderBy('c.nocotizacion', 'desc')->get();
        //Log::info('Consulta ', ['Illuminate\Database\Eloquent\Builder' => $query->getQuery()->toSql()]);
        //$cotizaciones = $query->get();
        return response()->json($pedidos);
    }

    public function store(Request $request)
    {
        try {
            DB::beginTransaction();

            $correlativo = Correlativo::find('adm_pedidos_produccion');

            if (!$correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para cotizacion'], 400);
            }

            $idPedidoProduccion = $correlativo->correlativo + $correlativo->incremento;
            $correlativo->correlativo = $idPedidoProduccion;
            $correlativo->save();

           // $nocotizacion = $request->input('nocotizacion', $idPedidoProduccion); // Si no se envía nocotizacion, se usa el ID generado

            $datosPedido = $request->all();
            $datosPedido['idpedidoproduccion'] = $idPedidoProduccion;
            //$datosPedido['nocotizacion'] = $nocotizacion;
            $datosPedido['usuario_registro'] = auth()->user()->name;
            $datosPedido['fecha_registro'] = date('Y-m-d H:i:s');

            $nocotizacion = $request->input('nocotizacion');
            // Obtener el nopedido máximo para la cotización actual
            $maxNoPedido = DB::table('adm_pedidos_produccion')
                ->where('nocotizacion', $nocotizacion)
                ->max('nopedido') ?? 0;

            // Incrementar el número de pedido
            $nopedido = $maxNoPedido + 1;

            $datosPedido['nopedido'] = $nopedido;
            $datosPedido['idusuario'] = auth()->user()->id;

            $pedidoProduccion = AdmPedidosProduccion::create($datosPedido);

            // Guardar detalles del pedido de producción

            $correlativoDetalle = Correlativo::find('adm_detalle_pedidosproduccion');

            if (!$correlativoDetalle) {
                return response()->json(['message' => 'No se encontró el correlativo para el detalle de pedido'], 400);
            }

            $detalles = $request->input('detalles', []); //Carga del detalle enviado desde el front end
            if (!is_array($detalles)) {
                Log::error('Los detalles no son un array: ' . print_r($detalles, true));
                DB::rollback();
                return response()->json(['message' => 'Error: Los detalles deben ser un array'], 500);
            }

            $idDetallePedidoProduccion = $correlativoDetalle->correlativo + $correlativoDetalle->incremento;

            foreach ($detalles as $index => $detalleData) {
                //Log::info("Procesando detalle en índice: {$index}");
                //Log::info("¿Request tiene archivo detalles[{$index}][imagen]?: " . ($request->hasFile("detalles.{$index}.imagen") ? 'Sí' : 'No'));
                $imagenRuta = null;
                if ($request->hasFile("detalles.{$index}.imagen")) {
                    //Log::info("Archivo detectado para índice: {$index}");
                    $imagen = $request->file("detalles.{$index}.imagen");
                    $nombreImagen = uniqid('detalle_') . '.' . $imagen->getClientOriginalExtension();
                    $imagen->move(public_path('images_pedidosproduccion'), $nombreImagen);
                    $imagenRuta = $nombreImagen;
                }
                AdmDetallePedidosProduccion::create([
                    'iddetallepedidoproduccion' => $idDetallePedidoProduccion,
                    'idpedidoproduccion' => $idPedidoProduccion,
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
                    'material' => $detalleData['material'],
                    'caras' => $detalleData['caras'],
                    'maquina' => $detalleData['maquina'],
                    'acabados' => $detalleData['acabados'],
                    'version' => $detalleData['version'],
                ]);

                $idDetallePedidoProduccion += 1;
            }

            $correlativoDetalle->correlativo = $idDetallePedidoProduccion;
            $correlativoDetalle->save();

            DB::commit();

            return response()->json($pedidoProduccion, 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['message' => 'Error al crear el pedido a producción: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $pedidoProduccion = AdmPedidosProduccion::where('c.idpedidoproduccion', $id)
            ->select(
                'c.idpedidoproduccionoriginal',
                'c.idpedidoproduccion',
                'c.idcotizacion',
                'c.idcliente',
                'cl.nombre as cliente',
                'c.idcontacto',
                'ct.nombre as contacto',
                'c.fecha_pedido',
                'c.fecha_entrega',
                'c.trabajo',
                'c.observaciones_costeo',
                'c.observaciones_cliente',
                'c.total_general',
                'c.costeo_observaciones',
                'c.nocotizacion',
                'c.version',
                'c.idtipopago',
                //'t.tipo as tipo_pago',
                'c.direccion_entrega',
                'c.costear',
                'c.total_general',
            )
            ->from('adm_pedidos_produccion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            // ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->first();
        if (!$pedidoProduccion) {
            return response()->json(['message' => 'No se encontró el registro del pedido'], 404);
        }
        // Obtener los detalles de la cotización
        $detalles = AdmDetallePedidosProduccion::where('d.idpedidoproduccion', $id)
            ->select(
                'd.iddetallepedidoproduccion',
                'idpedidoproduccion',
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
                'material',
                'caras',
                'maquina',
                'acabados',
                'version',
            )
            ->from('adm_detalle_pedidosproduccion as d')
            ->get();

        // Agregar los detalles a la respuesta
        $pedidoProduccion->detalles = $detalles;

        return response()->json($pedidoProduccion);
    }

    public function update(Request $request, $id)
    {
        // Iniciar transacción para asegurar atomicidad
        DB::beginTransaction();
        try {
            // 1. Encontrar y actualizar la cotización principal
            $pedidoProduccion = AdmPedidosProduccion::find($id);
            if (!$pedidoProduccion) {
                DB::rollback(); // Revertir si no se encuentra
                return response()->json(['message' => 'Pedido no encontrado'], 404);
            }

            // Obtener todos los datos, incluyendo los detalles
            $datosPedido = $request->all();

            // Excluir 'detalles' del array para la actualización de la cabecera
            $datosCabecera = $request->except('detalles');

            // Añadir campos de auditoría para la cabecera
            $datosCabecera['usuario_modificacion'] = auth()->user()->name;
            $datosCabecera['fecha_modificacion'] = now(); // Usar now() es más conveniente
            // Quitar la línea de estado si no la envías o quieres mantener la existente
            // $datosCabecera['estado'] = $datosCotizacion['estado'] ?? $cotizacion->estado; // Mantiene estado si no viene, o usa el de la BD

            $pedidoProduccion->update($datosCabecera);

            // 2. Eliminar los detalles existentes para esta cotización
            // Es importante hacer esto DENTRO de la transacción
            AdmDetallePedidosProduccion::where('idpedidoproduccion', $id)->delete();

            // 3. Obtener y procesar los nuevos detalles (como en store)
            $detalles = $request->input('detalles', []); // Asegúrate de que el frontend envíe los detalles como 'detalles'

            if (!empty($detalles)) { // Solo procesar si hay detalles
                // Obtener el correlativo para los detalles (igual que en store)
                $correlativoDetalle = Correlativo::find('adm_detalle_pedidosproduccion');
                if (!$correlativoDetalle) {
                    DB::rollback();
                    // Log::error('No se encontró el correlativo para adm_detalle_cotizacion'); // Opcional: Loguear el error
                    return response()->json(['message' => 'No se encontró el correlativo para el detalle del pedido'], 500); // Error 500 porque es un problema de configuración/BD
                }

                // Determinar el siguiente ID disponible basado en el correlativo actual
                // Asumimos que 'correlativo' guarda el ÚLTIMO ID usado. El siguiente es + incremento.
                $idDetallePedido = $correlativoDetalle->correlativo + $correlativoDetalle->incremento;
                $ultimoIdUsado = $correlativoDetalle->correlativo; // Guardamos el último ID antes de empezar

                foreach ($detalles as $index => $detalleData) {
                    $imagenRuta = null;
                    if ($request->hasFile("detalles.{$index}.imagen")) {
                        $imagen = $request->file("detalles.{$index}.imagen");
                        $nombreImagen = uniqid('detalle_') . '.' . $imagen->getClientOriginalExtension();
                        //$imagen->move(public_path('images_cotizaciones'), $nombreImagen);
                        //$imagenRuta = $nombreImagen;
                        if ($imagen->move(public_path('images_pedidosproduccion'), $nombreImagen)) {
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
                    AdmDetallePedidosProduccion::create([
                        'iddetallepedidoproduccion' => $idDetallePedido,
                        'idpedidoproduccion' => $id,                                                            // Usar el $id de la cotización que estamos actualizando
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
                        'material' => $detalleData['material'] ?? null,
                        'caras' => $detalleData['caras'] ?? null,
                        'maquina' => $detalleData['maquina'] ?? null,
                        'acabados' => $detalleData['acabados'] ?? null,
                        'version' => $detalleData['version'] ?? null,
                    ]);

                    $ultimoIdUsado = $idDetallePedido;                   // Actualizar el último ID que acabamos de usar
                    $idDetallePedido += $correlativoDetalle->incremento; // Incrementar para el siguiente ciclo
                }

                // Actualizar el correlativo con el ÚLTIMO ID que se usó
                $correlativoDetalle->correlativo = $ultimoIdUsado;
                $correlativoDetalle->save();
            }

            // Devolver la cotización actualizada (quizás con los detalles recién guardados?)
            // Para devolverla con detalles, necesitas volver a cargar la relación
            $pedidoProduccion->load('detalles'); // Asume que tienes definida la relación 'detalles' en el modelo AdmPedidosProduccion
            // Si todo fue bien, confirmar la transacción
            DB::commit();

            return response()->json($pedidoProduccion);
        } catch (\Exception $e) {
            // Si algo falla, revertir la transacción
            DB::rollback();
            Log::error('Error al actualizar el pedido ID ' . $id . ': ' . $e->getMessage()); // Loguear el error para depuración
            return response()->json(['message' => 'Error al actualizar el pedido: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $pedidoProduccion = AdmPedidosProduccion::find($id);
        if (!$pedidoProduccion) {
            return response()->json(['message' => 'Pedido no encontrado'], 404);
        }

        $pedidoProduccion->delete();
        AdmDetallePedidosProduccion::where('idpedidoproduccion', $id)->delete();

        return response()->json(['message' => 'Pedido eliminada']);
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
        $detalles = AdmDetallePedidosProduccion::where('d.idpedidoproduccion', $id)
            ->select(
                'd.iddetallepedidoproduccion',
                'd.idpedidoproduccion',
                'd.idproducto',
                'd.producto',
                'd.titulo',
                'd.descripcion',
                'd.cantidad',
                'd.ancho',
                'd.alto',
                'd.profundidad',
                'd.precio',
                'd.total',
                'd.fecha_registro',
                'd.usuario_registro',
                'd.costeado',
                'd.fecha_costeo',
                'd.usuario_costeo',
                'd.estado',
                'd.incluye_foto',
                'd.unidad_medida',
                'd.m2',
                //'imagen',
                'd.imagen as imagen_ruta',
                'd.porcentaje_aplicado',
                'd.material',
                'd.caras',
                'd.maquina',
                'd.acabados',
                'd.version',
            )
            ->from('adm_detalle_pedidosproduccion as d')            
            ->get();

        return response()->json($detalles);
    }

    public function desactivar($id)
    {
        $pedidoProduccion = AdmPedidosProduccion::find($id);
        if (!$pedidoProduccion) {
            return response()->json(['message' => 'Pedido no encontrado'], 404);
        }

        $pedidoProduccion->estado = 0;
        $pedidoProduccion->save();

        return response()->json(['message' => 'Pedido desactivado']);
    }

    public function activarFacturacion(Request $request, $id)
    {
        $estado = $request->input("estado");

        if (!is_numeric($estado)) {
            return response()->json(['error' => 'Estado inválido'], 422);
        }

        $pedidoProduccion = AdmPedidosProduccion::find($id);
        if (!$pedidoProduccion) {
            return response()->json(['message' => 'Pedido no encontrado'], 404);
        }

        $pedidoProduccion->estado = $estado;
        $pedidoProduccion->save();
        $mensajes = [
            4 => "Pedido enviado a pre-facturación",
            5 => "Pedido enviado para facturar",
            2 => "Pedido enviado a costeo",
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
        $pedidoProduccion = AdmPedidosProduccion::where('c.idpedidoproduccion', $id)
            ->select(
                'c.idpedidoproduccion',
                DB::raw('CONCAT(\'P-\',CAST(c.nocotizacion AS CHAR),\'-\',CAST(c.nopedido AS CHAR)) as nopedido'),
                'c.fecha_pedido',
                'c.fecha_entrega',
                //'t.tipo as tipo_pago',
                'c.total_general',
                'c.costear',
                'cl.nombre as cliente',
                'cl.nit as nit', // Asegúrate de tener este campo en tu tabla Clientes
                'ct.nombre as contacto',
                'e.nombre as asesor',                 // Asegúrate de tener este campo en tu tabla (o relación)
                'e.movil as telefono_vendedor',         // Ajusta según tu estructura
                'e.correo_personal as correo_vendedor', // Ajusta según tu estructura
                'c.direccion_entrega',
                'c.observaciones_costeo',
                'c.observaciones_cliente',
                'c.costeo_observaciones',
                'c.trabajo',
                'c.version',                
            )
            ->from('adm_pedidos_produccion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_empleados as e', 'c.idusuario', '=', 'e.iduser')
            //->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->first();

        if (!$pedidoProduccion) {
            return response()->json(['message' => 'Pedido no encontrado'], 404);
        }

        $detalles = AdmDetallePedidosProduccion::where('idpedidoproduccion', $id)->get();
        $pedidoProduccion->detalles = $detalles;
        $pedidoProduccion->fecha_pedido = date('Y-m-d', strtotime($pedidoProduccion->fecha_pedido)); // Formatea la fecha

        // Convertir total a letras (usando kwn/number-to-words)
        $numberToWords = new NumberToWords();
        $numberTransformer = $numberToWords->getNumberTransformer('es');
        // $totalEnLetras     = $numberTransformer->toWords($cotizacion->total_general); // no es necesario multiplicar por 100
        $totalEnLetras = $this->convertirNumeroALetrasConCentavos($pedidoProduccion->total_general);

        // $pdf = Pdf::loadView('pdf.cotizacion', compact('cotizacion', 'totalEnLetras'));
        // return $pdf->download('cotizacion-' . $cotizacion->nocotizacion . '.pdf');
        return response()->json([
            'pedido' => $pedidoProduccion,
            'totalEnLetras' => $totalEnLetras,
        ]);
    }

    public function guardarDetalle(Request $request, $pedidoProduccion)
    {
        $pedidoProduccion = AdmPedidosProduccion::findOrFail($pedidoProduccion);
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
                $detalle = AdmDetallePedidosProduccion::find($item['iddetallepedidoproduccion']);
                if ($detalle && $detalle->idPedidoProduccion === $pedidoProduccion->idpedidoproduccion) {
                    $detalle->porcentaje_aplicado = $item['porcentaje_aplicado'];
                    $detalle->precio = $item['precio'];
                    $detalle->total = $item['total'];
                    $detalle->save();
                }
            }

            // Recalcular el total general de la cotización
            $totalGeneral = $pedidoProduccion->detalles()->sum('total');
            $pedidoProduccion->total_general = $totalGeneral;
            $pedidoProduccion->save();

            DB::commit();

            return response()->json(['message' => 'Detalle de pedido actualizado correctamente']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al guardar el detalle del pedido', 'error' => $e->getMessage()], 500);
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
        $nota = DB::table('adm_pedidos_produccion as ct')
            ->join('clientes as cl', 'ct.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ctt', 'ct.idcontacto', '=', 'ctt.id_contactocliente')
            ->join('adm_detalle_pedidoproduccion as dc', 'ct.idpedidoproduccion', '=', 'dc.idpedidoproduccion')
            ->where('ct.idpedidoproduccion', $id)
            ->where('cl.estado', 1)
            ->where('ctt.estado', 1)
            ->where('dc.estado', 1)
            ->select(
                DB::raw("CONCAT('CT', ct.nocotizacion) as noenvio"),
                'cl.nombre as cliente',
                'ct.direccion_entrega',
                'ct.fecha_pedido',
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

    // public function motivosRechazo()
    // {
    //     return AdmMotivosRechazo::where('estado', 1)->get(['idmotivorechazo', 'motivo']);
    // }

    // public function rechazar(Request $request, $id)
    // {
    //     $request->validate([
    //         'idmotivorechazo' => 'required|exists:adm_motivos_rechazo,idmotivorechazo',
    //     ]);

    //     $cotizacion = AdmPedidosProduccion::find($id);

    //     if (!$cotizacion) {
    //         return response()->json(['message' => 'Cotización no encontrada'], 404);
    //     }

    //     if (!in_array($cotizacion->estado, [1, 3])) {
    //         return response()->json(['message' => 'Solo se pueden rechazar cotizaciones en estado 1 o 3'], 422);
    //     }

    //     $cotizacion->estado = 8; // Estado rechazado
    //     $cotizacion->idmotivorechazo = $request->idmotivorechazo;
    //     $cotizacion->fecha_rechazo = now();
    //     $cotizacion->usuario_rechazo = auth()->user()->name;
    //     $cotizacion->save();

    //     return response()->json(['message' => 'Cotización rechazada correctamente.']);
    // }

    public function cotizacionesPedidoProduccion(Request $request)
    {
        $user = Auth::user();              // Obtiene el usuario autenticado
        $cotizacionesTodas = $user->cotizaciones_todas; // Obtiene el valor de cotizaciones_todas que se utilizará también para mostrar todos le pedidos a producción

        $query = AdmCotizacion::query()
            ->select(
                'ctz.idcotizacion',
                DB::raw('CONCAT(\'CT\',CAST(ctz.nocotizacion AS CHAR)) as nocotizacion'),
                'ctz.nocotizacion as numero_cotizacion',
                'ctz.fecha_cotizacion',                                                
                'clt.nombre as cliente',            
                'ctz.estado',
                DB::raw("CASE
                    WHEN ctz.estado = 1 THEN 'REGISTRO'
                    WHEN ctz.estado = 2 THEN 'COSTEO'
                    WHEN ctz.estado = 3 THEN 'COSTEADA'
                    WHEN ctz.estado = 4 THEN 'PRE-FACTURACION'
                    WHEN ctz.estado = 5 THEN 'PARA FACTURAR'
                    WHEN ctz.estado = 6 THEN 'FACTURADA'
                    WHEN ctz.estado = 7 THEN 'ANULADA'
                    WHEN ctz.estado = 8 THEN 'RECHAZADA'
                    ELSE 'DESCONOCIDO'
                END as estado_texto")
            )
            ->from('adm_cotizacion as ctz')
            ->join('clientes as clt', 'ctz.idcliente', '=', 'clt.idcliente');
           
        $query->where('ctz.estado', '!=', 0); // Estado diferente de 0 por defecto
        //}

        // Filtro por rango de fechas
        if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
            $query->whereBetween('ctz.fecha_cotizacion', [$request->fecha_inicio, $request->fecha_fin]);
        } elseif ($request->has('fecha_inicio')) {
            $query->where('ctz.fecha_cotizacion', '>=', $request->fecha_inicio);
        } elseif ($request->has('fecha_fin')) {
            $query->where('ctz.fecha_cotizacion', '<=', $request->fecha_fin);
        }

        // Aplica el filtro condicional basado en cotizaciones_todas
        if ($cotizacionesTodas == 'N') {
            $query->where('ctz.idusuario', $user->id); // Filtra por el usuario logueado
        }

        $cotizaciones = $query->orderBy('ctz.nocotizacion', 'asc')->get();
        //Log::info('Consulta ', ['Illuminate\Database\Eloquent\Builder' => $query->getQuery()->toSql()]);
        //$cotizaciones = $query->get();
        return response()->json($cotizaciones);
    }
}
