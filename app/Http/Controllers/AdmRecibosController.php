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
        $query = AdmRecibo::with(['cuenta.cotizacion:idcotizacion,nofactura', 'cliente']); // Incluye la relación

        if ($request->has('cliente')) {
            $query->where('idcliente', $request->cliente);
        }

        if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
            $query->whereBetween('fecha_recibo', [$request->fecha_inicio, $request->fecha_fin]);
        }
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        $query->where('estado', 1);
        return $query->orderByDesc('fecha_recibo')->get();
    }

    public function store(Request $request)
    {
        // Validación con mensaje claro para duplicados
        $request->validate([
            'idcuentaporcobrar' => 'required|exists:adm_cuentas_porcobrar,idcuentaporcobrar',
            'idcliente'         => 'required',
            'fecha_recibo'      => 'required|date',
            'monto_recibido'    => 'required|numeric|min:0.01',
            'metodo_pago'       => 'required|string|max:50',

            // Evitar duplicados entre activos (tipo+serie+numero con estado=1)
            'serie'  => 'required|string|max:10',
            'numero' => [
                'required',
                'integer',
                'min:1',
                \Illuminate\Validation\Rule::unique('adm_recibos', 'numero')
                    ->where(
                        fn($q) => $q
                            ->where('serie', $request->serie)
                            ->where('tipo',  $request->input('tipo', 'RECIBO'))
                            ->where('estado', 1)
                    ),
            ],
            'tipo'   => 'required|in:RECIBO,RETENCIÓN',
        ], [
            'numero.unique' => 'El número de documento ya existe para la serie y tipo especificados.',
        ]);

        try {
            $recibo = DB::transaction(function () use ($request) {
                // Bloquea la CxC para evitar condiciones de carrera
                /** @var \App\Models\AdmCuentasPorCobrar $cuenta */
                $cuenta = AdmCuentasPorCobrar::where('idcuentaporcobrar', $request->idcuentaporcobrar)
                    ->lockForUpdate()
                    ->firstOrFail();

                // Revalidar saldo dentro de la transacción
                if ($cuenta->saldo_pendiente < $request->monto_recibido) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'monto_recibido' => ['El monto recibido excede el saldo pendiente.'],
                    ]);
                }

                // Correlativo
                $correlativo = Correlativo::find('adm_recibos');
                if (!$correlativo) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'correlativo' => ['No se encontró el correlativo para recibos.'],
                    ]);
                }

                $idRecibo = $correlativo->correlativo + $correlativo->incremento;
                $correlativo->correlativo = $idRecibo;
                $correlativo->save();

                // Crear recibo
                $recibo = AdmRecibo::create([
                    'idrecibo'            => $idRecibo,
                    'idcuentaporcobrar'   => $request->idcuentaporcobrar,
                    'idcliente'           => $request->idcliente,
                    'fecha_recibo'        => $request->fecha_recibo,
                    'monto_recibido'      => $request->monto_recibido,
                    'metodo_pago'         => $request->metodo_pago,
                    'referencia'          => $request->referencia,
                    'observaciones'       => $request->observaciones,
                    'idusuario_creacion'  => auth()->user()->id,
                    'usuario_creacion'    => auth()->user()->name,
                    'fecha_creacion'      => now(),
                    'moneda'              => $request->moneda ?? 'GTQ',
                    'estado'              => 1,
                    'serie'               => $request->serie ?? 'A',
                    'numero'              => (int) $request->numero,
                    'tipo'                => $request->tipo ?? 'RECIBO',
                ]);

                // Actualizar saldos
                $cuenta->monto_pagado   += $request->monto_recibido;
                $cuenta->saldo_pendiente -= $request->monto_recibido;
                $cuenta->save();

                return $recibo;
            });

            return response()->json([
                'message' => 'Recibo registrado exitosamente',
                'recibo'  => $recibo,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Errores de validación (incluye saldo o correlativo)
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Illuminate\Database\QueryException $e) {
            // Choque con índice único de BD
            if ($e->getCode() === '23000') {
                return response()->json([
                    'errors' => ['numero' => ['El número de documento ya existe para la serie y tipo especificados.']],
                ], 422);
            }
            throw $e;
        }
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

            'serie' => 'required|string|max:10',
            'numero' => [
                'required',
                'integer',
                'min:1',
                \Illuminate\Validation\Rule::unique('adm_recibos', 'numero')
                    ->ignore($id, 'idrecibo') // muy importante
                    ->where(
                        fn($q) => $q
                            ->where('serie', $request->serie)
                            ->where('tipo', $request->input('tipo', 'RECIBO'))
                            ->where('estado', 1)    // Opción A; quita esta línea para Opción B
                    ),
            ],
            'tipo' => 'required|in:RECIBO,RETENCIÓN',
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
            'serie' => $request->serie ?? 'A',
            'numero' => $request->numero,
            'moneda' => $request->moneda ?? 'GTQ',
            'idusuario_modificacion' => auth()->user()->id,
            'usuario_modificacion' => auth()->user()->name,
            'fecha_modificacion' => now(),
            'tipo' => $request->tipo ?? 'RECIBO',
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
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
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
