<?php

namespace App\Http\Controllers;

use App\Models\AdmProductoPredefinido;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; // Importa la clase DB para transacciones
use App\Models\ProductoPredefinido;
use App\Models\Correlativo;
use App\Models\AdmUnidadMedida;
use Illuminate\Support\Facades\Log;

class ProductoPredefinidoController extends Controller
{
    public function index()
    {        
        $productosPredefinidos = AdmProductoPredefinido::where('pp.estado', 1)
            ->select(
                'pp.idproductopredefinido',
                'pp.titulo',
                'pp.descripcion',
                'pp.ancho',
                'pp.alto',
                'pp.profundidad',     
                'pp.cantidad',           
                'pp.precio',
                'pp.cantidad_uno',
                'pp.precio_uno',
                'pp.cantidad_dos',
                'pp.precio_dos',
                'pp.cantidad_tres',
                'pp.precio_tres',
                'pp.cantidad_cuatro',
                'pp.precio_cuatro',
                'um.unidad as unidad_medida',
                'pp.variacion',
                'pp.observaciones',                                                         
        )
        ->from('adm_productos_predefinidos as pp')
        ->join('adm_unidad_medida as um', 'pp.idunidadmedida', '=', 'um.idunidadmedida')        
            ->get();
        return response()->json($productosPredefinidos);
    }

    public function store(Request $request)
    {
        try {
            DB::beginTransaction();

            $correlativo = Correlativo::find('adm_productos_predefinidos');

            if (! $correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para productos predefinidos'], 400);
            }

            $idProductoPredefinido = $correlativo->correlativo + $correlativo->incremento;
            $correlativo->correlativo = $idProductoPredefinido;
            $correlativo->save();
            
            $datosProductoPredefinido                     = $request->all();
            $datosProductoPredefinido['idproductopredefinido']     = $idProductoPredefinido;                        
            $datosProductoPredefinido['usuario_registro'] = auth()->user()->name;
            $datosProductoPredefinido['fecha_registro']   = date('Y-m-d H:i:s');
            $datosProductoPredefinido['estado']           = 1;            

            $productoPredefinido = AdmProductoPredefinido::create($datosProductoPredefinido);

            DB::commit();

            return response()->json($productoPredefinido, 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['message' => 'Error al crear el producto: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $productoPredefinido = AdmProductoPredefinido::where('pp.idproductopredefinido', $id)
            ->select(
                'pp.idproductopredefinido',
                'pp.titulo',
                'pp.descripcion',
                'pp.ancho',
                'pp.alto',
                'pp.profundidad',      
                'pp.cantidad',
                'pp.precio',
                'pp.cantidad_uno',
                'pp.precio_uno',
                'pp.cantidad_dos',
                'pp.precio_dos',
                'pp.cantidad_tres',
                'pp.precio_tres',
                'pp.cantidad_cuatro',
                'pp.precio_cuatro',
                'um.unidad as unidad_medida',
                'pp.idunidadmedida',
                'pp.variacion',
                'pp.observaciones',                                                         
        )
        ->from('adm_productos_predefinidos as pp')
        ->join('adm_unidad_medida as um', 'pp.idunidadmedida', '=', 'um.idunidadmedida')
            ->first();
        if (! $productoPredefinido) {
            return response()->json(['message' => 'No se encontró el registro del producto'], 404);
        }
       
        return response()->json($productoPredefinido);
    }

    public function update(Request $request, $id)
    {
        // Iniciar transacción para asegurar atomicidad
        //DB::beginTransaction();
        try {
            // 1. Encontrar y actualizar el producto predefinido principal
            $productoPredefinido = AdmProductoPredefinido::find($id);
            if (! $productoPredefinido) {
                //DB::rollback(); // Revertir si no se encuentra
                return response()->json(['message' => 'Producto predefinido no encontrado'], 404);
            }

            // Obtener todos los datos, incluyendo los detalles
            $datosCotizacion = $request->all();

            // Añadir campos de auditoría para la cabecera
            $datosCotizacion['usuario_modificacion'] = auth()->user()->name;
            $datosCotizacion['fecha_modificacion']   = now(); // Usar now() es más conveniente                                                           

            $productoPredefinido->update($datosCotizacion);

            // Si todo fue bien, confirmar la transacción
           // DB::commit();
            return response()->json($productoPredefinido);

        } catch (\Exception $e) {
            // Si algo falla, revertir la transacción
            DB::rollback();
            Log::error('Error al actualizar la el producto predefinido ID ' . $id . ': ' . $e->getMessage()); // Loguear el error para depuración
            return response()->json(['message' => 'Error al actualizar el producto predefinido: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $productoPredefinido = AdmProductoPredefinido::find($id);
        if (! $productoPredefinido) {
            return response()->json(['message' => 'Producto predefinido no encontrado'], 404);
        }

        $productoPredefinido->delete();
        AdmProductoPredefinido::where('idproductopredefinido', $id)->delete();

        return response()->json(['message' => 'Produto predefinido eliminado']);
    }

    public function desactivar($id)
    {
        $productoPredefinido = AdmProductoPredefinido::find($id);
        if (! $productoPredefinido) {
            return response()->json(['message' => 'Producto predefinido no encontrado'], 404);
        }

        $productoPredefinido->estado = 0;
        $productoPredefinido->save();

        return response()->json(['message' => 'Producto predefinido no desactivado']);
    }

    public function listarUnidadesMedida()
    {
        $unidadesMedida = AdmUnidadMedida::where('estado', 1)->get(['idunidadmedida', 'unidad']);
        return response()->json($unidadesMedida);
    }
}
