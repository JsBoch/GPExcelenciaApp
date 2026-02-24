<?php

namespace App\Http\Controllers;

use App\Models\PlanificacionProduccion;
use App\Models\Correlativo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlanificacionProduccionController extends Controller
{
    public function indexPorFecha($fecha)
    {
        $rows = PlanificacionProduccion::with(['pedido','area'])
            ->where('fecha_programada', $fecha)
            ->orderBy('orden_cola')
            ->get();

        return response()->json($rows);
    }

    public function store(Request $request)
    {
        DB::beginTransaction();

        try {

            $correlativo = Correlativo::find('planificacion_produccion');

            $id = $correlativo->correlativo + $correlativo->incremento;
            $correlativo->correlativo = $id;
            $correlativo->save();

            // Calcular siguiente orden en cola
            $maxOrden = PlanificacionProduccion::where('fecha_programada', $request->fecha_programada)
                ->where('id_areatrabajo', $request->id_areatrabajo)
                ->max('orden_cola');

            $orden = $maxOrden ? $maxOrden + 1 : 1;

            PlanificacionProduccion::create([
                'id_planificacion' => $id,
                'idpedidoproduccion' => $request->idpedidoproduccion,
                'id_areatrabajo' => $request->id_areatrabajo,
                'fecha_programada' => $request->fecha_programada,
                'orden_cola' => $orden,
                'estado' => 'PENDIENTE',
                'fecha_registro' => now(),
                'usuario_registro' => auth()->user()->name
            ]);

            DB::commit();

            return response()->json(['message'=>'Asignado correctamente'],201);

        } catch(\Exception $e){
            DB::rollBack();
            return response()->json(['message'=>$e->getMessage()],500);
        }
    }

    public function mover(Request $request, $id)
    {
        $plan = PlanificacionProduccion::find($id);

        $plan->fecha_programada = $request->fecha_programada;
        $plan->id_areatrabajo = $request->id_areatrabajo;
        $plan->orden_cola = $request->orden_cola;
        $plan->fecha_modificacion = now();
        $plan->usuario_modificacion = auth()->user()->name;
        $plan->save();

        return response()->json(['message'=>'Trabajo reprogramado']);
    }
}