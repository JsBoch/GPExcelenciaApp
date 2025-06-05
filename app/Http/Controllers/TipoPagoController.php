<?php

namespace App\Http\Controllers;

use App\Models\AdmTipoPago;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; // Importa la clase DB para transacciones
use Illuminate\Support\Facades\Log;

class TipoPagoController extends Controller
{
    public function index()
    {        
        $tipoPago = AdmTipoPago::where('t.estado', 1)
            ->select(
                't.tipo',
                                                                      
        )
        ->from('adm_tipo_pago as t')              
            ->get();
        return response()->json($tipoPago);
    }

    public function store(Request $request)
    {
        try {
           
            $datosTipoPago['estado']           = 1;            

            $productoPredefinido = AdmTipoPago::create($datosTipoPago);

            DB::commit();

            return response()->json($productoPredefinido, 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['message' => 'Error al crear el tipo de pago: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $tipoPago = AdmTipoPago::where('t.idtipopago', $id)
            ->select(
                't.tipo',
                                                                   
        )
        ->from('adm_tipo_pago as t')        
            ->first();
        if (! $tipoPago) {
            return response()->json(['message' => 'No se encontró el registro del tipo de pago'], 404);
        }
       
        return response()->json($tipoPago);
    }

    public function update(Request $request, $id)
    {
        // Iniciar transacción para asegurar atomicidad
        //DB::beginTransaction();
        try {
            // 1. Encontrar y actualizar el producto predefinido principal
            $tipoPago = AdmTipoPago::find($id);
            if (! $tipoPago) {
                //DB::rollback(); // Revertir si no se encuentra
                return response()->json(['message' => 'tipo de pago no encontrado'], 404);
            }

            $tipoPago->update();

            // Si todo fue bien, confirmar la transacción
           // DB::commit();
            return response()->json($tipoPago);

        } catch (\Exception $e) {
            // Si algo falla, revertir la transacción
            DB::rollback();
            Log::error('Error al actualizar el tipo de pago ID ' . $id . ': ' . $e->getMessage()); // Loguear el error para depuración
            return response()->json(['message' => 'Error al actualizar el tipo de pago: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $tipoPago = AdmTipoPago::find($id);
        if (! $tipoPago) {
            return response()->json(['message' => 'Tipo de pago no encontrado'], 404);
        }

        $tipoPago->delete();
        AdmTipoPago::where('idtipopago', $id)->delete();

        return response()->json(['message' => 'Tipo de pago eliminado']);
    }

    public function desactivar($id)
    {
        $tipoPago = AdmTipoPago::find($id);
        if (! $tipoPago) {
            return response()->json(['message' => 'Tipo de pago no encontrado'], 404);
        }

        $tipoPago->estado = 0;
        $tipoPago->save();

        return response()->json(['message' => 'Tipo de pago no desactivado']);
    }

}
