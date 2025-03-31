// resources/js/components/Home.jsx
import React, { useState, useEffect } from 'react';
import SlideMenu from './SlideMenu';
import './Home.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Home() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Estado de carga
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get('/api/user', {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                setUser(res.data);
                setLoading(false); // Carga completada                
            } catch (error) {
                console.error('Error al obtener el usuario:', error);
                setLoading(false); // Carga completada (con error)
            }
        };

        fetchUser();
    }, []);

    const handleStateChange = (state) => {
        setMenuOpen(state.isOpen);
    };

    const logout = async () => {
        try {
            await axios.post('/api/logout', {}, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            localStorage.removeItem('token');
            navigate('/');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    const getFilteredLinks = () => {
        if (!user || !user.perfiles) {
            console.log('Usuario o perfiles no definidos:', user);
            return [];
        }

        let links = [];

        user.perfiles.forEach((perfil) => {
            perfil.opciones.forEach((opcion) => {
                if (opcion.nombre === 'Registro empleados') {
                    links.push({ to: '/empleados/crear', text: 'Crear Empleado' });
                } else if (opcion.nombre === 'Consulta empleados') {
                    links.push({ to: '/empleados/lista', text: 'Consultar Empleados' });
                }else if (opcion.nombre === 'Registro clientes') {
                    links.push({ to: '/clientes/crear', text: 'Registrar cliente' });
                }
                // Agrega más opciones según tus permisos
            });
        });
        return links;
    };

    if (loading) {
        return <div>Cargando...</div>; // Muestra un indicador de carga
    }

    return (
        <div className="home-container">
            <SlideMenu
                isOpen={menuOpen}
                onStateChange={handleStateChange}
                logout={logout}
                links={getFilteredLinks()}
            />
            <div className="content">
                <h1>Página de Inicio</h1>
                <p>¡Bienvenido!</p>
            </div>
        </div>
    );
}

export default Home;