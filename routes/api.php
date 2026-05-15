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
use App\Http\Controllers\CotizacionCosteoController;
use App\Http\Controllers\ProductoPredefinidoController;
use App\Http\Controllers\MonitorFacturacionController;
use App\Http\Controllers\CosteoCotizacionesController;
use App\Http\Controllers\TipoPagoController;
use App\Http\Controllers\CotizacionConsultasController;
use App\Http\Controllers\PedidosProduccionController;
use App\Http\Controllers\CuentasPorCobrarController;
use App\Http\Controllers\AdmRecibosController;
use App\Http\Controllers\ReportesContabilidadController;
use App\Http\Controllers\ClienteContactoController;
use App\Http\Controllers\ReportesCXCController;
use App\Http\Controllers\Api\InfileController;
use App\Http\Controllers\MaquinasProduccionController;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\AreaTrabajoController;
use App\Http\Controllers\PlanificacionDetalleProduccionController;

//
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
    Route::get('/lista_vendedores', [EmpleadoController::class, 'listarVendedores']);
});

//CLIENTES
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('/clientes', ClientesController::class);
    Route::put('/clientes/desactivar/{id}', [ClientesController::class, 'desactivar']);
    // Rutas adicionales para las listas desplegables
    //Aquí está accediendo al método que devuelve las listas desplegables de departamentos, puestos y identificaciones   
    Route::get('/departamentos-pais', [ClientesController::class, 'getDepartamentosPais']);
    Route::get('/municipios/{iddepartamento}', [ClientesController::class, 'getMunicipios']);
    Route::get('/vendedores', [ClientesController::class, 'getVendedores']);
    /**
     * Este endpoint devuelve las opciones de facturación para un cliente específico.
     * Permite obtener información como si el cliente tiene NIT, CUI, o si es Consumidor Final.
     * Y los emails y direcciones asociadas
     */
    Route::get('/clientes/{id}/facturacion-opciones', [ClientesController::class, 'facturacionOpciones']);
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
    Route::get('/cotizaciones/detalle/{id}', [CotizacionController::class, 'detalle']);
    Route::post('/cotizaciones/{cotizacion}/detalle/guardar', [CotizacionController::class, 'guardarDetalle']);
    Route::put('/cotizaciones/desactivar/{id}', [CotizacionController::class, 'desactivar']);
    Route::post('/cotizaciones/{id}/pdf', [CotizacionController::class, 'generarPdf']);
    Route::get('/cotizaciones/{id}/nota-envio', [CotizacionController::class, 'generarNotaEnvio']);

    Route::put('/cotizaciones/rechazar/{id}', [CotizacionController::class, 'rechazar']);
    Route::put('/cotizaciones/{id}/fecha-prefacturacion', [CotizacionController::class, 'actualizarFechaPrefacturacion']);

    Route::get('/cotizaciones/{id}/nota-envio/config', [CotizacionController::class, 'notaEnvioConfig']);
    Route::post('/cotizaciones/{id}/nota-envio/generar', [CotizacionController::class, 'notaEnvioGenerar']);     // asigna numero_envio a seleccionados y genera data para PDF
    Route::post('/cotizaciones/{id}/nota-envio/reimprimir', [CotizacionController::class, 'notaEnvioReimprimir']); // reimprime envío N
    Route::put('/cotizaciones/activarfacturacion/masivo', [CotizacionController::class, 'activarFacturacionMasivo']);
    Route::put('/cotizaciones/activarfacturacion/{id}', [CotizacionController::class, 'activarFacturacion']);
    Route::post('/cotizaciones/{id}/nota-envio/eliminar', [CotizacionController::class, 'notaEnvioEliminar']);   // NUEVA
    Route::post('/cotizaciones/{id}/nota-envio/actualizar', [CotizacionController::class, 'notaEnvioActualizar']); // NUEVA


    Route::get('/motivos-rechazo', [CotizacionController::class, 'motivosRechazo']);
    // Rutas adicionales para las listas desplegables
    //Aquí está accediendo al método que devuelve las listas desplegables de departamentos, puestos y identificaciones
    Route::get('/lista_clientes', [CotizacionController::class, 'listarClientes']);
    Route::get('/lista_contactos', [CotizacionController::class, 'listarContactos']);
    Route::get('/lista_tipospago', [CotizacionController::class, 'listarTiposPago']);
    Route::get('/lista_unidadesmedida', [CotizacionController::class, 'listarUnidadesMedida']);
    Route::get('/cotizaciones/{id}/historial-envios', [CotizacionController::class, 'historialEnvios']);

    Route::post('/cotizaciones/{id}', [CotizacionController::class, 'update']);
});

//COSTEO COTIZACIONES
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('/costeocotizaciones', CotizacionCosteoController::class);
    Route::get('/costeocotizaciones/{id}/pdf', [CotizacionCosteoController::class, 'generarPdf']);
});

//PRODUCTO PREDEFINIDO
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('/productopredefinido', ProductoPredefinidoController::class);
    Route::put('/productopredefinido/desactivar/{id}', [ProductoPredefinidoController::class, 'desactivar']);

    // Rutas adicionales para las listas desplegables    
    Route::get('/lista_unidadesmedidapp', [ProductoPredefinidoController::class, 'listarUnidadesMedida']);
});

//MONITOR FACTURACION
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('/monitorfacturacion', MonitorFacturacionController::class);
    Route::put('/monitorfacturacion/desactivar/{id}', [MonitorFacturacionController::class, 'desactivar']);
    Route::get('/monitorfacturacion/{id}/pdf', [MonitorFacturacionController::class, 'generarPdfJson']);
    Route::post('/facturar/{id}', [MonitorFacturacionController::class, 'generarXmlFactura']);
    Route::post('/notacredito/{id}', [MonitorFacturacionController::class, 'generarXmlNotaCredito']);
    Route::post('/notadebito/{id}', [MonitorFacturacionController::class, 'generarXmlNotaDebito']);
    Route::put('/facturar/{id}/anular', [MonitorFacturacionController::class, 'anularFactura']);

    Route::get('/monitorfacturacion/{id}/facturapdf', [MonitorFacturacionController::class, 'generarImpresionFactura']);
    Route::get('/monitorfacturacion/{id}/factura-data', [MonitorFacturacionController::class, 'facturaData']);

    Route::get('/cotizaciones/{id}/notasfel', [MonitorFacturacionController::class, 'listarNotasFel']); // lista notas (opcionalmente por tipo)
    Route::get('/notasfel/{idnota}/pdf',       [MonitorFacturacionController::class, 'generarPdfNotaFel']); // imprime una nota por idnota
    Route::get('/cotizaciones/{id}/notasfel/ultimo/pdf', [MonitorFacturacionController::class, 'generarPdfUltimaNotaPorTipo']);

    Route::post('/monitorfacturacion/comentarios', [MonitorFacturacionController::class, 'storeComentario']);
    Route::get('/monitorfacturacion/{idcotizacion}/comentarios', [MonitorFacturacionController::class, 'comentarios']);
    Route::put('/monitorfacturacion/{idcotizacion}/anular', [MonitorFacturacionController::class, 'anularCotizacion']);
    Route::get('/reporte/anuladas', [MonitorFacturacionController::class, 'reporteAnuladas']);
    Route::get('/reporte/notas-credito', [MonitorFacturacionController::class, 'reporteNotasCredito']);
    Route::get('/reporte/notas-ajuste', [MonitorFacturacionController::class, 'reporteNotasAjuste']);
});

//CONSULTA COTIZACIONES COSTEO
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('/cotizacionescosteo', CosteoCotizacionesController::class);
    Route::get('/cotizacionescosteo/{id}/pdf', [CosteoCotizacionesController::class, 'generarPdf']);
    Route::get('/exportar/cotizacion/{id}', [CosteoCotizacionesController::class, 'exportarExcel'])->name('cotizaciones.exportar');
});

//TIPOS DE PAGO
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('/tipopago', TipoPagoController::class);
    Route::put('/tipopago/desactivar/{id}', [TipoPagoController::class, 'desactivar']);
});

//CONSULTAS COTIZACIONES PRE-FACTURACIÓN
//Route::middleware('auth:sanctum')->get('/cotizaciones-estado4', [CotizacionConsultasController::class, 'index']);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('cotizaciones-estado4', [CotizacionConsultasController::class, 'index']);
    Route::post('cotizaciones-estado4/agregar-comentario', [CotizacionConsultasController::class, 'storeComentario']);
    Route::get('cotizaciones-estado4/{idcotizacion}/comentarios', [CotizacionConsultasController::class, 'comentarios']);
    //Nueva ruta para obtener comentarios de una cotización específica
    Route::get('/cotizaciones/{idcotizacion}/comentarios', [CotizacionConsultasController::class, 'comentarios']);
});

//PEDIDOS A PRODUCCIÓN
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/pedidosproduccion/cotizaciones_pedido_produccion', [PedidosProduccionController::class, 'cotizacionesPedidoProduccion']);
    Route::get('/pedidosproduccion/cotizacion/{numero}', [PedidosProduccionController::class, 'buscarCotizacionPorNumero']);
    Route::apiResource('/pedidosproduccion', PedidosProduccionController::class);
    Route::get('/pedidosproduccion/detalle/{id}', [PedidosProduccionController::class, 'detalle']);
    Route::post('/pedidosproduccion/{cotizacion}/detalle/guardar', [PedidosProduccionController::class, 'guardarDetalle']);
    Route::put('/pedidosproduccion/desactivar/{id}', [PedidosProduccionController::class, 'desactivar']);
    Route::get('/pedidosproduccion/{id}/pdf', [PedidosProduccionController::class, 'generarPdf']);
    Route::put('/pedidosproduccion/activarfacturacion/{id}', [PedidosProduccionController::class, 'activarFacturacion']);
    Route::get('/pedidosproduccion/{id}/nota-envio', [PedidosProduccionController::class, 'generarNotaEnvio']);
    Route::put('/pedidosproduccion/rechazar/{id}', [PedidosProduccionController::class, 'rechazar']);
    Route::get('/pedidosproduccion/export/excel', [PedidosProduccionController::class, 'exportExcel']);
    Route::get('/pedidosproduccion/detalle-cotizacion/{idcotizacion}', [PedidosProduccionController::class, 'detalleCotizacion']);
    Route::get('/pedidosproduccion/{id}/areas',[PedidosProduccionController::class, 'obtenerAreasPedido']);    
});

// CUENTAS POR COBRAR
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/cuentas-por-cobrar/por-cliente', [CuentasPorCobrarController::class, 'porCliente']);
    Route::apiResource('/cuentas-por-cobrar', CuentasPorCobrarController::class);

    // Si quieres agregar rutas personalizadas (ejemplo: desactivar, filtros, etc.)
    // Route::put('/cuentas-por-cobrar/desactivar/{id}', [CuentasPorCobrarController::class, 'desactivar']);
    Route::get('/cuentas-por-cobrar/estado-cuenta/pdf', [CuentasPorCobrarController::class, 'generarEstadoCuentaPDF']);
    // Estado de cuenta con cuentas por cobrar + recibos relacionados
    Route::get('/cuentas-por-cobrar/estado-cuenta-con-recibos/pdf', [CuentasPorCobrarController::class, 'generarEstadoCuentaConRecibosPDF']);
    Route::get('/cuentas-por-cobrar/saldos/pdf', [CuentasPorCobrarController::class, 'generarSaldosClientePDF']);
});

//RECIBOS
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('/recibos', AdmRecibosController::class);
    Route::get('/recibos/{id}/pdf', [AdmRecibosController::class, 'generarPdf']);
    Route::get('/recibos-reporte/pdf', [AdmRecibosController::class, 'generarReportePdf']);
    Route::put('/recibos/desactivar/{id}', [AdmRecibosController::class, 'desactivar']);
});

Route::get('/fecha-servidor', function () {
    return response()->json(['fecha' => now()->format('Y-m-d')]);
});

//REPORTES CONTABILIDAD
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/reportes-contabilidad/cotizaciones', [ReportesContabilidadController::class, 'cotizacionesPorFiltro']);
    Route::get('/reportes-contabilidad/vendedores', [ReportesContabilidadController::class, 'vendedoresActivos']);
    Route::get('/reportes-contabilidad/export/excel', [ReportesContabilidadController::class, 'exportCotizacionesExcel']);
    Route::get('/reportes-contabilidad/export/pdf', [ReportesContabilidadController::class, 'exportCotizacionesPdf']);

    Route::get('/reportes-contabilidad/cartera', [ReportesContabilidadController::class, 'index']);
    Route::post('/reportes-contabilidad/cartera/html', [ReportesContabilidadController::class, 'html']);
    Route::get('/reportes-contabilidad/cartera/pdf',  [ReportesContabilidadController::class, 'pdf']);

    // Route::post('/reportes-contabilidad/cotizaciones/prefacturacion/pdf', [ReportesContabilidadController::class, 'cotizacionesPrefacturacionPdf'])->name('reportes.cotizaciones.prefacturacion.pdf');
    Route::post(
        '/reportes-contabilidad/cotizaciones/prefacturacion/data',
        [ReportesContabilidadController::class, 'cotizacionesPrefacturacionData']
    );
    // ▶️ Resumen de Facturas Pagadas
    Route::get('/reportes-contabilidad/resumen-facturas-pagadas/data', [ReportesContabilidadController::class, 'resumenFacturasPagadasData']);
    Route::get('/reportes-contabilidad/resumen-facturas-pagadas/pdf', [ReportesContabilidadController::class, 'resumenFacturasPagadasPdf']);
    Route::get('/reportes-contabilidad/resumen-facturas-pagadas-por-recibo/pdf', [ReportesContabilidadController::class, 'resumenFacturasPagadasPorReciboPdf']);


    Route::get('/reportes-contabilidad/cotizacionesventas', [ReportesContabilidadController::class, 'VentasPorVendedor']);
    Route::get('/reportes-contabilidad/export/excelventas', [ReportesContabilidadController::class, 'exportVentasVendedorExcel']);
    Route::get('/reportes-contabilidad/export/pdfventas', [ReportesContabilidadController::class, 'exportVentasVendedorPdf']);
});

//CLIENTES CONTACTO CONTROLLER
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/clientes-contacto/options', [ClienteContactoController::class, 'clientesOptions']);
    Route::get('/clientes-contacto/{idcliente}/contactos', [ClienteContactoController::class, 'show']);
    Route::post('/clientes-contacto/{idcliente}/contactos', [ClienteContactoController::class, 'storeOrUpdate']);
    Route::get('/departamentos/options', [ClienteContactoController::class, 'departamentosOptions']);
});

//REPORTES CXC
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/reporte/cxc', [ReportesCXCController::class, 'index']);              // JSON o PDF
    Route::get('/reporte/cxc/{idcuentaporcobrar}/detalles', [ReportesCXCController::class, 'detalles']); // detalles de una CxC    
});

//INFLE
Route::middleware('auth:sanctum')->group(function () {
    // 🔹 NUEVA RUTA INFILE
    Route::get('/infile/consulta-nit/{nit}', [InfileController::class, 'consultaNit']);
});

Route::middleware('auth:sanctum')->group(function () {

    Route::apiResource('/area_trabajo', AreaTrabajoController::class);
    Route::put('/area_trabajo/desactivar/{id}', [AreaTrabajoController::class, 'desactivar']);
    // Opcional para combos:
    Route::get('/lista_area_trabajo', [AreaTrabajoController::class, 'lista']);
});

Route::middleware('auth:sanctum')->group(function () {


    Route::post('/planificacion', [PlanificacionDetalleProduccionController::class, 'store']);
    Route::put('/planificacion/mover/{id}', [PlanificacionDetalleProduccionController::class, 'mover']);

    Route::get('/planificacion/tablero/{fecha}', [PlanificacionDetalleProduccionController::class, 'tableroPorFecha']);

    Route::post('/planificacion/asignar', [PlanificacionDetalleProduccionController::class, 'asignar']);
    Route::put('/planificacion/mover', [PlanificacionDetalleProduccionController::class, 'mover']);          // 🔥 industrial
    Route::put('/planificacion/reordenar', [PlanificacionDetalleProduccionController::class, 'reordenar']);  // 🔥 industrial

    Route::put('/planificacion/cambiar-estado', [PlanificacionDetalleProduccionController::class, 'cambiarEstado']);
    Route::get('/planificacion/pendientes/{fecha}', [PlanificacionDetalleProduccionController::class, 'detallesPendientes']);
    Route::get('/areas', [PlanificacionDetalleProduccionController::class, 'areas']);

    Route::get('/planificacion/pedidos/{fecha}', [PlanificacionDetalleProduccionController::class, 'pedidosPendientes']);
    Route::get('/planificacion/pedidos/{fecha}/{idpedido}', [PlanificacionDetalleProduccionController::class, 'detallesPendientesPorPedido']);
});

//MAQUINAS DE PEDIDO A PRODUCCIÓN
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/maquinasproduccion', [MaquinasProduccionController::class, 'index']);
    Route::post('/maquinasproduccion', [MaquinasProduccionController::class, 'store']);
    Route::put('/maquinasproduccion/{id}', [MaquinasProduccionController::class, 'update']);
    Route::delete('/maquinasproduccion/{id}', [MaquinasProduccionController::class, 'destroy']);
});
