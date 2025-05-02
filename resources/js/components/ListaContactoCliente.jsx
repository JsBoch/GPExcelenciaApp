import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap 5
import { Link, useNavigate } from 'react-router-dom';
import '../../css/ListaEmpleados.css';

DataTable.use(DT);

function ListaContactoCliente() {
    const [contactoCliente, setContactoCliente] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [selectedCliente, setSelectedCliente] = useState(''); // Estado para el cliente seleccionado
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null); // Estado para la traducción    
    const navigate = useNavigate(); // Hook para la navegación

    useEffect(() => {
        // Carga la traducción desde public/i18n/Spanish.json
        fetch('/i18n/Spanish.json')
            .then(response => response.json())
            .then(data => setSpanishTranslation(data))
            .catch(error => console.error('Error al cargar la traducción:', error));

            fetchClientes(); // Cargar la lista de clientes al inicio            
    }, []);

    const fetchClientes = () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.get('/api/clientes', { // Asegúrate de que esta ruta sea correcta
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then(response => {
                setClientes(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error al obtener los clientes:', error);
                setLoading(false);
            });
        } else {
            console.error('Token de autenticación no encontrado');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCliente) {
            fetchContactos(selectedCliente); // Cargar contactos al cambiar el cliente seleccionado
        }
    }, [selectedCliente]);

    const fetchContactos = (idcliente) => {
        //console.log('idcliente enviado:', idcliente); // Agrega esta línea
        const token = localStorage.getItem('token');
        if (token) {
            axios.get(`/api/contacto_cliente/cliente/${idcliente}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then(response => {
                setContactoCliente(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error al obtener los contactos del cliente:', error);
                setLoading(false);
            });
        } else {
            console.error('Token de autenticación no encontrado');
            setLoading(false);
        }
    };

    // useEffect(() => {
    //     const token = localStorage.getItem('token');
    //     if (token) {
    //         axios.get('/api/contacto_cliente', {
    //             headers: {
    //                 Authorization: `Bearer ${token}`,
    //             },
    //         })
    //             .then(response => {
    //                 console.log(response.data);
    //                 setContactoCliente(response.data);
    //                 setLoading(false);
    //             })
    //             .catch(error => {
    //                 console.error('Error al obtener los contactos del cliente:', error);
    //                 setLoading(false);
    //             });
    //     } else {
    //         console.error('Token de autenticación no encontrado');
    //         setLoading(false);
    //     }
    // }, []);

    const columns = [
        { data: 'id_contactocliente', title: 'ID' },
        { data: 'idcliente', title: 'Cliente ID' },
        { data: 'nombre', title: 'Nombre' },
        { data: 'telefono', title: 'Teléfono' },        
        { data: 'correo', title: 'Correo' },
        { data: 'puesto', title: 'Puesto' },
        { data: 'observaciones', title: 'Observaciones' },        
        {
            data: 'id_contactocliente',
            title: 'Acciones',
            render: (data) => {
                return `<button class="btn btn-primary btn-sm editar-btn btn-fixed-width" data-id="${data}">Editar</button>
                <button class="btn btn-danger btn-sm desactivar-btn btn-fixed-width" data-id="${data}">Eliminar</button>`;
            }
        }
    ];

    useEffect(() => {
            // Función para manejar los clics en los botones "Editar"
            const handleButtonClick = (event) => {
                const id = event.target.getAttribute('data-id');
                if (event.target.classList.contains('editar-btn')) {
                    navigate(`/contacto_cliente/editar/${id}`);
                } else if (event.target.classList.contains('desactivar-btn')) {
                    handleDesactivar(id);
                }
            };
    
            // Agregar el evento al documento
            document.addEventListener('click', handleButtonClick);
    
            // Limpiar el evento cuando el componente se desmonte
            return () => {
                document.removeEventListener('click', handleButtonClick);
            };
        }, [navigate]); // Dependencia 'navigate' para evitar problemas con la navegación
    
        const options = {
            language: spanishTranslation, // Agrega la traducción aquí        
        };

        const handleEditar = (id) => {
                navigate(`/contacto_cliente/editar/${id}`);
            };
        
            useEffect(() => {
                // Este useEffect se ejecutará después de que el estado empleados cambie.
                //console.log('Estado empleados actualizado:', empleados);
            }, [contactoCliente]);

            /*
    Este handle se utiliza para cambiar el estado de 0 a 1 para los registros al eliminar
    */
    const handleDesactivar = (id) => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.put(`/api/contacto_cliente/desactivar/${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(() => {                                
                    setContactoCliente(prevContactoCliente => {
                        //console.log('Empleados antes del filtro:', prevEmpleados); // Agrega esta línea
                        return prevContactoCliente.filter(contacto => Number(contacto.id_contactocliente) !== Number(id)); //convertimos a numero
                    });
                })
                .catch((error) => {
                    console.error('Error al desactivar el contacto del cliente:', error);
                });
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="text-center mb-4">Lista de Contactos</h2> {/* Título centrado */}
            <select
                className="form-select mb-3"
                value={selectedCliente}
                onChange={(e) => setSelectedCliente(e.target.value)}
            >
                <option value="">Seleccione un Cliente</option>
                {clientes.map(cliente => (
                    <option key={cliente.idcliente} value={cliente.idcliente}>
                        {cliente.nombre}
                    </option>
                ))}
            </select>
            {loading || !spanishTranslation ? (
                <p>Cargando contactos...</p>
            ) : (
                <div className="table-responsive"> {/* Contenedor para hacer la tabla responsive */}
                    <DataTable
                        data={contactoCliente}
                        columns={columns}
                        options={{ ...options, language: spanishTranslation }}
                        className="table table-striped table-bordered table-hover" // Clases de Bootstrap mejoradas
                    >
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Cliente ID</th>
                                <th>Nombre</th>
                                <th>Teléfono</th>
                                <th>Correo</th>
                                <th>Puesto</th>
                                <th>Observaciones</th>                            
                            </tr>
                        </thead>
                    </DataTable>
                </div>
            )}
            <div className="d-flex justify-content-end mt-3"> {/* Contenedor para los botones */}
            <div style={{ display: 'flex', width: '25%', gap: '10px' }}>
            <div style={{ width: '50%' }}>
                <Link to="/contacto_cliente/crear" className="btn btn-primary btn-sm" style={{ width: '100%' }}>REGISTRO</Link>
                </div>
                <div style={{ width: '50%' }}>
                <Link to="/Home" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>INICIO</Link>
                </div>
                </div>
            </div>
        </div>
    );
}

export default ListaContactoCliente;