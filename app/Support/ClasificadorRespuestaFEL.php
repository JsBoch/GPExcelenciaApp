<?php

namespace App\Support;

class ClasificadorRespuestaFEL
{
    public static function clasificar(
        int $codigoHttp,
        ?array $respuesta
    ): array {
        $respuesta = $respuesta ?? [];

        $certificada =
            $codigoHttp >= 200 &&
            $codigoHttp < 300 &&
            ($respuesta['resultado'] ?? null) === true &&
            !empty($respuesta['uuid']) &&
            !empty($respuesta['serie']) &&
            !empty($respuesta['numero']);

        if ($certificada) {
            return [
                'estado' => 'CERTIFICACION_RECIBIDA',
                'requiere_conciliacion' => false,
                'requiere_guardado' => true,
                'uuid' => $respuesta['uuid'],
                'mensaje' =>
                    'INFILE confirmó una certificación. ' .
                    'Falta completar la persistencia local.',
            ];
        }

        // Un HTTP 400, 422 o 500 no demuestra por sí solo
        // que el documento no haya sido certificado.
        return [
            'estado' => 'INCIERTO',
            'requiere_conciliacion' => true,
            'requiere_guardado' => false,
            'uuid' => null,
            'mensaje' =>
                'No hay confirmación suficiente del resultado FEL.',
        ];
    }
}
