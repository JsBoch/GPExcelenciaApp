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
use App\Exports\PedidosProduccionExcel;
use Maatwebsite\Excel\Facades\Excel;
use App\Models\AdmPedidoProduccionArea;
use App\Exports\PedidoProduccionFormatoExcel;
use Illuminate\Validation\Rule;


class PedidosProduccionController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();              // Obtiene el usuario autenticado
        $pedidosTodos = $user->cotizaciones_todas; // Obtiene el valor de cotizaciones_todas que se utilizará también para mostrar todos le pedidos a producción

        $query = AdmPedidosProduccion::query()
            ->select(
                'c.idpedidoproduccion',
                DB::raw('CONCAT(\'P-\',CAST(c.nopedido AS CHAR)) as nopedido'),
                'c.nocotizacion',
                'c.idcotizacion',
                'c.nopedido as nopedido_num',
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
                'c.no_envio_asociado',
                'c.permisos_estado',
                'c.requiere_instalacion',
                'c.montajes_estado',
                'c.requiere_entrega',
                'c.permisos_justificacion',
                'c.montajes_justificacion',
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
                'e.nombre as asesor',
                DB::raw("
                (
                    SELECT COUNT(*)
                    FROM adm_pedido_produccion_areas pa
                    WHERE pa.idpedidoproduccion = c.idpedidoproduccion
                    AND pa.estado = 1
                ) as total_areas
                "),
                DB::raw("
                (
                    SELECT COUNT(*)
                    FROM adm_pedido_produccion_archivos pa
                    WHERE pa.idpedidoproduccion = c.idpedidoproduccion
                    AND pa.tipo_documento = 'PERMISO'
                    AND pa.estado = 1
                ) as total_permisos
                "),
                DB::raw("
                (
                    SELECT COUNT(*)
                    FROM adm_pedido_produccion_archivos pa
                    WHERE pa.idpedidoproduccion = c.idpedidoproduccion
                    AND pa.tipo_documento = 'MONTAJE'
                    AND pa.estado = 1
                ) as total_montajes
                "),
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

        $pedidos = $query->orderBy('c.nopedido', 'desc')->get();

        //Log::info('Consulta ', ['Illuminate\Database\Eloquent\Builder' => $query->getQuery()->toSql()]);
        //$cotizaciones = $query->get();
        return response()->json($pedidos);
    }

    public function store(Request $request)
    {
        // Log::info('DETALLES RECIBIDOS', [
        //     'detalles' => $request->input('detalles')
        // ]);

        $request->validate([
            'detalles' => 'required|array|min:1',

            'detalles.*.cantidad' => 'required|numeric|min:1',
            'detalles.*.material' => 'nullable|string',
            'detalles.*.caras' => 'nullable|numeric',
            'detalles.*.ancho' => 'nullable|numeric',
            'detalles.*.alto' => 'nullable|numeric',
            'detalles.*.unidad_medida' => 'nullable|string',

            'detalles.*.maquinas' => 'nullable|array',
            'detalles.*.maquinas.*' => 'integer',

            'detalles.*.version' => 'nullable|string',
            'detalles.*.acabados' => 'nullable|string',
            'detalles.*.medida_real' => 'nullable|string',
            'fecha_programada' => 'nullable|date',
            'no_envio_asociado' => [
                'required',
                'integer',
                'min:1',
                Rule::exists('adm_historial_envioscotizacion', 'no_envio')
                    ->where(function ($q) use ($request) {
                        $q->where('idcotizacion', $request->idcotizacion);
                    }),
            ],
            'areas' => 'required|array|min:1',
            'areas.*' => 'integer|exists:area_trabajo,id_areatrabajo',

            'permisos_estado' => 'required|in:ADJUNTADO,PENDIENTE,NO_REQUIERE',
            'permisos_justificacion' => 'nullable|string|required_if:permisos_estado,PENDIENTE,NO_REQUIERE',
            'adjuntos_permisos' => 'nullable|array',
            'adjuntos_permisos.*' => 'file|mimes:pdf,jpg,jpeg,png,webp|max:10240',

            'requiere_instalacion' => 'required|in:S,N',
            'requiere_entrega' => 'required|in:S,N',
            'montajes_estado' => 'nullable|in:ADJUNTADO,PENDIENTE',
            'montajes_justificacion' => 'nullable|string',
            'adjuntos_montajes' => 'nullable|array',
            'adjuntos_montajes.*' => 'file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
        ]);

        $this->validarReglaDocumento($request, 'PERMISO', null);
        $this->validarReglaMontajes($request, null);

        try {

            DB::beginTransaction();

            $correlativo = Correlativo::find('adm_pedidos_produccion');

            if (!$correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para cotizacion'], 400);
            }

            $idPedidoProduccion = $correlativo->correlativo + $correlativo->incremento;
            $correlativo->correlativo = $idPedidoProduccion;
            $correlativo->save();

            //$nocotizacion = $request->input('nocotizacion');
            // Obtener el nopedido máximo para la cotización actual
            $maxNoPedido = DB::table('adm_pedidos_produccion')
                // ->where('nocotizacion', $nocotizacion)
                ->max('nopedido') ?? 0;

            // Incrementar el número de pedido
            $nopedido = $maxNoPedido + 1;


            $datosPedido = [
                'idpedidoproduccion' => $idPedidoProduccion,
                'idcotizacion' => $request->idcotizacion ?? 0,
                'no_envio_asociado' => $request->no_envio_asociado,
                'nocotizacion' => $request->nocotizacion ?? null,
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
                'permisos_estado' => $request->permisos_estado,
                'permisos_justificacion' => $request->permisos_justificacion,
                'requiere_instalacion' => $request->requiere_instalacion,
                'requiere_entrega' => $request->requiere_entrega,
                'montajes_estado' => $request->requiere_instalacion === 'S'
                    ? $request->montajes_estado
                    : null,
                'montajes_justificacion' => $request->requiere_instalacion === 'S'
                    ? $request->montajes_justificacion
                    : null,
            ];

            // Log::info('Datos pedido producción a guardar', [
            //     'datosPedido' => $datosPedido
            // ]);

            $datosPedido['nopedido'] = $nopedido;
            $datosPedido['idusuario'] = auth()->user()->id;

            $pedidoProduccion = AdmPedidosProduccion::create($datosPedido);

            $areas = $request->input('areas', []);

            if (!empty($areas)) {
                foreach ($areas as $index => $idArea) {
                    AdmPedidoProduccionArea::create([
                        'idpedidoproduccion' => $idPedidoProduccion,
                        'id_areatrabajo' => $idArea,
                        'fecha_programada' => $request->fecha_programada ?? $request->fecha_entrega,
                        'orden' => $index + 1,
                        'estado' => 1,
                        'fecha_registro' => now(),
                        'usuario_registro' => auth()->user()->name,
                    ]);
                }
            }

            // Log::info('Pedido producción creado correctamente', [
            //     'idpedidoproduccion' => $pedidoProduccion->idpedidoproduccion ?? null,
            // ]);

            // Guardar detalles del pedido de producción

            $correlativoDetalle = Correlativo::find('adm_detalle_pedidosproduccion');

            if (!$correlativoDetalle) {
                return response()->json(['message' => 'No se encontró el correlativo para el detalle de pedido'], 400);
            }

            $detalles = $request->input('detalles', []); //Carga del detalle enviado desde el front end

            // Log::info('Detalles recibidos', [
            //     'cantidad_detalles' => count($detalles),
            //     'detalles' => $detalles
            // ]);

            if (!is_array($detalles)) {
                //Log::error('Los detalles no son un array: ' . print_r($detalles, true));
                DB::rollback();
                return response()->json(['message' => 'Error: Los detalles deben ser un array'], 500);
            }

            $idDetallePedidoProduccion = $correlativoDetalle->correlativo + $correlativoDetalle->incremento;

            foreach ($detalles as $index => $detalleData) {
                // Log::info("Procesando detalle", [
                //     'index' => $index,
                //     'detalle' => $detalleData,
                // ]);

                $imagenRuta = null;
                if ($request->hasFile("detalles.{$index}.imagen")) {
                    //Log::info("Archivo detectado para índice: {$index}");
                    $imagen = $request->file("detalles.{$index}.imagen");
                    $nombreImagen = uniqid('detalle_') . '.' . $imagen->getClientOriginalExtension();
                    $imagen->move(public_path('images_pedidosproduccion'), $nombreImagen);
                    $imagenRuta = $nombreImagen;
                }

                // Log::info("Imagen detectada", [
                //     'index' => $index,
                //     'archivo' => $request->file("detalles.{$index}.imagen")->getClientOriginalName(),
                // ]);

                $detalle = AdmDetallePedidosProduccion::create([

                    'iddetallepedidoproduccion' => $idDetallePedidoProduccion,
                    'idpedidoproduccion' => $idPedidoProduccion,

                    'cantidad' => $detalleData['cantidad'],
                    'material' => $detalleData['material'] ?? null,
                    'caras' => $detalleData['caras'] ?? null,
                    'ancho' => $detalleData['ancho'] ?? null,
                    'alto' => $detalleData['alto'] ?? null,
                    'unidad_medida' => $detalleData['unidad_medida'] ?? null,

                    'version' => $detalleData['version'] ?? null,
                    'acabados' => $detalleData['acabados'] ?? null,
                    'medida_real' => !empty($detalleData['medida_real'])
                        ? $detalleData['medida_real']
                        : '',

                    'imagen' => $imagenRuta,
                    'incluye_foto' => $imagenRuta ? 'S' : 'N',

                    'estado' => 1,
                    'fecha_registro' => now(),
                    'usuario_registro' => auth()->user()->name,
                ]);

                if (!empty($detalleData['maquinas'])) {

                    foreach ($detalleData['maquinas'] as $idmaquina) {

                        DB::table('adm_detalle_pedidosproduccion_maquinas')
                            ->insert([

                                'iddetallepedidoproduccion' =>
                                $idDetallePedidoProduccion,

                                'idmaquina' => $idmaquina,

                                'fecha_registro' => now(),
                            ]);
                    }
                }

                $idDetallePedidoProduccion += 1;
            }

            $correlativoDetalle->correlativo = $idDetallePedidoProduccion - $correlativoDetalle->incremento;
            $correlativoDetalle->save();

            $this->guardarArchivosPedido($request, $idPedidoProduccion, 'PERMISO');

            if ($request->requiere_instalacion === 'S') {
                $this->guardarArchivosPedido($request, $idPedidoProduccion, 'MONTAJE');
            }

            DB::commit();

            return response()->json($pedidoProduccion, 201);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('ERROR AL CREAR PEDIDO PRODUCCION', [

                'message' => $e->getMessage(),

                'line' => $e->getLine(),

                'file' => $e->getFile(),

                'trace' => $e->getTraceAsString(),

                'request' => $request->all(),

                'usuario' => auth()->user()->name ?? null,

                'idusuario' => auth()->user()->id ?? null,
            ]);

            return response()->json([
                'message' =>
                'Error al crear el pedido a producción: '
                    . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $pedidoProduccion = DB::table('adm_pedidos_produccion as c')
            ->select(
                'c.idpedidoproduccionoriginal',
                'c.idpedidoproduccion',
                'c.idcotizacion',
                'c.no_envio_asociado',
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
                'c.direccion_entrega',
                'c.costear',
                'c.permisos_estado',
                'c.permisos_justificacion',
                'c.requiere_instalacion',
                'c.requiere_entrega',
                'c.montajes_estado',
                'c.montajes_justificacion',
            )
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->leftJoin('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->where('c.idpedidoproduccion', $id)
            ->first();


        if (!$pedidoProduccion) {
            return response()->json(['message' => 'No se encontró el registro del pedido'], 404);
        }
        // Obtener los detalles de la cotización
        $detalles = AdmDetallePedidosProduccion::where('d.idpedidoproduccion', $id)
            ->select(
                'd.iddetallepedidoproduccion',
                'd.idpedidoproduccion',
                'd.cantidad',
                'd.ancho',
                'd.alto',
                'd.unidad_medida',
                'd.material',
                'd.caras',
                'd.acabados',
                'd.version',
                'd.medida_real',
                'd.imagen as imagen_ruta'
            )
            ->from('adm_detalle_pedidosproduccion as d')
            ->get();

        foreach ($detalles as $detalle) {

            $detalle->maquinas = DB::table('adm_detalle_pedidosproduccion_maquinas')
                ->where(
                    'iddetallepedidoproduccion',
                    $detalle->iddetallepedidoproduccion
                )
                ->pluck('idmaquina')
                ->map(fn($id) => (int)$id)
                ->values();

            $detalle->maquinas_texto = DB::table('adm_detalle_pedidosproduccion_maquinas as dm')
                ->join(
                    'adm_maquinas_produccion as m',
                    'dm.idmaquina',
                    '=',
                    'm.idmaquina'
                )
                ->where(
                    'dm.iddetallepedidoproduccion',
                    $detalle->iddetallepedidoproduccion
                )
                ->pluck('m.nombre')
                ->implode(', ');
        }

        $areas = DB::table('adm_pedido_produccion_areas as pa')
            ->join(
                'area_trabajo as a',
                'pa.id_areatrabajo',
                '=',
                'a.id_areatrabajo'
            )
            ->where('pa.idpedidoproduccion', $id)
            ->where('pa.estado', 1)
            ->orderBy('pa.orden')
            ->select(
                'pa.id',
                'pa.idpedidoproduccion',
                'pa.id_areatrabajo',
                'pa.fecha_programada',
                'pa.orden',
                'a.nombre'
            )
            ->get();

        // Agregar los detalles a la respuesta
        $pedidoProduccion->detalles = $detalles;
        $pedidoProduccion->areas = $areas;

        $pedidoProduccion->adjuntos_permisos = $this->obtenerArchivosPedido($id, 'PERMISO');
        $pedidoProduccion->adjuntos_montajes = $this->obtenerArchivosPedido($id, 'MONTAJE');

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

                'detalles.*.maquinas' => 'nullable|array',
                'detalles.*.maquinas.*' => 'integer',

                'detalles.*.version' => 'nullable|string',
                'detalles.*.acabados' => 'nullable|string',
                'detalles.*.medida_real' => 'nullable|string',
                'fecha_programada' => 'nullable|date',
                'no_envio_asociado' => [
                    'required',
                    'integer',
                    'min:1',
                    Rule::exists('adm_historial_envioscotizacion', 'no_envio')
                        ->where(function ($q) use ($request) {
                            $q->where('idcotizacion', $request->idcotizacion);
                        }),
                ],
                'areas' => 'required|array|min:1',
                'areas.*' => 'integer|exists:area_trabajo,id_areatrabajo',

                'permisos_estado' => 'required|in:ADJUNTADO,PENDIENTE,NO_REQUIERE',
                'permisos_justificacion' => 'nullable|string|required_if:permisos_estado,PENDIENTE,NO_REQUIERE',
                'adjuntos_permisos' => 'nullable|array',
                'adjuntos_permisos.*' => 'file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
                'adjuntos_eliminados' => 'nullable|array',
                'adjuntos_eliminados.*' => 'integer',

                'requiere_instalacion' => 'required|in:S,N',
                'requiere_entrega' => 'required|in:S,N',
                'montajes_estado' => 'nullable|in:ADJUNTADO,PENDIENTE',
                'montajes_justificacion' => 'nullable|string',
                'adjuntos_montajes' => 'nullable|array',
                'adjuntos_montajes.*' => 'file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
                'montajes_eliminados' => 'nullable|array',
                'montajes_eliminados.*' => 'integer',
            ]);

            $this->validarReglaDocumento($request, 'PERMISO', $id);
            $this->validarReglaMontajes($request, $id);

            // 1) cabecera
            $datosCabecera = $request->except(['detalles', 'deleted', 'areas', 'fecha_programada', 'adjuntos_permisos', 'adjuntos_eliminados', 'adjuntos_montajes', 'montajes_eliminados']);
            $datosCabecera['usuario_modificacion'] = auth()->user()->name;
            $datosCabecera['fecha_modificacion'] = now();
            $pedido->update($datosCabecera);

            DB::table('adm_pedido_produccion_areas')
                ->where('idpedidoproduccion', $id)
                ->delete();

            $areas = $request->input('areas', []);

            if (!empty($areas)) {

                foreach ($areas as $index => $idArea) {

                    AdmPedidoProduccionArea::create([
                        'idpedidoproduccion' => $id,
                        'id_areatrabajo' => $idArea,
                        'fecha_programada' =>
                        $request->fecha_programada
                            ?? $request->fecha_entrega,

                        'orden' => $index + 1,
                        'estado' => 1,
                        'fecha_registro' => now(),
                        'usuario_registro' => auth()->user()->name,
                    ]);
                }
            }


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

                DB::table('adm_detalle_pedidosproduccion_maquinas')
                    ->whereIn('iddetallepedidoproduccion', $deletedIds)
                    ->delete();

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

                if (!$imagenRuta && $detalle) {
                    $imagenRuta = $detalle->imagen;
                }


                $payload = [
                    'idpedidoproduccion' => $id,
                    'cantidad' => $d['cantidad'],
                    'material' => $d['material'] ?? null,
                    'caras' => $d['caras'] ?? null,
                    'ancho' => $d['ancho'] ?? null,
                    'alto' => $d['alto'] ?? null,
                    'unidad_medida' => $d['unidad_medida'] ?? null,



                    'version' => $d['version'] ?? null,
                    'acabados' => $d['acabados'] ?? null,
                    'medida_real' => !empty($d['medida_real'])
                        ? $d['medida_real']
                        : '',

                    'imagen' => $imagenRuta,
                    'incluye_foto' => $imagenRuta ? 'S' : 'N',
                    'estado' => 1,
                ];

                if ($detalle) {
                    // update existente
                    $payload['usuario_modificacion'] = auth()->user()->name;
                    $payload['fecha_modificacion'] = now();
                    $detalle->update($payload);
                    DB::table('adm_detalle_pedidosproduccion_maquinas')
                        ->where(
                            'iddetallepedidoproduccion',
                            $detalleId
                        )
                        ->delete();

                    if (!empty($d['maquinas'])) {

                        foreach ($d['maquinas'] as $idmaquina) {

                            DB::table('adm_detalle_pedidosproduccion_maquinas')
                                ->insert([
                                    'iddetallepedidoproduccion' => $detalleId,
                                    'idmaquina' => $idmaquina,
                                    'fecha_registro' => now(),
                                ]);
                        }
                    }
                } else {
                    // create nuevo
                    $payload['iddetallepedidoproduccion'] = $nextId;
                    $payload['fecha_registro'] = now();
                    $payload['costeado'] = 'N';
                    $payload['usuario_registro'] = auth()->user()->name;

                    AdmDetallePedidosProduccion::create($payload);

                    if (!empty($d['maquinas'])) {

                        foreach ($d['maquinas'] as $idmaquina) {

                            DB::table('adm_detalle_pedidosproduccion_maquinas')
                                ->insert([
                                    'iddetallepedidoproduccion' => $nextId,
                                    'idmaquina' => $idmaquina,
                                    'fecha_registro' => now(),
                                ]);
                        }
                    }

                    $ultimoUsado = $nextId;
                    $nextId += $correlativoDetalle->incremento;
                }
            }

            // actualizar correlativo solo si se usaron nuevos
            if ($ultimoUsado > $correlativoDetalle->correlativo) {
                $correlativoDetalle->correlativo = $ultimoUsado;
                $correlativoDetalle->save();
            }

            if ($request->permisos_estado !== 'ADJUNTADO') {
                DB::table('adm_pedido_produccion_archivos')
                    ->where('idpedidoproduccion', $id)
                    ->where('tipo_documento', 'PERMISO')
                    ->where('estado', 1)
                    ->update([
                        'estado' => 0,
                        'usuario_eliminacion' => auth()->user()->name,
                        'fecha_eliminacion' => now(),
                    ]);
            } else {
                $this->eliminarArchivosPedido($request, $id, 'PERMISO');
                $this->guardarArchivosPedido($request, $id, 'PERMISO');
            }

            $this->eliminarArchivosPedido($request, $id, 'MONTAJE');

            if ($request->requiere_instalacion !== 'S') {
                DB::table('adm_pedido_produccion_archivos')
                    ->where('idpedidoproduccion', $id)
                    ->where('tipo_documento', 'MONTAJE')
                    ->where('estado', 1)
                    ->update([
                        'estado' => 0,
                        'usuario_eliminacion' => auth()->user()->usuario ?? null,
                        'fecha_eliminacion' => now(),
                    ]);
            }

            if ($request->requiere_instalacion === 'S') {
                $this->guardarArchivosPedido($request, $id, 'MONTAJE');
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
        DB::beginTransaction();

        try {

            $pedidoProduccion = AdmPedidosProduccion::find($id);

            if (!$pedidoProduccion) {
                return response()->json([
                    'message' => 'Pedido no encontrado'
                ], 404);
            }

            $detalles = AdmDetallePedidosProduccion::where(
                'idpedidoproduccion',
                $id
            )->get();

            foreach ($detalles as $detalle) {

                DB::table('adm_detalle_pedidosproduccion_maquinas')
                    ->where(
                        'iddetallepedidoproduccion',
                        $detalle->iddetallepedidoproduccion
                    )
                    ->delete();

                if ($detalle->imagen) {

                    $path = public_path(
                        'images_pedidosproduccion/' . $detalle->imagen
                    );

                    if (file_exists($path)) {
                        @unlink($path);
                    }
                }
            }

            AdmDetallePedidosProduccion::where(
                'idpedidoproduccion',
                $id
            )->delete();

            $pedidoProduccion->delete();

            DB::commit();

            return response()->json([
                'message' => 'Pedido eliminado correctamente'
            ]);
        } catch (\Exception $e) {

            DB::rollback();

            Log::error('ERROR AL ELIMINAR PEDIDO', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Error al eliminar pedido'
            ], 500);
        }
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
                'd.galaxy_plus',
                'd.uv',
                'd.cnc',
                'd.laser',
                'd.summa',
                'd.medida_real',
            )
            ->from('adm_detalle_pedidosproduccion as d')
            ->get();

        foreach ($detalles as $detalle) {

            $maquinas = DB::table('adm_detalle_pedidosproduccion_maquinas as dm')
                ->join(
                    'adm_maquinas_produccion as m',
                    'dm.idmaquina',
                    '=',
                    'm.idmaquina'
                )
                ->where(
                    'dm.iddetallepedidoproduccion',
                    $detalle->iddetallepedidoproduccion
                )
                ->pluck('m.nombre');

            $detalle->maquinas_texto = $maquinas->implode(', ');
        }

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
        $pedidoProduccion = AdmPedidosProduccion::where(
            'c.idpedidoproduccion',
            $id
        )
            ->select(
                'c.idpedidoproduccion',

                DB::raw(
                    'CONCAT(\'P-\',CAST(c.nocotizacion AS CHAR),\'-\',CAST(c.nopedido AS CHAR)) as nopedido'
                ),

                'c.nocotizacion',
                'c.fecha_pedido',
                'c.fecha_entrega',
                'c.total_general',
                'c.costear',

                'cl.nombre as cliente',
                'cl.nit as nit',

                'ct.nombre as contacto',

                'e.nombre as asesor',
                'e.movil as telefono_vendedor',
                'e.correo_personal as correo_vendedor',

                'c.direccion_entrega',
                'c.trabajo',
                'c.version'
            )
            ->from('adm_pedidos_produccion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join(
                'contacto_cliente as ct',
                'c.idcontacto',
                '=',
                'ct.id_contactocliente'
            )
            ->join('adm_empleados as e', 'c.idusuario', '=', 'e.iduser')
            ->first();

        if (!$pedidoProduccion) {
            return response()->json([
                'message' => 'Pedido no encontrado'
            ], 404);
        }

        $detalles = AdmDetallePedidosProduccion::where(
            'idpedidoproduccion',
            $id
        )
            ->select(
                'iddetallepedidoproduccion',
                'cantidad',
                'material',
                'caras',
                'ancho',
                'alto',
                'unidad_medida',
                'version',
                'acabados',
                'medida_real',
                'imagen'
            )
            ->get();

        foreach ($detalles as $detalle) {

            $maquinas = DB::table('adm_detalle_pedidosproduccion_maquinas as dm')
                ->join(
                    'adm_maquinas_produccion as m',
                    'dm.idmaquina',
                    '=',
                    'm.idmaquina'
                )
                ->where(
                    'dm.iddetallepedidoproduccion',
                    $detalle->iddetallepedidoproduccion
                )
                ->pluck('m.nombre');

            $detalle->maquinas_texto = $maquinas->implode(', ');
        }

        $areas = DB::table('adm_pedido_produccion_areas as pa')
            ->join(
                'area_trabajo as a',
                'pa.id_areatrabajo',
                '=',
                'a.id_areatrabajo'
            )
            ->where('pa.idpedidoproduccion', $id)
            ->where('pa.estado', 1)
            ->orderBy('pa.orden')
            ->select(
                'a.nombre',
                'pa.fecha_programada'
            )
            ->get();

        $pedidoProduccion->detalles = $detalles;
        $pedidoProduccion->areas = $areas;

        return response()->json([
            'pedido' => $pedidoProduccion
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

    public function cotizacionesPedidoProduccion(Request $request)
    {
        $user = Auth::user();
        $cotizacionesTodas = $user->cotizaciones_todas ?? 'N';

        $validated = $request->validate([
            'fecha_inicio' => 'required|date_format:Y-m-d',
            'fecha_fin'    => 'required|date_format:Y-m-d',
            'estado'       => 'nullable|integer',
        ]);

        $user = auth()->user();

        $query = DB::table('adm_cotizacion as ctz')
            ->join('clientes as clt', 'ctz.idcliente', '=', 'clt.idcliente')
            ->leftJoin('contacto_cliente as cc', 'ctz.idcontacto', '=', 'cc.id_contactocliente')
            ->select(
                'ctz.idcotizacion',
                DB::raw("CONCAT('CT', CAST(ctz.nocotizacion AS CHAR)) as nocotizacion"),
                'ctz.nocotizacion as numero_cotizacion',
                'ctz.fecha_registro',
                'ctz.fecha_cotizacion',
                'ctz.idcliente',
                'ctz.idcontacto',
                'clt.nombre as cliente',
                DB::raw("COALESCE(cc.nombre, '') as contacto"),
                'ctz.trabajo',
                'ctz.direccion_entrega',
                'ctz.observaciones_cliente',
                'ctz.total',
                'ctz.estado',
                DB::raw("
                CASE
                    WHEN ctz.estado = 1 THEN 'REGISTRO'
                    WHEN ctz.estado = 2 THEN 'COSTEO'
                    WHEN ctz.estado = 3 THEN 'COSTEADA'
                    WHEN ctz.estado = 4 THEN 'PRE-FACTURACION'
                    WHEN ctz.estado = 5 THEN 'PARA FACTURAR'
                    WHEN ctz.estado = 6 THEN 'FACTURADA'
                    WHEN ctz.estado = 7 THEN 'ANULADA'
                    WHEN ctz.estado = 8 THEN 'RECHAZADA'
                    ELSE 'DESCONOCIDO'
                END as estado_texto
            ")
            )
            ->where('ctz.estado', '!=', 0)
            ->where('ctz.fecha_registro', '>=', $validated['fecha_inicio'])
            ->where(
                'ctz.fecha_registro',
                '<',
                DB::raw("DATE_ADD('{$validated['fecha_fin']}', INTERVAL 1 DAY)")
            );

        if (!empty($validated['estado'])) {
            $query->where('ctz.estado', $validated['estado']);
        }

        $query->where('ctz.idusuario', $user->id);

        $cotizaciones = $query
            ->orderByDesc('ctz.fecha_registro')
            ->orderByDesc('ctz.nocotizacion')
            ->get();

        return response()->json($cotizaciones);
    }

    public function detalleCotizacion($idcotizacion)
    {
        $detalle = DB::table('adm_detalle_cotizacion')
            ->select(
                'iddetallecotizacion',
                'descripcion',
                'unidad_medida',
                'cantidad',
                'ancho',
                'alto',
                'profundidad',
                'm2',
                'incluye_foto',
                'imagen'
            )
            ->where('idcotizacion', $idcotizacion)
            ->orderBy('iddetallecotizacion')
            ->get();

        return response()->json($detalle);
    }

    public function exportExcel(Request $request)
    {
        $request->validate([
            'idpedidoproduccion' => 'required|integer'
        ]);

        $pedido = DB::table('adm_pedidos_produccion')
            ->where('idpedidoproduccion', $request->idpedidoproduccion)
            ->select('nopedido')
            ->first();

        $nombreArchivo = 'PEDIDO_' .
            ($pedido ? 'P-' . $pedido->nopedido : $request->idpedidoproduccion)
            . '.xlsx';

        return Excel::download(
            new PedidoProduccionFormatoExcel(
                (int) $request->idpedidoproduccion
            ),
            $nombreArchivo
        );
    }

    public function buscarCotizacionPorNumero($numero)
    {
        $user = Auth::user();

        $query = DB::table('adm_cotizacion as ctz')
            ->join('clientes as clt', 'ctz.idcliente', '=', 'clt.idcliente')
            ->leftJoin('contacto_cliente as cc', 'ctz.idcontacto', '=', 'cc.id_contactocliente')
            ->select(
                'ctz.idcotizacion',
                DB::raw("CONCAT('CT', CAST(ctz.nocotizacion AS CHAR)) as nocotizacion"),
                'ctz.nocotizacion as numero_cotizacion',
                'ctz.idcliente',
                'ctz.idcontacto',
                'clt.nombre as cliente',
                DB::raw("COALESCE(cc.nombre, '') as contacto"),
                'ctz.trabajo',
                'ctz.direccion_entrega',
                'ctz.observaciones_cliente',
                'ctz.total'
            )
            ->where('ctz.estado', '!=', 0)
            ->where('ctz.nocotizacion', $numero);

        if (($user->cotizaciones_todas ?? 'N') !== 'S') {
            $query->where('ctz.idusuario', $user->id);
        }

        $cotizacion = $query->first();

        if (!$cotizacion) {
            return response()->json([
                'message' => 'Cotización no encontrada'
            ], 404);
        }

        return response()->json($cotizacion);
    }

    public function obtenerAreasPedido($id)
    {
        $areas = DB::table('adm_pedido_produccion_areas as pa')
            ->join(
                'area_trabajo as a',
                'pa.id_areatrabajo',
                '=',
                'a.id_areatrabajo'
            )
            ->where('pa.idpedidoproduccion', $id)
            ->where('pa.estado', 1)
            ->orderBy('pa.orden')
            ->select(
                'pa.id',
                'pa.fecha_programada',
                'pa.orden',
                'a.nombre'
            )
            ->get();

        return response()->json($areas);
    }



    private function guardarArchivosPedido(Request $request, int $idPedidoProduccion, string $tipoDocumento): void
    {
        $campo = $tipoDocumento === 'PERMISO'
            ? 'adjuntos_permisos'
            : 'adjuntos_montajes';

        if (!$request->hasFile($campo)) {
            return;
        }

        $carpetaBase = $tipoDocumento === 'PERMISO'
            ? 'adjuntos_pedidosproduccion'
            : 'montajes_pedidosproduccion';

        $destino = public_path("{$carpetaBase}/{$idPedidoProduccion}");

        if (!file_exists($destino)) {
            mkdir($destino, 0775, true);
        }

        foreach ($request->file($campo) as $archivo) {
            $extension = strtolower($archivo->getClientOriginalExtension());
            $prefijo = strtolower($tipoDocumento);

            $nombreGenerado = uniqid("{$prefijo}_", true) . '.' . $extension;

            $archivo->move($destino, $nombreGenerado);

            DB::table('adm_pedido_produccion_archivos')->insert([
                'idpedidoproduccion' => $idPedidoProduccion,
                'tipo_documento' => $tipoDocumento,
                'nombre_original' => $archivo->getClientOriginalName(),
                'nombre_archivo' => $nombreGenerado,
                'ruta_archivo' => "{$carpetaBase}/{$idPedidoProduccion}/{$nombreGenerado}",
                'extension' => $extension,
                'mime_type' => $archivo->getClientMimeType(),
                'tamano' => filesize($destino . DIRECTORY_SEPARATOR . $nombreGenerado),
                'estado' => 1,
                'usuario_registro' => auth()->user()->name ?? auth()->user()->usuario ?? null,
                'fecha_registro' => now(),
            ]);
        }
    }

    private function eliminarArchivosPedido(Request $request, int $idPedidoProduccion, string $tipoDocumento): void
    {
        $campo = $tipoDocumento === 'PERMISO'
            ? 'adjuntos_eliminados'
            : 'montajes_eliminados';

        $ids = $request->input($campo, []);

        if (empty($ids)) {
            return;
        }

        $archivos = DB::table('adm_pedido_produccion_archivos')
            ->where('idpedidoproduccion', $idPedidoProduccion)
            ->where('tipo_documento', $tipoDocumento)
            ->whereIn('idarchivo', $ids)
            ->where('estado', 1)
            ->get();

        foreach ($archivos as $archivo) {
            $path = public_path($archivo->ruta_archivo);

            if (file_exists($path)) {
                @unlink($path);
            }

            DB::table('adm_pedido_produccion_archivos')
                ->where('idarchivo', $archivo->idarchivo)
                ->update([
                    'estado' => 0,
                    'usuario_eliminacion' => auth()->user()->name ?? auth()->user()->usuario ?? null,
                    'fecha_eliminacion' => now(),
                ]);
        }
    }

    private function validarReglaDocumento(Request $request, string $tipoDocumento, ?int $idPedido = null): void
    {
        if ($tipoDocumento === 'PERMISO') {
            $estadoCampo = 'permisos_estado';
            $justificacionCampo = 'permisos_justificacion';
            $archivoCampo = 'adjuntos_permisos';
            $mensajeBase = 'permisos';
        } else {
            return;
        }

        $estado = $request->input($estadoCampo);

        if (!in_array($estado, ['ADJUNTADO', 'PENDIENTE', 'NO_REQUIERE'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                $estadoCampo => ['Debe adjuntar permisos, dejarlos pendientes o indicar que no requiere permisos.'],
            ]);
        }

        if (
            in_array($estado, ['PENDIENTE', 'NO_REQUIERE']) &&
            !trim($request->input($justificacionCampo, ''))
        ) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                $justificacionCampo => ['Debe escribir una justificación para los permisos.'],
            ]);
        }

        if ($estado === 'ADJUNTADO') {
            $tieneArchivoNuevo = $request->hasFile($archivoCampo);

            $tieneArchivoExistente = false;

            if ($idPedido) {
                $tieneArchivoExistente = DB::table('adm_pedido_produccion_archivos')
                    ->where('idpedidoproduccion', $idPedido)
                    ->where('tipo_documento', $tipoDocumento)
                    ->where('estado', 1)
                    ->exists();
            }

            if (!$tieneArchivoNuevo && !$tieneArchivoExistente) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    $archivoCampo => ['Debe adjuntar al menos un archivo de permisos.'],
                ]);
            }
        }
    }

    private function validarReglaMontajes(Request $request, ?int $idPedidoProduccion = null): void
    {
        if ($request->input('requiere_instalacion') !== 'S') {
            return;
        }

        $this->validarReglaDocumento($request, 'MONTAJE', $idPedidoProduccion);
    }

    public function obtenerPermisos($id)
    {
        return response()->json(
            $this->obtenerArchivosPedido(
                $id,
                'PERMISO'
            )
        );
    }

    public function obtenerMontajes($id)
    {
        return response()->json(
            $this->obtenerArchivosPedido(
                $id,
                'MONTAJE'
            )
        );
    }
    private function obtenerArchivosPedido(int $idPedidoProduccion, string $tipoDocumento)
    {
        return DB::table('adm_pedido_produccion_archivos')
            ->where('idpedidoproduccion', $idPedidoProduccion)
            ->where('tipo_documento', $tipoDocumento)
            ->where('estado', 1)
            ->orderBy('idarchivo')
            ->get()
            ->map(function ($archivo) {
                $archivo->url = asset($archivo->ruta_archivo);
                return $archivo;
            });
    }
}
