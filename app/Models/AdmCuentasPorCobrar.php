<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\AdmCotizacion;

class AdmCuentasPorCobrar extends Model
{
    protected $table = 'adm_cuentas_porcobrar';
    protected $primaryKey = 'idcuentaporcobrar';
    public $timestamps = false;
    protected $fillable = [
        'idcuentaporcobrar',
        'idcotizacion',
        'idcliente',
        'fecha_emision',
        'fecha_vencimiento',
        'moneda',
        'tasa_cambio',
        'monto_original',
        'saldo_pendiente',
        'monto_pagado',
        'descuento_aplicado',
        'idusuario_creacion',
        'usuario_creacion',
        'fecha_creacion',
        'idusuario_modificacion',
        'usuario_modificacion',
        'fecha_modificacion',
        'origen_registro',
        'centro_costo',
        'cuenta_contable',
        'estatus_riesgo',
        'estado',
    ];

    public function cotizacion()
    {
        return $this->belongsTo(AdmCotizacion::class, 'idcotizacion', 'idcotizacion');
    }

    public function recibos()
{
  return $this->hasMany(AdmRecibo::class, 'idcuentaporcobrar')
              ->where('estado', 1);
}
}
