<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AdmCuentasPorCobrar;
use App\Models\Clientes;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;

class CuentasPorCobrarController extends Controller
{
    public function index(Request $request)
    {
        $query = AdmCuentasPorCobrar::query();

        if ($request->filled('cliente')) {
            $query->where('idcliente', $request->cliente);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        try {
            DB::beginTransaction();

            // Validación básica del request
            $validated = $request->validate([
                'idcotizacion' => 'required|integer|unique:adm_cuentas_porcobrar,idcotizacion',
                'idcliente' => 'required|integer',
                'fecha_emision' => 'required|date',
                'fecha_vencimiento' => 'required|date',
                'moneda' => 'required|string',
                'tasa_cambio' => 'required|numeric',
                'monto_original' => 'required|numeric',
                'saldo_pendiente' => 'required|numeric',
                'monto_pagado' => 'required|numeric',
                'descuento_aplicado' => 'nullable|numeric',
                'origen_registro' => 'nullable|string',
                'centro_costo' => 'nullable|string',
                'cuenta_contable' => 'nullable|string',
                'estatus_riesgo' => 'nullable|string',
                'estado' => 'required|string',
            ]);

            // Obtener y actualizar correlativo
            $correlativo = \App\Models\Correlativo::find('adm_cuentas_porcobrar');
            if (! $correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para cuentas por cobrar'], 400);
            }

            $idCuenta = $correlativo->correlativo + $correlativo->incremento;
            $correlativo->correlativo = $idCuenta;
            $correlativo->save();

            // Agregar campos de auditoría
            $validated['idcuentaporcobrar'] = $idCuenta;
            $validated['usuario_creacion'] = auth()->user()->name;
            $validated['idusuario_creacion'] = auth()->user()->id;
            $validated['fecha_creacion'] = now();

            $cuenta = AdmCuentasPorCobrar::create($validated);

            DB::commit();
            return response()->json($cuenta, 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['message' => 'Error al crear la cuenta por cobrar: ' . $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id)
    {
        // $cuenta = AdmCuentasPorCobrar::with(['cotizacion:idcotizacion,nofactura'])
        // ->findOrFail($id);
        // return response()->json($cuenta);
        $clienteId = $request->query('cliente');

        $cxc = AdmCuentasPorCobrar::query()
            ->leftJoin('adm_cotizacion as ac', 'ac.idcotizacion', '=', 'adm_cuentas_porcobrar.idcotizacion')
            ->where('adm_cuentas_porcobrar.idcliente', $clienteId)
            ->where('adm_cuentas_porcobrar.estado', 1)
            ->get([
                'adm_cuentas_porcobrar.idcuentaporcobrar',
                'adm_cuentas_porcobrar.idcotizacion',
                'ac.nofactura AS nofactura',
                'adm_cuentas_porcobrar.fecha_emision',
                'adm_cuentas_porcobrar.monto_original',
                'adm_cuentas_porcobrar.saldo_pendiente',
            ]);

        return response()->json($cxc);
    }

    // GET /api/cuentas-por-cobrar/por-cliente?cliente=375
    public function porCliente(Request $request)
    {
        $clienteId = $request->query('cliente');
        abort_if(!$clienteId, 422, 'Falta el parámetro cliente');

        $q = AdmCuentasPorCobrar::query()
            ->leftJoin('adm_cotizacion as ac', 'ac.idcotizacion', '=', 'adm_cuentas_porcobrar.idcotizacion')
            ->where('adm_cuentas_porcobrar.idcliente', $clienteId)
            ->where('adm_cuentas_porcobrar.estado', 1)
            ->select([
                'adm_cuentas_porcobrar.idcuentaporcobrar',
                'adm_cuentas_porcobrar.idcotizacion',
                // Si nofactura es numérica y puede llevar ceros a la izquierda, cástralo a texto:
                DB::raw("CAST(ac.nofactura AS CHAR) AS nofactura"),
                'adm_cuentas_porcobrar.fecha_emision',
                'adm_cuentas_porcobrar.monto_original',
                'adm_cuentas_porcobrar.saldo_pendiente',
            ])
            ->orderBy('adm_cuentas_porcobrar.fecha_emision', 'desc');

        // opcional: solo pendientes => /por-cliente?cliente=375&solo_pendientes=1
        if ($request->boolean('solo_pendientes')) {
            $q->where('adm_cuentas_porcobrar.saldo_pendiente', '>', 0);
        }

        return response()->json($q->get());
    }

    public function update(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $cuenta = AdmCuentasPorCobrar::find($id);
            if (! $cuenta) {
                return response()->json(['message' => 'Cuenta por cobrar no encontrada'], 404);
            }

            $datos = $request->all();

            // Auditoría y valores por defecto
            $datos['usuario_modificacion'] = auth()->user()->name;
            $datos['idusuario_modificacion'] = auth()->user()->id;
            $datos['fecha_modificacion'] = now();
            $datos['estado'] = $datos['estado'] ?? $cuenta->estado;

            $cuenta->update($datos);

            DB::commit();
            return response()->json($cuenta);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['message' => 'Error al actualizar la cuenta por cobrar: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $cuenta = AdmCuentasPorCobrar::findOrFail($id);
        $cuenta->delete();
        return response()->json(['message' => 'Eliminado correctamente']);
    }

    public function generarEstadoCuentaPDF(Request $request)
    {
        $request->validate([
            'idcliente' => 'required|integer',
            'fecha_inicio' => 'required|date',
            'fecha_final' => 'required|date',
        ]);

        $cuentas = AdmCuentasPorCobrar::with('cotizacion')
            ->where('idcliente', $request->idcliente)
            ->whereBetween('fecha_emision', [$request->fecha_inicio, $request->fecha_final])
            ->get();

        $cliente = Clientes::find($request->idcliente);

        $totalPendiente = $cuentas->sum('saldo_pendiente');
        $totalPagado = $cuentas->sum('monto_pagado');

        $pdf = Pdf::loadView('pdf.estado_cuenta', [
            'cuentas' => $cuentas,
            'cliente' => $cliente,
            'fechaInicio' => $request->fecha_inicio,
            'fechaFinal' => $request->fecha_final,
            'totalPendiente' => $totalPendiente,
            'totalPagado' => $totalPagado,
        ]);

        return $pdf->stream("estado_cuenta_{$cliente->nombre}.pdf");
    }

    public function generarEstadoCuentaConRecibosPDF(Request $request)
    {
        $request->validate([
            'idcliente' => 'required|integer',
            'fecha_inicio' => 'required|date',
            'fecha_final' => 'required|date',
        ]);

        $cliente = Clientes::findOrFail($request->idcliente);
        $cuentas = AdmCuentasPorCobrar::with(['recibos' => function ($q) use ($request) {
            $q->whereBetween('fecha_recibo', [$request->fecha_inicio, $request->fecha_final])
                ->where('estado', 1)
                ->orderBy('fecha_recibo');
        }])
            ->where('idcliente', $request->idcliente)
            ->whereBetween('fecha_emision', [$request->fecha_inicio, $request->fecha_final])
            ->get();

        $pdf = Pdf::loadView('pdf.estado_cuenta_completo', [
            'cliente' => $cliente,
            'cuentas' => $cuentas,
            'fechaInicio' => $request->fecha_inicio,
            'fechaFinal' => $request->fecha_final,
        ]);

        return $pdf->stream("estado_cuenta_con_recibos_{$cliente->nombre}.pdf");
    }

    public function generarSaldosClientePDF(Request $request)
    {
        $request->validate([
            'idcliente'    => 'required|integer',
            'fecha_inicio' => 'required|date',
            'fecha_final'  => 'required|date',
        ]);

        $cliente = Clientes::findOrFail($request->idcliente);

        $cuentas = AdmCuentasPorCobrar::query()
            ->with(['cotizacion' => function ($q) {
                // Trae solo lo necesario
                $q->select('idcotizacion', 'nocotizacion');
            }])
            ->where('idcliente', $request->idcliente)
            ->whereBetween('fecha_emision', [$request->fecha_inicio, $request->fecha_final])
            ->orderBy('fecha_emision')
            ->get();

        $pdf = Pdf::loadView('pdf.saldos_cliente', [
            'cliente'     => $cliente,
            'cuentas'     => $cuentas,
            'fechaInicio' => $request->fecha_inicio,
            'fechaFinal'  => $request->fecha_final,
        ]);

        return $pdf->stream("saldos_{$cliente->nombre}.pdf");
    }
}
