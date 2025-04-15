// resources/js/components/Home.jsx
import React, { useState, useEffect } from 'react';
import SlideMenu from './SlideMenu';
import './Home.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.min.css';
import 'alertifyjs/build/css/themes/default.min.css';

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
                //console.error('Error al obtener el usuario:', error);
                alertify.error("Error al obtener el usuario");
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
            //console.error('Error al cerrar sesión:', error);
            alertify.error("Error al cerrar sesión");
        }
    };

    const getFilteredLinks = () => {
        if (!user || !user.perfiles) {
            //console.log('Usuario o perfiles no definidos:', user);
            alertify.error("Usuario o perfiles no definidos");
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
                } else if (opcion.nombre === 'Consulta clientes') {
                    links.push({ to: '/clientes/lista', text: 'Consultar Clientes' });
                }else if (opcion.nombre === 'Contacto cliente') {
                    links.push({ to: '/contacto_cliente/crear', text: 'Registrar contacto cliente' });
                } else if (opcion.nombre === 'Consulta contacto cliente') {
                    links.push({ to: '/contacto_cliente/lista', text: 'Consultar contactos cliente' });
                }else if (opcion.nombre === 'Cotizaciones') {
                    links.push({ to: '/cotizaciones/crear', text: 'Registrar cotización' });
                } else if (opcion.nombre === 'Consulta cotizaciones') {
                    links.push({ to: '/cotizaciones/lista', text: 'Consultar cotizaciones' });
                }else if (opcion.nombre === 'Consulta cotizaciones costeo') {
                    links.push({ to: '/costeocotizaciones/lista', text: 'Consultar cotizaciones para Costeo' });
                }else if (opcion.nombre === 'Productos Predefinidos') {
                    links.push({ to: '/productospredefinidos/crear', text: 'Productos Predefinidos' });
                }else if (opcion.nombre === 'Consulta productos predefinidos') {
                    links.push({ to: '/productospredefinidos/lista', text: 'Consultar productos predefinidos' });
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
                <p>¡Sistema GP Excelencia!</p>
            </div>
        </div>
    );
}

export default Home;