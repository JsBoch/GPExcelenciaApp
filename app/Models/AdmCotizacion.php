<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmCotizacion extends Model
{
    use HasFactory;

    protected $table = 'adm_cotizacion';
    protected $primaryKey = 'idcotizacion';
    // Usas correlativo propio → no autoincrementes
    public $incrementing = false;

    // Si la PK es numérica, deja el cast:
    protected $keyType = 'int';
    public $timestamps = false;
    protected $fillable = [
        'idcotizacion',
        'idcotizacionoriginal',
        'idcliente',
        'idcontacto',
        'fecha_cotizacion',
        'trabajo',
        'observaciones_costeo',
        'observaciones_cliente',
        'total_general',
        'costeo_observaciones',
        'nocotizacion',
        'version',
        'idtipopago',
        'direccion_entrega',
        'costear',
        'total_general',
        'fecha_registro',
        'usuario_registro',
        'fecha_modificacion',
        'usuario_modificacion',
        'estado',
        'idusuario',
        'fecha_costeo',
        'usuario_costeo',
        'archivo_costeo',
        'resultado',
        'uuid',
        'serie',
        'numero',
        'descripcion',
        'fecha_certificacion',
        'xml_certificado',
        'alertas',
        'identificador',
        'errores',
        'nofactura',
        'idmotivorechazo',
        'fecha_rechazo',
        'usuario_rechazo',
        'fecha_prefacturacion',
        'fecha_facturacion',
        'idempotency_key',
        'tipo_facturacion',
        'subtotal',
        'descuento_porcentaje',
        'descuento_monto',
        'impuesto_iva',
        'total',
        'modo_descuento',
    ];

    protected $casts = [
        'fecha_prefacturacion' => 'datetime',
        'fecha_facturacion'    => 'datetime',
        'total_general'        => 'float',
    ];
    public function tipoPago()
    {
        return $this->belongsTo(AdmTipoPago::class, 'idtipopago', 'idtipopago');
    }

    public function detalles()
    {
        return $this->hasMany(AdmDetalleCotizacion::class, 'idcotizacion', 'idcotizacion');
    }

    public function motivoRehazo()
    {
        return $this->hasMany(AdmMotivosRechazo::class, 'idmotivorechazo', 'idmotivorechazo');
    }

    public function comentarios_prefacturacion()
    {
        return $this->hasMany(ComentarioPreFacturacion::class, 'idcotizacion', 'idcotizacion');
    }

    public function cuentaPorCobrar()
    {
        return $this->hasOne(AdmCuentasPorCobrar::class, 'idcotizacion', 'idcotizacion');
    }

    public function comentariosPrefac()
    {
        return $this->hasMany(ComentarioPreFacturacion::class, 'idcotizacion', 'idcotizacion');
    }

    public function facturas()
    {
        return $this->hasMany(AdmFacturacion::class, 'idcotizacion')->orderByDesc('idfactura');
    }
    public function facturaVigente()
    {
        return $this->hasOne(AdmFacturacion::class, 'idcotizacion')->where('estado', 1)->latest('idfactura');
    }
}
