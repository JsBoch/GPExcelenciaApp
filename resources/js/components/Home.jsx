// resources/js/components/Home.js
import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
    return (
        <div>
            <h1>Página de Inicio</h1>
            <p>¡Bienvenido!</p>
            {/* lo que manda en estas rutas React Router es el método de hacer la llamada
            GET, POST, etc. para vincularlo con las rutas generadas automáticamente en la api de rutas de
            Laravel. */}
            <Link to="/empleados/crear" style={{ textDecoration: 'none', padding: '10px', backgroundColor: '#007bff', color: 'white', borderRadius: '5px' }}>
                Crear Empleado
            </Link>
            <Link to="/empleados/lista" style={{ textDecoration: 'none', padding: '10px', backgroundColor: '#007bff', color: 'white', borderRadius: '5px' }}>
                Consultar Empleados
            </Link>
        </div>
    );
}

export default Home;