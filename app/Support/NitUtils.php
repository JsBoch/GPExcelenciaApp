<?php

namespace App\Support;

use App\Rules\GuatemalaNit;

class NitUtils
{
    public static function esValido(string $nitOCui): bool
    {
        // Reutiliza la lógica de la Rule
        $errors = [];
        (new GuatemalaNit)->validate('nit', $nitOCui, function($msg) use (&$errors){
            $errors[] = $msg;
        });
        return empty($errors);
    }

    public static function normalizarParaFEL(string $nit): string
    {
        return GuatemalaNit::normalizarParaFEL($nit);
    }

    public static function depurar(string $nit): string
    {
        return GuatemalaNit::depurarNit($nit);
    }
}
