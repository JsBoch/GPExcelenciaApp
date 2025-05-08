// resources/js/components/Header.jsx
/**
 * Este componente es el encabezado de la aplicación.
 * Se encarga de mostrar el título y el estilo del encabezado.
 */
import React from 'react';
import PropTypes from 'prop-types'; // Importa PropTypes para la validación de props
import { Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa'; // Importa el icono de inicio

function Header({title}) {
    return (
        <div style={{
            width: '100%',
            backgroundColor: 'rgb(39, 50, 56)',
            color: 'white',
            padding: '1rem',
            fontSize: '1.25rem',
            fontWeight: 'bold',
            display: 'flex', // Para alinear elementos
            justifyContent: 'space-between', // Espacio entre título e inicio
            alignItems: 'center', // Centrar verticalmente
        }}>
            <span>{title}</span> {/* Envuelve el título en un span para el espacio */}
            <Link to="/Home" style={{ color: 'white', textDecoration: 'none' }}>
                <button style={{
                    backgroundColor: 'transparent',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '1rem',
                }}
                aria-label="Ir a la página de inicio"
                >
                    <FaHome /> Inicio
                </button>
            </Link>
        </div>
    );
}

Header.propTypes = {
    title: PropTypes.string.isRequired, // Define que la prop 'title' es obligatoria y de tipo string
};
export default Header;
