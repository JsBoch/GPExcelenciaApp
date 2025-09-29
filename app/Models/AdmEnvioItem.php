<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdmEnvioItem extends Model
{
    protected $table = 'adm_envio_item';
    protected $fillable = ['idcotizacion', 'iddetallecotizacion', 'no_envio', 'cantidad'];
}
