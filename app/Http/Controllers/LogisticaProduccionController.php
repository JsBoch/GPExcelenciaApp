<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LogisticaProduccionController extends Controller
{
    public function board()
    {
        $areas = DB::table('area_trabajo')
            ->where('estado', 1)
            ->orderBy('nombre')
            ->select(
                'id_areatrabajo',
                'nombre',
                'descripcion',
                'capacidad_diaria_min'
            )
            ->get();

        $items = DB::table('adm_pedido_produccion_areas as pa')
            ->join('adm_pedidos_produccion as p', 'pa.idpedidoproduccion', '=', 'p.idpedidoproduccion')
            ->join('area_trabajo as a', 'pa.id_areatrabajo', '=', 'a.id_areatrabajo')
            ->join('clientes as cl', 'p.idcliente', '=', 'cl.idcliente')
            ->leftJoin('contacto_cliente as ct', 'p.idcontacto', '=', 'ct.id_contactocliente')
            ->leftJoin('adm_empleados as e', 'p.idusuario', '=', 'e.iduser')
            ->where('p.estado', 3)
            ->where('pa.estado', 1)
            ->select(
                'pa.id',
                'pa.idpedidoproduccion',
                'pa.id_areatrabajo',
                'pa.fecha_programada',
                'pa.fecha_logistica',
                'pa.orden',
                'pa.estado_logistica',
                'pa.prioridad',
                'pa.observaciones_logistica',
                'p.nopedido',
                DB::raw("CONCAT('P-', p.nopedido) as nopedido_texto"),
                'p.nocotizacion',
                'p.trabajo',
                'p.fecha_pedido',
                'p.fecha_entrega',
                'p.direccion_entrega',
                'cl.nombre as cliente',
                'ct.nombre as contacto',
                'e.nombre as asesor',
                'a.nombre as area'
            )
            ->orderBy('pa.orden')
            ->get();

        return response()->json([
            'areas' => $areas,
            'items' => $items,
        ]);
    }

    public function cambiarFecha(Request $request, $id)
    {
        $data = $request->validate([
            'fecha_logistica' => 'required|date',
        ]);

        $item = DB::table('adm_pedido_produccion_areas')
            ->where('id', $id)
            ->first();

        if (!$item) {
            return response()->json([
                'message' => 'Registro de área no encontrado'
            ], 404);
        }

        DB::table('adm_pedido_produccion_areas')
            ->where('id', $id)
            ->update([
                'fecha_logistica' => $data['fecha_logistica'],
                'usuario_logistica' => auth()->user()->name ?? auth()->user()->usuario ?? 'system',
            ]);

        return response()->json([
            'message' => 'Fecha actualizada correctamente'
        ]);
    }

    public function cambiarEstado(Request $request, $id)
    {
        $data = $request->validate([
            'estado_logistica' => 'required|in:PENDIENTE,EN_PROCESO,PAUSADO,FINALIZADO',
        ]);

        $update = [
            'estado_logistica' => $data['estado_logistica'],
            'usuario_logistica' => auth()->user()->name ?? auth()->user()->usuario ?? 'system',
        ];

        if ($data['estado_logistica'] === 'EN_PROCESO') {
            $update['fecha_inicio_real'] = now();
        }

        if ($data['estado_logistica'] === 'FINALIZADO') {
            $update['fecha_fin_real'] = now();
        }

        DB::table('adm_pedido_produccion_areas')
            ->where('id', $id)
            ->update($update);

        return response()->json([
            'message' => 'Estado actualizado correctamente'
        ]);
    }

    public function calendario()
    {
        $items = DB::table('adm_pedido_produccion_areas as pa')
            ->join('adm_pedidos_produccion as p', 'pa.idpedidoproduccion', '=', 'p.idpedidoproduccion')
            ->join('area_trabajo as a', 'pa.id_areatrabajo', '=', 'a.id_areatrabajo')
            ->join('clientes as cl', 'p.idcliente', '=', 'cl.idcliente')
            ->where('p.estado', 3)
            ->where('pa.estado', 1)
            ->whereNotNull('pa.fecha_logistica')
            ->select(
                'pa.id',
                'pa.idpedidoproduccion',
                'pa.id_areatrabajo',
                'pa.fecha_logistica',
                'pa.estado_logistica',
                'p.nopedido',
                DB::raw("CONCAT('P-', p.nopedido, ' - ', cl.nombre, ' - ', a.nombre) as title"),
                'a.nombre as area',
                'cl.nombre as cliente'
            )
            ->get();

        return response()->json($items);
    }

    public function cargaPorFecha(Request $request)
    {
        $fecha = $request->query('fecha');

        $query = DB::table('adm_pedido_produccion_areas as pa')
            ->join('area_trabajo as a', 'pa.id_areatrabajo', '=', 'a.id_areatrabajo')
            ->join('adm_pedidos_produccion as p', 'pa.idpedidoproduccion', '=', 'p.idpedidoproduccion')
            ->where('p.estado', 3)
            ->where('pa.estado', 1);

        if ($fecha) {
            $query->whereDate('pa.fecha_logistica', $fecha);
        }

        $carga = $query
            ->groupBy(
                'a.id_areatrabajo',
                'a.nombre',
                'a.capacidad_diaria_min'
            )
            ->select(
                'a.id_areatrabajo',
                'a.nombre',
                'a.capacidad_diaria_min',
                DB::raw('COUNT(pa.id) as total_trabajos')
            )
            ->get();

        return response()->json($carga);
    }
}