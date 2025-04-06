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

function ListaCotizacionesCosteo() {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null);
    const navigate = useNavigate(); // Hook para la navegación

    useEffect(() => {
        fetch('/i18n/Spanish.json')
            .then(response => response.json())
            .then(data => setSpanishTranslation(data))
            .catch(error => console.error('Error al cargar la traducción:', error));
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.get('/api/costeocotizaciones', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(response => {
                    setCotizaciones(response.data);
                    setLoading(false);
                })
                .catch(error => {
                    //console.error('Error al obtener las cotizaciones:', error);     
                    alertify.error("Error al obtener las cotizaciones");                    
                    setLoading(false);
                });
        } else {
            console.error('Token de autenticación no encontrado');
            setLoading(false);
        }
    }, []);

    const columns = [
        { data: 'idcotizacion', title: 'ID', visible : false },
        { data: 'nocotizacion', title: 'No.Cotizacion' },
        { data: 'fecha_cotizacion', title: 'Fecha' },
        { data: 'tipo_pago', title: 'Forma Pago' },
        { data: 'total_general', title: 'Total' },
        { data: 'costear', title: 'Costear' },
        { data: 'cliente', title: 'Cliente' },
        { data: 'contacto', title: 'Contacto' },
        { data: 'direccion_entrega', title: 'Dirección entrega' },
        { data: 'observaciones_costeo', title: 'Obsv.Costeo' },
        { data: 'observaciones_cliente', title: 'Obsv.Cliente' },
        { data: 'costeo_observaciones', title: 'Obsv.Vendedor' },
        { data: 'idcotizacionoriginal', title: 'ID CotizacionOriginal', visible : false },
        { data: 'idcliente', title: 'ID Cliente', visible : false },        
        { data: 'idcontacto', title: 'ID Contacto', visible : false },        
        { data: 'trabajo', title: 'Trabajo' },        
        { data: 'version', title: 'Version', visible:false },        
        {
            data: 'idcotizacion',
            title: 'Acciones',
            render: (data) => {                
                return `
            <button class="btn btn-primary editar-btn btn-fixed-width" data-id="${data}">Editar</button>            
            <button class="btn btn-success pdf-btn btn-fixed-width" data-id="${data}">PDF</button>`;
            }
        }
    ];

    useEffect(() => {       
        const handleButtonClick = (event) => {
            const id = event.target.getAttribute('data-id');
            const token = localStorage.getItem('token'); // Recupera el token del localStorage

            if (event.target.classList.contains('editar-btn')) {
                navigate(`/cotizaciones/editar/${id}`);
            } else if (event.target.classList.contains('pdf-btn')) {
                if (token) {
                    fetch(`/api/costeocotizaciones/${id}/pdf`, { // Usa fetch en lugar de window.open
                        headers: {
                            'Authorization': `Bearer ${token}` // Envía el token en la cabecera
                        }
                    })
                    .then(response => response.blob()) //Obtenemos la respuesta como blob
                    .then(blob => {
                        const url = window.URL.createObjectURL(blob); //creamos una url para el objeto blob
                        window.open(url, '_blank') //abrimos el pdf en una nueva ventana
                    })
                    .catch(error => console.error('Error al generar el PDF:', error));
                } else {
                    console.error('Token no encontrado para generar PDF.');
                    // Manejar la falta de token, por ejemplo, redirigiendo a la página de inicio de sesión
                }
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
        navigate(`/cotizaciones/editar/${id}`);
    };

    useEffect(() => {
        // Este useEffect se ejecutará después de que el estado cotizacion cambie.
        //console.log('Estado cotización actualizado:', cotizaciones);
    }, [cotizaciones]);
    
    return (
        <div className="container-fluid mt-4">
            <div className="card">
                <div className="card-header bg-primary text-white">
                    <h2 className="text-center mb-0">Lista de Cotizaciones para Costeo</h2>
                </div>
                <div className="card-body">
                    {loading ? (
                        <p className="text-center">Cargando cotizaciones...</p>
                    ) : (
                        <div className="table-responsive">
                            <DataTable
                                data={cotizaciones}
                                columns={columns}
                                options={options}
                                className="table table-striped table-bordered table-hover table-sm"
                            >
                                <thead>
                                    <tr>
                                        {/* <th>ID</th> */}
                                        <th>No. Cotización</th>
                                        <th>Fecha</th>
                                        <th>Forma Pago</th>
                                        <th>Total</th>
                                        <th>Costear</th>                                        
                                        <th>Cliente</th>
                                        {/* <th>ID Cliente</th> */}
                                        <th>Contacto</th>
                                        <th>Dirección Entrega</th>
                                        <th>Obsv. Costeo</th>
                                        <th>Obsv. Cliente</th>
                                        <th>Obsv. Vendedor</th>
                                        {/* <th>ID Contacto</th>                                         */}
                                        <th>Trabajo</th>                                        
                                        <th>Versión</th>                                                                                
                                        {/* <th>ID Original</th> */}
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                            </DataTable>
                        </div>
                    )}
                </div>
                <div className="card-footer d-flex justify-content-center">
                    {/* <Link to="/cotizaciones/crear" className="btn btn-success me-2">Registrar</Link> */}
                    <Link to="/Home" className="btn btn-outline-secondary">Volver a Inicio</Link>
                </div>
            </div>
        </div>
    );
}

export default ListaCotizacionesCosteo;