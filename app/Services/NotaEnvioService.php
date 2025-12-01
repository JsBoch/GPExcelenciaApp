<?php

namespace App\Services;

use App\Models\AdmCotizacion;
use Illuminate\Support\Facades\DB;

class NotaEnvioService
{
    public function obtenerConfigNotaEnvio(int $idCotizacion)
    {
        $cot = AdmCotizacion::with('cliente')
            ->where('idcotizacion', $idCotizacion)
            ->firstOrFail();

        // Obtener detalles con entregas realizadas
        $detalles = DB::table('adm_detalle_cotizacion as d')
            ->leftJoin('adm_envio_item as ei', 'ei.iddetallecotizacion', '=', 'd.iddetallecotizacion')
            ->select(
                'd.iddetallecotizacion',
                'd.descripcion',
                'd.cantidad',
                DB::raw('COALESCE(SUM(ei.cantidad),0) as cantidad_enviada'),
                DB::raw('(d.cantidad - COALESCE(SUM(ei.cantidad),0)) as cantidad_pendiente'),
                DB::raw('MAX(ei.no_envio) as numero_envio')
            )
            ->where('d.idcotizacion', $idCotizacion)
            ->groupBy(
                'd.iddetallecotizacion',
                'd.descripcion',
                'd.cantidad'
            )
            ->get();

        // Listado de envíos (tabla correcta)
        $envios = DB::table('adm_historial_envioscotizacion')
            ->where('idcotizacion', $idCotizacion)
            ->select('no_envio', 'fecha_envio')
            ->orderBy('no_envio')
            ->get();

        $siguiente = $envios->count() > 0 
            ? ($envios->max('no_envio') + 1) 
            : 1;

        return [
            'cotizacion'        => $cot,
            'detalles'          => $detalles,
            'envios'            => $envios,
            'siguiente_envio'   => $siguiente,
        ];
    }
}
