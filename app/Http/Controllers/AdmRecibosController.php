<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AdmRecibo;
use App\Models\AdmCuentasPorCobrar;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\Correlativo;

class AdmRecibosController extends Controller
{
    public function index(Request $request)
    {
        $query = AdmRecibo::with(['cuenta', 'cliente']); // Incluye la relación

        if ($request->has('cliente')) {
            $query->where('idcliente', $request->cliente);
        }

        if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
            $query->whereBetween('fecha_recibo', [$request->fecha_inicio, $request->fecha_fin]);
        }

        $query->where('estado', 1); 
        return $query->orderByDesc('fecha_recibo')->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'idcuentaporcobrar' => 'required|exists:adm_cuentas_porcobrar,idcuentaporcobrar',
            'idcliente' => 'required',
            'fecha_recibo' => 'required|date',
            'monto_recibido' => 'required|numeric|min:0.01',
            'metodo_pago' => 'required|string|max:50',
        ]);

        $cuenta = AdmCuentasPorCobrar::find($request->idcuentaporcobrar);

        if ($cuenta->saldo_pendiente < $request->monto_recibido) {
            return response()->json(['error' => 'El monto recibido excede el saldo pendiente.'], 400);
        }

        $correlativo = Correlativo::find('adm_recibos'); // Obtiene el registro de correlativo para la tabla 'adm_empleados'

        if (!$correlativo) {
            return response()->json(['message' => 'No se encontró el correlativo para recibos'], 400);
        }

        $idRecibo = $correlativo->correlativo + $correlativo->incremento; // Genera el nuevo ID del empleado
        $correlativo->correlativo = $idRecibo; // Actualiza el correlativo en la base de datos
        $correlativo->save();

        $recibo = AdmRecibo::create([
            'idrecibo' => $idRecibo,
            'idcuentaporcobrar' => $request->idcuentaporcobrar,
            'idcliente' => $request->idcliente,
            'fecha_recibo' => $request->fecha_recibo,
            'monto_recibido' => $request->monto_recibido,
            'metodo_pago' => $request->metodo_pago,
            'referencia' => $request->referencia,
            'observaciones' => $request->observaciones,
            'idusuario_creacion' => auth()->user()->id,
            'usuario_creacion' => auth()->user()->name,
            'fecha_creacion' => now(),
            'moneda' => $request->moneda ?? 'GTQ',
            'estado' => 1,
        ]);

        // Rebaja saldo
        $cuenta->monto_pagado += $request->monto_recibido;
        $cuenta->saldo_pendiente -= $request->monto_recibido;
        $cuenta->save();

        return response()->json(['message' => 'Recibo registrado exitosamente', 'recibo' => $recibo]);
    }

    public function show($id)
    {
        return AdmRecibo::with(['cliente', 'cuenta'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'idcuentaporcobrar' => 'required|exists:adm_cuentas_porcobrar,idcuentaporcobrar',
            'idcliente' => 'required',
            'fecha_recibo' => 'required|date',
            'monto_recibido' => 'required|numeric|min:0.01',
            'metodo_pago' => 'required|string|max:50',
        ]);

        $recibo = AdmRecibo::findOrFail($id);
        $cuenta = AdmCuentasPorCobrar::findOrFail($recibo->idcuentaporcobrar);

        // Reversar el monto anterior
        $cuenta->monto_pagado -= $recibo->monto_recibido;
        $cuenta->saldo_pendiente += $recibo->monto_recibido;
        $cuenta->save();

        // Validar nueva cuenta si cambia
        $nuevaCuenta = AdmCuentasPorCobrar::findOrFail($request->idcuentaporcobrar);
        if ($nuevaCuenta->saldo_pendiente < $request->monto_recibido) {
            return response()->json(['error' => 'El monto recibido excede el saldo pendiente de la cuenta nueva.'], 400);
        }

        // Actualiza el recibo
        $recibo->update([
            'idcuentaporcobrar' => $request->idcuentaporcobrar,
            'idcliente' => $request->idcliente,
            'fecha_recibo' => $request->fecha_recibo,
            'monto_recibido' => $request->monto_recibido,
            'metodo_pago' => $request->metodo_pago,
            'referencia' => $request->referencia,
            'observaciones' => $request->observaciones,
            'moneda' => $request->moneda ?? 'GTQ',
            'idusuario_modificacion' => auth()->user()->id,
            'usuario_modificacion' => auth()->user()->name,
            'fecha_modificacion' => now(),
        ]);

        // Aplicar el nuevo abono
        $nuevaCuenta->monto_pagado += $request->monto_recibido;
        $nuevaCuenta->saldo_pendiente -= $request->monto_recibido;
        $nuevaCuenta->save();

        return response()->json(['message' => 'Recibo actualizado correctamente', 'recibo' => $recibo]);
    }


    public function destroy($id)
    {
        $recibo = AdmRecibo::findOrFail($id);
        $cuenta = AdmCuentasPorCobrar::find($recibo->idcuentaporcobrar);

        // Reversa el saldo
        $cuenta->saldo_pendiente += $recibo->monto_recibido;
        $cuenta->monto_pagado -= $recibo->monto_recibido;
        $cuenta->save();

        $recibo->estado = 0;
        $recibo->save();

        return response()->json(['message' => 'Recibo anulado correctamente']);
    }

    public function desactivar($id)
    {
        $recibo = AdmRecibo::findOrFail($id);

        if ($recibo->estado === 0) {
            return response()->json(['message' => 'Recibo ya está desactivado'], 400);
        }

        $cuenta = AdmCuentasPorCobrar::find($recibo->idcuentaporcobrar);

        if ($cuenta) {
            $cuenta->saldo_pendiente += $recibo->monto_recibido;
            $cuenta->monto_pagado -= $recibo->monto_recibido;
            $cuenta->save();
        }

        $recibo->estado = 0;
        $recibo->save();

        return response()->json(['message' => 'Recibo desactivado correctamente']);
    }

    public function generarPdf($id)
    {
        $recibo = AdmRecibo::with('cuenta')->findOrFail($id);

        $data = [
            'recibo' => $recibo,
            'fecha' => now()->format('d/m/Y'),
        ];

        $pdf = Pdf::loadView('pdf.recibo', $data)->setPaper('letter', 'portrait');
        return $pdf->stream('Recibo-' . $recibo->idrecibo . '.pdf');
    }

    public function generarReportePdf(Request $request)
    {
        $query = AdmRecibo::with('cliente');

        if ($request->filled('fecha_inicio') && $request->filled('fecha_fin')) {
            $query->whereBetween('fecha_recibo', [$request->fecha_inicio, $request->fecha_fin]);
        }

        $recibos = $query->orderBy('fecha_recibo')->get();

        $data = [
            'recibos' => $recibos,
            'fechaInicio' => $request->fecha_inicio,
            'fechaFin' => $request->fecha_fin,
            'fechaHoy' => now()->format('d/m/Y'),
        ];

        $pdf = Pdf::loadView('pdf.reporte_recibos', $data)->setPaper('letter', 'portrait');

        return $pdf->stream('reporte_recibos.pdf');
    }
}
