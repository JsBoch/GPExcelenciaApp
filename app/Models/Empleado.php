<?php
namespace App\Models;
/*

* trait: es un mecanismo de reutilización de código, permite agrupar un conjunto de métodos que pueden
ser incluidos en múltiples clases, sin necesidad de recurrir a la herencia múltiple

Eloquent: es un ORM (Object-Relational-Mapper) incluido en Laravel, esta es una herramienta
que permite interactuar con la base de datos utilizando objetos de PHP en lugar de escribir
consultar directamente. Los Modelos Eloquent representan tablas en la base de datos 
- Cada modelo corresponde a una tabla.
- Cada instancia del modelo corresponde a una fila en la tabla.
 */

/*Aquí se indica que se pueden utilizar Factories (clases que permiten generar datos de prueba), 
esto permite utilizar un método factory() para generar una instancia
de "factory" asociada al modelo en cuestión.
*/
use Illuminate\Database\Eloquent\Factories\HasFactory;
/*
    Model Es la clase base para todos los modelos.
 */
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon; // Importa la clase Carbon para manejar fechas

class Empleado extends Model
{
    use HasFactory;

    protected $table = 'adm_empleados';
    protected $primaryKey = 'id_empleado';
    public $timestamps = false;

    /*
     * Inidica que atributos del modelo pueden ser asignados de forma masiva. Es decir se pueden usar
     * métodos cómo create() o update() para asignar valores a estos atributos desde un array asociativo.
     */
    protected $fillable = [
        'id_empleado',
        'codigo',
        'nombre',
        'id_identificacion',
        'numero_identificacion',
        'telefono_casa',
        'movil',
        'otro_telefono',
        'correo_personal',
        'correo_empresa',
        'salud',
        'contacto_emergencia',
        'telefono_emergencia',
        'id_departamento',
        'id_puesto',
        'fecha_nacimiento',
        'fecha_ingreso',
        'observaciones',
        'estado',
        'nit',
        'genero',
        'direccion',
        'id_departamentopais',       
        'fecha_registro',
        'usuario_registro',
        'fecha_modificacion',
        'usuario_modificacion' ,        
    ];

    // Mutador para fecha_registro (los mútadores son útiles para cambiar el formato de la información, como una fecha por ejemplo)
    // public function setFechaRegistroAttribute($value)
    // {
    //     $this->attributes['fecha_registro'] = Carbon::now();
    // }
    // Relaciones con otras tablas (si las necesitas)
    //Es la relación con la tabla identificación belongsTo indica que un empleado pertenece a una identificación    
    public function identificacion()
    {
        return $this->belongsTo(Identificacion::class, 'id_identificacion', 'id_identificacion');
    }

    public function departamento()
    {
        return $this->belongsTo(Departamento::class, 'id_departamento');
    }

    public function puesto()
    {
        return $this->belongsTo(Puesto::class, 'id_puesto');
    }

    public function departamentoPais()
    {
        return $this->belongsTo(DepartamentoPais::class, 'id_departamentopais');
    }
}