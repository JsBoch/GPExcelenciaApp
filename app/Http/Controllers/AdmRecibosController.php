<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AdmRecibo;
use App\Models\AdmCuentasPorCobrar;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\Correlativo;
use Illuminate\Support\Facades\Log;

class AdmRecibosController extends Controller
{
    public function index(Request $request)
    {
        $query = AdmRecibo::with([
            'cliente:idcliente,nombre',
            'detalles:idrecibo,idcuentaporcobrar,monto',
            'detalles.cuenta:idcuentaporcobrar,idcliente,idcotizacion,fecha_emision,monto_original,saldo_pendiente',
            'detalles.cuenta.cotizacion:idcotizacion,nofactura',
        ]);

        if ($request->filled('cliente')) {
            $query->where('idcliente', $request->cliente);
        }
        if ($request->filled('fecha_inicio') && $request->filled('fecha_fin')) {
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
        $request->validate([
            'idcliente'      => 'required',
            'fecha_recibo'   => 'required|date',
            'metodo_pago'    => 'required|string|max:50',
            'moneda'         => 'nullable|string|max:10',
            'serie'          => 'required|string|max:10',
            'numero'         => ['required', 'integer', 'min:1'], // sin unique
            'tipo'           => 'required|in:RECIBO,RETENCIÓN',
            'monto_recibido' => 'required|numeric|min:0.01',

            'detalle'                     => 'required|array|min:1',
            'detalle.*.idcuentaporcobrar' => 'required',
            'detalle.*.monto'             => 'required|numeric|min:0.01',
        ]);

        // Normaliza detalle (id como entero y sin basura)
        $detalle = collect($request->detalle)->map(function ($d) {
            $id = (int) preg_replace('/\D+/', '', (string)($d['idcuentaporcobrar'] ?? ''));
            $monto = (float) ($d['monto'] ?? 0);
            return ['idcuentaporcobrar' => $id, 'monto' => $monto];
        })->filter(fn($d) => $d['idcuentaporcobrar'] > 0 && $d['monto'] > 0)->values();

        if ($detalle->isEmpty()) {
            return response()->json(['errors' => ['detalle' => ['No hay partidas válidas en el detalle.']]], 422);
        }

        // Suma detalle = monto_recibido
        $sumaDetalle = $detalle->sum('monto');
        if (abs($sumaDetalle - (float)$request->monto_recibido) > 0.009) {
            return response()->json([
                'errors' => ['detalle' => ['La suma del detalle no coincide con el monto recibido.']],
            ], 422);
        }

        try {
            $recibo = DB::transaction(function () use ($request, $detalle) {

                // 0) Verifica que TODAS las CxC existan y sean del cliente (con lock)
                $idsCxC = $detalle->pluck('idcuentaporcobrar')->unique()->values();
                $cxcs = AdmCuentasPorCobrar::whereIn('idcuentaporcobrar', $idsCxC)
                    ->lockForUpdate()
                    ->get(['idcuentaporcobrar', 'idcliente', 'saldo_pendiente', 'monto_pagado']);

                // detecta faltantes ANTES de crear cabecera
                $encontrados = $cxcs->pluck('idcuentaporcobrar')->map(fn($v) => (int)$v)->all();
                $faltantes = $idsCxC->diff($encontrados)->values();
                if ($faltantes->isNotEmpty()) {
                    return throw \Illuminate\Validation\ValidationException::withMessages([
                        'detalle' => ['No se encontraron las CxC: ' . $faltantes->implode(', ')],
                    ]);
                }

                foreach ($cxcs as $cxc) {
                    if ((string)$cxc->idcliente !== (string)$request->idcliente) {
                        return throw \Illuminate\Validation\ValidationException::withMessages([
                            'detalle' => ["La CxC {$cxc->idcuentaporcobrar} no pertenece al cliente seleccionado."],
                        ]);
                    }
                }

                // 1) CORRELATIVO con bloqueo
                $c = Correlativo::where('tabla', 'adm_recibos')->lockForUpdate()->first();
                if (!$c) {
                    return throw \Illuminate\Validation\ValidationException::withMessages([
                        'correlativo' => ['No se encontró el correlativo para recibos.'],
                    ]);
                }
                $idRecibo = $c->correlativo + $c->incremento;
                $c->correlativo = $idRecibo;
                $c->save();

                // 2) CABECERA
                $recibo = AdmRecibo::create([
                    'idrecibo'           => $idRecibo,
                    'idcliente'          => $request->idcliente,
                    'fecha_recibo'       => $request->fecha_recibo,
                    'monto_recibido'     => $request->monto_recibido,
                    'metodo_pago'        => $request->metodo_pago,
                    'referencia'         => $request->referencia,
                    'observaciones'      => $request->observaciones,
                    'idusuario_creacion' => auth()->user()->id,
                    'usuario_creacion'   => auth()->user()->name,
                    'fecha_creacion'     => now(),
                    'moneda'             => $request->moneda ?? 'GTQ',
                    'estado'             => 1,
                    'serie'              => $request->serie,
                    'numero'             => (int) $request->numero,
                    'tipo'               => $request->tipo ?? 'RECIBO',
                ]);

                // 3) DETALLES + saldos (usa los rows bloqueados de $cxcs)
                foreach ($detalle as $d) {
                    $cuenta = $cxcs->firstWhere('idcuentaporcobrar', $d['idcuentaporcobrar']);
                    $monto  = (float) $d['monto'];

                    if ($monto > (float)$cuenta->saldo_pendiente + 0.009) {
                        return throw \Illuminate\Validation\ValidationException::withMessages([
                            'detalle' => ["El monto ({$monto}) excede el saldo ({$cuenta->saldo_pendiente}) de la CxC {$cuenta->idcuentaporcobrar}."],
                        ]);
                    }

                    \App\Models\AdmReciboDetalle::create([
                        'idrecibo'          => $recibo->idrecibo,
                        'idcuentaporcobrar' => (int)$cuenta->idcuentaporcobrar,
                        'monto'             => $monto,
                    ]);

                    $cuenta->monto_pagado    += $monto;
                    $cuenta->saldo_pendiente -= $monto;
                    $cuenta->save();
                }

                return $recibo->load(['detalles', 'cliente']);
            });

            return response()->json([
                'message' => 'Recibo registrado exitosamente',
                'recibo'  => $recibo,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Illuminate\Database\QueryException $e) {
            // Diagnóstico fino por constraint
            $sqlState  = $e->errorInfo[0] ?? null; // '23000'
            $driverErr = (int)($e->errorInfo[1] ?? 0); // 1062, 1452, etc.
            $driverMsg = $e->errorInfo[2] ?? $e->getMessage();

            if ($sqlState === '23000' && $driverErr === 1452) {
                // Detecta qué columna falló según el mensaje
                if (str_contains($driverMsg, '`idcuentaporcobrar`')) {
                    return response()->json([
                        'errors' => ['detalle' => ['Alguna CxC no existe o fue anulada; verifique las cuentas seleccionadas.']],
                    ], 422);
                }
                if (str_contains($driverMsg, '`idrecibo`')) {
                    return response()->json([
                        'errors' => ['idrecibo' => ['No se pudo relacionar el detalle con el recibo (revise tipos/FK de idrecibo).']],
                    ], 422);
                }
            }
            if ($sqlState === '23000' && $driverErr === 1062) {
                // Duplicado (¿PK en detalle? ¿índice único?)
                return response()->json([
                    'errors' => ['detalle' => ['Detalle duplicado: revise si la misma CxC se está enviando más de una vez.']],
                ], 422);
            }

            throw $e; // deja que el log te diga exactamente qué pasó
        }
    }



    public function show($id)
    {
        return AdmRecibo::with([
            'cliente:idcliente,nombre',
            'detalles:idrecibodet,idrecibo,idcuentaporcobrar,monto',
            'detalles.cuenta:idcuentaporcobrar,idcliente,idcotizacion,fecha_emision,monto_original,saldo_pendiente',
            'detalles.cuenta.cotizacion:idcotizacion,nofactura',
        ])->findOrFail($id);
    }



    public function update(Request $request, $id)
    {
        $request->validate([
            'idcliente'      => 'required',
            'fecha_recibo'   => 'required|date',
            'metodo_pago'    => 'required|string|max:50',
            'moneda'         => 'nullable|string|max:10',
            'serie'          => 'required|string|max:10',
            'numero'         => [
                'required',
                'integer',
                'min:1',
                // \Illuminate\Validation\Rule::unique('adm_recibos', 'numero')
                //     ->ignore($id, 'idrecibo')
                //     ->where(
                //         fn($q) => $q
                //             ->where('serie', $request->serie)
                //             ->where('tipo',  $request->input('tipo', 'RECIBO'))
                //             ->where('estado', 1)
                //     ),
            ],
            'tipo'           => 'required|in:RECIBO,RETENCIÓN',
            'monto_recibido' => 'required|numeric|min:0.01',
            'detalle'                        => 'required|array|min:1',
            'detalle.*.idcuentaporcobrar'    => 'required|exists:adm_cuentas_porcobrar,idcuentaporcobrar',
            'detalle.*.monto'                => 'required|numeric|min:0.01',
        ]);

        $sumaDetalle = collect($request->detalle)->sum(fn($d) => (float)$d['monto']);
        if (abs($sumaDetalle - (float)$request->monto_recibido) > 0.009) {
            return response()->json([
                'errors' => ['detalle' => ['La suma del detalle no coincide con el monto recibido.']],
            ], 422);
        }

        try {
            DB::transaction(function () use ($request, $id) {
                /** @var \App\Models\AdmRecibo $recibo */
                $recibo = AdmRecibo::with('detalles')->lockForUpdate()->findOrFail($id);

                // Revertir saldos de los detalles actuales
                foreach ($recibo->detalles as $det) {
                    $cuenta = AdmCuentasPorCobrar::lockForUpdate()->find($det->idcuentaporcobrar);
                    if ($cuenta) {
                        $cuenta->saldo_pendiente += $det->monto;
                        $cuenta->monto_pagado    -= $det->monto;
                        $cuenta->save();
                    }
                }

                // Borrar detalles actuales
                \App\Models\AdmReciboDetalle::where('idrecibo', $recibo->idrecibo)->delete();

                // Validar que todas las CxC pertenezcan al cliente
                $idsCxC = collect($request->detalle)->pluck('idcuentaporcobrar')->all();
                $cxcs = AdmCuentasPorCobrar::whereIn('idcuentaporcobrar', $idsCxC)->lockForUpdate()->get();
                foreach ($cxcs as $cxc) {
                    if ((string)$cxc->idcliente !== (string)$request->idcliente) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'detalle' => ["La CxC {$cxc->idcuentaporcobrar} no pertenece al cliente seleccionado."],
                        ]);
                    }
                }

                // Crear detalles nuevos y actualizar saldos
                foreach ($request->detalle as $d) {
                    $cuenta = $cxcs->firstWhere('idcuentaporcobrar', $d['idcuentaporcobrar']);
                    if (!$cuenta) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'detalle' => ["La CxC {$d['idcuentaporcobrar']} no existe."],
                        ]);
                    }

                    $monto = (float)$d['monto'];
                    if ($monto > (float)$cuenta->saldo_pendiente + 0.009) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'detalle' => ["El monto ($monto) excede el saldo pendiente ({$cuenta->saldo_pendiente}) de la CxC {$cuenta->idcuentaporcobrar}."],
                        ]);
                    }

                    \App\Models\AdmReciboDetalle::create([
                        'idrecibo'          => $recibo->idrecibo,
                        'idcuentaporcobrar' => $cuenta->idcuentaporcobrar,
                        'monto'             => $monto,
                    ]);

                    $cuenta->monto_pagado    += $monto;
                    $cuenta->saldo_pendiente -= $monto;
                    $cuenta->save();
                }

                // Actualizar cabecera
                $recibo->update([
                    'idcliente'            => $request->idcliente,
                    'fecha_recibo'         => $request->fecha_recibo,
                    'monto_recibido'       => $request->monto_recibido,
                    'metodo_pago'          => $request->metodo_pago,
                    'referencia'           => $request->referencia,
                    'observaciones'        => $request->observaciones,
                    'serie'                => $request->serie ?? 'A',
                    'numero'               => (int)$request->numero,
                    'moneda'               => $request->moneda ?? 'GTQ',
                    'idusuario_modificacion' => auth()->user()->id,
                    'usuario_modificacion'   => auth()->user()->name,
                    'fecha_modificacion'     => now(),
                    'tipo'                 => $request->tipo ?? 'RECIBO',
                ]);
            });

            return response()->json(['message' => 'Recibo actualizado correctamente']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'No se pudo actualizar el recibo'], 500);
        }
    }



    public function destroy($id)
    {
        try {
            DB::transaction(function () use ($id) {
                $recibo = AdmRecibo::with('detalles')->lockForUpdate()->findOrFail($id);

                if ($recibo->estado === 0) {
                    return; // ya anulado
                }

                foreach ($recibo->detalles as $det) {
                    $cuenta = AdmCuentasPorCobrar::lockForUpdate()->find($det->idcuentaporcobrar);
                    if ($cuenta) {
                        $cuenta->saldo_pendiente += $det->monto;
                        $cuenta->monto_pagado    -= $det->monto;
                        $cuenta->save();
                    }
                }

                $recibo->estado = 0;
                $recibo->save();
            });

            return response()->json(['message' => 'Recibo anulado correctamente']);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'No se pudo anular el recibo'], 500);
        }
    }

    public function desactivar($id)
    {
        try {
            DB::transaction(function () use ($id) {
                $recibo = AdmRecibo::with('detalles')->lockForUpdate()->findOrFail($id);

                if ($recibo->estado === 0) {
                    return; // ya anulado
                }

                foreach ($recibo->detalles as $det) {
                    $cuenta = AdmCuentasPorCobrar::lockForUpdate()->find($det->idcuentaporcobrar);
                    if ($cuenta) {
                        $cuenta->saldo_pendiente += $det->monto;
                        $cuenta->monto_pagado    -= $det->monto;
                        $cuenta->save();
                    }
                }

                $recibo->estado = 0;
                $recibo->save();
            });

            return response()->json(['message' => 'Recibo anulado correctamente']);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'No se pudo anular el recibo'], 500);
        }
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
