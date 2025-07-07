<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmMotivosRechazo extends Model
{
     use HasFactory;

    protected $table = 'adm_motivos_rechazo';
    protected $primaryKey = 'idmotivorechazo';
    public $timestamps = false;
    protected $fillable = [
        'idmotivorechazo',
        'motivo',
        'estado',
    ];

    public function cotizacion()
    {
        return $this->belongsTo(AdmCotizacion::class, 'idcotizacion', 'idcotizacion');
    }
    
}
