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
import NotaEnvioPDF from "./NotaEnvioPDF";
import NotaEnvioPDFHalf from "./NotaEnvioPDFHalf";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import * as bootstrap from "bootstrap";
import DetallePedidoVistaModal from "./DetallePedidoVistaModal";
import PedidoProduccionPDF from "./PedidoProduccionPDF";
import {
    CalendarDays,
    Eye,
    FileDown,
    FilePlus2,
    FileSpreadsheet,
    FileText,
    LockKeyhole,
    PackageCheck,
    Pencil,
    Search,
    Trash2,
    X,
} from "lucide-react";

import "../../css/pedidos-produccion-lista.css";

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

                setFechaActual(localDate);
                setFechaInicio(localDate);
                setFechaFin(localDate);

                fetchPedidosProduccion(localDate, localDate);
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
        autoWidth: false,
        searching: false,
        order: [[1, "desc"]],
        scrollX: false,

        columnDefs: [
            {
                targets: 0,
                width: "100px",
            },
            {
                targets: 2,
                width: "120px",
            },
        ],

        language: spanishTranslation,

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
        <div className="gp-module-page gp-pedidos-list-page">
            {/* =====================================================
            PDF PEDIDO
           ===================================================== */}

            {pdfData && (
                <div className="gp-pedidos-pdf-overlay">
                    <div className="gp-pedidos-pdf-window">
                        <div className="gp-pedidos-pdf-header">
                            <div className="gp-pedidos-pdf-heading">
                                <div className="gp-pedidos-pdf-icon">
                                    <FileText size={18} />
                                </div>

                                <div>
                                    <span>PRODUCCIÓN · PEDIDO</span>

                                    <strong>
                                        Pedido {pdfData.pedido?.nopedido || ""}
                                    </strong>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="gp-pedidos-pdf-close"
                                onClick={() => setPdfData(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="gp-pedidos-pdf-viewer">
                            <PDFViewer width="100%" height="100%">
                                <PedidoProduccionPDF
                                    pedido={pdfData.pedido}
                                    logoSrc="/images/LogoGP.png"
                                />
                            </PDFViewer>
                        </div>

                        <div className="gp-pedidos-pdf-footer">
                            <button
                                type="button"
                                className="gp-pedidos-pdf-secondary"
                                onClick={() => setPdfData(null)}
                            >
                                <X size={15} />
                                Cerrar
                            </button>

                            <PDFDownloadLink
                                document={
                                    <PedidoProduccionPDF
                                        pedido={pdfData.pedido}
                                        logoSrc="/images/LogoGP.png"
                                    />
                                }
                                fileName={`PEDIDO-${pdfData.pedido.nopedido}.pdf`}
                                className="gp-pedidos-pdf-download"
                            >
                                {({ loading }) => (
                                    <>
                                        <FileDown size={15} />

                                        {loading
                                            ? "Preparando..."
                                            : "Descargar PDF"}
                                    </>
                                )}
                            </PDFDownloadLink>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
            PDF NOTA ENVÍO
           ===================================================== */}

            {notaEnvioPayload && (
                <div className="gp-pedidos-pdf-overlay">
                    <div className="gp-pedidos-pdf-window">
                        <div className="gp-pedidos-pdf-header">
                            <div className="gp-pedidos-pdf-heading">
                                <div className="gp-pedidos-pdf-icon">
                                    <FileText size={18} />
                                </div>

                                <div>
                                    <span>NOTA DE ENVÍO</span>

                                    <strong>
                                        Envío {notaEnvioPayload.no_envio}
                                    </strong>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="gp-pedidos-pdf-close"
                                onClick={() => setNotaEnvioPayload(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="gp-pedidos-pdf-viewer">
                            <PDFViewer width="100%" height="100%">
                                <PdfComponent data={notaEnvioPayload} />
                            </PDFViewer>
                        </div>

                        <div className="gp-pedidos-pdf-footer">
                            <button
                                type="button"
                                className="gp-pedidos-pdf-secondary"
                                onClick={() => setNotaEnvioPayload(null)}
                            >
                                <X size={15} />
                                Cerrar
                            </button>

                            <PDFDownloadLink
                                document={
                                    <PdfComponent data={notaEnvioPayload} />
                                }
                                fileName={`nota-envio-${notaEnvioPayload.no_envio}.pdf`}
                                className="gp-pedidos-pdf-download"
                            >
                                {({ loading }) => (
                                    <>
                                        <FileDown size={15} />

                                        {loading
                                            ? "Generando..."
                                            : "Descargar nota"}
                                    </>
                                )}
                            </PDFDownloadLink>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
            DETALLE
           ===================================================== */}

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

            {/* =====================================================
            ÁREAS
           ===================================================== */}

            {modalAreasVisible && (
                <>
                    <div
                        className="modal fade show d-block gp-pedidos-modal"
                        tabIndex="-1"
                    >
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
                                            <div className="gp-pedidos-info-box">
                                                <CalendarDays size={16} />

                                                <div>
                                                    <span>
                                                        Fecha programada
                                                    </span>

                                                    <strong>
                                                        {
                                                            areasPedido[0]
                                                                ?.fecha_programada
                                                        }
                                                    </strong>
                                                </div>
                                            </div>

                                            <div className="gp-pedidos-area-list">
                                                {areasPedido.map((area) => (
                                                    <div
                                                        key={area.id}
                                                        className="gp-pedidos-area-item"
                                                    >
                                                        <span>
                                                            {area.orden}
                                                        </span>

                                                        <strong>
                                                            {area.nombre}
                                                        </strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
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

                    <div className="modal-backdrop fade show" />
                </>
            )}

            {/* =====================================================
            DOCUMENTOS
           ===================================================== */}

            {modalDocumentosVisible && (
                <>
                    <div className="modal fade show d-block gp-pedidos-modal">
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        {tituloDocumentos}
                                    </h5>

                                    <button
                                        type="button"
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
                                                <div className="gp-pedidos-justification">
                                                    <strong>
                                                        Justificación
                                                    </strong>

                                                    <p>
                                                        {justificacionDocumento}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-sm align-middle">
                                                <thead>
                                                    <tr>
                                                        <th>Archivo</th>

                                                        <th
                                                            style={{
                                                                width: 100,
                                                            }}
                                                        >
                                                            Acción
                                                        </th>
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
                                                                        className="btn btn-outline-primary btn-sm"
                                                                    >
                                                                        Ver
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
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

                    <div className="modal-backdrop fade show" />
                </>
            )}

            {/* =====================================================
            CARD PRINCIPAL
           ===================================================== */}

            <div className="gp-module-card gp-pedidos-list-card">
                {/* HEADER */}

                <div className="gp-pedidos-list-header">
                    <div>
                        <div className="gp-module-meta">
                            MÓDULO · PRODUCCIÓN
                        </div>

                        <h1>Pedidos de producción</h1>

                        <p>
                            Consulta, administra y da seguimiento a los pedidos
                            registrados para producción.
                        </p>
                    </div>

                    <div className="gp-pedidos-list-header-icon">
                        <PackageCheck size={25} />
                    </div>
                </div>

                {/* FILTROS */}

                <div className="gp-pedidos-filter-section">
                    <div className="gp-pedidos-filter-title">
                        <div>
                            <CalendarDays size={16} />

                            <span>Rango de consulta</span>
                        </div>

                        {!loading && (
                            <span className="gp-pedidos-count">
                                {pedidosFiltrados.length} registros
                            </span>
                        )}
                    </div>

                    <div className="gp-pedidos-filters">
                        <div className="gp-pedidos-field">
                            <label>Fecha inicio</label>

                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                            />
                        </div>

                        <div className="gp-pedidos-field">
                            <label>Fecha final</label>

                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                            />
                        </div>

                        <button
                            type="button"
                            className="gp-pedidos-consult"
                            onClick={handleFiltrar}
                            disabled={loading}
                        >
                            <Search size={15} />

                            {loading ? "Consultando..." : "Consultar"}
                        </button>

                        <button
                            type="button"
                            className="gp-pedidos-excel"
                            onClick={exportarExcel}
                            disabled={!registroSeleccionado}
                        >
                            <FileSpreadsheet size={15} />
                            Exportar Excel
                        </button>
                    </div>
                </div>

                {/* BUSCADOR */}

                <div className="gp-pedidos-search-section">
                    <div className="gp-pedidos-search-label">Buscar pedido</div>

                    <div className="gp-pedidos-search-control">
                        <Search size={16} />

                        <input
                            type="text"
                            placeholder="Número, cliente, asesor o fecha de entrega..."
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />

                        {filtro && (
                            <button type="button" onClick={limpiarFiltro}>
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>

                {/* TOOLBAR */}

                <div className="gp-pedidos-toolbar">
                    <div className="gp-pedidos-toolbar-left">
                        <button
                            type="button"
                            className="gp-pedidos-action gp-action-view"
                            disabled={!registroSeleccionado}
                            onClick={() =>
                                obtenerDetalleCotizacion(
                                    registroSeleccionado?.idpedidoproduccion,
                                )
                            }
                        >
                            <Eye size={15} />
                            Detalle
                        </button>

                        <button
                            type="button"
                            className="gp-pedidos-action gp-action-edit"
                            disabled={!registroSeleccionado || !puedeEditar}
                            onClick={() =>
                                navigate(
                                    `/pedidosproduccion/editar/${registroSeleccionado?.idpedidoproduccion}`,
                                )
                            }
                        >
                            <Pencil size={15} />
                            Editar
                        </button>

                        <button
                            type="button"
                            className="gp-pedidos-action gp-action-delete"
                            disabled={!registroSeleccionado || !puedeEliminar}
                            onClick={() =>
                                handleDesactivar(
                                    registroSeleccionado?.idpedidoproduccion,
                                )
                            }
                        >
                            <Trash2 size={15} />
                            Eliminar
                        </button>

                        <button
                            type="button"
                            className="gp-pedidos-action gp-action-pdf"
                            disabled={!registroSeleccionado}
                            onClick={() =>
                                generarPDF(
                                    registroSeleccionado?.idpedidoproduccion,
                                )
                            }
                        >
                            <FileText size={15} />
                            PDF
                        </button>

                        <button
                            type="button"
                            className="gp-pedidos-action gp-action-auth"
                            disabled={
                                !registroSeleccionado ||
                                Number(registroSeleccionado?.estado) !== 1
                            }
                            onClick={pasarAutorizacion}
                        >
                            <LockKeyhole size={15} />
                            Pasar a autorización
                        </button>
                    </div>

                    <div className="gp-pedidos-selected-info">
                        {registroSeleccionado ? (
                            <>
                                <span>Seleccionado</span>

                                <strong>{registroSeleccionado.nopedido}</strong>

                                <span className="gp-pedidos-status-pill">
                                    {registroSeleccionado.estado_texto ||
                                        "Sin estado"}
                                </span>
                            </>
                        ) : (
                            <span>
                                Selecciona un pedido para habilitar las
                                acciones.
                            </span>
                        )}
                    </div>
                </div>

                {/* TABLA */}

                <div className="gp-module-body gp-pedidos-table-body">
                    <div className="gp-pedidos-table-heading">
                        <div>
                            <h2>Registros de pedidos</h2>

                            <p>
                                Selecciona una fila para consultar o modificar
                                el pedido.
                            </p>
                        </div>

                        <span>{pedidosFiltrados.length} registros</span>
                    </div>

                    {loading || !spanishTranslation ? (
                        <div className="gp-pedidos-loading">
                            Cargando pedidos...
                        </div>
                    ) : pedidosFiltrados.length === 0 ? (
                        <div className="gp-pedidos-empty">
                            No se encontraron pedidos para los filtros actuales.
                        </div>
                    ) : (
                        <div className="gp-pedidos-table-wrapper">
                            <DataTable
                                key={tableKey}
                                data={pedidosFiltrados}
                                columns={columns}
                                options={{
                                    ...options,
                                    language: spanishTranslation,
                                }}
                                className="table table-hover table-sm"
                                ref={dtRef}
                            />
                        </div>
                    )}
                </div>

                {/* FOOTER */}

                <div className="gp-pedidos-footer">
                    <div>
                        <strong>Gestión de pedidos</strong>

                        <span>Crea un nuevo pedido de producción.</span>
                    </div>

                    <Link
                        to="/pedidosproduccion/crear"
                        className="gp-pedidos-new-button"
                    >
                        <FilePlus2 size={16} />
                        Nuevo pedido
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default PedidosProduccionLista;
