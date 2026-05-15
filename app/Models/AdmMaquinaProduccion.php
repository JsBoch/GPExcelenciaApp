<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdmMaquinaProduccion extends Model
{
    protected $table = 'adm_maquinas_produccion';

    protected $primaryKey = 'idmaquina';

    public $timestamps = false;

    protected $fillable = [
        'nombre',
        'codigo',
        'descripcion',
        'estado',
        'fecha_registro',
        'usuario_registro',
    ];
}