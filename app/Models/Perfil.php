<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Perfil extends Model
{
    use HasFactory;

    protected $table = 'perfiles';
    protected $primaryKey = 'id_perfil';
    public $timestamps = true;

    protected $fillable = [
        'nombre',
        'descripcion',
    ];

    public function opciones()
    {
        return $this->belongsToMany(Opcion::class, 'opcion_perfil', 'id_perfil', 'id_opcion');
    }

    public function usuarios()
    {
        return $this->belongsToMany(User::class, 'perfil_usuario', 'perfil_id', 'user_id');
    }
}