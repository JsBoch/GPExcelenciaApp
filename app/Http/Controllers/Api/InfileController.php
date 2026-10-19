<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class InfileController extends Controller
{
    public function consultaNit($nit)
    {
        $nit = trim($nit);

        if (!preg_match('/^\d+$/', $nit)) {
            return response()->json([
                'ok' => false,
                'message' => 'NIT inválido'
            ], 422);
        }

        $payload = [
            'emisor_codigo' => config('services.infile.codigo'),
            'emisor_clave' => config('services.infile.clave'),
            'nit_consulta' => $nit,
        ];

        try {
            $response = Http::timeout(15)
                ->acceptJson()
                ->asJson()
                ->post(
                    config('services.infile.consulta_nit_url'),
                    $payload
                );

            if (!$response->successful()) {
                Log::warning('Error HTTP consulta NIT INFILE', [
                    'status' => $response->status()
                ]);

                return response()->json([
                    'ok' => false,
                    'message' => 'Error de comunicación con INFILE'
                ], 502);
            }

            $data = $response->json();

            if (!is_array($data)) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Respuesta inválida de INFILE'
                ], 502);
            }

            // Detectar rechazo explícito del servicio
            if (($data['resultado'] ?? null) === false) {
                Log::warning('Consulta NIT rechazada por INFILE', [
                    'descripcion' => $data['descripcion'] ?? null
                ]);

                return response()->json([
                    'ok' => false,
                    'message' => $data['descripcion']
                        ?? 'INFILE rechazó la consulta'
                ], 502);
            }

            // Detectar errores del servicio de receptores
            if (!empty($data['mensaje'])) {
                return response()->json([
                    'ok' => false,
                    'message' => $data['mensaje']
                ], 422);
            }

            $nombre = trim((string) ($data['nombre'] ?? ''));

            if ($nombre === '') {
                return response()->json([
                    'ok' => false,
                    'message' => 'INFILE no devolvió el nombre del contribuyente'
                ], 422);
            }

            return response()->json([
                'ok' => true,
                'nit' => $data['nit'] ?? $nit,
                'razon_social' => $nombre,
                'direccion' => $data['direccion'] ?? null
            ]);

        } catch (\Throwable $e) {
            Log::error('Error consultando NIT INFILE', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Error interno al consultar NIT'
            ], 500);
        }
    }
}
