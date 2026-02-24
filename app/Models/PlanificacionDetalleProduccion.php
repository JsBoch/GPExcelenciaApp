<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlanificacionDetalleProduccion extends Model
{
    protected $table = 'adm_planificacion_detalle_produccion';
    protected $primaryKey = 'id_planificacion';
    public $timestamps = false;

    protected $fillable = [
        'id_planificacion',
        'iddetallepedidoproduccion',
        'id_areatrabajo',
        'fecha_programada',
        'orden_cola',
        'estado',
        'fecha_registro',
        'usuario_registro',
        'fecha_modificacion',
        'usuario_modificacion'
    ];

    public function detalle()
    {
        return $this->belongsTo(
            AdmDetallePedidosProduccion::class,
            'iddetallepedidoproduccion'
        );
    }

    public function area()
    {
        return $this->belongsTo(
            AreaTrabajo::class,
            'id_areatrabajo'
        );
    }
}