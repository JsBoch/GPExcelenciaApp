<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmCotizacion extends Model
{
    use HasFactory;

    protected $table = 'adm_cotizacion';
    protected $primaryKey = 'idcotizacion';
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
    ];

    public function tipoPago()
    {
        return $this->belongsTo(AdmTipoPago::class, 'idtipopago', 'idtipopago');
    }

    public function detalles() { 
        return $this->hasMany(AdmDetalleCotizacion::class, 'idcotizacion', 'idcotizacion'); 
    }
}