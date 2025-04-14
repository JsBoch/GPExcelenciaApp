import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap 5
import { Link, useNavigate } from 'react-router-dom';
import '../../css/ListaEmpleados.css';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.min.css';
import 'alertifyjs/build/css/themes/default.min.css';

DataTable.use(DT);

function ListaProductosPredefinidos() {
    const [productosPredefinidos, setProductosPredefinidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetch('/i18n/Spanish.json')
            .then(response => response.json())
            .then(data => setSpanishTranslation(data))
            .catch(error => console.error('Error al cargar la traducción:', error));
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.get('/api/productopredefinido', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(response => {
                    setProductosPredefinidos(response.data);
                    setLoading(false);
                })
                .catch(error => {
                    console.error('Error al obtener los productos predefinidos:', error);
                    setLoading(false);
                });
        } else {
            console.error('Token de autenticación no encontrado');
            setLoading(false);
        }
    }, []);

    const columns = [
        { data: 'titulo', title: 'Título' },
        { data: 'descripcion', title: 'Descripción' },
        { data: 'ancho', title: 'Ancho' },
        { data: 'alto', title: 'Alto' },
        { data: 'profundidad', title: 'Profundidad' },
        { data: 'cantidad', title: 'Catidad' },
        { data: 'precio', title: 'Precio' },
        { data: 'cantidad_uno', title: 'Cantidad Uno' },
        { data: 'precio_uno', title: 'Precio Uno' },
        { data: 'cantidad_dos', title: 'Cantidad Dos' },
        { data: 'precio_dos', title: 'Precio Dos' },
        { data: 'cantidad_tres', title: 'Cantidad Tres' },
        { data: 'precio_tres', title: 'Precio Tres' },
        { data: 'cantidad_cuatro', title: 'Cantidad Cuatro' },
        { data: 'precio_cuatro', title: 'Precio Cuatro' },
        { data: 'unidad_medida', title: 'Unidad Medida' },
        { data: 'variacion', title: 'Variación' },
        { data: 'observaciones', title: 'Observaciones' },
        {
            data: 'idproductopredefinido',
            title: 'Acciones',
            render: (data) => {
                return `
            <button class="btn btn-primary btn-sm  editar-btn btn-fixed-width" data-id="${data}">Editar</button>
            <button class="btn btn-danger btn-sm desactivar-btn btn-fixed-width" data-id="${data}">Eliminar</button>
            `
            }
        }
    ];

    useEffect(() => {
        const handleButtonClick = async (event) => {
            const id = event.target.getAttribute('data-id');
            const token = localStorage.getItem('token'); // Recupera el token del localStorage

            if (event.target.classList.contains('editar-btn')) {
                navigate(`/productospredefinidos/editar/${id}`);
            } else if (event.target.classList.contains('desactivar-btn')) {
                // Mostrar el mensaje de confirmación antes de eliminar
                alertify.confirm(
                    "Confirmar Eliminación",
                    "¿Estás seguro de que deseas eliminar este registro?",
                    () => { // Función para "Sí"
                        handleDesactivar(id); // Llamar a la función de eliminación
                    },
                    () => { // Función para "No"
                        alertify.error("Eliminación cancelada");
                    }
                );                
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
        language: spanishTranslation,
    };

    const handleEditar = (id) => {
        navigate(`/productospredefinidos/editar/${id}`);
    };

    const handleDesactivar = (id) => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.put(`/api/productopredefinido/desactivar/${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(() => {
                    setProductosPredefinidos(prevProductosPredefinidos => {                        
                        return prevProductosPredefinidos.filter(prevProductoPredefinido => Number(prevProductoPredefinido.idproductopredefinido) !== Number(id)); //convertimos a numero
                    });
                    alertify.success("Registro eliminado correctamente");
                })
                .catch((error) => {
                    console.error('Error al desactivar el producto predefinido:', error);
                    alertify.error("Error al eliminar el registro");
                });
        }
    };

    return (
        <div className="container-fluid mt-4">            
            <div className="card">
                <div className="card-header bg-primary text-white">
                    <h2 className="text-center mb-0">Lista de Productos Predefinidos</h2>
                </div>
                <div className="card-body">
                    {loading ? (
                        <p className="text-center">Cargando registros predefinidos...</p>
                    ) : (
                        <div className="table-responsive">
                            <DataTable
                                data={productosPredefinidos}
                                columns={columns}
                                options={options}
                                className="table table-striped table-bordered table-hover table-sm"
                            >
                                <thead>
                                    <tr>                                        
                                        <th>Título</th>
                                        <th>Descripción</th>
                                        <th>Ancho</th>
                                        <th>Alto</th>
                                        <th>Profundidad</th>
                                        <th>Precio</th>                                        
                                        <th>Cantidad 1</th>
                                        <th>Precio 1</th>
                                        <th>Cantidad 2</th>
                                        <th>Precio 2</th>
                                        <th>Cantidad 3</th>
                                        <th>Precio 3</th>
                                        <th>Cantidad 4</th>
                                        <th>Precio 4</th>
                                        <th>Unidad medida</th>
                                        <th>Variación</th>
                                        <th>Observaciones</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                            </DataTable>
                        </div>
                    )}
                </div>
                <div className="card-footer d-flex justify-content-end">
                    <div style={{ display: 'flex', width: '25%', gap: '10px' }}>
                        <div style={{ width: '50%' }}>
                            <Link to="/productospredefinidos/crear" className="btn btn-success btn-sm" style={{ width: '100%' }}>REGISTRAR</Link>
                        </div>
                        <div style={{ width: '50%' }}>
                            <Link to="/Home" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>INICIO</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ListaProductosPredefinidos;