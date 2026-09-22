import React from "react";

import {
    FiFileText,
    FiUsers,
    FiBox,
    FiTruck,
    FiBarChart2,
    FiDollarSign,
    FiClipboard,
    FiLayers,
    FiUser,
} from "react-icons/fi";

/* =========================================================
   CONFIGURACIÓN DE OPCIONES
========================================================= */

export const OPTION_CONFIG = {
    /* EMPLEADOS */

    "Registro empleados": {
        section: "Administración",
        group: "Empleados",
        to: "/empleados/crear",
        text: "Crear empleado",
        icon: <FiUser />,
    },

    "Consulta empleados": {
        section: "Administración",
        group: "Empleados",
        to: "/empleados/lista",
        text: "Consultar empleados",
        icon: <FiUsers />,
    },

    /* CLIENTES */

    "Registro clientes": {
        section: "Comercial",
        group: "Clientes",
        to: "/clientes/crear",
        text: "Crear cliente",
        icon: <FiUsers />,
    },

    "Consulta clientes": {
        section: "Comercial",
        group: "Clientes",
        to: "/clientes/lista",
        text: "Consultar clientes",
        icon: <FiUsers />,
    },

    "Registro contacto_cliente": {
        section: "Comercial",
        group: "Clientes",
        to: "/contacto_cliente/crear",
        text: "Crear contacto",
        icon: <FiUser />,
    },

    "Consulta contacto_cliente": {
        section: "Comercial",
        group: "Clientes",
        to: "/contacto_cliente/lista",
        text: "Consultar contactos",
        icon: <FiUsers />,
    },

    "Contactos clientes": {
        section: "Comercial",
        group: "Clientes",
        to: "/clientes/datos",
        text: "Información de contacto",
        icon: <FiUsers />,
    },

    /* COTIZACIONES */

    "Registro cotizaciones": {
        section: "Comercial",
        group: "Cotizaciones",
        to: "/cotizaciones/crear",
        text: "Nueva cotización",
        icon: <FiFileText />,
    },

    "Consulta cotizaciones": {
        section: "Comercial",
        group: "Cotizaciones",
        to: "/cotizaciones/lista",
        text: "Consultar cotizaciones",
        icon: <FiClipboard />,
    },

    "Consulta cotizaciones_costeo": {
        section: "Comercial",
        group: "Cotizaciones",
        to: "/costeocotizaciones/lista",
        text: "Cotizaciones para costeo",
        icon: <FiDollarSign />,
    },

    "Consulta Cotizaciones_en_costeo": {
        section: "Comercial",
        group: "Cotizaciones",
        to: "/cotizacionescosteo/lista",
        text: "Cotizaciones en costeo",
        icon: <FiDollarSign />,
    },

    /* PRODUCTOS */

    "Registro productos_predefinidos": {
        section: "Comercial",
        group: "Productos",
        to: "/productospredefinidos/crear",
        text: "Crear producto predefinido",
        icon: <FiBox />,
    },

    "Consulta productos_predefinidos": {
        section: "Comercial",
        group: "Productos",
        to: "/productospredefinidos/lista",
        text: "Consultar productos",
        icon: <FiBox />,
    },

    /* FACTURACIÓN */

    "Consulta Monitor_de_Cotizaciones": {
        section: "Comercial",
        group: "Facturación",
        to: "/monitorfacturacion/lista",
        text: "Cotizaciones para facturar",
        icon: <FiFileText />,
    },

    "Consulta Pre-Facturación": {
        section: "Comercial",
        group: "Facturación",
        to: "/cotizacionesprefacturacion/lista",
        text: "Pre-Facturación",
        icon: <FiFileText />,
    },

    /* PRODUCCIÓN */

    "Registro Pedidos-Producción": {
        section: "Producción",
        group: "Pedidos",
        to: "/pedidosproduccion/crear",
        text: "Nuevo pedido de producción",
        icon: <FiClipboard />,
    },

    "Consulta Pedidos-Producción": {
        section: "Producción",
        group: "Pedidos",
        to: "/pedidosproduccion/lista",
        text: "Consultar pedidos",
        icon: <FiClipboard />,
    },

    "Registro monitor_produccion": {
        section: "Producción",
        group: "Producción",
        to: "/monitor_produccion",
        text: "Monitor de producción",
        icon: <FiBarChart2 />,
    },

    "Registro maquinas_produccion": {
        section: "Producción",
        group: "Producción",
        to: "/maquinas_produccion",
        text: "Máquinas de producción",
        icon: <FiBox />,
    },

    "Registro areas": {
        section: "Producción",
        group: "Configuración",
        to: "/area_trabajo/nuevo",
        text: "Crear área",
        icon: <FiLayers />,
    },

    "Consulta areas": {
        section: "Producción",
        group: "Configuración",
        to: "/area_trabajo/lista",
        text: "Consultar áreas",
        icon: <FiLayers />,
    },

    /* LOGÍSTICA */
    "Logistica Ventas Pilotos": {
        section: "Logística",
        group: "Logística Ventas",
        to: "/logistica-ventas/pilotos",
        text: "Pilotos",
        icon: <FiUsers />,
    },

    "Logistica Ventas Vehiculos": {
        section: "Logística",
        group: "Logística Ventas",
        to: "/logistica-ventas/vehiculos",
        text: "Vehículos",
        icon: <FiTruck />,
    },

    "Logistica Ventas Rutas": {
        section: "Logística",
        group: "Logística Ventas",
        to: "/logistica-ventas/rutas",
        text: "Rutas",
        icon: <FiTruck />,
    },

    "Logistica Ventas Calendario": {
        section: "Logística",
        group: "Logística Ventas",
        to: "/logistica-ventas/calendario",
        text: "Calendario de entregas",
        icon: <FiBarChart2 />,
    },

    "Logistica Ventas Programacion": {
        section: "Logística",
        group: "Logística Ventas",
        to: "/logistica-ventas/programacion",
        text: "Programar pedidos",
        icon: <FiClipboard />,
    },

    "Autorizacion Monitor_de_Cotizaciones": {
        section: "Logística",
        group: "Logística",
        to: "/autorizacion_logistica/lista",
        text: "Autorización de pedidos",
        icon: <FiTruck />,
    },

    "Logistica Monitor_logistica": {
        section: "Logística",
        group: "Logística",
        to: "/logistica_produccion/monitor",
        text: "Monitor de logística",
        icon: <FiTruck />,
    },

    /* RECIBOS */

    "Registro Recibos": {
        section: "Administración",
        group: "Recibos",
        to: "/recibos/crear",
        text: "Registrar recibo",
        icon: <FiDollarSign />,
    },

    "Consulta Recibos": {
        section: "Administración",
        group: "Recibos",
        to: "/recibos/lista",
        text: "Consultar recibos",
        icon: <FiDollarSign />,
    },

    /* CONTABILIDAD */

    "Autorización pedidos producción": {
        section: "Administración",
        group: "Contabilidad",
        to: "/pedidosproduccion/autorizacion-contabilidad",
        text: "Autorización de pedidos",
        icon: <FiClipboard />,
    },

    "Consulta Reportes-Contabilidad": {
        section: "Administración",
        group: "Contabilidad",
        to: "/cuentas-por-cobrar/lista",
        text: "Estado de cuenta",
        icon: <FiBarChart2 />,
    },

    "Cotizaciones Reportes-Contabilidad": {
        section: "Administración",
        group: "Contabilidad",
        to: "/reportes/contabilidad/cotizaciones",
        text: "Reporte de cotizaciones",
        icon: <FiBarChart2 />,
    },

    "Cartera Reportes-Contabilidad": {
        section: "Administración",
        group: "Contabilidad",
        to: "/reportes/contabilidad/cartera",
        text: "Cartera de clientes",
        icon: <FiBarChart2 />,
    },

    "Ventas Reportes-Contabilidad": {
        section: "Administración",
        group: "Contabilidad",
        to: "/reportes/contabilidad/prefacturacion",
        text: "Ventas de prefacturación",
        icon: <FiBarChart2 />,
    },

    "Facturas Reportes-Contabilidad": {
        section: "Administración",
        group: "Contabilidad",
        to: "/reportes/contabilidad/facturas-pagadas",
        text: "Facturas pagadas",
        icon: <FiDollarSign />,
    },

    "VentasVendedor Reportes-Contabilidad": {
        section: "Administración",
        group: "Contabilidad",
        to: "/reportes/contabilidad/ventas-vendedor",
        text: "Ventas por vendedor",
        icon: <FiBarChart2 />,
    },

    "Anuladas Reportes-Contabilidad": {
        section: "Administración",
        group: "Contabilidad",
        to: "/reportes/contabilidad/facturas-anuladas",
        text: "Facturas anuladas",
        icon: <FiFileText />,
    },

    "NotasAjuste Reportes-Contabilidad": {
        section: "Administración",
        group: "Contabilidad",
        to: "/reportes/contabilidad/notas-ajuste",
        text: "Notas de ajuste",
        icon: <FiFileText />,
    },

    "CXC Reportes-Contabilidad": {
        section: "Administración",
        group: "Contabilidad",
        to: "/reportes/contabilidad/cuentas-por-cobrar",
        text: "Cuentas por cobrar",
        icon: <FiDollarSign />,
    },
};

export const GROUP_ICONS = {
    Clientes: <FiUsers />,
    Cotizaciones: <FiFileText />,
    Productos: <FiBox />,
    Facturación: <FiFileText />,
    Pedidos: <FiClipboard />,
    Producción: <FiBox />,
    Configuración: <FiLayers />,
    Logística: <FiTruck />,
    Empleados: <FiUsers />,
    Recibos: <FiDollarSign />,
    Contabilidad: <FiBarChart2 />,
};

export const MENU_ORDER = [
    "Comercial",
    "Producción",
    "Logística",
    "Administración",
];

export const PREFERRED_QUICK_ACTIONS = [
    "/cotizaciones/crear",
    "/clientes/crear",
    "/cotizaciones/lista",
    "/pedidosproduccion/crear",
    "/monitor_produccion",
    "/reportes/contabilidad/cartera",
];
