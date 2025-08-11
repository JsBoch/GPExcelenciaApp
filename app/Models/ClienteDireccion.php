<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClienteDireccion extends Model
{
    protected $table = 'cliente_direcciones';
    protected $fillable = [
        'idcliente',
        'direccion',
        'referencia',
        'ciudad',
        'iddepartamento',
        'pais',
        'lat',
        'lng',
        'es_principal',
        'estado'
    ];

    protected $casts = [
        'lat' => 'decimal:7',
        'lng' => 'decimal:7',
        'es_principal' => 'boolean',
        'estado' => 'integer',
    ];
}
