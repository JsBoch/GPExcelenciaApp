<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmPedidosProduccion extends Model
{
    use HasFactory;

    protected $table = 'adm_pedidos_produccion';
    protected $primaryKey = 'idpedidoproduccion';
    public $timestamps = false;
    protected $fillable = [
    'idpedidoproduccion',
    'idcotizacion',
    'nopedido',
    'idpedidoproduccionoriginal',
    'idcliente',
    'idcontacto',
    'fecha_pedido',
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
    'fecha_entrega',
    'no_envio_asociado',

    // NUEVOS CAMPOS
    'permisos_estado',
    'permisos_justificacion',
    'requiere_instalacion',
    'requiere_entrega',
    'montajes_estado',
    'montajes_justificacion',
];


    public function detalles() { 
        return $this->hasMany(AdmDetallePedidosProduccion::class, 'idpedidoproduccion', 'idpedidoproduccion'); 
    }
}