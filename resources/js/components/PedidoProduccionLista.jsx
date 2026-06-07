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
import NotaEnvioPDFHalf from "./NotaEnvioPDFHalf";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import * as bootstrap from "bootstrap";
import DetallePedidoVistaModal from "./DetallePedidoVistaModal";
import PedidoProduccionPDF from "./PedidoProduccionPDF";

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
    const [areasPedido, setAreasPedido] = useState([]);
    const [modalAreasVisible, setModalAreasVisible] = useState(false);
    const [documentosPedido, setDocumentosPedido] = useState([]);
    const [tituloDocumentos, setTituloDocumentos] = useState("");
    const [modalDocumentosVisible, setModalDocumentosVisible] = useState(false);
    const [justificacionDocumento, setJustificacionDocumento] = useState("");
    const [notaEnvioPayload, setNotaEnvioPayload] = useState(null);
    const [fechaActual, setFechaActual] = useState("");

    useEffect(() => {
        fetch("/i18n/Spanish.json")
            .then((response) => response.json())
            .then((data) => setSpanishTranslation(data))
            .catch((error) =>
                console.error("Error al cargar la traducción:", error),
            );
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, { headers })
            .then((res) => {
                setFechaActual(res.data.fecha);
                setFechaInicio(res.data.fecha);
                setFechaFin(res.data.fecha);
                fetchPedidosProduccion(res.data.fecha, res.data.fecha);
            })
            .catch(() => {
                const localDate = new Date().toISOString().split("T")[0];
                setFechaActual(localDate); // fallback
                setFechaInicio(fechaActual);
                setFechaFin(fechaActual);
                fetchPedidosProduccion(fechaActual, fechaActual);
            });
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
                    },
                );
                const detalle = response.data;

                // 🔍 Obtener el estado desde cotizacionesRef
                const pedidoSeleccionado = pedidosRef.current.find(
                    (c) => Number(c.idpedidoproduccion) === Number(id),
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
        { data: "nopedido_num", visible: false },

        { data: "nopedido", title: "No.Pedido", width: "140px" },

        {
            data: "fecha_pedido",
            title: "Fecha Pedido",
            render: (data) => {
                if (!data) return "";

                try {
                    return format(new Date(data), "dd-MM-yyyy");
                } catch {
                    return "";
                }
            },
        },

        {
            data: "fecha_entrega",
            title: "Fecha Entrega",
            render: (data) => {
                if (!data) return "";

                try {
                    return format(new Date(data), "dd-MM-yyyy");
                } catch {
                    return "";
                }
            },
        },
        {
            data: "no_envio_asociado",
            title: "No. Envío",
            width: "90px",
            render: (data) => {
                return data
                    ? `<span class="badge bg-primary">${data}</span>`
                    : `<span class="badge bg-secondary">N/A</span>`;
            },
        },

        { data: "cliente", title: "Cliente" },
        { data: "asesor", title: "Asesor" },
        {
            data: "direccion_entrega",
            title: "Dirección Entrega",
            visible: false,
        },

        {
            data: "permisos_estado",
            title: "📄 Permisos",
            render: (data) => {
                if (data === "ADJUNTADO") {
                    return `
                    <span class="badge bg-success">
                        ADJUNTADO
                    </span>
                `;
                }

                if (data === "PENDIENTE") {
                    return `
                    <span class="badge bg-warning text-dark">
                        PENDIENTE
                    </span>
                `;
                }

                return `
                <span class="badge bg-secondary">
                    SIN DEFINIR
                </span>
            `;
            },
        },

        {
            data: "requiere_instalacion",
            title: "🛠 Instalación",
            render: (data) => {
                return data === "S"
                    ? `
                    <span class="badge bg-primary">
                        SI
                    </span>
                `
                    : `
                    <span class="badge bg-secondary">
                        NO
                    </span>
                `;
            },
        },

        {
            data: null,
            title: "🖼 Montajes",
            render: (_, __, row) => {
                if (row.requiere_instalacion !== "S") {
                    return `
                    <span class="badge bg-dark">
                        N/A
                    </span>
                `;
                }

                if (row.montajes_estado === "ADJUNTADO") {
                    return `
                    <span class="badge bg-success">
                        ADJUNTADO
                    </span>
                `;
                }

                if (row.montajes_estado === "PENDIENTE") {
                    return `
                    <span class="badge bg-warning text-dark">
                        PENDIENTE
                    </span>
                `;
                }

                return `
                <span class="badge bg-secondary">
                    SIN DEFINIR
                </span>
            `;
            },
        },

        {
            data: "requiere_entrega",
            title: "🚚 Entrega",
            render: (data) => {
                return data === "S"
                    ? `
                    <span class="badge bg-info text-dark">
                        SI
                    </span>
                `
                    : `
                    <span class="badge bg-secondary">
                        NO
                    </span>
                `;
            },
        },

        { data: "trabajo", title: "Trabajo", visible: false },
        { data: "version", title: "Version", visible: false },
        { data: "estado", title: "Estado", visible: false },

        {
            data: "estado_texto",
            title: "Estado",
            render: (data) => {
                let color = "secondary";

                if (data === "REGISTRADO") color = "primary";

                if (data === "AUTORIZACION") color = "warning";

                return `
            <span class="badge bg-${color}">
                ${data}
            </span>
        `;
            },
        },
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
                    (c) => Number(c.idpedidoproduccion) === Number(id),
                );

                handleFacturar(id, pedidoSeleccionado, 4);
            } else if (button.classList.contains("facturacion-btn")) {
                const pedidoSeleccionado = pedidosRef.current.find(
                    (c) => Number(c.idpedidoproduccion) === Number(id),
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
                            },
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
                        },
                    );

                    const data = await response.json();
                    if (response.ok) {
                        setNotaEnvioData(data); // 👈 Carga los datos para el PDF
                    } else {
                        alertify.error(
                            data.message ||
                                "No se pudo generar la nota de envío.",
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
        order: [[1, "desc"]],
        scrollX: false,
        columnDefs: [
            { targets: 0, width: "100px" },
            { targets: 2, width: "120px" },
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
                "estado-8",
            );

            if (data.estado) {
                row.classList.add(`estado-${data.estado}`);
            }

            if (
                registroSeleccionado &&
                Number(registroSeleccionado.idpedidoproduccion) ===
                    Number(data.idpedidoproduccion)
            ) {
                row.classList.add("selected");
            }

            // Manejo de selección de fila
            row.style.cursor = "pointer";

            row.onclick = null;

            row.addEventListener("click", () => {
                const tbody = row.closest("tbody");

                if (!tbody) return;

                tbody.querySelectorAll("tr").forEach((r) => {
                    r.classList.remove("selected");
                });

                row.classList.add("selected");
                setRegistroSeleccionado(data);
            });
        },
    };

    useEffect(() => {
        // Este useEffect se ejecutará después de que el estado cotizacion cambie.
        //console.log('Estado cotización actualizado:', cotizaciones);
    }, [pedidoProduccion]);

    useEffect(() => {
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]'),
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
                            },
                        )
                        .then(() => {
                            setPedidoProduccion((prevPedidos) => {
                                setTableKey((prev) => prev + 1);
                                return prevPedidos.filter(
                                    (pedido) =>
                                        Number(pedido.idpedidoproduccion) !==
                                        Number(id),
                                );
                            });
                            alertify.success("Pedido eliminado correctamente.");
                        })
                        .catch((error) => {
                            alertify.error("Error al eliminar el pedido.");
                        });
                }
            },
            function () {
                // Cancelado
                alertify.message("Acción cancelada");
            },
        );
    };

    const generarPDF = async (id) => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado");
        try {
            const response = await fetch(`/api/pedidosproduccion/${id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setPdfData(data);
        } catch (error) {
            console.error("Error al generar PDF:", error);
            alertify.error("Error al generar PDF.");
        }
    };

    const obtenerAreasPedido = async (id) => {
        const token = localStorage.getItem("token");

        if (!token) {
            alertify.error("Token no encontrado");
            return;
        }

        try {
            const response = await axios.get(
                `/api/pedidosproduccion/${id}/areas`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setAreasPedido(response.data);
            setModalAreasVisible(true);
        } catch (error) {
            console.error(error);
            alertify.error("Error al obtener áreas del pedido");
        }
    };

    const verPermisos = async () => {
        try {
            const token = localStorage.getItem("token");

            const response = await axios.get(
                `/api/pedidosproduccion/${registroSeleccionado.idpedidoproduccion}/permisos`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setTituloDocumentos("Permisos");
            setDocumentosPedido(response.data);
            setJustificacionDocumento(
                registroSeleccionado?.permisos_estado === "PENDIENTE"
                    ? registroSeleccionado?.permisos_justificacion || ""
                    : "",
            );
            setModalDocumentosVisible(true);
        } catch (error) {
            console.error(error);
            alertify.error("Error al obtener permisos.");
        }
    };

    const verMontajes = async () => {
        try {
            const token = localStorage.getItem("token");

            const response = await axios.get(
                `/api/pedidosproduccion/${registroSeleccionado.idpedidoproduccion}/montajes`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setTituloDocumentos("Montajes");
            setDocumentosPedido(response.data);
            setJustificacionDocumento(
                registroSeleccionado?.montajes_estado === "PENDIENTE"
                    ? registroSeleccionado?.montajes_justificacion || ""
                    : "",
            );
            setModalDocumentosVisible(true);
        } catch (error) {
            console.error(error);
            alertify.error("Error al obtener montajes.");
        }
    };

    const verNotaEnvio = async () => {
        try {
            const token = localStorage.getItem("token");

            const response = await axios.post(
                `/api/cotizaciones/${registroSeleccionado.idcotizacion}/nota-envio/reimprimir`,
                {
                    no_envio: Number(registroSeleccionado.no_envio_asociado),
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setNotaEnvioPayload(response.data);
        } catch (error) {
            console.error(error);

            alertify.error("No se pudo generar la nota de envío.");
        }
    };

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
                    },
                );
                const detalle = response.data;

                // 🔍 Obtener el estado desde pedidosRef
                const pedidoSeleccionado = pedidosRef.current.find(
                    (c) => Number(c.idpedidoproduccion) === Number(id),
                );

                if (!pedidoSeleccionado) {
                    alertify.error("No se encontró el estado del pedido.");
                    return;
                }

                setDetallePedido({
                    detalle,
                    pedido: pedidoSeleccionado,
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

    const exportarExcel = async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            alertify.error("Sesión no válida");
            return;
        }

        if (!registroSeleccionado) {
            alertify.warning("Debe seleccionar un pedido");
            return;
        }

        try {
            const response = await axios.get(
                "/api/pedidosproduccion/export/excel",
                {
                    params: {
                        idpedidoproduccion:
                            registroSeleccionado.idpedidoproduccion,
                    },
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                    responseType: "blob",
                },
            );

            const blob = new Blob([response.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `PEDIDO_${registroSeleccionado.nopedido}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alertify.error("Error al exportar Excel");
        }
    };

    const estado = Number(registroSeleccionado?.estado);

    const puedeEditar = estado === 1;
    const puedeEliminar = estado === 1;
    const puedePreFacturar = estado === 1 || estado === 3;
    const puedeFacturar = estado === 4;
    const puedeEnviarACosteo = estado === 1 || estado === 2;

    const pedidosFiltrados = pedidoProduccion.filter((cot) => {
        const texto = filtro.toLowerCase();
        return (
            String(cot.nopedido ?? "")
                .toLowerCase()
                .includes(texto) ||
            cot.cliente?.toLowerCase().includes(texto) ||
            cot.asesor?.toString().includes(texto) ||
            cot.fecha_entrega?.toLowerCase().includes(texto)
        );
    });

    const itemsNotaEnvio = notaEnvioPayload?.items ?? [];

    const useHalfLetter = itemsNotaEnvio.length <= 8;

    const PdfComponent = useHalfLetter ? NotaEnvioPDFHalf : NotaEnvioPDF;

    const pasarAutorizacion = async () => {
        alertify.confirm(
            "Confirmación",
            "¿Desea enviar este pedido a autorización?",
            async () => {
                try {
                    const token = localStorage.getItem("token");

                    await axios.put(
                        `/api/pedidosproduccion/pasar-autorizacion/${registroSeleccionado.idpedidoproduccion}`,
                        {},
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        },
                    );

                    alertify.success("Pedido enviado a autorización");

                    fetchPedidosProduccion(fechaInicio, fechaFin);
                } catch (error) {
                    console.error(error);

                    alertify.error(
                        error?.response?.data?.message ||
                            "Error al actualizar estado",
                    );
                }
            },
            () => {},
        );
    };

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
                            <PedidoProduccionPDF
                                pedido={pdfData.pedido}
                                //totalEnLetras={pdfData.totalEnLetras}
                                logoSrc="/images/LogoGP.png"
                            />
                        </PDFViewer>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                        <PDFDownloadLink
                            document={
                                <PedidoProduccionPDF
                                    pedido={pdfData.pedido}
                                    //totalEnLetras={pdfData.totalEnLetras}
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

            {notaEnvioPayload && (
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
                    <div
                        style={{
                            width: "80%",
                            height: "80%",
                        }}
                    >
                        <PDFViewer width="100%" height="100%">
                            <PdfComponent data={notaEnvioPayload} />
                        </PDFViewer>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                        <PDFDownloadLink
                            document={<PdfComponent data={notaEnvioPayload} />}
                            fileName={`nota-envio-${notaEnvioPayload.no_envio}.pdf`}
                            className="btn btn-primary"
                        >
                            {({ loading }) =>
                                loading ? "Generando PDF..." : "Descargar Nota"
                            }
                        </PDFDownloadLink>

                        <button
                            className="btn btn-danger"
                            onClick={() => setNotaEnvioPayload(null)}
                        >
                            Cerrar PDF
                        </button>
                    </div>
                </div>
            )}

            {modalVisible && detallePedido && (
                <DetallePedidoVistaModal
                    detalle={detallePedido.detalle}
                    pedido={detallePedido.pedido}
                    onClose={() => {
                        setModalVisible(false);
                        setDetallePedido(null);
                    }}
                />
            )}

            {modalAreasVisible && (
                <>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        Áreas asignadas
                                    </h5>

                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() =>
                                            setModalAreasVisible(false)
                                        }
                                    />
                                </div>

                                <div className="modal-body">
                                    {areasPedido.length === 0 ? (
                                        <div className="alert alert-warning">
                                            No hay áreas asignadas.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-3">
                                                <strong>
                                                    Fecha programada:
                                                </strong>{" "}
                                                {
                                                    areasPedido[0]
                                                        ?.fecha_programada
                                                }
                                            </div>

                                            <ul className="list-group">
                                                {areasPedido.map((area) => (
                                                    <li
                                                        key={area.id}
                                                        className="list-group-item"
                                                    >
                                                        {area.orden}.{" "}
                                                        {area.nombre}
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() =>
                                            setModalAreasVisible(false)
                                        }
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-backdrop fade show"></div>
                </>
            )}

            {modalDocumentosVisible && (
                <>
                    <div className="modal fade show d-block">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        {tituloDocumentos}
                                    </h5>

                                    <button
                                        className="btn-close"
                                        onClick={() =>
                                            setModalDocumentosVisible(false)
                                        }
                                    />
                                </div>

                                <div className="modal-body">
                                    {documentosPedido.length === 0 ? (
                                        <>
                                            <div className="alert alert-warning">
                                                No existen archivos adjuntos.
                                            </div>

                                            {justificacionDocumento && (
                                                <div className="alert alert-info">
                                                    <strong>
                                                        Justificación:
                                                    </strong>
                                                    <br />
                                                    {justificacionDocumento}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <table className="table table-bordered">
                                            <thead>
                                                <tr>
                                                    <th>Archivo</th>
                                                    <th width="120">Acción</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {documentosPedido.map(
                                                    (archivo) => (
                                                        <tr
                                                            key={
                                                                archivo.idarchivo
                                                            }
                                                        >
                                                            <td>
                                                                {
                                                                    archivo.nombre_archivo
                                                                }
                                                            </td>

                                                            <td>
                                                                <a
                                                                    href={
                                                                        archivo.url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="btn btn-primary btn-sm"
                                                                >
                                                                    Ver
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() =>
                                            setModalDocumentosVisible(false)
                                        }
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-backdrop fade show"></div>
                </>
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
                                <button
                                    className="btn btn-success btn-sm"
                                    onClick={exportarExcel}
                                >
                                    📊 Exportar Excel
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
                                        registroSeleccionado?.idpedidoproduccion,
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
                                        `/pedidosproduccion/editar/${registroSeleccionado?.idpedidoproduccion}`,
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
                                        registroSeleccionado?.idpedidoproduccion,
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
                                        registroSeleccionado?.idpedidoproduccion,
                                    )
                                }
                                // data-bs-toggle="tooltip"
                                // data-bs-placement="top"
                                // title="Generar el PDF del registro seleccionado"
                            >
                                <i className="fas fa-file-pdf"></i> PDF
                            </button>

                            <button
                                className="btn btn-warning btn-sm toolbar-btn"
                                disabled={
                                    !registroSeleccionado ||
                                    Number(registroSeleccionado?.estado) !== 1
                                }
                                onClick={pasarAutorizacion}
                            >
                                🔒 Pasar a Autorización
                            </button>

                            {/* <button
                                className="btn btn-warning btn-sm toolbar-btn"
                                disabled={
                                    !registroSeleccionado ||
                                    Number(
                                        registroSeleccionado?.total_areas,
                                    ) === 0
                                }
                                onClick={() =>
                                    obtenerAreasPedido(
                                        registroSeleccionado?.idpedidoproduccion,
                                    )
                                }
                            >
                                <i className="fas fa-project-diagram"></i> Áreas
                            </button>

                            <button
                                className="btn btn-secondary btn-sm toolbar-btn"
                                disabled={
                                    !registroSeleccionado ||
                                    Number(
                                        registroSeleccionado?.no_envio_asociado,
                                    ) === 0
                                }
                                onClick={verNotaEnvio}
                            >
                                📄 Nota Envío
                            </button>

                            <button
                                className="btn btn-info btn-sm toolbar-btn"
                                disabled={
                                    !registroSeleccionado ||
                                    (Number(
                                        registroSeleccionado?.total_permisos,
                                    ) === 0 &&
                                        registroSeleccionado?.permisos_estado !==
                                            "PENDIENTE")
                                }
                                onClick={verPermisos}
                            >
                                📎 Permisos (
                                {registroSeleccionado?.total_permisos || 0})
                            </button>

                            <button
                                className="btn btn-dark btn-sm toolbar-btn"
                                disabled={
                                    !registroSeleccionado ||
                                    (Number(
                                        registroSeleccionado?.total_montajes,
                                    ) === 0 &&
                                        registroSeleccionado?.montajes_estado !==
                                            "PENDIENTE")
                                }
                                onClick={verMontajes}
                            >
                                🖼 Montajes (
                                {registroSeleccionado?.total_montajes || 0})
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
                                                registroSeleccionado?.idpedidoproduccion,
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
                                                `/pedidosproduccion/editar/${registroSeleccionado?.idpedidoproduccion}`,
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
                                                registroSeleccionado?.idpedidoproduccion,
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
                                                registroSeleccionado?.idpedidoproduccion,
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
                                            obtenerAreasPedido(
                                                registroSeleccionado?.idpedidoproduccion,
                                            )
                                        }
                                    >
                                        Áreas
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className="dropdown-item"
                                        onClick={() =>
                                            handleFacturar(
                                                registroSeleccionado?.idpedidoproduccion,
                                                registroSeleccionado,
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
                                                registroSeleccionado,
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
                                                registroSeleccionado?.idpedidoproduccion,
                                            )
                                        }
                                    >
                                        Nota Envío
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
                                ref={dtRef}
                            />
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
        </div>
    );
}

export default PedidosProduccionLista;
