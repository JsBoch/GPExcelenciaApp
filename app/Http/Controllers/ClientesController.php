<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Clientes;
use App\Models\Correlativo;
use App\Models\DepartamentoPais;
use App\Models\Empleado;
use Illuminate\Support\Facades\DB; // Importa la clase DB para transacciones
use App\Models\Municipio;

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
                'adm_departamentopais.nombre as departamento',
                'clientes.telefono_uno',
                'clientes.telefono_dos',
                'clientes.telefono_tres',
                'clientes.email',
                'clientes.monto_credito',
                'clientes.dias_credito',
                'clientes.comentario',
                'adm_empleados.nombre as vendedor',
                'clientes.id_empleado',
                'clientes.id_municipio',
                'clientes.idtipocliente',
                'clientes.iddepartamento',
                'clientes.fecharegistro',
                'clientes.usuario_registro',
                'clientes.usuario_modifica',
                'clientes.fecha_modificacion',
                'clientes.estado',
                'clientes.pasaporte',
                'clientes.excento_iva',
                'clientes.extranjero',
            )
            ->join('adm_departamentopais', 'clientes.iddepartamento', '=', 'adm_departamentopais.iddepartamentopais')
            ->join('adm_empleados', 'clientes.id_empleado', '=', 'adm_empleados.id_empleado')
            ->orderBy('clientes.nombre')
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

            $codigoCliente = Correlativo::find('codigo_cliente'); // Obtiene el registro de correlativo para la tabla 'codigo_empleado'
            if (! $codigoCliente) {
                return response()->json(['message' => 'No se encontró el correlativo para el código del cliente'], 400);
            }

            $codigoC                         = $codigoCliente->correlativo + $codigoCliente->incremento;
            $codigoCliente->correlativo = $codigoC;
            $codigoCliente->save();

            $datosCliente = $request->all();
            $datosCliente['idcliente'] = $idCliente; // Asigna el ID generado al empleado
            $datosCliente['usuario_registro'] = auth()->user()->name; // Asigna el usuario registrado
            $datosCliente['fecharegistro'] = now(); // Asigna la fecha de registro
            $datosCliente['estado'] = 1; // Asigna el estado
            $datosCliente['id_municipio'] = $datosCliente['id_municipio']  ?? 0;
            $datosCliente['idtipocliente'] = 1; // Asigna el estado
            $datosCliente['codigo_postal'] = $datosCliente['codigo_postal'] ?? '';
            $datosCliente['codigo'] = $codigoC; // Asigna el estado

            $cliente = Clientes::create($datosCliente);

            DB::commit(); // Confirma la transacción

            return response()->json($cliente, 201); //devuelve una copia del objeto empleado
            // $respuesta = array("estado"=>"Creado con éxito"); 
            // return response()->json($respuesta,201);
        } catch (\Exception $e) {
            DB::rollback(); // Revierte la transacción en caso de error
            return response()->json(['message' => 'Error al crear empleado: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        // $cliente = Clientes::find($id);
        // if (!$cliente) {
        //     return response()->json(['message' => 'Cliente no encontrado'], 404);
        // }
        // return response()->json($cliente);
        $cliente = Clientes::where('clientes.idcliente', $id)
            ->select(
                'clientes.idcliente',
                'clientes.codigo',
                'clientes.nit',
                'clientes.cui',
                'clientes.nombre',
                'clientes.razonsocial',
                'clientes.direccion',
                'clientes.codigo_postal',
                'adm_departamentopais.nombre as departamento',
                'clientes.telefono_uno',
                'clientes.telefono_dos',
                'clientes.telefono_tres',
                'clientes.email',
                'clientes.monto_credito',
                'clientes.dias_credito',
                'clientes.comentario',
                'adm_empleados.nombre as vendedor',
                'clientes.id_empleado',
                'clientes.id_municipio',
                'clientes.idtipocliente',
                'clientes.iddepartamento',
                'clientes.fecharegistro',
                'clientes.usuario_registro',
                'clientes.usuario_modifica',
                'clientes.fecha_modificacion',
                'clientes.estado',
                'clientes.pasaporte',
                'clientes.excento_iva',
                'clientes.extranjero',
            )
            ->join('adm_departamentopais', 'clientes.iddepartamento', '=', 'adm_departamentopais.iddepartamentopais')
            ->join('adm_empleados', 'clientes.id_empleado', '=', 'adm_empleados.id_empleado')
            ->first(); // Usa first() en lugar de get() para obtener un solo resultado

        if (!$cliente) {
            return response()->json(['message' => 'Cliente no encontrado'], 404);
        }
        return response()->json($cliente);
    }

    public function update(Request $request, $id)
    {
        try {
            DB::beginTransaction(); // Inicia una transacción para asegurar la integridad de los datos

            $cliente = Clientes::find($id);
            if (!$cliente) {
                return response()->json(['message' => 'Cliente no encontrado'], 404);
            }

            $datosCliente = $request->all();

            // Aplica valores predeterminados si no se proporcionan en la solicitud
            $datosCliente['usuario_modifica'] = auth()->user()->name; // Asigna el usuario registrado
            $datosCliente['fecha_modificacion'] = date('Y-m-d H:i:s'); // Asigna la fecha de registro
            $datosCliente['estado'] = $datosCliente['estado'] ?? 1; // Asigna 1 si no se proporciona, o el valor proporcionado
            $datosCliente['id_municipio'] = $datosCliente['id_municipio'] ?? $cliente->id_municipio ?? 0;
            $datosCliente['idtipocliente'] = $datosCliente['idtipocliente'] ?? $cliente->idtipocliente ?? 1;
            $datosCliente['codigo_postal'] = $datosCliente['codigo_postal'] ?? $cliente->codigo_postal ?? '';

            $cliente->update($datosCliente);

            DB::commit(); // Confirma la transacción

            return response()->json($cliente);
        } catch (\Exception $e) {
            DB::rollback(); // Revierte la transacción en caso de error
            return response()->json(['message' => 'Error al actualizar el cliente: ' . $e->getMessage()], 500);
        }
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

    public function getMunicipios($iddepartamento)
    {
        // En tu DB: adm_municipio.id_departamento -> adm_departamentopais.iddepartamentopais
        $munis = Municipio::where('id_departamento', $iddepartamento)
            ->orderBy('nombre')
            ->get(['id_municipio', 'nombre']);
        return response()->json($munis);
    }
    public function getDepartamentosPais()
    {
        $departamentosPais = DepartamentoPais::where('estado', 1)->get(['iddepartamentopais', 'nombre','codigo_postal']); // Selecciona solo los campos necesarios); // Reemplaza DepartamentoPais con tu modelo real
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

    /**
     * Esta función devuelve las opciones de facturación para un cliente específico.
     * Permite obtener información como si el cliente tiene NIT, CUI, o si es Consumidor Final.
     * Y los emails y direcciones asociadas
     * @param mixed $idcliente
     * @return \Illuminate\Http\JsonResponse
     */
    // public function facturacionOpciones($idcliente)
    // {
    //     $cliente = DB::table('clientes')->where('idcliente', $idcliente)->first();

    //     if (!$cliente) {
    //         return response()->json(['message' => 'Cliente no encontrado'], 404);
    //     }

    //     $direcciones = DB::table('cliente_direcciones')
    //         ->where('idcliente', $idcliente)
    //         ->pluck('direccion')
    //         ->toArray();

    //     $emails = DB::table('cliente_emails')
    //         ->where('idcliente', $idcliente)
    //         ->pluck('email')
    //         ->toArray();

    //     // Fallbacks si no hay registros en tablas hijas
    //     if (empty($direcciones) && !empty($cliente->direccion)) {
    //         $direcciones = [$cliente->direccion];
    //     }
    //     if (empty($emails) && !empty($cliente->email)) {
    //         $emails = [$cliente->email];
    //     }

    //     return response()->json([
    //         'cliente' => [
    //             'idcliente'  => $cliente->idcliente,
    //             'nombre'     => $cliente->nombre,
    //             'nit'        => $cliente->nit,
    //             'cui'        => $cliente->cui,
    //             'pasaporte'  => $cliente->pasaporte,
    //             'extranjero' => $cliente->extranjero, // "S" / "N"
    //         ],
    //         'direcciones' => $direcciones,
    //         'emails'      => $emails,
    //     ]);
    // }
    public function facturacionOpciones($idcliente)
    {
        $cliente = DB::table('clientes')->where('idcliente', $idcliente)->first();

        if (!$cliente) {
            return response()->json(['message' => 'Cliente no encontrado'], 404);
        }

        // 1) Hijos primero (principal al inicio si existe el campo)
        $direccionesHijas = DB::table('cliente_direcciones')
            ->where('idcliente', $idcliente)
            ->when(DB::getSchemaBuilder()->hasColumn('cliente_direcciones', 'es_principal'), function ($q) {
                $q->orderByDesc('es_principal');
            })
            ->whereNotNull('direccion')
            ->where('direccion', '!=', '')
            ->pluck('direccion')
            ->toArray();

        $emailsHijos = DB::table('cliente_emails')
            ->where('idcliente', $idcliente)
            ->when(DB::getSchemaBuilder()->hasColumn('cliente_emails', 'es_principal'), function ($q) {
                $q->orderByDesc('es_principal');
            })
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->pluck('email')
            ->toArray();

        // 2) Añade los de la ficha base del cliente al final (para no pisar al principal)
        $direcciones = $direccionesHijas;
        if (!empty($cliente->direccion)) {
            $direcciones[] = $cliente->direccion;
        }

        $emails = $emailsHijos;
        if (!empty($cliente->email)) {
            $emails[] = $cliente->email;
        }

        // 3) Limpia y deduplica preservando orden
        $direcciones = array_values(array_unique(array_map(function ($d) {
            return trim((string)$d);
        }, array_filter($direcciones)), SORT_STRING));

        // Deduplicación case-insensitive para emails
        $emails = (function (array $arr) {
            $out = [];
            $seen = [];
            foreach ($arr as $e) {
                $e = trim((string)$e);
                if ($e === '') continue;
                $k = mb_strtolower($e, 'UTF-8');
                if (!isset($seen[$k])) {
                    $seen[$k] = true;
                    $out[] = $e;
                }
            }
            return $out;
        })($emails);

        return response()->json([
            'cliente' => [
                'idcliente'  => $cliente->idcliente,
                'nombre'     => $cliente->nombre,
                'nit'        => $cliente->nit,
                'cui'        => $cliente->cui,
                'pasaporte'  => $cliente->pasaporte,
                'extranjero' => $cliente->extranjero, // "S" / "N"
            ],
            'direcciones' => $direcciones, // unión sin duplicados
            'emails'      => $emails,      // unión sin duplicados (case-insensitive)
        ]);
    }
}
