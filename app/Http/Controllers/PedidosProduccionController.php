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
        $request->validate([
            'detalles' => 'required|array|min:1',

            'detalles.*.cantidad' => 'required|numeric|min:1',
            'detalles.*.material' => 'nullable|string',
            'detalles.*.caras' => 'nullable|numeric',
            'detalles.*.ancho' => 'nullable|numeric',
            'detalles.*.alto' => 'nullable|numeric',
            'detalles.*.unidad_medida' => 'nullable|string',

            'detalles.*.galaxy_plus' => 'boolean',
            'detalles.*.uv' => 'boolean',
            'detalles.*.cnc' => 'boolean',
            'detalles.*.laser' => 'boolean',
            'detalles.*.summa' => 'boolean',

            'detalles.*.version' => 'nullable|string',
            'detalles.*.acabados' => 'nullable|string',
            'detalles.*.medida_real' => 'nullable|string',
        ]);


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

            //$datosPedido = $request->all(); // $datosPedido['idpedidoproduccion'] = $idPedidoProduccion;
            // //$datosPedido['nocotizacion'] = $nocotizacion;
            // $datosPedido['usuario_registro'] = auth()->user()->name;
            // $datosPedido['fecha_registro'] = date('Y-m-d H:i:s');

            //$nocotizacion = $request->input('nocotizacion');
            // Obtener el nopedido máximo para la cotización actual
            $maxNoPedido = DB::table('adm_pedidos_produccion')
                // ->where('nocotizacion', $nocotizacion)
                ->max('nopedido') ?? 0;

            // Incrementar el número de pedido
            $nopedido = $maxNoPedido + 1;


            $datosPedido = [
                'idpedidoproduccion' => $idPedidoProduccion,
                'idcliente' => $request->idcliente,
                'idcontacto' => $request->idcontacto ?? 0,

                'fecha_pedido' => $request->fecha_pedido,
                'fecha_entrega' => $request->fecha_entrega,
                'trabajo' => $request->trabajo,
                'direccion_entrega' => $request->direccion_entrega,

                'version' => $request->version ?? 1,
                'costear' => 'N',
                'estado' => 1,

                'nopedido' => $nopedido,
                'idusuario' => auth()->user()->id,
                'usuario_registro' => auth()->user()->name,
                'fecha_registro' => now(),
            ];


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

                    'cantidad' => $detalleData['cantidad'],
                    'material' => $detalleData['material'] ?? null,
                    'caras' => $detalleData['caras'] ?? null,
                    'ancho' => $detalleData['ancho'] ?? null,
                    'alto' => $detalleData['alto'] ?? null,
                    'unidad_medida' => $detalleData['unidad_medida'] ?? null,

                    'galaxy_plus' => !empty($detalleData['galaxy_plus']) ? 1 : 0,
                    'uv'          => !empty($detalleData['uv']) ? 1 : 0,
                    'cnc'         => !empty($detalleData['cnc']) ? 1 : 0,
                    'laser'       => !empty($detalleData['laser']) ? 1 : 0,
                    'summa'       => !empty($detalleData['summa']) ? 1 : 0,

                    'version' => $detalleData['version'] ?? null,
                    'acabados' => $detalleData['acabados'] ?? null,
                    'medida_real' => $detalleData['medida_real'] ?? null,

                    'imagen' => $imagenRuta,
                    'incluye_foto' => $imagenRuta ? 'S' : 'N',

                    'estado' => 1,
                    'fecha_registro' => now(),
                    'usuario_registro' => auth()->user()->name,
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
        DB::beginTransaction();
        try {
            $pedido = AdmPedidosProduccion::findOrFail($id);

            $request->validate([
                'detalles' => 'required|array|min:1',

                'detalles.*.cantidad' => 'required|numeric|min:1',
                'detalles.*.material' => 'nullable|string',
                'detalles.*.caras' => 'nullable|numeric',
                'detalles.*.ancho' => 'nullable|numeric',
                'detalles.*.alto' => 'nullable|numeric',
                'detalles.*.unidad_medida' => 'nullable|string',

                'detalles.*.galaxy_plus' => 'boolean',
                'detalles.*.uv' => 'boolean',
                'detalles.*.cnc' => 'boolean',
                'detalles.*.laser' => 'boolean',
                'detalles.*.summa' => 'boolean',

                'detalles.*.version' => 'nullable|string',
                'detalles.*.acabados' => 'nullable|string',
                'detalles.*.medida_real' => 'nullable|string',
            ]);


            // 1) cabecera
            $datosCabecera = $request->except(['detalles', 'deleted']);
            $datosCabecera['usuario_modificacion'] = auth()->user()->name;
            $datosCabecera['fecha_modificacion'] = now();
            $pedido->update($datosCabecera);

            // 2) borrar detalles eliminados
            $deletedIds = $request->input('deleted', []);
            if (!empty($deletedIds)) {
                $toDelete = AdmDetallePedidosProduccion::where('idpedidoproduccion', $id)
                    ->whereIn('iddetallepedidoproduccion', $deletedIds)
                    ->get();

                // opcional: borrar archivo físico
                foreach ($toDelete as $row) {
                    if ($row->imagen) {
                        $path = public_path('images_pedidosproduccion/' . $row->imagen);
                        if (file_exists($path)) @unlink($path);
                    }
                }

                AdmDetallePedidosProduccion::where('idpedidoproduccion', $id)
                    ->whereIn('iddetallepedidoproduccion', $deletedIds)
                    ->delete();
            }

            // 3) upsert detalles
            $detalles = $request->input('detalles', []);

            // correlativo para NUEVOS
            $correlativoDetalle = Correlativo::find('adm_detalle_pedidosproduccion');
            if (!$correlativoDetalle) {
                DB::rollback();
                return response()->json(['message' => 'No se encontró el correlativo para el detalle del pedido'], 500);
            }
            $nextId = $correlativoDetalle->correlativo + $correlativoDetalle->incremento;
            $ultimoUsado = $correlativoDetalle->correlativo;

            foreach ($detalles as $index => $d) {
                $detalleId = $d['iddetallepedidoproduccion'] ?? null;

                // buscar existente si viene ID
                $detalle = null;
                if ($detalleId) {
                    $detalle = AdmDetallePedidosProduccion::where('idpedidoproduccion', $id)
                        ->where('iddetallepedidoproduccion', $detalleId)
                        ->first();
                }

                // imagen: nueva / conservar ruta / null
                $imagenRuta = $detalle ? $detalle->imagen : null;

                if ($request->hasFile("detalles.$index.imagen")) {
                    // si había imagen anterior, eliminarla
                    if ($imagenRuta) {
                        $old = public_path('images_pedidosproduccion/' . $imagenRuta);
                        if (file_exists($old)) @unlink($old);
                    }

                    $imagen = $request->file("detalles.$index.imagen");
                    $nombreImagen = uniqid('detalle_') . '.' . $imagen->getClientOriginalExtension();
                    $imagen->move(public_path('images_pedidosproduccion'), $nombreImagen);
                    $imagenRuta = $nombreImagen;
                } elseif (!empty($d['imagen_ruta'])) {
                    // conservar imagen existente por ruta enviada
                    $imagenRuta = $d['imagen_ruta'];
                } else {
                    // si no envía nada, se conserva lo que ya tenga $detalle (si existe)
                    // si es nuevo y no envía nada, queda null
                }

                $payload = [
                    'idpedidoproduccion' => $id,
                    'idproducto' => 0,
                    'producto' => $d['descripcion'] ?? '',
                    'titulo' => $d['titulo'] ?? '',
                    'descripcion' => $d['descripcion'] ?? '',
                    'cantidad' => $d['cantidad'] ?? 0,
                    'ancho' => $d['ancho'] ?? 0,
                    'alto' => $d['alto'] ?? 0,
                    'm2' => $d['m2'] ?? 0,
                    'profundidad' => $d['profundidad'] ?? 0,
                    'precio' => 0,
                    'total' => 0,
                    'unidad_medida' => $d['unidad_medida'] ?? null,
                    'material' => $d['material'] ?? null,
                    'caras' => $d['caras'] ?? null,
                    'maquina' => $d['maquina'] ?? null,
                    'acabados' => $d['acabados'] ?? null,
                    'version' => $d['version'] ?? null,
                    'imagen' => $imagenRuta,
                    'incluye_foto' => $imagenRuta ? 'S' : 'N',
                    'estado' => 1,
                    'galaxy_plus' => !empty($d['galaxy_plus']) ? 1 : 0,
                    'uv'          => !empty($d['uv']) ? 1 : 0,
                    'cnc'         => !empty($d['cnc']) ? 1 : 0,
                    'laser'       => !empty($d['laser']) ? 1 : 0,
                    'summa'       => !empty($d['summa']) ? 1 : 0,

                ];

                if ($detalle) {
                    // update existente
                    $payload['usuario_modificacion'] = auth()->user()->name;
                    $payload['fecha_modificacion'] = now();
                    $detalle->update($payload);
                } else {
                    // create nuevo
                    $payload['iddetallepedidoproduccion'] = $nextId;
                    $payload['fecha_registro'] = now();
                    $payload['usuario_registro'] = auth()->user()->name;
                    $payload['costeado'] = 'N';

                    AdmDetallePedidosProduccion::create($payload);

                    $ultimoUsado = $nextId;
                    $nextId += $correlativoDetalle->incremento;
                }
            }

            // actualizar correlativo solo si se usaron nuevos
            if ($ultimoUsado > $correlativoDetalle->correlativo) {
                $correlativoDetalle->correlativo = $ultimoUsado;
                $correlativoDetalle->save();
            }

            DB::commit();
            return response()->json(['message' => 'Pedido actualizado correctamente']);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error("update pedido $id: " . $e->getMessage());
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
