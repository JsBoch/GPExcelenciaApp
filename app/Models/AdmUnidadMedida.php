<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmUnidadMedida extends Model
{
    use HasFactory;

    protected $table = 'adm_unidad_medida';
    protected $primaryKey = 'idunidadmedida';
    public $timestamps = false;
    protected $fillable = ['unidad','estado'];
}