<?php

namespace App\Http\Controllers;

use App\Models\Empleado;
use App\Models\Identificacion;
use App\Models\Departamento;
use App\Models\Puesto;
use App\Models\DepartamentoPais;
use App\Models\Correlativo;
use Illuminate\Support\Facades\DB; // Importa la clase DB para transacciones
use Illuminate\Support\Facades\Log;

/*
 * Es una clase que representa una solicitud Http
 * Es un objeto que contiene toda la información de la solicitud que el cliente
 * por ejemplo un navegador web envía al servidor.
 */
use Illuminate\Http\Request;

class EmpleadoController extends Controller
{
    public function index()
    {
        //$empleados = Empleado::all();        
        //$empleados = Empleado::where('estado',1)->get();
        $empleados = Empleado::where('adm_empleados.estado', 1)
            ->select(
                'adm_empleados.id_empleado', 
            'adm_empleados.codigo', 
            'adm_empleados.nombre',
            'adm_empleados.nit',
            'adm_empleados.id_identificacion', 
            'adm_identificacion.nombre as identificacion_nombre', 
            'adm_empleados.numero_identificacion',
            'adm_empleados.telefono_casa',
            'adm_empleados.movil',
            'adm_empleados.otro_telefono',
            'adm_empleados.correo_personal', 
            'adm_empleados.correo_empresa',
            'adm_empleados.salud', 
            'adm_empleados.contacto_emergencia', 
            'adm_empleados.telefono_emergencia', 
            'adm_empleados.id_departamento',
            'adm_departamento.nombre as departamento_nombre', 
            'adm_empleados.id_puesto',
            'adm_puestos.nombre as puesto_nombre',
            'adm_empleados.fecha_nacimiento',
            'adm_empleados.fecha_ingreso',
            'adm_empleados.genero',
            'adm_empleados.direccion',
            'adm_empleados.id_departamentopais',
            'adm_departamentopais.nombre as departamentopais_nombre',
            'adm_empleados.Observaciones',                                                
        )
        ->join('adm_identificacion', 'adm_empleados.id_identificacion', '=', 'adm_identificacion.id_identificacion')
        ->join('adm_puestos', 'adm_empleados.id_puesto', '=', 'adm_puestos.id_puesto')
        ->join('adm_departamento', 'adm_empleados.id_departamento', '=', 'adm_departamento.id_departamento')
        ->join('adm_departamentopais', 'adm_empleados.id_departamentopais', '=', 'adm_departamentopais.iddepartamentopais')        
            ->get();
        return response()->json($empleados);
    }

    public function store(Request $request)
    {
        try {
            DB::beginTransaction(); // Inicia una transacción para asegurar la integridad de los datos
    
            $correlativo = Correlativo::find('adm_empleados'); // Obtiene el registro de correlativo para la tabla 'adm_empleados'
    
            if (!$correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para empleados'], 400);
            }
    
            $idEmpleado = $correlativo->correlativo + $correlativo->incremento; // Genera el nuevo ID del empleado
            $correlativo->correlativo = $idEmpleado; // Actualiza el correlativo en la base de datos
            $correlativo->save();

            $codigoEmpleado = Correlativo::find('codigo_empleado'); // Obtiene el registro de correlativo para la tabla 'codigo_empleado'
            if (! $codigoEmpleado) {
                return response()->json(['message' => 'No se encontró el correlativo para el código del empleado'], 400);
            }

            $codigoE                         = $codigoEmpleado->correlativo + $codigoEmpleado->incremento;
            $codigoEmpleado->correlativo = $codigoE;
            $codigoEmpleado->save();
    
            $datosEmpleado = $request->all();
            $datosEmpleado['id_empleado'] = $idEmpleado; // Asigna el ID generado al empleado
            $datosEmpleado['usuario_registro'] = auth()->user()->name; // Asigna el usuario registrado
            $datosEmpleado['fecha_registro'] = now(); // Asigna la fecha de registro
            $datosEmpleado['estado'] = 1; // Asigna el estado
            $datosEmpleado['codigo'] = $codigoE; // Asigna el código generado al empleado
            $datosEmpleado['iduser'] = auth()->user()->id; // Asigna el ID del usuario autenticado
    
            $empleado = Empleado::create($datosEmpleado);
    
            DB::commit(); // Confirma la transacción
    
            return response()->json($empleado, 201); //devuelve una copia del objeto empleado
            //$respuesta = array("estado"=>"Creado con éxito"); 
            //return response()->json($respuesta,201);
        } catch (\Exception $e) {
            DB::rollback(); // Revierte la transacción en caso de error
            return response()->json(['message' => 'Error al crear empleado: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $empleado = Empleado::find($id);
        if (!$empleado) {
            return response()->json(['message' => 'Empleado no encontrado'], 404);
        }
        return response()->json($empleado);
    }

    public function update(Request $request, $id)
    {
        $empleado = Empleado::find($id);
        if (!$empleado) {
            return response()->json(['message' => 'Empleado no encontrado'], 404);
        }        
        $empleado->update($request->all());
        return response()->json($empleado);
    }

    public function destroy($id)
    {
        $empleado = Empleado::find($id);
        if (!$empleado) {
            return response()->json(['message' => 'Empleado no encontrado'], 404);
        }
        $empleado->delete();
        return response()->json(['message' => 'Empleado eliminado']);
    }

    /**
     * Desactivar un empleado
     * @param $id El ID del empleado a desactivar
     * @return Una respuesta JSON con un mensaje de éxito o error
     */
    public function desactivar($id)
    {
        $empleado = Empleado::find($id);
        if (!$empleado) {
            return response()->json(['message' => 'Empleado no encontrado'], 404);
        }

        $empleado->estado = 0;
        $empleado->save();

        return response()->json(['message' => 'Empleado desactivado']);
    }

    // Funciones adicionales para obtener datos de las listas desplegables
    public function getIdentificaciones()
    {
        $identificaciones = Identificacion::all(['id_identificacion', 'nombre']); // Selecciona solo los campos necesarios
        return response()->json($identificaciones);
    }

    public function getDepartamentos()
    {
        $departamentos = Departamento::where('estado',1)->get(['id_departamento', 'nombre']); // Reemplaza Departamento con tu modelo real
        return response()->json($departamentos);
    }

    public function getPuestos(Request $request)
    {
        $departamentoId = $request->input('id_departamento');
        $puestos = Puesto::where('id_departamento', $departamentoId)->get(['id_puesto', 'nombre']); // Reemplaza Puesto con tu modelo real)
        return response()->json($puestos);
    }

    public function getDepartamentosPais()
    {
        $departamentosPais = DepartamentoPais::where('estado',1)->get(['iddepartamentopais', 'nombre']); // Selecciona solo los campos necesarios); // Reemplaza DepartamentoPais con tu modelo real
        return response()->json($departamentosPais);
    }    

    public function listarVendedores()
    {
        try {
            $vendedores = DB::table('adm_empleados as e')
                ->join('adm_puestos as p', 'p.id_puesto', '=', 'e.id_puesto')
                ->select('e.iduser as id_empleado', 'e.nombre', 'p.nombre as puesto')
                ->where('e.estado', 1)
                ->whereRaw('LOWER(p.nombre) = ?', ['vendedor'])
                ->orderBy('e.nombre')
                ->get();

            return response()->json($vendedores, 200);
        } catch (\Throwable $e) {
            Log::error('Error al listar vendedores: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al obtener la lista de vendedores',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}