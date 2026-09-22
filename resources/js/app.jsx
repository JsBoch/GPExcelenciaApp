import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* =========================================================
   COMPONENTES PRINCIPALES
========================================================= */

import Login from "./components/Login";
import Home from "./components/Home";
import Layout from "./components/Layout";

/* =========================================================
   EMPLEADOS
========================================================= */

import Empleado from "./components/EmpleadoForm";
import ListaEmpleados from "./components/ListaEmpleados";
import EditarEmpleado from "./components/EmpleadoForm";

/* =========================================================
   CLIENTES
========================================================= */

import Clientes from "./components/ClienteRegistro";
import ListaClientes from "./components/ListaClientes";
import EditarCliente from "./components/ClienteRegistro";

/* =========================================================
   CONTACTOS CLIENTE
========================================================= */

import ContactoCliente from "./components/ContactoClienteForm";
import ListaContactoCliente from "./components/ListaContactoCliente";
import EditarContactoCliente from "./components/ContactoClienteForm";

/* =========================================================
   COTIZACIONES
========================================================= */

import RegistroCotizacion from "./components/CotizacionForm";
import ListaCotizaciones from "./components/ListaCotizaciones";
import EditarCotizacion from "./components/CotizacionForm";

import ListaCotizacionesCosteo from "./components/ListaCotizacionesCoteo";
import CotizacionCosteo from "./components/CotizacionCosteo";

import ListaCotizacionesParaCosteo from "./components/ListaCotizacionesCosteo";
import ListaCotizacionesPreFacturacion from "./components/CotizacionesPreFacturacion";

import MonitorFacturacion from "./components/MonitorFacturacion";

/* =========================================================
   PRODUCTOS PREDEFINIDOS
========================================================= */

import RegistroProductoPredefinido from "./components/ProductoPredefinidoForm";
import ListaProductoPredefinido from "./components/ListaProductosPredefinidos";
import EditarProductoPredefinido from "./components/ProductoPredefinidoForm";

/* =========================================================
   PRODUCCIÓN
========================================================= */

import RegistroPedidoProduccion from "./components/PedidoProduccion";
import ListaPedidosProduccion from "./components/PedidoProduccionLista";
import EditarPedidoProduccion from "./components/PedidoProduccion";

import MonitorProduccion from "./components/MonitorProduccion.jsx";

import MaquinasProduccion from "./components/pedidosproduccion/maquinas/MaquinasProduccion";

/* =========================================================
   ÁREAS DE TRABAJO
========================================================= */

import AreaTrabajoForm from "./components/AreaTrabajoForm.jsx";
import ListaAreaTrabajo from "./components/ListaAreaTrabajo.jsx";

/* =========================================================
   LOGÍSTICA
========================================================= */

import AutorizacionALogistica from "./components/AutorizacionALogistica";
import LogisticaProduccionMonitor from "./components/LogisticaProduccionMonitor";

/* =========================================================
   RECIBOS
========================================================= */

import ReciboRegistro from "./components/ReciboRegistro";
import ReciboEditar from "./components/ReciboRegistro";
import ReciboConsulta from "./components/RecibosConsulta";

/* =========================================================
   CONTABILIDAD / REPORTES
========================================================= */

import CuentasPorCobrarFiltro from "./components/CuentasPorCobrarFiltro";

import ConsultaCotizacionesContabilidad from "./components/CotizacionesConsultaContabilidad";

import CarteraClientesContabilidad from "./components/reportes/contabilidad/ReporteCartera";

import VentasPrefacturacion from "./components/reportes/contabilidad/ReportePrefacturacion";

import ResumenFactuasPagadas from "./components/reportes/contabilidad/ResumenFacturasPagadas";

import ResumenVentasPorVendedor from "./components/reportes/contabilidad/ReporteVentasPorCliente";

import FacturasAnuladas from "./components/reportes/contabilidad/ReporteFacturasAnuladas.jsx";

import ReporteNotasAjuste from "./components/reportes/contabilidad/ReporteNotasAjuste.jsx";

import ReporteCuentasPorCobrar from "./components/reportes/contabilidad/ReporteCuentasPorCobrar.jsx";

import AutorizacionPedidosProduccion from "./components/AutorizacionPedidosProduccion";

/* =========================================================
   OTROS
========================================================= */

import ClienteContactosForm from "./components/ClienteContactosForm";

/* =========================================================
   CSS / BOOTSTRAP
========================================================= */

import "../css/generalesForm.css";
import "../css/gp-modules.css";

import "bootstrap/dist/js/bootstrap.bundle.min.js";

import ProgramacionLogisticaVentas from "./components/logistica-ventas/ProgramacionLogisticaVentas";
import CalendarioLogisticaVentas from "./components/logistica-ventas/CalendarioLogisticaVentas";
import LogisticaVentasRutas from "./components/logistica-ventas/LogisticaVentasRutas";

import LogisticaVentasPilotos from "./components/logistica-ventas/LogisticaVentasPilotos";

import LogisticaVentasVehiculos from "./components/logistica-ventas/LogisticaVentasVehiculos";

/* =========================================================
   APLICACIÓN
========================================================= */

function App() {
    /* =====================================================
       VERIFICAR AUTENTICACIÓN
    ===================================================== */

    const isAuthenticated = () => {
        const token = localStorage.getItem("token");

        return !!token;
    };

    /* =====================================================
       RUTA PROTEGIDA
    ===================================================== */

    const ProtectedRoute = ({ children }) => {
        if (!isAuthenticated()) {
            return <Navigate to="/" replace />;
        }

        return children;
    };

    /* =====================================================
       ROUTES
    ===================================================== */

    return (
        <BrowserRouter>
            <Routes>
                {/* =================================================
                    LOGIN
                ================================================= */}

                <Route path="/" element={<Login />} />

                {/* =================================================
                    TODA LA APLICACIÓN AUTENTICADA

                    Layout contiene:
                    - Sidebar
                    - Topbar
                    - Usuario
                    - Logout
                    - Permisos
                    - Outlet
                ================================================= */}

                <Route
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    {/* =============================================
                        HOME
                    ============================================= */}

                    <Route path="/home" element={<Home />} />

                    {/* =============================================
                        EMPLEADOS
                    ============================================= */}

                    <Route path="/empleados/crear" element={<Empleado />} />

                    <Route
                        path="/empleados/lista"
                        element={<ListaEmpleados />}
                    />

                    <Route
                        path="/empleados/editar/:id"
                        element={<EditarEmpleado />}
                    />

                    {/* =============================================
                        CLIENTES
                    ============================================= */}

                    <Route path="/clientes/crear" element={<Clientes />} />

                    <Route path="/clientes/lista" element={<ListaClientes />} />

                    <Route
                        path="/clientes/editar/:id"
                        element={<EditarCliente />}
                    />

                    <Route
                        path="/clientes/datos"
                        element={<ClienteContactosForm />}
                    />

                    {/* =============================================
                        CONTACTOS CLIENTE
                    ============================================= */}

                    <Route
                        path="/contacto_cliente/crear"
                        element={<ContactoCliente />}
                    />

                    <Route
                        path="/contacto_cliente/lista"
                        element={<ListaContactoCliente />}
                    />

                    <Route
                        path="/contacto_cliente/editar/:id"
                        element={<EditarContactoCliente />}
                    />

                    {/* =============================================
                        COTIZACIONES
                    ============================================= */}

                    <Route
                        path="/cotizaciones/crear"
                        element={<RegistroCotizacion />}
                    />

                    <Route
                        path="/cotizaciones/lista"
                        element={<ListaCotizaciones />}
                    />

                    <Route
                        path="/cotizaciones/editar/:id"
                        element={<EditarCotizacion />}
                    />

                    {/* =============================================
                        COSTEO COTIZACIONES
                    ============================================= */}

                    <Route
                        path="/costeocotizaciones/lista"
                        element={<ListaCotizacionesCosteo />}
                    />

                    <Route
                        path="/costeocotizaciones/costeo/:id"
                        element={<CotizacionCosteo />}
                    />

                    <Route
                        path="/cotizacionescosteo/lista"
                        element={<ListaCotizacionesParaCosteo />}
                    />

                    {/* =============================================
                        PRE-FACTURACIÓN / FACTURACIÓN
                    ============================================= */}

                    <Route
                        path="/cotizacionesprefacturacion/lista"
                        element={<ListaCotizacionesPreFacturacion />}
                    />

                    <Route
                        path="/monitorfacturacion/lista"
                        element={<MonitorFacturacion />}
                    />

                    {/* =============================================
                        PRODUCTOS PREDEFINIDOS
                    ============================================= */}

                    <Route
                        path="/productospredefinidos/crear"
                        element={<RegistroProductoPredefinido />}
                    />

                    <Route
                        path="/productospredefinidos/lista"
                        element={<ListaProductoPredefinido />}
                    />

                    <Route
                        path="/productospredefinidos/editar/:id"
                        element={<EditarProductoPredefinido />}
                    />

                    {/* =============================================
                        PEDIDOS DE PRODUCCIÓN
                    ============================================= */}

                    <Route
                        path="/pedidosproduccion/crear"
                        element={<RegistroPedidoProduccion />}
                    />

                    <Route
                        path="/pedidosproduccion/lista"
                        element={<ListaPedidosProduccion />}
                    />

                    <Route
                        path="/pedidosproduccion/editar/:id"
                        element={<EditarPedidoProduccion />}
                    />

                    {/* =============================================
                        MONITOR PRODUCCIÓN
                    ============================================= */}

                    <Route
                        path="/monitor_produccion"
                        element={<MonitorProduccion />}
                    />

                    <Route
                        path="/maquinas_produccion"
                        element={<MaquinasProduccion />}
                    />

                    {/* =============================================
                        ÁREAS DE TRABAJO
                    ============================================= */}

                    <Route
                        path="/area_trabajo/nuevo"
                        element={<AreaTrabajoForm />}
                    />

                    <Route
                        path="/area_trabajo/editar/:id"
                        element={<AreaTrabajoForm />}
                    />

                    <Route
                        path="/area_trabajo/lista"
                        element={<ListaAreaTrabajo />}
                    />

                    {/* =============================================
                        LOGÍSTICA
                    ============================================= */}

                    <Route
                        path="/autorizacion_logistica/lista"
                        element={<AutorizacionALogistica />}
                    />

                    <Route
                        path="/logistica_produccion/monitor"
                        element={<LogisticaProduccionMonitor />}
                    />

                    {/* =============================================
                        RECIBOS
                    ============================================= */}

                    <Route path="/recibos/crear" element={<ReciboRegistro />} />

                    <Route
                        path="/recibos/editar/:id"
                        element={<ReciboEditar />}
                    />

                    <Route path="/recibos/lista" element={<ReciboConsulta />} />

                    {/* =============================================
                        CUENTAS POR COBRAR
                    ============================================= */}

                    <Route
                        path="/cuentas-por-cobrar/lista"
                        element={<CuentasPorCobrarFiltro />}
                    />

                    {/* =============================================
                            AUTORIZACIÓN PEDIDOS - CONTABILIDAD
                        ============================================= */}

                    <Route
                        path="/pedidosproduccion/autorizacion-contabilidad"
                        element={<AutorizacionPedidosProduccion />}
                    />

                    {/* =============================================
                        REPORTES CONTABILIDAD
                    ============================================= */}

                    <Route
                        path="/reportes/contabilidad/cotizaciones"
                        element={<ConsultaCotizacionesContabilidad />}
                    />

                    <Route
                        path="/reportes/contabilidad/cartera"
                        element={<CarteraClientesContabilidad />}
                    />

                    <Route
                        path="/reportes/contabilidad/prefacturacion"
                        element={<VentasPrefacturacion />}
                    />

                    <Route
                        path="/reportes/contabilidad/facturas-pagadas"
                        element={<ResumenFactuasPagadas />}
                    />

                    <Route
                        path="/reportes/contabilidad/ventas-vendedor"
                        element={<ResumenVentasPorVendedor />}
                    />

                    <Route
                        path="/reportes/contabilidad/facturas-anuladas"
                        element={<FacturasAnuladas />}
                    />

                    <Route
                        path="/reportes/contabilidad/notas-ajuste"
                        element={<ReporteNotasAjuste />}
                    />

                    <Route
                        path="/reportes/contabilidad/cuentas-por-cobrar"
                        element={<ReporteCuentasPorCobrar />}
                    />

                    {/* =================================================
                    LOGISTICA DE VENTAS
                ================================================= */}

                    <Route
                        path="/logistica-ventas/programacion"
                        element={<ProgramacionLogisticaVentas />}
                    />

                    <Route
                        path="/logistica-ventas/calendario"
                        element={<CalendarioLogisticaVentas />}
                    />

                    <Route
                        path="/logistica-ventas/rutas"
                        element={<LogisticaVentasRutas />}
                    />
                    <Route
                        path="/logistica-ventas/pilotos"
                        element={<LogisticaVentasPilotos />}
                    />

                    <Route
                        path="/logistica-ventas/vehiculos"
                        element={<LogisticaVentasVehiculos />}
                    />
                </Route>

                {/* =================================================
                    RUTA NO ENCONTRADA
                ================================================= */}

                <Route
                    path="*"
                    element={
                        isAuthenticated() ? (
                            <Navigate to="/home" replace />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

/* =========================================================
   RENDER
========================================================= */

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
