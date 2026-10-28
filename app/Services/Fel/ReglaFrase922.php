<?php

namespace App\Services\Fel;

use Carbon\CarbonImmutable;
use InvalidArgumentException;

final class ReglaFrase922
{
    public const ZONA = 'America/Guatemala';

    // Fecha oficial comunicada por INFILE.
    public const VIGENCIA = '2026-11-10 00:00:00';

    public static function aplica(
        string $tipo,
        string $fechaOrigen,
        string $fechaEmisionNota
    ): bool {
        // La nueva regla aplica únicamente a NCRE.
        if (strtoupper(trim($tipo)) !== 'NCRE') {
            return false;
        }

        $emisionNota = self::fecha($fechaEmisionNota);

        $vigencia = CarbonImmutable::parse(
            self::VIGENCIA,
            self::ZONA
        );

        // Antes del 10/11/2026 no aplica la frase.
        if ($emisionNota->lessThan($vigencia)) {
            return false;
        }

        $origen = self::fecha($fechaOrigen);

        // Dos meses calendario desde el mismo día.
        // El día de vencimiento todavía es válido.
        $limite = $origen
            ->startOfDay()
            ->addMonthsNoOverflow(2);

        return $emisionNota
            ->startOfDay()
            ->greaterThan($limite);
    }

    private static function fecha(
        string $valor
    ): CarbonImmutable {
        $valor = trim($valor);

        if (!preg_match(
            '/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)?| \d{2}:\d{2}:\d{2})?$/',
            $valor
        )) {
            throw new InvalidArgumentException(
                'Fecha FEL inválida: formato no reconocido.'
            );
        }

        try {
            $fecha = CarbonImmutable::parse(
                $valor,
                self::ZONA
            );
        } catch (\Throwable $e) {
            throw new InvalidArgumentException(
                'Fecha FEL inválida.',
                0,
                $e
            );
        }

        if (
            $fecha->format('Y-m-d') !==
            substr($valor, 0, 10)
        ) {
            throw new InvalidArgumentException(
                'Fecha FEL inválida.'
            );
        }

        return $fecha->setTimezone(self::ZONA);
    }
}
