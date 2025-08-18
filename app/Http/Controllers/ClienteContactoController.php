<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Clientes;
use App\Models\ClienteEmail;
use App\Models\ClienteDireccion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Database\UniqueConstraintViolationException;

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

        // --- 1) Normalizar payload antes de validar ---
        $payload = $request->all();

        if (!empty($payload['emails']) && is_array($payload['emails'])) {
            $payload['emails'] = array_map(function ($row) {
                if (isset($row['email'])) {
                    $row['email'] = mb_strtolower(trim($row['email']));
                }
                if (isset($row['es_principal'])) {
                    $row['es_principal'] = (int) (bool) $row['es_principal'];
                }
                if (isset($row['tipo'])) $row['tipo'] = trim($row['tipo']);
                return $row;
            }, $payload['emails']);
        }

        if (!empty($payload['direcciones']) && is_array($payload['direcciones'])) {
            $payload['direcciones'] = array_map(function ($row) {
                if (isset($row['direccion'])) $row['direccion'] = trim(preg_replace('/\s+/', ' ', $row['direccion']));
                if (isset($row['referencia'])) $row['referencia'] = trim(preg_replace('/\s+/', ' ', $row['referencia']));
                if (isset($row['ciudad'])) $row['ciudad'] = trim($row['ciudad']);
                if (isset($row['pais'])) $row['pais'] = trim($row['pais']);
                if (isset($row['es_principal'])) $row['es_principal'] = (int) (bool) $row['es_principal'];
                return $row;
            }, $payload['direcciones']);
        }

        // --- 2) Validación base + after (duplicados y “principal”) ---
        $validator = validator($payload, [
            'emails' => ['array'],
            'emails.*.id' => ['nullable', 'integer', 'exists:cliente_emails,id'],
            'emails.*.email' => ['required', 'email', 'max:190', 'distinct'], // evita duplicados dentro del arreglo
            'emails.*.tipo' => ['nullable', 'string', 'max:30'],
            'emails.*.es_principal' => ['boolean'],
            'emails.*.estado' => ['integer', 'in:0,1'],

            'direcciones' => ['array'],
            'direcciones.*.id' => ['nullable', 'integer', 'exists:cliente_direcciones,id'],
            'direcciones.*.direccion' => ['required', 'string', 'max:255', 'distinct'],
            'direcciones.*.referencia' => ['sometimes', 'nullable', 'string', 'max:255'],
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

        $validator->after(function ($v) use ($payload, $idcliente) {

            // 2.a) Un solo principal en emails (en el payload)
            if (!empty($payload['emails'])) {
                $principales = collect($payload['emails'])->where('es_principal', 1);
                if ($principales->count() > 1) {
                    $v->errors()->add('emails', 'Solo puedes marcar un correo como principal.');
                }
            }

            // 2.b) Un solo principal en direcciones (en el payload)
            if (!empty($payload['direcciones'])) {
                $principales = collect($payload['direcciones'])->where('es_principal', 1);
                if ($principales->count() > 1) {
                    $v->errors()->add('direcciones', 'Solo puedes marcar una dirección como principal.');
                }
            }

            // 2.c) Duplicados en BD: (idcliente, email) ignorando el propio id
            if (!empty($payload['emails'])) {
                foreach ($payload['emails'] as $i => $row) {
                    if (empty($row['email'])) continue;

                    $dup = DB::table('cliente_emails')
                        ->where('idcliente', $idcliente)
                        ->whereRaw('LOWER(TRIM(email)) = ?', [mb_strtolower(trim($row['email']))])
                        ->when(!empty($row['id']), function ($q) use ($row) {
                            $q->where('id', '<>', $row['id']);
                        })
                        ->exists();

                    if ($dup) {
                        $v->errors()->add("emails.$i.email", "El correo '{$row['email']}' ya existe para este cliente.");
                    }
                }
            }

            // 2.d) Duplicados básicos de dirección en BD (ajusta criterio si lo deseas)
            if (!empty($payload['direcciones'])) {
                foreach ($payload['direcciones'] as $i => $row) {
                    if (empty($row['direccion'])) continue;

                    $q = DB::table('cliente_direcciones')
                        ->where('idcliente', $idcliente)
                        ->where('direccion', $row['direccion']);

                    if (!empty($row['ciudad'])) $q->where('ciudad', $row['ciudad']);
                    if (!empty($row['pais'])) $q->where('pais', $row['pais']);
                    if (!empty($row['id'])) $q->where('id', '<>', $row['id']);

                    if ($q->exists()) {
                        $v->errors()->add("direcciones.$i.direccion", "La dirección '{$row['direccion']}' ya existe para este cliente.");
                    }
                }
            }
        });

        $validated = $validator->validate();

        // --- 3) Persistencia segura + manejo de UNIQUE en 422 ---
        try {
            return DB::transaction(function () use ($cliente, $validated) {
                // Eliminar
                if (!empty($validated['eliminarEmails'])) {
                    ClienteEmail::whereIn('id', $validated['eliminarEmails'])->delete();
                }
                if (!empty($validated['eliminarDirecciones'])) {
                    ClienteDireccion::whereIn('id', $validated['eliminarDirecciones'])->delete();
                }

                // Emails: si viene uno como principal en el payload, desmarcar los demás ANTES
                $emailPrincipal = !empty($validated['emails'])
                    ? collect($validated['emails'])->firstWhere('es_principal', 1)
                    : null;
                if ($emailPrincipal) {
                    ClienteEmail::where('idcliente', $cliente->idcliente)->update(['es_principal' => 0]);
                }

                if (!empty($validated['emails'])) {
                    foreach ($validated['emails'] as $row) {
                        $row['idcliente'] = $cliente->idcliente;
                        if (isset($row['email'])) $row['email'] = mb_strtolower(trim($row['email']));
                        if (isset($row['es_principal'])) $row['es_principal'] = (int) (bool) $row['es_principal'];

                        if (!empty($row['id'])) {
                            $email = ClienteEmail::find($row['id']);
                            $email->fill($row);
                            $email->save();
                        } else {
                            ClienteEmail::create($row); // protegido por UNIQUE (idcliente,email) si existe en BD
                        }
                    }
                }

                // Direcciones: si viene una principal, desmarcar las demás ANTES
                $dirPrincipal = !empty($validated['direcciones'])
                    ? collect($validated['direcciones'])->firstWhere('es_principal', 1)
                    : null;
                if ($dirPrincipal) {
                    ClienteDireccion::where('idcliente', $cliente->idcliente)->update(['es_principal' => 0]);
                }

                if (!empty($validated['direcciones'])) {
                    foreach ($validated['direcciones'] as $row) {
                        $row['idcliente'] = $cliente->idcliente;
                        if (isset($row['es_principal'])) $row['es_principal'] = (int) (bool) $row['es_principal'];

                        if (!empty($row['id'])) {
                            $dir = ClienteDireccion::find($row['id']);
                            $dir->fill($row);
                            $dir->save();
                        } else {
                            ClienteDireccion::create($row);
                        }
                    }
                }

                // Devolver estado actualizado
                return $this->show($cliente->idcliente);
            });
        } catch (UniqueConstraintViolationException $e) {
            // Si tienes el índice UNIQUE (idcliente,email) con este nombre:
            if (str_contains($e->getMessage(), 'cliente_emails_idcliente_email_uq')) {
                return response()->json([
                    'message' => 'El correo ya existe para este cliente.',
                    'errors'  => ['emails' => ['Correo duplicado para este cliente.']],
                ], 422);
            }
            // Si tienes índice para único principal (principal_key)
            if (str_contains($e->getMessage(), 'cliente_emails_principal_once_uq')) {
                return response()->json([
                    'message' => 'Solo puede existir un correo principal por cliente.',
                    'errors'  => ['emails' => ['Ya existe un correo principal.']],
                ], 422);
            }

            // Fallback genérico
            return response()->json([
                'message' => 'Conflicto de unicidad en la base de datos.',
            ], 422);
        }
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
