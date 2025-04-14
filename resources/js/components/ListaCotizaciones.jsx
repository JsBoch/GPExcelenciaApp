import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap 5
import { Link, useNavigate } from 'react-router-dom';
import '../../css/ListaEmpleados.css';
//Funcionalidad para React PDF
import CotizacionPDF from './CotizacionPDF'; // Importa el componente CotizacionPDF
import { PDFViewer } from '@react-pdf/renderer'; // Importa PDFViewer
import alertify from 'alertifyjs';

DataTable.use(DT);

function ListaCotizaciones() {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null);
    const navigate = useNavigate(); // Hook para la navegación
    //20250407
    const [pdfData, setPdfData] = useState(null); // Estado para almacenar los datos del PDF

    useEffect(() => {
        fetch('/i18n/Spanish.json')
            .then(response => response.json())
            .then(data => setSpanishTranslation(data))
            .catch(error => console.error('Error al cargar la traducción:', error));
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.get('/api/cotizaciones', {
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
                    alertify.error('Error al obtener las cotizaciones.');
                    setLoading(false);
                });
        } else {
            //console.error('Token de autenticación no encontrado');
            alertify.error('Token de autenticación no encontrado');
            setLoading(false);
        }
    }, []);

    const columns = [
        { data: 'idcotizacion', title: 'ID', visible: false },
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
        { data: 'idcotizacionoriginal', title: 'ID CotizacionOriginal', visible: false },
        { data: 'idcliente', title: 'ID Cliente', visible: false },
        { data: 'idcontacto', title: 'ID Contacto', visible: false },
        { data: 'trabajo', title: 'Trabajo' },
        { data: 'version', title: 'Version', visible: false },
        {
            data: 'idcotizacion',
            title: 'Acciones',
            render: (data) => {
                // return `<button class="btn btn-primary editar-btn btn-fixed-width" data-id="${data}">Editar</button>
                //     <button class="btn btn-danger desactivar-btn btn-fixed-width" data-id="${data}">Desactivar</button>`;
                return `
            <button class="btn btn-primary btn-sm  editar-btn btn-fixed-width" data-id="${data}">Editar</button>
            <button class="btn btn-danger btn-sm desactivar-btn btn-fixed-width" data-id="${data}">Eliminar</button>
            <button class="btn btn-success btn-sm pdf-btn btn-fixed-width" data-id="${data}">PDF</button>`;
            }
        }
    ];

    useEffect(() => {       
        const handleButtonClick = async (event) => {
            const id = event.target.getAttribute('data-id');
            const token = localStorage.getItem('token'); // Recupera el token del localStorage

            if (event.target.classList.contains('editar-btn')) {
                navigate(`/cotizaciones/editar/${id}`);
            } else if (event.target.classList.contains('desactivar-btn')) {
                handleDesactivar(id);
            } else if (event.target.classList.contains('pdf-btn')) {
                if (token) {
                    try {
                        const response = await fetch(`/api/cotizaciones/${id}/pdf`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        const data = await response.json(); // Obtener datos como JSON
                        //console.log("Datos de la API para el PDF:", data);
                        setPdfData(data); // Establecer los datos del PDF en el estado
                    } catch (error) {
                        //console.error('Error al generar el PDF:', error);
                        alertify.error('Error al generar el PDF.');
                    }
                } else {
                    //console.error('Token no encontrado para generar PDF.');
                    alertify.error('Token no encontrado para generar PDF.');
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
    /*
    Este handle se utiliza para cambiar el estado de 0 a 1 para los registros al eliminar
    */
    const handleDesactivar = (id) => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.put(`/api/cotizaciones/desactivar/${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(() => {
                    setCotizaciones(prevCotizaciones => {
                        //console.log('Empleados antes del filtro:', prevEmpleados); // Agrega esta línea
                        return prevCotizaciones.filter(cotizacion => Number(cotizacion.idcotizacion) !== Number(id)); //convertimos a numero
                    });
                })
                .catch((error) => {
                    //console.error('Error al desactivar la cotizacion:', error);
                    alertify.error('Error al desactivar la cotizacion.');
                });
        }
    };

    return (
        <div className="container-fluid mt-4">
            {pdfData && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ width: '80%', height: '80%' }}>
                        <PDFViewer width="100%" height="100%">
                            <CotizacionPDF cotizacion={pdfData.cotizacion} totalEnLetras={pdfData.totalEnLetras} logoSrc="/images/LogoGP.jpg" />
                        </PDFViewer>
                        <button className="btn btn-danger mt-3" onClick={() => setPdfData(null)}>Cerrar PDF</button>
                    </div>
                </div>
            )}
            <div className="card">
                <div className="card-header bg-primary text-white">
                    <h2 className="text-center mb-0">Lista de Cotizaciones</h2>
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
                <div className="card-footer d-flex justify-content-end">
                    <div style={{ display: 'flex', width: '25%', gap: '10px' }}>
                        <div style={{ width: '50%' }}>
                            <Link to="/cotizaciones/crear" className="btn btn-success btn-sm" style={{ width: '100%' }}>REGISTRAR</Link>
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

export default ListaCotizaciones;