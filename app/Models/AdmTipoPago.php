<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmTipoPago extends Model
{
    use HasFactory;

    protected $table = 'adm_tipo_pago';
    protected $primaryKey = 'idtipopago';
    public $timestamps = false;
    protected $fillable = ['tipo','estado'];
}