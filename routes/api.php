<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmpleadoController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Rutas para empleados
//Aquí está accediendo a todos los métodos del controlador EmpleadoController
Route::middleware('auth:sanctum')->group(function () {
Route::apiResource('empleados', EmpleadoController::class);

// Rutas adicionales para las listas desplegables
//Aquí está accediendo al método que devuelve las listas desplegables de departamentos, puestos y identificaciones
Route::get('/identificaciones', [EmpleadoController::class, 'getIdentificaciones']);
Route::get('/departamentos', [EmpleadoController::class, 'getDepartamentos']);
Route::get('/puestos', [EmpleadoController::class, 'getPuestos']);
Route::get('/departamentos-pais', [EmpleadoController::class, 'getDepartamentosPais']);
});