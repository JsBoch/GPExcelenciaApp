<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Http;

class InfileController extends Controller
{
    public function consultaNit($nit)
    {
        // 1) Validación mínima
        if (!preg_match('/^\d+$/', $nit)) {
            return response()->json([
                'ok' => false,
                'message' => 'NIT inválido'
            ], 422);
        }

        // 2) Payload según INFILE (JSON, NO XML)
        $payload = [
            "emisor_codigo" => config('services.infile.codigo'),
            "emisor_clave"  => config('services.infile.clave'),
            "nit_consulta"  => $nit
        ];

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->post(config('services.infile.url'), $payload);

            if (!$response->successful()) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Error de comunicación con INFILE'
                ], 500);
            }

            $data = $response->json();

            // 3) INFILE devuelve errores en "mensaje"
            if (!empty($data['mensaje'])) {
                return response()->json([
                    'ok' => false,
                    'message' => $data['mensaje']
                ], 404);
            }

            return response()->json([
                'ok' => true,
                'nit' => $data['nit'] ?? $nit,
                'razon_social' => $data['nombre'] ?? '',
                // INFILE normalmente NO devuelve dirección, pero lo dejamos preparado
                'direccion' => $data['direccion'] ?? null
            ]);

        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => 'Error interno al consultar NIT'
            ], 500);
        }
    }
}
