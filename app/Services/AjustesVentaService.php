<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Fase 2: solicitud y autorización comercial.
 * No escribe en cotizaciones, producción, FEL ni CxC.
 */
class AjustesVentaService
{
    private function dineroACentavos($valor, bool $permitirNegativo = false): int
    {
        $texto = trim((string) $valor);
        $patron = $permitirNegativo
            ? '/^-?\d{1,14}(?:\.\d{1,2})?$/'
            : '/^\d{1,14}(?:\.\d{1,2})?$/';

        if (!preg_match($patron, $texto)) {
            throw ValidationException::withMessages([
                'monto' => 'Importe inválido: máximo 14 enteros y 2 decimales.',
            ]);
        }

        $negativo = str_starts_with($texto, '-');
        $texto = ltrim($texto, '-');
        [$entero, $decimal] = array_pad(explode('.', $texto, 2), 2, '');
        $centavos = ((int) $entero * 100)
            + (int) str_pad($decimal, 2, '0', STR_PAD_RIGHT);

        return $negativo ? -$centavos : $centavos;
    }

    private function centavosADinero(int $centavos): string
    {
        $signo = $centavos < 0 ? '-' : '';
        $absoluto = abs($centavos);

        return $signo . intdiv($absoluto, 100) . '.'
            . str_pad((string) ($absoluto % 100), 2, '0', STR_PAD_LEFT);
    }


    /**
     * Calcula el importe proporcional de una cantidad
     * sin utilizar números de punto flotante.
     *
     * Se basa en el importe y cantidad originales
     * del renglón de la cotización.
     */
    private function importeProporcional(
        int $totalOriginalCentavos,
        int $cantidadOriginal,
        int $cantidadNueva
    ): int {
        if ($cantidadOriginal <= 0 || $cantidadNueva < 0) {
            $this->error(
                'cantidad_nueva',
                'La cantidad original debe ser mayor que cero.'
            );
        }

        if ($cantidadNueva === 0) {
            return 0;
        }

        // Evitar desbordamientos de enteros de PHP.
        $mitad = intdiv($cantidadOriginal, 2);

        if (
            $totalOriginalCentavos >
            intdiv(PHP_INT_MAX - $mitad, $cantidadNueva)
        ) {
            $this->error(
                'cantidad_nueva',
                'El importe excede el límite permitido.'
            );
        }

        $producto = $totalOriginalCentavos * $cantidadNueva;

        // Redondeo al centavo, mitad hacia arriba.
        return intdiv($producto + $mitad, $cantidadOriginal);
    }


    private function error(string $campo, string $mensaje): never
    {
        throw ValidationException::withMessages([$campo => $mensaje]);
    }

    /** Última situación comercial aprobada de un renglón. */
    private function vigenteDetalle(object $detalle): array
    {
        $ultimo = DB::table('adm_ajustes_venta_detalle as d')
            ->join('adm_ajustes_venta as a', 'a.idajuste', '=', 'd.idajuste')
            ->where('a.idcotizacion', $detalle->idcotizacion)
            ->where('a.estado', 'APROBADO')
            ->where('d.iddetallecotizacion', $detalle->iddetallecotizacion)
            ->orderByDesc('a.idajuste')
            ->orderByDesc('d.iddetalleajuste')
            ->select('d.cantidad_nueva', 'd.total_nuevo')
            ->first();

        return [
            'cantidad' => $ultimo ? (int) $ultimo->cantidad_nueva : (int) $detalle->cantidad,
            'total' => $ultimo
                ? $this->dineroACentavos($ultimo->total_nuevo)
                : $this->dineroACentavos($detalle->total),
        ];
    }

    private function totalVigente(int $idCotizacion, $totalOriginal): int
    {
        $suma = DB::table('adm_ajustes_venta')
            ->where('idcotizacion', $idCotizacion)
            ->where('estado', 'APROBADO')
            ->selectRaw('COALESCE(SUM(diferencia), 0) as neto')
            ->value('neto');

        return $this->dineroACentavos($totalOriginal)
            + $this->dineroACentavos($suma, true);
    }

    public function registrar(array $datos, int $idUsuario): array
    {
        return DB::transaction(function () use ($datos, $idUsuario) {
            // Bloqueo compartido para serializar todas las solicitudes de esta venta.
            $cotizacion = DB::table('adm_cotizacion')
                ->where('idcotizacion', $datos['idcotizacion'])
                ->lockForUpdate()
                ->first();

            if (!$cotizacion) {
                $this->error('idcotizacion', 'Cotización no encontrada.');
            }

            // Retries: devolver la solicitud anterior solo si coincide lo básico.
            $existente = DB::table('adm_ajustes_venta')
                ->where('uuid_operacion', $datos['uuid_operacion'])
                ->first();


            if ($existente) {
                if (
                    (int) $existente->idcotizacion !== (int) $datos['idcotizacion'] ||
                    (int) $existente->idusuario_solicita !== $idUsuario ||
                    $existente->tipo_ajuste !== $datos['tipo_ajuste'] ||
                    $existente->motivo !== $datos['motivo'] ||
                    (string) ($existente->observaciones ?? '') !==
                    (string) ($datos['observaciones'] ?? '') ||
                    (int) ($existente->idpedidoproduccion ?? 0) !==
                    (int) ($datos['idpedidoproduccion'] ?? 0)
                ) {
                    $this->error(
                        'uuid_operacion',
                        'Este UUID pertenece a una solicitud diferente.'
                    );
                }

                $detallesGuardados = DB::table('adm_ajustes_venta_detalle')
                    ->where('idajuste', $existente->idajuste)
                    ->get()
                    ->keyBy('iddetallecotizacion');

                if ($detallesGuardados->count() !== count($datos['detalles'])) {
                    $this->error(
                        'uuid_operacion',
                        'El UUID contiene un conjunto diferente de renglones.'
                    );
                }

                foreach ($datos['detalles'] as $indice => $item) {
                    $guardado = $detallesGuardados->get(
                        $item['iddetallecotizacion']
                    );

                    if (
                        !$guardado ||
                        $guardado->tipo_cambio !== $item['tipo_cambio'] ||
                        (int) $guardado->cantidad_nueva !==
                        (int) $item['cantidad_nueva'] ||
                        $this->dineroACentavos($guardado->total_nuevo) !==
                        $this->dineroACentavos($item['total_nuevo']) ||
                        !empty($item['precio_nuevo']) ||
                        !empty($item['datos_nuevos'])
                    ) {
                        $this->error(
                            "detalles.$indice",
                            'El UUID ya fue utilizado con otros datos.'
                        );
                    }
                }

                return [
                    'idajuste' => (int) $existente->idajuste,
                    'estado' => $existente->estado,
                    'reutilizado' => true,
                ];
            }


            if (!in_array((int) $cotizacion->estado, [5, 6], true)) {
                $this->error('idcotizacion', 'Solo se admiten cotizaciones para facturar o facturadas.');
            }
            if (!$cotizacion->idcliente) {
                $this->error('idcotizacion', 'La cotización no tiene cliente.');
            }
            if ($cotizacion->total === null) {
                $this->error('idcotizacion', 'La cotización no tiene total comercial consolidado.');
            }


            $this->validarCotizacionSimple($cotizacion);


            if (DB::table('adm_ajustes_venta')
                ->where('idcotizacion', $cotizacion->idcotizacion)
                ->whereIn('estado', ['BORRADOR', 'SOLICITADO'])
                ->exists()
            ) {
                $this->error('idcotizacion', 'Ya existe un ajuste pendiente para esta venta.');
            }

            $idPedido = $datos['idpedidoproduccion'] ?? null;
            if ($idPedido !== null && !DB::table('adm_pedidos_produccion')
                ->where('idpedidoproduccion', $idPedido)
                ->where('idcotizacion', $cotizacion->idcotizacion)
                ->exists()) {
                $this->error('idpedidoproduccion', 'El pedido no corresponde a la venta.');
            }

            // Alcance inicial: ajustes monetarios de renglones existentes.
            if (!in_array($datos['tipo_ajuste'], ['REDUCCION', 'AUMENTO'], true)) {
                $this->error('tipo_ajuste', 'Este tipo de ajuste aún no está habilitado.');
            }

            $montoOriginal = $this->dineroACentavos($cotizacion->total);
            $montoAnterior = $this->totalVigente((int) $cotizacion->idcotizacion, $cotizacion->total);
            $deltaTotal = 0;
            $renglones = [];

            foreach ($datos['detalles'] as $indice => $item) {
                $detalle = DB::table('adm_detalle_cotizacion')
                    ->where('idcotizacion', $cotizacion->idcotizacion)
                    ->where('iddetallecotizacion', $item['iddetallecotizacion'])
                    ->where('estado', 1)
                    ->first();

                if (!$detalle) {
                    $this->error("detalles.$indice", 'El renglón no pertenece a esta venta o no está activo.');
                }

                if ($item['tipo_cambio'] !== $datos['tipo_ajuste']) {
                    $this->error("detalles.$indice.tipo_cambio", 'El tipo del detalle debe coincidir con el ajuste.');
                }

                if (
                    array_key_exists('precio_nuevo', $item)
                    && $item['precio_nuevo'] !== null
                ) {
                    $this->error("detalles.$indice.precio_nuevo", 'Los cambios de precio unitario se habilitarán en una fase posterior.');
                }

                if (!empty($item['datos_nuevos'])) {
                    $this->error("detalles.$indice.datos_nuevos", 'Las nuevas especificaciones se habilitarán con el flujo operativo.');
                }

                if ($detalle->cantidad === null || $detalle->total === null) {
                    $this->error("detalles.$indice", 'El detalle no tiene cantidad y total originales válidos.');
                }

                [$cantidadAnterior, $totalAnterior] = array_values($this->vigenteDetalle($detalle));
                $cantidadNueva = (int) $item['cantidad_nueva'];
                $totalNuevo = $this->dineroACentavos($item['total_nuevo']);


                // El piloto solo admite cambios proporcionales de cantidad.
                // No permite modificar indirectamente el precio.

                $cantidadOriginal = (int) $detalle->cantidad;

                if ($cantidadOriginal <= 0) {
                    $this->error(
                        "detalles.$indice.cantidad_nueva",
                        'El renglón original debe tener cantidad positiva.'
                    );
                }

                $totalOriginalCentavos = $this->dineroACentavos(
                    $detalle->total
                );

                $totalPermitido = $this->importeProporcional(
                    $totalOriginalCentavos,
                    $cantidadOriginal,
                    $cantidadNueva
                );

                if (
                    $cantidadNueva !== $cantidadAnterior &&
                    $totalNuevo !== $totalPermitido
                ) {
                    $this->error(
                        "detalles.$indice.total_nuevo",
                        'El importe propuesto no corresponde a la cantidad. ' .
                            'Importe permitido: Q' .
                            $this->centavosADinero($totalPermitido)
                    );
                }


                if (
                    $datos['tipo_ajuste'] === 'REDUCCION'
                    && !($cantidadNueva <= $cantidadAnterior && $totalNuevo < $totalAnterior)
                ) {
                    $this->error("detalles.$indice", 'La reducción debe disminuir el importe sin aumentar la cantidad.');
                }
                if (
                    $datos['tipo_ajuste'] === 'AUMENTO'
                    && !($cantidadNueva >= $cantidadAnterior && $totalNuevo > $totalAnterior)
                ) {
                    $this->error("detalles.$indice", 'El aumento debe incrementar el importe sin disminuir la cantidad.');
                }

                $delta = $totalNuevo - $totalAnterior;
                $deltaTotal += $delta;

                $renglones[] = [
                    'iddetallecotizacion' => $detalle->iddetallecotizacion,
                    'tipo_cambio' => $item['tipo_cambio'],
                    'descripcion' => $detalle->descripcion,
                    'cantidad_anterior' => $cantidadAnterior,
                    'cantidad_nueva' => $cantidadNueva,
                    'precio_anterior' => $detalle->precio_unitario,
                    'precio_nuevo' => null,
                    'total_anterior' => $this->centavosADinero($totalAnterior),
                    'total_nuevo' => $this->centavosADinero($totalNuevo),
                    'diferencia' => $this->centavosADinero($delta),
                    'datos_anteriores' => json_encode([
                        'cantidad' => $cantidadAnterior,
                        'total' => $this->centavosADinero($totalAnterior),
                        'descripcion' => $detalle->descripcion,
                        'unidad_medida' => $detalle->unidad_medida,
                        'ancho' => $detalle->ancho,
                        'alto' => $detalle->alto,
                        'profundidad' => $detalle->profundidad,
                    ], JSON_UNESCAPED_UNICODE),
                    'datos_nuevos' => json_encode([
                        'cantidad' => $cantidadNueva,
                        'total' => $this->centavosADinero($totalNuevo),
                    ], JSON_UNESCAPED_UNICODE),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            $montoNuevo = $montoAnterior + $deltaTotal;
            if ($montoNuevo < 0) {
                $this->error('detalles', 'El nuevo total comercial no puede ser negativo.');
            }

            $idAjuste = DB::table('adm_ajustes_venta')->insertGetId([
                'idcotizacion' => $cotizacion->idcotizacion,
                'idpedidoproduccion' => $idPedido,
                'idcliente' => $cotizacion->idcliente,
                'tipo_ajuste' => $datos['tipo_ajuste'],
                'motivo' => $datos['motivo'],
                'observaciones' => $datos['observaciones'] ?? null,
                'fecha_solicitud' => now(),
                'estado' => 'SOLICITADO',
                'estado_produccion' => 'NO_EVALUADO',
                'estado_fel' => 'NO_EVALUADO',
                'estado_cxc' => 'NO_EVALUADO',
                'monto_original' => $this->centavosADinero($montoOriginal),
                'monto_anterior' => $this->centavosADinero($montoAnterior),
                'monto_nuevo' => $this->centavosADinero($montoNuevo),
                'diferencia' => $this->centavosADinero($deltaTotal),
                'idusuario_solicita' => $idUsuario,
                'uuid_operacion' => $datos['uuid_operacion'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($renglones as $renglon) {
                $renglon['idajuste'] = $idAjuste;
                DB::table('adm_ajustes_venta_detalle')->insert($renglon);
            }

            DB::table('adm_ajustes_venta_eventos')->insert([
                'idajuste' => $idAjuste,
                'idusuario' => $idUsuario,
                'accion' => 'SOLICITAR',
                'estado_anterior' => null,
                'estado_nuevo' => 'SOLICITADO',
                'descripcion' => 'Solicitud comercial registrada.',
                'fecha_evento' => now(),
            ]);

            return [
                'idajuste' => $idAjuste,
                'estado' => 'SOLICITADO',
                'monto_anterior' => $this->centavosADinero($montoAnterior),
                'monto_nuevo' => $this->centavosADinero($montoNuevo),
                'diferencia' => $this->centavosADinero($deltaTotal),
                'reutilizado' => false,
            ];
        }, 3);
    }

    public function aprobar(int $idAjuste, int $idUsuario, ?string $observacion): array
    {
        return DB::transaction(function () use ($idAjuste, $idUsuario, $observacion) {
            // Primero obtener la referencia para bloquear la cotización.
            $referencia = DB::table('adm_ajustes_venta')
                ->where('idajuste', $idAjuste)->first();
            if (!$referencia) {
                $this->error('idajuste', 'Ajuste no encontrado.');
            }

            $cotizacion = DB::table('adm_cotizacion')
                ->where('idcotizacion', $referencia->idcotizacion)
                ->lockForUpdate()->first();
            if (!$cotizacion) {
                $this->error('idajuste', 'No existe la cotización del ajuste.');
            }

            $ajuste = DB::table('adm_ajustes_venta')
                ->where('idajuste', $idAjuste)
                ->lockForUpdate()->first();

            if (!$ajuste || $ajuste->estado !== 'SOLICITADO') {
                $this->error('idajuste', 'Este ajuste ya no está pendiente de autorización.');
            }
            if ((int) $ajuste->idusuario_solicita === $idUsuario) {
                $this->error('idajuste', 'El solicitante no puede aprobar su propio ajuste.');
            }
            if (!in_array((int) $cotizacion->estado, [5, 6], true)) {
                $this->error('idajuste', 'La cotización dejó de estar habilitada para ajustes.');
            }

            $this->validarCotizacionSimple($cotizacion);

            $montoVigente = $this->totalVigente((int) $cotizacion->idcotizacion, $cotizacion->total);
            if ($this->dineroACentavos($ajuste->monto_anterior) !== $montoVigente) {
                $this->error('idajuste', 'El importe vigente cambió. Debe registrarse una nueva solicitud.');
            }

            $detalles = DB::table('adm_ajustes_venta_detalle')
                ->where('idajuste', $idAjuste)->orderBy('iddetalleajuste')->get();
            if ($detalles->isEmpty()) {
                $this->error('idajuste', 'El ajuste no tiene renglones.');
            }

            $diferencia = 0;
            foreach ($detalles as $detalleAjuste) {
                $detalle = DB::table('adm_detalle_cotizacion')
                    ->where('idcotizacion', $cotizacion->idcotizacion)
                    ->where('iddetallecotizacion', $detalleAjuste->iddetallecotizacion)
                    ->where('estado', 1)->first();
                if (!$detalle) {
                    $this->error('idajuste', 'Un renglón original ya no está disponible.');
                }


                // Verificar que el importe todavía corresponda
                // a la cantidad y al precio efectivo original.

                $originalCantidad = (int) $detalle->cantidad;

                if ($originalCantidad <= 0) {
                    $this->error(
                        'idajuste',
                        'El renglón original tiene cantidad inválida.'
                    );
                }

                $totalOriginalCentavos = $this->dineroACentavos(
                    $detalle->total
                );

                $totalEsperado = $this->importeProporcional(
                    $totalOriginalCentavos,
                    $originalCantidad,
                    (int) $detalleAjuste->cantidad_nueva
                );

                $vigente = $this->vigenteDetalle($detalle);

                if (
                    (int) $detalleAjuste->cantidad_nueva !== $vigente['cantidad'] &&
                    $this->dineroACentavos($detalleAjuste->total_nuevo) !== $totalEsperado
                ) {
                    $this->error(
                        'idajuste',
                        'El importe del ajuste ya no corresponde ' .
                            'a las condiciones originales de la cotización.'
                    );
                }
                
                if (
                    (int) $detalleAjuste->cantidad_anterior !== $vigente['cantidad']
                    || $this->dineroACentavos($detalleAjuste->total_anterior) !== $vigente['total']
                ) {
                    $this->error('idajuste', 'Un renglón cambió después de la solicitud.');
                }

                $delta = $this->dineroACentavos($detalleAjuste->total_nuevo)
                    - $this->dineroACentavos($detalleAjuste->total_anterior);
                if ($delta !== $this->dineroACentavos($detalleAjuste->diferencia, true)) {
                    $this->error('idajuste', 'La diferencia de un renglón es inconsistente.');
                }
                $diferencia += $delta;
            }

            if (
                $diferencia !== $this->dineroACentavos($ajuste->diferencia, true)
                || $montoVigente + $diferencia !== $this->dineroACentavos($ajuste->monto_nuevo)
                || $montoVigente + $diferencia < 0
            ) {
                $this->error('idajuste', 'Los importes del ajuste no concilian.');
            }

            $ahora = now();
            DB::table('adm_ajustes_venta')->where('idajuste', $idAjuste)->update([
                'estado' => 'APROBADO',
                'fecha_aprobacion' => $ahora,
                'fecha_efectiva' => $ahora->toDateString(),
                'idusuario_aprueba' => $idUsuario,
                'observacion_aprobacion' => $observacion,
                'updated_at' => $ahora,
            ]);

            DB::table('adm_ajustes_venta_eventos')->insert([
                'idajuste' => $idAjuste,
                'idusuario' => $idUsuario,
                'accion' => 'APROBAR',
                'estado_anterior' => 'SOLICITADO',
                'estado_nuevo' => 'APROBADO',
                'descripcion' => $observacion ?: 'Ajuste comercial aprobado.',
                'fecha_evento' => $ahora,
            ]);

            return [
                'idajuste' => $idAjuste,
                'estado' => 'APROBADO',
                'fecha_efectiva' => $ahora->toDateString(),
                'diferencia' => $this->centavosADinero($diferencia),
                'aviso' => 'Pendiente de evaluación operativa, FEL y CxC.',
            ];
        }, 3);
    }

    public function rechazar(int $idAjuste, int $idUsuario, string $motivo): array
    {
        return DB::transaction(function () use ($idAjuste, $idUsuario, $motivo) {
            $ajuste = DB::table('adm_ajustes_venta')
                ->where('idajuste', $idAjuste)
                ->lockForUpdate()->first();

            if (!$ajuste || $ajuste->estado !== 'SOLICITADO') {
                $this->error('idajuste', 'El ajuste no existe o ya fue resuelto.');
            }
            if ((int) $ajuste->idusuario_solicita === $idUsuario) {
                $this->error('idajuste', 'El solicitante no puede resolver su propia solicitud.');
            }

            $ahora = now();
            DB::table('adm_ajustes_venta')->where('idajuste', $idAjuste)->update([
                'estado' => 'RECHAZADO',
                'fecha_aprobacion' => null,
                'fecha_efectiva' => null,
                'idusuario_aprueba' => $idUsuario,
                'observacion_aprobacion' => $motivo,
                'updated_at' => $ahora,
            ]);

            DB::table('adm_ajustes_venta_eventos')->insert([
                'idajuste' => $idAjuste,
                'idusuario' => $idUsuario,
                'accion' => 'RECHAZAR',
                'estado_anterior' => 'SOLICITADO',
                'estado_nuevo' => 'RECHAZADO',
                'descripcion' => $motivo,
                'fecha_evento' => $ahora,
            ]);

            return ['idajuste' => $idAjuste, 'estado' => 'RECHAZADO'];
        }, 3);
    }


    private function validarCotizacionSimple(object $cotizacion): void
    {
        $descuento = $this->dineroACentavos(
            $cotizacion->descuento_monto ?? '0.00'
        );

        $timbre = $this->dineroACentavos(
            $cotizacion->timbre_prensa_monto ?? '0.00'
        );

        if ($descuento !== 0 || $timbre !== 0) {
            $this->error(
                'idcotizacion',
                'Las cotizaciones con descuentos o cargos globales ' .
                    'requieren revisión antes de ajustar.'
            );
        }

        $totalDetalles = DB::table('adm_detalle_cotizacion')
            ->where('idcotizacion', $cotizacion->idcotizacion)
            ->where('estado', 1)
            ->selectRaw('COALESCE(SUM(total), 0) as importe')
            ->value('importe');

        if (
            $this->dineroACentavos($totalDetalles) !==
            $this->dineroACentavos($cotizacion->total)
        ) {
            $this->error(
                'idcotizacion',
                'El total de la cotización no concilia con sus renglones.'
            );
        }
    }
}
