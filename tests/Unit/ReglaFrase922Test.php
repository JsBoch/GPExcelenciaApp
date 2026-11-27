<?php

namespace Tests\Unit;

use App\Services\Fel\ReglaFrase922;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class ReglaFrase922Test extends TestCase
{
    public static function fechas(): array
    {
        return [
            'antes de vigencia' => [
                'NCRE', '2026-08-01',
                '2026-11-09T23:59:59', false,
            ],

            'vigencia primer segundo vencida' => [
                'NCRE', '2026-08-01',
                '2026-11-10T00:00:00', true,
            ],

            // Factura de octubre: noviembre y diciembre
            // son los dos meses posteriores.
            'ultimo dia sin frase octubre' => [
                'NCRE', '2026-10-05',
                '2026-12-31T23:59:59', false,
            ],

            'primer dia con frase octubre' => [
                'NCRE', '2026-10-05',
                '2027-01-01T00:00:00', true,
            ],

            'factura posterior' => [
                'NCRE', '2026-11-20',
                '2026-11-21T10:00:00', false,
            ],

            'fin de mes agosto sin vigencia' => [
                'NCRE', '2026-08-31',
                '2026-10-31T23:59:59', false,
            ],

            'fin de mes agosto con vigencia' => [
                'NCRE', '2026-08-31',
                '2026-11-10T10:00:00', true,
            ],

            // Caso real KARANTE: error INFILE 92202.
            'factura septiembre nota noviembre' => [
                'NCRE', '2026-09-03',
                '2026-11-25T11:57:29', false,
            ],

            'factura septiembre ultimo dia noviembre' => [
                'NCRE', '2026-09-03',
                '2026-11-30T23:59:59', false,
            ],

            'factura septiembre primer dia diciembre' => [
                'NCRE', '2026-09-03',
                '2026-12-01T00:00:00', true,
            ],

            'nunca NDEB' => [
                'NDEB', '2026-08-01',
                '2026-12-10T10:00:00', false,
            ],

            'nunca FCAM' => [
                'FCAM', '2026-08-01',
                '2026-12-10T10:00:00', false,
            ],
        ];
    }

    #[DataProvider('fechas')]
    public function test_regla_ncre(
        string $tipo,
        string $origen,
        string $nota,
        bool $esperado
    ): void {
        self::assertSame(
            $esperado,
            ReglaFrase922::aplica($tipo, $origen, $nota)
        );
    }
}