<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pais extends Model
{
    protected $table = 'adm_pais';
    protected $primaryKey = 'idpais';
    public $timestamps = false;

    protected $fillable = [
        'codigo_iso',
        'nombre',
        'estado',
    ];
}