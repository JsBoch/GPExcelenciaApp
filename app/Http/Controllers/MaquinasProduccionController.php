<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AdmMaquinaProduccion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MaquinasProduccionController extends Controller
{
    public function index()
    {
        return AdmMaquinaProduccion::where('estado', 1)
            ->orderBy('nombre')
            ->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|max:100',
            'codigo' => 'required|max:50|unique:adm_maquinas_produccion,codigo',
            'descripcion' => 'nullable|max:255',
        ]);

        $maquina = AdmMaquinaProduccion::create([
            'nombre' => strtoupper($request->nombre),
            'codigo' => strtoupper($request->codigo),
            'descripcion' => $request->descripcion,
            'estado' => 1,
            'fecha_registro' => now(),
            'usuario_registro' => auth()->user()->name,
        ]);

        return response()->json($maquina, 201);
    }

    public function update(Request $request, $id)
    {
        $maquina = AdmMaquinaProduccion::findOrFail($id);

        $request->validate([
            'nombre' => 'required|max:100',
            'codigo' => 'required|max:50|unique:adm_maquinas_produccion,codigo,' . $id . ',idmaquina',
            'descripcion' => 'nullable|max:255',
        ]);

        $maquina->update([
            'nombre' => strtoupper($request->nombre),
            'codigo' => strtoupper($request->codigo),
            'descripcion' => $request->descripcion,
        ]);

        return response()->json([
            'message' => 'Máquina actualizada correctamente'
        ]);
    }

    public function destroy($id)
    {
        $uso = DB::table('adm_detalle_pedidosproduccion_maquinas')
            ->where('idmaquina', $id)
            ->exists();

        if ($uso) {
            return response()->json([
                'message' =>
                    'No se puede eliminar porque la máquina ya tiene movimientos.'
            ], 400);
        }

        $maquina = AdmMaquinaProduccion::findOrFail($id);

        $maquina->update([
            'estado' => 0
        ]);

        return response()->json([
            'message' => 'Máquina eliminada correctamente'
        ]);
    }
}