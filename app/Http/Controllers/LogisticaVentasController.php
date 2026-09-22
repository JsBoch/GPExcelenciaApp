<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LogisticaVentasController extends Controller
{
    public function pedidosPendientes(Request $request)
    {
        $query = DB::table('adm_pedidos_produccion as p')
            ->join(
                'clientes as c',
                'p.idcliente',
                '=',
                'c.idcliente'
            )
            ->leftJoin(
                'contacto_cliente as cc',
                'p.idcontacto',
                '=',
                'cc.id_contactocliente'
            )
            ->leftJoin(
                'adm_empleados as e',
                'p.idusuario',
                '=',
                'e.iduser'
            )
            ->select(
                'p.idpedidoproduccion',

                DB::raw(
                    "CONCAT(
                    'P-',
                    CAST(p.nopedido AS CHAR)
                ) AS nopedido"
                ),

                'p.nopedido as nopedido_num',

                'p.fecha_pedido',
                'p.fecha_entrega',

                'p.idcotizacion',
                'p.no_envio_asociado',

                'p.trabajo',

                'p.direccion_entrega',

                'c.nombre as cliente',

                DB::raw(
                    "COALESCE(cc.nombre, '') as contacto"
                ),

                DB::raw(
                    "COALESCE(e.nombre, '') as asesor"
                ),

                'p.requiere_instalacion',
                'p.requiere_entrega',

                'p.autorizacion_estado',
                'p.autorizacion_fecha'
            )

            ->where(
                'p.autorizacion_estado',
                'APROBADO'
            )

            ->whereNotExists(function ($q) {

                $q->select(DB::raw(1))
                    ->from(
                        'adm_logistica_ventas_programacion_pedidos as pp'
                    )

                    ->join(
                        'adm_logistica_ventas_programacion as pr',
                        'pr.idprogramacion',
                        '=',
                        'pp.idprogramacion'
                    )

                    ->whereColumn(
                        'pp.idpedidoproduccion',
                        'p.idpedidoproduccion'
                    )

                    ->where(
                        'pr.estado',
                        '!=',
                        'CANCELADA'
                    );
            });

        if ($request->filled('fecha_inicio')) {
            $query->whereDate(
                'p.fecha_entrega',
                '>=',
                $request->fecha_inicio
            );
        }

        if ($request->filled('fecha_fin')) {
            $query->whereDate(
                'p.fecha_entrega',
                '<=',
                $request->fecha_fin
            );
        }

        return response()->json(
            $query
                ->orderBy('p.fecha_entrega')
                ->orderBy('p.nopedido')
                ->get()
        );
    }

    public function pilotos()
    {
        return response()->json(
            DB::table('adm_logistica_ventas_pilotos')
                ->where('estado', 1)
                ->orderBy('nombre')
                ->get()
        );
    }

    public function vehiculos()
    {
        return response()->json(
            DB::table('adm_logistica_ventas_vehiculos')
                ->where('estado', 1)
                ->orderBy('nombre')
                ->get()
        );
    }

    public function rutas()
    {
        return response()->json(
            DB::table('adm_logistica_ventas_rutas as r')

                ->leftJoin(
                    'adm_logistica_ventas_vehiculos as v',
                    'r.idvehiculo_default',
                    '=',
                    'v.idvehiculo'
                )

                ->leftJoin(
                    'adm_logistica_ventas_pilotos as p',
                    'r.idpiloto_default',
                    '=',
                    'p.idpiloto'
                )

                ->where(
                    'r.estado',
                    1
                )

                ->select(
                    'r.*',
                    'v.nombre as vehiculo_default',
                    'p.nombre as piloto_default'
                )

                ->orderBy('r.nombre')

                ->get()
        );
    }

    public function programar(Request $request)
    {
        $request->validate([
            'idruta' =>
            'required|integer',

            'fecha' =>
            'required|date_format:Y-m-d',

            'hora_salida' =>
            'nullable|date_format:H:i',

            'idvehiculo' =>
            'nullable|integer',

            'idpiloto' =>
            'nullable|integer',

            'encargado' =>
            'nullable|string|max:150',

            'observaciones' =>
            'nullable|string',

            'pedidos' =>
            'required|array|min:1',

            'pedidos.*.idpedidoproduccion' =>
            'required|integer',

            'pedidos.*.orden_entrega' =>
            'required|integer|min:1',

            'pedidos.*.hora_entrega' =>
            'nullable',

            'pedidos.*.observaciones' =>
            'nullable|string',
        ]);

        DB::beginTransaction();

        try {

            $idProgramacion =
                DB::table(
                    'adm_logistica_ventas_programacion'
                )
                ->insertGetId([
                    'idruta' =>
                    $request->idruta,

                    'fecha' =>
                    $request->fecha,

                    'hora_salida' =>
                    $request->hora_salida,

                    'idvehiculo' =>
                    $request->idvehiculo,

                    'idpiloto' =>
                    $request->idpiloto,

                    'encargado' =>
                    $request->encargado,

                    'observaciones' =>
                    $request->observaciones,

                    'estado' =>
                    'PROGRAMADA',

                    'usuario_registro' =>
                    auth()->user()->name,

                    'fecha_registro' =>
                    now(),
                ]);

            foreach (
                $request->pedidos as $pedido
            ) {

                /*
             * Validamos que Contabilidad realmente
             * haya aprobado el pedido.
             */
                $pedidoValido =
                    DB::table(
                        'adm_pedidos_produccion'
                    )
                    ->where(
                        'idpedidoproduccion',
                        $pedido['idpedidoproduccion']
                    )
                    ->where(
                        'autorizacion_estado',
                        'APROBADO'
                    )
                    ->first();

                if (!$pedidoValido) {
                    throw new \Exception(
                        'Existe un pedido que ya no está aprobado.'
                    );
                }

                /*
             * Evitar programación duplicada.
             */
                $yaProgramado =
                    DB::table(
                        'adm_logistica_ventas_programacion_pedidos as pp'
                    )
                    ->join(
                        'adm_logistica_ventas_programacion as pr',
                        'pr.idprogramacion',
                        '=',
                        'pp.idprogramacion'
                    )
                    ->where(
                        'pp.idpedidoproduccion',
                        $pedido['idpedidoproduccion']
                    )
                    ->where(
                        'pr.estado',
                        '!=',
                        'CANCELADA'
                    )
                    ->exists();

                if ($yaProgramado) {
                    throw new \Exception(
                        'Uno de los pedidos ya fue programado.'
                    );
                }

                DB::table(
                    'adm_logistica_ventas_programacion_pedidos'
                )
                    ->insert([
                        'idprogramacion' =>
                        $idProgramacion,

                        'idpedidoproduccion' =>
                        $pedido['idpedidoproduccion'],

                        'orden_entrega' =>
                        $pedido['orden_entrega'],

                        'hora_entrega' =>
                        $pedido['hora_entrega'] ?? null,

                        'direccion_entrega' =>
                        $pedidoValido
                            ->direccion_entrega,

                        'observaciones' =>
                        $pedido['observaciones'] ?? null,

                        'estado' =>
                        'PROGRAMADO',

                        'usuario_registro' =>
                        auth()->user()->name,

                        'fecha_registro' =>
                        now(),
                    ]);
            }

            DB::commit();

            return response()->json([
                'message' =>
                'Ruta programada correctamente',

                'idprogramacion' =>
                $idProgramacion,
            ]);
        } catch (\Exception $e) {

            DB::rollBack();

            Log::error(
                'ERROR PROGRAMANDO LOGISTICA VENTAS',
                [
                    'error' =>
                    $e->getMessage(),

                    'usuario' =>
                    auth()->user()->name
                        ?? null,
                ]
            );

            return response()->json([
                'message' =>
                $e->getMessage()
            ], 422);
        }
    }

    public function calendario(Request $request)
    {
        $request->validate([
            'fecha_inicio' => 'required|date_format:Y-m-d',
            'fecha_fin'    => 'required|date_format:Y-m-d',
        ]);

        $programaciones = DB::table(
            'adm_logistica_ventas_programacion as pr'
        )
            ->join(
                'adm_logistica_ventas_rutas as r',
                'pr.idruta',
                '=',
                'r.idruta'
            )
            ->leftJoin(
                'adm_logistica_ventas_vehiculos as v',
                'pr.idvehiculo',
                '=',
                'v.idvehiculo'
            )
            ->leftJoin(
                'adm_logistica_ventas_pilotos as pi',
                'pr.idpiloto',
                '=',
                'pi.idpiloto'
            )
            ->whereBetween(
                'pr.fecha',
                [
                    $request->fecha_inicio,
                    $request->fecha_fin,
                ]
            )
            ->where(
                'pr.estado',
                '!=',
                'CANCELADA'
            )
            ->select(
                'pr.idprogramacion',

                'pr.fecha',
                'pr.hora_salida',

                'pr.estado',
                'pr.encargado',
                'pr.observaciones',

                'r.idruta',
                'r.nombre as ruta',

                'v.idvehiculo',
                'v.nombre as vehiculo',
                'v.placa',
                'v.tipo as tipo_vehiculo',

                'pi.idpiloto',
                'pi.nombre as piloto',

                DB::raw("
                (
                    SELECT COUNT(*)
                    FROM adm_logistica_ventas_programacion_pedidos pp
                    WHERE pp.idprogramacion = pr.idprogramacion
                ) AS total_pedidos
            ")
            )
            ->orderBy('pr.fecha')
            ->orderBy('pr.hora_salida')
            ->orderBy('r.nombre')
            ->get();

        return response()->json(
            $programaciones
        );
    }

    public function guardarPiloto(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:150',
            'telefono' => 'nullable|string|max:50',
            'licencia' => 'nullable|string|max:100',
            'observaciones' => 'nullable|string|max:500',
        ]);

        $id = DB::table('adm_logistica_ventas_pilotos')
            ->insertGetId([
                'nombre' => $request->nombre,
                'telefono' => $request->telefono,
                'licencia' => $request->licencia,
                'observaciones' => $request->observaciones,
                'estado' => 1,
                'usuario_registro' => auth()->user()->name,
                'fecha_registro' => now(),
            ]);

        return response()->json([
            'message' => 'Piloto registrado correctamente',
            'idpiloto' => $id,
        ]);
    }

    public function actualizarPiloto(Request $request, $id)
    {
        $request->validate([
            'nombre' => 'required|string|max:150',
            'telefono' => 'nullable|string|max:50',
            'licencia' => 'nullable|string|max:100',
            'observaciones' => 'nullable|string|max:500',
        ]);

        $existe = DB::table('adm_logistica_ventas_pilotos')
            ->where('idpiloto', $id)
            ->exists();

        if (!$existe) {
            return response()->json([
                'message' => 'Piloto no encontrado'
            ], 404);
        }

        DB::table('adm_logistica_ventas_pilotos')
            ->where('idpiloto', $id)
            ->update([
                'nombre' => $request->nombre,
                'telefono' => $request->telefono,
                'licencia' => $request->licencia,
                'observaciones' => $request->observaciones,
                'usuario_modificacion' => auth()->user()->name,
                'fecha_modificacion' => now(),
            ]);

        return response()->json([
            'message' => 'Piloto actualizado correctamente'
        ]);
    }

    public function desactivarPiloto($id)
    {
        DB::table('adm_logistica_ventas_pilotos')
            ->where('idpiloto', $id)
            ->update([
                'estado' => 0,
                'usuario_modificacion' => auth()->user()->name,
                'fecha_modificacion' => now(),
            ]);

        return response()->json([
            'message' => 'Piloto desactivado correctamente'
        ]);
    }

    public function guardarVehiculo(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:150',
            'placa' => 'nullable|string|max:30',
            'tipo' => 'required|in:MOTO,CARRO,PANEL,CAMION',
            'marca' => 'nullable|string|max:100',
            'modelo' => 'nullable|string|max:100',
            'observaciones' => 'nullable|string|max:500',
        ]);

        $id = DB::table('adm_logistica_ventas_vehiculos')
            ->insertGetId([
                'nombre' => $request->nombre,
                'placa' => $request->placa,
                'tipo' => $request->tipo,
                'marca' => $request->marca,
                'modelo' => $request->modelo,
                'observaciones' => $request->observaciones,
                'estado' => 1,
                'usuario_registro' => auth()->user()->name,
                'fecha_registro' => now(),
            ]);

        return response()->json([
            'message' => 'Vehículo registrado correctamente',
            'idvehiculo' => $id,
        ]);
    }

    public function actualizarVehiculo(Request $request, $id)
    {
        $request->validate([
            'nombre' => 'required|string|max:150',
            'placa' => 'nullable|string|max:30',
            'tipo' => 'required|in:MOTO,CARRO,PANEL,CAMION',
            'marca' => 'nullable|string|max:100',
            'modelo' => 'nullable|string|max:100',
            'observaciones' => 'nullable|string|max:500',
        ]);

        $existe = DB::table('adm_logistica_ventas_vehiculos')
            ->where('idvehiculo', $id)
            ->exists();

        if (!$existe) {
            return response()->json([
                'message' => 'Vehículo no encontrado'
            ], 404);
        }

        DB::table('adm_logistica_ventas_vehiculos')
            ->where('idvehiculo', $id)
            ->update([
                'nombre' => $request->nombre,
                'placa' => $request->placa,
                'tipo' => $request->tipo,
                'marca' => $request->marca,
                'modelo' => $request->modelo,
                'observaciones' => $request->observaciones,
                'usuario_modificacion' => auth()->user()->name,
                'fecha_modificacion' => now(),
            ]);

        return response()->json([
            'message' => 'Vehículo actualizado correctamente'
        ]);
    }

    public function desactivarVehiculo($id)
    {
        DB::table('adm_logistica_ventas_vehiculos')
            ->where('idvehiculo', $id)
            ->update([
                'estado' => 0,
                'usuario_modificacion' => auth()->user()->name,
                'fecha_modificacion' => now(),
            ]);

        return response()->json([
            'message' => 'Vehículo desactivado correctamente'
        ]);
    }

    public function guardarRuta(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:100',
            'descripcion' => 'nullable|string|max:500',
            'idvehiculo_default' => 'nullable|integer',
            'idpiloto_default' => 'nullable|integer',
            // 'hora_salida_default' => 'nullable|date_format:H:i',
        ]);

        $id = DB::table('adm_logistica_ventas_rutas')
            ->insertGetId([
                'nombre' => $request->nombre,
                'descripcion' => $request->descripcion,
                'idvehiculo_default' => $request->idvehiculo_default,
                'idpiloto_default' => $request->idpiloto_default,
                'hora_salida_default' => $request->hora_salida_default,
                'estado' => 1,
                'usuario_registro' => auth()->user()->name,
                'fecha_registro' => now(),
            ]);

        return response()->json([
            'message' => 'Ruta registrada correctamente',
            'idruta' => $id,
        ]);
    }

    public function actualizarRuta(Request $request, $id)
    {
        $request->validate([
            'nombre' => 'required|string|max:100',
            'descripcion' => 'nullable|string|max:500',
            'idvehiculo_default' => 'nullable|integer',
            'idpiloto_default' => 'nullable|integer',
            // 'hora_salida_default' => 'nullable|date_format:H:i',
        ]);

        $existe = DB::table('adm_logistica_ventas_rutas')
            ->where('idruta', $id)
            ->exists();

        if (!$existe) {
            return response()->json([
                'message' => 'Ruta no encontrada'
            ], 404);
        }

        DB::table('adm_logistica_ventas_rutas')
            ->where('idruta', $id)
            ->update([
                'nombre' => $request->nombre,
                'descripcion' => $request->descripcion,
                'idvehiculo_default' => $request->idvehiculo_default,
                'idpiloto_default' => $request->idpiloto_default,
                // 'hora_salida_default' => $request->hora_salida_default,
                'usuario_modificacion' => auth()->user()->name,
                'fecha_modificacion' => now(),
            ]);

        return response()->json([
            'message' => 'Ruta actualizada correctamente'
        ]);
    }

    public function desactivarRuta($id)
    {
        DB::table('adm_logistica_ventas_rutas')
            ->where('idruta', $id)
            ->update([
                'estado' => 0,
                'usuario_modificacion' => auth()->user()->name,
                'fecha_modificacion' => now(),
            ]);

        return response()->json([
            'message' => 'Ruta desactivada correctamente'
        ]);
    }

    public function detalleProgramacion($id)
    {
        $programacion = DB::table(
            'adm_logistica_ventas_programacion as pr'
        )
            ->join(
                'adm_logistica_ventas_rutas as r',
                'pr.idruta',
                '=',
                'r.idruta'
            )
            ->leftJoin(
                'adm_logistica_ventas_vehiculos as v',
                'pr.idvehiculo',
                '=',
                'v.idvehiculo'
            )
            ->leftJoin(
                'adm_logistica_ventas_pilotos as pi',
                'pr.idpiloto',
                '=',
                'pi.idpiloto'
            )
            ->where(
                'pr.idprogramacion',
                $id
            )
            ->select(
                'pr.*',

                'r.nombre as ruta',

                'v.nombre as vehiculo',
                'v.placa',
                'v.tipo as tipo_vehiculo',

                'pi.nombre as piloto'
            )
            ->first();

        if (!$programacion) {
            return response()->json([
                'message' =>
                'Programación no encontrada'
            ], 404);
        }

        $pedidos = DB::table(
            'adm_logistica_ventas_programacion_pedidos as pp'
        )
            ->join(
                'adm_pedidos_produccion as p',
                'pp.idpedidoproduccion',
                '=',
                'p.idpedidoproduccion'
            )
            ->join(
                'clientes as c',
                'p.idcliente',
                '=',
                'c.idcliente'
            )
            ->where(
                'pp.idprogramacion',
                $id
            )
            ->select(
                'pp.id',

                'pp.idpedidoproduccion',
                'pp.orden_entrega',
                'pp.hora_entrega',

                'pp.direccion_entrega',
                'pp.observaciones',

                'pp.estado as estado_entrega',

                'p.nopedido',
                'p.fecha_pedido',
                'p.fecha_entrega',
                'p.no_envio_asociado',
                'p.trabajo',

                'c.nombre as cliente'
            )
            ->orderBy(
                'pp.orden_entrega'
            )
            ->get();

        $programacion->pedidos =
            $pedidos;

        return response()->json(
            $programacion
        );
    }

    public function cambiarFechaProgramacion(Request $request, $id)
    {
        $request->validate([
            'fecha' => 'required|date_format:Y-m-d',
            'hora_salida' => 'nullable|date_format:H:i',
        ]);

        $programacion = DB::table(
            'adm_logistica_ventas_programacion'
        )
            ->where('idprogramacion', $id)
            ->first();

        if (!$programacion) {
            return response()->json([
                'message' => 'Programación no encontrada'
            ], 404);
        }

        if ($programacion->estado === 'FINALIZADA') {
            return response()->json([
                'message' => 'No se puede mover una ruta finalizada'
            ], 422);
        }

        if ($programacion->estado === 'CANCELADA') {
            return response()->json([
                'message' => 'No se puede mover una ruta cancelada'
            ], 422);
        }

        DB::table(
            'adm_logistica_ventas_programacion'
        )
            ->where('idprogramacion', $id)
            ->update([
                'fecha' => $request->fecha,

                'hora_salida' =>
                $request->hora_salida
                    ?? $programacion->hora_salida,

                'usuario_modificacion' =>
                auth()->user()->name,

                'fecha_modificacion' =>
                now(),
            ]);

        return response()->json([
            'message' => 'Ruta reprogramada correctamente'
        ]);
    }

    public function actualizarProgramacion(Request $request, $id)
    {
        $request->validate([
            'idruta' => 'required|integer',
            'fecha' => 'required|date_format:Y-m-d',
            'hora_salida' => 'nullable|date_format:H:i',
            'idvehiculo' => 'nullable|integer',
            'idpiloto' => 'nullable|integer',
            'encargado' => 'nullable|string|max:150',
            'observaciones' => 'nullable|string',
        ]);

        $programacion = DB::table('adm_logistica_ventas_programacion')
            ->where('idprogramacion', $id)
            ->first();

        if (!$programacion) {
            return response()->json([
                'message' => 'Programación no encontrada'
            ], 404);
        }

        if ($programacion->estado === 'FINALIZADA') {
            return response()->json([
                'message' => 'No se puede editar una ruta finalizada'
            ], 422);
        }

        if ($programacion->estado === 'CANCELADA') {
            return response()->json([
                'message' => 'No se puede editar una ruta cancelada'
            ], 422);
        }

        DB::table('adm_logistica_ventas_programacion')
            ->where('idprogramacion', $id)
            ->update([
                'idruta' => $request->idruta,
                'fecha' => $request->fecha,
                'hora_salida' => $request->hora_salida,
                'idvehiculo' => $request->idvehiculo,
                'idpiloto' => $request->idpiloto,
                'encargado' => $request->encargado,
                'observaciones' => $request->observaciones,
                'usuario_modificacion' => auth()->user()->name,
                'fecha_modificacion' => now(),
            ]);

        return response()->json([
            'message' => 'Programación actualizada correctamente'
        ]);
    }

    public function actualizarPedidosProgramacion(Request $request, $id)
    {
        $request->validate([
            'pedidos' => 'required|array|min:1',

            'pedidos.*.id' =>
            'required|integer',

            'pedidos.*.orden_entrega' =>
            'required|integer|min:1',

            'pedidos.*.hora_entrega' =>
            'nullable|date_format:H:i',

            'pedidos.*.observaciones' =>
            'nullable|string',
        ]);

        $programacion = DB::table(
            'adm_logistica_ventas_programacion'
        )
            ->where('idprogramacion', $id)
            ->first();

        if (!$programacion) {
            return response()->json([
                'message' =>
                'Programación no encontrada'
            ], 404);
        }

        if ($programacion->estado === 'FINALIZADA') {
            return response()->json([
                'message' =>
                'No se puede editar una ruta finalizada'
            ], 422);
        }

        if ($programacion->estado === 'CANCELADA') {
            return response()->json([
                'message' =>
                'No se puede editar una ruta cancelada'
            ], 422);
        }

        DB::beginTransaction();

        try {

            foreach ($request->pedidos as $pedido) {

                $existe = DB::table(
                    'adm_logistica_ventas_programacion_pedidos'
                )
                    ->where(
                        'id',
                        $pedido['id']
                    )
                    ->where(
                        'idprogramacion',
                        $id
                    )
                    ->exists();

                if (!$existe) {
                    throw new \Exception(
                        'Uno de los pedidos no pertenece a esta programación.'
                    );
                }

                DB::table(
                    'adm_logistica_ventas_programacion_pedidos'
                )
                    ->where(
                        'id',
                        $pedido['id']
                    )
                    ->where(
                        'idprogramacion',
                        $id
                    )
                    ->update([
                        'orden_entrega' =>
                        $pedido['orden_entrega'],

                        'hora_entrega' =>
                        $pedido['hora_entrega'] ?? null,

                        'observaciones' =>
                        $pedido['observaciones'] ?? null,

                        'usuario_modificacion' =>
                        auth()->user()->name,

                        'fecha_modificacion' =>
                        now(),
                    ]);
            }

            DB::commit();

            return response()->json([
                'message' =>
                'Entregas actualizadas correctamente'
            ]);
        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'message' =>
                $e->getMessage()
            ], 422);
        }
    }

    public function cambiarEstadoProgramacion(Request $request, $id)
    {
        $request->validate([
            'estado' => 'required|in:PROGRAMADA,EN_RUTA,FINALIZADA,CANCELADA',
        ]);

        $programacion = DB::table(
            'adm_logistica_ventas_programacion'
        )
            ->where('idprogramacion', $id)
            ->first();

        if (!$programacion) {
            return response()->json([
                'message' => 'Programación no encontrada.',
            ], 404);
        }

        /*
     * Una ruta finalizada ya no debe modificarse.
     */
        if (
            $programacion->estado === 'FINALIZADA' &&
            $request->estado !== 'FINALIZADA'
        ) {
            return response()->json([
                'message' =>
                'Una ruta finalizada ya no puede cambiar de estado.',
            ], 422);
        }

        /*
     * Una ruta cancelada tampoco debe volver a activarse.
     */
        if (
            $programacion->estado === 'CANCELADA' &&
            $request->estado !== 'CANCELADA'
        ) {
            return response()->json([
                'message' =>
                'Una ruta cancelada ya no puede cambiar de estado.',
            ], 422);
        }

        DB::beginTransaction();

        try {

            DB::table(
                'adm_logistica_ventas_programacion'
            )
                ->where('idprogramacion', $id)
                ->update([
                    'estado' =>
                    $request->estado,

                    'usuario_modificacion' =>
                    auth()->user()->name ?? 'SISTEMA',

                    'fecha_modificacion' =>
                    now(),
                ]);


            /*
         * =============================================
         * CANCELACIÓN DE RUTA
         * =============================================
         *
         * No eliminamos pedidos.
         *
         * Los no entregados vuelven a PROGRAMADO para
         * quedar disponibles para una nueva programación.
         *
         * Los ENTREGADOS se conservan intactos para
         * mantener el historial real.
         */
            if ($request->estado === 'CANCELADA') {

                DB::table(
                    'adm_logistica_ventas_programacion_pedidos'
                )
                    ->where(
                        'idprogramacion',
                        $id
                    )
                    ->whereNotIn(
                        'estado',
                        [
                            'ENTREGADO',
                            'REPROGRAMADO',
                        ]
                    )
                    ->update([
                        'estado' =>
                        'PROGRAMADO',

                        'fecha_entrega_real' =>
                        null,

                        'usuario_modificacion' =>
                        auth()->user()->name ?? 'SISTEMA',

                        'fecha_modificacion' =>
                        now(),
                    ]);
            }


            DB::commit();

            return response()->json([
                'message' =>
                $request->estado === 'CANCELADA'
                    ? 'Ruta cancelada. Los pedidos pendientes quedaron disponibles para nueva programación.'
                    : 'Estado de la ruta actualizado correctamente.',
            ]);
        } catch (\Throwable $e) {

            DB::rollBack();

            return response()->json([
                'message' =>
                'No se pudo actualizar el estado de la ruta.',

                'error' =>
                $e->getMessage(),
            ], 500);
        }
    }

    public function cambiarEstadoPedidoProgramacion(Request $request, $id)
    {
        $request->validate([
            'estado' => 'required|in:PROGRAMADO,EN_RUTA,ENTREGADO,NO_ENTREGADO,REPROGRAMADO',
        ]);

        $registro = DB::table(
            'adm_logistica_ventas_programacion_pedidos'
        )
            ->where('id', $id)
            ->first();

        if (!$registro) {
            return response()->json([
                'message' => 'Entrega no encontrada'
            ], 404);
        }

        $datos = [
            'estado' => $request->estado,
            'usuario_modificacion' => auth()->user()->name,
            'fecha_modificacion' => now(),
        ];

        if ($request->estado === 'ENTREGADO') {
            $datos['fecha_entrega_real'] = now();
        }

        if ($request->estado !== 'ENTREGADO') {
            $datos['fecha_entrega_real'] = null;
        }

        DB::table(
            'adm_logistica_ventas_programacion_pedidos'
        )
            ->where('id', $id)
            ->update($datos);

        return response()->json([
            'message' => 'Estado de la entrega actualizado correctamente'
        ]);
    }

    public function reprogramarPedido(Request $request, $id)
    {
        $request->validate([
            'idruta' => 'required|integer',
            'fecha' => 'required|date_format:Y-m-d',
            'hora_salida' => 'nullable|date_format:H:i',
            'idvehiculo' => 'nullable|integer',
            'idpiloto' => 'nullable|integer',
            'encargado' => 'nullable|string|max:150',
            'observaciones_ruta' => 'nullable|string',

            'hora_entrega' => 'nullable|date_format:H:i',
            'observaciones_pedido' => 'nullable|string',
        ]);

        $registro = DB::table(
            'adm_logistica_ventas_programacion_pedidos as pp'
        )
            ->join(
                'adm_logistica_ventas_programacion as pr',
                'pp.idprogramacion',
                '=',
                'pr.idprogramacion'
            )
            ->where('pp.id', $id)
            ->select(
                'pp.*',
                'pr.estado as estado_programacion'
            )
            ->first();

        if (!$registro) {
            return response()->json([
                'message' => 'Entrega no encontrada'
            ], 404);
        }

        if ($registro->estado === 'ENTREGADO') {
            return response()->json([
                'message' => 'No se puede reprogramar una entrega ya realizada'
            ], 422);
        }

        DB::beginTransaction();

        try {

            /*
         * 1. Marcamos el registro anterior como REPROGRAMADO
         */
            DB::table(
                'adm_logistica_ventas_programacion_pedidos'
            )
                ->where('id', $id)
                ->update([
                    'estado' => 'REPROGRAMADO',
                    'usuario_modificacion' => auth()->user()->name,
                    'fecha_modificacion' => now(),
                ]);

            /*
         * 2. Creamos nueva programación
         */
            $idProgramacion = DB::table(
                'adm_logistica_ventas_programacion'
            )
                ->insertGetId([
                    'idruta' => $request->idruta,
                    'fecha' => $request->fecha,
                    'hora_salida' => $request->hora_salida,
                    'idvehiculo' => $request->idvehiculo,
                    'idpiloto' => $request->idpiloto,
                    'encargado' => $request->encargado,
                    'observaciones' => $request->observaciones_ruta,
                    'estado' => 'PROGRAMADA',
                    'usuario_registro' => auth()->user()->name,
                    'fecha_registro' => now(),
                ]);

            /*
         * 3. Insertamos el pedido en la nueva programación
         */
            DB::table(
                'adm_logistica_ventas_programacion_pedidos'
            )
                ->insert([
                    'idprogramacion' => $idProgramacion,
                    'idpedidoproduccion' =>
                    $registro->idpedidoproduccion,

                    'orden_entrega' => 1,

                    'hora_entrega' =>
                    $request->hora_entrega,

                    'direccion_entrega' =>
                    $registro->direccion_entrega,

                    'observaciones' =>
                    $request->observaciones_pedido,

                    'estado' =>
                    'PROGRAMADO',

                    'usuario_registro' =>
                    auth()->user()->name,

                    'fecha_registro' =>
                    now(),
                ]);

            DB::commit();

            return response()->json([
                'message' =>
                'Pedido reprogramado correctamente',

                'idprogramacion' =>
                $idProgramacion,
            ]);
        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'message' =>
                $e->getMessage()
            ], 422);
        }
    }



    public function agregarPedidosProgramacion(Request $request, $id)
    {
        $request->validate([
            'pedidos' => 'required|array|min:1',
            'pedidos.*.idpedidoproduccion' => 'required|integer',
            'pedidos.*.hora_entrega' => 'nullable|date_format:H:i',
            'pedidos.*.observaciones' => 'nullable|string',
        ]);

        $programacion = DB::table('adm_logistica_ventas_programacion')
            ->where('idprogramacion', $id)
            ->first();

        if (!$programacion) {
            return response()->json([
                'message' => 'Programación no encontrada.',
            ], 404);
        }

        if ($programacion->estado !== 'PROGRAMADA') {
            return response()->json([
                'message' => 'Solo se pueden agregar pedidos a una ruta programada.',
            ], 422);
        }

        DB::beginTransaction();

        try {

            $ultimoOrden = DB::table(
                'adm_logistica_ventas_programacion_pedidos'
            )
                ->where('idprogramacion', $id)
                ->max('orden_entrega');

            $ultimoOrden = $ultimoOrden ?? 0;

            foreach ($request->pedidos as $pedido) {

                $pedidoProduccion = DB::table('adm_pedidos_produccion')
                    ->where(
                        'idpedidoproduccion',
                        $pedido['idpedidoproduccion']
                    )
                    ->where(
                        'autorizacion_estado',
                        'APROBADO'
                    )
                    ->first();

                if (!$pedidoProduccion) {
                    throw new \Exception(
                        'Uno de los pedidos ya no está aprobado por Contabilidad.'
                    );
                }

                $yaProgramado = DB::table(
                    'adm_logistica_ventas_programacion_pedidos as pp'
                )
                    ->join(
                        'adm_logistica_ventas_programacion as pr',
                        'pr.idprogramacion',
                        '=',
                        'pp.idprogramacion'
                    )
                    ->where(
                        'pp.idpedidoproduccion',
                        $pedido['idpedidoproduccion']
                    )
                    ->where(
                        'pr.estado',
                        '!=',
                        'CANCELADA'
                    )
                    ->where(
                        'pp.estado',
                        '!=',
                        'REPROGRAMADO'
                    )
                    ->exists();

                if ($yaProgramado) {
                    throw new \Exception(
                        'Uno de los pedidos ya se encuentra programado.'
                    );
                }

                $ultimoOrden++;

                DB::table(
                    'adm_logistica_ventas_programacion_pedidos'
                )
                    ->insert([
                        'idprogramacion' =>
                        $id,

                        'idpedidoproduccion' =>
                        $pedido['idpedidoproduccion'],

                        'orden_entrega' =>
                        $ultimoOrden,

                        'hora_entrega' =>
                        $pedido['hora_entrega'] ?? null,

                        'direccion_entrega' =>
                        $pedidoProduccion->direccion_entrega,

                        'observaciones' =>
                        $pedido['observaciones'] ?? null,

                        'estado' =>
                        'PROGRAMADO',

                        'usuario_registro' =>
                        auth()->user()->name ?? 'SISTEMA',

                        'fecha_registro' =>
                        now(),
                    ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Pedidos agregados a la ruta correctamente.',
            ]);
        } catch (\Throwable $e) {

            DB::rollBack();

            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function quitarPedidoProgramacion($id)
    {
        $detallePedido = DB::table(
            'adm_logistica_ventas_programacion_pedidos as pp'
        )
            ->join(
                'adm_logistica_ventas_programacion as pr',
                'pr.idprogramacion',
                '=',
                'pp.idprogramacion'
            )
            ->where('pp.id', $id)
            ->select(
                'pp.*',
                'pr.estado as estado_programacion'
            )
            ->first();

        if (!$detallePedido) {
            return response()->json([
                'message' => 'Pedido de programación no encontrado.',
            ], 404);
        }

        if ($detallePedido->estado_programacion !== 'PROGRAMADA') {
            return response()->json([
                'message' =>
                'Solo se pueden quitar pedidos de una ruta programada.',
            ], 422);
        }

        if ($detallePedido->estado === 'ENTREGADO') {
            return response()->json([
                'message' =>
                'No se puede quitar un pedido que ya fue entregado.',
            ], 422);
        }

        DB::beginTransaction();

        try {

            DB::table(
                'adm_logistica_ventas_programacion_pedidos'
            )
                ->where('id', $id)
                ->delete();

            /*
         * Reordenar entregas restantes.
         */
            $pedidosRestantes = DB::table(
                'adm_logistica_ventas_programacion_pedidos'
            )
                ->where(
                    'idprogramacion',
                    $detallePedido->idprogramacion
                )
                ->orderBy('orden_entrega')
                ->orderBy('id')
                ->get();

            foreach ($pedidosRestantes as $index => $pedido) {

                DB::table(
                    'adm_logistica_ventas_programacion_pedidos'
                )
                    ->where('id', $pedido->id)
                    ->update([
                        'orden_entrega' => $index + 1,
                    ]);
            }

            DB::commit();

            return response()->json([
                'message' =>
                'Pedido retirado de la ruta correctamente.',
            ]);
        } catch (\Throwable $e) {

            DB::rollBack();

            return response()->json([
                'message' =>
                'No se pudo retirar el pedido de la ruta.',
                'error' =>
                $e->getMessage(),
            ], 500);
        }
    }

    public function cronograma(Request $request)
    {
        $request->validate([
            'fecha_inicio' => 'required|date_format:Y-m-d',
            'fecha_fin'    => 'required|date_format:Y-m-d',
        ]);

        $fechaInicio = $request->fecha_inicio;
        $fechaFin    = $request->fecha_fin;

        /*
     * =====================================================
     * PEDIDOS YA PROGRAMADOS
     * =====================================================
     */

        $programados = DB::table(
            'adm_logistica_ventas_programacion_pedidos as pp'
        )
            ->join(
                'adm_logistica_ventas_programacion as pr',
                'pr.idprogramacion',
                '=',
                'pp.idprogramacion'
            )
            ->join(
                'adm_logistica_ventas_rutas as r',
                'r.idruta',
                '=',
                'pr.idruta'
            )
            ->join(
                'adm_pedidos_produccion as p',
                'p.idpedidoproduccion',
                '=',
                'pp.idpedidoproduccion'
            )
            ->leftJoin(
                'clientes as c',
                'c.idcliente',
                '=',
                'p.idcliente'
            )
            ->leftJoin(
                'adm_logistica_ventas_vehiculos as v',
                'v.idvehiculo',
                '=',
                'pr.idvehiculo'
            )
            ->leftJoin(
                'adm_logistica_ventas_pilotos as pi',
                'pi.idpiloto',
                '=',
                'pr.idpiloto'
            )
            ->whereBetween(
                'pr.fecha',
                [
                    $fechaInicio,
                    $fechaFin,
                ]
            )
            ->where(
                'pr.estado',
                '!=',
                'CANCELADA'
            )
            ->where(
                'pp.estado',
                '!=',
                'REPROGRAMADO'
            )
            ->select([
                'pp.id as idprogramacionpedido',

                'p.idpedidoproduccion',
                'p.nopedido',

                'c.nombre as cliente',

                'pr.idprogramacion',
                'pr.fecha',
                'pr.hora_salida',

                'r.idruta',
                'r.nombre as ruta',

                'pr.idvehiculo',
                'v.nombre as vehiculo',
                'v.placa',

                'pr.idpiloto',
                'pi.nombre as piloto',

                'pp.orden_entrega',
                'pp.hora_entrega',
                'pp.direccion_entrega',
                'pp.observaciones',

                'pp.estado as estado_entrega',

                DB::raw("'PROGRAMADO' as estado_programacion"),
            ])
            ->get();


        /*
     * =====================================================
     * PEDIDOS APROBADOS TODAVÍA SIN RUTA
     * =====================================================
     *
     * Para esta primera versión utilizamos fecha_entrega
     * como la fecha visible en Crono General.
     *
     * Luego agregaremos fecha_planificada_logistica para
     * permitir mover pedidos sin ruta entre días sin tocar
     * la fecha comercial original.
     * =====================================================
     */

        $sinRuta = DB::table(
            'adm_pedidos_produccion as p'
        )
            ->leftJoin(
                'clientes as c',
                'c.idcliente',
                '=',
                'p.idcliente'
            )
            ->leftJoin(
                'adm_logistica_ventas_planificacion_pedidos as lp',
                'lp.idpedidoproduccion',
                '=',
                'p.idpedidoproduccion'
            )
            ->where(
                'p.autorizacion_estado',
                'APROBADO'
            )
            ->whereBetween(
                DB::raw(
                    'COALESCE(lp.fecha_planificada, p.fecha_entrega)'
                ),
                [
                    $fechaInicio,
                    $fechaFin,
                ]
            )
            ->whereNotExists(function ($query) {

                $query
                    ->select(
                        DB::raw(1)
                    )
                    ->from(
                        'adm_logistica_ventas_programacion_pedidos as pp'
                    )
                    ->join(
                        'adm_logistica_ventas_programacion as pr',
                        'pr.idprogramacion',
                        '=',
                        'pp.idprogramacion'
                    )
                    ->whereColumn(
                        'pp.idpedidoproduccion',
                        'p.idpedidoproduccion'
                    )
                    ->where(
                        'pr.estado',
                        '!=',
                        'CANCELADA'
                    )
                    ->where(
                        'pp.estado',
                        '!=',
                        'REPROGRAMADO'
                    );
            })
            ->select([
                DB::raw('NULL as idprogramacionpedido'),

                'p.idpedidoproduccion',
                'p.nopedido',

                'c.nombre as cliente',

                DB::raw('NULL as idprogramacion'),

                DB::raw(
                    'COALESCE(lp.fecha_planificada, p.fecha_entrega) as fecha'
                ),

                'lp.hora_planificada',

                DB::raw('NULL as hora_salida'),

                DB::raw('NULL as idruta'),
                DB::raw('NULL as ruta'),

                DB::raw('NULL as idvehiculo'),
                DB::raw('NULL as vehiculo'),
                DB::raw('NULL as placa'),

                DB::raw('NULL as idpiloto'),
                DB::raw('NULL as piloto'),

                DB::raw('NULL as orden_entrega'),
                DB::raw('NULL as hora_entrega'),

                'p.direccion_entrega',
                DB::raw('NULL as observaciones'),

                DB::raw("'SIN_RUTA' as estado_entrega"),

                DB::raw("'SIN_RUTA' as estado_programacion"),
            ])
            ->get();


        /*
     * =====================================================
     * UNIFICAR Y ORDENAR
     * =====================================================
     */

        $resultado = $programados
            ->concat($sinRuta)
            ->sortBy(function ($item) {

                return sprintf(
                    '%s-%s-%08d',
                    $item->fecha ?? '9999-12-31',
                    $item->hora_salida ?? '23:59:59',
                    $item->nopedido ?? 0
                );
            })
            ->values();


        return response()->json(
            $resultado
        );
    }

    public function asignarPedidoCronograma(Request $request, $idPedido)
    {
        $request->validate([
            'idruta'       => 'required|integer',
            'fecha'        => 'required|date_format:Y-m-d',
            'hora_salida'  => 'required|date_format:H:i',
            'idvehiculo'   => 'required|integer',
            'idpiloto'     => 'required|integer',
            'hora_entrega' => 'nullable|date_format:H:i',
        ]);

        $pedido = DB::table('adm_pedidos_produccion')
            ->where('idpedidoproduccion', $idPedido)
            ->where('autorizacion_estado', 'APROBADO')
            ->first();

        if (!$pedido) {
            return response()->json([
                'message' =>
                'El pedido no existe o ya no está aprobado por Contabilidad.',
            ], 422);
        }

        $ruta = DB::table('adm_logistica_ventas_rutas')
            ->where('idruta', $request->idruta)
            ->where('estado', 1)
            ->first();

        if (!$ruta) {
            return response()->json([
                'message' => 'La ruta seleccionada no está disponible.',
            ], 422);
        }

        DB::beginTransaction();

        try {

            /*
         * =================================================
         * ASIGNACIÓN ACTUAL DEL PEDIDO
         * =================================================
         */

            $asignacionActual = DB::table(
                'adm_logistica_ventas_programacion_pedidos as pp'
            )
                ->join(
                    'adm_logistica_ventas_programacion as pr',
                    'pr.idprogramacion',
                    '=',
                    'pp.idprogramacion'
                )
                ->where(
                    'pp.idpedidoproduccion',
                    $idPedido
                )
                ->where(
                    'pr.estado',
                    '!=',
                    'CANCELADA'
                )
                ->where(
                    'pp.estado',
                    '!=',
                    'REPROGRAMADO'
                )
                ->select([
                    'pp.id',
                    'pp.idprogramacion',
                    'pp.estado',
                    'pr.idruta',
                    'pr.fecha',
                    'pr.estado as estado_ruta',
                ])
                ->first();


            if (
                $asignacionActual &&
                $asignacionActual->estado === 'ENTREGADO'
            ) {
                throw new \Exception(
                    'No se puede modificar la programación de un pedido entregado.'
                );
            }


            /*
         * =================================================
         * BUSCAR UNA PROGRAMACIÓN EXISTENTE COMPATIBLE
         * =================================================
         *
         * Evitamos crear Ruta 1, Ruta 1, Ruta 1 varias
         * veces el mismo día si ya existe una programación
         * disponible con los mismos datos.
         */

            $programacionDestino = DB::table(
                'adm_logistica_ventas_programacion'
            )
                ->where(
                    'idruta',
                    $request->idruta
                )
                ->where(
                    'fecha',
                    $request->fecha
                )
                ->where(
                    'estado',
                    'PROGRAMADA'
                )
                ->where(
                    'idvehiculo',
                    $request->idvehiculo
                )
                ->where(
                    'idpiloto',
                    $request->idpiloto
                )
                ->where(
                    'hora_salida',
                    $request->hora_salida
                )
                ->first();


            /*
         * =================================================
         * SI NO EXISTE, CREAR CABECERA
         * =================================================
         */

            if (!$programacionDestino) {

                $idProgramacionDestino = DB::table(
                    'adm_logistica_ventas_programacion'
                )
                    ->insertGetId([
                        'idruta' =>
                        $request->idruta,

                        'fecha' =>
                        $request->fecha,

                        'hora_salida' =>
                        $request->hora_salida,

                        'idvehiculo' =>
                        $request->idvehiculo,

                        'idpiloto' =>
                        $request->idpiloto,

                        'encargado' =>
                        null,

                        'observaciones' =>
                        null,

                        'estado' =>
                        'PROGRAMADA',

                        'usuario_registro' =>
                        auth()->user()->name ?? 'SISTEMA',

                        'fecha_registro' =>
                        now(),
                    ]);
            } else {

                $idProgramacionDestino =
                    $programacionDestino->idprogramacion;
            }


            /*
         * =================================================
         * SI YA ESTÁ EN LA MISMA PROGRAMACIÓN
         * =================================================
         */

            if (
                $asignacionActual &&
                (int) $asignacionActual->idprogramacion ===
                (int) $idProgramacionDestino
            ) {

                DB::table(
                    'adm_logistica_ventas_programacion_pedidos'
                )
                    ->where(
                        'id',
                        $asignacionActual->id
                    )
                    ->update([
                        'hora_entrega' =>
                        $request->hora_entrega,

                        'usuario_modificacion' =>
                        auth()->user()->name ?? 'SISTEMA',

                        'fecha_modificacion' =>
                        now(),
                    ]);

                DB::commit();

                return response()->json([
                    'message' =>
                    'Programación del pedido actualizada correctamente.',
                    'idprogramacion' =>
                    $idProgramacionDestino,
                ]);
            }


            /*
         * =================================================
         * CERRAR ASIGNACIÓN ANTERIOR
         * =================================================
         */

            if ($asignacionActual) {

                DB::table(
                    'adm_logistica_ventas_programacion_pedidos'
                )
                    ->where(
                        'id',
                        $asignacionActual->id
                    )
                    ->update([
                        'estado' =>
                        'REPROGRAMADO',

                        'fecha_entrega_real' =>
                        null,

                        'usuario_modificacion' =>
                        auth()->user()->name ?? 'SISTEMA',

                        'fecha_modificacion' =>
                        now(),
                    ]);
            }


            /*
         * =================================================
         * ORDEN DENTRO DE LA NUEVA RUTA
         * =================================================
         */

            $ultimoOrden = DB::table(
                'adm_logistica_ventas_programacion_pedidos'
            )
                ->where(
                    'idprogramacion',
                    $idProgramacionDestino
                )
                ->where(
                    'estado',
                    '!=',
                    'REPROGRAMADO'
                )
                ->max('orden_entrega');

            $nuevoOrden =
                ($ultimoOrden ?? 0) + 1;


            /*
         * =================================================
         * PUEDE EXISTIR HISTÓRICAMENTE EN ESA RUTA
         * =================================================
         *
         * La tabla tiene UNIQUE
         * (idprogramacion,idpedidoproduccion).
         *
         * Si anteriormente estuvo allí y fue reprogramado,
         * reutilizamos el registro.
         */

            $registroDestinoExistente = DB::table(
                'adm_logistica_ventas_programacion_pedidos'
            )
                ->where(
                    'idprogramacion',
                    $idProgramacionDestino
                )
                ->where(
                    'idpedidoproduccion',
                    $idPedido
                )
                ->first();


            if ($registroDestinoExistente) {

                DB::table(
                    'adm_logistica_ventas_programacion_pedidos'
                )
                    ->where(
                        'id',
                        $registroDestinoExistente->id
                    )
                    ->update([
                        'orden_entrega' =>
                        $nuevoOrden,

                        'hora_entrega' =>
                        $request->hora_entrega,

                        'direccion_entrega' =>
                        $pedido->direccion_entrega,

                        'estado' =>
                        'PROGRAMADO',

                        'fecha_entrega_real' =>
                        null,

                        'usuario_modificacion' =>
                        auth()->user()->name ?? 'SISTEMA',

                        'fecha_modificacion' =>
                        now(),
                    ]);
            } else {

                DB::table(
                    'adm_logistica_ventas_programacion_pedidos'
                )
                    ->insert([
                        'idprogramacion' =>
                        $idProgramacionDestino,

                        'idpedidoproduccion' =>
                        $idPedido,

                        'orden_entrega' =>
                        $nuevoOrden,

                        'hora_entrega' =>
                        $request->hora_entrega,

                        'direccion_entrega' =>
                        $pedido->direccion_entrega,

                        'observaciones' =>
                        null,

                        'estado' =>
                        'PROGRAMADO',

                        'fecha_entrega_real' =>
                        null,

                        'usuario_registro' =>
                        auth()->user()->name ?? 'SISTEMA',

                        'fecha_registro' =>
                        now(),
                    ]);
            }


            DB::commit();

            return response()->json([
                'message' =>
                $asignacionActual
                    ? 'Pedido cambiado de programación correctamente.'
                    : 'Pedido asignado a ruta correctamente.',

                'idprogramacion' =>
                $idProgramacionDestino,
            ]);
        } catch (\Throwable $e) {

            DB::rollBack();

            return response()->json([
                'message' =>
                $e->getMessage(),
            ], 422);
        }
    }

    public function moverPedidoSinRutaCronograma(
        Request $request,
        $idPedido
    ) {
        $request->validate([
            'fecha' => 'required|date_format:Y-m-d',
            'hora'  => 'nullable|date_format:H:i',
        ]);

        $pedido = DB::table(
            'adm_pedidos_produccion'
        )
            ->where(
                'idpedidoproduccion',
                $idPedido
            )
            ->where(
                'autorizacion_estado',
                'APROBADO'
            )
            ->first();

        if (!$pedido) {
            return response()->json([
                'message' =>
                'El pedido no existe o no está aprobado por Contabilidad.',
            ], 422);
        }


        /*
     * Verificar que realmente continúe SIN RUTA.
     */
        $estaProgramado = DB::table(
            'adm_logistica_ventas_programacion_pedidos as pp'
        )
            ->join(
                'adm_logistica_ventas_programacion as pr',
                'pr.idprogramacion',
                '=',
                'pp.idprogramacion'
            )
            ->where(
                'pp.idpedidoproduccion',
                $idPedido
            )
            ->where(
                'pr.estado',
                '!=',
                'CANCELADA'
            )
            ->where(
                'pp.estado',
                '!=',
                'REPROGRAMADO'
            )
            ->exists();

        if ($estaProgramado) {
            return response()->json([
                'message' =>
                'El pedido ya tiene una ruta asignada.',
            ], 422);
        }


        $existente = DB::table(
            'adm_logistica_ventas_planificacion_pedidos'
        )
            ->where(
                'idpedidoproduccion',
                $idPedido
            )
            ->first();


        if ($existente) {

            DB::table(
                'adm_logistica_ventas_planificacion_pedidos'
            )
                ->where(
                    'idpedidoproduccion',
                    $idPedido
                )
                ->update([
                    'fecha_planificada' =>
                    $request->fecha,

                    'hora_planificada' =>
                    $request->hora,

                    'usuario_modificacion' =>
                    auth()->user()->name ?? 'SISTEMA',

                    'fecha_modificacion' =>
                    now(),
                ]);
        } else {

            DB::table(
                'adm_logistica_ventas_planificacion_pedidos'
            )
                ->insert([
                    'idpedidoproduccion' =>
                    $idPedido,

                    'fecha_planificada' =>
                    $request->fecha,

                    'hora_planificada' =>
                    $request->hora,

                    'usuario_registro' =>
                    auth()->user()->name ?? 'SISTEMA',

                    'fecha_registro' =>
                    now(),
                ]);
        }


        return response()->json([
            'message' =>
            'Pedido movido en el cronograma correctamente.',
        ]);
    }
}
