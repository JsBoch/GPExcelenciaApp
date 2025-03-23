// resources/js/components/Home.js
import React, { useState } from 'react';
import SlideMenu from './SlideMenu';
import './Home.css'; // Importa los estilos de tu Home.css
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Home() {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleStateChange = (state) => {
        setMenuOpen(state.isOpen);
    };

    const closeMenu = () => {
        setMenuOpen(false);
    };

    const navigate = useNavigate();

    const logout = async () => {
        try {
            await axios.post('/api/logout', {}, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            localStorage.removeItem('token');
            navigate('/'); // Redirige al usuario a la página de inicio de sesión
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    return (
        <div className="home-container">
            <SlideMenu isOpen={menuOpen} onStateChange={handleStateChange} logout={logout} />            
            <div className="content">
                <h1>Página de Inicio</h1>
                <p>¡Bienvenido!</p>
                {/* El contenido principal de tu página Home */}
            </div>
        </div>
    );
}

export default Home;