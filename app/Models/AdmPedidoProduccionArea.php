<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdmPedidoProduccionArea extends Model
{
    protected $table = 'adm_pedido_produccion_areas';

    protected $primaryKey = 'id';

    public $timestamps = false;

    protected $fillable = [
        'idpedidoproduccion',
        'id_areatrabajo',
        'fecha_programada',
        'orden',
        'estado',
        'fecha_registro',
        'usuario_registro',
    ];
}