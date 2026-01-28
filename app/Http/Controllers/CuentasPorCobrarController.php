<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AdmCuentasPorCobrar;
use App\Models\Clientes;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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

            $validated = $request->validate([
                'idcotizacion'        => 'required|integer|unique:adm_cuentas_porcobrar,idcotizacion',
                'idcliente'           => 'required|integer',
                'fecha_emision'       => 'required|date',
                'fecha_vencimiento'   => 'required|date',
                'moneda'              => 'required|string',
                'tasa_cambio'         => 'required|numeric',
                'monto_original'      => 'required|numeric',
                'saldo_pendiente'     => 'required|numeric',
                'monto_pagado'        => 'required|numeric',
                'descuento_aplicado'  => 'nullable|numeric',
                'origen_registro'     => 'nullable|string',
                'centro_costo'        => 'nullable|string',
                'cuenta_contable'     => 'nullable|string',
                'estatus_riesgo'      => 'nullable|string',
                'estado'              => 'required|string',
            ]);

            $correlativo = \App\Models\Correlativo::find('adm_cuentas_porcobrar');
            if (!$correlativo) {
                return response()->json(['message' => 'No se encontró el correlativo para cuentas por cobrar'], 400);
            }

            $idCuenta = $correlativo->correlativo + $correlativo->incremento;
            $correlativo->correlativo = $idCuenta;
            $correlativo->save();

            $validated['idcuentaporcobrar']     = $idCuenta;
            $validated['usuario_creacion']      = auth()->user()->name;
            $validated['idusuario_creacion']    = auth()->user()->id;
            $validated['fecha_creacion']        = now();

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
        $clienteId = $request->query('cliente');

        $cxc = AdmCuentasPorCobrar::query()
            // Ahora unimos contra adm_facturacion usando el idfactura guardado en CxC
            ->leftJoin('adm_facturacion as f', 'f.idfactura', '=', 'adm_cuentas_porcobrar.idfactura')
            ->where('adm_cuentas_porcobrar.idcliente', $clienteId)
            ->where('adm_cuentas_porcobrar.estado', 1)
            ->get([
                'adm_cuentas_porcobrar.idcuentaporcobrar',
                'adm_cuentas_porcobrar.idcotizacion',
                DB::raw('CAST(f.nofactura AS CHAR) AS nofactura'),
                'adm_cuentas_porcobrar.fecha_emision',
                'adm_cuentas_porcobrar.monto_original',
                'adm_cuentas_porcobrar.saldo_pendiente',
            ]);

        return response()->json($cxc);
    }

    // GET /api/cuentas-por-cobrar/por-cliente?cliente=375
    // public function porCliente(Request $request)
    // {
    //     $clienteId = $request->query('cliente');
    //     abort_if(!$clienteId, 422, 'Falta el parámetro cliente');

    //     $q = AdmCuentasPorCobrar::query()
    //         ->leftJoin('adm_facturacion as f', 'f.idfactura', '=', 'adm_cuentas_porcobrar.idfactura')
    //         ->where('adm_cuentas_porcobrar.idcliente', $clienteId)
    //         ->where('adm_cuentas_porcobrar.estado', 1)
    //         ->select([
    //             'adm_cuentas_porcobrar.idcuentaporcobrar',
    //             'adm_cuentas_porcobrar.idcotizacion',
    //             DB::raw('CAST(f.nofactura AS CHAR) AS nofactura'),
    //             DB::raw('IFNULL(CAST(f.numero AS CHAR), "") AS numero'),
    //             'adm_cuentas_porcobrar.fecha_emision',
    //             'adm_cuentas_porcobrar.monto_original',
    //             'adm_cuentas_porcobrar.saldo_pendiente',
    //         ])
    //         ->orderBy('adm_cuentas_porcobrar.fecha_emision', 'desc');

    //     if ($request->boolean('solo_pendientes')) {
    //         $q->where('adm_cuentas_porcobrar.saldo_pendiente', '>', 0);
    //     }
    //     //log::info('Cuentas por cobrar query: ' . $q->toSql() . ' con cliente=' . $clienteId);
    //     return response()->json($q->get());
    // }
    public function porCliente(Request $request)
{
    $clienteId = $request->query('cliente');
    abort_if(!$clienteId, 422, 'Falta el parámetro cliente');

    $q = AdmCuentasPorCobrar::query()
        ->leftJoin('adm_facturacion as f', 'f.idfactura', '=', 'adm_cuentas_porcobrar.idfactura')
        ->where('adm_cuentas_porcobrar.idcliente', $clienteId)
        ->where('adm_cuentas_porcobrar.estado', 1)
        // 👇 excluye los registros con saldo_pendiente <= 0
        ->where('adm_cuentas_porcobrar.saldo_pendiente', '>', 0)
        ->select([
            'adm_cuentas_porcobrar.idcuentaporcobrar',
            'adm_cuentas_porcobrar.idcotizacion',
            DB::raw('CAST(f.nofactura AS CHAR) AS nofactura'),
            DB::raw('IFNULL(CAST(f.numero AS CHAR), "") AS numero'),
            'adm_cuentas_porcobrar.fecha_emision',
            'adm_cuentas_porcobrar.monto_original',
            'adm_cuentas_porcobrar.saldo_pendiente',
        ])
        ->orderBy('adm_cuentas_porcobrar.fecha_emision', 'desc');

    return response()->json($q->get());
}


    public function update(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $cuenta = AdmCuentasPorCobrar::find($id);
            if (!$cuenta) {
                return response()->json(['message' => 'Cuenta por cobrar no encontrada'], 404);
            }

            $datos = $request->all();
            $datos['usuario_modificacion']   = auth()->user()->name;
            $datos['idusuario_modificacion'] = auth()->user()->id;
            $datos['fecha_modificacion']     = now();
            $datos['estado']                 = $datos['estado'] ?? $cuenta->estado;

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
            'idcliente'    => 'required|integer',
            'fecha_inicio' => 'required|date',
            'fecha_final'  => 'required|date',
        ]);

        // Carga la factura (serie, número, uuid, nofactura, fecha_certificación)
        $cuentas = AdmCuentasPorCobrar::with([
            'factura:idfactura,serie,numero,uuid,fecha_certificacion,nofactura',
        ])
            ->where('idcliente', $request->idcliente)
            ->whereBetween('fecha_emision', [$request->fecha_inicio, $request->fecha_final])
            ->orderBy('fecha_emision')
            ->get();

        $cliente        = Clientes::find($request->idcliente);
        $totalPendiente = $cuentas->sum('saldo_pendiente');
        $totalPagado    = $cuentas->sum('monto_pagado');

        $pdf = Pdf::loadView('pdf.estado_cuenta', [
            'cuentas'        => $cuentas,
            'cliente'        => $cliente,
            'fechaInicio'    => $request->fecha_inicio,
            'fechaFinal'     => $request->fecha_final,
            'totalPendiente' => $totalPendiente,
            'totalPagado'    => $totalPagado,
        ]);

        return $pdf->stream("estado_cuenta_{$cliente->nombre}.pdf");
    }

    public function generarEstadoCuentaConRecibosPDF(Request $request)
{
    $request->validate([
        'idcliente'    => 'required|integer',
        'fecha_inicio' => 'required|date',
        'fecha_final'  => 'required|date',
    ]);

    $cliente = Clientes::findOrFail($request->idcliente);

    $cuentas = AdmCuentasPorCobrar::with([
        'factura' => function ($q) {
            $q->select(
                'adm_facturacion.idfactura',
                'adm_facturacion.idcotizacion',
                'adm_facturacion.serie',
                'adm_facturacion.numero',
                'adm_facturacion.uuid',
                'adm_facturacion.nofactura',
                'adm_facturacion.estado',
                'adm_facturacion.created_at'
            )->where('adm_facturacion.estado', 1);
        },
        'recibos' => function ($q) use ($request) {
            $q->whereBetween('adm_recibos.fecha_recibo', [$request->fecha_inicio, $request->fecha_final]);
        },
    ])
        ->where('idcliente', $request->idcliente)
        // si quieres incluir pagos a facturas de cualquier fecha, comenta la siguiente línea
        ->whereBetween('fecha_emision', [$request->fecha_inicio, $request->fecha_final])
        ->where('saldo_pendiente', '>', 0)
        ->orderBy('fecha_emision')
        ->get();

    $pdf = Pdf::loadView('pdf.estado_cuenta_completo', [
        'cliente'     => $cliente,
        'cuentas'     => $cuentas,
        'fechaInicio' => $request->fecha_inicio,
        'fechaFinal'  => $request->fecha_final,
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

        $cuentas = AdmCuentasPorCobrar::with([
            'factura:idfactura,serie,numero,uuid,fecha_certificacion,nofactura',
            'recibos' => function ($q) use ($request) {
                $q->select('adm_recibos.idrecibo', 'adm_recibos.fecha_recibo', 'adm_recibos.serie', 'adm_recibos.numero')
                    ->whereBetween('adm_recibos.fecha_recibo', [$request->fecha_inicio, $request->fecha_final]);
            },
        ])
            ->where('idcliente', $request->idcliente)
            ->whereBetween('fecha_emision', [$request->fecha_inicio, $request->fecha_final])
            ->where('saldo_pendiente', '>', 0)
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
