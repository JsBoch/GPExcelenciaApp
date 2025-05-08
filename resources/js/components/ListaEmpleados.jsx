import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap 5
import '@fortawesome/fontawesome-free/css/all.min.css';
import { Link, useNavigate } from 'react-router-dom';
//import '../../css/ListaEmpleados.css';
import '../../css/tableFormat.css';
import { FaRegFileAlt } from "react-icons/fa";
import Header from './Header';

DataTable.use(DT);

function ListaEmpleados() {
    const [empleados, setEmpleados] = useState([]);
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
            axios.get('/api/empleados', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(response => {
                    setEmpleados(response.data);
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

    // if (loading) {
    //     return <p>Cargando empleados...</p>;
    // }

    const columns = [
        { data: 'id_empleado', title: 'ID', visible: false },
        { data: 'codigo', title: 'Código' },
        { data: 'nombre', title: 'Nombre' },
        { data: 'nit', title: 'NIT' },
        //{ data: 'id_identificacion', title: 'ID Identificación' },
        { data: 'identificacion_nombre', title: 'Tipo Identificación', visible: false },
        { data: 'numero_identificacion', title: 'No.Identificación' },
        { data: 'telefono_casa', title: 'Tel. Casa', visible: false },
        { data: 'movil', title: 'Celular' },
        { data: 'otro_telefono', title: 'Tel.Adicional', visible: false },
        { data: 'correo_personal', title: 'Correo Personal' },
        { data: 'correo_empresa', title: 'Correo Empresa', visible: false },
        { data: 'salud', title: 'Problemas de salud', visible: false },
        { data: 'contacto_emergencia', title: 'Contacto emergencia', visible: false },
        { data: 'telefono_emergencia', title: 'Tel. emergencia', visible: false },
        //{ data: 'id_departamento', title: 'Id. Departamento' },
        { data: 'departamento_nombre', title: 'Area', visible: false },
        //{ data: 'id_puesto', title: 'Id. Puesto' },
        { data: 'puesto_nombre', title: 'Puesto' },
        { data: 'fecha_nacimiento', title: 'Fecha nacimiento', visible: false },
        { data: 'fecha_ingreso', title: 'Fecha ingreso', visible: false },
        { data: 'genero', title: 'Género', visible: false },
        { data: 'direccion', title: 'Dirección', visible: false },
        //{ data: 'id_departamentopais', title: 'Id. departamento pais' },
        { data: 'departamentopais_nombre', title: 'Departamento', visible: false },
        { data: 'Observaciones', title: 'Observaciones' },
        {
            data: 'id_empleado',
            title: 'Acciones',
            render: (data) => {
                // return `<button class="btn btn-primary editar-btn btn-fixed-width" data-id="${data}">Editar</button>
                // <button class="btn btn-danger desactivar-btn btn-fixed-width" data-id="${data}">Desactivar</button>`;
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

    // useEffect(() => {
    //     // Función para manejar los clics en los botones "Editar"
    //     const handleButtonClick = (event) => {
    //         const id = event.target.getAttribute('data-id');
    //         if (event.target.classList.contains('editar-btn')) {
    //             navigate(`/empleados/editar/${id}`);
    //         } else if (event.target.classList.contains('desactivar-btn')) {
    //             handleDesactivar(id);
    //         }
    //     };

    //     // Agregar el evento al documento
    //     document.addEventListener('click', handleButtonClick);

    //     // Limpiar el evento cuando el componente se desmonte
    //     return () => {
    //         document.removeEventListener('click', handleButtonClick);
    //     };
    // }, [navigate]); // Dependencia 'navigate' para evitar problemas con la navegación

    useEffect(() => {
        // Function to handle button clicks
        const handleButtonClick = (event) => {
            // Find the closest button ancestor of the clicked element
            const button = event.target.closest('button');

            if (button) {
                const id = button.getAttribute('data-id');
                if (button.classList.contains('editar-btn')) {
                    navigate(`/empleados/editar/${id}`);
                } else if (button.classList.contains('desactivar-btn')) {
                    // Add a confirmation dialog
                    if (window.confirm('¿Está seguro de que desea desactivar este empleado?')) {
                        handleDesactivar(id);
                    }
                }
            }
        };

        // Add the event listener to the table wrapper or document
        // Attaching to the document is fine for this pattern
        document.addEventListener('click', handleButtonClick);

        // Clean up the event listener when the component unmounts
        return () => {
            document.removeEventListener('click', handleButtonClick);
        };
    }, [navigate]); // Dependency array

    const options = {
        language: spanishTranslation, // Agrega la traducción aquí      
        // Añade estas dos opciones para el scroll vertical
        //scrollY: '400px', // Define la altura máxima antes de que aparezca el scroll. Puedes usar 'vh' también, ej: '50vh' (50% de la altura de la ventana)
        //scrollCollapse: true, // Permite que la altura de la tabla se colapse al scrollY especificado cuando hay menos filas  
    };


    //20250324192013.000 
    const handleEditar = (id) => {
        navigate(`/empleados/editar/${id}`);
    };

    useEffect(() => {
        // Este useEffect se ejecutará después de que el estado empleados cambie.
        //console.log('Estado empleados actualizado:', empleados);
    }, [empleados]);
    /*
    Este handle se utiliza para cambiar el estado de 0 a 1 para los registros al eliminar
    */
    const handleDesactivar = (id) => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.put(`/api/empleados/desactivar/${id}`, {}, {
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
                    setEmpleados(prevEmpleados => {
                        //console.log('Empleados antes del filtro:', prevEmpleados); // Agrega esta línea
                        return prevEmpleados.filter(empleado => Number(empleado.id_empleado) !== Number(id)); //convertimos a numero
                    });
                })
                .catch((error) => {
                    console.error('Error al desactivar empleado:', error);
                });
        }
    };



    /************************************************* */
    // const options = {
    //     language: spanishTranslation, // Agrega la traducción aquí        
    // };
    return (
        <div className="mt-4 px-3 px-md-4">
            <Header title="Lista de Empleados" />
            {/* <h2 className="text-center mb-4">Lista de Empleados</h2> */}
            {loading || !spanishTranslation ? (
                <p>Cargando empleados...</p>
            ) : (
                <div className="table-responsive"> {/* Contenedor para hacer la tabla responsive */}
                    <DataTable
                        data={empleados}
                        columns={columns}
                        options={{ ...options, language: spanishTranslation }}
                        className="table table-striped table-bordered table-hover" // Clases de Bootstrap mejoradas
                    >
                        {/* <thead>
                            <tr></tr>
                        </thead> */}
                        {/* <thead>
                            <tr>
                                <th>ID</th>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>NIT</th>
                                <th>Tipo Identificación</th>
                                <th>No. Identificación</th>
                                <th>Tel. Casa</th>
                                <th>Movil</th>
                                <th>Tel. Adicional</th>
                                <th>Correo Personal</th>
                                <th>Correo Empresa</th>
                                <th>Salud</th>
                                <th>Contacto Emergencia</th>
                                <th>Tel. Emergencia</th>
                                <th>Area</th>
                                <th>Puesto</th>
                                <th>Fecha Nacimiento</th>
                                <th>Fecha Ingreso</th>
                                <th>Genero</th>
                                <th>Dirección</th>
                                <th>Departamento</th>
                                <th>Observaciones</th>
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
                        to="/empleados/crear"
                        className="btn btn-success d-flex align-items-end justify-content-center gap-2 flex-fill"
                        style={{ minWidth: "150px" }}
                    >
                        <FaRegFileAlt /> Registro de Empleados
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ListaEmpleados;