<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdmReciboDetalle extends Model
{
    protected $table = 'adm_recibo_detalle';
    protected $primaryKey = 'idrecibodet';
    public $timestamps = true;

    protected $fillable = [
        'idrecibo', 'idcuentaporcobrar', 'monto',
    ];

    public function recibo() {
        return $this->belongsTo(AdmRecibo::class, 'idrecibo', 'idrecibo');
    }

    public function cuenta() {
        return $this->belongsTo(AdmCuentasPorCobrar::class, 'idcuentaporcobrar', 'idcuentaporcobrar');
    }
}
