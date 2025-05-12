import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap 5
import { Link, useNavigate } from 'react-router-dom';
//import '../../css/ListaEmpleados.css';
import '../../css/ListaClientes.css';
import '../../css/tableFormat.css';
import { FaRegFileAlt } from "react-icons/fa";
import Header from './Header';

DataTable.use(DT);

function ListaClientes() {
    // const customStyles = {
    //     headRow: {
    //       style: {
    //         backgroundColor: 'black',
    //         color: 'white',
    //       },
    //     },
    //     headCells: {
    //       style: {
    //         fontWeight: 'bold',
    //       },
    //     },
    //     // ... otros estilos personalizados
    //   };

    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null); // Estado para la traducción  

    //2025-03-24 19:18:13.000
    const navigate = useNavigate(); // Hook para la navegación

    useEffect(() => {
        // Carga la traducción desde public/i18n/Spanish.json
        fetch('/i18n/Spanish.json')
            .then(response => response.json())
            .then(data => setSpanishTranslation(data))
            .catch(error => console.error('Error al cargar la traducción:', error));

        // ... (tu código existente para cargar datos)
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.get('/api/clientes', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(response => {
                    setClientes(response.data);
                    setLoading(false);
                })
                .catch(error => {
                    console.error('Error al obtener empleados:', error);
                    setLoading(false);
                });
        } else {
            console.error('Token de autenticación no encontrado');
            setLoading(false);
        }
    }, []);

    const columns = [
        { data: 'idcliente', title: 'ID', visible: false },
        { data: 'codigo', title: 'Código' },
        { data: 'nit', title: 'NIT' },
        { data: 'cui', title: 'CUI', visible: false },
        { data: 'nombre', title: 'Nombre' },
        { data: 'razonsocial', title: 'Razón social' },
        { data: 'direccion', title: 'Dirección' },
        { data: 'codigo_postal', title: 'Código postal', visible: false },
        { data: 'departamento', title: 'Departamento', visible: false },
        { data: 'telefono_uno', title: 'Teléfono uno' },
        { data: 'telefono_dos', title: 'Teléfono dos' },
        { data: 'telefono_tres', title: 'Teléfono tres' },
        { data: 'email', title: 'Correo' },
        { data: 'monto_credito', title: 'Monto crédito', visible: false },
        { data: 'dias_credito', title: 'Días crédito', visible: false },
        { data: 'comentario', title: 'Comentario', visible: false },
        { data: 'vendedor', title: 'Vendedor', visible: false },
        { data: 'id_empleado', title: 'Empleado ID', visible: false },
        { data: 'id_municipio', title: 'Municipio ID', visible: false },
        { data: 'idtipocliente', title: 'Tipo cliente ID', visible: false },
        { data: 'iddepartamento', title: 'Departamento ID', visible: false },
        { data: 'fecharegistro', title: 'Fecha registro', visible: false },
        { data: 'usuario_registro', title: 'Usuario registro', visible: false },
        { data: 'usuario_modifica', title: 'Usuario modifica', visible: false },
        { data: 'fecha_modificacion', title: 'Fecha modificación', visible: false },
        { data: 'estado', title: 'Estado', visible: false },
        {
            data: 'idcliente',
            title: 'Acciones',
            render: (data) => {
                // return `<button class="btn btn-primary editar-btn btn-fixed-width" data-id="${data}">Editar</button>
                //     <button class="btn btn-danger desactivar-btn btn-fixed-width" data-id="${data}">Desactivar</button>`;
                return `
                    <div class="d-flex gap-1 justify-content-center align-items-center">
                        <button class="btn btn-primary btn-sm editar-btn" data-id="${data}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm desactivar-btn" data-id="${data}" title="Desactivar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            }
        }
    ];

    useEffect(() => {
        // Función para manejar los clics en los botones "Editar"
        const handleButtonClick = (event) => {
            // const id = event.target.getAttribute('data-id');
            // if (event.target.classList.contains('editar-btn')) {
            //     navigate(`/clientes/editar/${id}`);
            // } else if (event.target.classList.contains('desactivar-btn')) {
            //     handleDesactivar(id);
            // }
            // Busca el elemento <button> más cercano al que se hizo clic
            const button = event.target.closest('button');
            if (!button) return; // Si no se encuentra, no hace nada

            const id = button.getAttribute('data-id');
            if (button.classList.contains('editar-btn')) {
                navigate(`/clientes/editar/${id}`);
            } else if (button.classList.contains('desactivar-btn')) {
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
        navigate(`/clientes/editar/${id}`);
    };

    useEffect(() => {
        // Este useEffect se ejecutará después de que el estado clientes cambie.
        //console.log('Estado clientes actualizado:', clientes);
    }, [clientes]);
    /*
    Este handle se utiliza para cambiar el estado de 0 a 1 para los registros al eliminar
    */
    const handleDesactivar = (id) => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.put(`/api/clientes/desactivar/${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(() => {
                    // Recargar la lista de empleados después de desactivar
                    //window.location.reload();
                    //window.location.href = '/empleados/lista';
                    // Actualizar el estado local para eliminar el empleado desactivado
                    //setEmpleados(empleados.filter(empleado => empleado.id_empleado !== id));                    
                    setClientes(prevClientes => {
                        //console.log('Empleados antes del filtro:', prevEmpleados); // Agrega esta línea
                        return prevClientes.filter(cliente => Number(cliente.idcliente) !== Number(id)); //convertimos a numero
                    });
                })
                .catch((error) => {
                    console.error('Error al desactivar cliente:', error);
                });
        }
    };

    return (
        <div className="mt-4 px-3 px-md-4">
            <Header title="Lista de Clientes" />
            {/* <h2 className="text-center mb-4">Lista de Empleados</h2> */}
            {loading || !spanishTranslation ? (
                <p>Cargando clientes...</p>
            ) : (
                <div className="table-responsive"> {/* Contenedor para hacer la tabla responsive */}
                    <DataTable
                        key={clientes.length} // Agrega una clave que cambia con la longitud de clientes
                        data={clientes}
                        columns={columns}
                        options={{ ...options, language: spanishTranslation }}
                        className="table" // Clases de Bootstrap mejoradas
                    //customStyles={customStyles} // Agrega los estilos personalizados
                    >
                        {/* <thead>
                            <tr>
                                <th>ID</th>
                                <th>Código</th>
                                <th>NIT</th>
                                <th>CUI</th>
                                <th>Nombre</th>
                                <th>Razón social</th>
                                <th>Dirección</th>
                                <th>Código postal</th>
                                <th>Departamento</th>
                                <th>Teléfono uno</th>
                                <th>Teléfono dos</th>
                                <th>Teléfono tres</th>
                                <th>Correo</th>
                                <th>Monto crédito</th>
                                <th>Días crédito</th>
                                <th>Comentario</th>
                                <th>Vendedor</th>
                                <th>Empleado ID</th>
                                <th>Municipio ID</th>
                                <th>Tipo cliente ID</th>
                                <th>Departamento ID</th>
                                <th>Fecha registro</th>
                                <th>Usuario registro</th>
                                <th>Usuario modifica</th>
                                <th>Fecha modificación</th>
                                <th>Estado</th>
                            </tr>
                        </thead> */}
                    </DataTable>
                </div>
            )}
            <div
                className="mt-4 p-3 border rounded shadow-sm bg-light"
                style={{ borderColor: "#ddd" }}
            >
                <div className="d-flex flex-wrap gap-2 justify-content-between">
                    <Link
                        to="/clientes/crear"
                        className="btn btn-success d-flex align-items-end justify-content-center gap-2 flex-fill"
                        style={{ minWidth: "150px" }}
                    >
                        <FaRegFileAlt /> Registro de Clientes
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ListaClientes;