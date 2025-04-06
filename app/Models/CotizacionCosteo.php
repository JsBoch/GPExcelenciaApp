<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CotizacionCosteo extends Model
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
    ];

    public function tipoPago()
    {
        return $this->belongsTo(AdmTipoPago::class, 'idtipopago', 'idtipopago');
    }

    public function detalles() { 
        return $this->hasMany(AdmDetalleCotizacion::class, 'idcotizacion', 'idcotizacion'); 
    }
}
