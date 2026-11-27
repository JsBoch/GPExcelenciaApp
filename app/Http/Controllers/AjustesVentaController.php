<?php

namespace App\Http\Controllers;

use App\Services\AjustesVentaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AjustesVentaController extends Controller
{

    public function index(Request $request)
    {
        Gate::authorize('ajustes-ventas.consultar');

        $filtros = $request->validate([
            'fecha_inicio' => 'nullable|date_format:Y-m-d',
            'fecha_fin' => 'nullable|date_format:Y-m-d|after_or_equal:fecha_inicio',
            'estado' => 'nullable|in:BORRADOR,SOLICITADO,APROBADO,RECHAZADO,ANULADO',
            'tipo_ajuste' => 'nullable|in:REDUCCION,AUMENTO,CANCELACION,ESPECIFICACIONES',
            'idcotizacion' => 'nullable|integer|min:1',
            'idcliente' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = DB::table('adm_ajustes_venta as a')
            ->join('adm_cotizacion as c', 'a.idcotizacion', '=', 'c.idcotizacion')
            ->leftJoin('clientes as cl', 'a.idcliente', '=', 'cl.idcliente')
            ->leftJoin('users as us', 'a.idusuario_solicita', '=', 'us.id')
            ->leftJoin('users as ua', 'a.idusuario_aprueba', '=', 'ua.id')
            ->select(
                'a.idajuste',
                'a.idcotizacion',
                'c.nocotizacion',
                'a.idpedidoproduccion',
                'a.idcliente',
                'cl.nombre as cliente',
                'c.trabajo',
                'a.tipo_ajuste',
                'a.motivo',
                'a.fecha_solicitud',
                'a.fecha_aprobacion',
                'a.fecha_efectiva',
                'a.estado',
                'a.estado_produccion',
                'a.estado_fel',
                'a.estado_cxc',
                'a.monto_original',
                'a.monto_anterior',
                'a.monto_nuevo',
                'a.diferencia',
                'a.idusuario_solicita',
                'us.name as solicitante',
                'a.idusuario_aprueba',
                'ua.name as aprobador'
            );

        if (!empty($filtros['estado'])) {
            $query->where('a.estado', $filtros['estado']);
        }

        if (!empty($filtros['tipo_ajuste'])) {
            $query->where('a.tipo_ajuste', $filtros['tipo_ajuste']);
        }

        if (!empty($filtros['idcotizacion'])) {
            $query->where('a.idcotizacion', $filtros['idcotizacion']);
        }

        if (!empty($filtros['idcliente'])) {
            $query->where('a.idcliente', $filtros['idcliente']);
        }

        // Para consultar las solicitudes se utiliza fecha_solicitud.
        // Los reportes comerciales usarán fecha_efectiva.
        if (!empty($filtros['fecha_inicio'])) {
            $query->where(
                'a.fecha_solicitud',
                '>=',
                $filtros['fecha_inicio'] . ' 00:00:00'
            );
        }

        if (!empty($filtros['fecha_fin'])) {
            $query->where(
                'a.fecha_solicitud',
                '<',
                \Carbon\Carbon::parse($filtros['fecha_fin'])
                    ->addDay()
                    ->format('Y-m-d') . ' 00:00:00'
            );
        }

        return response()->json(
            $query
                ->orderByDesc('a.fecha_solicitud')
                ->orderByDesc('a.idajuste')
                ->paginate($filtros['per_page'] ?? 25)
        );
    }


    public function show(int $id)
    {
        Gate::authorize('ajustes-ventas.consultar');

        $ajuste = DB::table('adm_ajustes_venta as a')
            ->join('adm_cotizacion as c', 'a.idcotizacion', '=', 'c.idcotizacion')
            ->leftJoin('clientes as cl', 'a.idcliente', '=', 'cl.idcliente')
            ->leftJoin('users as us', 'a.idusuario_solicita', '=', 'us.id')
            ->leftJoin('users as ua', 'a.idusuario_aprueba', '=', 'ua.id')
            ->where('a.idajuste', $id)
            ->select(
                'a.*',
                'c.nocotizacion',
                'c.trabajo',
                'cl.nombre as cliente',
                'us.name as solicitante',
                'ua.name as aprobador'
            )
            ->first();

        if (!$ajuste) {
            return response()->json([
                'message' => 'Ajuste de venta no encontrado.'
            ], 404);
        }

        $detalles = DB::table('adm_ajustes_venta_detalle')
            ->where('idajuste', $id)
            ->orderBy('iddetalleajuste')
            ->get();

        foreach ($detalles as $detalle) {
            $detalle->datos_anteriores = $detalle->datos_anteriores
                ? json_decode($detalle->datos_anteriores, true)
                : null;

            $detalle->datos_nuevos = $detalle->datos_nuevos
                ? json_decode($detalle->datos_nuevos, true)
                : null;
        }

        $eventos = DB::table('adm_ajustes_venta_eventos as e')
            ->leftJoin('users as u', 'e.idusuario', '=', 'u.id')
            ->where('e.idajuste', $id)
            ->select(
                'e.idevento',
                'e.accion',
                'e.estado_anterior',
                'e.estado_nuevo',
                'e.descripcion',
                'e.datos_evento',
                'e.fecha_evento',
                'e.idusuario',
                'u.name as usuario'
            )
            ->orderBy('e.idevento')
            ->get();

        foreach ($eventos as $evento) {
            $evento->datos_evento = $evento->datos_evento
                ? json_decode($evento->datos_evento, true)
                : null;
        }

        $produccion = DB::table('adm_ajustes_venta_produccion')
            ->where('idajuste', $id)
            ->get();

        $documentos = DB::table('adm_ajustes_venta_documentos')
            ->where('idajuste', $id)
            ->get();

        return response()->json([
            'ajuste' => $ajuste,
            'detalles' => $detalles,
            'eventos' => $eventos,
            'produccion' => $produccion,
            'documentos' => $documentos,
        ]);
    }


    public function resumen(Request $request)
    {
        Gate::authorize('ajustes-ventas.reportes');

        $filtros = $request->validate([
            'fecha_inicio' => 'required|date_format:Y-m-d',
            'fecha_fin' => 'required|date_format:Y-m-d|after_or_equal:fecha_inicio',
            'idcliente' => 'nullable|integer|min:1',
        ]);

        $base = DB::table('adm_ajustes_venta as a');

        if (!empty($filtros['idcliente'])) {
            $base->where('a.idcliente', $filtros['idcliente']);
        }

        // Período efectivo para los ajustes aprobados.
        $aprobados = (clone $base)
            ->where('a.estado', 'APROBADO')
            ->whereBetween('a.fecha_efectiva', [
                $filtros['fecha_inicio'],
                $filtros['fecha_fin'],
            ]);

        $totales = (clone $aprobados)
            ->selectRaw('COUNT(*) as cantidad')
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN diferencia > 0
                THEN diferencia ELSE 0 END), 0) as positivos"
            )
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN diferencia < 0
                THEN diferencia ELSE 0 END), 0) as negativos"
            )
            ->selectRaw(
                'COALESCE(SUM(diferencia), 0) as neto'
            )
            ->first();

        // Los pendientes se consultan por fecha de solicitud.
        $pendientes = (clone $base)
            ->where('a.estado', 'SOLICITADO')
            ->where('a.fecha_solicitud', '>=', $filtros['fecha_inicio'] . ' 00:00:00')
            ->where(
                'a.fecha_solicitud',
                '<',
                \Carbon\Carbon::parse($filtros['fecha_fin'])
                    ->addDay()
                    ->format('Y-m-d') . ' 00:00:00'
            )
            ->count();

        $porDia = (clone $aprobados)
            ->selectRaw('fecha_efectiva as fecha')
            ->selectRaw('COUNT(*) as cantidad')
            ->selectRaw('COALESCE(SUM(diferencia), 0) as neto')
            ->groupBy('fecha_efectiva')
            ->orderBy('fecha_efectiva')
            ->get();

        $porTipo = (clone $aprobados)
            ->selectRaw('tipo_ajuste')
            ->selectRaw('COUNT(*) as cantidad')
            ->selectRaw('COALESCE(SUM(diferencia), 0) as neto')
            ->groupBy('tipo_ajuste')
            ->orderBy('tipo_ajuste')
            ->get();

        return response()->json([
            'periodo' => [
                'fecha_inicio' => $filtros['fecha_inicio'],
                'fecha_fin' => $filtros['fecha_fin'],
            ],
            'indicadores' => [
                'ajustes_aprobados' => (int) $totales->cantidad,
                'ajustes_pendientes_solicitados_en_periodo' => $pendientes,
                'ajustes_positivos' => $totales->positivos,
                'ajustes_negativos' => $totales->negativos,
                'ajuste_neto' => $totales->neto,
            ],
            'por_dia' => $porDia,
            'por_tipo' => $porTipo,
        ]);
    }



    /**
     * Consulta la información base para un ajuste de venta.
     *
     * No modifica cotizaciones, pedidos, facturas ni CxC.
     */
    public function contexto(int $idcotizacion): JsonResponse
    {
        Gate::authorize('ajustes-ventas.consultar');
        $cotizacion = DB::table('adm_cotizacion as c')
            ->leftJoin(
                'clientes as cl',
                'c.idcliente',
                '=',
                'cl.idcliente'
            )
            ->where('c.idcotizacion', $idcotizacion)
            ->select(
                'c.idcotizacion',
                'c.nocotizacion',
                'c.idcliente',
                'cl.nombre as cliente',
                'c.trabajo',
                'c.fecha_cotizacion',
                'c.fecha_registro',
                'c.estado',
                'c.version',
                'c.precio_total',
                'c.total_general',
                'c.subtotal',
                'c.descuento_monto',
                'c.impuesto_iva',
                'c.timbre_prensa_monto',
                'c.total',
                'c.fecha_certificacion'
            )
            ->first();

        if (!$cotizacion) {
            return response()->json([
                'message' => 'Cotización no encontrada.',
            ], 404);
        }

        $detalles = DB::table('adm_detalle_cotizacion')
            ->where('idcotizacion', $idcotizacion)
            ->orderBy('iddetallecotizacion')
            ->select(
                'iddetallecotizacion',
                'idcotizacion',
                'numero_envio',
                'titulo',
                'descripcion',
                'producto',
                'cantidad',
                'unidad_medida',
                'precio',
                'precio_unitario',
                'subtotal',
                'descuento',
                'impuesto_iva',
                'total',
                'aplica_timbre_prensa',
                'estado'
            )
            ->get();

        $pedidos = DB::table('adm_pedidos_produccion')
            ->where('idcotizacion', $idcotizacion)
            ->orderBy('nopedido')
            ->select(
                'idpedidoproduccion',
                'nopedido',
                'no_envio_asociado',
                'idcotizacion',
                'fecha_pedido',
                'fecha_entrega',
                'trabajo',
                'estado',
                'autorizacion_estado',
                'autorizacion_fecha',
                'version',
                'total_general'
            )
            ->get();

        $facturas = DB::table('adm_facturacion')
            ->where('idcotizacion', $idcotizacion)
            ->orderBy('idfactura')
            ->select(
                'idfactura',
                'idcotizacion',
                'resultado',
                'uuid',
                'serie',
                'numero',
                'fecha_certificacion',
                'estado',
                'fecha_anulacion',
                'subtotal_factura',
                'descuento_factura',
                'iva_factura',
                'timbre_prensa_monto',
                'total_factura'
            )
            ->get();

        $cuentaPorCobrar = DB::table('adm_cuentas_porcobrar')
            ->where('idcotizacion', $idcotizacion)
            ->select(
                'idcuentaporcobrar',
                'idcotizacion',
                'idcliente',
                'idfactura',
                'moneda',
                'monto_original',
                'monto_pagado',
                'descuento_aplicado',
                'saldo_pendiente',
                'estado'
            )
            ->first();

        $ajustes = DB::table('adm_ajustes_venta')
            ->where('idcotizacion', $idcotizacion)
            ->orderByDesc('idajuste')
            ->select(
                'idajuste',
                'idpedidoproduccion',
                'tipo_ajuste',
                'motivo',
                'fecha_solicitud',
                'fecha_aprobacion',
                'fecha_efectiva',
                'estado',
                'estado_produccion',
                'estado_fel',
                'estado_cxc',
                'monto_anterior',
                'monto_nuevo',
                'diferencia'
            )
            ->get();


        // Reconstruir el estado comercial vigente por renglón.
        // Únicamente participan ajustes APROBADOS.
        $detallesAprobados = DB::table('adm_ajustes_venta_detalle as d')
            ->join(
                'adm_ajustes_venta as a',
                'a.idajuste',
                '=',
                'd.idajuste'
            )
            ->where('a.idcotizacion', $idcotizacion)
            ->where('a.estado', 'APROBADO')
            ->whereNotNull('d.iddetallecotizacion')
            ->orderBy('a.idajuste')
            ->orderBy('d.iddetalleajuste')
            ->select(
                'a.idajuste',
                'd.iddetallecotizacion',
                'd.cantidad_nueva',
                'd.total_nuevo',
                'd.diferencia'
            )
            ->get()
            ->groupBy('iddetallecotizacion');

        foreach ($detalles as $detalle) {
            $historial = $detallesAprobados->get(
                $detalle->iddetallecotizacion,
                collect()
            );

            $detalle->cantidad_original = $detalle->cantidad;
            $detalle->total_original = $detalle->total;

            // Partimos del total original del renglón.
            // Aplicamos únicamente diferencias aprobadas.
            $centavos = $this->importeACentavos($detalle->total);

            foreach ($historial as $movimiento) {
                $centavos += $this->importeACentavos(
                    $movimiento->diferencia
                );
            }

            $ultimo = $historial->last();

            $detalle->cantidad_vigente = $ultimo
                ? (int) $ultimo->cantidad_nueva
                : (int) $detalle->cantidad;

            $detalle->total_vigente =
                $this->centavosAImporte($centavos);
        }


        return response()->json([
            'cotizacion' => $cotizacion,
            'detalles' => $detalles,
            'pedidos' => $pedidos,
            'facturas' => $facturas,
            'cuenta_por_cobrar' => $cuentaPorCobrar,
            'ajustes' => $ajustes,
        ]);
    }


    private function importeACentavos($valor): int
    {
        $texto = trim((string) $valor);
        $negativo = str_starts_with($texto, '-');

        if ($negativo) {
            $texto = substr($texto, 1);
        }

        if (!preg_match('/^\d+(\.\d{1,2})?$/', $texto)) {
            throw new \UnexpectedValueException(
                'Importe monetario almacenado no válido.'
            );
        }

        [$entero, $decimales] = array_pad(
            explode('.', $texto, 2),
            2,
            '0'
        );

        $centavos = ((int) $entero * 100)
            + (int) str_pad($decimales, 2, '0');

        return $negativo ? -$centavos : $centavos;
    }

    private function centavosAImporte(int $centavos): string
    {
        $signo = $centavos < 0 ? '-' : '';
        $valor = abs($centavos);

        return $signo
            . intdiv($valor, 100)
            . '.'
            . str_pad(
                (string) ($valor % 100),
                2,
                '0',
                STR_PAD_LEFT
            );
    }


    public function store(
        Request $request,
        AjustesVentaService $service
    ) {

        // La capacidad debe estar definida en el sistema
        // de autorización antes de habilitar la ruta.
        Gate::authorize('ajustes-ventas.registrar');

        $datos = $request->validate([
            'uuid_operacion' => 'required|uuid',

            'idcotizacion' => [
                'required',
                'integer',
                'exists:adm_cotizacion,idcotizacion',
            ],

            'idpedidoproduccion' => [
                'nullable',
                'integer',
                'exists:adm_pedidos_produccion,idpedidoproduccion',
            ],

            'tipo_ajuste' => [
                'required',
                Rule::in([
                    'REDUCCION',
                    'AUMENTO',
                ]),
            ],

            'motivo' => 'required|string|max:500',
            'observaciones' => 'nullable|string',

            'detalles' => 'required|array|min:1|max:100',

            'detalles.*.iddetallecotizacion' => [
                'required',
                'integer',
                'distinct',
            ],

            'detalles.*.tipo_cambio' => [
                'required',
                Rule::in([
                    'REDUCCION',
                    'AUMENTO',
                ]),
            ],

            'detalles.*.cantidad_nueva' => [
                'required',
                'integer',
                'min:0',
                'max:4294967295',
            ],
            

            'detalles.*.precio_nuevo' =>
            'nullable|numeric|min:0|decimal:0,2',

            'detalles.*.total_nuevo' =>
            'required|numeric|min:0|decimal:0,2',

            'detalles.*.datos_nuevos' => 'nullable|array',

        ]);

        $resultado = $service->registrar(
            $datos,
            (int) auth()->id()
        );

        return response()->json(
            $resultado,
            $resultado['reutilizado'] ? 200 : 201
        );
    }


    public function aprobar(
        Request $request,
        int $id,
        AjustesVentaService $service
    ) {
        Gate::authorize('ajustes-ventas.aprobar');

        $datos = $request->validate([
            'observacion' => 'nullable|string|max:2000',
        ]);

        $resultado = $service->aprobar(
            $id,
            (int) auth()->id(),
            $datos['observacion'] ?? null
        );

        return response()->json($resultado);
    }


    public function rechazar(
        Request $request,
        int $id,
        AjustesVentaService $service
    ) {
        Gate::authorize('ajustes-ventas.aprobar');

        $datos = $request->validate([
            'motivo' => 'required|string|min:10|max:2000',
        ]);

        $resultado = $service->rechazar(
            $id,
            (int) auth()->id(),
            trim($datos['motivo'])
        );

        return response()->json($resultado);
    }


    public function permisos()
    {
        $user = auth()->user();

        abort_unless($user, 401, 'No autenticado.');

        $capacidades = [
            'consultar' => $user->can('ajustes-ventas.consultar'),
            'registrar' => $user->can('ajustes-ventas.registrar'),
            'aprobar'  => $user->can('ajustes-ventas.aprobar'),
            'reportes' => $user->can('ajustes-ventas.reportes'),
        ];

        abort_unless(
            in_array(true, $capacidades, true),
            403,
            'No tiene acceso al módulo de Ajustes de Ventas.'
        );

        return response()->json([
            'usuario_id' => $user->id,
            ...$capacidades,
        ]);
    }
}
