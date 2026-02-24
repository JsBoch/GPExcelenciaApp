<?php

namespace App\Services;

use App\Models\AreaTrabajo;
use App\Models\PlanificacionDetalleProduccion;
use Illuminate\Support\Facades\DB;

class PlanificacionDetalleService
{
   

    public function validarCapacidad(int $idArea, string $fecha, int $minutosExtra = 0): void
    {
        $area = AreaTrabajo::where('id_areatrabajo', $idArea)->firstOrFail();

        $usado = PlanificacionDetalleProduccion::query()
            ->join('adm_detalle_pedidosproduccion as d', 'd.iddetallepedidoproduccion', '=', 'adm_planificacion_detalle_produccion.iddetallepedidoproduccion')
            ->where('adm_planificacion_detalle_produccion.id_areatrabajo', $idArea)
            ->where('adm_planificacion_detalle_produccion.fecha_programada', $fecha)
            ->sum('d.duracion_estimada_min');

        if (($usado + $minutosExtra) > (int)$area->capacidad_diaria_min) {
            throw new \Exception("Capacidad excedida. Usado: {$usado} min, Capacidad: {$area->capacidad_diaria_min} min.");
        }
    }

    public function reordenar(int $idArea, string $fecha, array $idsPlanificacionEnOrden): void
    {
        DB::transaction(function () use ($idArea, $fecha, $idsPlanificacionEnOrden) {
            $count = PlanificacionDetalleProduccion::where('id_areatrabajo', $idArea)
                ->where('fecha_programada', $fecha)
                ->whereIn('id_planificacion', $idsPlanificacionEnOrden)
                ->count();

            if ($count !== count($idsPlanificacionEnOrden)) {
                throw new \Exception("Lista inválida para reordenamiento.");
            }

            foreach ($idsPlanificacionEnOrden as $i => $idPlan) {
                PlanificacionDetalleProduccion::where('id_planificacion', $idPlan)
                    ->update(['orden_cola' => $i + 1]);
            }
        });
    }

    public function mover(int $idPlan, int $toArea, string $toFecha, int $toIndex): void
    {
        DB::transaction(function () use ($idPlan, $toArea, $toFecha, $toIndex) {

            $plan = PlanificacionDetalleProduccion::with('detalle')->lockForUpdate()->findOrFail($idPlan);

            $fromArea  = (int)$plan->id_areatrabajo;
            $fromFecha = (string)$plan->fecha_programada;

            $minutosItem = (int)($plan->detalle->duracion_estimada_min ?? 0);

            // Si cambia de columna o fecha -> validar capacidad destino
            if ($fromArea !== $toArea || $fromFecha !== $toFecha) {
                $this->validarCapacidad($toArea, $toFecha, $minutosItem);
            }

            // 1) Compactar origen
            PlanificacionDetalleProduccion::where('id_areatrabajo', $fromArea)
                ->where('fecha_programada', $fromFecha)
                ->where('orden_cola', '>', $plan->orden_cola)
                ->decrement('orden_cola', 1);

            // 2) Hacer espacio en destino
            $destCount = PlanificacionDetalleProduccion::where('id_areatrabajo', $toArea)
                ->where('fecha_programada', $toFecha)
                ->count();

            $toIndex = max(0, min($toIndex, $destCount)); // clamp

            PlanificacionDetalleProduccion::where('id_areatrabajo', $toArea)
                ->where('fecha_programada', $toFecha)
                ->where('orden_cola', '>=', $toIndex + 1)
                ->increment('orden_cola', 1);

            // 3) Actualizar registro
            $plan->id_areatrabajo = $toArea;
            $plan->fecha_programada = $toFecha;
            $plan->orden_cola = $toIndex + 1;
            $plan->fecha_modificacion = now();
            $plan->usuario_modificacion = auth()->user()->name;
            $plan->save();
        });
    }
}