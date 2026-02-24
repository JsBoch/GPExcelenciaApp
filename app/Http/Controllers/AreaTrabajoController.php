<?php

namespace App\Http\Controllers;

use App\Models\AreaTrabajo;
use App\Models\Correlativo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AreaTrabajoController extends Controller
{
    // LISTA (solo activos por defecto)
    public function index()
    {
        $rows = AreaTrabajo::where('estado', 1)
            ->select('id_areatrabajo', 'nombre', 'descripcion', 'fecha_registro', 'usuario_registro', 'estado')
            ->orderBy('nombre', 'asc')
            ->get();

        return response()->json($rows);
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'nombre' => 'required|string|max:120',
                'descripcion' => 'nullable|string|max:255',
            ]);

            DB::beginTransaction();

            $correlativo = Correlativo::find('area_trabajo');
            if (!$correlativo) {
                DB::rollBack();
                return response()->json(['message' => 'No se encontró el correlativo para area_trabajo'], 400);
            }

            $id = (int)$correlativo->correlativo + (int)$correlativo->incremento;
            $correlativo->correlativo = $id;
            $correlativo->save();

            $data = $request->all();
            $data['id_areatrabajo'] = $id;
            $data['nombre'] = mb_strtoupper(trim($data['nombre']));
            $data['descripcion'] = isset($data['descripcion']) ? trim($data['descripcion']) : null;
            $data['usuario_registro'] = auth()->user()->name ?? null;
            $data['fecha_registro'] = now();
            $data['estado'] = 1;

            // Validación de unicidad por nombre (por si ya existe uno inactivo o activo)
            $yaExiste = AreaTrabajo::whereRaw('UPPER(nombre) = ?', [$data['nombre']])->first();
            if ($yaExiste) {
                DB::rollBack();
                return response()->json(['message' => 'Ya existe un área con ese nombre.'], 422);
            }

            AreaTrabajo::create($data);

            DB::commit();
            return response()->json($data, 201);

        } catch (\Illuminate\Validation\ValidationException $ve) {
            return response()->json(['message' => 'Validación', 'errors' => $ve->errors()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al crear el área: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $row = AreaTrabajo::where('id_areatrabajo', $id)
            ->select('id_areatrabajo', 'nombre', 'descripcion', 'fecha_registro', 'usuario_registro', 'estado')
            ->first();

        if (!$row) {
            return response()->json(['message' => 'Área no encontrada'], 404);
        }

        return response()->json($row);
    }

    public function update(Request $request, $id)
    {
        try {
            $request->validate([
                'nombre' => 'required|string|max:120',
                'descripcion' => 'nullable|string|max:255',
            ]);

            $row = AreaTrabajo::find($id);
            if (!$row) {
                return response()->json(['message' => 'Área no encontrada'], 404);
            }

            $nombre = mb_strtoupper(trim($request->input('nombre')));

            // Evitar duplicados (excluyendo el actual)
            $dup = AreaTrabajo::whereRaw('UPPER(nombre) = ?', [$nombre])
                ->where('id_areatrabajo', '<>', $id)
                ->first();

            if ($dup) {
                return response()->json(['message' => 'Ya existe un área con ese nombre.'], 422);
            }

            $row->nombre = $nombre;
            $row->descripcion = $request->filled('descripcion') ? trim($request->input('descripcion')) : null;
            $row->save();

            return response()->json($row);

        } catch (\Illuminate\Validation\ValidationException $ve) {
            return response()->json(['message' => 'Validación', 'errors' => $ve->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al actualizar: ' . $e->getMessage()], 500);
        }
    }

    // Eliminar físico (si lo necesitas)
    public function destroy($id)
    {
        $row = AreaTrabajo::find($id);
        if (!$row) {
            return response()->json(['message' => 'Área no encontrada'], 404);
        }

        $row->delete();
        return response()->json(['message' => 'Área eliminada']);
    }

    // Desactivar (lo que usas normalmente)
    public function desactivar($id)
    {
        $row = AreaTrabajo::find($id);
        if (!$row) {
            return response()->json(['message' => 'Área no encontrada'], 404);
        }

        $row->estado = 0;
        $row->save();

        return response()->json(['message' => 'Área desactivada']);
    }

    // (Opcional) lista para combos
    public function lista()
    {
        $rows = AreaTrabajo::where('estado', 1)
            ->orderBy('nombre', 'asc')
            ->get(['id_areatrabajo', 'nombre']);

        return response()->json($rows);
    }
}