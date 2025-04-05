<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ContactoCliente extends Model
{
     /** @use HasFactory<\Database\Factories\ClientesFactory> */
     use HasFactory;

     protected $table = 'contacto_cliente';
     protected $primaryKey = 'id_contactocliente';
     public $timestamps = false;
 
     protected $fillable = [
         'id_contactocliente',
         'idcliente',
         'nombre',
         'telefono',
         'correo',
         'puesto',
         'observaciones',
         'fecha_registro',
         'usuario_registro',
         'estado'
     ];
 
     public function clientes()
    {
        return $this->belongsTo(Clientes::class, 'idcliente', 'idcliente');
    }
}
