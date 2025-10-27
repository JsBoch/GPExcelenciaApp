<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class ReportesCXCController extends Controller
{
    /**
     * Listado principal (JSON o PDF)
     * Filtros:
     * - fechaInicio, fechaFinal  (se aplican a fecha_emision)
     * - idcliente (opcional)
     * - saldo: PENDIENTES | PAGADAS | TODAS
     */
    public function index(Request $request)
    {
        $fechaInicio = $request->query('fechaInicio');
        $fechaFinal  = $request->query('fechaFinal');
        $idcliente   = $request->query('idcliente');      // opcional
        $saldo       = strtoupper($request->query('saldo', 'PENDIENTES')); // PENDIENTES | PAGADAS | TODAS
        $format      = $request->query('format', 'json');

        $end   = $fechaFinal  ? Carbon::parse($fechaFinal)  : Carbon::today();
        $start = $fechaInicio ? Carbon::parse($fechaInicio) : $end->copy();

        $desde = $start->copy()->startOfDay()->toDateTimeString();
        $hasta = $end->copy()->addDay()->startOfDay()->toDateTimeString();

        // Base: CxC (estado=1) + cliente + cotización + factura (usando idfactura guardado en CxC)
        $q = DB::table('adm_cuentas_porcobrar as cp')
            ->join('clientes as cl', 'cp.idcliente', '=', 'cl.idcliente')
            ->leftJoin('adm_cotizacion as c', 'cp.idcotizacion', '=', 'c.idcotizacion')
            ->leftJoin('adm_facturacion as f', 'cp.idfactura', '=', 'f.idfactura')
            ->select([
                'cp.idcuentaporcobrar',
                DB::raw("CONCAT('CT', CAST(c.nocotizacion AS CHAR)) AS nocotizacion"),
                'cl.nombre as cliente',
                DB::raw('f.nofactura AS nointerno'),
                'f.numero',
                DB::raw("DATE_FORMAT(cp.fecha_emision, '%Y-%m-%d') as fecha_emision"),
                DB::raw("DATE_FORMAT(cp.fecha_vencimiento, '%Y-%m-%d') as fecha_vencimiento"),
                DB::raw('CAST(cp.monto_original  AS DECIMAL(15,2)) AS monto_original'),
                DB::raw('CAST(cp.saldo_pendiente AS DECIMAL(15,2)) AS monto_total_saldo_pendiente'),
                DB::raw('CAST(cp.monto_pagado    AS DECIMAL(15,2)) AS monto_pagado'),
                // días transcurridos desde emisión:
                DB::raw("DATEDIFF(CURDATE(), cp.fecha_emision) AS dias_desde_emision"),
                // días vencidos (solo si ya pasó vencimiento; si no, 0):
                DB::raw("GREATEST(DATEDIFF(CURDATE(), cp.fecha_vencimiento), 0) AS dias_vencidos"),
            ])
            ->where('cp.estado', 1)
            ->whereBetween('cp.fecha_emision', [$desde, $hasta]);

        if (!empty($idcliente)) {
            $q->where('cp.idcliente', $idcliente);
        }

        if ($saldo === 'PENDIENTES') {
            $q->where('cp.saldo_pendiente', '>', 0);
        } elseif ($saldo === 'PAGADAS') {
            $q->where('cp.saldo_pendiente', '=', 0);
        } // TODAS = sin filtro adicional

        $cuentas = $q->orderBy('cp.fecha_emision', 'desc')->get();

        // Resumen
        $totales = [
            'cantidad'      => $cuentas->count(),
            'saldoPendiente'=> (float)$cuentas->sum('monto_total_saldo_pendiente'),
            'montoPagado'   => (float)$cuentas->sum('monto_pagado'),
            'montoOriginal' => (float)$cuentas->sum('monto_original'),
        ];

        if ($format === 'pdf') {
            $pdf = Pdf::loadView('pdf.reporte_cxc', [
                'cuentas'      => $cuentas,
                'totales'      => $totales,
                'fechaInicio'  => $start->format('Y-m-d'),
                'fechaFinal'   => $end->format('Y-m-d'),
                'saldo'        => $saldo,
                'clienteLabel' => $this->clienteLabel($idcliente),
            ])->setPaper('letter', 'landscape');

            return $pdf->download("reporte_cxc_{$start->format('Ymd')}_{$end->format('Ymd')}.pdf");
        }

        return response()->json([
            'cuentas' => $cuentas,
            'totales' => $totales,
        ]);
    }

    /**
     * Detalles de una CxC: recibos/retenciones aplicadas y notas de ajuste
     */
    public function detalles($idcuentaporcobrar)
    {
        // Traemos la fila CxC para conocer idcotizacion / idcliente
        $cxc = DB::table('adm_cuentas_porcobrar')->where('idcuentaporcobrar', $idcuentaporcobrar)->first();
        if (!$cxc) {
            return response()->json(['message' => 'Cuenta por cobrar no encontrada'], 404);
        }

        // RECIBOS aplicados a esta CxC (via detalle)
        $recibos = DB::table('adm_recibo_detalle as rd')
            ->join('adm_recibos as r', 'rd.idrecibo', '=', 'r.idrecibo')
            ->select([
                DB::raw("CONCAT(r.serie, '-', r.numero) AS documento"),
                DB::raw("DATE_FORMAT(r.fecha_recibo, '%Y-%m-%d %H:%i:%s') AS fecha_recibo"),
                DB::raw('CAST(r.monto_recibido AS DECIMAL(15,2)) AS monto_recibido'),
                'r.metodo_pago',
                'r.referencia',
                'r.tipo',
                DB::raw('CAST(rd.monto AS DECIMAL(15,2)) AS monto_aplicado')
            ])
            ->where('rd.idcuentaporcobrar', $idcuentaporcobrar)
            ->orderByDesc('r.fecha_recibo')
            ->get();

        // NOTAS (NCRE/NDEB) relacionadas a la misma cotización (vigentes)
        $notas = DB::table('adm_notas_fel as n')
            ->select([
                DB::raw("n.numero_origen as documento"),
                DB::raw("DATE_FORMAT(n.fecha_nota, '%Y-%m-%d %H:%i:%s') AS fecha_nota"),
                DB::raw('CAST(n.monto_total AS DECIMAL(15,2)) AS monto_total'),
                'n.numero_nota as referencia',
                'n.tipo',
            ])
            ->where('n.idcotizacion', $cxc->idcotizacion)
            ->where('n.resultado', 'S')
            ->orderByDesc('n.fecha_nota')
            ->get();

        return response()->json([
            'recibos' => $recibos,
            'notas'   => $notas,
        ]);
    }

    private function clienteLabel($idcliente)
    {
        if (!$idcliente) return 'Todos';
        $n = DB::table('clientes')->where('idcliente', $idcliente)->value('nombre');
        return $n ?: "Cliente #{$idcliente}";
    }
}
