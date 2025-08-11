// resources/js/components/Home.jsx
import React, { useState, useEffect } from 'react';
import SlideMenu from './SlideMenu';
import './Home.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.min.css';
import 'alertifyjs/build/css/themes/default.min.css';
import { FiUsers, FiUserPlus, FiSearch, FiFileText, FiBox } from 'react-icons/fi';

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

    const getStructuredLinks = () => {
        if (!user || !user.perfiles) {
            alertify.error("Usuario o perfiles no definidos");
            return [];
        }

        const menuStructure = [];
        const opcionesPorTipo = {};

        user.perfiles.forEach((perfil) => {
            perfil.opciones.forEach((opcion) => {
                const partes = opcion.nombre.split(' ');
                //console.log('partes', partes);
                if (partes.length >= 2) {
                    //const tipo = partes[1].slice(0, -1).toLowerCase(); // "empleados" -> "empleado"
                    const tipo = partes[1].toLowerCase(); // "empleados" -> "empleado"
                    const accion = partes[0].toLowerCase();

                    if (!opcionesPorTipo[tipo]) {
                        opcionesPorTipo[tipo] = [];
                    }
                    opcionesPorTipo[tipo].push({ nombre: opcion.nombre, accion: accion });
                } else {
                    // Manejar opciones que no siguen el patrón "Acción Tipo" si es necesario
                    //console.warn(`Opción no reconocida: ${opcion.nombre}`);
                }
            });
        });

        for (const tipo in opcionesPorTipo) {
            const submenus = [];
            //console.log('opcionesPorTipo', opcionesPorTipo);
            opcionesPorTipo[tipo].forEach(opcion => {
                let to = '';
                let text = '';
                let icon = null;

                if (opcion.nombre === 'Registro empleados' && opcion.accion === 'registro') {
                    to = `/empleados/crear`;
                    text = 'Crear Empleado';
                    icon = <FiUserPlus />;
                } else if (opcion.nombre === 'Consulta empleados' && opcion.accion === 'consulta') {
                    to = `/empleados/lista`;
                    text = 'Consultar empleados';
                    icon = <FiSearch />;
                } else if (opcion.nombre === 'Registro clientes' && opcion.accion === 'registro') {
                    to = `/clientes/crear`;
                    text = 'Crear Cliente';
                    icon = <FiUserPlus />;
                } else if (opcion.nombre === 'Consulta clientes' && opcion.accion === 'consulta') {
                    to = `/clientes/lista`;
                    text = 'Consultar clientes';
                    icon = <FiSearch />;
                } else if (opcion.nombre === 'Registro contacto_cliente' && opcion.accion === 'registro') {
                    to = `/contacto_cliente/crear`;
                    text = 'Crear contacto';
                    icon = <FiUserPlus />;
                } else if (opcion.nombre === 'Consulta contacto_cliente' && opcion.accion === 'consulta') {
                    to = `/contacto_cliente/lista`;
                    text = 'Consultar contactos';
                    icon = <FiSearch />;
                } else if (opcion.nombre === 'Registro cotizaciones' && opcion.accion === 'registro') {
                    to = `/cotizaciones/crear`;
                    text = 'Crear cotización';
                    icon = <FiFileText />;
                } else if (opcion.nombre === 'Consulta cotizaciones' && opcion.accion === 'consulta') {
                    to = `/cotizaciones/lista`;
                    text = 'Consultar cotizaciones';
                    icon = <FiSearch />;
                } else if (opcion.nombre === 'Consulta cotizaciones_costeo' && opcion.accion === 'consulta') {
                    to = `/costeocotizaciones/lista`;
                    text = 'Consultar cotizaciones para costeo';
                    icon = <FiSearch />;
                } else if (opcion.nombre === 'Registro productos_predefinidos' && opcion.accion === 'registro') {
                    to = `/productospredefinidos/crear`;
                    text = 'Crear producto predefinido';
                    icon = <FiBox />;
                } else if (opcion.nombre === 'Consulta productos_predefinidos' && opcion.accion === 'consulta') {
                    to = `/productospredefinidos/lista`;
                    text = 'Consultar productos predefinidos';
                    icon = <FiSearch />;
                } else if (opcion.nombre === 'Consulta Monitor_de_Cotizaciones' && opcion.accion === 'consulta') {
                    to = `/monitorfacturacion/lista`;
                    text = 'Cotizaciones para facturar';
                    icon = <FiSearch />;
                } else if (opcion.nombre === 'Consulta Cotizaciones_en_costeo' && opcion.accion === 'consulta') {
                    to = `/cotizacionescosteo/lista`;
                    text = 'Consulta de cotizaciones gerencia';
                    icon = <FiSearch />;
                }else if (opcion.nombre === 'Consulta Pre-Facturación' && opcion.accion === 'consulta') {
                    to = `/cotizacionesprefacturacion/lista`;
                    text = 'Consulta de cotizaciones en Pre-Facturación';
                    icon = <FiSearch />;
                }else if (opcion.nombre === 'Registro Pedidos-Producción' && opcion.accion === 'registro') {
                    to = `/pedidosproduccion/crear`;
                    text = 'Registro de pedidos de producción';
                    icon = <FiFileText />;
                }else if (opcion.nombre === 'Consulta Pedidos-Producción' && opcion.accion === 'consulta') {
                    to = `/pedidosproduccion/lista`;
                    text = 'Consulta de pedidos de producción';
                    icon = <FiSearch />;
                }else if (opcion.nombre === 'Consulta Reportes-Contabilidad' && opcion.accion === 'consulta') {
                    to = `/cuentas-por-cobrar/lista`;
                    text = 'Estado de cuenta';
                    icon = <FiFileText />;
                }
                else if (opcion.nombre === 'Registro Recibos' && opcion.accion === 'registro') {
                    to = `/recibos/crear`;
                    text = 'Registro de recibos';
                    icon = <FiFileText />;
                }else if (opcion.nombre === 'Consulta Recibos' && opcion.accion === 'consulta') {
                    to = `/recibos/lista`;
                    text = 'Consulta de recibos';
                    icon = <FiSearch />;
                }else if (opcion.nombre === 'Cotizaciones Reportes-Contabilidad' && opcion.accion === 'cotizaciones') {
                    to = `/reportes/contabilidad/cotizaciones`;
                    text = 'Consulta de cotizaciones';
                    icon = <FiSearch />;
                }else if (opcion.nombre === 'Cartera Reportes-Contabilidad' && opcion.accion === 'cartera') {
                    to = `/reportes/contabilidad/cartera`;
                    text = 'Consulta cartera de clientes';
                    icon = <FiSearch />;
                }else if (opcion.nombre === 'Contactos clientes' && opcion.accion === 'contactos') {
                    to = `/clientes/datos`;
                    text = 'Asignar información de contacto';
                    icon = <FiSearch />;
                }


                if (to && text) {
                    submenus.push({ to, text, icon });
                }
            });

            if (submenus.length > 0) {
                let groupIcon = null;

                if (tipo === 'empleados') groupIcon = <FiUsers />;
                else if (tipo === 'clientes') groupIcon = <FiUsers />;
                else if (tipo === 'cotizaciones') groupIcon = <FiFileText />;
                else if (tipo === 'productos_predefinidos') groupIcon = <FiBox />;
                else if (tipo === 'contacto_cliente') groupIcon = <FiUsers />;
                else if (tipo === 'cotizaciones_costeo') groupIcon = <FiFileText />;
                else if (tipo === 'monitor_de_cotizaciones') groupIcon = <FiFileText />;
                else if (tipo === 'cotizaciones_en_costeo') groupIcon = <FiFileText />;
                else if (tipo === 'pre-facturación') groupIcon = <FiFileText />;
                else if (tipo === 'pedidos-producción') groupIcon = <FiFileText />;
                else if (tipo === 'reportes-contabilidad') groupIcon = <FiFileText />;
                else if (tipo === 'recibos') groupIcon = <FiFileText />;
                else groupIcon = <FiBox />; // Icono por defecto si no se encuentra el tipo

                menuStructure.push({
                    text: tipo.charAt(0).toUpperCase() + tipo.slice(1), // Capitalizar la primera letra
                    icon: groupIcon,
                    submenus: submenus,
                });
            }
        }
        return menuStructure;
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
                links={getStructuredLinks()}
            />
            <div className="content">
                <h1>!GP EXCELENCIA</h1>
                <p>Sistema de operaciones</p>
            </div>
        </div>
    );
}

export default Home;