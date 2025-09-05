<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdmRecibo extends Model
{
    protected $table = 'adm_recibos';
    protected $primaryKey = 'idrecibo';
    public $timestamps = false;

    protected $fillable = [
        'idrecibo',
        'idcuentaporcobrar',
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

    public function cuenta()
    {
        return $this->belongsTo(AdmCuentasPorCobrar::class, 'idcuentaporcobrar', 'idcuentaporcobrar');
    }

    public function cliente()
    {
        return $this->belongsTo(Clientes::class, 'idcliente', 'idcliente');
    }
}
