import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap 5
import { Link, useNavigate } from 'react-router-dom';
import '../../css/ListaEmpleados.css';

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
        { data: 'id_empleado', title: 'ID' },
        { data: 'codigo', title: 'Código' },
        { data: 'nombre', title: 'Nombre' },
        { data: 'nit', title: 'NIT' },
        //{ data: 'id_identificacion', title: 'ID Identificación' },
        { data: 'identificacion_nombre', title: 'Tipo Identificación' },
        { data: 'numero_identificacion', title: 'No.Identificación' },
        { data: 'telefono_casa', title: 'Tel. Casa' },
        { data: 'movil', title: 'Celular' },
        { data: 'otro_telefono', title: 'Tel.Adicional' },
        { data: 'correo_personal', title: 'Correo Personal' },
        { data: 'correo_empresa', title: 'Correo Empresa' },
        { data: 'salud', title: 'Problemas de salud' },
        { data: 'contacto_emergencia', title: 'Contacto emergencia' },
        { data: 'telefono_emergencia', title: 'Tel. emergencia' },
        //{ data: 'id_departamento', title: 'Id. Departamento' },
        { data: 'departamento_nombre', title: 'Area' },
        //{ data: 'id_puesto', title: 'Id. Puesto' },
        { data: 'puesto_nombre', title: 'Puesto' },
        { data: 'fecha_nacimiento', title: 'Fecha nacimiento' },
        { data: 'fecha_ingreso', title: 'Fecha ingreso' },
        { data: 'genero', title: 'Género' },
        { data: 'direccion', title: 'Dirección' },
        //{ data: 'id_departamentopais', title: 'Id. departamento pais' },
        { data: 'departamentopais_nombre', title: 'Departamento' },
        { data: 'Observaciones', title: 'Observaciones' },
        {
            data: 'id_empleado',
            title: 'Acciones',
            render: (data) => {
                return `<button class="btn btn-primary editar-btn btn-fixed-width" data-id="${data}">Editar</button>
                <button class="btn btn-danger desactivar-btn btn-fixed-width" data-id="${data}">Desactivar</button>`;
            }
        }
    ];

    useEffect(() => {
        // Función para manejar los clics en los botones "Editar"
        const handleButtonClick = (event) => {
            const id = event.target.getAttribute('data-id');
            if (event.target.classList.contains('editar-btn')) {
                navigate(`/empleados/editar/${id}`);
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
        <div className="container mt-4">
            <h2 className="text-center mb-4">Lista de Empleados</h2> {/* Título centrado */}
            {loading ? (
                <p>Cargando empleados...</p>
            ) : (
                <div className="table-responsive"> {/* Contenedor para hacer la tabla responsive */}
                    <DataTable
                        data={empleados}
                        columns={columns}
                        options={options}
                        className="table table-striped table-bordered table-hover" // Clases de Bootstrap mejoradas
                    >
                        <thead>
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
                        </thead>
                    </DataTable>
                </div>
            )}
            <div className="d-flex justify-content-center mt-3"> {/* Contenedor para los botones */}
                <Link to="/empleados/crear" className="btn btn-secondary me-2">Registro</Link>
                <Link to="/Home" className="btn btn-secondary">Volver a Inicio</Link>
            </div>
        </div>
    );
}

export default ListaEmpleados;