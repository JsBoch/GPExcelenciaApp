<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Puesto extends Model
{
    use HasFactory;

    protected $table = 'adm_puestos';
    protected $primaryKey = 'id_puesto';
    public $timestamps = false;

    protected $fillable = ['nombre']; // Asegúrate de incluir los campos que necesitas

    //Esto es la relación entre la tabla empleado y la tabla identificacion, una identificacion puede tener varios empleados
    public function empleados(){
        return $this->hasMany(Empleado::class,'id_puesto','id_puesto');
    }
}