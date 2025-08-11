<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Clientes;
use App\Models\ClienteEmail;
use App\Models\ClienteDireccion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ClienteContactoController extends Controller
{
    // Lista simple de clientes (id + nombre) para el select
    public function clientesOptions()
    {
        $data = Clientes::query()
            ->select('idcliente as id', 'nombre')
            ->orderBy('nombre')
            ->get();

        return response()->json($data);
    }

    // Obtener emails + direcciones de un cliente
    public function show($idcliente)
    {
        $cliente = Clientes::with(['emails' => function ($q) {
            $q->orderByDesc('es_principal')->orderBy('email');
        }, 'direcciones' => function ($q) {
            $q->orderByDesc('es_principal')->orderBy('direccion');
        }])
            ->findOrFail($idcliente);

        return response()->json([
            'cliente' => ['id' => $cliente->idcliente, 'nombre' => $cliente->nombre],
            'emails' => $cliente->emails,
            'direcciones' => $cliente->direcciones
        ]);
    }

    // Guardar en bloque (crear/actualizar/eliminar)
    public function storeOrUpdate($idcliente, Request $request)
    {
        $cliente = Clientes::findOrFail($idcliente);

        $validated = $request->validate([
            'emails' => ['array'],
            'emails.*.id' => ['nullable', 'integer', 'exists:cliente_emails,id'],
            'emails.*.email' => ['required', 'email', 'max:190'],
            'emails.*.tipo' => ['nullable', 'string', 'max:30'],
            'emails.*.es_principal' => ['boolean'],
            'emails.*.estado' => ['integer', 'in:0,1'],

            'direcciones' => ['array'],
            'direcciones.*.id' => ['nullable', 'integer', 'exists:cliente_direcciones,id'],
            'direcciones.*.direccion' => ['required', 'string', 'max:255'],
            'direcciones.*.referencia' => ['sometimes','nullable','string','max:255'],
            'direcciones.*.ciudad' => ['nullable', 'string', 'max:80'],
            'direcciones.*.iddepartamento' => ['nullable', 'integer'],
            'direcciones.*.pais' => ['nullable', 'string', 'max:80'],
            'direcciones.*.lat' => ['nullable', 'numeric'],
            'direcciones.*.lng' => ['nullable', 'numeric'],
            'direcciones.*.es_principal' => ['boolean'],
            'direcciones.*.estado' => ['integer', 'in:0,1'],

            'eliminarEmails' => ['array'],
            'eliminarEmails.*' => ['integer', 'exists:cliente_emails,id'],

            'eliminarDirecciones' => ['array'],
            'eliminarDirecciones.*' => ['integer', 'exists:cliente_direcciones,id'],
        ]);

        DB::transaction(function () use ($cliente, $validated) {
            // Eliminar
            if (!empty($validated['eliminarEmails'])) {
                ClienteEmail::whereIn('id', $validated['eliminarEmails'])->delete();
            }
            if (!empty($validated['eliminarDirecciones'])) {
                ClienteDireccion::whereIn('id', $validated['eliminarDirecciones'])->delete();
            }

            // Emails (crear/actualizar)
            if (!empty($validated['emails'])) {
                foreach ($validated['emails'] as $row) {
                    $row['idcliente'] = $cliente->idcliente;

                    // Si se marca es_principal, desmarcar otros
                    if (!empty($row['es_principal'])) {
                        ClienteEmail::where('idcliente', $cliente->idcliente)->update(['es_principal' => false]);
                    }

                    if (!empty($row['id'])) {
                        $email = ClienteEmail::find($row['id']);
                        $email->fill($row);
                        $email->save();
                    } else {
                        ClienteEmail::create($row);
                    }
                }
            }

            // Direcciones (crear/actualizar)
            if (!empty($validated['direcciones'])) {
                foreach ($validated['direcciones'] as $row) {
                    $row['idcliente'] = $cliente->idcliente;

                    if (!empty($row['es_principal'])) {
                        ClienteDireccion::where('idcliente', $cliente->idcliente)->update(['es_principal' => false]);
                    }

                    if (!empty($row['id'])) {
                        $dir = ClienteDireccion::find($row['id']);
                        $dir->fill($row);
                        $dir->save();
                    } else {
                        ClienteDireccion::create($row);
                    }
                }
            }
        });

        // Devolver el estado actualizado
        return $this->show($cliente->idcliente);
    }

    public function departamentosOptions()
    {
        $rows = DB::table('adm_departamentopais')
            ->select(['iddepartamentopais as id', 'nombre']) // ajusta 'nombre' si tu campo se llama distinto
            ->orderBy('nombre')
            ->get();

        return response()->json($rows);
    }
}
