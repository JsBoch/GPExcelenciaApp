<?php

namespace Tests\Unit;

use App\Support\ClasificadorRespuestaFEL;
use PHPUnit\Framework\TestCase;

class ClasificadorRespuestaFELTest extends TestCase
{
    public function test_respuesta_certificada(): void
    {
        $resultado = ClasificadorRespuestaFEL::clasificar(
            200,
            [
                'resultado' => true,
                'uuid' => 'UUID-PRUEBA',
                'serie' => 'SERIE-PRUEBA',
                'numero' => '12345',
            ]
        );

        $this->assertSame(
            'CERTIFICACION_RECIBIDA',
            $resultado['estado']
        );

        $this->assertTrue(
            $resultado['requiere_guardado']
        );
    }

    public function test_respuesta_http_422_es_incierta(): void
    {
        $resultado = ClasificadorRespuestaFEL::clasificar(
            422,
            [
                'resultado' => false,
                'descripcion_errores' => ['Error de prueba'],
            ]
        );

        $this->assertSame(
            'INCIERTO',
            $resultado['estado']
        );

        $this->assertTrue(
            $resultado['requiere_conciliacion']
        );
    }

    public function test_respuesta_incompleta_es_incierta(): void
    {
        $resultado = ClasificadorRespuestaFEL::clasificar(
            200,
            ['resultado' => true]
        );

        $this->assertSame(
            'INCIERTO',
            $resultado['estado']
        );
    }

    public function test_respuesta_vacia_es_incierta(): void
    {
        $resultado = ClasificadorRespuestaFEL::clasificar(
            500,
            null
        );

        $this->assertSame(
            'INCIERTO',
            $resultado['estado']
        );
    }
}
