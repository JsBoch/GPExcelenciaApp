<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmpleadoController;
use App\Http\Controllers\ClientesController;
use App\Http\Controllers\ContactoClienteController;
use App\Models\Clientes;
use App\Models\ContactoCliente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Models\User;
use App\Http\Controllers\CotizacionController;
// Route::get('/user', function (Request $request) {
//     return $request->user();
// })->middleware('auth:sanctum');
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {    
    // Obtener el usuario autenticado con sus perfiles y opciones
    $user = User::with('perfiles.opciones')->find($request->user()->id);    
    // Devolver el usuario con sus relaciones
    return $user;
});

Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);
// Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
//     return $request->user();
// });

// Rutas para empleados
//Aquí está accediendo a todos los métodos del controlador EmpleadoController
/*
Entiendo. El problema es que estás utilizando Route::apiResource('empleados', EmpleadoController::class);, lo cual automáticamente genera todas las rutas CRUD (Create, Read, Update, Delete) para tu recurso "empleados". Esto incluye la ruta para listar todos los empleados, que es la que necesitas.

Cómo funciona apiResource:

apiResource crea las siguientes rutas:

GET /empleados: index (lista todos los empleados)
POST /empleados: store (crea un nuevo empleado)
GET /empleados/{empleado}: show (muestra un empleado específico)
PUT/PATCH /empleados/{empleado}: update (actualiza un empleado)
DELETE /empleados/{empleado}: destroy (elimina un empleado)
 */

 //EMPLEADOS
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('/empleados', EmpleadoController::class);
    Route::put('/empleados/desactivar/{id}', [EmpleadoController::class, 'desactivar']);
// Rutas adicionales para las listas desplegables
//Aquí está accediendo al método que devuelve las listas desplegables de departamentos, puestos y identificaciones
    Route::get('/identificaciones', [EmpleadoController::class, 'getIdentificaciones']);
    Route::get('/departamentos', [EmpleadoController::class, 'getDepartamentos']);
    Route::get('/puestos', [EmpleadoController::class, 'getPuestos']);
    Route::get('/departamentos-pais', [EmpleadoController::class, 'getDepartamentosPais']);
});

//CLIENTES
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('/clientes', ClientesController::class);
    Route::put('/clientes/desactivar/{id}', [ClientesController::class, 'desactivar']);
// Rutas adicionales para las listas desplegables
//Aquí está accediendo al método que devuelve las listas desplegables de departamentos, puestos y identificaciones   
    Route::get('/departamentos-pais', [ClientesController::class, 'getDepartamentosPais']);
    Route::get('/vendedores', [ClientesController::class, 'getVendedores']);
});

//CONTACTO CLIENTE
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('/contacto_cliente', ContactoClienteController::class)->except(['index']); // Excluye la ruta index generada automáticamente;
    //Route::apiResource('/contacto_cliente', ContactoClienteController::class);
    Route::get('/contacto_cliente/cliente/{idcliente}', [ContactoClienteController::class, 'index']); // Agrega la ruta personalizada
    Route::put('/contacto_cliente/desactivar/{id}', [ContactoClienteController::class, 'desactivar']);
// Rutas adicionales para las listas desplegables
//Aquí está accediendo al método que devuelve las listas desplegables de departamentos, puestos y identificaciones   
    Route::get('/lista_clientes', [ContactoClienteController::class, 'getClientes']);
});


//COTIZACIONES
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('/cotizaciones', CotizacionController::class);
    Route::put('/cotizaciones/desactivar/{id}', [CotizacionController::class, 'desactivar']);
    // Rutas adicionales para las listas desplegables
    //Aquí está accediendo al método que devuelve las listas desplegables de departamentos, puestos y identificaciones
    Route::get('/lista_clientes', [CotizacionController::class, 'listarClientes']);    
    Route::get('/lista_contactos', [CotizacionController::class, 'listarContactos']);
    Route::get('/lista_tipospago', [CotizacionController::class, 'listarTiposPago']);    
    Route::get('/lista_unidadesmedida', [CotizacionController::class, 'listarUnidadesMedida']);    
});