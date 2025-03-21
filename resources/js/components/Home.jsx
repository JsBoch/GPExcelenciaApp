// resources/js/components/Home.js
import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
    return (
        <div>
            <h1>Página de Inicio</h1>
            <p>¡Bienvenido!</p>
            <Link to="/empleados" style={{ textDecoration: 'none', padding: '10px', backgroundColor: '#007bff', color: 'white', borderRadius: '5px' }}>
    Crear Empleado
</Link>
        </div>
    );
}

export default Home;