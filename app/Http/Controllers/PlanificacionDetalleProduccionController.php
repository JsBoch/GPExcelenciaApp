<?php

namespace App\Http\Controllers;

use App\Http\Requests\Planificacion\AsignarRequest;
use App\Http\Requests\Planificacion\MoverRequest;
use App\Http\Requests\Planificacion\ReordenarRequest;
use App\Models\AreaTrabajo;
use App\Models\Correlativo;
use App\Models\PlanificacionDetalleProduccion;
use App\Services\PlanificacionDetalleService;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class PlanificacionDetalleProduccionController extends Controller
{
    public function __construct(private PlanificacionDetalleService $service) {}

    public function tableroPorFecha(string $fecha)
    {
        $estado = request()->query('estado');

        $estadosValidos = ['PENDIENTE', 'EN_PROCESO', 'TERMINADO'];

        if ($estado && !in_array($estado, $estadosValidos)) {
            return response()->json(['message' => 'Estado inválido'], 422);
        }

        // 1️⃣ ÁREAS ACTIVAS
        $areas = AreaTrabajo::where('estado', 1)
            ->orderBy('nombre', 'asc')
            ->get([
                'id_areatrabajo',
                'nombre',
                'descripcion',
                'capacidad_diaria_min'
            ]);

        // 2️⃣ ITEMS PLANIFICADOS DEL DÍA
        $queryItems = PlanificacionDetalleProduccion::query()
            ->join('area_trabajo as a', 'a.id_areatrabajo', '=', 'adm_planificacion_detalle_produccion.id_areatrabajo')
            ->join('adm_detalle_pedidosproduccion as d', 'd.iddetallepedidoproduccion', '=', 'adm_planificacion_detalle_produccion.iddetallepedidoproduccion')
            ->join('adm_pedidos_produccion as p', 'p.idpedidoproduccion', '=', 'd.idpedidoproduccion')
            ->join('clientes as cl', 'cl.idcliente', '=', 'p.idcliente')
            ->where('adm_planificacion_detalle_produccion.fecha_programada', $fecha);

        if ($estado) {
            $queryItems->where('adm_planificacion_detalle_produccion.estado', $estado);
        }

        $items = $queryItems
            ->orderBy('adm_planificacion_detalle_produccion.id_areatrabajo')
            ->orderBy('adm_planificacion_detalle_produccion.orden_cola')
            ->get([
                'adm_planificacion_detalle_produccion.id_planificacion',
                'adm_planificacion_detalle_produccion.id_areatrabajo',
                'adm_planificacion_detalle_produccion.fecha_programada',
                'adm_planificacion_detalle_produccion.orden_cola',
                'adm_planificacion_detalle_produccion.estado',

                'd.iddetallepedidoproduccion',
                'd.idpedidoproduccion',
                'd.descripcion',
                'd.cantidad',
                'd.unidad_medida',
                'd.material',
                'd.duracion_estimada_min',

                'p.nopedido',
                'p.fecha_entrega',
                'p.trabajo',

                'cl.nombre as cliente',
            ]);

        // 3️⃣ CÁLCULO DE CAPACIDAD USADA (RESPETA FILTRO DE ESTADO)
        $queryCapacidad = PlanificacionDetalleProduccion::query()
            ->join('adm_detalle_pedidosproduccion as d', 'd.iddetallepedidoproduccion', '=', 'adm_planificacion_detalle_produccion.iddetallepedidoproduccion')
            ->where('adm_planificacion_detalle_produccion.fecha_programada', $fecha);

        if ($estado) {
            $queryCapacidad->where('adm_planificacion_detalle_produccion.estado', $estado);
        }

        $usadoPorArea = $queryCapacidad
            ->groupBy('adm_planificacion_detalle_produccion.id_areatrabajo')
            ->selectRaw('adm_planificacion_detalle_produccion.id_areatrabajo, SUM(d.duracion_estimada_min) as usado_min')
            ->pluck('usado_min', 'id_areatrabajo');

        // 4️⃣ COLUMNAS POR ÁREA (AUNQUE ESTÉN VACÍAS)
        $columns = [];

        foreach ($areas as $a) {
            $columns[(string)$a->id_areatrabajo] = [];
        }

        foreach ($items as $it) {
            $columns[(string)$it->id_areatrabajo][] = $it;
        }

        // 5️⃣ ARMAR RESPUESTA FINAL
        $areasOut = $areas->map(function ($a) use ($usadoPorArea) {
            return [
                'id_areatrabajo' => $a->id_areatrabajo,
                'nombre' => $a->nombre,
                'descripcion' => $a->descripcion,
                'capacidad_diaria_min' => (int)$a->capacidad_diaria_min,
                'usado_min' => (int)($usadoPorArea[$a->id_areatrabajo] ?? 0),
            ];
        });

        return response()->json([
            'fecha' => $fecha,
            'estado_filtro' => $estado,
            'areas' => $areasOut,
            'columns' => $columns,
        ]);
    }

    public function asignar(AsignarRequest $request)
    {
        return DB::transaction(function () use ($request) {

            $correlativo = Correlativo::find('planificacion_detalle_produccion');
            if (!$correlativo) {
                return response()->json(['message' => 'No se encontró correlativo planifacion_detalle_produccion'], 400);
            }

            $id = (int)$correlativo->correlativo + (int)$correlativo->incremento;
            $correlativo->correlativo = $id;
            $correlativo->save();

            // validar capacidad (minutos del detalle)
            $minutos = (int)DB::table('adm_detalle_pedidosproduccion')
                ->where('iddetallepedidoproduccion', $request->iddetallepedidoproduccion)
                ->value('duracion_estimada_min');

            $this->service->validarCapacidad((int)$request->id_areatrabajo, $request->fecha_programada, $minutos);

            // orden destino
            $maxOrden = PlanificacionDetalleProduccion::where('id_areatrabajo', $request->id_areatrabajo)
                ->where('fecha_programada', $request->fecha_programada)
                ->max('orden_cola');

            $orden = $maxOrden ? ((int)$maxOrden + 1) : 1;

            PlanificacionDetalleProduccion::create([
                'id_planificacion' => $id,
                'iddetallepedidoproduccion' => $request->iddetallepedidoproduccion,
                'id_areatrabajo' => $request->id_areatrabajo,
                'fecha_programada' => $request->fecha_programada,
                'orden_cola' => $orden,
                'estado' => 'PENDIENTE',
                'fecha_registro' => now(),
                'usuario_registro' => auth()->user()->name,
            ]);

            return response()->json(['message' => 'Asignado', 'id_planificacion' => $id], 201);
        });
    }

    public function mover(MoverRequest $request)
    {
        try {
            $this->service->mover(
                (int)$request->id_planificacion,
                (int)$request->to_area,
                (string)$request->to_fecha,
                (int)$request->to_index,
            );

            return response()->json(['message' => 'Movido']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function reordenar(ReordenarRequest $request)
    {
        try {
            $this->service->reordenar(
                (int)$request->id_area,
                (string)$request->fecha,
                $request->ids,
            );

            return response()->json(['message' => 'Reordenado']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function cambiarEstado(Request $request)
    {
        $request->validate([
            'id_planificacion' => 'required|integer',
            'estado' => 'required|in:PENDIENTE,EN_PROCESO,TERMINADO'
        ]);

        $plan = PlanificacionDetalleProduccion::findOrFail($request->id_planificacion);

        $plan->estado = $request->estado;
        $plan->fecha_modificacion = now();
        $plan->usuario_modificacion = auth()->user()->name;
        $plan->save();

        return response()->json(['message' => 'Estado actualizado']);
    }

    public function detallesPendientes($fecha)
    {
        $detalles = DB::table('adm_detalle_pedidosproduccion as d')
            ->join('adm_pedidos_produccion as p', 'p.idpedidoproduccion', '=', 'd.idpedidoproduccion')
            ->join('clientes as c', 'c.idcliente', '=', 'p.idcliente')
            ->whereNotExists(function ($q) use ($fecha) {
                $q->select(DB::raw(1))
                    ->from('adm_planificacion_detalle_produccion as pl')
                    ->whereRaw('pl.iddetallepedidoproduccion = d.iddetallepedidoproduccion')
                    ->where('pl.fecha_programada', $fecha);
            })
            ->select(
                'd.iddetallepedidoproduccion',
                'd.descripcion',
                'd.duracion_estimada_min',
                'p.nopedido',
                'c.nombre as cliente'
            )
            ->get();

        return response()->json($detalles);
    }

    public function areas()
    {
        return AreaTrabajo::where('estado', 1)
            ->orderBy('nombre')
            ->get(['id_areatrabajo', 'nombre']);
    }

    public function pedidosPendientes($fecha)
    {
        $pedidos = DB::table('adm_pedidos_produccion as p')
            ->join('adm_detalle_pedidosproduccion as d', 'd.idpedidoproduccion', '=', 'p.idpedidoproduccion')
            ->whereNotExists(function ($q) use ($fecha) {
                $q->select(DB::raw(1))
                    ->from('adm_planificacion_detalle_produccion as pl')
                    ->whereRaw('pl.iddetallepedidoproduccion = d.iddetallepedidoproduccion')
                    ->where('pl.fecha_programada', $fecha);
            })
            ->select(
                'p.idpedidoproduccion',
                'p.nopedido'
            )
            ->distinct()
            ->get();

        return response()->json($pedidos);
    }

    public function detallesPendientesPorPedido($fecha, $idpedido)
    {
        $detalles = DB::table('adm_detalle_pedidosproduccion as d')
            ->join('adm_pedidos_produccion as p', 'p.idpedidoproduccion', '=', 'd.idpedidoproduccion')
            ->join('clientes as c', 'c.idcliente', '=', 'p.idcliente')
            ->where('p.idpedidoproduccion', $idpedido)
            ->whereNotExists(function ($q) use ($fecha) {
                $q->select(DB::raw(1))
                    ->from('adm_planificacion_detalle_produccion as pl')
                    ->whereRaw('pl.iddetallepedidoproduccion = d.iddetallepedidoproduccion')
                    ->where('pl.fecha_programada', $fecha);
            })
            ->select(
                'd.iddetallepedidoproduccion',
                'd.descripcion',
                'd.duracion_estimada_min',
                'p.nopedido',
                'c.nombre as cliente'
            )
            ->get();

        return response()->json($detalles);
    }
}
