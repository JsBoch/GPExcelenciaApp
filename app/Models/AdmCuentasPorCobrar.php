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
        'idcuentaporcobrar','idcotizacion','idcliente','fecha_emision','fecha_vencimiento',
        'moneda','tasa_cambio','monto_original','saldo_pendiente','monto_pagado',
        'descuento_aplicado','idusuario_creacion','usuario_creacion','fecha_creacion',
        'idusuario_modificacion','usuario_modificacion','fecha_modificacion',
        'origen_registro','centro_costo','cuenta_contable','estatus_riesgo','estado','idfactura',
    ];

    public function cotizacion()
    {
        return $this->belongsTo(AdmCotizacion::class, 'idcotizacion', 'idcotizacion');
    }

    // ✅ SOLO pivote
    public function recibos()
    {
        return $this->belongsToMany(\App\Models\AdmRecibo::class, 'adm_recibo_detalle', 'idcuentaporcobrar', 'idrecibo')
            ->withPivot('monto')
            ->where('adm_recibos.estado', 1)
            ->orderBy('adm_recibos.fecha_recibo', 'asc');
    }

    public function factura()
    {
        // Usa la más reciente por created_at (sin latestOfMany para evitar SQL complejo)
        return $this->hasOne(\App\Models\AdmFacturacion::class, 'idcotizacion', 'idcotizacion')
            ->where('adm_facturacion.estado', 1)
            ->orderBy('adm_facturacion.created_at', 'desc');
    }
}
