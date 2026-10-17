<?php

namespace Tests\Unit;

use App\Support\FCAMTimbreAutorizacion;
use App\Support\FCAMTimbrePreEnvio;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class FCAMTimbrePreEnvioTest extends TestCase
{
    private const XML = '<GTDocumento><DTE>FCAM PRUEBA FICTICIA</DTE></GTDocumento>';

    private function intento(string $xml = self::XML): object
    {
        return (object) [
            'idintento' => 12001,
            'idcotizacion' => 875001,
            'tipo_documento' => 'FCAM',
            'estado' => 'ENVIANDO',
            'identificador' => 'prueba-fcam-uuid',
            'xml_enviado' => $xml,
            'xml_hash' => hash('sha256', $xml),
        ];
    }

    private function permiso(CarbonImmutable $ahora): bool
    {
        return FCAMTimbreAutorizacion::evaluar(
            'production',
            'mysql',
            [
                'habilitado' => true,
                'cotizacion_id' => 875001,
                'total_factura' => '1752.47',
                'vence_en' => '2026-10-16 17:00:00',
            ],
            875001,
            1752.47,
            $ahora,
            true,
            true
        );
    }

    private function verificar(bool $permiso, ?object $intento = null, string $xml = self::XML): bool
    {
        return FCAMTimbrePreEnvio::evaluar(
            $permiso,
            true,
            $intento ?? $this->intento(),
            875001,
            12001,
            'prueba-fcam-uuid',
            hash('sha256', self::XML),
            $xml
        );
    }

    public function test_autorizacion_vencida_bloquea_antes_del_envio(): void
    {
        $permiso = $this->permiso(CarbonImmutable::parse('2026-10-16 17:00:01', 'America/Guatemala'));
        $this->assertFalse($permiso);
        $this->assertFalse($this->verificar($permiso));
    }

    public function test_xml_adulterado_despues_de_reservar_bloquea(): void
    {
        $permiso = $this->permiso(CarbonImmutable::parse('2026-10-16 16:30:00', 'America/Guatemala'));
        $this->assertTrue($permiso);
        $this->assertFalse($this->verificar($permiso, $this->intento(self::XML . ' CAMBIO')));
        $this->assertFalse($this->verificar($permiso, $this->intento(), self::XML . ' CAMBIO'));
    }

    public function test_autorizacion_valida_e_intento_integro_permiten_avanzar(): void
    {
        $permiso = $this->permiso(CarbonImmutable::parse('2026-10-16 16:30:00', 'America/Guatemala'));
        $this->assertTrue($permiso);
        $this->assertTrue($this->verificar($permiso));
    }

    public function test_intento_no_reservado_o_de_otra_cotizacion_se_bloquea(): void
    {
        $intento = $this->intento();
        $intento->estado = 'PREPARADO';
        $this->assertFalse($this->verificar(true, $intento));
        $intento = $this->intento();
        $intento->idcotizacion = 875002;
        $this->assertFalse($this->verificar(true, $intento));
        $intento = $this->intento();
        $intento->tipo_documento = 'NCRE';
        $this->assertFalse($this->verificar(true, $intento));
    }
}
