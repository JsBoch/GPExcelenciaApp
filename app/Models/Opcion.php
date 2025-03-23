<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Opcion extends Model
{
    use HasFactory;

    protected $table = 'opciones';
    protected $primaryKey = 'id_opcion';
    public $timestamps = true;

    protected $fillable = [
        'nombre',
        'ruta',
        'descripcion',
    ];

    public function perfiles()
    {
        return $this->belongsToMany(Perfil::class, 'opcion_perfil', 'id_opcion', 'id_perfil');
    }
}