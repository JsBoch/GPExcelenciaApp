import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import "bootstrap/dist/css/bootstrap.min.css"; // Importa los estilos de Bootstrap 5
import { Link, useNavigate } from "react-router-dom";
//import '../../css/ListaEmpleados.css';
//Funcionalidad para React PDF
import PedidoPDF from "./PedidoPDF"; // Importa el componente CotizacionPDF
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer"; // Importa PDFViewer
import alertify from "alertifyjs";
// import * as moment from 'moment';
import { format } from "date-fns";
import DetallePedidoModal from "./DetallePedidoModal"; // Importa el componente del modal de detalle de cotización
import "../../css/tableFormat.css";
import { FaRegFileAlt } from "react-icons/fa";
import Header from "./Header";
import NotaEnvioPDF from "./NotaEnvioPDF";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import * as bootstrap from "bootstrap";

DataTable.use(DT);

function PedidosProduccionLista() {
    const [pedidoProduccion, setPedidoProduccion] = useState([]);
    const [detallePedidoProduccion, setDetallePedidoProduccion] =
        useState(null);
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
    const pedidosRef = useRef([]);
    const fechaInicioRef = useRef("");
    const fechaFinRef = useRef("");
    const [notaEnvioData, setNotaEnvioData] = useState(null);
    const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
    const [filtro, setFiltro] = useState("");
    const [detallePedido, setDetallePedido] = useState(null);
    // const [motivosRechazo, setMotivosRechazo] = useState([]);
    // const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
    // const [motivoSeleccionado, setMotivoSeleccionado] = useState("");

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
        fetchPedidosProduccion(fechaActual, fechaActual); // Realizar la consulta inicial con la fecha de hoy
    }, []);

    //20250407 Código para enviar los parámetros de fecha

    const fetchPedidosProduccion = (startDate = "", endDate = "") => {
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
                .get(`/api/pedidosproduccion?${params.toString()}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                .then((response) => {
                    setPedidoProduccion(response.data);
                    setTableKey((prev) => prev + 1);
                    setLoading(false);
                })
                .catch((error) => {
                    console.log("Error al obtener los pedidos:", error);
                    alertify.error("Error al obtener los pedidos.");
                    setLoading(false);
                });
        } else {
            setPedidoProduccion([]); // Limpiar las cotizaciones si no hay fechas
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
        fetchPedidosProduccion(fechaInicio, fechaFin);
    };

    const obtenerDetallePedido = async (id) => {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const response = await axios.get(
                    `/api/pedidosproduccion/detalle/${id}`,
                    {
                        // Asegúrate de que esta ruta exista en tu API
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                const detalle = response.data;

                // 🔍 Obtener el estado desde cotizacionesRef
                const pedidoSeleccionado = pedidosRef.current.find(
                    (c) => Number(c.idpedidoproduccion) === Number(id)
                );

                if (!pedidoSeleccionado) {
                    alertify.error("No se encontró el estado del pedido.");
                    return;
                }

                setDetallePedidoProduccion({
                    detalle,
                    estado: pedidoSeleccionado.estado,
                });
                setModalVisible(true);
            } catch (error) {
                alertify.error("Error al obtener el detalle del pedido.");
            } finally {
                setLoading(false);
            }
        } else {
            alertify.error("Token de autenticación no encontrado.");
            setLoading(false);
        }
    };

    useEffect(() => {
        pedidosRef.current = pedidoProduccion;
    }, [pedidoProduccion]);

    useEffect(() => {
        fechaInicioRef.current = fechaInicio;
    }, [fechaInicio]);

    useEffect(() => {
        fechaFinRef.current = fechaFin;
    }, [fechaFin]);

    const columns = [
        { data: "idpedidoproduccion", title: "ID", visible: false },
        { data: "nopedido", title: "No.Pedido" },
        {
            data: "fecha_pedido",
            title: "Fecha Pedido",
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
        {
            data: "fecha_entrega",
            title: "Fecha Entrega",
            render: (data) => {
                if (data) {
                    try {
                        const date = new Date(data);
                        return format(date, "dd-MM-yyyy");
                    } catch (error) {
                        console.error("Error al formatear la fecha:", error);
                        return "";
                    }
                }
                return "";
            },
        },
        { data: "cliente", title: "Cliente" },
        { data: "asesor", title: "Asesor" },
        { data: "direccion_entrega", title: "Dirección Entrega" },
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
                navigate(`/pedidosproduccion/editar/${id}`);
            } else if (button.classList.contains("desactivar-btn")) {
                handleDesactivar(id);
            } else if (button.classList.contains("facturar-btn")) {
                const pedidoSeleccionado = pedidosRef.current.find(
                    (c) => Number(c.idpedidoproduccion) === Number(id)
                );

                handleFacturar(id, pedidoSeleccionado, 4);
            } else if (button.classList.contains("facturacion-btn")) {
                const pedidoSeleccionado = pedidosRef.current.find(
                    (c) => Number(c.idpedidoproduccion) === Number(id)
                );

                handleFacturar(id, pedidoSeleccionado, 5);
            } else if (button.classList.contains("pdf-btn")) {
                if (token) {
                    try {
                        const response = await fetch(
                            `/api/pedidosproduccion/${id}/pdf`,
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
                        `/api/pedidosproduccion/${id}/nota-envio`,
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
    }, [pedidoProduccion]);

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
        alertify.confirm(
            "Confirmación",
            "¿Está segur@ de que desea eliminar el pedido seleccionado?",
            function () {
                // Confirmado
                const token = localStorage.getItem("token");
                if (token) {
                    axios
                        .put(
                            `/api/pedidosproduccion/desactivar/${id}`,
                            {},
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            }
                        )
                        .then(() => {
                            setPedidoProduccion((prevPedidos) => {
                                setTableKey((prev) => prev + 1);
                                return prevPedidos.filter(
                                    (pedido) =>
                                        Number(pedido.idpedidoproduccion) !==
                                        Number(id)
                                );
                            });
                            alertify.success(
                                "Pedido eliminado correctamente."
                            );
                        })
                        .catch((error) => {
                            alertify.error("Error al eliminar el pedido.");
                        });
                }
            },
            function () {
                // Cancelado
                alertify.message("Acción cancelada");
            }
        );
    };

    // const handleFacturar = (id, pedidoProduccion, estado) => {
    //     if (!pedidoProduccion) {
    //         alertify.alert("Error", "No se encontró el pedido.");
    //         return;
    //     }

    //     if (
    //         Number(pedidoProduccion.total_general) === 0 &&
    //         Number(pedidoProduccion.estado) > 3
    //     ) {
    //         alertify.alert(
    //             "TOTAL EN CERO",
    //             "No se puede enviar a pre-facturación un pedido con total igual a 0.00."
    //         );
    //         return;
    //     }

    //     if (Number(pedidoProduccion.estado) === 5) {
    //         alertify.alert(
    //             "PRE-FACTURACIÓN",
    //             "El registro ya está en FACTURACIÓN, No se puede volver a enviar"
    //         );
    //         return;
    //     }

    //     if (Number(pedidoProduccion.estado) > 5) {
    //         alertify.alert(
    //             "FACTURACIÓN",
    //             "El registro ya paso la etapa de FACTURACIÓN, No se puede volver a enviar"
    //         );
    //         return;
    //     }

    //     const token = localStorage.getItem("token");
    //     if (token) {
    //         axios
    //             .put(
    //                 `/api/pedidosproduccion/activarfacturacion/${id}`,
    //                 {
    //                     estado: estado,
    //                 },
    //                 {
    //                     headers: {
    //                         Authorization: `Bearer ${token}`,
    //                     },
    //                 }
    //             )
    //             .then((response) => {
    //                 alertify.success(response.data.message);
    //                 fetchPedidosProduccion(
    //                     fechaInicioRef.current,
    //                     fechaFinRef.current
    //                 );
    //             })
    //             .catch((error) => {
    //                 error.response?.data?.message ||
    //                     "Ocurrió un error al actualizar el pedido.";
    //             });
    //     }
    // };

    const generarPDF = async (id) => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado");
        try {
            const response = await fetch(`/api/pedidosproduccion/${id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setPdfData(data);
        } catch(error) {
            console.error("Error al generar PDF:", error);
            alertify.error("Error al generar PDF.");
        }
    };

    // const generarNotaEnvio = async (id) => {
    //     const token = localStorage.getItem("token");
    //     try {
    //         const response = await fetch(
    //             `/api/pedidosproduccion/${id}/nota-envio`,
    //             {
    //                 headers: { Authorization: `Bearer ${token}` },
    //             }
    //         );
    //         const data = await response.json();
    //         if (response.ok) setNotaEnvioData(data);
    //         else alertify.error(data.message || "Error en nota de envío.");
    //     } catch {
    //         alertify.error("Error al consultar nota de envío.");
    //     }
    // };

    // const abrirModalRechazo = async () => {
    //     const token = localStorage.getItem("token");
    //     try {
    //         const { data } = await axios.get("/api/motivos-rechazo", {
    //             headers: { Authorization: `Bearer ${token}` },
    //         });
    //         setMotivosRechazo(data);
    //         setMostrarModalRechazo(true);
    //     } catch (error) {
    //         alertify.error("No se pudieron obtener los motivos de rechazo.");
    //     }
    // };

    // const confirmarRechazo = async () => {
    //     const token = localStorage.getItem("token");
    //     if (!motivoSeleccionado || !registroSeleccionado) {
    //         alertify.warning("Selecciona un motivo de rechazo.");
    //         return;
    //     }

    //     try {
    //         await axios.put(
    //             `/api/cotizaciones/rechazar/${registroSeleccionado.idcotizacion}`,
    //             { idmotivorechazo: motivoSeleccionado },
    //             { headers: { Authorization: `Bearer ${token}` } }
    //         );
    //         alertify.success("Cotización rechazada.");
    //         setMostrarModalRechazo(false);
    //         fetchCotizaciones(fechaInicioRef.current, fechaFinRef.current);
    //     } catch (error) {
    //         alertify.error(
    //             error.response?.data?.message || "Error al rechazar."
    //         );
    //     }
    // };

    const obtenerDetalleCotizacion = async (id) => {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const response = await axios.get(
                    `/api/pedidosproduccion/detalle/${id}`,
                    {
                        // Asegúrate de que esta ruta exista en tu API
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                const detalle = response.data;

                // 🔍 Obtener el estado desde pedidosRef
                const pedidoSeleccionado = pedidosRef.current.find(
                    (c) => Number(c.idpedidoproduccion) === Number(id)
                );

                if (!pedidoSeleccionado) {
                    alertify.error("No se encontró el estado del pedido.");
                    return;
                }

                setDetallePedido({
                    detalle,
                    estado: pedidoSeleccionado.estado,
                    nopedido: pedidoSeleccionado.nopedido,
                });
                setModalVisible(true);
            } catch (error) {
                console.log(error);
                alertify.error("Error al obtener el detalle de la cotización.");
            } finally {
                setLoading(false);
            }
        } else {
            alertify.error("Token de autenticación no encontrado.");
            setLoading(false);
        }
    };

    const estado = Number(registroSeleccionado?.estado);

    const puedeEditar = estado === 1 || estado === 3;
    const puedeEliminar = estado === 1;
    const puedePreFacturar = estado === 1 || estado === 3;
    const puedeFacturar = estado === 4;
    const puedeEnviarACosteo = estado === 1 || estado === 2;

    const pedidosFiltrados = pedidoProduccion.filter((cot) => {
        const texto = filtro.toLowerCase();
        return (
            cot.nopedido?.toLowerCase().includes(texto) ||
            cot.cliente?.toLowerCase().includes(texto) ||
            cot.asesor?.toString().includes(texto) ||
            cot.fecha_entrega?.toLowerCase().includes(texto)
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
                            <PedidoPDF
                                pedido={pdfData.pedido}
                                totalEnLetras={pdfData.totalEnLetras}
                                logoSrc="/images/LogoGP.png"
                            />
                        </PDFViewer>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                        <PDFDownloadLink
                            document={
                                <PedidoPDF
                                    pedido={pdfData.pedido}
                                    totalEnLetras={pdfData.totalEnLetras}
                                    logoSrc="/images/LogoGP.png"
                                />
                            }
                            fileName={`PEDIDO-${pdfData.pedido.nopedido}.pdf`}
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
            {/* {notaEnvioData && (
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
            )} */}
            {modalVisible && detallePedido && (
                <DetallePedidoModal
                    detalle={detallePedido.detalle}
                    estadoPedido={detallePedido.estado}
                    nopedido={detallePedido.nopedido}
                    onClose={() => {
                        setModalVisible(false);
                        setDetallePedido(null);
                    }}
                    idpedidoproduccion={
                        detallePedido.detalle[0]?.idpedidoproduccion
                    } // Pasa el ID del pedido al modal
                />
            )}
            <div className="card">
                {/* <div className="card-header bg-primary text-white">
                    <Header title="Lista de Cotizaciones" />
                </div> */}
                <Header title="Lista de Pedidos" />
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
                                        registroSeleccionado?.idpedidoproduccion
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
                                        `/pedidosproduccion/editar/${registroSeleccionado?.idpedidoproduccion}`
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
                                        registroSeleccionado?.idpedidoproduccion
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
                                        registroSeleccionado?.idpedidoproduccion
                                    )
                                }
                                // data-bs-toggle="tooltip"
                                // data-bs-placement="top"
                                // title="Generar el PDF del registro seleccionado"
                            >
                                <i className="fas fa-file-pdf"></i> PDF
                            </button>
                            {/* <button
                                className="btn btn-secondary btn-sm toolbar-btn"
                                disabled={
                                    !registroSeleccionado || !puedeEnviarACosteo
                                }
                                onClick={() =>
                                    handleFacturar(
                                        registroSeleccionado?.idpedidoproduccion,
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
                                        registroSeleccionado?.idpedidoproduccion,
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
                                        registroSeleccionado?.idpedidoproduccion,
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
                                        registroSeleccionado?.idpedidoproduccion
                                    )
                                }
                                // data-bs-toggle="tooltip"
                                // data-bs-placement="top"
                                // title="Generar la nota de envío"
                            >
                                <i className="fas fa-file-alt"></i> Nota Envío
                            </button> */}
                            {/* <button
                                className="btn btn-dark btn-sm toolbar-btn"
                                disabled={
                                    !registroSeleccionado ||
                                    !(estado === 1 || estado === 3)
                                }
                                onClick={abrirModalRechazo}
                            >
                                <i className="fas fa-ban"></i> Rechazar
                            </button> */}
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
                                            obtenerDetallePedido(
                                                registroSeleccionado?.idpedidoproduccion
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
                                                `/pedidosproduccion/editar/${registroSeleccionado?.idpedidoproduccion}`
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
                                                registroSeleccionado?.idpedidoproduccion
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
                                                registroSeleccionado?.idpedidoproduccion
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
                                                registroSeleccionado?.idpedidoproduccion,
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
                                                registroSeleccionado?.idpedidoproduccion,
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
                                                registroSeleccionado?.idpedidoproduccion
                                            )
                                        }
                                    >
                                        Nota Envío
                                    </button>
                                </li>
                                {/* <li>
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
                                </li> */}
                            </ul>
                        </div>
                    </div>
                    <div className="mb-3">
                        <label
                            htmlFor="buscador"
                            className="form-label fw-bold"
                        >
                            🔍 Buscar pedido:
                        </label>
                        <div className="input-group">
                            <input
                                type="text"
                                id="buscador"
                                className="form-control form-control-lg"
                                placeholder="Buscar por número, cliente, asesor..."
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
                        <p className="text-center">Cargando pedidos...</p>
                    ) : (
                        <div
                            className="table-responsive"
                            style={{ overflowX: "auto" }}
                        >
                            <DataTable
                                key={tableKey}
                                data={pedidoProduccion.filter((cot) => {
                                    const texto = filtro.toLowerCase();
                                    return (
                                        cot.nopedido
                                            ?.toLowerCase()
                                            .includes(texto) ||
                                        cot.cliente
                                            ?.toLowerCase()
                                            .includes(texto) ||
                                        cot.asesor?.toString().includes(texto)
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
                            to="/pedidosproduccion/crear"
                            className="btn btn-success d-flex align-items-end justify-content-center gap-2 flex-fill"
                            style={{ minWidth: "150px" }}
                        >
                            <FaRegFileAlt /> Registro de Pedidos
                        </Link>
                    </div>
                </div>
            </div>

            {/* {mostrarModalRechazo && (
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
            )} */}
        </div>
    );
}

export default PedidosProduccionLista;
