<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AdmCotizacion;
use App\Models\AdmTipoPago;
use App\Models\ComentarioPreFacturacion;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CotizacionConsultasController extends Controller
{
    public function index(Request $request)
    {
        $userId = Auth::id(); // Usa Sanctum para obtener el usuario autenticado
        $verTodas = auth()->user()->cotizaciones_todas === 'S';

        $cotizacionesQuery = AdmCotizacion::select(
            'adm_cotizacion.idcotizacion',
            DB::raw('CONCAT(\'CT\',CAST(adm_cotizacion.nocotizacion AS CHAR)) as nocotizacion'),
            DB::raw('DATE(adm_cotizacion.fecha_cotizacion) as fecha_cotizacion'),
            'adm_cotizacion.estado',
            'adm_tipo_pago.tipo as tipo_pago',
            'adm_cotizacion.total_general',
            'adm_cotizacion.direccion_entrega',
            'adm_cotizacion.observaciones_cliente',
            DB::raw(
                "CASE
                    WHEN adm_cotizacion.estado = 1 THEN 'REGISTRO'
                    WHEN adm_cotizacion.estado = 2 THEN 'COSTEO'
                    WHEN adm_cotizacion.estado = 3 THEN 'COSTEADA'
                    WHEN adm_cotizacion.estado = 4 THEN 'PRE-FACTURACION'
                    WHEN adm_cotizacion.estado = 5 THEN 'PARA FACTURAR'
                    WHEN adm_cotizacion.estado = 6 THEN 'FACTURADA'
                    WHEN adm_cotizacion.estado = 7 THEN 'ANULADA'
                    WHEN adm_cotizacion.estado = 8 THEN 'RECHAZADA'
                    ELSE 'DESCONOCIDO'
                END as estado_texto"
            )
        )
            ->join('adm_tipo_pago', 'adm_cotizacion.idtipopago', '=', 'adm_tipo_pago.idtipopago')
            ->where('adm_cotizacion.estado', 4);
        // ✅ Solo filtramos por usuario si NO tiene permiso para ver todas
        if (!$verTodas) {
            $cotizacionesQuery->where('adm_cotizacion.idusuario', $userId);
        }

        $cotizaciones = $cotizacionesQuery->get();

        return response()->json($cotizaciones);
    }

    public function storeComentario(Request $request)
    {
        try {
            DB::beginTransaction();

            $request->validate([
                'idcotizacion' => 'required|integer|exists:adm_cotizacion,idcotizacion',
                'comentario' => 'required|string|max:1000',
            ]);

            $correlativo = DB::table('cor_correlativo')->where('tabla', 'adm_comentarios_prefacturacion')->lockForUpdate()->first();

            if (!$correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para comentarios'], 400);
            }

            $idComentario = $correlativo->correlativo + $correlativo->incremento;

            // Actualiza correlativo
            DB::table('cor_correlativo')
                ->where('tabla', 'adm_comentarios_prefacturacion')
                ->update(['correlativo' => $idComentario]);

            // Guarda comentario
            $comentario = new ComentarioPreFacturacion();
            $comentario->idcomentarioprefacturacion = $idComentario;
            $comentario->idcotizacion = $request->idcotizacion;
            $comentario->comentario = $request->comentario;
            $comentario->fecha_registro = now();
            $comentario->idusuario = auth()->id();
            $comentario->estado = 1;
            $comentario->save();

            DB::commit();

            return response()->json([
                'message' => 'Comentario registrado exitosamente',
                'comentario' => $comentario,
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Error al guardar comentario: ' . $e->getMessage()
            ], 500);
        }
    }

    public function comentarios(Request $request, $idcotizacion)
    {
        $query = ComentarioPreFacturacion::query()
            ->select(
                'adm_comentarios_prefacturacion.*',
                'adm_empleados.nombre as nombre_usuario'
            )
            ->leftJoin('adm_empleados', 'adm_empleados.iduser', '=', 'adm_comentarios_prefacturacion.idusuario')
            ->where('adm_comentarios_prefacturacion.idcotizacion', $idcotizacion)
            ->orderByDesc('adm_comentarios_prefacturacion.fecha_registro');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('adm_comentarios_prefacturacion.comentario', 'LIKE', "%{$search}%");
        }

        $comentarios = $query->paginate(5);

        return response()->json($comentarios);
    }
}
