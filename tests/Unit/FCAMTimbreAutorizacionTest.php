<?php

namespace Tests\Unit;

use App\Support\FCAMTimbreAutorizacion;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class FCAMTimbreAutorizacionTest extends TestCase
{
    private function evaluar(array $sobrescritura = [], string $entorno = 'production', int $id = 875001, float $total = 1752.47, bool $envio = true, bool $fcam = true): bool
    {
        return FCAMTimbreAutorizacion::evaluar(
            $entorno,
            'mysql',
            array_merge([
                'habilitado' => true,
                'cotizacion_id' => 875001,
                'total_factura' => '1752.47',
                'vence_en' => '2026-10-16 17:00:00',
            ], $sobrescritura),
            $id,
            $total,
            CarbonImmutable::parse('2026-10-16 16:00:00', 'America/Guatemala'),
            $envio,
            $fcam
        );
    }

    public function test_bloquea_sin_habilitacion(): void
    {
        $this->assertFalse($this->evaluar(['habilitado' => false]));
    }

    public function test_solo_una_cotizacion_y_total_exacto(): void
    {
        $this->assertTrue($this->evaluar());
        $this->assertFalse($this->evaluar([], 'production', 875002));
        $this->assertFalse($this->evaluar([], 'production', 875001, 1752.48));
        $this->assertFalse($this->evaluar([], 'local'));
        $this->assertFalse($this->evaluar([], 'testing'));
    }

    public function test_caducidad_banderas_y_configuracion_incorrecta_bloquean(): void
    {
        $this->assertFalse($this->evaluar(['vence_en' => '2026-10-16 15:00:00']));
        $this->assertFalse($this->evaluar(['vence_en' => 'fecha-invalida']));
        $this->assertFalse($this->evaluar(['total_factura' => '1752.470']));
        $this->assertFalse($this->evaluar([], 'production', 875001, 1752.47, false, true));
        $this->assertFalse($this->evaluar([], 'production', 875001, 1752.47, true, false));
    }
}
