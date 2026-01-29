// ===============================================================
// LISTA COTIZACIONES — VERSIÓN COMPLETA, CORREGIDA Y ESTABLE
// ===============================================================

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import alertify from "alertifyjs";

// Hook optimizado
import { useCotizaciones } from "../hooks/useCotizaciones";

// Modales
import DetalleCotizacionModal from "./DetalleCotizacionModal";
import NotaEnvioModal from "./NotaEnvioModal";

// PDF
import CotizacionPDF from "./CotizacionPDF";
import NotaEnvioPDF from "./NotaEnvioPDF";
import NotaEnvioPDFHalf from "./NotaEnvioPDFHalf";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";

// Bootstrap y CSS
import "bootstrap/dist/css/bootstrap.min.css";
import "../../css/lista-cotizaciones.css";

// MUI
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    TablePagination,
    Paper,
    Chip,
    Tooltip,
    IconButton,
    Menu,
    MenuItem,
    Divider,
    ListItemIcon,
    ListItemText,
    Stack,
    Button as MUIButton,
    Badge,
} from "@mui/material";

// Icons
import {
    MoreVert,
    PictureAsPdf,
    Visibility,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Send,
    HourglassTop,
    Description,
    Comment,
    Block,
} from "@mui/icons-material";

import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import { FaRegFileAlt } from "react-icons/fa";
import Header from "./Header";

function ListaCotizaciones() {
    const navigate = useNavigate();

    // ===========================================================
    //   Hook centralizado
    // ===========================================================
    const {
        cotizaciones,
        loading,
        fechaActual,
        fechaInicio,
        fechaFin,
        setFechaInicio,
        setFechaFin,
        estadoFiltro,
        setEstadoFiltro,
        filtro,
        setFiltro,
        handleSearchChange,
        fetchCotizaciones,
        esComodin,
        vendedores,
        vendedorSeleccionado,
        setVendedorSeleccionado,
    } = useCotizaciones();

    // ===========================================================
    //   Estados locales UI
    // ===========================================================
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const [selectedId, setSelectedId] = useState(null);
    const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [detalleCotizacion, setDetalleCotizacion] = useState(null);

    const [pdfData, setPdfData] = useState(null);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [fechaPdf, setFechaPdf] = useState("");

    const [notaEnvioPayload, setNotaEnvioPayload] = useState(null);
    const [showNotaEnvioModal, setShowNotaEnvioModal] = useState(false);
    const [historialEnvios, setHistorialEnvios] = useState([]);

    const [actionsAnchor, setActionsAnchor] = useState(null);

    const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
    const [motivosRechazo, setMotivosRechazo] = useState([]);
    const [motivoSeleccionado, setMotivoSeleccionado] = useState("");

    const [openComentarios, setOpenComentarios] = useState(false);
    const [comentariosSearch, setComentariosSearch] = useState("");
    const [comentariosPag, setComentariosPag] = useState(null);
    const [comentariosPage, setComentariosPage] = useState(1);
    const [fechasSincronizadas, setFechasSincronizadas] = useState(false);

    //regla para decidir si se imprime en carga o media carta
    const itemsNotaEnvio = notaEnvioPayload?.items ?? [];
    const useHalfLetter = itemsNotaEnvio.length <= 8;

    //selección del componente
    const PdfComponent = useHalfLetter ? NotaEnvioPDFHalf : NotaEnvioPDF;

    // ===========================================================
    //   Sync selección cuando cambian las cotizaciones
    // ===========================================================
    useEffect(() => {
        if (!selectedId) return;
        const r = cotizaciones.find(
            (c) => Number(c.idcotizacion) === Number(selectedId),
        );
        if (r) setRegistroSeleccionado(r);
    }, [cotizaciones, selectedId]);

    // ===========================================================
    //   Comentarios: refetch al escribir en el buscador del modal
    // ===========================================================
    useEffect(() => {
        if (openComentarios && registroSeleccionado?.idcotizacion) {
            fetchComentarios(
                registroSeleccionado.idcotizacion,
                1,
                comentariosSearch,
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comentariosSearch]);

    // ===========================================================
    //   PDF: fijar fecha cuando se abre el modal
    // ===========================================================
    useEffect(() => {
        if (showPdfModal && registroSeleccionado) {
            setFechaPdf(fechaActual || "");
        }
    }, [showPdfModal, registroSeleccionado, fechaActual]);

    // ===========================================================
    //   Helpers
    // ===========================================================
    const fmtFecha = (value) => {
        if (!value) return "";
        const d = new Date(value);
        if (isNaN(d)) return "";
        return d.toLocaleDateString("es-GT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const fmtMoney = (v) =>
        v == null
            ? ""
            : Number(v).toLocaleString("es-GT", {
                  style: "currency",
                  currency: "GTQ",
              });

    const chipEstado = (row) => {
        const mapColor = {
            1: "default",
            2: "info",
            3: "success",
            4: "warning",
            5: "primary",
            6: "success",
            7: "error",
            8: "warning",
        };
        const color = mapColor[Number(row?.estado)] || "default";
        return (
            <Chip
                size="small"
                label={row?.estado_texto ?? ""}
                color={color}
                variant="outlined"
            />
        );
    };

    const isSelected = (row) => Number(row.idcotizacion) === Number(selectedId);

    // ===========================================================
    //   Filtro / búsqueda
    // ===========================================================
    const ESTADOS = [
        { value: "", label: "Todos" },
        { value: "1", label: "REGISTRO" },
        { value: "2", label: "PARA COSTEO" },
        { value: "3", label: "COSTEADA" },
        { value: "4", label: "PRE-FACTURACIÓN" },
        { value: "5", label: "PARA FACTURAR" },
        { value: "6", label: "FACTURADA" },
        { value: "7", label: "ANULADA" },
        { value: "8", label: "RECHAZADA" },
    ];

    const handleFiltrar = () => {
        setPage(0);
        fetchCotizaciones(fechaInicio, fechaFin, estadoFiltro, filtro.trim());
    };

    const limpiarFiltro = () => {
        setFiltro("");
        setPage(0);
        fetchCotizaciones(fechaInicio, fechaFin, estadoFiltro, "");
    };

    const cotizacionesFiltradas = cotizaciones.filter((cot) => {
        const texto = filtro.toLowerCase();
        return (
            cot.nocotizacion?.toLowerCase().includes(texto) ||
            cot.cliente?.toLowerCase().includes(texto) ||
            cot.total_general?.toString().includes(texto) ||
            cot.observaciones_costeo?.toLowerCase().includes(texto)
        );
    });

    const rowsToShow = cotizacionesFiltradas.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
    );

    useEffect(() => {
        const totalPages =
            Math.ceil(cotizacionesFiltradas.length / rowsPerPage) || 1;
        if (page > totalPages - 1) setPage(0);
    }, [cotizacionesFiltradas.length, rowsPerPage, page]);

    // Sincronizar FECHA SOLO UNA VEZ al inicio (y no recargar nada)
    useEffect(() => {
        if (!fechasSincronizadas && fechaInicio && fechaFin) {
            setFechasSincronizadas(true); // evita loops
            setFechaInicio(fechaInicio);
            setFechaFin(fechaFin);
        }
    }, [
        fechaInicio,
        fechaFin,
        fechasSincronizadas,
        setFechaInicio,
        setFechaFin,
    ]);

    // ===========================================================
    //   Acciones: menú
    // ===========================================================
    const openActions = (e) => {
        setActionsAnchor(e.currentTarget);
    };
    const closeActions = () => setActionsAnchor(null);

    // ===========================================================
    //   Comentarios
    // ===========================================================
    const fetchComentarios = async (idcot, pageParam = 1, searchParam = "") => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");
        try {
            const { data } = await axios.get(
                `/api/cotizaciones/${idcot}/comentarios`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { page: pageParam, search: searchParam },
                },
            );
            setComentariosPag(data);
            setComentariosPage(pageParam);
            setOpenComentarios(true);
        } catch {
            alertify.error("Error al obtener comentarios.");
        }
    };

    // ===========================================================
    //   Detalle cotización
    // ===========================================================
    const obtenerDetalleCotizacion = async (id) => {
        const token = localStorage.getItem("token");
        if (!token) {
            alertify.error("Token de autenticación no encontrado.");
            return;
        }
        try {
            const response = await axios.get(
                `/api/cotizaciones/detalle/${id}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            const detalle = response.data;
            setDetalleCotizacion({
                detalle,
                estado: registroSeleccionado?.estado,
            });
            setModalVisible(true);
        } catch {
            alertify.error("Error al obtener el detalle de la cotización.");
        }
    };

    // ===========================================================
    //   Historial Envíos / Nota Envío
    // ===========================================================
    const obtenerHistorialEnvios = async (id) => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado");
        try {
            const res = await fetch(
                `/api/cotizaciones/${id}/historial-envios`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            const data = await res.json();
            setHistorialEnvios(data);
        } catch {
            alertify.error("No se pudo obtener el historial de envíos.");
        }
    };

    // ===========================================================
    //   PDF Cotización
    // ===========================================================
    const generarPDF = async () => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        const res = await fetch(
            `/api/cotizaciones/${registroSeleccionado.idcotizacion}/pdf`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ fecha_cotizacion: fechaPdf }),
            },
        );

        let data;
        try {
            data = await res.json();
        } catch {
            alertify.error("La respuesta del servidor no es válida.");
            return;
        }
        if (!res.ok)
            return alertify.error(data.message || "Error generando PDF.");
        setPdfData(data);
    };

    const abrirModalPDF = async () => {
        const cot = registroSeleccionado;
        if (!cot) return alertify.error("Cotización no seleccionada");
        setFechaPdf(fechaActual);
        await obtenerHistorialEnvios(cot.idcotizacion);
        setShowPdfModal(true);
    };

    // ===========================================================
    //   Desactivar / Estado / Rechazo
    // ===========================================================
    const handleDesactivar = () => {
        if (!registroSeleccionado) return;
        const token = localStorage.getItem("token");
        if (!token) return;
        axios
            .put(
                `/api/cotizaciones/desactivar/${registroSeleccionado.idcotizacion}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
            )
            .then(() => {
                alertify.success("Cotización desactivada.");
                fetchCotizaciones(
                    fechaInicio,
                    fechaFin,
                    estadoFiltro,
                    filtro.trim(),
                );
            })
            .catch(() => {
                alertify.error("Error al desactivar la cotización.");
            });
    };

    const handleFacturar = (estadoDestino) => {
        const cotizacion = registroSeleccionado;
        if (!cotizacion?.idcotizacion) {
            alertify.alert(
                "Error",
                "No se encontró la cotización seleccionada.",
            );
            return;
        }
        const cid = cotizacion.idcotizacion;

        if (
            Number(cotizacion.total_general) === 0 &&
            Number(cotizacion.estado) > 3
        ) {
            alertify.alert(
                "TOTAL EN CERO",
                "No se puede enviar a pre-facturación una cotización con total igual a 0.00.",
            );
            return;
        }
        if (Number(cotizacion.estado) === 5) {
            alertify.alert(
                "PRE-FACTURACIÓN",
                "El registro ya está en FACTURACIÓN, no se puede volver a enviar.",
            );
            return;
        }
        if (Number(cotizacion.estado) > 5) {
            alertify.alert(
                "FACTURACIÓN",
                "El registro ya pasó la etapa de FACTURACIÓN, no se puede volver a enviar.",
            );
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) return;

        axios
            .put(
                `/api/cotizaciones/activarfacturacion/${cid}`,
                { estado: estadoDestino },
                { headers: { Authorization: `Bearer ${token}` } },
            )
            .then((response) => {
                alertify.success(response.data.message);
                fetchCotizaciones(
                    fechaInicio,
                    fechaFin,
                    estadoFiltro,
                    filtro.trim(),
                );
            })
            .catch(() => {
                alertify.error("Ocurrió un error al actualizar la cotización.");
            });
    };

    const abrirModalRechazo = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const { data } = await axios.get("/api/motivos-rechazo", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMotivosRechazo(data);
            setMostrarModalRechazo(true);
        } catch {
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
                { headers: { Authorization: `Bearer ${token}` } },
            );
            alertify.success("Cotización rechazada.");
            setMostrarModalRechazo(false);
            fetchCotizaciones(
                fechaInicio,
                fechaFin,
                estadoFiltro,
                filtro.trim(),
            );
        } catch (error) {
            alertify.error(
                error.response?.data?.message || "Error al rechazar.",
            );
        }
    };

    // ===========================================================
    //   Habilitadores según estado
    // ===========================================================
    const estado = Number(registroSeleccionado?.estado);
    const puedeEditar = estado === 1 || estado === 3;
    const puedeEliminar = estado === 1;
    const puedeEnviarCosteo = estado === 1 || estado === 2;
    const puedePreFacturar = estado === 1 || estado === 3;
    const puedeEnviarAFacturacion = estado === 4;

    // ===========================================================
    //   Acción primaria (botón grande)
    // ===========================================================
    const primaryAction = (() => {
        if (!registroSeleccionado) {
            return {
                label: "Selecciona una cotización",
                onClick: null,
                color: "inherit",
                icon: <MoreVert />,
            };
        }
        switch (estado) {
            case 1:
            case 3:
                return {
                    label: "Pre-Facturar",
                    onClick: () => handleFacturar(4),
                    color: "warning",
                    icon: <HourglassTop />,
                };
            case 4:
                return {
                    label: "Enviar a Facturación",
                    onClick: () => handleFacturar(5),
                    color: "primary",
                    icon: <Send />,
                };
            default:
                return {
                    label: "PDF Cotización",
                    onClick: abrirModalPDF,
                    color: "success",
                    icon: <PictureAsPdf />,
                };
        }
    })();

    // ===========================================================
    //   Render
    // ===========================================================
    return (
        <div className="mt-4 px-3 px-md-4">
            {/* Overlay PDF Cotización */}
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
                                logoSrc="/images/LogoGP.jpg"
                            />
                        </PDFViewer>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                        <PDFDownloadLink
                            document={
                                <CotizacionPDF
                                    cotizacion={pdfData.cotizacion}
                                    totalEnLetras={pdfData.totalEnLetras}
                                    logoSrc="/images/LogoGP.jpg"
                                />
                            }
                            fileName={`COTIZACION-${pdfData.cotizacion.nocotizacion}.pdf`}
                            className="btn btn-primary"
                        >
                            {({ loading }) =>
                                loading ? "Preparando PDF..." : "Descargar PDF"
                            }
                        </PDFDownloadLink>

                        {/* <PDFDownloadLink
                            document={<PdfComponent data={notaEnvioPayload} />}
                            fileName={`nota-envio-${notaEnvioPayload.cabecera.nocotizacion}-envio-${notaEnvioPayload.no_envio}.pdf`}
                            className="btn btn-primary"
                        /> */}

                        <button
                            className="btn btn-danger"
                            onClick={() => setPdfData(null)}
                        >
                            Cerrar PDF
                        </button>
                    </div>
                </div>
            )}

            {/* {notaEnvioPayload && (
                <PDFViewer width="100%" height="100%">
                    <PdfComponent data={notaEnvioPayload} />
                </PDFViewer>
            )} */}

            {/* Modal detalle */}
            {modalVisible && detalleCotizacion && (
                <DetalleCotizacionModal
                    detalle={detalleCotizacion.detalle}
                    estadoCotizacion={detalleCotizacion.estado}
                    onClose={() => {
                        setModalVisible(false);
                        setDetalleCotizacion(null);
                    }}
                    idCotizacion={registroSeleccionado?.idcotizacion}
                />
            )}

            <div className="card">
                <Header title="Lista de Cotizaciones" />
                <div className="card-body">
                    {/* Filtros */}
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
                                <label
                                    htmlFor="estadoFiltro"
                                    className="form-label"
                                >
                                    Estado:
                                </label>
                            </div>
                            <div className="col-md-3">
                                <select
                                    id="estadoFiltro"
                                    className="form-select form-select-sm"
                                    value={estadoFiltro}
                                    onChange={(e) =>
                                        setEstadoFiltro(e.target.value)
                                    }
                                >
                                    {ESTADOS.map((op) => (
                                        <option key={op.value} value={op.value}>
                                            {op.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {esComodin && (
                                <>
                                    <div className="col-auto">
                                        <label
                                            htmlFor="vendedorFiltro"
                                            className="form-label"
                                        >
                                            Vendedor:
                                        </label>
                                    </div>
                                    <div className="col-md-3">
                                        <select
                                            id="vendedorFiltro"
                                            className="form-select form-select-sm"
                                            value={vendedorSeleccionado}
                                            onChange={(e) =>
                                                setVendedorSeleccionado(
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="">Todos</option>
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
                                </>
                            )}

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

                    {/* Buscador */}
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
                                onChange={handleSearchChange}
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

                    {/* Barra de acciones */}
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

                        {!registroSeleccionado && (
                            <span className="text-muted small ms-2">
                                Selecciona una fila para habilitar acciones.
                            </span>
                        )}
                    </Stack>

                    {/* Menú de acciones */}
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
                            onClick={async () => {
                                closeActions();
                                await abrirModalPDF();
                            }}
                            disabled={!registroSeleccionado}
                        >
                            <ListItemIcon>
                                <PictureAsPdf fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primary="PDF Cotización"
                                secondary={
                                    registroSeleccionado?.nocotizacion || ""
                                }
                            />
                        </MenuItem>

                        <MenuItem
                            onClick={() => {
                                closeActions();
                                if (!registroSeleccionado) return;
                                obtenerDetalleCotizacion(
                                    registroSeleccionado.idcotizacion,
                                );
                            }}
                            disabled={!registroSeleccionado}
                        >
                            <ListItemIcon>
                                <Visibility fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Detalle" />
                        </MenuItem>

                        <MenuItem
                            onClick={() => {
                                closeActions();
                                setShowNotaEnvioModal(true);
                            }}
                            disabled={!registroSeleccionado}
                        >
                            <ListItemIcon>
                                <Description fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Nota de Envío…" />
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
                                if (!registroSeleccionado) return;
                                fetchComentarios(
                                    registroSeleccionado.idcotizacion,
                                    1,
                                    "",
                                );
                            }}
                            disabled={!registroSeleccionado}
                        >
                            <ListItemIcon>
                                <Comment fontSize="small" />
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
                            onClick={
                                () => handleFacturar(2) // Enviar a costeo
                            }
                            disabled={
                                !puedeEnviarCosteo || !registroSeleccionado
                            }
                        >
                            <ListItemIcon>
                                <Send fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Enviar a costeo" />
                        </MenuItem>

                        <MenuItem
                            onClick={() => handleFacturar(4)}
                            disabled={
                                !puedePreFacturar || !registroSeleccionado
                            }
                        >
                            <ListItemIcon>
                                <HourglassTop fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Pre-Facturar" />
                        </MenuItem>

                        <MenuItem
                            onClick={() => handleFacturar(5)}
                            disabled={
                                !puedeEnviarAFacturacion ||
                                !registroSeleccionado
                            }
                        >
                            <ListItemIcon>
                                <Send fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Enviar a Facturación" />
                        </MenuItem>

                        <MenuItem
                            onClick={() => {
                                closeActions();
                                navigate(
                                    `/cotizaciones/editar/${registroSeleccionado?.idcotizacion}`,
                                );
                            }}
                            disabled={!registroSeleccionado || !puedeEditar}
                        >
                            <ListItemIcon>
                                <EditIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Editar" />
                        </MenuItem>

                        <MenuItem
                            onClick={() => {
                                closeActions();
                                handleDesactivar();
                            }}
                            disabled={!registroSeleccionado || !puedeEliminar}
                        >
                            <ListItemIcon>
                                <DeleteIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Eliminar" />
                        </MenuItem>

                        <MenuItem
                            onClick={() => {
                                closeActions();
                                abrirModalRechazo();
                            }}
                            disabled={
                                !registroSeleccionado ||
                                !(estado === 1 || estado === 3)
                            }
                        >
                            <ListItemIcon>
                                <Block fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Rechazar…" />
                        </MenuItem>
                    </Menu>

                    {/* Tabla MUI */}
                    <Paper
                        elevation={1}
                        sx={{
                            width: "100%",
                            overflow: "hidden",
                            borderRadius: 2,
                        }}
                    >
                        <TableContainer sx={{ maxHeight: 560 }}>
                            <Table
                                stickyHeader
                                size="small"
                                aria-label="cotizaciones"
                            >
                                <TableHead>
                                    <TableRow>
                                        <TableCell>No. Cotización</TableCell>
                                        <TableCell>Fecha</TableCell>
                                        <TableCell>Forma Pago</TableCell>
                                        <TableCell align="right">
                                            Total General
                                        </TableCell>
                                        <TableCell align="right">
                                            Descuento
                                        </TableCell>
                                        <TableCell align="right">
                                            Total
                                        </TableCell>
                                        <TableCell>Costear</TableCell>
                                        <TableCell>Cliente</TableCell>
                                        <TableCell>Nit</TableCell>
                                        <TableCell>Contacto</TableCell>
                                        <TableCell>Obsv. Costeo</TableCell>
                                        <TableCell>Obsv. Vendedor</TableCell>
                                        <TableCell align="center">💬</TableCell>
                                        <TableCell>Estado</TableCell>
                                        <TableCell>
                                            Fecha Prefacturación
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={15}
                                                align="center"
                                            >
                                                Cargando cotizaciones…
                                            </TableCell>
                                        </TableRow>
                                    ) : rowsToShow.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={15}
                                                align="center"
                                            >
                                                Sin resultados
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        rowsToShow.map((row) => {
                                            const selected = isSelected(row);
                                            const isPre =
                                                Number(row?.estado) === 4;
                                            const hasCom =
                                                Number(
                                                    row?.comentarios_count ??
                                                        row?.has_comentarios ??
                                                        0,
                                                ) > 0 ||
                                                Number(row?.has_comentarios) ===
                                                    1 ||
                                                row?.has_comentarios === true;

                                            const disabled = !(isPre && hasCom);
                                            const badgeColor = !disabled
                                                ? "warning"
                                                : "default";
                                            const tooltipTitle = !isPre
                                                ? "Comentarios visibles en Pre-Facturación (estado 4)"
                                                : hasCom
                                                  ? row.last_comentario_snippet
                                                      ? `Último: ${row.last_comentario_snippet}`
                                                      : "Ver comentarios"
                                                  : "Sin comentarios";

                                            return (
                                                <TableRow
                                                    hover
                                                    key={row.idcotizacion}
                                                    onClick={() => {
                                                        setSelectedId(
                                                            row.idcotizacion,
                                                        );
                                                        setRegistroSeleccionado(
                                                            row,
                                                        );
                                                    }}
                                                    selected={selected}
                                                    sx={{
                                                        cursor: "pointer",
                                                        "&.Mui-selected": {
                                                            backgroundColor:
                                                                "rgba(25,118,210,0.08) !important",
                                                            outline:
                                                                "2px solid rgba(25,118,210,0.6)",
                                                            outlineOffset:
                                                                "-2px",
                                                        },
                                                    }}
                                                >
                                                    <TableCell>
                                                        {row.nocotizacion}
                                                    </TableCell>
                                                    <TableCell>
                                                        {fmtFecha(
                                                            row.fecha_cotizacion,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.tipo_pago}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {fmtMoney(
                                                            row.total_general,
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {fmtMoney(
                                                            row.descuento_monto,
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {fmtMoney(row.total)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.costear}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.cliente}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.nit}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.contacto}
                                                    </TableCell>
                                                    <TableCell>
                                                        {
                                                            row.observaciones_costeo
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        {
                                                            row.costeo_observaciones
                                                        }
                                                    </TableCell>

                                                    <TableCell align="center">
                                                        <Tooltip
                                                            title={
                                                                <>
                                                                    <div>
                                                                        {
                                                                            tooltipTitle
                                                                        }
                                                                    </div>
                                                                    {row.last_comentario_at &&
                                                                        hasCom && (
                                                                            <small>
                                                                                {new Date(
                                                                                    row.last_comentario_at,
                                                                                ).toLocaleString()}
                                                                            </small>
                                                                        )}
                                                                </>
                                                            }
                                                        >
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    disabled={
                                                                        disabled
                                                                    }
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        if (
                                                                            disabled
                                                                        )
                                                                            return;
                                                                        e.stopPropagation();
                                                                        setSelectedId(
                                                                            row.idcotizacion,
                                                                        );
                                                                        setRegistroSeleccionado(
                                                                            row,
                                                                        );
                                                                        fetchComentarios(
                                                                            row.idcotizacion,
                                                                            1,
                                                                            "",
                                                                        );
                                                                    }}
                                                                >
                                                                    <Badge
                                                                        badgeContent={
                                                                            Number(
                                                                                row?.comentarios_count,
                                                                            ) ||
                                                                            0
                                                                        }
                                                                        color={
                                                                            badgeColor
                                                                        }
                                                                    >
                                                                        <ChatBubbleIcon />
                                                                    </Badge>
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </TableCell>

                                                    <TableCell>
                                                        {chipEstado(row)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {fmtFecha(
                                                            row.fecha_prefacturacion,
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Paginación */}
                        <TablePagination
                            component="div"
                            count={cotizacionesFiltradas.length}
                            page={page}
                            onPageChange={(_, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            rowsPerPageOptions={[10, 25, 50]}
                            labelRowsPerPage="Filas por página"
                        />
                    </Paper>
                </div>

                {/* Botón crear */}
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

            {/* Modal Rechazo */}
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

            {/* Modal PDF (fecha + historial) */}
            {showPdfModal && (
                <div
                    className="modal d-block"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5>Generar PDF</h5>
                                <button
                                    className="btn-close"
                                    onClick={() => setShowPdfModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <label>Fecha de cotización:</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={fechaPdf || ""}
                                    onChange={(e) =>
                                        setFechaPdf(e.target.value)
                                    }
                                />
                                {historialEnvios.length > 0 && (
                                    <div className="mt-3">
                                        <h6>Historial de Envíos</h6>
                                        <ul className="list-group">
                                            {historialEnvios.map((item) => (
                                                <li
                                                    key={item.idhistorialenvio}
                                                    className="list-group-item d-flex justify-content-between"
                                                >
                                                    <span>
                                                        📄 Fecha cotización:{" "}
                                                        {item.fecha_cotizacion}
                                                    </span>
                                                    <span>
                                                        🕒 Enviado:{" "}
                                                        {new Date(
                                                            item.fecha_envio,
                                                        )
                                                            .toISOString()
                                                            .slice(0, 10)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-primary"
                                    onClick={async () => {
                                        try {
                                            if (
                                                !registroSeleccionado?.idcotizacion
                                            ) {
                                                alertify.error(
                                                    "Cotización no seleccionada.",
                                                );
                                                return;
                                            }
                                            await generarPDF();
                                            setShowPdfModal(false);
                                        } catch (err) {
                                            alertify.error(
                                                err?.message ||
                                                    "Error generando PDF",
                                            );
                                        }
                                    }}
                                >
                                    Generar
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowPdfModal(false)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nota Envío */}
            {showNotaEnvioModal && registroSeleccionado && (
                <NotaEnvioModal
                    idCotizacion={registroSeleccionado.idcotizacion}
                    open={showNotaEnvioModal}
                    onClose={() => setShowNotaEnvioModal(false)}
                    onPdfReady={(data) => {
                        setNotaEnvioPayload(data);
                    }}
                    coerceZeroAsNoShipment
                    direccionSugerida={
                        registroSeleccionado.direccion_entrega || ""
                    }
                />
            )}

            {/* Overlay PDF Nota Envío */}
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
                    <div style={{ width: "80%", height: "80%" }}>
                        <PDFViewer width="100%" height="100%">
                            {/* <NotaEnvioPDF data={notaEnvioPayload} /> */}
                            <PdfComponent data={notaEnvioPayload} />
                        </PDFViewer>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                        <PDFDownloadLink
                            // document={<NotaEnvioPDF data={notaEnvioPayload} />}
                            document={<PdfComponent data={notaEnvioPayload} />}
                            fileName={`nota-envio-${notaEnvioPayload.cabecera.nocotizacion}-envio-${notaEnvioPayload.no_envio}.pdf`}
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
                            onClick={() => setNotaEnvioPayload(null)}
                        >
                            Cerrar PDF
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Comentarios */}
            {openComentarios && (
                <div
                    className="modal d-block"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Comentarios — Cotización{" "}
                                    {registroSeleccionado?.nocotizacion}
                                </h5>
                                <button
                                    className="btn-close"
                                    onClick={() => setOpenComentarios(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-2">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Buscar en comentarios…"
                                        value={comentariosSearch}
                                        onChange={(e) =>
                                            setComentariosSearch(e.target.value)
                                        }
                                    />
                                </div>

                                {comentariosPag?.data?.length > 0 ? (
                                    <>
                                        {comentariosPag.data.map((c, i) => (
                                            <div
                                                key={i}
                                                className="border rounded p-2 mb-2"
                                            >
                                                <div className="mb-1">
                                                    {c.comentario}
                                                </div>
                                                <div
                                                    className="text-muted"
                                                    style={{
                                                        fontSize: "0.85rem",
                                                    }}
                                                >
                                                    Usuario:{" "}
                                                    {c.nombre_usuario ??
                                                        c.idusuario}{" "}
                                                    ·{" "}
                                                    {new Date(
                                                        c.fecha_registro,
                                                    ).toLocaleString()}{" "}
                                                    · Estado: {c.estado}
                                                </div>
                                            </div>
                                        ))}

                                        <div className="d-flex justify-content-between mt-3">
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                disabled={
                                                    !comentariosPag?.prev_page_url
                                                }
                                                onClick={() =>
                                                    fetchComentarios(
                                                        registroSeleccionado.idcotizacion,
                                                        comentariosPage - 1,
                                                        comentariosSearch,
                                                    )
                                                }
                                            >
                                                Anterior
                                            </button>
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                disabled={
                                                    !comentariosPag?.next_page_url
                                                }
                                                onClick={() =>
                                                    fetchComentarios(
                                                        registroSeleccionado.idcotizacion,
                                                        comentariosPage + 1,
                                                        comentariosSearch,
                                                    )
                                                }
                                            >
                                                Siguiente
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-muted">
                                        No hay comentarios.
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setOpenComentarios(false)}
                                >
                                    Cerrar
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
