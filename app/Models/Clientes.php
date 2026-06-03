<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Clientes extends Model
{
    /** @use HasFactory<\Database\Factories\ClientesFactory> */
    use HasFactory;

    protected $table = 'clientes';
    protected $primaryKey = 'idcliente';
    public $timestamps = false;

    protected $fillable = [
        'idcliente',
        'nit',
        'nombre',
        'direccion',
        'email',
        'comentario',
        'fecharegistro',
        'estado',
        'codigo',
        'iddepartamento',
        'razonsocial',
        'monto_credito',
        'id_empleado',
        'dias_credito',
        'id_municipio',
        'idtipocliente',
        'codigo_postal',
        'cui',
        'usuario_registro',        
        'usuario_modifica',
        'telefono_uno',
        'telefono_dos',
        'telefono_tres',
        'fecha_modificacion',
        'extranjero',
        'pasaporte',
        'excento_iva',
        'idpais',
    ];

    public function empleados(){
        return $this->hasMany(Empleado::class,'id_empleado','id_empleado');
    }

    public function contactos()
    {
        return $this->hasMany(ContactoCliente::class, 'idcliente', 'idcliente');
    }

     public function emails()
    {
        // cliente_emails.idcliente -> clientes.idcliente
        return $this->hasMany(ClienteEmail::class, 'idcliente', 'idcliente');
    }

    public function direcciones()
    {
        // cliente_direcciones.idcliente -> clientes.idcliente
        return $this->hasMany(ClienteDireccion::class, 'idcliente', 'idcliente');
    }
}
