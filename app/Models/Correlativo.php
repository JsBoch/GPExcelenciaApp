<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Correlativo extends Model
{
    use HasFactory;

    protected $table = 'cor_correlativo';
    protected $primaryKey = 'tabla'; // Asumiendo que 'tabla' es la clave primaria
    public $timestamps = false;

    protected $fillable = ['correlativo', 'incremento'];
}