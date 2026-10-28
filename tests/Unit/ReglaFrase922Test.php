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
    'ultimo dia del plazo' => [
        'NCRE', '2026-10-05',
        '2026-12-05T23:59:59', false,
    ],
    'primer dia posterior' => [
        'NCRE', '2026-10-05',
        '2026-12-06T00:00:00', true,
    ],
    'factura posterior' => [
        'NCRE', '2026-11-20',
        '2026-11-21T10:00:00', false,
    ],
    'fin de mes' => [
        'NCRE', '2026-08-31',
        '2026-10-31T23:59:59', false,
    ],
    'fin de mes vencido' => [
        'NCRE', '2026-08-31',
        '2026-11-10T10:00:00', true,
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
    public function test_regla_ncre(string $tipo, string $origen, string $nota, bool $esperado): void
    {
        self::assertSame($esperado, ReglaFrase922::aplica($tipo, $origen, $nota));
    }
}
