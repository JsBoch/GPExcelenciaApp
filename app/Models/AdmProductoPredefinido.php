<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AdmProductoPredefinido extends Model
{
    use HasFactory;

    protected $table = 'adm_productos_predefinidos';
    protected $primaryKey = 'idproductopredefinido';
    public $timestamps = false;

    protected $fillable = [
        'idproductopredefinido',
        'titulo',
        'descripcion',
        'ancho',
        'alto',
        'profundidad',
        'precio',
        'observaciones',
        'usuario_registro',
        'fecha_registro',
        'usuario_modificacion',
        'fecha_modificacion',
        'estado',
        'cantidad',
        'cantidad_uno',
        'cantidad_dos',
        'cantidad_tres',
        'cantidad_cuatro',
        'precio_uno',
        'precio_dos',
        'precio_tres',
        'precio_cuatro',
        'variacion',
        'idunidadmedida',
        'unidad_medida',        
    ];    
}