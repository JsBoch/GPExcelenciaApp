<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Clientes;
use App\Models\Correlativo;
use App\Models\DepartamentoPais;
use App\Models\Empleado;
use Illuminate\Support\Facades\DB; // Importa la clase DB para transacciones

class ClientesController extends Controller
{
    public function index()
    {
        //$empleados = Empleado::all();        
        //$empleados = Empleado::where('estado',1)->get();
        $clientes = Clientes::where('clientes.estado', 1)
            ->select(
                'clientes.idcliente', 
                'clientes.codigo',
            'clientes.nit', 
            'clientes.cui',
            'clientes.nombre',
            'clientes.razonsocial',
            'clientes.direccion',
            'clientes.codigo_postal',
            'departamentopais.nombre as departamento',
            'clientes.telefono_uno',
            'clientes.telefono_dos',
            'clientes.telefono_tres',
            'clientes.email', 
            'clientes.monto_credito',
            'clientes.comentario',                                                                          
            'clientes.dias_credito', 
            'empleado.nombre as vendedor', 
            'clientes.id_empleado',             
            'clientes.id_municipio',
            'clientes.idtipocliente',
            'clientes.iddepartamento',
            'clientes.fecharegistro', 
            'clientes.usuario_registro',
            'clientes.usuario_modifica',            
            'clientes.fecha_modificacion',    
            'clientes.estado',        
        )        
        ->join('adm_departamentopais', 'clientes.iddepartamento', '=', 'adm_departamentopais.iddepartamentopais')        
            ->get();
        return response()->json($clientes);
    }

    public function store(Request $request)
    {
        try {
            DB::beginTransaction(); // Inicia una transacción para asegurar la integridad de los datos
    
            $correlativo = Correlativo::find('adm_clientes'); // Obtiene el registro de correlativo para la tabla 'adm_empleados'
    
            if (!$correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para clientes'], 400);
            }
    
            $idCliente = $correlativo->correlativo + $correlativo->incremento; // Genera el nuevo ID del empleado
            $correlativo->correlativo = $idCliente; // Actualiza el correlativo en la base de datos
            $correlativo->save();
    
            $datosCliente = $request->all();
            $datosCliente['idcliente'] = $idCliente; // Asigna el ID generado al empleado
            $datosCliente['usuario_registro'] = auth()->user()->name; // Asigna el usuario registrado
            $datosCliente['fecha_registro'] = now(); // Asigna la fecha de registro
            $datosCliente['estado'] = 1; // Asigna el estado
            $datosCliente['id_municipio'] = 0; // Asigna el estado
            $datosCliente['idtipocliente'] = 1; // Asigna el estado
            $datosCliente['codigo_postal'] = ''; // Asigna el estado
    
            $cliente = Clientes::create($datosCliente);
    
            DB::commit(); // Confirma la transacción
    
            //return response()->json($empleado, 201); //devuelve una copia del objeto empleado
            $respuesta = array("estado"=>"Creado con éxito"); 
            return response()->json($respuesta,201);
        } catch (\Exception $e) {
            DB::rollback(); // Revierte la transacción en caso de error
            return response()->json(['message' => 'Error al crear empleado: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $cliente = Clientes::find($id);
        if (!$cliente) {
            return response()->json(['message' => 'Cliente no encontrado'], 404);
        }
        return response()->json($cliente);
    }

    public function update(Request $request, $id)
    {
        $cliente = Clientes::find($id);
        if (!$cliente) {
            return response()->json(['message' => 'Cliente no encontrado'], 404);
        }        
        $cliente->update($request->all());
        return response()->json($cliente);
    }

    public function destroy($id)
    {
        $cliente = Clientes::find($id);
        if (!$cliente) {
            return response()->json(['message' => 'Cliente no encontrado'], 404);
        }
        $cliente->delete();
        return response()->json(['message' => 'Cliente eliminado']);
    }

    /**
     * Desactivar un empleado
     * @param $id El ID del empleado a desactivar
     * @return Una respuesta JSON con un mensaje de éxito o error
     */
    public function desactivar($id)
    {
        $cliente = Clientes::find($id);
        if (!$cliente) {
            return response()->json(['message' => 'Cliente no encontrado'], 404);
        }

        $cliente->estado = 0;
        $cliente->save();

        return response()->json(['message' => 'Cliente desactivado']);
    }

    public function getDepartamentosPais()
    {
        $departamentosPais = DepartamentoPais::where('estado',1)->get(['iddepartamentopais', 'nombre']); // Selecciona solo los campos necesarios); // Reemplaza DepartamentoPais con tu modelo real
        return response()->json($departamentosPais);
    }  
    public function getVendedores()
    {
        $vendedores = Empleado::where('estado', 1)
            ->whereHas('puesto', function ($query) {
                $query->where('nombre', 'like', '%vendedor%');
            })
            ->with('puesto:id_puesto,nombre') // Carga la relación puesto con los campos necesarios
            ->get(['id_empleado', 'nombre']);

        return response()->json($vendedores);
    }  
}
