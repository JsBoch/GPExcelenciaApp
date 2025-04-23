import React from 'react';
import ReactDOM from 'react-dom/client';
import Login from './components/Login';
import Home from './components/Home'; // Crea un componente Home
import { BrowserRouter, Routes, Route,Navigate } from 'react-router-dom';
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