// MonitorFacturacion.jsx
// ✅ Versión completa usando MUI DataGrid (reemplaza DataTables)
// ✅ Incluye TODAS las funciones del código original (certificación, NC/ND, notas, etc.)

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import alertify from "alertifyjs";
import { format } from "date-fns";
import {
    FaSearch,
    FaFilePdf,
    FaFileInvoice,
    FaFileInvoiceDollar,
    FaUndo,
} from "react-icons/fa";
import CotizacionPDF from "./CotizacionPDF";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import Header from "./Header";
import "../../css/tableFormat.css";
import "../../css/monitor_cotizaciones.css";

import "bootstrap/dist/js/bootstrap.bundle.min.js";
import * as bootstrap from "bootstrap";
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from "reactstrap";
import ClienteContactosForm from "./ClienteContactosForm";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs; // registra las fuentes embebidas (Roboto)
import FacturaPDF from "./FacturaPDF";
import DetalleCotizacionModal from "./DetalleCotizacionModal";


// ✅ MUI DataGrid
import {
    Box,
    Chip,
    LinearProgress,
    Button as MUIButton,
    Menu,
    MenuItem,
    Divider,
    ListItemIcon,
    ListItemText,
    Stack,
    Tooltip,
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import {
    MoreVert,
    PictureAsPdf,
    ReceiptLong,
    AssignmentTurnedIn,
    Undo,
    HourglassTop,
    NoteAdd,
    PostAdd,
    Article,
    ErrorOutline,
    Cancel,
    Comment,
    Visibility,
    Person,
    CalendarMonth,
    Description,
} from "@mui/icons-material";

function MonitorFacturacion() {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
    const [filtro, setFiltro] = useState("");
    const [pdfData, setPdfData] = useState(null);
    const navigate = useNavigate();
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFinal, setFechaFinal] = useState("");
    const [mostrarModalErrores, setMostrarModalErrores] = useState(false);
    const [cliente, setCliente] = useState(null);
    const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
    const [estadoFiltro, setEstadoFiltro] = useState("");
    const [showPrefModal, setShowPrefModal] = useState(false);
    const [prefDate, setPrefDate] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [detalleCotizacion, setDetalleCotizacion] = useState(null);

    // ====== Modal Certificación (datos cliente) ======
    const [showCertModal, setShowCertModal] = useState(false);
    const [certLoading, setCertLoading] = useState(false);
    const [opcionesFact, setOpcionesFact] = useState({
        direcciones: [],
        emails: [],
        cliente: null,
    });

    const [certForm, setCertForm] = useState({
        documento_tipo: "NIT", // NIT | CUI | PASAPORTE | CF
        documento_valor: "", // valor del doc según tipo
        nombre: "",
        direccion: "",
        email: "",
    });

    // ====== Comentarios ======
    const [showAddComent, setShowAddComent] = useState(false);
    const [newComentario, setNewComentario] = useState("");
    const [showComentarios, setShowComentarios] = useState(false);
    const [comentariosPaginated, setComentariosPaginated] = useState(null);
    const [comentariosPage, setComentariosPage] = useState(1);
    const [comentariosSearch, setComentariosSearch] = useState("");

    // ====== Modal Cliente form ======
    const [showClienteForm, setShowClienteForm] = useState(false);
    const [idClienteActual, setIdClienteActual] = useState(null);

    // ====== Modal NC / ND ======
    const [showNotaModal, setShowNotaModal] = useState(false);
    const [notaTipo, setNotaTipo] = useState("NCRE"); // NCRE | NDEB
    const [notaLoading, setNotaLoading] = useState(false);
    const [notaForm, setNotaForm] = useState({ motivo: "", monto: "" });

    // ====== Listado de notas FEL ======
    const [showNotasModal, setShowNotasModal] = useState(false);
    const [notas, setNotas] = useState([]);
    const [notasLoading, setNotasLoading] = useState(false);
    const [notaFiltroTipo, setNotaFiltroTipo] = useState(""); // '', 'NCRE', 'NDEB'

    const fetchingRef = useRef(false);

    const [facturaDoc, setFacturaDoc] = useState(null); // { cotizacion, detalles, images }
    const [showFacturaViewer, setShowFacturaViewer] = useState(false);

    const [actionsAnchor, setActionsAnchor] = useState(null);
    const openActions = (e) => setActionsAnchor(e.currentTarget);
    const closeActions = () => setActionsAnchor(null);

    // ====== Helpers ======
    const abs = (p) => new URL(p, window.location.origin).href;
    const asGTQ = (n) => {
        const v = n ?? 0;
        const num =
            typeof v === "string"
                ? Number(v.replace(/\s/g, "").replace(/,/g, ""))
                : Number(v);
        if (!isFinite(num)) return ""; // evita "NaN"
        return num.toLocaleString("es-GT", {
            style: "currency",
            currency: "GTQ",
            minimumFractionDigits: 2,
        });
    };

    const [columnVisibilityModel, setColumnVisibilityModel] = useState({
        idcliente: false,
        idcontacto: false,
        estado: false,
    });

    const [vendedores, setVendedores] = useState([]);
    const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");

    // ====== Carga fecha del servidor y primer fetch ======
    useEffect(() => {
        const token = localStorage.getItem("token");
        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setFechaInicio(res.data.fecha);
                setFechaFinal(res.data.fecha);
                fetchCotizaciones(res.data.fecha, res.data.fecha, estadoFiltro);
            })
            .catch(() => {
                const today = new Date().toISOString().split("T")[0];
                setFechaInicio(today);
                setFechaFinal(today);
                fetchCotizaciones(today, today, estadoFiltro);
            });
    }, []);

    useEffect(() => {
        const fetchVendedores = async () => {
            try {
                const token = localStorage.getItem("token");
                const { data } = await axios.get("/api/vendedores", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setVendedores([{ id_empleado: "", nombre: "Todos" }, ...data]);
            } catch (error) {
                alertify.error("Error al cargar vendedores.");
            }
        };
        fetchVendedores();
    }, []);

    // ====== Fetch cotizaciones ======
    const fetchCotizaciones = async (
        fi = fechaInicio,
        ff = fechaFinal,
        est = estadoFiltro,
        idvendedor = vendedorSeleccionado
    ) => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setLoading(true);
 setCotizaciones([]);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alertify.error("Token de autenticación no encontrado");
                setCotizaciones([]);
                return;
            }

            const hoy = new Date().toISOString().slice(0, 10);
            const params = { fechaInicio: fi || hoy, fechaFinal: ff || hoy };
            if (est) params.estado = est;
            if (idvendedor) params.idvendedor = idvendedor;

            const { data } = await axios.get("/api/monitorfacturacion", {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });

            // setCotizaciones(data || []);
            setCotizaciones([...new Map(data.map(x => [x.idcotizacion, x])).values()]);
        } catch (e) {
            alertify.error("Error al obtener las cotizaciones.");
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    };

    // ====== Filtrado rápido (buscador) ======
    const cotizacionesFiltradas = cotizaciones.filter((cot) => {
        const texto = filtro.toLowerCase();
        return (
            cot.nocotizacion?.toLowerCase().includes(texto) ||
            cot.cliente?.toLowerCase().includes(texto) ||
            cot.total_general?.toString().includes(texto) ||
            cot.observaciones_costeo?.toLowerCase().includes(texto)
        );
    });

    // ====== Acciones varias ======
    const handleDesactivar = (id, estado) => {
        const token = localStorage.getItem("token");
        if (token) {
            axios
                .put(
                    `/api/monitorfacturacion/desactivar/${id}`,
                    { estado: estado },
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                .then(() => {
                    setCotizaciones((prev) =>
                        prev.filter((c) => c.idcotizacion !== Number(id))
                    );
                    alertify.success("Cotización regresada a ventas.");
                })
                .catch(() => {
                    alertify.error("Error al volver la cotización a ventas.");
                });
        }
    };

    const abrirPrefModal = () => {
        if (
            !registroSeleccionado ||
            Number(registroSeleccionado.estado) !== 4
        ) {
            return alertify.error(
                "Seleccione una cotización en PRE-FACTURACIÓN."
            );
        }
        const hoy = new Date().toISOString().slice(0, 10);
        setPrefDate(
            (registroSeleccionado.fecha_prefacturacion || "").slice(0, 10) ||
                hoy
        );
        setShowPrefModal(true);
    };

    const guardarFechaPref = async () => {
        if (!prefDate) return alertify.error("Seleccione una fecha.");
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        try {
            await axios.put(
                `/api/cotizaciones/${registroSeleccionado.idcotizacion}/fecha-prefacturacion`,
                { fecha_prefacturacion: prefDate },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alertify.success("Fecha de prefacturación actualizada.");
            setCotizaciones((prev) =>
                prev.map((c) =>
                    c.idcotizacion === registroSeleccionado.idcotizacion
                        ? { ...c, fecha_prefacturacion: prefDate }
                        : c
                )
            );
            setShowPrefModal(false);
        } catch (e) {
            const msg =
                e.response?.data?.message || "Error al actualizar la fecha.";
            alertify.error(msg);
        }
    };

    const abrirAgregarComentario = () => {
        if (!registroSeleccionado)
            return alertify.error("Seleccione un registro.");
        setNewComentario("");
        setShowAddComent(true);
    };

    const guardarComentario = async () => {
        if (!newComentario.trim()) return;
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");
        try {
            await axios.post(
                `/api/monitorfacturacion/comentarios`,
                {
                    idcotizacion: registroSeleccionado.idcotizacion,
                    comentario: newComentario,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alertify.success("Comentario guardado.");
            setShowAddComent(false);

            setCotizaciones((prev) =>
                prev.map((c) =>
                    c.idcotizacion === registroSeleccionado.idcotizacion
                        ? {
                              ...c,
                              has_comentarios: 1,
                              comentarios_count:
                                  Number(c.comentarios_count || 0) + 1,
                          }
                        : c
                )
            );
        } catch (e) {
            alertify.error("Error al guardar comentario.");
        }
    };

    const obtenerComentarios = async (page = 1, search = comentariosSearch) => {
        if (!registroSeleccionado) return;
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");
        try {
            const { data } = await axios.get(
                `/api/monitorfacturacion/${registroSeleccionado.idcotizacion}/comentarios`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { page, search },
                }
            );
            setComentariosPaginated(data);
            setComentariosPage(page);
            setShowComentarios(true);
        } catch (e) {
            alertify.error("Error al obtener comentarios.");
        }
    };

    useEffect(() => {
        if (showComentarios && registroSeleccionado) {
            obtenerComentarios(1, comentariosSearch);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comentariosSearch]);

    // ====== PDF Cotización ======
    const generarPDF = async (id) => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        const res = await fetch(`/api/monitorfacturacion/${id}/pdf`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(`HTTP ${res.status}`, text);
            return alertify.error("No se pudo generar el PDF.");
        }

        const data = await res.json(); // { cotizacion, totalEnLetras }
        setPdfData(data);
    };

    // ====== PDF Factura generada en backend ======
    const abrirFactura = async (id) => {
        const token = localStorage.getItem("token");
        if (!token)
            return alertify.error("Token no encontrado para abrir PDF.");

        try {
            const url = `${
                import.meta.env.VITE_API_URL
            }/monitorfacturacion/${id}/facturapdf`;
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/pdf",
                },
            });

            if (!res.ok) {
                return alertify.error("No se pudo generar/descargar el PDF.");
            }

            const blob = await res.blob();
            const fileURL = URL.createObjectURL(blob);
            window.open(fileURL, "_blank", "noopener");
            setTimeout(() => URL.revokeObjectURL(fileURL), 60_000);
        } catch (err) {
            console.error(err);
            alertify.error("Error al abrir el PDF.");
        }
    };

    // ====== Tooltips bootstrap ======
    useEffect(() => {
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
    }, []);

    useEffect(() => {
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
    }, [cotizacionesFiltradas]);

    const limpiarFiltro = () => setFiltro("");

    // ====== Anular factura ======
    const handleAnularFactura = () => {
        alertify.prompt(
            "Anulación de factura",
            "Ingrese el motivo de la anulación:",
            "",
            async function (evt, motivo) {
                if (!motivo || motivo.trim() === "") {
                    alertify.error("Debe ingresar un motivo.");
                    return;
                }

                try {
                    const token = localStorage.getItem("token");
                    await axios.put(
                        `/api/facturar/${registroSeleccionado.idcotizacion}/anular`,
                        { motivo },
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );
                    alertify.success("Factura anulada con éxito.");
                    fetchCotizaciones();
                } catch (error) {
                    console.error(error);
                    alertify.error("Error al anular la factura.");
                }
            },
            function () {
                alertify.error("Anulación cancelada.");
            }
        );
    };

    // ====== Anular cotización (estados 4 o 5) ======
    const handleAnularCotizacion = () => {
        if (!registroSeleccionado)
            return alertify.error("Seleccione un registro para anular.");

        const estado = Number(registroSeleccionado.estado);
        if (![4, 5].includes(estado))
            return alertify.error(
                "Solo puede anular cotizaciones en estado 4 o 5."
            );

        alertify.prompt(
            "Anular cotización",
            "Ingrese el motivo de la anulación:",
            "",
            async function (evt, motivo) {
                if (!motivo || motivo.trim() === "") {
                    alertify.error("Debe ingresar un motivo.");
                    return;
                }

                try {
                    const token = localStorage.getItem("token");
                    await axios.put(
                        `/api/monitorfacturacion/${registroSeleccionado.idcotizacion}/anular`,
                        { motivo },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    alertify.success("Cotización anulada correctamente.");
                    fetchCotizaciones();
                } catch (error) {
                    console.error(error);
                    const msg =
                        error.response?.data?.message ||
                        "Error al anular la cotización.";
                    alertify.error(msg);
                }
            },
            function () {
                alertify.error("Anulación cancelada.");
            }
        );
    };

    // ====== Certificación: abrir modal (del ORIGINAL) ======
    const abrirModalCertificar = async () => {
        if (!registroSeleccionado)
            return alertify.error("Seleccione un registro.");
        //console.log("Registro seleccionado:", registroSeleccionado);
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        try {
            const { data } = await axios.get(
                `/api/clientes/${registroSeleccionado.idcliente}/facturacion-opciones`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setOpcionesFact(data);

            // Prefill: NIT → CUI → PASAPORTE → CF
            let tipo = "CF",
                valor = "";
            if (data.cliente?.nit) {
                tipo = "NIT";
                valor = data.cliente.nit;
            } else if (data.cliente?.cui) {
                tipo = "CUI";
                valor = data.cliente.cui;
            } else if (data.cliente?.pasaporte) {
                tipo = "PASAPORTE";
                valor = data.cliente.pasaporte;
            }

            setCertForm({
                documento_tipo: tipo,
                documento_valor: valor,
                nombre: data.cliente?.nombre || "",
                direccion: data.direcciones?.[0] || "",
                email: data.emails?.[0] || "",
            });

            setShowCertModal(true);
        } catch (e) {
            console.error(e);
            alertify.error("No se pudieron cargar opciones del cliente.");
        }
    };

    // ====== Certificación: confirmar (del ORIGINAL) ======
    const confirmarCertificacion = async () => {
        if (!registroSeleccionado) return;

        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");
        setCertLoading(true);

        try {
            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL}/facturar/${
                    registroSeleccionado.idcotizacion
                }`,
                certForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (data?.resultado) {
                alertify.success(`Factura generada. UUID: ${data.uuid}`);
                setShowCertModal(false);
                fetchCotizaciones();
            } else {
                alertify.error(data?.errores || "No certificado");
            }
        } catch (e) {
            if (e.response?.status === 422 && e.response?.data?.errors) {
                const errs = e.response.data.errors;
                const primero =
                    Object.values(errs)[0]?.[0] || "Error de validación";
                alertify.error(primero);
            } else {
                console.log(e);
                alertify.error("Error al certificar.");
            }
        } finally {
            setCertLoading(false);
        }
    };

    // ====== Notas: abrir modal (del ORIGINAL) ======
    const abrirNota = (tipo) => {
        if (!registroSeleccionado)
            return alertify.error("Seleccione un registro");
        setNotaTipo(tipo);
        setNotaForm({
            motivo: "",
            monto: Number(registroSeleccionado.total_general || 0).toFixed(2),
        });
        setShowNotaModal(true);
    };

    // ====== Notas: confirmar (del ORIGINAL) ======
    const confirmarNota = async () => {
        if (!registroSeleccionado) return;
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        const monto = parseFloat(notaForm.monto);
        if (!notaForm.motivo?.trim())
            return alertify.error("Ingresa el motivo.");
        if (isNaN(monto) || monto <= 0)
            return alertify.error("Monto inválido.");

        setNotaLoading(true);
        try {
            const url =
                notaTipo === "NCRE"
                    ? `${import.meta.env.VITE_API_URL}/notacredito/${
                          registroSeleccionado.idcotizacion
                      }`
                    : `${import.meta.env.VITE_API_URL}/notadebito/${
                          registroSeleccionado.idcotizacion
                      }`;

            const { data } = await axios.post(
                url,
                { motivo: notaForm.motivo, monto },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (data?.resultado) {
                alertify.success(
                    `${
                        notaTipo === "NCRE"
                            ? "Nota de crédito"
                            : "Nota de débito"
                    } certificada. UUID: ${data.uuid}`
                );
                setShowNotaModal(false);
                fetchCotizaciones();
            } else {
                alertify.error(data?.errores || "No certificado");
            }
        } catch (e) {
            const msg =
                e.response?.data?.errores ||
                e.response?.data?.message ||
                "Error al certificar la nota.";
            alertify.error(msg);
        } finally {
            setNotaLoading(false);
        }
    };

    // ====== Notas: PDF de la última NCRE/NDEB (del ORIGINAL) ======
    const abrirPdfNota = async (tipo /* 'NCRE' | 'NDEB' */) => {
        if (!registroSeleccionado)
            return alertify.error("Seleccione un registro");
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        try {
            const resList = await fetch(
                `/api/cotizaciones/${registroSeleccionado.idcotizacion}/notasfel?tipo=${tipo}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const notas = await resList.json();

            if (!Array.isArray(notas) || notas.length === 0) {
                return alertify.error(
                    `No hay notas ${tipo} para esta factura.`
                );
            }

            const idnota = notas[0].idnota;

            const resPdf = await fetch(`/api/notasfel/${idnota}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!resPdf.ok) {
                return alertify.error("No se pudo generar el PDF de la nota.");
            }

            const ct = resPdf.headers.get("content-type") || "";
            if (!ct.includes("application/pdf")) {
                return alertify.error("El servidor no devolvió un PDF.");
            }

            const blob = await resPdf.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e) {
            console.error(e);
            alertify.error("Error al abrir el PDF de la nota.");
        }
    };

    // ====== Notas: listado ======
    const abrirNotasModal = async () => {
        if (!registroSeleccionado)
            return alertify.error("Seleccione un registro");
        setShowNotasModal(true);
        await cargarNotasFel(notaFiltroTipo);
    };

    const cerrarNotasModal = () => {
        setShowNotasModal(false);
        setNotas([]);
    };

    const cargarNotasFel = async (tipo = "") => {
        if (!registroSeleccionado) return;
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        setNotasLoading(true);
        try {
            const qs = tipo ? `?tipo=${tipo}` : "";
            const res = await fetch(
                `/api/cotizaciones/${registroSeleccionado.idcotizacion}/notasfel${qs}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const txt = await res.text();
                console.error("HTTP error", res.status, txt);
                alertify.error("No se pudieron cargar las notas.");
                setNotas([]);
                return;
            }
            const data = await res.json();
            setNotas(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            alertify.error("Error al cargar notas.");
            setNotas([]);
        } finally {
            setNotasLoading(false);
        }
    };

    useEffect(() => {
        if (showNotasModal) cargarNotasFel(notaFiltroTipo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notaFiltroTipo, showNotasModal]);

    const imprimirNota = async (idnota) => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        try {
            const res = await fetch(`/api/notasfel/${idnota}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                return alertify.error("No se pudo generar el PDF de la nota.");
            }
            const ct = res.headers.get("content-type") || "";
            if (!ct.includes("application/pdf")) {
                return alertify.error("El servidor no devolvió un PDF.");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e) {
            console.error(e);
            alertify.error("Error al abrir el PDF de la nota.");
        }
    };

    const obtenerDetalleCotizacion = async (id) => {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
            alertify.error("Token de autenticación no encontrado.");
            setLoading(false);
            return;
        }
        try {
            console.log("Obteniendo detalle de cotización ID:", id);
            const response = await axios.get(
                `/api/cotizaciones/detalle/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const detalle = response.data;
            const cotizacionSeleccionada = cotizaciones.find(
                (c) => Number(c.idcotizacion) === Number(id)
            );
            if (!cotizacionSeleccionada) {
                alertify.error("No se encontró el estado de la cotización.");
                return;
            }
            setDetalleCotizacion({
                detalle,
                estado: cotizacionSeleccionada.estado,
            });
            setModalVisible(true);
        } catch(err) {
            console.error("Error al obtener el detalle de la cotización.", err);
            alertify.error("Error al obtener el detalle de la cotización.");
        } finally {
            setLoading(false);
        }
    };

    const toNumberSafe = (v) => {
        if (v === null || v === undefined) return null;
        if (typeof v === "number") return Number.isFinite(v) ? v : null;
        const n = Number(String(v).replace(/[^\d.-]/g, ""));
        return Number.isFinite(n) ? n : null;
    };

    // ====== DataGrid ======
    const [paginationModel, setPaginationModel] = useState({
        pageSize: 10,
        page: 0,
    });

    const selectionModel = registroSeleccionado
        ? [registroSeleccionado.__rowId]
        : [];

    const muiColumns = [
        // { field: "idcotizacion", headerName: "ID", hide: true },
        {
            field: "nocotizacion",
            headerName: "No.Cotización",
            minWidth: 160,
            flex: 1,
            sortable: false,
        },
        {
            field: "fecha_cotizacion",
            headerName: "Fecha",
            minWidth: 120,
            sortable: false,
            renderCell: ({ row }) => {
                const raw = row?.fecha_cotizacion;
                if (!raw) return "";
                // Soporta 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss' y 'YYYY-MM-DDTHH:mm:ss'
                const s = String(raw).trim();
                const iso =
                    s.length === 10 ? `${s}T00:00:00` : s.replace(" ", "T");
                const d = new Date(iso);
                if (isNaN(d.getTime())) return "";
                try {
                    return format(d, "dd-MM-yyyy");
                } catch {
                    return "";
                }
            },
        },
        {
            field: "tipo_pago",
            headerName: "Forma Pago",
            minWidth: 140,
            sortable: false,
        },
        {
            field: "tipo_facturacion",
            headerName: "Tipo Fact.",
            minWidth: 120,
            align: "center",
            headerAlign: "center",
            sortable: false,
            renderCell: ({ value }) => {
                if (!value) return "";
                const color =
                    value.toUpperCase() === "BIEN" ? "success" : "info";
                const icon =
                    value.toUpperCase() === "BIEN" ? "bi-box-seam" : "bi-tools";

                return (
                    <span
                        className={`badge bg-${color}`}
                        style={{ fontSize: "0.8rem" }}
                    >
                        <i className={`bi ${icon} me-1`} />
                        {value}
                    </span>
                );
            },
        },

        {
            field: "total_general",
            headerName: "Total",
            minWidth: 130,
            align: "right",
            headerAlign: "right",
            sortable: false,
            // 👇 NO asumas que params ni row existen en todos los ciclos
            valueGetter: (params) =>
                params?.row?.total_general ?? params?.value ?? null,

            renderCell: (params) => {
                const raw = params?.value ?? params?.row?.total_general ?? null;
                const n = toNumberSafe(raw);
                return n == null
                    ? ""
                    : n.toLocaleString("es-GT", {
                          style: "currency",
                          currency: "GTQ",
                          minimumFractionDigits: 2,
                      });
            },
        },
        // {
        //     field: "total_debug",
        //     headerName: "Total(raw)",
        //     width: 120,
        //     sortable: false,
        //     renderCell: ({ row }) => <code>{String(row.total_general)}</code>,
        // },
        {
            field: "cliente",
            headerName: "Cliente",
            minWidth: 220,
            flex: 1.2,
            sortable: false,
        },
        {
            field: "contacto",
            headerName: "Contacto",
            minWidth: 180,
            flex: 1,
            sortable: false,
        },
        {
            field: "vendedor",
            headerName: "Vendedor",
            minWidth: 180,
            flex: 1,
            sortable: false,
        },
        {
            field: "observaciones_cliente",
            headerName: "Obsv.Cliente",
            minWidth: 220,
            flex: 1.2,
            sortable: false,
        },
        {
            field: "nofactura",
            headerName: "No.Interno",
            minWidth: 120,
            sortable: false,
        },
        {
            field: "numero_fel",
            headerName: "Número FEL",
            minWidth: 120,
            flex: 1,
        },
        {
            field: "uuid",
            headerName: "Autorización",
            minWidth: 220,
            flex: 1,
            sortable: false,
            renderCell: ({ row, value }) => {
                const hayErrores =
                    row?.resultado === "N" &&
                    Array.isArray(row?.errores) &&
                    row.errores.length > 0;
                if (hayErrores) {
                    return (
                        <span className="text-danger fw-bold">
                            <i className="bi bi-exclamation-circle me-1" />{" "}
                            Error
                        </span>
                    );
                }
                return value ? (
                    <span className="text-success">{value}</span>
                ) : (
                    ""
                );
            },
        },

        {
            field: "estado_texto",
            headerName: "Estado",
            minWidth: 160,
            sortable: false,
            renderCell: ({ row, value }) => {
                const hayErrores =
                    row?.resultado === "N" &&
                    Array.isArray(row?.errores) &&
                    row.errores.length > 0;
                if (hayErrores) {
                    return (
                        <Chip
                            size="small"
                            color="error"
                            label="Con errores"
                            icon={
                                <i className="bi bi-exclamation-triangle-fill" />
                            }
                        />
                    );
                }
                let color = "default";
                let icon = "bi-question-circle";
                switch (row?.estado) {
                    case 4:
                        color = "warning";
                        icon = "bi-hourglass-split";
                        break;
                    case 5:
                        color = "error";
                        icon = "bi-x-circle";
                        break;
                    case 6:
                        color = "success";
                        icon = "bi-check-circle";
                        break;
                    default:
                        break;
                }
                return (
                    <Chip
                        size="small"
                        color={color}
                        label={value}
                        icon={<i className={`bi ${icon}`} />}
                    />
                );
            },
        },
        {
            field: "origen",
            headerName: "Origen",
            minWidth: 120,
            align: "center",
            headerAlign: "center",
            sortable: false,
            renderCell: ({ row }) =>
                row.estado === 7 ? (
                    <Chip size="small" color="error" label="Factura" />
                ) : (
                    <Chip size="small" color="primary" label="Cotización" />
                ),
        },
        {
            field: "comentarios_count",
            headerName: "💬",
            width: 70,
            align: "center",
            headerAlign: "center",
            sortable: false,
            renderCell: ({ row, value }) => {
                const cnt = Number(value || 0);
                if (!cnt) return "";
                const tip = (row?.last_comentario_snippet || "").replace(
                    /"/g,
                    "&quot;"
                );
                return (
                    <span
                        className="badge bg-info"
                        title={tip}
                        data-bs-toggle="tooltip"
                    >
                        {cnt}
                    </span>
                );
            },
        },

        // Ocultas
        { field: "idcliente", headerName: "ID Cliente", hide: true },
        { field: "idcontacto", headerName: "ID Contacto", hide: true },
        { field: "estado", headerName: "Estado (num)", hide: true },
    ];

    // Mantener selección si la fila aún existe
    useEffect(() => {
        if (!registroSeleccionado) return;
        const exists = cotizaciones.some(
            (c) => c.idcotizacion === registroSeleccionado.idcotizacion
        );
        if (!exists) setRegistroSeleccionado(null);
    }, [cotizaciones]);

    // Asegurar que la fila seleccionada quede visible (cambia de página y scroll)
    useEffect(() => {
        if (!registroSeleccionado) return;
        const id = registroSeleccionado.idcotizacion;
        const idx = cotizacionesFiltradas.findIndex(
            (r) => r.idcotizacion === id
        );
        if (idx === -1) return;

        const pageForRow = Math.floor(idx / paginationModel.pageSize);
        if (pageForRow !== paginationModel.page) {
            setPaginationModel((pm) => ({ ...pm, page: pageForRow }));
        }

        setTimeout(() => {
            const el = document.querySelector(`[data-id="${id}"]`);
            if (el) el.scrollIntoView({ block: "nearest" });
        }, 0);
    }, [registroSeleccionado, cotizacionesFiltradas, paginationModel.pageSize]);

    const estado = Number(registroSeleccionado?.estado);
    const puedeRegresarVenta = estado === 4;
    const puedeRegresarPreFacturacion = estado === 5;
    const puedeEliminar = estado === 1;
    const puedePreFacturar = estado === 1 || estado === 3;
    const puedeFacturar = estado === 5;
    const puedeGenerarPDFFactura = estado === 6 || estado === 7;

    // CTA primaria según estado
    const primaryAction = (() => {
        if (!registroSeleccionado) {
            return {
                label: "Selecciona una cotización",
                onClick: null,
                color: "inherit",
                icon: <MoreVert />,
            };
        }

        const estado = Number(registroSeleccionado.estado);

        switch (estado) {
            case 4:
                // 🔹 Estado PRE-FACTURACIÓN → solo PDF COTIZACIÓN
                return {
                    label: "PDF Cotización",
                    onClick: () =>
                        generarPDF(registroSeleccionado.idcotizacion),
                    color: "success",
                    icon: <PictureAsPdf />,
                };

            case 5:
                // 🔹 Estado PARA FACTURAR → Certificar
                return {
                    label: "Certificar",
                    onClick: abrirModalCertificar,
                    color: "warning",
                    icon: <AssignmentTurnedIn />,
                };

            case 6:
            case 7:
            case 0:
                // 🔹 Estados FACTURADA o ANULADA → PDF Factura
                return {
                    label: "PDF Factura",
                    onClick: () =>
                        abrirFactura(registroSeleccionado.idcotizacion),
                    color: "primary",
                    icon: <ReceiptLong />,
                };

            default:
                // 🔹 Cualquier otro → PDF Cotización por defecto
                return {
                    label: "PDF Cotización",
                    onClick: () =>
                        generarPDF(registroSeleccionado.idcotizacion),
                    color: "success",
                    icon: <PictureAsPdf />,
                };
        }
    })();

    return (
        <div className="container-fluid mt-4">
            {/* ====== PDF Viewer Cotización ====== */}
            {pdfData && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 2000 }}
                >
                    <div
                        className="bg-white rounded shadow"
                        style={{
                            width: "80%",
                            height: "80%",
                            position: "relative",
                        }}
                    >
                        <PDFViewer width="100%" height="100%">
                            <CotizacionPDF
                                cotizacion={pdfData.cotizacion}
                                totalEnLetras={pdfData.totalEnLetras}
                                logoSrc="/images/LogoGP.jpg"
                            />
                        </PDFViewer>

                        <div className="position-absolute top-0 end-0 m-2 d-flex gap-2">
                            <PDFDownloadLink
                                document={
                                    <CotizacionPDF
                                        cotizacion={pdfData.cotizacion}
                                        totalEnLetras={pdfData.totalEnLetras}
                                        logoSrc="/images/LogoGP.jpg"
                                    />
                                }
                                fileName={`COTIZACION-${pdfData.cotizacion.nocotizacion}.pdf`}
                                className="btn btn-primary btn-sm"
                            >
                                {({ loading }) =>
                                    loading ? "Preparando…" : "Descargar PDF"
                                }
                            </PDFDownloadLink>

                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => setPdfData(null)}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <Header title="Lista de Cotizaciones para facturar" />

                {/* Filtros superiores */}
                <div className="row mb-3">
                    <div className="col-md-3">
                        <label className="form-label fw-bold">Estado:</label>
                        <select
                            className="form-select"
                            value={estadoFiltro}
                            onChange={(e) => setEstadoFiltro(e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="4">PRE-FACTURACIÓN</option>
                            <option value="5">PARA FACTURAR</option>
                            <option value="6">FACTURADA</option>
                            <option value="0">ANULADA</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label fw-bold">
                            📅 Fecha inicio:
                        </label>
                        <input
                            type="date"
                            className="form-control"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                        />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label fw-bold">
                            📅 Fecha final:
                        </label>
                        <input
                            type="date"
                            className="form-control"
                            value={fechaFinal}
                            onChange={(e) => setFechaFinal(e.target.value)}
                        />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label fw-bold">
                            🧑‍💼 Vendedor:
                        </label>
                        <select
                            className="form-select"
                            value={vendedorSeleccionado}
                            onChange={(e) =>
                                setVendedorSeleccionado(e.target.value)
                            }
                        >
                            {vendedores.map((v) => (
                                <option
                                    key={v.id_empleado}
                                    value={v.id_empleado}
                                >
                                    {v.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3 d-flex align-items-end mt-3">
                        <button
                            className="btn btn-primary w-100"
                            disabled={loading || fetchingRef.current}
                            onClick={() =>
                                fetchCotizaciones(
                                    fechaInicio,
                                    fechaFinal,
                                    estadoFiltro,
                                    vendedorSeleccionado
                                )
                            }
                        >
                            {loading ? "Consultando…" : "Consultar"}
                        </button>
                    </div>
                </div>

                {/* Buscador */}
                <div className="mb-3">
                    <label htmlFor="buscador" className="form-label fw-bold">
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
                                onClick={() => setFiltro("")}
                            >
                                ✖
                            </button>
                        )}
                    </div>
                </div>

                {/* Barra de acciones (compacta + menú) */}
                <Stack
                    direction="row"
                    spacing={1.5}
                    className="mb-3"
                    alignItems="center"
                    flexWrap="wrap"
                >
                    <MUIButton
                        variant="contained"
                        size="small"
                        color={primaryAction.color}
                        startIcon={primaryAction.icon}
                        onClick={primaryAction.onClick || undefined}
                        disabled={!primaryAction.onClick}
                    >
                        {primaryAction.label}
                    </MUIButton>

                    <MUIButton
                        variant="contained"
                        size="small"
                        color="inherit"
                        endIcon={<MoreVert />}
                        onClick={openActions}
                        disabled={!cotizacionesFiltradas.length}
                    >
                        Más acciones
                    </MUIButton>

                    {/* Tip de ayuda cuando no hay selección */}
                    {!registroSeleccionado && (
                        <span className="text-muted small ms-2">
                            Selecciona una fila para habilitar acciones.
                        </span>
                    )}
                </Stack>

                <Menu
                    anchorEl={actionsAnchor}
                    open={Boolean(actionsAnchor)}
                    onClose={closeActions}
                >
                    {/* DOCUMENTOS */}
                    <MenuItem disabled>
                        <ListItemText
                            primaryTypographyProps={{ fontWeight: 600 }}
                        >
                            Documentos
                        </ListItemText>
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            generarPDF(registroSeleccionado?.idcotizacion);
                        }}
                        disabled={!registroSeleccionado}
                    >
                        <ListItemIcon>
                            <PictureAsPdf fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                            primary="PDF Cotización"
                            secondary={registroSeleccionado?.nocotizacion || ""}
                        />
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            abrirModalCertificar();
                        }}
                        disabled={
                            !registroSeleccionado ||
                            Number(registroSeleccionado.estado) !== 5
                        }
                    >
                        <ListItemIcon>
                            <AssignmentTurnedIn fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Certificar…" />
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            abrirFactura(registroSeleccionado?.idcotizacion);
                        }}
                        disabled={!puedeGenerarPDFFactura}
                    >
                        <ListItemIcon>
                            <ReceiptLong fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="PDF Factura" />
                    </MenuItem>
                    <Divider />

                    {/* NOTAS */}
                    <MenuItem disabled>
                        <ListItemText
                            primaryTypographyProps={{ fontWeight: 600 }}
                        >
                            Notas
                        </ListItemText>
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            abrirNota("NCRE");
                        }}
                        disabled={
                            !registroSeleccionado ||
                            registroSeleccionado.estado !== 6
                        }
                    >
                        <ListItemIcon>
                            <NoteAdd fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Nueva Nota de Crédito" />
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            abrirNota("NDEB");
                        }}
                        disabled={
                            !registroSeleccionado ||
                            registroSeleccionado.estado !== 6
                        }
                    >
                        <ListItemIcon>
                            <PostAdd fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Nueva Nota de Débito" />
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            abrirPdfNota("NCRE");
                        }}
                        disabled={
                            !registroSeleccionado ||
                            registroSeleccionado.estado !== 6
                        }
                    >
                        <ListItemIcon>
                            <PictureAsPdf fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="PDF última NC" />
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            abrirPdfNota("NDEB");
                        }}
                        disabled={
                            !registroSeleccionado ||
                            registroSeleccionado.estado !== 6
                        }
                    >
                        <ListItemIcon>
                            <PictureAsPdf fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="PDF última ND" />
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            abrirNotasModal();
                        }}
                        disabled={
                            !registroSeleccionado ||
                            registroSeleccionado.estado !== 6
                        }
                    >
                        <ListItemIcon>
                            <Article fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Historial de Notas FEL…" />
                    </MenuItem>
                    <Divider />

                    {/* COMENTARIOS */}
                    <MenuItem disabled>
                        <ListItemText
                            primaryTypographyProps={{ fontWeight: 600 }}
                        >
                            Comentarios
                        </ListItemText>
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            abrirAgregarComentario();
                        }}
                        disabled={!registroSeleccionado}
                    >
                        <ListItemIcon>
                            <Comment fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Agregar comentario" />
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            obtenerComentarios(1, "");
                        }}
                        disabled={!registroSeleccionado}
                    >
                        <ListItemIcon>
                            <Visibility fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Ver comentarios…" />
                    </MenuItem>
                    <Divider />

                    {/* ESTADO */}
                    <MenuItem disabled>
                        <ListItemText
                            primaryTypographyProps={{ fontWeight: 600 }}
                        >
                            Estado
                        </ListItemText>
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            handleDesactivar(
                                registroSeleccionado.idcotizacion,
                                1
                            );
                        }}
                        disabled={!puedeRegresarVenta}
                    >
                        <ListItemIcon>
                            <Undo fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Regresar a Venta" />
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            handleDesactivar(
                                registroSeleccionado.idcotizacion,
                                4
                            );
                        }}
                        disabled={!puedeRegresarPreFacturacion}
                    >
                        <ListItemIcon>
                            <HourglassTop fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Regresar a Pre-facturación" />
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            handleAnularFactura();
                        }}
                        disabled={
                            !registroSeleccionado ||
                            (
                                registroSeleccionado?.resultado ?? ""
                            ).toUpperCase() !== "S" ||
                            !registroSeleccionado.uuid
                        }
                    >
                        <ListItemIcon>
                            <Cancel fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Anular factura" />
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            handleAnularCotizacion();
                        }}
                        disabled={
                            !registroSeleccionado ||
                            ![4, 5].includes(
                                Number(registroSeleccionado.estado)
                            )
                        }
                    >
                        <ListItemIcon>
                            <Cancel fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Anular cotización" />
                    </MenuItem>

                    <Divider />

                    {/* CLIENTE */}
                    <MenuItem disabled>
                        <ListItemText
                            primaryTypographyProps={{ fontWeight: 600 }}
                        >
                            Cliente
                        </ListItemText>
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            if (!registroSeleccionado?.idcliente)
                                return alertify.error("Seleccione un registro");
                            setIdClienteActual(registroSeleccionado.idcliente);
                            setShowClienteForm(true);
                        }}
                        disabled={!registroSeleccionado}
                    >
                        <ListItemIcon>
                            <Person fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Información del cliente" />
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            abrirPrefModal();
                        }}
                        disabled={
                            !registroSeleccionado ||
                            ![4, 5].includes(
                                Number(registroSeleccionado.estado)
                            )
                        }
                    >
                        <ListItemIcon>
                            <CalendarMonth fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Fecha de prefacturación" />
                    </MenuItem>
                    <Divider />

                    {/* ERRORES */}
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            setMostrarModalErrores(true);
                        }}
                        disabled={
                            !registroSeleccionado ||
                            registroSeleccionado.resultado !== "N" ||
                            !registroSeleccionado.errores ||
                            registroSeleccionado.errores.length === 0
                        }
                    >
                        <ListItemIcon>
                            <ErrorOutline fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Ver errores de certificación" />
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeActions();
                            if (
                                registroSeleccionado &&
                                Number(registroSeleccionado.estado) === 4
                            ) {
                                obtenerDetalleCotizacion(
                                    registroSeleccionado.idcotizacion
                                );
                            } else {
                                alertify.error(
                                    "Seleccione una cotización en estado PRE‑FACTURACIÓN (estado 4)."
                                );
                            }
                        }}
                        disabled={!registroSeleccionado}
                    >
                        <ListItemIcon>
                            <Visibility fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Detalle" />
                    </MenuItem>
                </Menu>

                {/* Tabla (MUI DataGrid) */}
                <div className="card-body">
                    {loading ? (
                        <p className="text-center">Cargando cotizaciones...</p>
                    ) : cotizacionesFiltradas.length === 0 ? (
                        <div className="alert alert-warning text-center">
                            No se encontraron cotizaciones que coincidan con la
                            búsqueda.
                        </div>
                    ) : (
                        <Box sx={{ height: 600, width: "100%" }}>
                            <DataGrid
                                rows={
                                    cotizacionesFiltradas
                                        ? cotizacionesFiltradas
                                        : []
                                }
                                columns={muiColumns}
                                getRowId={(row) => {
                                    // 🔹 Si tiene idcotizacion (cotizaciones normales)
                                    if (row.idcotizacion)
                                        return `COT-${row.idcotizacion}`;
                                    // 🔹 Si es factura anulada (estado 7)
                                    if (row.estado === 7) {
                                        // Usa uuid si existe, si no, nofactura como fallback
                                        return `FAC-${
                                            row.uuid ||
                                            row.nofactura ||
                                            Math.random()
                                        }`;
                                    }
                                    // fallback por seguridad
                                    return Math.random();
                                }}
                                // getRowId={(row) => `COT-${row.idcotizacion}`}

                                
                                rowSelectionModel={selectionModel}
                                onRowSelectionModelChange={(newSel) => {
                                    const id = newSel[0];
                                    const row =
                                        cotizaciones.find(
                                            (c) =>
                                                `COT-${c.idcotizacion}` ===
                                                    id ||
                                                `FAC-${c.uuid}` === id ||
                                                `FAC-${c.nofactura}` === id
                                        ) || null;
                                    if (row) row.__rowId = id;
                                    setRegistroSeleccionado(row);
                                }}
                                onRowClick={(params) => {
                                    const row = params.row;
                                    row.__rowId = params.id; // agrega el ID real de la fila
                                    setRegistroSeleccionado(row);
                                }}
                                getRowClassName={(params) =>
                                    `estado-${params.row.estado || ""}`
                                }
                                pagination
                                paginationModel={paginationModel}
                                onPaginationModelChange={setPaginationModel}
                                pageSizeOptions={[10, 25, 50]}
                                slots={{
                                    toolbar: GridToolbar,
                                    loadingOverlay: LinearProgress,
                                }}
                                disableColumnMenu
                                density="standard"
                                localeText={
                                    esES.components.MuiDataGrid.defaultProps
                                        .localeText
                                }
                                loading={loading}
                                sx={{
                                    ".MuiDataGrid-row.Mui-selected": {
                                        backgroundColor:
                                            "rgba(13,110,253,.12) !important",
                                    },
                                }}
                                columnVisibilityModel={columnVisibilityModel}
                                onColumnVisibilityModelChange={
                                    setColumnVisibilityModel
                                }
                            />
                        </Box>
                    )}
                </div>
            </div>

            {/* Modal de errores de certificación */}
            {mostrarModalErrores && (
                <div
                    className="modal fade show"
                    style={{
                        display: "block",
                        backgroundColor: "rgba(0,0,0,0.5)",
                    }}
                    tabIndex="-1"
                    role="dialog"
                >
                    <div className="modal-dialog modal-lg" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Errores de Certificación - Cotización{" "}
                                    {registroSeleccionado?.nocotizacion}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() =>
                                        setMostrarModalErrores(false)
                                    }
                                ></button>
                            </div>
                            <div className="modal-body">
                                {registroSeleccionado?.errores?.length > 0 ? (
                                    <table className="table table-bordered table-sm">
                                        <thead className="table-light">
                                            <tr>
                                                <th>#</th>
                                                <th>Categoría</th>
                                                <th>Numeral</th>
                                                <th>Validación</th>
                                                <th>Mensaje</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.isArray(
                                                registroSeleccionado?.errores
                                            ) &&
                                            registroSeleccionado.errores
                                                .length > 0 ? (
                                                registroSeleccionado.errores.map(
                                                    (err, idx) => (
                                                        <tr key={idx}>
                                                            <td>{idx + 1}</td>
                                                            <td>
                                                                {err.categoria}
                                                            </td>
                                                            <td>
                                                                {err.numeral}
                                                            </td>
                                                            <td>
                                                                {err.validacion}
                                                            </td>
                                                            <td>
                                                                {
                                                                    err.mensaje_error
                                                                }
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            ) : (
                                                <p>
                                                    No se encontraron errores
                                                    detallados.
                                                </p>
                                            )}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p>No se encontraron errores detallados.</p>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() =>
                                        setMostrarModalErrores(false)
                                    }
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal certificación */}
            <Modal
                isOpen={showCertModal}
                toggle={() => setShowCertModal(false)}
                centered
                size="lg"
            >
                <ModalHeader toggle={() => setShowCertModal(false)}>
                    Datos para certificación
                </ModalHeader>
                <ModalBody>
                    <div className="mb-2">
                        <label className="form-label">Tipo de documento</label>
                        <select
                            className="form-select"
                            value={certForm.documento_tipo}
                            onChange={(e) => {
                                const tipo = e.target.value;
                                let valor = "";
                                const c = opcionesFact.cliente || {};
                                if (tipo === "NIT") valor = c.nit || "";
                                if (tipo === "CUI") valor = c.cui || "";
                                if (tipo === "PASAPORTE")
                                    valor = c.pasaporte || "";
                                if (tipo === "CF") valor = "";
                                setCertForm({
                                    ...certForm,
                                    documento_tipo: tipo,
                                    documento_valor: valor,
                                });
                            }}
                        >
                            <option value="NIT">NIT</option>
                            <option value="CUI">DPI/CUI</option>
                            <option value="PASAPORTE">PASAPORTE</option>
                            <option value="CF">CONSUMIDOR FINAL</option>
                        </select>
                    </div>

                    {certForm.documento_tipo !== "CF" && (
                        <div className="mb-2">
                            <label className="form-label">Número</label>
                            <input
                                className="form-control"
                                value={certForm.documento_valor}
                                onChange={(e) =>
                                    setCertForm({
                                        ...certForm,
                                        documento_valor: e.target.value,
                                    })
                                }
                                placeholder={
                                    certForm.documento_tipo === "NIT"
                                        ? "NIT"
                                        : certForm.documento_tipo === "CUI"
                                        ? "DPI/CUI (12-13 dígitos)"
                                        : "Pasaporte"
                                }
                            />
                        </div>
                    )}

                    <div className="mb-2">
                        <label className="form-label">Nombre del cliente</label>
                        <input
                            className="form-control"
                            value={certForm.nombre}
                            onChange={(e) =>
                                setCertForm({
                                    ...certForm,
                                    nombre: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label">Dirección</label>
                        <select
                            className="form-select"
                            value={certForm.direccion}
                            onChange={(e) =>
                                setCertForm({
                                    ...certForm,
                                    direccion: e.target.value,
                                })
                            }
                        >
                            {(opcionesFact.direcciones || []).map((d, i) => (
                                <option key={i} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-2">
                        <label className="form-label">Correo</label>
                        <select
                            className="form-select"
                            value={certForm.email}
                            onChange={(e) =>
                                setCertForm({
                                    ...certForm,
                                    email: e.target.value,
                                })
                            }
                        >
                            {(opcionesFact.emails || []).map((em, i) => (
                                <option key={i} value={em}>
                                    {em}
                                </option>
                            ))}
                            <option value="">(sin correo)</option>
                        </select>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => setShowCertModal(false)}
                        disabled={certLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        color="warning"
                        onClick={confirmarCertificacion}
                        disabled={certLoading}
                    >
                        {certLoading ? "Enviando…" : "Certificar"}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal Cliente (contactos/direcciones) */}
            <Modal
                isOpen={showClienteForm}
                toggle={() => setShowClienteForm(false)}
                centered
                className="modal-xxl"
            >
                <ModalHeader toggle={() => setShowClienteForm(false)}>
                    Información del cliente
                </ModalHeader>
                <ModalBody>
                    {idClienteActual != null && (
                        <ClienteContactosForm
                            idclienteInicial={idClienteActual}
                            bloquearSeleccion={false}
                            onClose={() => setShowClienteForm(false)}
                            onSaved={() => {
                                setShowClienteForm(false);
                                fetchCotizaciones();
                            }}
                        />
                    )}
                </ModalBody>
            </Modal>

            {/* Modal NC/ND */}
            <Modal
                isOpen={showNotaModal}
                toggle={() => setShowNotaModal(false)}
                centered
                size="lg"
            >
                <ModalHeader toggle={() => setShowNotaModal(false)}>
                    {notaTipo === "NCRE" ? "Nota de Crédito" : "Nota de Débito"}{" "}
                    – Ajuste
                </ModalHeader>
                <ModalBody>
                    {registroSeleccionado && (
                        <>
                            <div className="mb-3">
                                <div className="small text-muted">Cliente</div>
                                <div className="fw-semibold">
                                    {registroSeleccionado.cliente}
                                </div>
                            </div>

                            <div className="row g-3 mb-3">
                                <div className="col-md-6">
                                    <div className="small text-muted">FEL</div>
                                    <div className="fw-semibold">
                                        {registroSeleccionado.serie || "-"}-
                                        {registroSeleccionado.numero || "-"}
                                    </div>
                                    <div
                                        className="text-muted"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        {registroSeleccionado.uuid}
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="small text-muted">
                                        Total Factura
                                    </div>
                                    <div className="fw-semibold">
                                        {Number(
                                            registroSeleccionado.total_general ||
                                                0
                                        ).toLocaleString("es-GT", {
                                            style: "currency",
                                            currency: "GTQ",
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="mb-3">
                        <label className="form-label">Motivo del ajuste</label>
                        <input
                            type="text"
                            className="form-control"
                            maxLength={200}
                            value={notaForm.motivo}
                            onChange={(e) =>
                                setNotaForm({
                                    ...notaForm,
                                    motivo: e.target.value,
                                })
                            }
                            placeholder="Ej. Descuento por devolución parcial"
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label">
                            Monto a ajustar (GTQ)
                        </label>
                        <input
                            type="number"
                            className="form-control"
                            step="0.01"
                            min="0.01"
                            value={notaForm.monto}
                            onChange={(e) =>
                                setNotaForm({
                                    ...notaForm,
                                    monto: e.target.value,
                                })
                            }
                        />
                        <div className="form-text">
                            Se emitirá la {notaTipo === "NCRE" ? "NC" : "ND"}{" "}
                            con <strong>una sola línea</strong> por este monto.
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => setShowNotaModal(false)}
                        disabled={notaLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        color={notaTipo === "NCRE" ? "info" : "secondary"}
                        onClick={confirmarNota}
                        disabled={notaLoading}
                    >
                        {notaLoading
                            ? "Enviando…"
                            : notaTipo === "NCRE"
                            ? "Certificar NC"
                            : "Certificar ND"}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal listado de Notas FEL */}
            <Modal
                isOpen={showNotasModal}
                toggle={cerrarNotasModal}
                centered
                size="lg"
            >
                <ModalHeader toggle={cerrarNotasModal}>
                    Notas FEL de la factura&nbsp;
                    <span className="fw-semibold">
                        {registroSeleccionado?.serie || "-"}-
                        {registroSeleccionado?.numero || "-"}
                    </span>
                </ModalHeader>

                <ModalBody>
                    <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                        <span className="small text-muted">Filtrar:</span>
                        <div
                            className="btn-group"
                            role="group"
                            aria-label="Filtro tipo nota"
                        >
                            <button
                                type="button"
                                className={`btn btn-sm ${
                                    notaFiltroTipo === ""
                                        ? "btn-primary"
                                        : "btn-outline-primary"
                                }`}
                                onClick={() => setNotaFiltroTipo("")}
                            >
                                Todas
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm ${
                                    notaFiltroTipo === "NCRE"
                                        ? "btn-info"
                                        : "btn-outline-info"
                                }`}
                                onClick={() => setNotaFiltroTipo("NCRE")}
                            >
                                NCRE
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm ${
                                    notaFiltroTipo === "NDEB"
                                        ? "btn-secondary"
                                        : "btn-outline-secondary"
                                }`}
                                onClick={() => setNotaFiltroTipo("NDEB")}
                            >
                                NDEB
                            </button>
                        </div>

                        <div className="ms-auto d-flex gap-2">
                            <button
                                className="btn btn-outline-info btn-sm"
                                onClick={() => {
                                    setShowNotasModal(false);
                                    abrirNota("NCRE");
                                }}
                            >
                                + Nueva NC
                            </button>
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => {
                                    setShowNotasModal(false);
                                    abrirNota("NDEB");
                                }}
                            >
                                + Nueva ND
                            </button>
                        </div>
                    </div>

                    {notasLoading ? (
                        <div className="text-center py-4">Cargando notas…</div>
                    ) : notas.length === 0 ? (
                        <div className="alert alert-warning">
                            No hay notas para mostrar.
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-sm table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Serie/No.</th>
                                        <th>Fecha</th>
                                        <th>Motivo</th>
                                        <th className="text-end">Monto</th>
                                        <th>UUID</th>
                                        <th style={{ width: 110 }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notas.map((n) => (
                                        <tr key={n.idnota}>
                                            <td>
                                                <span
                                                    className={`badge ${
                                                        n.tipo === "NCRE"
                                                            ? "bg-info"
                                                            : "bg-secondary"
                                                    }`}
                                                >
                                                    {n.tipo}
                                                </span>
                                            </td>
                                            <td>
                                                {(n.serie_nota || "SN") +
                                                    "-" +
                                                    (n.numero_nota || "0")}
                                            </td>
                                            <td>{n.fecha_nota || ""}</td>
                                            <td
                                                className="text-truncate"
                                                style={{ maxWidth: 260 }}
                                                title={n.motivo || ""}
                                            >
                                                {n.motivo || ""}
                                            </td>
                                            <td className="text-end">
                                                {Number(
                                                    n.monto || 0
                                                ).toLocaleString("es-GT", {
                                                    style: "currency",
                                                    currency: "GTQ",
                                                })}
                                            </td>
                                            <td
                                                className="small text-wrap"
                                                style={{ maxWidth: 220 }}
                                            >
                                                {n.uuid_nota || "-"}
                                            </td>
                                            <td>
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        className="btn btn-outline-primary"
                                                        onClick={() =>
                                                            imprimirNota(
                                                                n.idnota
                                                            )
                                                        }
                                                    >
                                                        PDF
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ModalBody>

                <ModalFooter>
                    <button
                        className="btn btn-secondary"
                        onClick={cerrarNotasModal}
                    >
                        Cerrar
                    </button>
                </ModalFooter>
            </Modal>

            {/* Modal fecha prefacturación */}
            <Modal
                isOpen={showPrefModal}
                toggle={() => setShowPrefModal(false)}
                centered
            >
                <ModalHeader toggle={() => setShowPrefModal(false)}>
                    Fecha de Prefacturación
                </ModalHeader>
                <ModalBody>
                    <div className="mb-2">
                        <div className="small text-muted mb-1">
                            Cotización:{" "}
                            <strong>
                                {registroSeleccionado?.nocotizacion}
                            </strong>
                        </div>
                        <label className="form-label">
                            Seleccione la fecha
                        </label>
                        <input
                            type="date"
                            className="form-control"
                            value={prefDate}
                            onChange={(e) => setPrefDate(e.target.value)}
                        />
                        <div className="form-text">
                            Solo disponible cuando la cotización está en{" "}
                            <strong>PRE-FACTURACIÓN</strong>.
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => setShowPrefModal(false)}
                    >
                        Cancelar
                    </Button>
                    <Button color="primary" onClick={guardarFechaPref}>
                        Aceptar
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal agregar comentario */}
            <Modal
                isOpen={showAddComent}
                toggle={() => setShowAddComent(false)}
                centered
            >
                <ModalHeader toggle={() => setShowAddComent(false)}>
                    Agregar comentario – {registroSeleccionado?.nocotizacion}
                </ModalHeader>
                <ModalBody>
                    <textarea
                        className="form-control"
                        rows={4}
                        maxLength={1000}
                        value={newComentario}
                        onChange={(e) => setNewComentario(e.target.value)}
                        placeholder="Escribe tu comentario…"
                    />
                    <div className="form-text">Máx. 1000 caracteres.</div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => setShowAddComent(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        color="primary"
                        onClick={guardarComentario}
                        disabled={!newComentario.trim()}
                    >
                        Guardar
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal ver comentarios */}
            <Modal
                isOpen={showComentarios}
                toggle={() => setShowComentarios(false)}
                centered
                size="lg"
            >
                <ModalHeader toggle={() => setShowComentarios(false)}>
                    Comentarios – {registroSeleccionado?.nocotizacion}
                </ModalHeader>
                <ModalBody>
                    <div className="mb-2">
                        <input
                            className="form-control"
                            placeholder="Buscar en comentarios…"
                            value={comentariosSearch}
                            onChange={(e) =>
                                setComentariosSearch(e.target.value)
                            }
                        />
                    </div>

                    {comentariosPaginated?.data?.length ? (
                        <>
                            {comentariosPaginated.data.map((c, i) => (
                                <div
                                    key={i}
                                    className="border rounded p-2 mb-2"
                                >
                                    <div className="mb-1">{c.comentario}</div>
                                    <div className="text-muted small">
                                        Usuario: {c.nombre_usuario || "—"} ·{" "}
                                        {new Date(
                                            c.fecha_registro
                                        ).toLocaleString()}{" "}
                                        · Estado: {c.estado}
                                    </div>
                                </div>
                            ))}

                            <div className="d-flex justify-content-between mt-3">
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled={
                                        !comentariosPaginated?.prev_page_url
                                    }
                                    onClick={() =>
                                        obtenerComentarios(comentariosPage - 1)
                                    }
                                >
                                    ◀ Anterior
                                </button>
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled={
                                        !comentariosPaginated?.next_page_url
                                    }
                                    onClick={() =>
                                        obtenerComentarios(comentariosPage + 1)
                                    }
                                >
                                    Siguiente ▶
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-muted">No hay comentarios.</div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => setShowComentarios(false)}
                    >
                        Cerrar
                    </Button>
                </ModalFooter>
            </Modal>
            {modalVisible && detalleCotizacion && (
                <DetalleCotizacionModal
                    detalle={detalleCotizacion.detalle}
                    estadoCotizacion={detalleCotizacion.estado}
                    onClose={() => {
                        setModalVisible(false);
                        setDetalleCotizacion(null);
                    }}
                />
            )}
        </div>
    );
}

export default MonitorFacturacion;
