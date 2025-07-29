import React from 'react';
import ReactDOM from 'react-dom/client';
import Login from './components/Login';
import Home from './components/Home'; // Crea un componente Home
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Empleado from './components/EmpleadoForm';
import ListaEmpleados from './components/ListaEmpleados';
import EditarEmpleado from './components/EmpleadoForm'; // Importa el componente EditarEmpleado
import Clientes from './components/ClienteRegistro';
import ListaClientes from './components/ListaClientes';
import EditarCliente from './components/ClienteRegistro'; // Importa el componente EditarCliente
import ContactoCliente from './components/ContactoClienteForm';
import ListaContactoCliente from './components/ListaContactoCliente';
import EditarContactoCliente from './components/ContactoClienteForm'; // Importa el componente EditarContactoCliente
import RegistroCotizacion from './components/CotizacionForm';
import ListaCotizaciones from './components/ListaCotizaciones';
import EditarCotizacion from './components/CotizacionForm';
import ListaCotizacionesCosteo from './components/ListaCotizacionesCoteo';
import CotizacionCosteo from './components/CotizacionCosteo';
import RegistroProductoPredefinido from './components/ProductoPredefinidoForm';
import ListaProductoPredefinido from './components/ListaProductosPredefinidos';
import EditarProductoPredefinido from './components/ProductoPredefinidoForm';
import MonitorFacturacion from './components/MonitorFacturacion';
import ListaCotizacionesParaCosteo from './components/ListaCotizacionesCosteo';
import ListaCotizacionesPreFacturacion from './components/CotizacionesPreFacturacion'; 
import RegistroPedidoProduccion from './components/PedidoProduccion'; 
import ListaPedidosProduccion from './components/PedidoProduccionLista'; 
import EditarPedidoProduccion from './components/PedidoProduccion';
import CuentasPorCobrarFiltro from './components/CuentasPorCobrarFiltro'; 
import ReciboRegistro from './components/ReciboRegistro';
import ReciboEditar from './components/ReciboRegistro';
import ReciboConsulta from './components/RecibosConsulta';
// Si necesitas un layout común, puedes importar un componente de layout aquí
import Layout from './components/Layout'; // Nuevo layout
//import Header from './components/Header'; // Por si acaso
import '../css/generalesForm.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function App() {
    // Función para verificar si el usuario está autenticado
    const isAuthenticated = () => {
        const token = localStorage.getItem('token');
        return !!token; // Devuelve true si hay un token, false si no
    };

    // Componente para proteger rutas
    const ProtectedRoute = ({ children }) => {
        if (!isAuthenticated()) {
            return <Navigate to="/" />; // Redirige a /login si no está autenticado
        }
        return children;
    };
    
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                {/* <Route element={<Layout />}> */}
                    <Route path="/empleados/crear" element={<ProtectedRoute><Empleado /></ProtectedRoute>} />
                    <Route path="/empleados/lista" element={<ProtectedRoute><ListaEmpleados /></ProtectedRoute>} />
                    <Route path="/empleados/editar/:id" element={<ProtectedRoute><EditarEmpleado /></ProtectedRoute>} /> {/* Agrega esta ruta */}
                    <Route path="/clientes/crear" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
                    <Route path="/clientes/lista" element={<ProtectedRoute><ListaClientes /></ProtectedRoute>} />
                    <Route path="/clientes/editar/:id" element={<ProtectedRoute><EditarCliente /></ProtectedRoute>} /> {/* Agrega esta ruta */}
                    <Route path="/contacto_cliente/crear" element={<ProtectedRoute><ContactoCliente /></ProtectedRoute>} />
                    <Route path="/contacto_cliente/lista" element={<ProtectedRoute><ListaContactoCliente /></ProtectedRoute>} />
                    <Route path="/contacto_cliente/editar/:id" element={<ProtectedRoute><EditarContactoCliente /></ProtectedRoute>} /> Agrega esta ruta
                    <Route path="/cotizaciones/crear" element={<ProtectedRoute><RegistroCotizacion /></ProtectedRoute>} />
                    <Route path="/cotizaciones/lista" element={<ProtectedRoute><ListaCotizaciones /></ProtectedRoute>} />
                    <Route path="/cotizaciones/editar/:id" element={<ProtectedRoute><EditarCotizacion /></ProtectedRoute>} /> Agrega esta ruta
                    <Route path="/costeocotizaciones/lista" element={<ProtectedRoute><ListaCotizacionesCosteo /></ProtectedRoute>} />
                    <Route path="/costeocotizaciones/costeo/:id" element={<ProtectedRoute><CotizacionCosteo /></ProtectedRoute>} />
                    <Route path="/productospredefinidos/crear" element={<ProtectedRoute><RegistroProductoPredefinido /></ProtectedRoute>} />
                    <Route path="/productospredefinidos/lista" element={<ProtectedRoute><ListaProductoPredefinido /></ProtectedRoute>} />
                    <Route path="/productospredefinidos/editar/:id" element={<ProtectedRoute><EditarProductoPredefinido /></ProtectedRoute>} />
                    <Route path="/monitorfacturacion/lista" element={<ProtectedRoute><MonitorFacturacion /></ProtectedRoute>} />
                    <Route path="/cotizacionescosteo/lista" element={<ProtectedRoute><ListaCotizacionesParaCosteo /></ProtectedRoute>} />
                    <Route path="/cotizacionesprefacturacion/lista" element={<ProtectedRoute><ListaCotizacionesPreFacturacion /></ProtectedRoute>} />
                    <Route path="/pedidosproduccion/crear" element={<ProtectedRoute><RegistroPedidoProduccion /></ProtectedRoute>} />
                    <Route path="/pedidosproduccion/lista" element={<ProtectedRoute><ListaPedidosProduccion /></ProtectedRoute>} />
                    <Route path="/pedidosproduccion/editar/:id" element={<ProtectedRoute><EditarPedidoProduccion /></ProtectedRoute>} /> {/* Agrega esta ruta */}
                    <Route path="/cuentas-por-cobrar/lista" element={<ProtectedRoute><CuentasPorCobrarFiltro /></ProtectedRoute>} />
                    <Route path="/recibos/crear" element={<ProtectedRoute><ReciboRegistro /></ProtectedRoute>} />
                    <Route path="/recibos/editar/:id" element={<ProtectedRoute><ReciboEditar /></ProtectedRoute>} />
                    <Route path="/recibos/lista" element={<ProtectedRoute><ReciboConsulta /></ProtectedRoute>} />
                {/* </Route> */}
            </Routes>
        </BrowserRouter>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);