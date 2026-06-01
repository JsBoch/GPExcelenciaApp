<?php

namespace App\Http\Controllers;

use App\Models\AdmCotizacion;
use App\Models\AdmDetalleCotizacion;
use App\Models\AdmTipoPago;
use App\Models\AdmUnidadMedida;
use App\Models\Clientes;
use App\Models\ContactoCliente;
use App\Models\AdmMotivosRechazo;
use App\Models\Correlativo;
use App\Models\AdmHistorialEnvioCotizacion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // <-- Importar Log si quieres registrar errores detallados
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use NumberToWords\NumberToWords;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\QueryException;
use App\Models\AdmEnvioItem;
use App\Services\NotaEnvioService;

class CotizacionController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $cotizacionesTodas = $user->cotizaciones_todas;

        $query = AdmCotizacion::query()
            ->select(
                'c.idcotizacion',
                DB::raw("CONCAT('CT',CAST(c.nocotizacion AS CHAR)) as nocotizacion"),
                'c.fecha_cotizacion',
                'c.fecha_prefacturacion',
                'c.fecha_certificacion',
                't.tipo as tipo_pago',
                'c.total_general',
                'c.descuento_monto',
                'c.total',
                'c.costear',
                'cl.nombre as cliente',
                'cl.nit',
                'ct.nombre as contacto',
                'c.direccion_entrega',
                'c.observaciones_costeo',
                'c.observaciones_cliente',
                'c.costeo_observaciones',
                'c.idcotizacionoriginal',
                'c.idcliente',
                'c.idcontacto',
                'c.trabajo',
                'c.version',
                'c.idtipopago',
                'c.estado',

                DB::raw("(SELECT COUNT(*) FROM adm_comentarios_prefacturacion cp
                        WHERE cp.idcotizacion = c.idcotizacion AND cp.estado = 1) AS comentarios_count"),
                DB::raw("CAST(EXISTS(SELECT 1 FROM adm_comentarios_prefacturacion cp
                        WHERE cp.idcotizacion = c.idcotizacion AND cp.estado = 1) AS UNSIGNED) AS has_comentarios"),
                DB::raw("(SELECT MAX(cp.fecha_registro) FROM adm_comentarios_prefacturacion cp
                        WHERE cp.idcotizacion = c.idcotizacion AND cp.estado = 1) AS last_comentario_at"),
                DB::raw("(SELECT LEFT(cp.comentario, 100) FROM adm_comentarios_prefacturacion cp
                        WHERE cp.idcotizacion = c.idcotizacion AND cp.estado = 1
                        ORDER BY cp.fecha_registro DESC LIMIT 1) AS last_comentario_snippet"),

                DB::raw("CASE
                    WHEN c.estado = 1 THEN 'REGISTRO'
                    WHEN c.estado = 2 THEN 'COSTEO'
                    WHEN c.estado = 3 THEN 'COSTEADA'
                    WHEN c.estado = 4 THEN 'PRE-FACTURACION'
                    WHEN c.estado = 5 THEN 'PARA FACTURAR'
                    WHEN c.estado = 6 THEN 'FACTURADA'
                    WHEN c.estado = 7 THEN 'ANULADA'
                    WHEN c.estado = 8 THEN 'RECHAZADA'
                    ELSE 'DESCONOCIDO'
                END as estado_texto")
            )
            ->from('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->where('c.estado', '!=', 0);

        // filtros por fecha / estado / propietario (igual que ya tienes)
        if (!$request->filled('q')) { // 👈 si hay q, no limitamos por fecha
            if ($request->filled('fecha_inicio') && $request->filled('fecha_fin')) {
                $query->whereBetween(DB::raw('DATE(c.fecha_cotizacion)'), [$request->fecha_inicio, $request->fecha_fin]);
            } elseif ($request->filled('fecha_inicio')) {
                $query->whereDate('c.fecha_cotizacion', '>=', $request->fecha_inicio);
            } elseif ($request->filled('fecha_fin')) {
                $query->whereDate('c.fecha_cotizacion', '<=', $request->fecha_fin);
            }
        }
        if ($request->filled('estado') && $request->estado !== 'todos') {
            $query->where('c.estado', (int) $request->estado);
        }


        // 🔹 Prioridad: si se especifica idvendedor → ignorar cotizaciones_todas
        if ($request->filled('idvendedor')) {
            $query->where('c.idusuario', $request->idvendedor);
            //Log::info('Filtro idvendedor aplicado: ' . $request->idvendedor);
        } else {
            if ($cotizacionesTodas == 'N') {
                $query->where('c.idusuario', $user->id);
                // Log::info('Filtro cotizaciones_todas=N para usuario: ' . $user->id);
            } else {
                //Log::info('Sin filtro por usuario, mostrando todas las cotizaciones');
            }
        }

        // 🔎 BÚSQUEDA GLOBAL EN BD
        if ($request->filled('q')) {
            $q = trim($request->q);

            // extrae parte numérica si viene "CT569", "ct 000569" o solo "569"
            $num = null;
            if (preg_match('/^\s*(?:CT)?\s*0*(\d+)\s*$/i', $q, $m)) {
                $num = $m[1];
            }

            $query->where(function ($s) use ($q, $num) {
                $like = "%{$q}%";

                // CTxxxx como texto
                $s->whereRaw("CONCAT('CT', CAST(c.nocotizacion AS CHAR)) LIKE ?", [$like])
                    // campos adicionales
                    ->orWhere('cl.nombre', 'like', $like)
                    ->orWhere('cl.nit', 'like', $like)
                    ->orWhere('ct.nombre', 'like', $like)
                    ->orWhere('c.observaciones_costeo', 'like', $like)
                    ->orWhere('c.observaciones_cliente', 'like', $like)
                    ->orWhere('c.costeo_observaciones', 'like', $like)
                    ->orWhereRaw('CAST(c.total_general AS CHAR) LIKE ?', [$like]);

                // búsqueda por solo número
                if ($num !== null) {
                    $s->orWhere('c.nocotizacion', (int)$num)
                        ->orWhereRaw('CAST(c.nocotizacion AS CHAR) LIKE ?', ['%' . $num . '%']);
                }
            });
        }

        $rows = $query
            ->orderBy('c.fecha_cotizacion', 'asc')
            ->orderBy('c.nocotizacion', 'asc')
            ->get()
            ->map(function ($r) {
                $r->comentarios_count = (int)($r->comentarios_count ?? 0);
                $r->has_comentarios = (bool)$r->has_comentarios;
                return $r;
            });

        return response()->json($rows);
    }


    public function store(Request $request)
    {
        // Puedes exigirla o tratarla como opcional; aquí la tratamos como opcional.
        $idemKey = $request->header('Idempotency-Key') ?? $request->input('idempotency_key');

        // Log::info("Cotización store iniciada, idempotency_key = {$idemKey}", [
        //     'input' => $request->all(),
        //     'files' => array_keys($request->files->all()),
        // ]);

        try {
            return DB::transaction(function () use ($request, $idemKey) {

                // Si viene Idempotency-Key y ya existe, retorna la misma cotización
                if ($idemKey) {
                    $existing = AdmCotizacion::where('idempotency_key', $idemKey)->first();
                    if ($existing) {
                        return response()->json($existing, 200);
                    }
                }

                // --- Bloquea correlativos para evitar pisadas en concurrencia ---
                $rowCot = DB::table('cor_correlativo')->where('tabla', 'adm_cotizacion')->lockForUpdate()->first();
                if (!$rowCot) {
                    return response()->json(['message' => 'No se encontró el correlativo para cotizacion'], 400);
                }

                $rowNo = DB::table('cor_correlativo')->where('tabla', 'no_cotizacion')->lockForUpdate()->first();
                if (!$rowNo) {
                    return response()->json(['message' => 'No se encontró el correlativo para el no de cotizacion'], 400);
                }

                $rowDet = DB::table('cor_correlativo')->where('tabla', 'adm_detalle_cotizacion')->lockForUpdate()->first();
                if (!$rowDet) {
                    return response()->json(['message' => 'No se encontró el correlativo para el detalle de cotizacion'], 400);
                }

                // Calcula y avanza correlativos (cabecera)
                $idCotizacion = $rowCot->correlativo + $rowCot->incremento;
                DB::table('cor_correlativo')->where('tabla', 'adm_cotizacion')->update(['correlativo' => $idCotizacion]);

                $nocotizacion = $rowNo->correlativo + $rowNo->incremento;
                DB::table('cor_correlativo')->where('tabla', 'no_cotizacion')->update(['correlativo' => $nocotizacion]);

                // --- Cabecera ---
                $datosCotizacion = $request->except('detalles', 'idempotency_key');
                $datosCotizacion['tipo_facturacion'] = $request->input('tipo_facturacion', 'BIEN'); // no intentes hacer mass-assign de detalles
                $datosCotizacion['idcotizacion']     = $idCotizacion;
                $datosCotizacion['nocotizacion']     = $nocotizacion;
                $user = auth()->user();
                $datosCotizacion['usuario_registro'] = auth()->user()->name ?? 'system';
                $datosCotizacion['fecha_registro']   = now();
                $datosCotizacion['idusuario'] = $user->es_comodin
                    ? $request->input('idvendedor_asignado', $user->id)
                    : $user->id;
                if ($idemKey) {
                    $datosCotizacion['idempotency_key'] = $idemKey;
                }

                // $datosCotizacion['subtotal'] = $request->input('subtotal');
                // $datosCotizacion['descuento_porcentaje'] = $request->input('descuento_porcentaje');
                // $datosCotizacion['descuento_monto'] = $request->input('descuento_monto');
                // $datosCotizacion['impuesto_iva'] = $request->input('impuesto_iva');
                // $datosCotizacion['total'] = $request->input('total');

                // --- Detalles ---
                $detalles = $request->input('detalles', []);
                if (!is_array($detalles)) {
                    //Log::error('Los detalles no son un array: ' . print_r($detalles, true));
                    return response()->json(['message' => 'Error: Los detalles deben ser un array'], 422);
                }

                $detalles = $this->recalcularDetallesDesdeFrontend($detalles);

                $subtotal = 0;
                $iva = 0;
                $total = 0;
                $descuento = 0;

                foreach ($detalles as $d) {
                    $subtotal += $d['subtotal'];
                    $iva += $d['impuesto_iva'];
                    $total += $d['total'];
                    $descuento += $d['descuento'] ?? 0;
                }

                $datosCotizacion['subtotal'] = round($subtotal, 2);
                $datosCotizacion['impuesto_iva'] = round($iva, 2);
                $datosCotizacion['total'] = round($total, 2);
                $datosCotizacion['descuento_monto'] = round($descuento, 2);

                $datosCotizacion['total_general'] = round($total + $descuento, 2);

                $cotizacion = AdmCotizacion::create($datosCotizacion);

                // Próximo id de detalle partiendo del correlativo actual
                $nextDetalleId = $rowDet->correlativo + $rowDet->incremento;
                $incDet        = $rowDet->incremento ?: 1;
                $lastUsedDetId = null;

                //Log::info("Detalles recibidos para la cotización", ['detalles' => $detalles]);
                //$porcentajeAplicado = floatval($datosCotizacion['descuento_porcentaje'] ?? 0);
                //$detalles = $this->recalcularDetallesConAjuste($detalles, $porcentajeAplicado);


                foreach ($detalles as $index => $detalleData) {
                    //Log::debug("Detalle #{$index}", $detalleData);
                    $imagenRuta = null;
                    if ($request->hasFile("detalles.{$index}.imagen")) {
                        $img    = $request->file("detalles.{$index}.imagen");
                        $ext    = $img->getClientOriginalExtension() ?: $img->extension() ?: 'png';
                        $nombre = uniqid('detalle_') . '.' . $ext;
                        $img->move(public_path('images_cotizaciones'), $nombre);
                        $imagenRuta = $nombre;
                    }

                    //$porcentajeAplicado = floatval($datosCotizacion['descuento_porcentaje'] ?? 0);
                    //$detalleData = $this->recalcularDetalle($detalleData, $porcentajeAplicado);

                    AdmDetalleCotizacion::create([
                        'iddetallecotizacion' => $nextDetalleId,
                        'idcotizacion'        => $idCotizacion,
                        'idproducto'          => 0,
                        'producto'            => $detalleData['descripcion'] ?? '',
                        'titulo'              => '',
                        'descripcion'         => $detalleData['descripcion'] ?? '',
                        'cantidad'            => $detalleData['cantidad'] ?? 0,
                        'ancho'               => $detalleData['ancho'] ?? 0,
                        'alto'                => $detalleData['alto'] ?? 0,
                        'profundidad'         => $detalleData['profundidad'] ?? 0,
                        'fecha_registro'      => now(),
                        'usuario_registro'    => auth()->user()->name ?? 'system',
                        'costeado'            => 'N',
                        'incluye_foto'        => $imagenRuta ? 'S' : 'N',
                        'estado'              => 1,
                        'unidad_medida'       => $detalleData['unidad_medida'] ?? null,
                        'm2'                  => $detalleData['m2'] ?? 0,
                        'imagen'              => $imagenRuta,
                        'precio_unitario'     => $detalleData['precio_unitario'] ?? 0, //ok
                        'precio'              => $detalleData['precio'] ?? 0, //no
                        'descuento'           => $detalleData['descuento'] ?? 0, //no
                        'impuesto_iva'        => $detalleData['impuesto_iva'] ?? 0, //ok pero mal calculado                        
                        'subtotal'            => $detalleData['subtotal'] ?? 0, //no
                        'total'               => $detalleData['total'] ?? 0, //si pero esto debería ser precio
                        'porcentaje_aplicado' => $detalleData['porcentaje_aplicado'] ?? 0,
                    ]);

                    $lastUsedDetId = $nextDetalleId;
                    $nextDetalleId += $incDet;
                }

                // Actualiza el correlativo de detalle al ÚLTIMO ID USADO
                if ($lastUsedDetId !== null) {
                    DB::table('cor_correlativo')->where('tabla', 'adm_detalle_cotizacion')
                        ->update(['correlativo' => $lastUsedDetId]);
                }

                // listo
                return response()->json($cotizacion, 201);
            });
        } catch (QueryException $e) {
            Log::error("Error QueryException en CotizacionController@store: " . $e->getMessage(), [
                'errorInfo' => $e->errorInfo,
                'idemKey' => $idemKey,
            ]);
            // Si el índice único de idempotency_key se dispara (1062), regresa la existente
            if (($e->errorInfo[1] ?? null) === 1062 && $idemKey) {
                if ($existing = AdmCotizacion::where('idempotency_key', $idemKey)->first()) {
                    return response()->json($existing, 200);
                }
            }
            DB::rollBack();
            return response()->json(['message' => 'Error al crear la cotización: ' . $e->getMessage()], 500);
        } catch (\Throwable $e) {
            Log::error("Error Throwable en CotizacionController@store: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'input' => $request->all()
            ]);
            DB::rollBack();
            return response()->json(['message' => 'Error al crear la cotización: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $cot = AdmCotizacion::from('adm_cotizacion as c')
            ->where('c.idcotizacion', $id)
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->leftJoin('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->join('users as u', 'u.id', '=', 'c.idusuario')
            ->leftJoin('adm_empleados as e', 'e.iduser', '=', 'u.id')
            ->select(
                'c.idcotizacionoriginal',
                'c.idcotizacion',
                'c.idcliente',
                'cl.nombre as cliente',
                'c.idcontacto',
                'ct.nombre as contacto',
                'c.fecha_cotizacion',
                'c.trabajo',
                'c.observaciones_costeo',
                'c.observaciones_cliente',
                'c.costeo_observaciones',
                DB::raw("CONCAT('CT',CAST(c.nocotizacion AS CHAR)) as nocotizacion"),
                'c.version',
                'c.idtipopago',
                't.tipo as tipo_pago',
                'c.direccion_entrega',
                'c.costear',
                'c.total_general',
                'cl.nit',
                'c.tipo_facturacion',
                'c.idusuario',
                'u.name as usuario',
                'e.iduser as idvendedor',
                'e.nombre as vendedor',
                'c.subtotal',
                'c.descuento_porcentaje',
                'c.descuento_monto',
                'c.impuesto_iva',
                'c.total',
                'modo_descuento',
            )
            ->first();

        if (!$cot) {
            return response()->json(['message' => 'No se encontró el registro de la cotización'], 404);
        }

        $detalles = AdmDetalleCotizacion::from('adm_detalle_cotizacion as d')
            ->where('d.idcotizacion', $id)
            ->orderBy('d.iddetallecotizacion')
            ->get([
                'd.iddetallecotizacion',
                'd.idcotizacion',
                'd.idproducto',
                'd.producto',
                'd.titulo',
                'd.descripcion',
                'd.cantidad',
                'd.ancho',
                'd.alto',
                'd.profundidad',
                'd.precio',
                'd.total',
                'd.fecha_registro',
                'd.usuario_registro',
                'd.costeado',
                'd.fecha_costeo',
                'd.usuario_costeo',
                'd.estado',
                'd.incluye_foto',
                'd.unidad_medida',
                'd.m2',
                'd.precio_unitario',
                'd.descuento',
                'd.impuesto_iva',
                'd.subtotal',
                'd.porcentaje_aplicado',

                DB::raw('d.imagen as imagen_ruta'),
            ]);

        $cot->detalles = $detalles;

        return response()->json($cot);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'subtotal' => 'nullable|numeric',
            'impuesto_iva' => 'nullable|numeric',
            'total' => 'nullable|numeric',
        ]);

        return DB::transaction(function () use ($request, $id) {

            $cotizacion = AdmCotizacion::lockForUpdate()->find($id);
            if (!$cotizacion) {
                return response()->json(['message' => 'Cotización no encontrada'], 404);
            }

            $user = auth()->user();

            // -------------------------------
            // 🔹 DETALLES (PRIMERO)
            // -------------------------------
            $detalles = array_values($request->input('detalles', []));
            if (!is_array($detalles)) {
                return response()->json(['message' => 'Error: Los detalles deben ser un array'], 422);
            }

            // 🔥 REGLA CLAVE: primero recalcular
            $detalles = $this->recalcularDetallesDesdeFrontend($detalles);

            // 🔥 luego sumar cabecera
            $subtotal = 0;
            $iva = 0;
            $total = 0;
            $descuento = 0;

            foreach ($detalles as $d) {
                $subtotal += $d['subtotal'];
                $iva += $d['impuesto_iva'];
                $total += $d['total'];
                $descuento += $d['descuento'] ?? 0;
            }

            // -------------------------------
            // 🔹 CABECERA
            // -------------------------------
            $datosCabecera = $request->except([
                'detalles',
                'id',
                'idcotizacion',
                'nocotizacion',
                'idusuario',
                'usuario_registro',
                'fecha_registro',
                'idempotency_key',
            ]);

            $datosCabecera['tipo_facturacion'] = $request->input('tipo_facturacion', 'BIEN');
            $datosCabecera['usuario_modificacion'] = $user->name ?? 'system';
            $datosCabecera['fecha_modificacion'] = now();

            if ($user->es_comodin) {
                $datosCabecera['idusuario'] = $request->input('idvendedor_asignado', $user->id);
            }

            // 🔥 VALORES REALES (NO frontend)
            $datosCabecera['subtotal'] = round($subtotal, 2);
            $datosCabecera['impuesto_iva'] = round($iva, 2);
            $datosCabecera['total'] = round($total, 2);
            $datosCabecera['descuento_monto'] = round($descuento, 2);
            $datosCabecera['total_general'] = round($total + $descuento, 2);

            $cotizacion->update($datosCabecera);

            // -------------------------------
            // 🔹 RECREAR DETALLES
            // -------------------------------
            AdmDetalleCotizacion::where('idcotizacion', $id)->delete();

            if (count($detalles) === 0) {
                $cotizacion->load('detalles');
                return response()->json($cotizacion);
            }

            $rowDet = DB::table('cor_correlativo')
                ->where('tabla', 'adm_detalle_cotizacion')
                ->lockForUpdate()
                ->first();

            if (!$rowDet) {
                return response()->json(['message' => 'No se encontró el correlativo para el detalle de cotización'], 500);
            }

            $incDet        = $rowDet->incremento ?: 1;
            $nextDetalleId = $rowDet->correlativo + $incDet;
            $lastUsedDetId = null;

            foreach ($detalles as $i => $detalleData) {

                $imagenRuta = null;

                if ($request->hasFile("detalles.{$i}.imagen")) {
                    $img    = $request->file("detalles.{$i}.imagen");
                    $ext    = $img->getClientOriginalExtension() ?: $img->extension() ?: 'png';
                    $nombre = uniqid('detalle_') . '.' . $ext;
                    $img->move(public_path('images_cotizaciones'), $nombre);
                    $imagenRuta = $nombre;
                } elseif (!empty($detalleData['imagen_ruta'])) {
                    $imagenRuta = $detalleData['imagen_ruta'];
                }

                AdmDetalleCotizacion::create([
                    'iddetallecotizacion' => $nextDetalleId,
                    'idcotizacion'        => $id,
                    'idproducto'          => $detalleData['idproducto'] ?? 0,
                    'producto'            => $detalleData['producto'] ?? ($detalleData['descripcion'] ?? 'N/A'),
                    'titulo'              => $detalleData['titulo'] ?? '',
                    'descripcion'         => $detalleData['descripcion'] ?? '',
                    'cantidad'            => $detalleData['cantidad'] ?? 0,
                    'ancho'               => $detalleData['ancho'] ?? 0,
                    'alto'                => $detalleData['alto'] ?? 0,
                    'profundidad'         => $detalleData['profundidad'] ?? 0,
                    'total'               => $detalleData['total'] ?? 0,
                    'fecha_registro'      => now(),
                    'usuario_registro'    => $user->name ?? 'system',
                    'costeado'            => $detalleData['costeado'] ?? 'N',
                    'incluye_foto'        => $imagenRuta ? 'S' : 'N',
                    'estado'              => $detalleData['estado'] ?? 1,
                    'unidad_medida'       => $detalleData['unidad_medida'] ?? null,
                    'm2'                  => $detalleData['m2'] ?? 0,
                    'imagen'              => $imagenRuta,
                    'precio_unitario'     => $detalleData['precio_unitario'] ?? 0,
                    'descuento'           => $detalleData['descuento'] ?? 0,
                    'impuesto_iva'        => $detalleData['impuesto_iva'] ?? 0,
                    'precio'              => $detalleData['precio'] ?? 0,
                    'subtotal'            => $detalleData['subtotal'] ?? 0,
                    'porcentaje_aplicado' => $detalleData['porcentaje_aplicado'] ?? 0,
                ]);

                $lastUsedDetId = $nextDetalleId;
                $nextDetalleId += $incDet;
            }

            if ($lastUsedDetId !== null) {
                DB::table('cor_correlativo')
                    ->where('tabla', 'adm_detalle_cotizacion')
                    ->update(['correlativo' => $lastUsedDetId]);
            }

            $cotizacion->load('detalles');

            return response()->json($cotizacion);
        });
    }

    public function actualizarFechaPrefacturacion(Request $request, $id)
    {
        $request->validate([
            'fecha_prefacturacion' => ['required', 'date', 'date_format:Y-m-d'],
        ]);

        /** @var AdmCotizacion $cot */
        $cot = AdmCotizacion::findOrFail($id);

        // Solo permitir cuando está en PRE-FACTURACIÓN (estado = 4)
        if ((int)$cot->estado !== 4) {
            return response()->json([
                'message' => 'Solo se puede modificar la fecha en PRE-FACTURACIÓN.'
            ], 422);
        }

        $cot->fecha_prefacturacion   = $request->fecha_prefacturacion;
        $cot->usuario_modificacion   = auth()->user()->name ?? 'system';
        $cot->fecha_modificacion     = now();

        $cot->save();

        return response()->json([
            'ok' => true,
            'idcotizacion' => $cot->idcotizacion,
            'fecha_prefacturacion' => $cot->fecha_prefacturacion,
        ]);
    }

    public function destroy($id)
    {
        $cotizacion = AdmCotizacion::find($id);
        if (!$cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $cotizacion->delete();
        AdmDetalleCotizacion::where('idcotizacion', $id)->delete();

        return response()->json(['message' => 'Cotización eliminada']);
    }

    /**
     * Obtiene los detalles de una cotización específica. para utilizarlos en el
     * modal que se utilizará para cambiar los precios ya sea del total de la coización
     * o de los detalles de la cotización. En la consulta de cotizaciones como en el
     * módulo de costeo.
     */
    public function detalle($id)
    {
        // Obtener los detalles de la cotización
        $detalles = AdmDetalleCotizacion::where('d.idcotizacion', $id)
            ->select(
                'd.iddetallecotizacion',
                'idcotizacion',
                'idproducto',
                'producto',
                'titulo',
                'descripcion',
                'cantidad',
                'ancho',
                'alto',
                'profundidad',
                'precio',
                'total',
                'fecha_registro',
                'usuario_registro',
                'costeado',
                'fecha_costeo',
                'usuario_costeo',
                'estado',
                'incluye_foto',
                'unidad_medida',
                'm2',
                //'imagen',
                'imagen as imagen_ruta',
                'porcentaje_aplicado',
            )
            ->from('adm_detalle_cotizacion as d')
            ->get();

        log::debug("Detalles obtenidos para la cotización {$id}", ['detalles' => $detalles]);
        return response()->json($detalles);
    }

    public function desactivar($id)
    {
        $cotizacion = AdmCotizacion::find($id);
        if (!$cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $cotizacion->estado = 0;
        $cotizacion->save();

        return response()->json(['message' => 'Cotización desactivada']);
    }

    public function activarFacturacion(Request $request, $id)
    {
        $estado = $request->input("estado");

        if (!is_numeric($estado)) {
            return response()->json(['error' => 'Estado inválido'], 422);
        }

        $cotizacion = AdmCotizacion::find($id);
        if (!$cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        $estado = (int)$estado;
        $ahora = now();

        $cotizacion->estado = $estado;

        //validación para que no deje pasar el estado cero.
        if ($estado === 4) {

            $tieneItemsEnCero = DB::table('adm_detalle_cotizacion')
                ->where('idcotizacion', $id)
                ->where('estado', 1)
                ->where(function ($q) {
                    $q->where('total', 0)
                        ->orWhereNull('total');
                })
                ->exists();

            if ($tieneItemsEnCero) {
                return response()->json([
                    'message' => 'No se puede enviar a pre-facturación porque existen ítems con total en 0.'
                ], 422);
            }
        }

        // Si es pre-facturación (4), y aún no tiene fecha, setear fecha_prefacturacion
        //if ($estado === 4 && is_null($cotizacion->fecha_prefacturacion)) {
        if ($estado === 4 && empty($cotizacion->fecha_prefacturacion)) {
            $cotizacion->fecha_prefacturacion = $ahora;
        }

        // Si es facturación (5), setear fecha_facturacion
        if ($estado === 5) {
            $cotizacion->fecha_facturacion = $ahora;
        }


        $cotizacion->save();
        $mensajes = [
            4 => "Cotización enviada a pre-facturación",
            5 => "Cotización enviada para facturar",
            2 => "Cotización enviada a costeo",
        ];

        $mensaje = $mensajes[$estado] ?? "Estado actualizado correctamente";

        return response()->json(['message' => $mensaje]);
    }

    public function activarFacturacionMasivo(Request $request)
    {
        $request->validate([
            'ids'    => ['required', 'array', 'min:1'],
            'ids.*'  => ['integer'],
            'estado' => ['required', 'integer', 'in:5'],
        ]);

        $ids = array_values(array_unique(array_map('intval', $request->input('ids'))));
        $estadoDestino = (int) $request->input('estado');

        return DB::transaction(function () use ($ids, $estadoDestino) {
            $existentes = AdmCotizacion::whereIn('idcotizacion', $ids)
                ->lockForUpdate()
                ->get(['idcotizacion', 'estado']);

            $idsExistentes = $existentes->pluck('idcotizacion')->all();
            $noEncontradas = array_values(array_diff($ids, $idsExistentes));

            // Solo mover 4 -> 5
            $candidatas = $existentes->where('estado', 4)->pluck('idcotizacion')->all();

            $actualizadas = 0;
            if ($candidatas) {
                $actualizadas = AdmCotizacion::whereIn('idcotizacion', $candidatas)->update([
                    'estado'                => $estadoDestino,
                    'fecha_facturacion'     => now(),
                    'usuario_modificacion'  => auth()->user()->name ?? 'system',
                    'fecha_modificacion'    => now(),
                ]);
            }

            return response()->json([
                'message'       => 'Proceso masivo completado.',
                'total'         => count($ids),
                'actualizadas'  => $actualizadas,
                'ignoradas'     => count($idsExistentes) - count($candidatas),
                'no_encontradas' => $noEncontradas, // <- aquí las que causaban 404
            ]);
        });
    }



    public function listarClientes()
    {
        $clientes = Clientes::where('estado', 1)->get(['idcliente', 'nombre', 'nit']);
        return response()->json($clientes);
    }

    public function listarContactos(Request $request)
    {
        $idcliente = $request->input('idcliente');
        $contactos = ContactoCliente::where('idcliente', $idcliente)->get(['id_contactocliente', 'nombre', 'telefono', 'correo']);
        return response()->json($contactos);
    }

    public function listarTiposPago()
    {
        $tiposPago = AdmTipoPago::where('estado', 1)->get(['idtipopago', 'tipo']);
        return response()->json($tiposPago);
    }

    public function listarUnidadesMedida()
    {
        $unidadesMedida = AdmUnidadMedida::where('estado', 1)->get(['idunidadmedida', 'unidad']);
        return response()->json($unidadesMedida);
    }

    public function generarPdf(Request $request, $id)
    {
        try {
            $fecha_cot = $request->input('fecha_cotizacion');
            if (!$fecha_cot || !preg_match('/\d{4}-\d{2}-\d{2}/', $fecha_cot)) {
                $fecha_cot = AdmCotizacion::findOrFail($id)->fecha_cotizacion;
            }
            $fechaInput = $request->input('fecha_cotizacion');

            // Obtiene la fecha original del registro en BD (aunque el usuario cambie el input)
            $cotizacionOriginal = AdmCotizacion::findOrFail($id);
            $fechaOriginal = $cotizacionOriginal->fecha_cotizacion;

            $cotizacion = AdmCotizacion::where('c.idcotizacion', $id)
                ->select(
                    'c.idcotizacion',
                    'c.nocotizacion',
                    'c.fecha_cotizacion',
                    't.tipo as tipo_pago',
                    'c.total_general',
                    'c.costear',
                    'cl.nombre as cliente',
                    'cl.nit as nit',
                    'ct.nombre as contacto',
                    'e.nombre as vendedor',
                    'e.movil as telefono_vendedor',
                    'e.correo_personal as correo_vendedor',
                    'c.direccion_entrega',
                    'c.observaciones_costeo',
                    'c.observaciones_cliente',
                    'c.costeo_observaciones',
                    'c.trabajo',
                    'c.version',
                    'c.tipo_facturacion',
                    'c.descuento_monto',
                    'c.subtotal',
                    'c.impuesto_iva',
                    'c.total'
                )
                ->from('adm_cotizacion as c')
                ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
                ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
                ->join('adm_empleados as e', 'c.idusuario', '=', 'e.iduser')
                ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
                ->first();

            if (!$cotizacion) {
                return response()->json(['message' => 'Cotización no encontrada'], 404);
            }

            $detalles = AdmDetalleCotizacion::where('idcotizacion', $id)->get();
            $cotizacion->detalles = $detalles;
            $cotizacion->fecha_cotizacion = $fecha_cot;

            $totalEnLetras = $this->convertirNumeroALetrasConCentavos($cotizacion->total);

            return response()->json([
                'cotizacion' => $cotizacion,
                'totalEnLetras' => $totalEnLetras
            ]);
        } catch (\Throwable $e) {
            Log::error('Error generando PDF cotización: ' . $e->getMessage());
            return response()->json(['message' => 'Error generando el PDF.'], 500);
        }
    }

    public function guardarDetalle(Request $request, $cotizacion)
    {
        $cotizacion = AdmCotizacion::findOrFail($cotizacion);
        $request->validate([
            'detalle' => 'required|array',
            'detalle.*.iddetallecotizacion' => 'nullable|exists:adm_detalle_cotizacion,iddetallecotizacion',
            'detalle.*.porcentaje_aplicado' => 'nullable|numeric|min:0|max:10',
            'detalle.*.precio' => 'required|numeric|min:0',
            'detalle.*.total' => 'required|numeric|min:0',
            // Puedes agregar más reglas de validación según tus necesidades
        ]);

        try {
            DB::beginTransaction();

            foreach ($request->input('detalle') as $item) {
                $detalle = AdmDetalleCotizacion::find($item['iddetallecotizacion']);
                if ($detalle && $detalle->idcotizacion === $cotizacion->idcotizacion) {
                    $detalle->porcentaje_aplicado = $item['porcentaje_aplicado'];
                    $detalle->precio = $item['precio'];
                    $detalle->total = $item['total'];
                    $detalle->save();
                }
            }

            // Recalcular el total general de la cotización
            $totalGeneral = $cotizacion->detalles()->sum('total');
            $cotizacion->total_general = $totalGeneral;
            $cotizacion->save();

            DB::commit();

            return response()->json(['message' => 'Detalle de cotización actualizado correctamente']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al guardar el detalle de la cotización', 'error' => $e->getMessage()], 500);
        }
    }

    private function convertirNumeroALetrasConCentavos($numero)
    {
        $numberToWords = new NumberToWords();
        $numberTransformer = $numberToWords->getNumberTransformer('es');

        $entero = floor($numero);
        $decimal = round(($numero - $entero) * 100);

        $letrasEntero = $numberTransformer->toWords($entero);
        $letrasCentavos = $decimal > 0 ? "CON {$decimal}/100" : "CON 00/100";

        //return ucfirst($letrasEntero) . ' ' . $letrasCentavos;
        return strtoupper($letrasEntero . ' ' . $letrasCentavos);
    }

    public function motivosRechazo()
    {
        return AdmMotivosRechazo::where('estado', 1)->get(['idmotivorechazo', 'motivo']);
    }

    public function rechazar(Request $request, $id)
    {
        $request->validate([
            'idmotivorechazo' => 'required|exists:adm_motivos_rechazo,idmotivorechazo',
        ]);

        $cotizacion = AdmCotizacion::find($id);

        if (!$cotizacion) {
            return response()->json(['message' => 'Cotización no encontrada'], 404);
        }

        if (!in_array($cotizacion->estado, [1, 3])) {
            return response()->json(['message' => 'Solo se pueden rechazar cotizaciones en estado 1 o 3'], 422);
        }

        $cotizacion->estado = 8; // Estado rechazado
        $cotizacion->idmotivorechazo = $request->idmotivorechazo;
        $cotizacion->fecha_rechazo = now();
        $cotizacion->usuario_rechazo = auth()->user()->name;
        $cotizacion->save();

        return response()->json(['message' => 'Cotización rechazada correctamente.']);
    }

    public function historialEnvios($id)
    {
        $historial = AdmHistorialEnvioCotizacion::where('idcotizacion', $id)
            ->whereNotNull('no_envio')
            ->where('no_envio', '>', 0)
            ->orderByDesc('fecha_envio')
            ->get(['no_envio', 'direccion_envio', 'fecha_envio']);

        return response()->json($historial);
    }

    public function notaEnvioConfig(int $idCotizacion, NotaEnvioService $service)
    {
        return response()->json(
            $service->obtenerConfigNotaEnvio($idCotizacion)
        );
    }

    // 2.2.2. Generar (primer) PDF para un conjunto de ítems SIN envio, asignando nuevo número
    public function notaEnvioGenerar(Request $request, $id)
    {
        $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.iddetallecotizacion' => [
                'required',
                'integer',
                Rule::exists('adm_detalle_cotizacion', 'iddetallecotizacion')->where('idcotizacion', $id)
            ],
            'items.*.cantidad' => ['required', 'numeric', 'min:0'],
            'direccion_envio' => ['required', 'string', 'max:500'],
            'id_contacto' => [
                'nullable',
                'integer',
                Rule::exists('contacto_cliente', 'id_contactocliente')
                    ->where(function ($q) use ($id) {
                        $q->where('idcliente', AdmCotizacion::find($id)->idcliente);
                    }),
            ],
        ]);

        return DB::transaction(function () use ($request, $id) {
            $items     = collect($request->input('items'));
            $direccion = $request->input('direccion_envio');

            // Validar contra pendiente
            $pendientePorDet = AdmDetalleCotizacion::from('adm_detalle_cotizacion as d')
                ->where('d.idcotizacion', $id)
                ->leftJoin('adm_envio_item as ei', 'ei.iddetallecotizacion', '=', 'd.iddetallecotizacion')
                ->groupBy('d.iddetallecotizacion', 'd.cantidad')
                ->get([
                    'd.iddetallecotizacion',
                    DB::raw('(d.cantidad - COALESCE(SUM(ei.cantidad),0)) as pendiente')
                ])->keyBy('iddetallecotizacion');

            foreach ($items as $it) {
                $pend = (float) ($pendientePorDet[$it['iddetallecotizacion']]->pendiente ?? 0);
                if ($pend <= 0 || (float)$it['cantidad'] > $pend) {
                    return response()->json([
                        'message' => 'Cantidad a enviar supera lo pendiente para el ítem ' . $it['iddetallecotizacion']
                    ], 422);
                }
            }

            // Siguiente número de envío
            $noEnvio = ((int) (AdmEnvioItem::where('idcotizacion', $id)->max('no_envio') ?? 0)) + 1;

            // Insertar líneas del envío
            foreach ($items as $it) {
                AdmEnvioItem::create([
                    'idcotizacion'        => $id,
                    'iddetallecotizacion' => (int)$it['iddetallecotizacion'],
                    'no_envio'            => $noEnvio,
                    'cantidad'            => (float)$it['cantidad'],
                ]);
            }

            // Cabecera historial
            $cabecera = AdmCotizacion::findOrFail($id);
            $idContacto = $request->input('id_contacto');

            AdmHistorialEnvioCotizacion::create([
                'idcotizacion'     => $id,
                'no_envio'         => $noEnvio,
                'direccion_envio'  => $direccion,
                'id_contactocliente' => $idContacto,
                'fecha_cotizacion' => $cabecera->fecha_cotizacion,
                'fecha_envio'      => now(),
            ]);

            // Items del envío recien creado (para PDF)
            $itemsPdf = AdmEnvioItem::from('adm_envio_item as ei')
                ->join('adm_detalle_cotizacion as d', 'd.iddetallecotizacion', '=', 'ei.iddetallecotizacion')
                ->where('ei.idcotizacion', $id)
                ->where('ei.no_envio', $noEnvio)
                ->get(['ei.cantidad', 'd.descripcion']);



            return response()->json([
                'no_envio'  => $noEnvio,
                'direccion' => $direccion,
                'cabecera'  => [
                    'cliente'      => optional(Clientes::find($cabecera->idcliente))->nombre ?? '',
                    'contacto' => optional(ContactoCliente::find($idContacto))->nombre ?? '',
                    'telefono' => optional(ContactoCliente::find($idContacto))->telefono ?? '',
                    'nocotizacion' => 'CT' . $cabecera->nocotizacion,
                    'fecha'        => $cabecera->fecha_cotizacion,
                ],
                'items' => $itemsPdf,
            ]);
        });
    }

    // 2.2.3. Reimprimir un envío ya existente (no modifica BD)
    public function notaEnvioReimprimir(Request $request, $id)
    {
        $request->validate(['no_envio' => ['required', 'integer', 'min:1']]);
        $noEnvio = (int)$request->input('no_envio');

        $hist = AdmHistorialEnvioCotizacion::where('idcotizacion', $id)
            ->where('no_envio', $noEnvio)->orderByDesc('fecha_envio')->first();

        if (!$hist) return response()->json(['message' => 'No existe historial para el envío solicitado.'], 404);

        $cab = AdmCotizacion::findOrFail($id);

        $items = AdmEnvioItem::from('adm_envio_item as ei')
            ->join('adm_detalle_cotizacion as d', 'd.iddetallecotizacion', '=', 'ei.iddetallecotizacion')
            ->where('ei.idcotizacion', $id)
            ->where('ei.no_envio', $noEnvio)
            ->get(['ei.iddetallecotizacion', 'ei.cantidad', 'd.descripcion']);


        // Fallback legacy (si tuvieras envíos viejos sin pivote)
        if ($items->isEmpty()) {
            $items = AdmDetalleCotizacion::where('idcotizacion', $id)
                ->where('numero_envio', $noEnvio)
                ->get(['cantidad', 'descripcion']);
        }

        return response()->json([
            'no_envio'  => $noEnvio,
            'direccion' => $hist->direccion_envio,
            'cabecera'  => [
                'cliente'   => Clientes::find($cab->idcliente)->nombre ?? '',
                'contacto'  => ContactoCliente::find($cab->idcontacto)->nombre ?? '',
                'telefono'  => ContactoCliente::find($cab->idcontacto)->telefono ?? '',
                'nocotizacion' => 'CT' . $cab->nocotizacion,
                'fecha'     => $cab->fecha_cotizacion,
            ],
            'items' => $items,
        ]);
    }

    public function notaEnvioEliminar(Request $request, $id)
    {
        $request->validate(['no_envio' => ['required', 'integer', 'min:1']]);
        $noEnvio = (int)$request->input('no_envio');

        return DB::transaction(function () use ($id, $noEnvio) {
            AdmEnvioItem::where('idcotizacion', $id)->where('no_envio', $noEnvio)->delete();
            AdmHistorialEnvioCotizacion::where('idcotizacion', $id)->where('no_envio', $noEnvio)->delete();
            return response()->json(['ok' => true, 'message' => 'Envío eliminado y ítems liberados.']);
        });
    }

    public function notaEnvioActualizar(Request $request, $id)
    {
        //Log::info("ACTUALIZAR ENVIO REQUEST", request()->all());

        $request->validate([
            'no_envio' => ['required', 'integer', 'min:1'],
            'direccion_envio' => ['required', 'string', 'max:500'],
            'id_contacto' => [
                'nullable',
                'integer',
                Rule::exists('contacto_cliente', 'id_contactocliente')->where(
                    function ($q) use ($id) {
                        $idCliente = AdmCotizacion::find($id)->idcliente;
                        $q->where('idcliente', $idCliente);
                    }
                ),
            ],
            'items' => ['required', 'array'],
            'items.*.iddetallecotizacion' => [
                'required',
                'integer',
                Rule::exists('adm_detalle_cotizacion', 'iddetallecotizacion')->where('idcotizacion', $id)
            ],
            'items.*.cantidad' => ['required', 'numeric', 'min:0'],
        ]);
        $noEnvio = (int)$request->no_envio;

        return DB::transaction(function () use ($request, $id, $noEnvio) {
            // Validar contra pendiente + lo ya asignado en este envio
            $items = collect($request->items)->keyBy('iddetallecotizacion');

            // pendiente = total - (enviada en otros envíos) - (lo que ya tenía este envío, que será reemplazado)
            $enOtras = AdmEnvioItem::where('idcotizacion', $id)
                ->where('no_envio', '<>', $noEnvio)
                ->select('iddetallecotizacion', DB::raw('SUM(cantidad) as suma'))
                ->groupBy('iddetallecotizacion')->get()->keyBy('iddetallecotizacion');

            $totales = AdmDetalleCotizacion::where('idcotizacion', $id)
                ->get(['iddetallecotizacion', 'cantidad'])->keyBy('iddetallecotizacion');

            foreach ($items as $iddet => $it) {
                $total = (float)($totales[$iddet]->cantidad ?? 0);
                $yaOtras = (float)($enOtras[$iddet]->suma ?? 0);
                if ((float)$it['cantidad'] > max(0, $total - $yaOtras)) {
                    return response()->json(['message' => "Cantidad supera lo disponible para el detalle $iddet"], 422);
                }
            }

            // Reemplazar líneas del envío
            AdmEnvioItem::where('idcotizacion', $id)->where('no_envio', $noEnvio)->delete();
            foreach ($items as $iddet => $it) {
                // ⛔ saltar items en cero (equivale a quitar de envío)
                if ((float)$it['cantidad'] == 0) continue;
                AdmEnvioItem::create([
                    'idcotizacion' => $id,
                    'iddetallecotizacion' => $iddet,
                    'no_envio' => $noEnvio,
                    'cantidad' => (float)$it['cantidad'],
                ]);
            }

            // Actualizar dirección
            // AdmHistorialEnvioCotizacion::where('idcotizacion', $id)->where('no_envio', $noEnvio)
            //     ->update(['direccion_envio' => $request->direccion_envio]);
            // Actualizar dirección y contacto
            $hist = AdmHistorialEnvioCotizacion::where('idcotizacion', $id)
                ->where('no_envio', $noEnvio)
                ->firstOrFail();

            // Dirección
            $hist->direccion_envio = $request->direccion_envio;

            // Contacto (solo si lo mandan, si no, dejar el mismo)
            if ($request->filled('id_contacto')) {
                $hist->id_contactocliente = $request->id_contacto;
            }

            $hist->save();


            return response()->json(['ok' => true, 'message' => 'Envío actualizado.']);
        });
    }

    private function recalcularDetalle(array $detalle, float $porcentajeDescuento): array
    {
        $IVA_FACTOR = 1.12;

        $cantidad = floatval($detalle['cantidad'] ?? 0);
        $precioUnitario = floatval($detalle['precio_unitario'] ?? 0);
        $precio = $cantidad * $precioUnitario;

        $descuento = round($precio * ($porcentajeDescuento / 100));
        $totalConDescuento = $precio - $descuento;

        $subtotal = round($totalConDescuento / $IVA_FACTOR);
        $impuestoIva = $totalConDescuento - $subtotal;

        return array_merge($detalle, [
            'precio' => $precio,
            'descuento' => $descuento,
            'subtotal' => $subtotal,
            'impuesto_iva' => $impuestoIva,
            'total' => $precio,
            'porcentaje_aplicado' => $porcentajeDescuento,
        ]);
    }


    private function recalcularDetallesDesdeFrontend(array $detalles): array
    {
        $IVA_FACTOR = 1.12;

        foreach ($detalles as &$detalle) {

            $cantidad = floatval($detalle['cantidad'] ?? 0);
            $precio_unitario = floatval($detalle['precio_unitario'] ?? 0);
            $descuento = floatval($detalle['descuento'] ?? 0);

            // PRECIO BASE
            $precio = $cantidad * $precio_unitario;

            // BASE IMPONIBLE (AQUÍ ESTÁ LA CLAVE)
            $base = $precio - $descuento;

            // IVA DESPUÉS DEL DESCUENTO
            $subtotal = $base / $IVA_FACTOR;
            $iva = $base - $subtotal;

            $detalle['precio'] = round($precio, 2);
            $detalle['subtotal'] = round($subtotal, 2);
            $detalle['impuesto_iva'] = round($iva, 2);
            $detalle['total'] = round($base, 2); //ESTE ES EL TOTAL REAL

        }

        return $detalles;
    }

    public function notaEnvioResumen($id)
    {
        $envios = AdmHistorialEnvioCotizacion::where('idcotizacion', $id)
            ->orderBy('no_envio')
            ->get([
                'idcotizacion',
                'no_envio',
                'direccion_envio',
                'id_contactocliente',
                'fecha_envio',
            ]);

        return response()->json([
            'tiene_envios' => $envios->count() > 0,
            'cantidad_envios' => $envios->count(),
            'envios' => $envios,
        ]);
    }
}
