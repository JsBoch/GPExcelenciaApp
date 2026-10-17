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



        // Evitar que una CxC aparezca más de una vez dentro del mismo recibo.
        // Se valida ANTES de reservar el correlativo o modificar cualquier saldo.
        $idsDuplicados = $detalle->pluck('idcuentaporcobrar')
            ->duplicates()->unique()->values();

        if ($idsDuplicados->isNotEmpty()) {
            return response()->json([
                'errors' => [
                    'detalle' => [
                        'La misma cuenta por cobrar aparece más de una vez: ' .
                        $idsDuplicados->implode(', ') . '. Agrupe el monto en una sola partida.'
                    ],
                ],
            ], 422);
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

                $idsCxC = $detalle->pluck('idcuentaporcobrar')
                    ->unique()->sort()->values();

                $cxcs = AdmCuentasPorCobrar::whereIn('idcuentaporcobrar', $idsCxC)
                    ->orderBy('idcuentaporcobrar', 'asc')
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



                // Comprobar excedentes mientras siguen bloqueadas todas las CxC.
                // Un pago nuevo no debe alterar una cuenta pendiente de revisión FEL.
                $this->impedirCambiosReciboConExcedenteFEL($idsCxC);

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







    /**
     * Etapa 73: cuenta CXC bloqueada antes de comprobar excedentes o tocar pagos.
     * Debe invocarse desde la transaccion, con ids unicos y ordenados.
     */
    private function bloquearCuentasRecibo($ids)
    {
        $ids = collect($ids)->map(fn ($v) => (int) $v)
            ->filter(fn ($v) => $v > 0)->unique()->sort()->values();

        if ($ids->isEmpty()) {
            return collect(); // Recibo antiguo sin partidas: no hay CXC que bloquear.
        }

        $cxcs = AdmCuentasPorCobrar::query()
            ->whereIn('idcuentaporcobrar', $ids->all())
            ->orderBy('idcuentaporcobrar')
            ->lockForUpdate()
            ->get();

        if ($cxcs->count() !== $ids->count()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'detalle' => ['Una o mas cuentas por cobrar no existen.'],
            ]);
        }

        return $cxcs->keyBy('idcuentaporcobrar');
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'idcliente' => 'required',
            'fecha_recibo' => 'required|date',
            'metodo_pago' => 'required|string|max:50',
            'moneda' => 'nullable|string|max:10',
            'serie' => 'required|string|max:10',
            'numero' => ['required', 'integer', 'min:1'],
            'tipo' => 'required|in:RECIBO,RETENCIÓN',
            'monto_recibido' => 'required|numeric|min:0.01',
            'detalle' => 'required|array|min:1',
            'detalle.*.idcuentaporcobrar' => 'required|exists:adm_cuentas_porcobrar,idcuentaporcobrar',
            'detalle.*.monto' => 'required|numeric|min:0.01',
        ]);

        $detalle = collect($request->detalle);
        $suma = $detalle->sum(fn ($d) => (float) $d['monto']);
        if (abs($suma - (float) $request->monto_recibido) > 0.009) {
            return response()->json(['errors' => [
                'detalle' => ['La suma del detalle no coincide con el monto recibido.'],
            ]], 422);
        }
        $nuevosIds = $detalle->pluck('idcuentaporcobrar')->map(fn ($v) => (int) $v);
        if ($nuevosIds->unique()->count() !== $nuevosIds->count()) {
            return response()->json(['errors' => [
                'detalle' => ['No se puede repetir una misma cuenta por cobrar en el recibo.'],
            ]], 422);
        }

        try {
            DB::transaction(function () use ($request, $id, $detalle, $nuevosIds) {
                // Primero bloquear recibo; despues cargar sus detalles actuales.
                $recibo = AdmRecibo::lockForUpdate()->findOrFail($id);
                if ((int) $recibo->estado !== 1) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'detalle' => ['No se puede modificar un recibo anulado.'],
                    ]);
                }
                $anteriores = \App\Models\AdmReciboDetalle::where('idrecibo', $id)
                    ->orderBy('idcuentaporcobrar')->get();
                $idsAfectados = $anteriores->pluck('idcuentaporcobrar')->merge($nuevosIds);
                $cxcs = $this->bloquearCuentasRecibo($idsAfectados);

                // Verificar excedentes despues de obtener los locks CXC.
                $this->impedirCambiosReciboConExcedenteFEL($idsAfectados);
                foreach ($cxcs as $cuenta) {
                    if ((int) $cuenta->idcliente !== (int) $request->idcliente) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'detalle' => ["La CxC {$cuenta->idcuentaporcobrar} no pertenece al cliente seleccionado."],
                        ]);
                    }
                }
                // Verificar que las cuentas anteriores sean del cliente original.
                foreach ($anteriores as $anterior) {
                    if ((int) $cxcs->get((int)$anterior->idcuentaporcobrar)->idcliente !== (int) $recibo->idcliente) {
                        throw new \RuntimeException('Inconsistencia entre recibo anterior y cliente de su cuenta.');
                    }
                }

                // Revertir usando los modelos ya bloqueados.
                foreach ($anteriores as $anterior) {
                    $cuenta = $cxcs->get((int) $anterior->idcuentaporcobrar);
                    $cuenta->saldo_pendiente += $anterior->monto;
                    $cuenta->monto_pagado -= $anterior->monto;
                    $cuenta->save();
                }
                \App\Models\AdmReciboDetalle::where('idrecibo', $id)->delete();

                foreach ($detalle as $d) {
                    $cuenta = $cxcs->get((int) $d['idcuentaporcobrar']);
                    $monto = (float) $d['monto'];
                    if ($monto > (float) $cuenta->saldo_pendiente + 0.009) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'detalle' => ["El monto ({$monto}) excede el saldo pendiente ({$cuenta->saldo_pendiente}) de la CxC {$cuenta->idcuentaporcobrar}."],
                        ]);
                    }
                    \App\Models\AdmReciboDetalle::create([
                        'idrecibo' => $recibo->idrecibo,
                        'idcuentaporcobrar' => $cuenta->idcuentaporcobrar,
                        'monto' => $monto,
                    ]);
                    $cuenta->monto_pagado += $monto;
                    $cuenta->saldo_pendiente -= $monto;
                    $cuenta->save();
                }

                $recibo->update([
                    'idcliente' => $request->idcliente,
                    'fecha_recibo' => $request->fecha_recibo,
                    'monto_recibido' => $request->monto_recibido,
                    'metodo_pago' => $request->metodo_pago,
                    'referencia' => $request->referencia,
                    'observaciones' => $request->observaciones,
                    'serie' => $request->serie ?? 'A',
                    'numero' => (int) $request->numero,
                    'moneda' => $request->moneda ?? 'GTQ',
                    'idusuario_modificacion' => auth()->user()->id,
                    'usuario_modificacion' => auth()->user()->name,
                    'fecha_modificacion' => now(),
                    'tipo' => $request->tipo ?? 'RECIBO',
                ]);
            });
            return response()->json(['message' => 'Recibo actualizado correctamente']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al actualizar recibo', ['idrecibo' => $id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'No se pudo actualizar el recibo'], 500);
        }
    }

    /** Ambos endpoints de anulacion comparten una unica rutina transaccional. */
    private function anularReciboProtegido($id)
    {
        return DB::transaction(function () use ($id) {
            $recibo = AdmRecibo::lockForUpdate()->findOrFail($id);
            if ((int) $recibo->estado === 0) return;

            $detalles = \App\Models\AdmReciboDetalle::where('idrecibo', $id)
                ->orderBy('idcuentaporcobrar')->get();
            $cxcs = $this->bloquearCuentasRecibo($detalles->pluck('idcuentaporcobrar'));
            $this->impedirCambiosReciboConExcedenteFEL($detalles->pluck('idcuentaporcobrar'));

            foreach ($detalles as $det) {
                $cuenta = $cxcs->get((int) $det->idcuentaporcobrar);
                if ((int) $cuenta->idcliente !== (int) $recibo->idcliente) {
                    throw new \RuntimeException('El recibo tiene cuentas de otro cliente.');
                }
                $cuenta->saldo_pendiente += $det->monto;
                $cuenta->monto_pagado -= $det->monto;
                $cuenta->save();
            }
            $recibo->estado = 0;
            $recibo->save();
        });
    }

    public function destroy($id)
    {
        try {
            $this->anularReciboProtegido($id);
            return response()->json(['message' => 'Recibo anulado correctamente']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'resultado' => false,
                'mensaje' => 'No se puede anular el recibo porque existen movimientos FEL con excedentes pendientes de revisión.',
                'errors' => $e->errors(),
            ], 409);
        } catch (\Throwable $e) {
            Log::error('Error al anular recibo', ['idrecibo' => $id, 'error' => $e->getMessage()]);
            return response()->json(['resultado' => false, 'mensaje' => 'No se pudo anular el recibo.'], 500);
        }
    }

    public function desactivar($id)
    {
        try {
            $this->anularReciboProtegido($id);
            return response()->json(['message' => 'Recibo anulado correctamente']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Recibo bloqueado por excedente FEL.',
                'errors' => $e->errors(),
            ], 409);
        } catch (\Throwable $e) {
            Log::error('Error al desactivar recibo', ['idrecibo' => $id, 'error' => $e->getMessage()]);
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



    private function impedirCambiosReciboConExcedenteFEL($idsCxc): void

    {

        $ids = collect($idsCxc)

            ->map(fn($id) => (int) $id)

            ->filter(fn($id) => $id > 0)

            ->unique()

            ->values()

            ->all();



        if (empty($ids)) {

            return;

        }



        $afectadas = DB::table('adm_cxc_movimientos_fel')

            ->whereIn('idcuentaporcobrar', $ids)

            ->where('excedente', '>', 0)

            ->distinct()

            ->pluck('idcuentaporcobrar');



        if ($afectadas->isNotEmpty()) {

            throw \Illuminate\Validation\ValidationException::withMessages([

                'detalle' => [

                    'No se puede modificar ni anular este recibo porque las cuentas ' .

                        $afectadas->implode(', ') .

                        ' tienen excedentes de notas FEL. Requiere revisión financiera previa.'

                ],

            ]);

        }

    }

}