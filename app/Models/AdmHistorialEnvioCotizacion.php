<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdmHistorialEnvioCotizacion extends Model
{
    
    protected $table = 'adm_historial_envioscotizacion';
    protected $primaryKey = 'idhistorialenvio';
    public $timestamps = false;
    protected $fillable = [
        'idhistorialenvio',
        'idcotizacion',
        'fecha_cotizacion',
        'fecha_envio',
    ];

    public function cotizacion()
    {
        return $this->belongsTo(AdmCotizacion::class, 'idcotizacion', 'idcotizacion');
    }
}
