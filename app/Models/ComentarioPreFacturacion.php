<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ComentarioPreFacturacion extends Model
{
    use HasFactory;

    protected $table = 'adm_comentarios_prefacturacion';
    protected $primaryKey = 'idcomentarioprefacturacion';
    public $timestamps = false;
    protected $fillable = [
        'idcomentarioprefacturacion',
        'idcotizacion',
        'fecha_registro',
        'idusuario',
        'comentario',        
        'estado',
    ];

    public function cotizacion()
    {
        return $this->belongsTo(AdmCotizacion::class, 'idcotizacion', 'idcotizacion');
    }
}
