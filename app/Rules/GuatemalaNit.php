<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class GuatemalaNit implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $nit = self::depurarNit((string)$value);
        if ($nit === 'CF') {
            return; // Consumidor Final es válido
        }

        // NIT histórico con DV (0-9 o K)
        if (preg_match('/^\d+\-?[\dkK]$/', $nit)) {
            $dep = preg_replace('/[^0-9kK\-]/', '', $nit);
            $len = strlen(str_replace('-', '', $dep));
            if ($len < 2 || $len > 12 || !self::nitHistoricoValido($nit)) {
                $fail('El :attribute no es un NIT válido.');
            }
            return;
        }

        // NIT armonizado de 9 dígitos (primeros 2 = depto 01..22)
        if (preg_match('/^\d{9}$/', $nit)) {
            $dd = substr($nit, 0, 2);
            if (!self::deptoValido($dd)) {
                $fail('El :attribute no es un NIT válido.');
            }
            return;
        }

        // También aceptar CUI (12/13) si te llega en este campo
        if (preg_match('/^\d{12,13}$/', $nit)) {
            $dd = substr(str_pad($nit, 13, '0', STR_PAD_LEFT), 0, 2);
            if (!(self::deptoValido($dd) && self::cui13Valido($nit))) {
                $fail('El :attribute no es un CUI válido.');
            }
            return;
        }

        $fail('El :attribute no es un NIT válido.');
    }

    // Helpers públicos para reutilizar desde el controlador
    public static function depurarNit(string $raw): string
    {
        $s = trim($raw);
        $s = str_replace(['.', ' '], '', $s);
        $u = mb_strtoupper($s, 'UTF-8');
        if (in_array($u, ['CF','C/F','CONSUMIDORFINAL','CONSUMIDOR FINAL'], true)) {
            return 'CF';
        }
        return $s;
    }

    public static function normalizarParaFEL(string $raw): string
    {
        $nit = self::depurarNit($raw);
        if ($nit === 'CF') return 'CF';
        // Solo dígitos y K, sin guión
        return strtoupper(preg_replace('/[^0-9K]/', '', $nit));
    }

    private static function nitHistoricoValido(string $nit): bool
    {
        if (!preg_match('/^(\d+)\-?([\dkK])$/', $nit, $m)) return false;
        [, $cuerpo, $dv] = $m;
        $dv = ($dv === 'k' || $dv === 'K') ? 10 : intval($dv, 10);

        $add = 0;
        $len = strlen($cuerpo);
        for ($i = 0; $i < $len; $i++) {
            $digit = intval($cuerpo[$i], 10);
            $peso  = ($len - $i) + 1;
            $add  += $digit * $peso;
        }
        $calc = (11 - ($add % 11)) % 11; // 10 => K
        return $calc === $dv;
    }

    private static function deptoValido(string $dd): bool
    {
        return (bool)preg_match('/^(0[1-9]|1[0-9]|2[0-2])$/', $dd);
    }

    private static function cui13Valido(string $cui): bool
    {
        if (!preg_match('/^\d{12,13}$/', $cui)) return false;
        $n = str_pad($cui, 13, '0', STR_PAD_LEFT);
        $d = intval($n[8], 10);
        $digits = (strlen($n) === 13)
            ? [$n[0],$n[1],$n[2],$n[3],$n[4],$n[5],$n[6],$n[7]]
            : [$n[1],$n[2],$n[3],$n[4],$n[5],$n[6],$n[7]];
        $coeffs = [2,3,4,5,6,7,8,9];
        $sum = 0;
        foreach ($digits as $i => $ch) {
            $sum += intval($ch,10) * $coeffs[$i];
        }
        $calc = (($sum * 10) % 11);
        if ($calc === 10) $calc = 0;
        return $calc === $d;
    }
}