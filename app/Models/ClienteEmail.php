<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClienteEmail extends Model
{
    protected $table = 'cliente_emails';
    protected $fillable = [
        'idcliente',
        'email',
        'tipo',
        'es_principal',
        'estado'
    ];

    protected $casts = [
        'es_principal' => 'boolean',
        'estado' => 'integer',
    ];
}
