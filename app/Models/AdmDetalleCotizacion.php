<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmDetalleCotizacion extends Model
{
    use HasFactory;

    protected $table = 'adm_detalle_cotizacion';
    protected $primaryKey = 'iddetallecotizacion';
    public $timestamps = false;
    protected $fillable = [
        'iddetallecotizacion',
        'idcotizacion',
        'idproducto',
        'producto',
        'titulo',
        'descripcion',
        'cantidad',
        'ancho',
        'alto',
        'profundidad',        
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
        'precio_unitario',
        'precio',        
        'descuento',
        'impuesto_iva',
        'subtotal',
        'total',
        'porcentaje_aplicado',
    ];

    public function cotizacion()
    {
        return $this->belongsTo(AdmCotizacion::class, 'idcotizacion', 'idcotizacion');
    }
}