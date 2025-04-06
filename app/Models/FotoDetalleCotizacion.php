<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FotoDetalleCotizacion extends Model
{
    use HasFactory;

    protected $table = 'foto_detalle_cotizacion';
    protected $primaryKey = 'idfoto';
    public $timestamps = false;
    protected $fillable = [
        'idfoto',
        'iddetallecotizacion',
        'ruta',
        'nombre_imagen',
        'estado',
        'foto',        
    ];

    public function detalleCotizacion()
    {
        return $this->belongsTo(AdmDetalleCotizacion::class, 'iddetallecotizacion', 'iddetallecotizacion');
    }
}
