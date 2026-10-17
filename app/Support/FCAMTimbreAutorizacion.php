<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class FCAMTimbreAutorizacion
{
    /**
     * Barrera administrativa: NO reemplaza el control de intentos de FEL.
     * Producción, único ID autorizado, importe exacto y caducidad explícita.
     */
    public static function permiteProduccion(int $cotizacionId, float $totalFactura): bool
    {
        $entorno = app()->environment();
        $esquema = DB::connection()->getDriverName();
        $datos = config('services.infile.timbre_controlado', []);

        return self::evaluar(
            $entorno,
            $esquema,
            $datos,
            $cotizacionId,
            $totalFactura,
            CarbonImmutable::now(),
            config('services.infile.envio_intentos_habilitado', false) === true,
            config('services.infile.fcam_intentos_habilitado', false) === true
        );
    }

    public static function evaluar(
        string $entorno,
        string $driver,
        array $datos,
        int $cotizacionId,
        float $totalFactura,
        CarbonImmutable $ahora,
        bool $envioHabilitado,
        bool $fcamHabilitado
    ): bool {
        if ($entorno !== 'production' || $driver !== 'mysql' || !$envioHabilitado || !$fcamHabilitado) {
            return false;
        }
        if (($datos['habilitado'] ?? false) !== true) {
            return false;
        }
        $id = $datos['cotizacion_id'] ?? null;
        $total = $datos['total_factura'] ?? null;
        $hasta = $datos['vence_en'] ?? null;
        if (!is_int($id) || $id <= 0 || $id !== $cotizacionId ||
            !is_string($total) || !preg_match('/^\d+\.\d{2}$/D', $total) ||
            !is_string($hasta) || !preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/D', $hasta)) {
            return false;
        }
        try {
            $caducidad = CarbonImmutable::createFromFormat('!Y-m-d H:i:s', $hasta, 'America/Guatemala');
            if ($caducidad === false || $caducidad->format('Y-m-d H:i:s') !== $hasta ||
                $ahora->greaterThan($caducidad)) {
                return false;
            }
        } catch (\Throwable $e) {
            return false;
        }
        // Se compara en centavos para evitar errores de representación float.
        $autorizadoEnCentavos = (int) str_replace('.', '', $total);
        $solicitadoEnCentavos = (int) round($totalFactura * 100);
        return $autorizadoEnCentavos === $solicitadoEnCentavos;
    }
}
