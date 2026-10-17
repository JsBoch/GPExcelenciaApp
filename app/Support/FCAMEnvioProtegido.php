<?php

namespace App\Support;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

final class FCAMEnvioProtegido
{
    /**
     * La comprobacion se ejecuta inmediatamente antes del POST.
     * Si falla, nunca se invoca el cliente HTTP.
     *
     * @param callable():bool $puedeEnviar
     */
    public static function transmitir(
        callable $puedeEnviar,
        string $url,
        array $headers,
        string $xml
    ): ?Response {
        if ($puedeEnviar() !== true) {
            return null;
        }

        return Http::timeout(30)
            ->withHeaders($headers)
            ->send('POST', $url, ['body' => $xml]);
    }
}
