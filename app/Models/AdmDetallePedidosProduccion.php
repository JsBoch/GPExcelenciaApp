<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmDetallePedidosProduccion extends Model
{
    use HasFactory;

    protected $table = 'adm_detalle_pedidosproduccion';
    protected $primaryKey = 'iddetallepedidoproduccion';
    public $timestamps = false;
    protected $fillable = [
        'iddetallepedidoproduccion',
        'idpedidoproduccion',
        'idproducto',
        'producto',
        'titulo',
        'descripcion',
        'cantidad',
        'ancho',
        'alto',
        'profundidad',
        'precio',
        'total',
        'fecha_registro',
        'usuario_registro',
        'costeado',
        'fecha_costeo',
        'usuario_costeo',
        'estado',
        'incluye_foto',        
        'unidad_medida',
        'm2',    
        'imagen',    
        'material',
        'caras',
        'maquina',
        'acabados',
        'version',
    ];

    public function pedidos_produccion()
    {
        return $this->belongsTo(AdmPedidosProduccion::class, 'idpedidoproduccion', 'idpedidoproduccion');
    }
}