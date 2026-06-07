import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import "bootstrap/dist/css/bootstrap.min.css";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import alertify from "alertifyjs";
import { format } from "date-fns";
import "../../css/tableFormat.css";
import Header from "./Header";
import DetallePedidoVistaModal from "./DetallePedidoVistaModal";
import PedidoProduccionPDF from "./PedidoProduccionPDF";

DataTable.use(DT);

function AutorizacionALogistica() {
    const [pedidos, setPedidos] = useState([]);
    const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
    const [detallePedido, setDetallePedido] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [pdfData, setPdfData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null);
    const [tableKey, setTableKey] = useState(0);

    const pedidosRef = useRef([]);
    const dtRef = useRef(null);

    useEffect(() => {
        fetch("/i18n/Spanish.json")
            .then((response) => response.json())
            .then((data) => setSpanishTranslation(data))
            .catch((error) =>
                console.error("Error al cargar traducción:", error),
            );
    }, []);

    useEffect(() => {
        fetchPedidosAutorizacion();
    }, []);

    useEffect(() => {
        pedidosRef.current = pedidos;
    }, [pedidos]);

    const fetchPedidosAutorizacion = async () => {
        setLoading(true);

        try {
            const token = localStorage.getItem("token");

            const response = await axios.get(
                "/api/pedidosproduccion/autorizacion-logistica",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setPedidos(response.data);
            setRegistroSeleccionado(null);
            setTableKey((prev) => prev + 1);
        } catch (error) {
            console.error(error);
            alertify.error("Error al obtener pedidos en autorización.");
        } finally {
            setLoading(false);
        }
    };

    const obtenerDetallePedido = async (id) => {
        setLoading(true);

        try {
            const token = localStorage.getItem("token");

            const response = await axios.get(
                `/api/pedidosproduccion/detalle/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            const pedidoSeleccionado = pedidosRef.current.find(
                (p) => Number(p.idpedidoproduccion) === Number(id),
            );

            if (!pedidoSeleccionado) {
                alertify.error("No se encontró el pedido seleccionado.");
                return;
            }

            setDetallePedido({
                detalle: response.data,
                pedido: pedidoSeleccionado,
            });

            setModalVisible(true);
        } catch (error) {
            console.error(error);
            alertify.error("Error al obtener detalle del pedido.");
        } finally {
            setLoading(false);
        }
    };

    const generarPDF = async (id) => {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(`/api/pedidosproduccion/${id}/pdf`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            setPdfData(data);
        } catch (error) {
            console.error(error);
            alertify.error("Error al generar PDF.");
        }
    };

    const exportarExcel = async () => {
        if (!registroSeleccionado) {
            alertify.warning("Debe seleccionar un pedido.");
            return;
        }

        try {
            const token = localStorage.getItem("token");

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
            alertify.error("Error al exportar Excel.");
        }
    };

    const regresarVentas = () => {
        if (!registroSeleccionado) {
            alertify.warning("Debe seleccionar un pedido.");
            return;
        }

        alertify.confirm(
            "Confirmación",
            "¿Desea regresar este pedido a ventas?",
            async () => {
                try {
                    const token = localStorage.getItem("token");

                    await axios.put(
                        `/api/pedidosproduccion/regresar-ventas/${registroSeleccionado.idpedidoproduccion}`,
                        {},
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        },
                    );

                    alertify.success("Pedido regresado a ventas.");
                    fetchPedidosAutorizacion();
                } catch (error) {
                    console.error(error);
                    alertify.error(
                        error?.response?.data?.message ||
                            "Error al regresar a ventas.",
                    );
                }
            },
            () => {},
        );
    };

    const enviarLogistica = () => {
        if (!registroSeleccionado) {
            alertify.warning("Debe seleccionar un pedido.");
            return;
        }

        alertify.confirm(
            "Confirmación",
            "¿Desea enviar este pedido a logística?",
            async () => {
                try {
                    const token = localStorage.getItem("token");

                    await axios.put(
                        `/api/pedidosproduccion/enviar-logistica/${registroSeleccionado.idpedidoproduccion}`,
                        {},
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        },
                    );

                    alertify.success("Pedido enviado a logística.");
                    fetchPedidosAutorizacion();
                } catch (error) {
                    console.error(error);
                    alertify.error(
                        error?.response?.data?.message ||
                            "Error al enviar a logística.",
                    );
                }
            },
            () => {},
        );
    };

    const columns = [
        { data: "idpedidoproduccion", title: "ID", visible: false },
        { data: "nopedido_num", visible: false },

        {
            data: "nopedido",
            title: "No. Pedido",
            width: "140px",
        },

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
                    return `<span class="badge bg-success">ADJUNTADO</span>`;
                }

                if (data === "PENDIENTE") {
                    return `<span class="badge bg-warning text-dark">PENDIENTE</span>`;
                }

                if (data === "NO_REQUIERE") {
                    return `<span class="badge bg-secondary">NO REQUIERE</span>`;
                }

                return `<span class="badge bg-secondary">SIN DEFINIR</span>`;
            },
        },

        {
            data: "requiere_instalacion",
            title: "🛠 Instalación",
            render: (data) => {
                return data === "S"
                    ? `<span class="badge bg-primary">SI</span>`
                    : `<span class="badge bg-secondary">NO</span>`;
            },
        },

        {
            data: null,
            title: "🖼 Montajes",
            render: (_, __, row) => {
                if (row.requiere_instalacion !== "S") {
                    return `<span class="badge bg-dark">N/A</span>`;
                }

                if (row.montajes_estado === "ADJUNTADO") {
                    return `<span class="badge bg-success">ADJUNTADO</span>`;
                }

                if (row.montajes_estado === "PENDIENTE") {
                    return `<span class="badge bg-warning text-dark">PENDIENTE</span>`;
                }

                return `<span class="badge bg-secondary">SIN DEFINIR</span>`;
            },
        },

        {
            data: "requiere_entrega",
            title: "🚚 Entrega",
            render: (data) => {
                return data === "S"
                    ? `<span class="badge bg-info text-dark">SI</span>`
                    : `<span class="badge bg-secondary">NO</span>`;
            },
        },

        { data: "trabajo", title: "Trabajo", visible: false },
        { data: "version", title: "Versión", visible: false },
        { data: "estado", title: "Estado", visible: false },

        {
            data: "estado_texto",
            title: "Estado",
            render: (data) => {
                let color = "secondary";

                if (data === "AUTORIZACIÓN") color = "warning";
                if (data === "LOGÍSTICA") color = "success";
                if (data === "REGISTRO") color = "primary";

                return `<span class="badge bg-${color}">${data}</span>`;
            },
        },
    ];

    const options = {
        autoWidth: false,
        searching: true,
        order: [[1, "desc"]],
        scrollX: false,
        columnDefs: [
            { targets: 0, width: "100px" },
            { targets: 2, width: "120px" },
        ],
        language: spanishTranslation,
        rowCallback: (row, data) => {
            row.classList.remove(
                "estado-1",
                "estado-2",
                "estado-3",
                "selected",
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
                                logoSrc="/images/LogoGP.png"
                            />
                        </PDFViewer>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                        <PDFDownloadLink
                            document={
                                <PedidoProduccionPDF
                                    pedido={pdfData.pedido}
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

            <div className="card">
                <Header title="Autorización a Logística" />

                <div className="card-body">
                    <div className="mb-3 d-flex flex-wrap gap-2">
                        <button
                            className="btn btn-primary btn-sm toolbar-btn"
                            onClick={fetchPedidosAutorizacion}
                        >
                            Consultar
                        </button>

                        <button
                            className="btn btn-info btn-sm toolbar-btn"
                            disabled={!registroSeleccionado}
                            onClick={() =>
                                obtenerDetallePedido(
                                    registroSeleccionado?.idpedidoproduccion,
                                )
                            }
                        >
                            <i className="fas fa-eye"></i> Detalle
                        </button>

                        <button
                            className="btn btn-primary btn-sm toolbar-btn"
                            disabled={!registroSeleccionado}
                            onClick={() =>
                                generarPDF(
                                    registroSeleccionado?.idpedidoproduccion,
                                )
                            }
                        >
                            <i className="fas fa-file-pdf"></i> PDF
                        </button>

                        <button
                            className="btn btn-success btn-sm toolbar-btn"
                            disabled={!registroSeleccionado}
                            onClick={exportarExcel}
                        >
                            📊 Exportar Excel
                        </button>

                        <button
                            className="btn btn-outline-danger btn-sm toolbar-btn"
                            disabled={!registroSeleccionado}
                            onClick={regresarVentas}
                        >
                            ↩ Regresar a Ventas
                        </button>

                        <button
                            className="btn btn-dark btn-sm toolbar-btn"
                            disabled={!registroSeleccionado}
                            onClick={enviarLogistica}
                        >
                            🚚 Enviar a Logística
                        </button>
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
                                data={pedidos}
                                columns={columns}
                                options={options}
                                className="table table-bordered table-hover table-sm"
                                ref={dtRef}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AutorizacionALogistica;