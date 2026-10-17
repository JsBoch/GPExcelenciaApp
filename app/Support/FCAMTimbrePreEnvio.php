<?php

namespace App\Support;

final class FCAMTimbrePreEnvio
{
    /**
     * Comprobación pura de la barrera previa al POST, sin conexiones a BD ni HTTP.
     * La autorización se calcula con FCAMTimbreAutorizacion::permiteProduccion()
     * en el controlador; en tests se aporta una decisión ficticia.
     */
    public static function evaluar(
        bool $autorizacionVigente,
        bool $fcamConIntentos,
        ?object $intento,
        int $idCotizacion,
        int $idIntento,
        string $identificador,
        string $xmlOriginalHash,
        string $xmlQueSeEnviaria
    ): bool {
        if (!$autorizacionVigente || !$fcamConIntentos || $intento === null || $idIntento <= 0) {
            return false;
        }

        if (
            (int) ($intento->idintento ?? 0) !== $idIntento ||
            (int) ($intento->idcotizacion ?? 0) !== $idCotizacion ||
            (string) ($intento->tipo_documento ?? '') !== 'FCAM' ||
            (string) ($intento->estado ?? '') !== 'ENVIANDO' ||
            (string) ($intento->identificador ?? '') !== $identificador
        ) {
            return false;
        }

        $hashAlmacenado = (string) ($intento->xml_hash ?? '');
        $xmlAlmacenado = (string) ($intento->xml_enviado ?? '');

        if (strlen($hashAlmacenado) !== 64 || !ctype_xdigit($hashAlmacenado) || $xmlAlmacenado === '' || $xmlQueSeEnviaria === '') {
            return false;
        }

        return hash_equals(strtolower($hashAlmacenado), hash('sha256', $xmlAlmacenado))
            && hash_equals(strtolower($hashAlmacenado), $xmlOriginalHash)
            && hash_equals($xmlAlmacenado, $xmlQueSeEnviaria);
    }
}
