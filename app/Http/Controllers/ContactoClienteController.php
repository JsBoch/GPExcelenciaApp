<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Clientes;
use App\Models\ContactoCliente;
use App\Models\Correlativo;
use Illuminate\Support\Facades\DB; // Importa la clase DB para transacciones

class ContactoClienteController extends Controller
{
    public function index($idcliente)
    {        
        $contactosCliente = ContactoCliente::where('cc.estado', 1)   
        ->where('cc.idcliente',$idcliente)        
            ->select(
                'cc.id_contactocliente', 
            'cc.idcliente',
            'cc.nombre',
            'cc.telefono',
            'cc.correo', 
            'cc.puesto',
            'cc.observaciones'                                                     
        )
        ->from('contacto_cliente as cc')
        ->join('clientes', 'cc.idcliente', '=', 'clientes.idcliente')        
            ->get();
        return response()->json($contactosCliente);
    }

    public function store(Request $request)
    {
        try {
            DB::beginTransaction(); // Inicia una transacción para asegurar la integridad de los datos
    
            $correlativo = Correlativo::find('contacto_cliente');
    
            if (!$correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para contacto cliente'], 400);
            }
    
            $id_contactocliente = $correlativo->correlativo + $correlativo->incremento;
            $correlativo->correlativo = $id_contactocliente; // Actualiza el correlativo en la base de datos
            $correlativo->save();
    
            $datosContactoCliente = $request->all();
            $datosContactoCliente['id_contactocliente'] = $id_contactocliente;            
            $datosContactoCliente['usuario_registro'] = auth()->user()->name; 
            $datosContactoCliente['fecha_registro'] = now(); 
            $datosContactoCliente['estado'] = 1;
    
            $contactosCliente = ContactoCliente::create($datosContactoCliente);
    
            DB::commit(); // Confirma la transacción
    
            return response()->json($datosContactoCliente, 201); //devuelve una copia del objeto contacto cliente
            //$respuesta = array("estado"=>"Creado con éxito"); 
            return response()->json($respuesta,201);
        } catch (\Exception $e) {
            DB::rollback(); // Revierte la transacción en caso de error
            return response()->json(['message' => 'Error al crear el contacto_cliente: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        // $contactoCliente = ContactoCliente::find($id);
        // if (!$contactoCliente) {
        //     return response()->json(['message' => 'Contacto no encontrado'], 404);
        // }
        // return response()->json($contactoCliente);
        $contactosCliente = ContactoCliente::where('cc.id_contactocliente',$id)           
            ->select(
                'cc.id_contactocliente', 
            'cc.idcliente',
            'cc.nombre',
            'cc.telefono',
            'cc.correo', 
            'cc.puesto',
            'cc.observaciones'                                                     
        )
        ->from('contacto_cliente as cc')
        ->join('clientes', 'cc.idcliente', '=', 'clientes.idcliente')        
            ->first();
            if (!$contactosCliente) {
                return response()->json(['message' => 'Contacto no encontrado'], 404);
            }            
        return response()->json($contactosCliente);
    }

    public function update(Request $request, $id)
    {
        $contactoCliente = ContactoCliente::find($id);
        if (!$contactoCliente) {
            return response()->json(['message' => 'Contacto no encontrado'], 404);
        }        
        $contactoCliente->update($request->all());
        return response()->json($contactoCliente);
    }

    public function destroy($id)
    {
        $contactoCliente = ContactoCliente::find($id);
        if (!$contactoCliente) {
            return response()->json(['message' => 'Contacot no encontrado'], 404);
        }
        $contactoCliente->delete();
        return response()->json(['message' => 'Contacto eliminado']);
    }

    /**
     * Desactivar un empleado
     * @param $id El ID del empleado a desactivar
     * @return Una respuesta JSON con un mensaje de éxito o error
     */
    public function desactivar($id)
    {
        $contactoCliente = ContactoCliente::find($id);
        if (!$contactoCliente) {
            return response()->json(['message' => 'Contacto no encontrado'], 404);
        }

        $contactoCliente->estado = 0;
        $contactoCliente->save();

        return response()->json(['message' => 'Empleado desactivado']);
    }

    public function getClientes()
    {
        $clientes = Clientes::where('estado',1)->get(['idcliente', 'nombre']); 
        return response()->json($clientes);
    }    
}
