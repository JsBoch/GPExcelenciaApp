<?php

namespace Tests\Feature;

use App\Support\FCAMEnvioProtegido;
use App\Support\FCAMTimbrePreEnvio;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FCAMEnvioProtegidoHttpTest extends TestCase
{
    private const URL = 'https://ejemplo.invalid/fel-simulado';
    private const XML = '<GTDocumento><DTE>FCAM FICTICIO</DTE></GTDocumento>';

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        Http::fake(['*' => Http::response(['resultado' => true, 'uuid' => 'SIMULADO'], 200)]);
    }

    private function intento(): object
    {
        return (object) [
            'idintento' => 17001,
            'idcotizacion' => 890078,
            'tipo_documento' => 'FCAM',
            'estado' => 'ENVIANDO',
            'identificador' => 'fcam-simulado',
            'xml_enviado' => self::XML,
            'xml_hash' => hash('sha256', self::XML),
        ];
    }

    private function transmitir(bool $autorizado, ?object $intento = null): ?\Illuminate\Http\Client\Response
    {
        $intento ??= $this->intento();
        return FCAMEnvioProtegido::transmitir(
            fn (): bool => FCAMTimbrePreEnvio::evaluar(
                $autorizado,
                true,
                $intento,
                890078,
                17001,
                'fcam-simulado',
                hash('sha256', self::XML),
                self::XML
            ),
            self::URL,
            ['Content-Type' => 'application/xml'],
            self::XML
        );
    }

    public function test_sin_autorizacion_no_realiza_http(): void
    {
        $this->assertNull($this->transmitir(false));
        Http::assertNothingSent();
    }

    public function test_xml_alterado_no_realiza_http(): void
    {
        $intento = $this->intento();
        $intento->xml_enviado .= 'ALTERADO';
        $this->assertNull($this->transmitir(true, $intento));
        Http::assertNothingSent();
    }

    public function test_estado_invalido_no_realiza_http(): void
    {
        $intento = $this->intento();
        $intento->estado = 'INCIERTO';
        $this->assertNull($this->transmitir(true, $intento));
        Http::assertNothingSent();
    }

    public function test_autorizacion_e_integridad_validas_realizan_un_solo_http_simulado(): void
    {
        $respuesta = $this->transmitir(true);
        $this->assertNotNull($respuesta);
        $this->assertTrue($respuesta->successful());
        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => $request->url() === self::URL
            && $request->method() === 'POST'
            && $request->body() === self::XML);
    }
}
