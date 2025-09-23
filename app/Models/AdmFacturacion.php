<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// App\Models\AdmFacturacion.php
class AdmFacturacion extends Model
{
    protected $table = 'adm_facturacion';
    protected $primaryKey = 'idfactura';
    protected $fillable = [
        'idcotizacion','resultado','uuid','serie','numero','descripcion',
        'fecha_certificacion','xml_certificado','alertas','errores','identificador',
        'numero_crtf','tipo_crtf','tipo_especial_crtf','nombre_crtf','email_crtf','direccion_crtf',
        'estado','fecha_anulacion','motivo_anulacion','idusuario_anula','nofactura'
    ];

    public function cotizacion() { return $this->belongsTo(AdmCotizacion::class, 'idcotizacion'); }
}

