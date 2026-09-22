import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import axios from "axios";

import {
    PDFDownloadLink,
    PDFViewer,
} from "@react-pdf/renderer";

import alertify from "alertifyjs";

import {
    CalendarDays,
    CheckCircle2,
    Eye,
    FileDown,
    FileText,
    FolderOpen,
    Image,
    Search,
    ShieldCheck,
    X,
    XCircle,
} from "lucide-react";

import DetallePedidoVistaModal
    from "./DetallePedidoVistaModal";

import PedidoProduccionPDF
    from "./PedidoProduccionPDF";

import "../../css/autorizacion-pedidos-produccion.css";


function AutorizacionPedidosProduccion() {

    const [pedidos, setPedidos] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    const [accionando, setAccionando] =
        useState(false);

    const [fechaInicio, setFechaInicio] =
        useState("");

    const [fechaFin, setFechaFin] =
        useState("");

    const [
        estadoAutorizacion,
        setEstadoAutorizacion,
    ] = useState("PENDIENTE");

    const [filtro, setFiltro] =
        useState("");

    const [
        registroSeleccionado,
        setRegistroSeleccionado,
    ] = useState(null);

    const [detallePedido, setDetallePedido] =
        useState(null);

    const [modalDetalle, setModalDetalle] =
        useState(false);

    const [pdfData, setPdfData] =
        useState(null);

    const [
        modalRechazo,
        setModalRechazo,
    ] = useState(false);

    const [
        motivoRechazo,
        setMotivoRechazo,
    ] = useState("");

    const [
        modalDocumentos,
        setModalDocumentos,
    ] = useState(false);

    const [
        tituloDocumentos,
        setTituloDocumentos,
    ] = useState("");

    const [
        documentos,
        setDocumentos,
    ] = useState([]);

    const [
        justificacionDocumento,
        setJustificacionDocumento,
    ] = useState("");



    /* =====================================================
       TOKEN
    ===================================================== */

    const getHeaders = () => {

        const token =
            localStorage.getItem("token");

        return {
            Authorization:
                `Bearer ${token}`,
        };
    };



    /* =====================================================
       FECHA INICIAL
    ===================================================== */

    useEffect(() => {

        const cargarFecha = async () => {

            try {

                const response =
                    await axios.get(
                        `${
                            import.meta.env
                                .VITE_API_URL
                        }/fecha-servidor`,
                        {
                            headers:
                                getHeaders(),
                        },
                    );

                const fecha =
                    response.data.fecha;

                setFechaInicio(fecha);
                setFechaFin(fecha);

                consultarPedidos(
                    fecha,
                    fecha,
                    "PENDIENTE",
                );

            } catch {

                const fecha =
                    new Date()
                        .toISOString()
                        .split("T")[0];

                setFechaInicio(fecha);
                setFechaFin(fecha);

                consultarPedidos(
                    fecha,
                    fecha,
                    "PENDIENTE",
                );
            }
        };

        cargarFecha();

    }, []);



    /* =====================================================
       CONSULTA
    ===================================================== */

    const consultarPedidos = async (
        inicio = fechaInicio,
        fin = fechaFin,
        estado = estadoAutorizacion,
    ) => {

        if (!inicio || !fin) {
            alertify.warning(
                "Debe seleccionar el rango de fechas.",
            );

            return;
        }

        setLoading(true);

        try {

            const params = {
                fecha_inicio: inicio,
                fecha_fin: fin,
            };

            if (estado) {
                params.autorizacion_estado =
                    estado;
            }

            const response =
                await axios.get(
                    "/api/pedidosproduccion/autorizacion-contabilidad",
                    {
                        params,
                        headers:
                            getHeaders(),
                    },
                );

            setPedidos(
                Array.isArray(response.data)
                    ? response.data
                    : [],
            );

            setRegistroSeleccionado(
                null,
            );

        } catch (error) {

            console.error(error);

            alertify.error(
                error?.response?.data
                    ?.message ||
                    "Error al consultar los pedidos.",
            );

            setPedidos([]);

        } finally {

            setLoading(false);
        }
    };



    /* =====================================================
       FILTRO LOCAL
    ===================================================== */

    const pedidosFiltrados =
        useMemo(() => {

            const texto =
                filtro
                    .trim()
                    .toLowerCase();

            if (!texto) {
                return pedidos;
            }

            return pedidos.filter(
                (pedido) => {

                    const valores = [
                        pedido.nopedido,
                        pedido.nocotizacion,
                        pedido.cliente,
                        pedido.contacto,
                        pedido.asesor,
                        pedido.fecha_pedido,
                        pedido.fecha_entrega,
                        pedido.no_envio_asociado,
                        pedido.autorizacion_estado,
                        pedido.autorizacion_usuario,
                    ];

                    return valores.some(
                        (valor) =>
                            String(
                                valor ?? "",
                            )
                                .toLowerCase()
                                .includes(
                                    texto,
                                ),
                    );
                },
            );

        }, [
            pedidos,
            filtro,
        ]);



    /* =====================================================
       FORMATO FECHA
    ===================================================== */

    const formatearFecha = (
        valor,
        incluirHora = false,
    ) => {

        if (!valor) {
            return "—";
        }

        const fecha =
            new Date(valor);

        if (
            Number.isNaN(
                fecha.getTime(),
            )
        ) {
            return valor;
        }

        return new Intl.DateTimeFormat(
            "es-GT",
            incluirHora
                ? {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                  }
                : {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                  },
        ).format(fecha);
    };



    /* =====================================================
       DETALLE
    ===================================================== */

    const verDetalle = async () => {

        if (!registroSeleccionado) {
            return;
        }

        setLoading(true);

        try {

            const response =
                await axios.get(
                    `/api/pedidosproduccion/detalle/${registroSeleccionado.idpedidoproduccion}`,
                    {
                        headers:
                            getHeaders(),
                    },
                );

            setDetallePedido({
                detalle:
                    response.data,

                pedido:
                    registroSeleccionado,
            });

            setModalDetalle(true);

        } catch (error) {

            console.error(error);

            alertify.error(
                "No se pudo obtener el detalle del pedido.",
            );

        } finally {

            setLoading(false);
        }
    };



    /* =====================================================
       PDF
    ===================================================== */

    const verPdf = async () => {

        if (!registroSeleccionado) {
            return;
        }

        try {

            const response =
                await axios.get(
                    `/api/pedidosproduccion/${registroSeleccionado.idpedidoproduccion}/pdf`,
                    {
                        headers:
                            getHeaders(),
                    },
                );

            setPdfData(
                response.data,
            );

        } catch (error) {

            console.error(error);

            alertify.error(
                "No se pudo generar el PDF del pedido.",
            );
        }
    };



    /* =====================================================
       DOCUMENTOS
    ===================================================== */

    const consultarDocumentos =
        async (tipo) => {

            if (!registroSeleccionado) {
                return;
            }

            try {

                const esPermiso =
                    tipo ===
                    "PERMISO";

                const endpoint =
                    esPermiso
                        ? "permisos"
                        : "montajes";

                const response =
                    await axios.get(
                        `/api/pedidosproduccion/${registroSeleccionado.idpedidoproduccion}/${endpoint}`,
                        {
                            headers:
                                getHeaders(),
                        },
                    );

                setDocumentos(
                    Array.isArray(
                        response.data,
                    )
                        ? response.data
                        : [],
                );

                if (esPermiso) {

                    setTituloDocumentos(
                        "Permisos",
                    );

                    setJustificacionDocumento(
                        registroSeleccionado
                            ?.permisos_justificacion ||
                            "",
                    );

                } else {

                    setTituloDocumentos(
                        "Montajes",
                    );

                    setJustificacionDocumento(
                        registroSeleccionado
                            ?.montajes_justificacion ||
                            "",
                    );
                }

                setModalDocumentos(
                    true,
                );

            } catch (error) {

                console.error(error);

                alertify.error(
                    "No fue posible consultar los documentos.",
                );
            }
        };



    /* =====================================================
       APROBAR
    ===================================================== */

    const aprobarPedido = () => {

        if (!registroSeleccionado) {
            return;
        }

        alertify.confirm(
            "Autorizar pedido",
            `¿Desea aprobar el pedido ${registroSeleccionado.nopedido} y enviarlo a Logística?`,

            async () => {

                setAccionando(true);

                try {

                    const response =
                        await axios.put(
                            `/api/pedidosproduccion/${registroSeleccionado.idpedidoproduccion}/autorizacion-contabilidad/aprobar`,
                            {},
                            {
                                headers:
                                    getHeaders(),
                            },
                        );

                    alertify.success(
                        response.data
                            ?.message ||
                            "Pedido autorizado correctamente.",
                    );

                    await consultarPedidos();

                } catch (error) {

                    console.error(error);

                    alertify.error(
                        error?.response
                            ?.data
                            ?.message ||
                            "No fue posible autorizar el pedido.",
                    );

                } finally {

                    setAccionando(
                        false,
                    );
                }
            },

            () => {},
        );
    };



    /* =====================================================
       ABRIR RECHAZO
    ===================================================== */

    const abrirRechazo = () => {

        if (!registroSeleccionado) {
            return;
        }

        setMotivoRechazo("");
        setModalRechazo(true);
    };



    /* =====================================================
       CONFIRMAR RECHAZO
    ===================================================== */

    const rechazarPedido =
        async () => {

            const motivo =
                motivoRechazo.trim();

            if (!motivo) {

                alertify.warning(
                    "Debe indicar el motivo del rechazo.",
                );

                return;
            }

            setAccionando(true);

            try {

                const response =
                    await axios.put(
                        `/api/pedidosproduccion/${registroSeleccionado.idpedidoproduccion}/autorizacion-contabilidad/rechazar`,
                        {
                            motivo,
                        },
                        {
                            headers:
                                getHeaders(),
                        },
                    );

                alertify.success(
                    response.data
                        ?.message ||
                        "Pedido rechazado.",
                );

                setModalRechazo(
                    false,
                );

                setMotivoRechazo(
                    "",
                );

                await consultarPedidos();

            } catch (error) {

                console.error(error);

                const validation =
                    error?.response?.data
                        ?.errors?.motivo?.[0];

                alertify.error(
                    validation ||
                        error?.response
                            ?.data
                            ?.message ||
                        "No fue posible rechazar el pedido.",
                );

            } finally {

                setAccionando(false);
            }
        };



    /* =====================================================
       ESTADO SELECCIONADO
    ===================================================== */

    const estaPendiente =
        registroSeleccionado
            ?.autorizacion_estado ===
        "PENDIENTE";



    return (

        <div className="gp-module-page gp-autorizacion-page">

            {/* =============================================
                DETALLE
            ============================================= */}

            {modalDetalle &&
                detallePedido && (

                    <DetallePedidoVistaModal
                        detalle={
                            detallePedido.detalle
                        }
                        pedido={
                            detallePedido.pedido
                        }
                        onClose={() => {

                            setModalDetalle(
                                false,
                            );

                            setDetallePedido(
                                null,
                            );
                        }}
                    />
                )}



            {/* =============================================
                PDF
            ============================================= */}

            {pdfData && (

                <div className="gp-auth-overlay">

                    <div className="gp-auth-pdf-window">

                        <div className="gp-auth-modal-header">

                            <div className="gp-auth-modal-heading">

                                <FileText
                                    size={18}
                                />

                                <div>
                                    <span>
                                        PRODUCCIÓN · PEDIDO
                                    </span>

                                    <strong>
                                        Pedido{" "}
                                        {
                                            pdfData
                                                .pedido
                                                ?.nopedido
                                        }
                                    </strong>
                                </div>

                            </div>

                            <button
                                type="button"
                                className="gp-auth-close"
                                onClick={() =>
                                    setPdfData(
                                        null,
                                    )
                                }
                            >
                                <X size={18} />
                            </button>

                        </div>

                        <div className="gp-auth-pdf-viewer">

                            <PDFViewer
                                width="100%"
                                height="100%"
                            >
                                <PedidoProduccionPDF
                                    pedido={
                                        pdfData.pedido
                                    }
                                    logoSrc="/images/LogoGP.png"
                                />
                            </PDFViewer>

                        </div>

                        <div className="gp-auth-modal-footer">

                            <button
                                type="button"
                                className="gp-auth-btn-secondary"
                                onClick={() =>
                                    setPdfData(
                                        null,
                                    )
                                }
                            >
                                <X size={15} />
                                Cerrar
                            </button>

                            <PDFDownloadLink
                                document={
                                    <PedidoProduccionPDF
                                        pedido={
                                            pdfData.pedido
                                        }
                                        logoSrc="/images/LogoGP.png"
                                    />
                                }
                                fileName={`PEDIDO-${pdfData.pedido?.nopedido}.pdf`}
                                className="gp-auth-btn-pdf"
                            >
                                {({
                                    loading,
                                }) => (
                                    <>
                                        <FileDown
                                            size={
                                                15
                                            }
                                        />

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



            {/* =============================================
                DOCUMENTOS
            ============================================= */}

            {modalDocumentos && (

                <div className="gp-auth-overlay">

                    <div className="gp-auth-doc-window">

                        <div className="gp-auth-modal-header">

                            <div className="gp-auth-modal-heading">

                                <FolderOpen
                                    size={18}
                                />

                                <div>
                                    <span>
                                        PEDIDO · DOCUMENTOS
                                    </span>

                                    <strong>
                                        {
                                            tituloDocumentos
                                        }
                                    </strong>
                                </div>

                            </div>

                            <button
                                type="button"
                                className="gp-auth-close"
                                onClick={() =>
                                    setModalDocumentos(
                                        false,
                                    )
                                }
                            >
                                <X size={18} />
                            </button>

                        </div>

                        <div className="gp-auth-doc-body">

                            {documentos.length >
                            0 ? (

                                <div className="gp-auth-doc-list">

                                    {documentos.map(
                                        (
                                            archivo,
                                        ) => (

                                            <div
                                                className="gp-auth-doc-item"
                                                key={
                                                    archivo.idarchivo
                                                }
                                            >

                                                <div>
                                                    <FileText
                                                        size={
                                                            16
                                                        }
                                                    />

                                                    <span>
                                                        {
                                                            archivo.nombre_original ||
                                                            archivo.nombre_archivo
                                                        }
                                                    </span>
                                                </div>

                                                <a
                                                    href={
                                                        archivo.url
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Ver archivo
                                                </a>

                                            </div>
                                        ),
                                    )}

                                </div>

                            ) : (

                                <div className="gp-auth-empty">

                                    No existen archivos adjuntos.

                                </div>
                            )}

                            {justificacionDocumento && (

                                <div className="gp-auth-justification">

                                    <strong>
                                        Justificación
                                    </strong>

                                    <p>
                                        {
                                            justificacionDocumento
                                        }
                                    </p>

                                </div>
                            )}

                        </div>

                        <div className="gp-auth-modal-footer">

                            <button
                                type="button"
                                className="gp-auth-btn-secondary"
                                onClick={() =>
                                    setModalDocumentos(
                                        false,
                                    )
                                }
                            >
                                Cerrar
                            </button>

                        </div>

                    </div>

                </div>
            )}



            {/* =============================================
                RECHAZO
            ============================================= */}

            {modalRechazo && (

                <div className="gp-auth-overlay">

                    <div className="gp-auth-reject-window">

                        <div className="gp-auth-modal-header">

                            <div className="gp-auth-modal-heading gp-auth-modal-heading-danger">

                                <XCircle
                                    size={18}
                                />

                                <div>
                                    <span>
                                        CONTABILIDAD
                                    </span>

                                    <strong>
                                        Rechazar pedido
                                    </strong>
                                </div>

                            </div>

                            <button
                                type="button"
                                className="gp-auth-close"
                                onClick={() =>
                                    setModalRechazo(
                                        false,
                                    )
                                }
                            >
                                <X size={18} />
                            </button>

                        </div>

                        <div className="gp-auth-reject-body">

                            <div className="gp-auth-reject-info">

                                <span>
                                    Pedido
                                </span>

                                <strong>
                                    {
                                        registroSeleccionado
                                            ?.nopedido
                                    }
                                </strong>

                                <span>
                                    {
                                        registroSeleccionado
                                            ?.cliente
                                    }
                                </span>

                            </div>

                            <div className="gp-auth-field">

                                <label>
                                    Motivo del rechazo
                                    <span>*</span>
                                </label>

                                <textarea
                                    rows={5}
                                    value={
                                        motivoRechazo
                                    }
                                    onChange={(
                                        e,
                                    ) =>
                                        setMotivoRechazo(
                                            e
                                                .target
                                                .value,
                                        )
                                    }
                                    maxLength={
                                        2000
                                    }
                                    placeholder="Indique claramente qué debe corregir Ventas..."
                                />

                                <small>
                                    {
                                        motivoRechazo.length
                                    }
                                    /2000
                                </small>

                            </div>

                        </div>

                        <div className="gp-auth-modal-footer">

                            <button
                                type="button"
                                className="gp-auth-btn-secondary"
                                disabled={
                                    accionando
                                }
                                onClick={() =>
                                    setModalRechazo(
                                        false,
                                    )
                                }
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="gp-auth-btn-reject"
                                disabled={
                                    accionando
                                }
                                onClick={
                                    rechazarPedido
                                }
                            >
                                <XCircle
                                    size={15}
                                />

                                {accionando
                                    ? "Procesando..."
                                    : "Rechazar pedido"}
                            </button>

                        </div>

                    </div>

                </div>
            )}



            {/* =============================================
                CARD PRINCIPAL
            ============================================= */}

            <div className="gp-module-card gp-auth-card">

                {/* HEADER */}

                <div className="gp-auth-header">

                    <div className="gp-auth-heading">

                        <div className="gp-auth-heading-icon">
                            <ShieldCheck
                                size={22}
                            />
                        </div>

                        <div>

                            <div className="gp-module-meta">
                                CONTABILIDAD · PRODUCCIÓN
                            </div>

                            <h1>
                                Autorización de pedidos
                            </h1>

                            <p>
                                Revisa los pedidos enviados por Ventas y autoriza o rechaza su continuación hacia Logística.
                            </p>

                        </div>

                    </div>

                </div>



                {/* FILTROS */}

                <section className="gp-auth-section">

                    <div className="gp-auth-section-header">

                        <div>

                            <CalendarDays
                                size={16}
                            />

                            <div>
                                <strong>
                                    Consulta de pedidos
                                </strong>

                                <span>
                                    Filtra por fecha y estado de autorización.
                                </span>
                            </div>

                        </div>

                        <span className="gp-auth-count">
                            {
                                pedidosFiltrados.length
                            }{" "}
                            registros
                        </span>

                    </div>

                    <div className="gp-auth-filter-body">

                        <div className="gp-auth-field">
                            <label>
                                Fecha inicio
                            </label>

                            <input
                                type="date"
                                value={
                                    fechaInicio
                                }
                                onChange={(
                                    e,
                                ) =>
                                    setFechaInicio(
                                        e.target
                                            .value,
                                    )
                                }
                            />
                        </div>

                        <div className="gp-auth-field">
                            <label>
                                Fecha final
                            </label>

                            <input
                                type="date"
                                value={
                                    fechaFin
                                }
                                onChange={(
                                    e,
                                ) =>
                                    setFechaFin(
                                        e.target
                                            .value,
                                    )
                                }
                            />
                        </div>

                        <div className="gp-auth-field">
                            <label>
                                Estado autorización
                            </label>

                            <select
                                value={
                                    estadoAutorizacion
                                }
                                onChange={(
                                    e,
                                ) =>
                                    setEstadoAutorizacion(
                                        e.target
                                            .value,
                                    )
                                }
                            >
                                <option value="">
                                    Todos
                                </option>

                                <option value="PENDIENTE">
                                    Pendientes
                                </option>

                                <option value="APROBADO">
                                    Aprobados
                                </option>

                                <option value="RECHAZADO">
                                    Rechazados
                                </option>
                            </select>
                        </div>

                        <button
                            type="button"
                            className="gp-auth-consult"
                            disabled={
                                loading
                            }
                            onClick={() =>
                                consultarPedidos()
                            }
                        >
                            <Search
                                size={15}
                            />

                            {loading
                                ? "Consultando..."
                                : "Consultar"}
                        </button>

                    </div>

                </section>



                {/* BUSCADOR */}

                <div className="gp-auth-search-area">

                    <label>
                        Buscar en resultados
                    </label>

                    <div className="gp-auth-search">

                        <Search
                            size={15}
                        />

                        <input
                            type="text"
                            value={filtro}
                            onChange={(
                                e,
                            ) =>
                                setFiltro(
                                    e.target
                                        .value,
                                )
                            }
                            placeholder="Pedido, cliente, asesor, cotización, envío..."
                        />

                        {filtro && (

                            <button
                                type="button"
                                onClick={() =>
                                    setFiltro("")
                                }
                            >
                                <X
                                    size={14}
                                />
                            </button>
                        )}

                    </div>

                </div>



                {/* ACCIONES */}

                <div className="gp-auth-toolbar">

                    <div className="gp-auth-toolbar-actions">

                        <button
                            type="button"
                            className="gp-auth-action"
                            disabled={
                                !registroSeleccionado
                            }
                            onClick={
                                verDetalle
                            }
                        >
                            <Eye
                                size={15}
                            />
                            Detalle
                        </button>

                        <button
                            type="button"
                            className="gp-auth-action"
                            disabled={
                                !registroSeleccionado
                            }
                            onClick={
                                verPdf
                            }
                        >
                            <FileText
                                size={15}
                            />
                            PDF
                        </button>

                        <button
                            type="button"
                            className="gp-auth-action"
                            disabled={
                                !registroSeleccionado
                            }
                            onClick={() =>
                                consultarDocumentos(
                                    "PERMISO",
                                )
                            }
                        >
                            <FolderOpen
                                size={15}
                            />
                            Permisos
                        </button>

                        <button
                            type="button"
                            className="gp-auth-action"
                            disabled={
                                !registroSeleccionado ||
                                registroSeleccionado
                                    ?.requiere_instalacion !==
                                    "S"
                            }
                            onClick={() =>
                                consultarDocumentos(
                                    "MONTAJE",
                                )
                            }
                        >
                            <Image
                                size={15}
                            />
                            Montajes
                        </button>

                    </div>

                    <div className="gp-auth-toolbar-decision">

                        <button
                            type="button"
                            className="gp-auth-reject"
                            disabled={
                                !registroSeleccionado ||
                                !estaPendiente ||
                                accionando
                            }
                            onClick={
                                abrirRechazo
                            }
                        >
                            <XCircle
                                size={15}
                            />
                            Rechazar
                        </button>

                        <button
                            type="button"
                            className="gp-auth-approve"
                            disabled={
                                !registroSeleccionado ||
                                !estaPendiente ||
                                accionando
                            }
                            onClick={
                                aprobarPedido
                            }
                        >
                            <CheckCircle2
                                size={15}
                            />
                            Aprobar
                        </button>

                    </div>

                </div>



                {/* SELECCIONADO */}

                <div className="gp-auth-selected">

                    {registroSeleccionado ? (
                        <>
                            <div>
                                <span>
                                    Pedido seleccionado
                                </span>

                                <strong>
                                    {
                                        registroSeleccionado.nopedido
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Cliente
                                </span>

                                <strong>
                                    {
                                        registroSeleccionado.cliente
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Estado
                                </span>

                                <strong
                                    className={`gp-auth-selected-status gp-auth-status-${String(
                                        registroSeleccionado.autorizacion_estado ||
                                            "",
                                    ).toLowerCase()}`}
                                >
                                    {
                                        registroSeleccionado.autorizacion_estado
                                    }
                                </strong>
                            </div>
                        </>
                    ) : (
                        <span>
                            Selecciona un pedido para habilitar las acciones.
                        </span>
                    )}

                </div>



                {/* TABLA */}

                <section className="gp-auth-section gp-auth-table-section">

                    <div className="gp-auth-section-header">

                        <div>

                            <ShieldCheck
                                size={16}
                            />

                            <div>
                                <strong>
                                    Pedidos enviados a autorización
                                </strong>

                                <span>
                                    Selecciona una fila para revisar el pedido.
                                </span>
                            </div>

                        </div>

                    </div>

                    <div className="gp-auth-table-wrapper">

                        <table className="gp-auth-table">

                            <thead>
                                <tr>
                                    <th>
                                        Pedido
                                    </th>

                                    <th>
                                        Fecha
                                    </th>

                                    <th>
                                        Entrega
                                    </th>

                                    <th>
                                        Cliente
                                    </th>

                                    <th>
                                        Asesor
                                    </th>

                                    <th>
                                        No. Envío
                                    </th>

                                    <th>
                                        Permisos
                                    </th>

                                    <th>
                                        Instalación
                                    </th>

                                    <th>
                                        Montajes
                                    </th>

                                    <th>
                                        Estado
                                    </th>

                                    <th>
                                        Autorizado por
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {loading ? (

                                    <tr>
                                        <td
                                            colSpan={
                                                11
                                            }
                                            className="gp-auth-table-message"
                                        >
                                            Cargando pedidos...
                                        </td>
                                    </tr>

                                ) : pedidosFiltrados.length ===
                                  0 ? (

                                    <tr>
                                        <td
                                            colSpan={
                                                11
                                            }
                                            className="gp-auth-table-message"
                                        >
                                            No se encontraron pedidos para los filtros seleccionados.
                                        </td>
                                    </tr>

                                ) : (

                                    pedidosFiltrados.map(
                                        (
                                            pedido,
                                        ) => {

                                            const seleccionado =
                                                Number(
                                                    registroSeleccionado
                                                        ?.idpedidoproduccion,
                                                ) ===
                                                Number(
                                                    pedido.idpedidoproduccion,
                                                );

                                            return (

                                                <tr
                                                    key={
                                                        pedido.idpedidoproduccion
                                                    }
                                                    className={
                                                        seleccionado
                                                            ? "selected"
                                                            : ""
                                                    }
                                                    onClick={() =>
                                                        setRegistroSeleccionado(
                                                            pedido,
                                                        )
                                                    }
                                                >

                                                    <td className="gp-auth-order">
                                                        {
                                                            pedido.nopedido
                                                        }
                                                    </td>

                                                    <td>
                                                        {formatearFecha(
                                                            pedido.fecha_pedido,
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatearFecha(
                                                            pedido.fecha_entrega,
                                                        )}
                                                    </td>

                                                    <td>
                                                        {
                                                            pedido.cliente
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            pedido.asesor
                                                        }
                                                    </td>

                                                    <td>
                                                        {pedido.no_envio_asociado ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`gp-auth-mini-status gp-auth-doc-${String(
                                                                pedido.permisos_estado ||
                                                                    "",
                                                            ).toLowerCase()}`}
                                                        >
                                                            {pedido.permisos_estado ||
                                                                "SIN DEFINIR"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {pedido.requiere_instalacion ===
                                                        "S"
                                                            ? "Sí"
                                                            : "No"}
                                                    </td>

                                                    <td>
                                                        {pedido.requiere_instalacion !==
                                                        "S"
                                                            ? "N/A"
                                                            : pedido.montajes_estado ||
                                                              "SIN DEFINIR"}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`gp-auth-status gp-auth-status-${String(
                                                                pedido.autorizacion_estado ||
                                                                    "",
                                                            ).toLowerCase()}`}
                                                        >
                                                            {
                                                                pedido.autorizacion_estado
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {pedido.autorizacion_usuario ||
                                                            "—"}
                                                    </td>

                                                </tr>
                                            );
                                        },
                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                </section>



                {/* INFORMACIÓN DECISIÓN */}

                {registroSeleccionado &&
                    registroSeleccionado
                        .autorizacion_estado !==
                        "PENDIENTE" && (

                        <div className="gp-auth-decision-detail">

                            <div>
                                <span>
                                    Decisión
                                </span>

                                <strong>
                                    {
                                        registroSeleccionado.autorizacion_estado
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Usuario
                                </span>

                                <strong>
                                    {registroSeleccionado.autorizacion_usuario ||
                                        "—"}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Fecha
                                </span>

                                <strong>
                                    {formatearFecha(
                                        registroSeleccionado.autorizacion_fecha,
                                        true,
                                    )}
                                </strong>
                            </div>

                            {registroSeleccionado.autorizacion_observacion && (

                                <div className="gp-auth-decision-observation">

                                    <span>
                                        Motivo / observación
                                    </span>

                                    <p>
                                        {
                                            registroSeleccionado.autorizacion_observacion
                                        }
                                    </p>

                                </div>
                            )}

                        </div>
                    )}

            </div>

        </div>
    );
}


export default AutorizacionPedidosProduccion;