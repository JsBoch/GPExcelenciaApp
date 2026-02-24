<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlanificacionProduccion extends Model
{
    protected $table = 'adm_planificacion_produccion';
    protected $primaryKey = 'id_planificacion';
    public $timestamps = false;

    protected $fillable = [
        'id_planificacion',
        'idpedidoproduccion',
        'id_areatrabajo',
        'fecha_programada',
        'orden_cola',
        'estado',
        'fecha_registro',
        'usuario_registro',
        'fecha_modificacion',
        'usuario_modificacion'
    ];

    public function pedido()
    {
        return $this->belongsTo(AdmPedidosProduccion::class, 'idpedidoproduccion');
    }

    public function area()
    {
        return $this->belongsTo(AreaTrabajo::class, 'id_areatrabajo');
    }
}