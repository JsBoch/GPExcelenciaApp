<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Departamento extends Model
{
    use HasFactory;

    protected $table = 'adm_departamento';
    protected $primaryKey = 'id_departamento';
    public $timestamps = false;

    protected $fillable = ['nombre']; // Asegúrate de incluir los campos que necesitas

    //Esto es la relación entre la tabla empleado y la tabla identificacion, una identificacion puede tener varios empleados
    public function empleados(){
        return $this->hasMany(Empleado::class,'id_departamento','id_departamento');
    }
}