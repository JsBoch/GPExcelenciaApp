<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AreaTrabajo extends Model
{
    use HasFactory;

    protected $table = 'area_trabajo';
    protected $primaryKey = 'id_areatrabajo';
    public $timestamps = false;

    protected $fillable = [
        'id_areatrabajo',
        'nombre',
        'descripcion',
        'fecha_registro',
        'usuario_registro',
        'estado',
    ];
}