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
import { format } from 'date-fns';
import '../../css/tableFormat.css';
import { FaSearch } from "react-icons/fa";
import Header from './Header';

DataTable.use(DT);

function MonitorFacturacion() {
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
            axios.get('/api/monitorfacturacion', {
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
        {
            data: 'idcotizacion',
            title: 'Acciones',
            render: (data) => {
                return `      
                <div class="d-flex gap-1 justify-content-center align-items-center">      
            <button class="btn btn-danger btn-sm desactivar-btn" data-id="${data}" title="Regresar a venta">
            <i class="fas fa-file-invoice-dollar"></i>
            </button>
            <button class="btn btn-success btn-sm pdf-btn" data-id="${data}" title="Generar PDF">
            <i class="fas fa-file-pdf"></i>
            </button>
            </div>`;
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
        { data: 'tipo_pago', title: 'Forma Pago' },
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
        { data: 'costear', title: 'Costear', visible: false },
        { data: 'cliente', title: 'Cliente' },
        { data: 'contacto', title: 'Contacto', visible: false },
        { data: 'direccion_entrega', title: 'Dirección entrega', visible: false },
        { data: 'observaciones_costeo', title: 'Obsv.Costeo', visible: false },
        { data: 'observaciones_cliente', title: 'Obsv.Cliente', visible: false },
        { data: 'costeo_observaciones', title: 'Obsv.Vendedor', visible: false },
        { data: 'idcotizacionoriginal', title: 'ID CotizacionOriginal', visible: false },
        { data: 'idcliente', title: 'ID Cliente', visible: false },
        { data: 'idcontacto', title: 'ID Contacto', visible: false },
        { data: 'trabajo', title: 'Trabajo', visible: false },
        { data: 'version', title: 'Version', visible: false },
    ];

    useEffect(() => {
        const handleButtonClick = async (event) => {
            const button = event.target.closest('button');
            if (!button) return; // Salir si no se hizo clic en un botón

            const id = button.getAttribute('data-id');
            const token = localStorage.getItem('token'); // Recupera el token del localStorage

            if (button.classList.contains('desactivar-btn')) {
                handleDesactivar(id);
            } else if (button.classList.contains('pdf-btn')) {
                if (token) {
                    try {
                        const response = await fetch(`/api/monitorfacturacion/${id}/pdf`, {
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

    // useEffect(() => {
    //     // Este useEffect se ejecutará después de que el estado cotizacion cambie.
    //     //console.log('Estado cotización actualizado:', cotizaciones);
    // }, [cotizaciones]);
    /*
    Este handle se utiliza para cambiar el estado de 0 a 1 para los registros al eliminar
    */
    const handleDesactivar = (id) => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.put(`/api/monitorfacturacion/desactivar/${id}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(() => {
                    setCotizaciones(prevCotizaciones => {
                        //console.log('Empleados antes del filtro:', prevEmpleados); // Agrega esta línea
                        return prevCotizaciones.filter(cotizacion => Number(cotizacion.idcotizacion) !== Number(id)); //convertimos a numero
                    });
                    alertify.success('Cotización regresada a ventas.');
                })
                .catch((error) => {
                    //console.error('Error al desactivar la cotizacion:', error);
                    alertify.error('Error al volver la cotización a ventas.');
                });
        }
    };

    const fetchCotizaciones = () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
       
        if (token) {
            axios.get(`/api/monitorfacturacion`, {
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
        fetchCotizaciones();
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
                {/* <div className="card-header bg-primary text-white">
                    <h2 className="text-center mb-0">Lista de Cotizaciones para facturar</h2>
                </div> */}
                <Header title="Lista de Cotizaciones para facturar" />
                <div className="mb-3">
                        <div className="row g-3 align-items-center">                            
                            <div className="col-auto">
                                <button className="btn btn-success d-flex align-items-center justify-content-center gap-2 flex-fill mt-3" onClick={handleFiltrar}
                                style={{ width: "150px" }}>
                                    <FaSearch /> Consultar
                                    </button>
                            </div>
                        </div>
                    </div>
                <div className="card-body">
                    {loading || !spanishTranslation ? (
                        <p className="text-center">Cargando cotizaciones...</p>
                    ) : (
                        <div className="table-responsive">
                            <DataTable
                                data={cotizaciones}
                                columns={columns}
                                options={{ ...options, language: spanishTranslation }}
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
                                        {/* <th>Obsv. Costeo</th> */}
                                        <th>Obsv. Cliente</th>
                                        {/* <th>Obsv. Vendedor</th> */}
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
            </div>
        </div>
    );
}

export default MonitorFacturacion;