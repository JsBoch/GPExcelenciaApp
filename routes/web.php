<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| React SPA
|--------------------------------------------------------------------------
| Laravel entrega siempre la vista principal y React Router decide
| qué componente mostrar según la URL.
*/

Route::get('/', function () {
    return view('welcome');
});

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');