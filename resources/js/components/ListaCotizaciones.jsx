import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import "bootstrap/dist/css/bootstrap.min.css"; // Importa los estilos de Bootstrap 5
import { Link, useNavigate } from "react-router-dom";
//import '../../css/ListaEmpleados.css';
//Funcionalidad para React PDF
import CotizacionPDF from "./CotizacionPDF"; // Importa el componente CotizacionPDF
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer"; // Importa PDFViewer
import alertify from "alertifyjs";
// import * as moment from 'moment';
import { format } from "date-fns";
import DetalleCotizacionModal from "./DetalleCotizacionModal"; // Importa el componente del modal de detalle de cotización
import "../../css/tableFormat.css";
import { FaRegFileAlt } from "react-icons/fa";
import Header from "./Header";
import NotaEnvioPDF from "./NotaEnvioPDF";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import * as bootstrap from "bootstrap";

DataTable.use(DT);

function ListaCotizaciones() {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [detalleCotizacion, setDetalleCotizacion] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null);
    const navigate = useNavigate(); // Hook para la navegación
    const [pdfData, setPdfData] = useState(null); // Estado para almacenar los datos del PDF
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [fechaHoy, setFechaHoy] = useState("");
    const dtRef = useRef(null); // Referencia al componente DataTable
    const [tableKey, setTableKey] = useState(0);
    const cotizacionesRef = useRef([]);
    const fechaInicioRef = useRef("");
    const fechaFinRef = useRef("");
    const [notaEnvioData, setNotaEnvioData] = useState(null);
    const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
    const [filtro, setFiltro] = useState("");
    const [motivosRechazo, setMotivosRechazo] = useState([]);
    const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
    const [motivoSeleccionado, setMotivoSeleccionado] = useState("");

    useEffect(() => {
        fetch("/i18n/Spanish.json")
            .then((response) => response.json())
            .then((data) => setSpanishTranslation(data))
            .catch((error) =>
                console.error("Error al cargar la traducción:", error)
            );

        // Establecer la fecha de hoy en el formato YYYY-MM-DD
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, "0");
        const dia = String(hoy.getDate()).padStart(2, "0");
        const fechaActual = `${año}-${mes}-${dia}`;
        setFechaInicio(fechaActual);
        setFechaFin(fechaActual);
        //setFechaHoy(fechaActual); // Guarda la fecha de hoy para la lógica inicial
        fetchCotizaciones(fechaActual, fechaActual); // Realizar la consulta inicial con la fecha de hoy
    }, []);

    //20250407 Código para enviar los parámetros de fecha

    const fetchCotizaciones = (startDate = "", endDate = "") => {
        setLoading(true);
        const token = localStorage.getItem("token");
        const params = new URLSearchParams();
        if (startDate) {
            params.append("fecha_inicio", startDate);
        }
        if (endDate) {
            params.append("fecha_fin", endDate);
        }

        if (token && startDate && endDate) {
            axios
                .get(`/api/cotizaciones?${params.toString()}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                .then((response) => {
                    setCotizaciones(response.data);
                    setTableKey((prev) => prev + 1);
                    setLoading(false);
                })
                .catch((error) => {
                    alertify.error("Error al obtener las cotizaciones.");
                    setLoading(false);
                });
        } else {
            setCotizaciones([]); // Limpiar las cotizaciones si no hay fechas
            setTableKey((prev) => prev + 1);
            setLoading(false);
            if (!token) {
                alertify.error("Token de autenticación no encontrado");
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
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const response = await axios.get(
                    `/api/cotizaciones/detalle/${id}`,
                    {
                        // Asegúrate de que esta ruta exista en tu API
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                const detalle = response.data;

                // 🔍 Obtener el estado desde cotizacionesRef
                const cotizacionSeleccionada = cotizacionesRef.current.find(
                    (c) => Number(c.idcotizacion) === Number(id)
                );

                if (!cotizacionSeleccionada) {
                    alertify.error(
                        "No se encontró el estado de la cotización."
                    );
                    return;
                }

                setDetalleCotizacion({
                    detalle,
                    estado: cotizacionSeleccionada.estado,
                });
                setModalVisible(true);
            } catch (error) {
                alertify.error("Error al obtener el detalle de la cotización.");
            } finally {
                setLoading(false);
            }
        } else {
            alertify.error("Token de autenticación no encontrado.");
            setLoading(false);
        }
    };

    useEffect(() => {
        cotizacionesRef.current = cotizaciones;
    }, [cotizaciones]);

    useEffect(() => {
        fechaInicioRef.current = fechaInicio;
    }, [fechaInicio]);

    useEffect(() => {
        fechaFinRef.current = fechaFin;
    }, [fechaFin]);

    const columns = [
        { data: "idcotizacion", title: "ID", visible: false },
        { data: "nocotizacion", title: "No.Cotizacion" },
        {
            data: "fecha_cotizacion",
            title: "Fecha",
            render: (data) => {
                if (data) {
                    try {
                        const date = new Date(data);
                        return format(date, "dd-MM-yyyy"); // Formatea la fecha al formato AAAA-MM-DD
                        // Otros formatos que podrías usar:
                        // return format(date, 'dd/MM/yyyy'); // Día/Mes/Año
                        // return format(date, 'MM/dd/yyyy'); // Mes/Día/Año
                    } catch (error) {
                        console.error("Error al formatear la fecha:", error);
                        return ""; // Devuelve una cadena vacía o algún otro valor en caso de error
                    }
                }
                return ""; // O algún otro valor por defecto si la fecha es nula
            },
        },
        { data: "tipo_pago", title: "Forma Pago" },
        // { data: 'total_general', title: 'Total' },
        {
            data: "total_general",
            title: "Total",
            render: (data) => {
                if (data !== null && data !== undefined) {
                    try {
                        // Formatea el número como moneda (Quetzales en Guatemala)
                        return Number(data).toLocaleString("es-GT", {
                            style: "currency",
                            currency: "GTQ",
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
                return ""; // O algún otro valor por defecto si el total es nulo o undefined
            },
        },
        { data: "costear", title: "Costear" },
        { data: "cliente", title: "Cliente" },
        { data: "contacto", title: "Contacto" },
        {
            data: "direccion_entrega",
            title: "Dirección entrega",
            visible: false,
        },
        { data: "observaciones_costeo", title: "Obsv.Costeo" },
        {
            data: "observaciones_cliente",
            title: "Obsv.Cliente",
            visible: false,
        },
        { data: "costeo_observaciones", title: "Obsv.Vendedor" },
        {
            data: "idcotizacionoriginal",
            title: "ID CotizacionOriginal",
            visible: false,
        },
        { data: "idcliente", title: "ID Cliente", visible: false },
        { data: "idcontacto", title: "ID Contacto", visible: false },
        { data: "trabajo", title: "Trabajo", visible: false },
        { data: "version", title: "Version", visible: false },
        { data: "estado", title: "Estado", visible: false },
        { data: "estado_texto", title: "Estado" },
    ];

    useEffect(() => {
        const handleButtonClick = async (event) => {
            const button = event.target.closest("button");
            if (!button) return; // Salir si no se hizo clic en un botón

            const id = button.getAttribute("data-id");
            const token = localStorage.getItem("token");

            if (button.classList.contains("editar-btn")) {
                navigate(`/cotizaciones/editar/${id}`);
            } else if (button.classList.contains("desactivar-btn")) {
                handleDesactivar(id);
            } else if (button.classList.contains("facturar-btn")) {
                const cotizacionSeleccionada = cotizacionesRef.current.find(
                    (c) => Number(c.idcotizacion) === Number(id)
                );

                handleFacturar(id, cotizacionSeleccionada, 4);
            } else if (button.classList.contains("facturacion-btn")) {
                const cotizacionSeleccionada = cotizacionesRef.current.find(
                    (c) => Number(c.idcotizacion) === Number(id)
                );

                handleFacturar(id, cotizacionSeleccionada, 5);
            } else if (button.classList.contains("pdf-btn")) {
                if (token) {
                    try {
                        const response = await fetch(
                            `/api/cotizaciones/${id}/pdf`,
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            }
                        );
                        const data = await response.json();
                        setPdfData(data);
                    } catch (error) {
                        alertify.error("Error al generar el PDF.");
                    }
                } else {
                    alertify.error("Token no encontrado para generar PDF.");
                }
            } else if (button.classList.contains("detalle-btn")) {
                obtenerDetalleCotizacion(id);
            } else if (button.classList.contains("nota-envio-btn")) {
                const token = localStorage.getItem("token");
                try {
                    const response = await fetch(
                        `/api/cotizaciones/${id}/nota-envio`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );

                    const data = await response.json();
                    if (response.ok) {
                        setNotaEnvioData(data); // 👈 Carga los datos para el PDF
                    } else {
                        alertify.error(
                            data.message ||
                                "No se pudo generar la nota de envío."
                        );
                    }
                } catch (err) {
                    alertify.error("Error al consultar la nota de envío.");
                }
            }
        };

        document.addEventListener("click", handleButtonClick);
        return () => document.removeEventListener("click", handleButtonClick);
    }, []);

    const options = {
        autoWidth: false, // Desactiva el autoajuste
        searching: false,
        //scrollX:true,
        columnDefs: [
            { targets: 0, width: "100px", targets: 2, width: "120px" }, // Ajusta la columna de acciones manualmente (índice 0 si es la primera visible)
        ],
        language: spanishTranslation, // Agrega la traducción aquí
        order: [[1, "desc"]], // Ordena por la segunda columna (índice 1, 'nocotizacion') de forma descendente
        rowCallback: (row, data) => {
            row.classList.remove(
                "estado-1",
                "estado-2",
                "estado-3",
                "estado-4",
                "estado-5",
                "estado-6",
                "estado-7",
                "estado-8"
            );

            if (data.estado) {
                row.classList.add(`estado-${data.estado}`);
            }

            // Manejo de selección de fila
            row.onclick = () => {
                const filas = row.parentNode.querySelectorAll("tr");
                filas.forEach((r) => r.classList.remove("selected"));
                row.classList.add("selected");
                setRegistroSeleccionado(data);
            };
        },
    };

    // const handleEditar = (id) => {
    //     navigate(`/cotizaciones/editar/${id}`);
    // };

    useEffect(() => {
        // Este useEffect se ejecutará después de que el estado cotizacion cambie.
        //console.log('Estado cotización actualizado:', cotizaciones);
    }, [cotizaciones]);

    useEffect(() => {
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.forEach((el) => {
            new bootstrap.Tooltip(el);
        });
    }, []);

    const limpiarFiltro = () => setFiltro("");
    /*
    Este handle se utiliza para cambiar el estado de 0 a 1 para los registros al eliminar
    */
    const handleDesactivar = (id) => {
        const token = localStorage.getItem("token");
        if (token) {
            axios
                .put(
                    `/api/cotizaciones/desactivar/${id}`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )
                .then(() => {
                    setCotizaciones((prevCotizaciones) => {
                        setTableKey((prev) => prev + 1);
                        //console.log('Empleados antes del filtro:', prevEmpleados); // Agrega esta línea
                        return prevCotizaciones.filter(
                            (cotizacion) =>
                                Number(cotizacion.idcotizacion) !== Number(id)
                        ); //convertimos a numero
                    });
                })
                .catch((error) => {
                    //console.error('Error al desactivar la cotizacion:', error);
                    alertify.error("Error al desactivar la cotizacion.");
                });
        }
    };

    const handleFacturar = (id, cotizacion, estado) => {
        if (!cotizacion) {
            alertify.alert(
                "Error",
                "No se encontró la cotización seleccionada."
            );
            return;
        }

        if (
            Number(cotizacion.total_general) === 0 &&
            Number(cotizacion.estado) > 3
        ) {
            alertify.alert(
                "TOTAL EN CERO",
                "No se puede enviar a pre-facturación una cotización con total igual a 0.00."
            );
            return;
        }

        if (Number(cotizacion.estado) === 5) {
            alertify.alert(
                "PRE-FACTURACIÓN",
                "El registro ya está en FACTURACIÓN, No se puede volver a enviar"
            );
            return;
        }

        if (Number(cotizacion.estado) > 5) {
            alertify.alert(
                "FACTURACIÓN",
                "El registro ya paso la etapa de FACTURACIÓN, No se puede volver a enviar"
            );
            return;
        }

        const token = localStorage.getItem("token");
        if (token) {
            axios
                .put(
                    `/api/cotizaciones/activarfacturacion/${id}`,
                    {
                        estado: estado,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )
                .then((response) => {
                    alertify.success(response.data.message);
                    fetchCotizaciones(
                        fechaInicioRef.current,
                        fechaFinRef.current
                    );
                })
                .catch((error) => {
                    error.response?.data?.message ||
                        "Ocurrió un error al actualizar la cotización.";
                });
        }
    };

    const generarPDF = async (id) => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado");
        try {
            const response = await fetch(`/api/cotizaciones/${id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setPdfData(data);
        } catch {
            alertify.error("Error al generar PDF.");
        }
    };

    const generarNotaEnvio = async (id) => {
        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`/api/cotizaciones/${id}/nota-envio`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) setNotaEnvioData(data);
            else alertify.error(data.message || "Error en nota de envío.");
        } catch {
            alertify.error("Error al consultar nota de envío.");
        }
    };

    const abrirModalRechazo = async () => {
        const token = localStorage.getItem("token");
        try {
            const { data } = await axios.get("/api/motivos-rechazo", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMotivosRechazo(data);
            setMostrarModalRechazo(true);
        } catch (error) {
            alertify.error("No se pudieron obtener los motivos de rechazo.");
        }
    };

    const confirmarRechazo = async () => {
        const token = localStorage.getItem("token");
        if (!motivoSeleccionado || !registroSeleccionado) {
            alertify.warning("Selecciona un motivo de rechazo.");
            return;
        }

        try {
            await axios.put(
                `/api/cotizaciones/rechazar/${registroSeleccionado.idcotizacion}`,
                { idmotivorechazo: motivoSeleccionado },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alertify.success("Cotización rechazada.");
            setMostrarModalRechazo(false);
            fetchCotizaciones(fechaInicioRef.current, fechaFinRef.current);
        } catch (error) {
            alertify.error(
                error.response?.data?.message || "Error al rechazar."
            );
        }
    };

    const estado = Number(registroSeleccionado?.estado);

    const puedeEditar = estado === 1 || estado === 3;
    const puedeEliminar = estado === 1;
    const puedePreFacturar = estado === 1 || estado === 3;
    const puedeFacturar = estado === 4;
    const puedeEnviarACosteo = estado === 1 || estado === 2;

    const cotizacionesFiltradas = cotizaciones.filter((cot) => {
        const texto = filtro.toLowerCase();
        return (
            cot.nocotizacion?.toLowerCase().includes(texto) ||
            cot.cliente?.toLowerCase().includes(texto) ||
            cot.total_general?.toString().includes(texto) ||
            cot.observaciones_costeo?.toLowerCase().includes(texto)
        );
    });

    return (
        <div className="mt-4 px-3 px-md-4">
            {pdfData && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                    }}
                >
                    <div style={{ width: "80%", height: "80%" }}>
                        <PDFViewer width="100%" height="100%">
                            <CotizacionPDF
                                cotizacion={pdfData.cotizacion}
                                totalEnLetras={pdfData.totalEnLetras}
                                logoSrc="/images/LogoGP.png"
                            />
                        </PDFViewer>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                        <PDFDownloadLink
                            document={
                                <CotizacionPDF
                                    cotizacion={pdfData.cotizacion}
                                    totalEnLetras={pdfData.totalEnLetras}
                                    logoSrc="/images/LogoGP.png"
                                />
                            }
                            fileName={`COTIZACION-${pdfData.cotizacion.nocotizacion}.pdf`}
                            className="btn btn-primary"
                        >
                            {({ loading }) =>
                                loading ? "Preparando PDF..." : "Descargar PDF"
                            }
                        </PDFDownloadLink>

                        <button
                            className="btn btn-danger"
                            onClick={() => setPdfData(null)}
                        >
                            Cerrar PDF
                        </button>
                    </div>
                </div>
            )}
            {notaEnvioData && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                    }}
                >
                    <div style={{ width: "80%", height: "80%" }}>
                        <PDFViewer width="100%" height="100%">
                            <NotaEnvioPDF data={notaEnvioData} />
                        </PDFViewer>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                        <PDFDownloadLink
                            document={<NotaEnvioPDF data={notaEnvioData} />}
                            fileName={`nota-envio-${notaEnvioData[0]?.noenvio}.pdf`}
                            className="btn btn-primary"
                        >
                            {({ loading }) =>
                                loading
                                    ? "Generando PDF..."
                                    : "Descargar Nota de Envío"
                            }
                        </PDFDownloadLink>

                        <button
                            className="btn btn-danger"
                            onClick={() => setNotaEnvioData(null)}
                        >
                            Cerrar PDF
                        </button>
                    </div>
                </div>
            )}
            {modalVisible && detalleCotizacion && (
                <DetalleCotizacionModal
                    detalle={detalleCotizacion.detalle}
                    estadoCotizacion={detalleCotizacion.estado}
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
                                <label
                                    htmlFor="fechaInicio"
                                    className="form-label"
                                >
                                    Fecha Inicio:
                                </label>
                            </div>
                            <div className="col-md-3">
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    id="fechaInicio"
                                    value={fechaInicio}
                                    onChange={(e) =>
                                        setFechaInicio(e.target.value)
                                    }
                                />
                            </div>
                            <div className="col-auto">
                                <label
                                    htmlFor="fechaFin"
                                    className="form-label"
                                >
                                    Fecha Fin:
                                </label>
                            </div>
                            <div className="col-md-3">
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    id="fechaFin"
                                    value={fechaFin}
                                    onChange={(e) =>
                                        setFechaFin(e.target.value)
                                    }
                                />
                            </div>
                            <div className="col-auto">
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleFiltrar}
                                >
                                    Consultar
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="mb-4 d-flex flex-wrap gap-2 align-items-center">
                        {/* Visible solo en pantallas grandes */}
                        <div className="d-none d-md-flex flex-wrap gap-2">
                            <button
                                className="btn btn-info btn-sm toolbar-btn"
                                disabled={!registroSeleccionado}
                                onClick={() =>
                                    obtenerDetalleCotizacion(
                                        registroSeleccionado?.idcotizacion
                                    )
                                }
                                // data-bs-toggle="tooltip"
                                // data-bs-placement="top"
                                // title="Abre una ventana con el detalle de la cotización"
                            >
                                <i className="fas fa-eye"></i> Detalle
                            </button>
                            <button
                                className="btn btn-success btn-sm toolbar-btn"
                                disabled={!registroSeleccionado || !puedeEditar}
                                onClick={() =>
                                    navigate(
                                        `/cotizaciones/editar/${registroSeleccionado?.idcotizacion}`
                                    )
                                }
                                // data-bs-toggle="tooltip"
                                // data-bs-placement="top"
                                // title="Abre el formulario de registro para cambiar datos"
                            >
                                <i className="fas fa-edit"></i> Editar
                            </button>
                            <button
                                className="btn btn-danger btn-sm toolbar-btn"
                                disabled={
                                    !registroSeleccionado || !puedeEliminar
                                }
                                onClick={() =>
                                    handleDesactivar(
                                        registroSeleccionado?.idcotizacion
                                    )
                                }
                                // data-bs-toggle="tooltip"
                                // data-bs-placement="top"
                                // title="Elimina el registro seleccionado"
                            >
                                <i className="fas fa-trash"></i> Eliminar
                            </button>
                            <button
                                className="btn btn-primary btn-sm toolbar-btn"
                                disabled={!registroSeleccionado}
                                onClick={() =>
                                    generarPDF(
                                        registroSeleccionado?.idcotizacion
                                    )
                                }
                                // data-bs-toggle="tooltip"
                                // data-bs-placement="top"
                                // title="Generar el PDF del registro seleccionado"
                            >
                                <i className="fas fa-file-pdf"></i> PDF
                            </button>
                            <button
                                className="btn btn-secondary btn-sm toolbar-btn"
                                disabled={
                                    !registroSeleccionado || !puedeEnviarACosteo
                                }
                                onClick={() =>
                                    handleFacturar(
                                        registroSeleccionado?.idcotizacion,
                                        registroSeleccionado,
                                        2
                                    )
                                }
                                // data-bs-toggle="tooltip"
                                // data-bs-placement="top"
                                // title="Envía el registro seleccionado a pre-facturación"
                            >
                                <i className="fas fa-paper-plane"></i> Enviar a
                                costeo
                            </button>
                            <button
                                className="btn btn-warning btn-sm toolbar-btn"
                                disabled={
                                    !registroSeleccionado || !puedePreFacturar
                                }
                                onClick={() =>
                                    handleFacturar(
                                        registroSeleccionado?.idcotizacion,
                                        registroSeleccionado,
                                        4
                                    )
                                }
                                // data-bs-toggle="tooltip"
                                // data-bs-placement="top"
                                // title="Envía el registro seleccionado a pre-facturación"
                            >
                                <i className="fas fa-paper-plane"></i>{" "}
                                Pre-Facturar
                            </button>
                            <button
                                className="btn btn-info btn-sm toolbar-btn"
                                disabled={
                                    !registroSeleccionado || !puedeFacturar
                                }
                                onClick={() =>
                                    handleFacturar(
                                        registroSeleccionado?.idcotizacion,
                                        registroSeleccionado,
                                        5
                                    )
                                }
                                // data-bs-toggle="tooltip"
                                // data-bs-placement="top"
                                // title="Indica a contabilidad que el registro ya se puede facturar"
                            >
                                <i className="fas fa-file-signature"></i>{" "}
                                Facturar
                            </button>
                            <button
                                className="btn btn-secondary btn-sm toolbar-btn"
                                disabled={!registroSeleccionado}
                                onClick={() =>
                                    generarNotaEnvio(
                                        registroSeleccionado?.idcotizacion
                                    )
                                }
                                // data-bs-toggle="tooltip"
                                // data-bs-placement="top"
                                // title="Generar la nota de envío"
                            >
                                <i className="fas fa-file-alt"></i> Nota Envío
                            </button>
                            <button
                                className="btn btn-dark btn-sm toolbar-btn"
                                disabled={
                                    !registroSeleccionado ||
                                    !(estado === 1 || estado === 3)
                                }
                                onClick={abrirModalRechazo}
                            >
                                <i className="fas fa-ban"></i> Rechazar
                            </button>
                        </div>

                        {/* Visible solo en pantallas pequeñas */}
                        <div className="dropdown d-md-none">
                            <button
                                className="btn btn-primary btn-sm dropdown-toggle"
                                type="button"
                                id="accionesDropdown"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                disabled={!registroSeleccionado}
                            >
                                Acciones
                            </button>
                            <ul
                                className="dropdown-menu"
                                aria-labelledby="accionesDropdown"
                            >
                                <li>
                                    <button
                                        className="dropdown-item"
                                        onClick={() =>
                                            obtenerDetalleCotizacion(
                                                registroSeleccionado?.idcotizacion
                                            )
                                        }
                                    >
                                        Detalle
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className="dropdown-item"
                                        onClick={() =>
                                            navigate(
                                                `/cotizaciones/editar/${registroSeleccionado?.idcotizacion}`
                                            )
                                        }
                                    >
                                        Editar
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className="dropdown-item"
                                        onClick={() =>
                                            handleDesactivar(
                                                registroSeleccionado?.idcotizacion
                                            )
                                        }
                                    >
                                        Eliminar
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className="dropdown-item"
                                        onClick={() =>
                                            generarPDF(
                                                registroSeleccionado?.idcotizacion
                                            )
                                        }
                                    >
                                        PDF
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className="dropdown-item"
                                        onClick={() =>
                                            handleFacturar(
                                                registroSeleccionado?.idcotizacion,
                                                registroSeleccionado
                                            )
                                        }
                                    >
                                        Pre-Facturar
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className="dropdown-item"
                                        onClick={() =>
                                            handleFacturacion(
                                                registroSeleccionado?.idcotizacion,
                                                registroSeleccionado
                                            )
                                        }
                                    >
                                        Facturar
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className="dropdown-item"
                                        onClick={() =>
                                            generarNotaEnvio(
                                                registroSeleccionado?.idcotizacion
                                            )
                                        }
                                    >
                                        Nota Envío
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className="btn btn-dark btn-sm toolbar-btn"
                                        disabled={
                                            !registroSeleccionado ||
                                            !(estado === 1 || estado === 3)
                                        }
                                        onClick={() => abrirModalRechazo()}
                                    >
                                        <i className="fas fa-ban"></i> Rechazar
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mb-3">
                        <label
                            htmlFor="buscador"
                            className="form-label fw-bold"
                        >
                            🔍 Buscar cotización:
                        </label>
                        <div className="input-group">
                            <input
                                type="text"
                                id="buscador"
                                className="form-control form-control-lg"
                                placeholder="Buscar por número, cliente, total, observación..."
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value)}
                            />
                            {filtro && (
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={limpiarFiltro}
                                >
                                    ✖
                                </button>
                            )}
                        </div>
                    </div>
                    {loading || !spanishTranslation ? (
                        <p className="text-center">Cargando cotizaciones...</p>
                    ) : (
                        <div
                            className="table-responsive"
                            style={{ overflowX: "auto" }}
                        >
                            <DataTable
                                key={tableKey}
                                data={cotizaciones.filter((cot) => {
                                    const texto = filtro.toLowerCase();
                                    return (
                                        cot.nocotizacion
                                            ?.toLowerCase()
                                            .includes(texto) ||
                                        cot.cliente
                                            ?.toLowerCase()
                                            .includes(texto) ||
                                        cot.total_general
                                            ?.toString()
                                            .includes(texto) ||
                                        cot.observaciones_costeo
                                            ?.toLowerCase()
                                            .includes(texto)
                                    );
                                })}
                                columns={columns}
                                options={{
                                    ...options,
                                    language: spanishTranslation,
                                }}
                                className="table table-bordered table-hover table-sm"
                                ref={dtRef} // Asigna la referencia al componente DataTable
                            ></DataTable>
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

            {mostrarModalRechazo && (
                <div
                    className="modal d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Motivo de Rechazo
                                </h5>
                                <button
                                    className="btn-close"
                                    onClick={() =>
                                        setMostrarModalRechazo(false)
                                    }
                                ></button>
                            </div>
                            <div className="modal-body">
                                <select
                                    className="form-select"
                                    value={motivoSeleccionado}
                                    onChange={(e) =>
                                        setMotivoSeleccionado(e.target.value)
                                    }
                                >
                                    <option value="">
                                        Selecciona un motivo
                                    </option>
                                    {motivosRechazo.map((m) => (
                                        <option
                                            key={m.idmotivorechazo}
                                            value={m.idmotivorechazo}
                                        >
                                            {m.motivo}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() =>
                                        setMostrarModalRechazo(false)
                                    }
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={confirmarRechazo}
                                >
                                    Rechazar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ListaCotizaciones;
