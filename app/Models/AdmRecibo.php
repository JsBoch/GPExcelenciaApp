<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdmRecibo extends Model
{
    protected $table = 'adm_recibos';
    protected $primaryKey = 'idrecibo';
    public $timestamps = false;

    // 👇 CLAVES:
    public $incrementing = false;   // NO es autoincremental (usas correlativo)
    protected $keyType = 'int';     // clave numérica

    protected $fillable = [
        'idrecibo',
        // 'idcuentaporcobrar', // si ya no usas, puedes quitarlo del fillable
        'idcliente',
        'fecha_recibo',
        'monto_recibido',
        'metodo_pago',
        'referencia',
        'banco',
        'moneda',
        'tasa_cambio',
        'observaciones',
        'idusuario_creacion',
        'usuario_creacion',
        'fecha_creacion',
        'idusuario_modificacion',
        'usuario_modificacion',
        'fecha_modificacion',
        'estado',
        'serie',
        'numero',
        'tipo',
        'nofactura',
    ];

    public function cuenta()   { return $this->belongsTo(AdmCuentasPorCobrar::class, 'idcuentaporcobrar', 'idcuentaporcobrar'); }
    public function cliente()  { return $this->belongsTo(Clientes::class, 'idcliente', 'idcliente'); }
    public function detalles() { return $this->hasMany(AdmReciboDetalle::class, 'idrecibo', 'idrecibo'); }
    public function cuentas()
{
    return $this->belongsToMany(\App\Models\AdmCuentasPorCobrar::class, 'adm_recibo_detalle', 'idrecibo', 'idcuentaporcobrar')
        ->withPivot('monto')
        ->withTimestamps();
}
}

