import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap 5
import { Link, useNavigate } from 'react-router-dom';
//import '../../css/ListaEmpleados.css';
//Funcionalidad para React PDF
import CotizacionPDF from './CotizacionPDF'; // Importa el componente CotizacionPDF
import { PDFViewer } from '@react-pdf/renderer'; // Importa PDFViewer
import alertify from 'alertifyjs';
// import * as moment from 'moment';
import { format } from 'date-fns';
import DetalleCotizacionModal from './DetalleCotizacionModal'; // Importa el componente del modal de detalle de cotización
import '../../css/tableFormat.css';
import { FaRegFileAlt } from "react-icons/fa";
import Header from './Header';

DataTable.use(DT);

function ListaCotizaciones() {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [detalleCotizacion, setDetalleCotizacion] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null);
    const navigate = useNavigate(); // Hook para la navegación    
    const [pdfData, setPdfData] = useState(null); // Estado para almacenar los datos del PDF
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [fechaHoy, setFechaHoy] = useState('');
    const dtRef = useRef(null); // Referencia al componente DataTable

    useEffect(() => {
        fetch('/i18n/Spanish.json')
            .then(response => response.json())
            .then(data => setSpanishTranslation(data))
            .catch(error => console.error('Error al cargar la traducción:', error));

        // Establecer la fecha de hoy en el formato YYYY-MM-DD
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        const fechaActual = `${año}-${mes}-${dia}`;
        setFechaInicio(fechaActual);
        setFechaFin(fechaActual);
        //setFechaHoy(fechaActual); // Guarda la fecha de hoy para la lógica inicial
        fetchCotizaciones(fechaActual, fechaActual); // Realizar la consulta inicial con la fecha de hoy
    }, []);

    //20250407 Código para enviar los parámetros de fecha

    const fetchCotizaciones = (startDate = '', endDate = '') => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (startDate) {
            params.append('fecha_inicio', startDate);
        }
        if (endDate) {
            params.append('fecha_fin', endDate);
        }

        if (token && startDate && endDate) {
            axios.get(`/api/cotizaciones?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(response => {
                    setCotizaciones(response.data);
                    setLoading(false);
                })
                .catch(error => {
                    alertify.error('Error al obtener las cotizaciones.');
                    setLoading(false);
                });
        } else {
            setCotizaciones([]); // Limpiar las cotizaciones si no hay fechas
            setLoading(false);
            if (!token) {
                alertify.error('Token de autenticación no encontrado');
            } else {
                // Opcional: Mostrar un mensaje indicando que se deben seleccionar las fechas
                // alertify.warning('Por favor, seleccione un rango de fechas.');
            }
        }
    };

    const handleFiltrar = () => {
        fetchCotizaciones(fechaInicio, fechaFin);
    };

    const obtenerDetalleCotizacion = async (id) => {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await axios.get(`/api/cotizaciones/detalle/${id}`, { // Asegúrate de que esta ruta exista en tu API
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setDetalleCotizacion(response.data);
                setModalVisible(true);
            } catch (error) {
                alertify.error('Error al obtener el detalle de la cotización.');
            } finally {
                setLoading(false);
            }
        } else {
            alertify.error('Token de autenticación no encontrado.');
            setLoading(false);
        }
    };

    const columns = [
        {
            data: 'idcotizacion',
            title: 'Acciones',

            render: (data) => {
                // return `<button class="btn btn-primary editar-btn btn-fixed-width" data-id="${data}">Editar</button>
                // <button class="btn btn-danger desactivar-btn btn-fixed-width" data-id="${data}">Desactivar</button>`;
                return `
  <div class="d-flex gap-1 justify-content-center align-items-center">
    <button class="btn btn-info btn-sm detalle-btn" data-id="${data}" title="Ver Detalle"><i class="fas fa-eye"></i></button>
    <button class="btn btn-primary btn-sm editar-btn" data-id="${data}" title="Editar"><i class="fas fa-edit"></i></button>
    <button class="btn btn-danger btn-sm desactivar-btn" data-id="${data}" title="Eliminar"><i class="fas fa-trash"></i></button>
    <button class="btn btn-success btn-sm pdf-btn" data-id="${data}" title="Generar PDF"><i class="fas fa-file-pdf"></i></button>
    <button class="btn btn-warning btn-sm facturar-btn" data-id="${data}" title="Facturar"><i class="fas fa-file-invoice-dollar"></i></button>   
  </div>
`;
            }
        },
        { data: 'idcotizacion', title: 'ID', visible: false },
        { data: 'nocotizacion', title: 'No.Cotizacion' },
        {
            data: 'fecha_cotizacion',
            title: 'Fecha',
            render: (data) => {
                if (data) {
                    try {
                        const date = new Date(data);
                        return format(date, 'dd-MM-yyyy'); // Formatea la fecha al formato AAAA-MM-DD
                        // Otros formatos que podrías usar:
                        // return format(date, 'dd/MM/yyyy'); // Día/Mes/Año
                        // return format(date, 'MM/dd/yyyy'); // Mes/Día/Año
                    } catch (error) {
                        console.error("Error al formatear la fecha:", error);
                        return ''; // Devuelve una cadena vacía o algún otro valor en caso de error
                    }
                }
                return ''; // O algún otro valor por defecto si la fecha es nula
            },
        },
        { data: 'tipo_pago', title: 'Forma Pago', visible: false },
        // { data: 'total_general', title: 'Total' },
        {
            data: 'total_general',
            title: 'Total',
            render: (data) => {
                if (data !== null && data !== undefined) {
                    try {
                        // Formatea el número como moneda (Quetzales en Guatemala)
                        return Number(data).toLocaleString('es-GT', {
                            style: 'currency',
                            currency: 'GTQ',
                            minimumFractionDigits: 2, // Asegura que se muestren dos decimales
                            maximumFractionDigits: 2,
                        });
                        // Para otro país o moneda, cambia 'es-GT' y 'GTQ'
                        // Ejemplo para dólares estadounidenses:
                        // return Number(data).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                    } catch (error) {
                        console.error("Error al formatear la moneda:", error);
                        return data; // Muestra el valor sin formato en caso de error
                    }
                }
                return ''; // O algún otro valor por defecto si el total es nulo o undefined
            },
        },
        { data: 'costear', title: 'Costear' },
        { data: 'cliente', title: 'Cliente' },
        { data: 'contacto', title: 'Contacto', visible: false },
        { data: 'direccion_entrega', title: 'Dirección entrega', visible: false },
        { data: 'observaciones_costeo', title: 'Obsv.Costeo' },
        { data: 'observaciones_cliente', title: 'Obsv.Cliente', visible: false },
        { data: 'costeo_observaciones', title: 'Obsv.Vendedor' },
        { data: 'idcotizacionoriginal', title: 'ID CotizacionOriginal', visible: false },
        { data: 'idcliente', title: 'ID Cliente', visible: false },
        { data: 'idcontacto', title: 'ID Contacto', visible: false },
        { data: 'trabajo', title: 'Trabajo', visible: false },
        { data: 'version', title: 'Version', visible: false },
        { data: 'estado', title: 'Estado', visible: false },
    ];

    useEffect(() => {
        const handleButtonClick = async (event) => {
            const button = event.target.closest('button');
            if (!button) return; // Salir si no se hizo clic en un botón

            const id = button.getAttribute('data-id');
            const token = localStorage.getItem('token');

            if (button.classList.contains('editar-btn')) {
                navigate(`/cotizaciones/editar/${id}`);
            } else if (button.classList.contains('desactivar-btn')) {
                handleDesactivar(id);
            } else if (button.classList.contains('facturar-btn')) {
                handleFacturar(id);
            } else if (button.classList.contains('pdf-btn')) {
                if (token) {
                    try {
                        const response = await fetch(`/api/cotizaciones/${id}/pdf`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        const data = await response.json();
                        setPdfData(data);
                    } catch (error) {
                        alertify.error('Error al generar el PDF.');
                    }
                } else {
                    alertify.error('Token no encontrado para generar PDF.');
                }
            } else if (button.classList.contains('detalle-btn')) {
                obtenerDetalleCotizacion(id);
            }
        };

        document.addEventListener('click', handleButtonClick);
        return () => document.removeEventListener('click', handleButtonClick);
    }, []);


    const options = {
        autoWidth: false, // Desactiva el autoajuste
        columnDefs: [
            { targets: 0, width: '100px' } // Ajusta la columna de acciones manualmente (índice 0 si es la primera visible)
        ],
        language: spanishTranslation, // Agrega la traducción aquí        
        order: [[1, 'desc']], // Ordena por la segunda columna (índice 1, 'nocotizacion') de forma descendente
        rowCallback: (row, data) => {
            if (data.estado === 1 && data.costear === 'S') {
                row.style.backgroundColor = '#d5d8dc';
            } else if (data.estado === 3) {
                row.style.backgroundColor = '#fcf3cf';
            }
        },
    };

    // const handleEditar = (id) => {
    //     navigate(`/cotizaciones/editar/${id}`);
    // };

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

    const handleFacturar = (id) => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.put(`/api/cotizaciones/activarfacturacion/${id}`, {}, {
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
                    alertify.error('Error al enviar la cotización a facturación.');
                });
        }
    };

    return (
        <div className="mt-4 px-3 px-md-4">
            {pdfData && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ width: '80%', height: '80%' }}>
                        <PDFViewer width="100%" height="100%">
                            <CotizacionPDF cotizacion={pdfData.cotizacion} totalEnLetras={pdfData.totalEnLetras} logoSrc="/images/LogoGP.png" />
                        </PDFViewer>
                        <button className="btn btn-danger mt-3" onClick={() => setPdfData(null)}>Cerrar PDF</button>
                    </div>
                </div>
            )}
            {modalVisible && detalleCotizacion && (
                <DetalleCotizacionModal
                    detalle={detalleCotizacion}
                    onClose={() => {
                        setModalVisible(false);
                        setDetalleCotizacion(null);
                    }}
                    idCotizacion={detalleCotizacion[0]?.idcotizacion} // Pasa el ID de la cotización al modal
                />
            )}
            <div className="card">
                {/* <div className="card-header bg-primary text-white">
                    <Header title="Lista de Cotizaciones" />
                </div> */}
                <Header title="Lista de Cotizaciones" />
                <div className="card-body">
                    <div className="mb-3">
                        <div className="row g-3 align-items-center">
                            <div className="col-auto">
                                <label htmlFor="fechaInicio" className="form-label">Fecha Inicio:</label>
                            </div>
                            <div className="col-md-3">
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    id="fechaInicio"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                />
                            </div>
                            <div className="col-auto">
                                <label htmlFor="fechaFin" className="form-label">Fecha Fin:</label>
                            </div>
                            <div className="col-md-3">
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    id="fechaFin"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                />
                            </div>
                            <div className="col-auto">
                                <button className="btn btn-primary btn-sm" onClick={handleFiltrar}>Consultar</button>
                            </div>
                        </div>
                    </div>
                    {loading || !spanishTranslation ? (
                        <p className="text-center">Cargando cotizaciones...</p>
                    ) : (
                        <div className="table-responsive">
                            <DataTable
                                data={cotizaciones}
                                columns={columns}
                                options={{ ...options, language: spanishTranslation }}
                                className="table table-striped table-bordered table-hover table-sm"
                                ref={dtRef} // Asigna la referencia al componente DataTable
                            >
                                {/* <thead>
                                    <tr>
                                        <th>No. Cotización</th>
                                        <th>Fecha</th>
                                        <th>Forma Pago</th>
                                        <th>Total</th>
                                        <th>Costear</th>
                                        <th>Cliente</th>
                                        <th>Contacto</th>
                                        <th>Dirección Entrega</th>
                                        <th>Obsv. Costeo</th>
                                        <th>Obsv. Cliente</th>
                                        <th>Obsv. Vendedor</th>
                                        <th>Trabajo</th>
                                        <th>Versión</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead> */}
                            </DataTable>
                        </div>
                    )}
                </div>
                <div
                    className="mt-4 p-3 border rounded shadow-sm bg-light"
                    style={{ borderColor: "#ddd" }}
                >
                    <div className="d-flex flex-wrap gap-2 justify-content-between">
                        <Link
                            to="/cotizaciones/crear"
                            className="btn btn-success d-flex align-items-end justify-content-center gap-2 flex-fill"
                            style={{ minWidth: "150px" }}
                        >
                            <FaRegFileAlt /> Registro de Cotizaciones
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ListaCotizaciones;