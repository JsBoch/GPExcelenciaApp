import React from 'react';
import ReactDOM from 'react-dom/client';
import Login from './components/Login';
import Home from './components/Home'; // Crea un componente Home
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Empleado from './components/EmpleadoForm';
import ListaEmpleados from './components/ListaEmpleados';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/home" element={<Home />} />                
                <Route path="/empleados/crear" element={<Empleado />} />
                <Route path="/empleados/lista" element={<ListaEmpleados />} /> 
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);