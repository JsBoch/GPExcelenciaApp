import React, { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import "bootstrap/dist/css/bootstrap.min.css";
import { PDFViewer } from "@react-pdf/renderer";
import alertify from "alertifyjs";
import { format } from "date-fns";
import {
    CalendarDays,
    FileSpreadsheet,
    ReceiptText,
    Search,
    X,
} from "lucide-react";

import CotizacionPDF from "./CotizacionPDF";

import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";
import "../../css/tableFormat.css";
import "../../css/lista-cotizaciones-costeo-historico.css";

DataTable.use(DT);

function ListaCotizacionesCosteo() {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null);
    const [pdfData, setPdfData] = useState(null);
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");

    useEffect(() => {
        fetch("/i18n/Spanish.json")
            .then((response) => response.json())
            .then((data) => setSpanishTranslation(data))
            .catch((error) =>
                console.error("Error al cargar la traducción:", error)
            );
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");

        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((res) => {
                const fechaServidor = res.data.fecha;

                setFechaInicio(fechaServidor);
                setFechaFin(fechaServidor);

                fetchCotizaciones(fechaServidor, fechaServidor);
            })
            .catch(() => {
                const today = new Date().toISOString().split("T")[0];

                setFechaInicio(today);
                setFechaFin(today);

                fetchCotizaciones(today, today);
            });
    }, []);

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
                .get(`/api/cotizacionescosteo?${params.toString()}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                .then((response) => {
                    setCotizaciones(response.data);
                    setLoading(false);
                })
                .catch(() => {
                    alertify.error("Error al obtener las cotizaciones.");
                    setLoading(false);
                });
        } else {
            setCotizaciones([]);
            setLoading(false);

            if (!token) {
                alertify.error("Token de autenticación no encontrado");
            }
        }
    };

    const handleFiltrar = () => {
        fetchCotizaciones(fechaInicio, fechaFin);
    };

    const columns = [
        {
            data: "idcotizacion",
            title: "Acciones",
            orderable: false,
            searchable: false,
            className: "gp-costeo-h-actions-cell",
            render: (data) => {
                return `
                    <div class="gp-costeo-h-row-actions">
                        <button
                            type="button"
                            class="gp-costeo-h-icon-button gp-costeo-h-pdf-button pdf-btn"
                            data-id="${data}"
                            title="Ver cotización PDF"
                        >
                            <i class="fa-solid fa-file-pdf"></i>
                        </button>
                    </div>
                `;
            },
        },
        {
            data: "idcotizacion",
            title: "ID",
            visible: false,
        },
        {
            data: "nocotizacion",
            title: "No. Cotización",
            className: "gp-costeo-h-number-cell",
        },
        {
            data: "fecha_cotizacion",
            title: "Fecha",
            className: "gp-costeo-h-date-cell",
            render: (data) => {
                if (!data) return "";

                try {
                    const date = new Date(data);
                    return format(date, "dd-MM-yyyy");
                } catch (error) {
                    console.error("Error al formatear la fecha:", error);
                    return "";
                }
            },
        },
        {
            data: "tipo_pago",
            title: "Forma Pago",
            visible: false,
        },
        {
            data: "total_general",
            title: "Total",
            className: "gp-costeo-h-total-cell",
            render: (data) => {
                if (data === null || data === undefined) return "";

                try {
                    return Number(data).toLocaleString("es-GT", {
                        style: "currency",
                        currency: "GTQ",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    });
                } catch (error) {
                    console.error("Error al formatear la moneda:", error);
                    return data;
                }
            },
        },
        {
            data: "costear",
            title: "Costear",
            className: "gp-costeo-h-costear-cell",
            render: (data) => {
                if (data === "S") {
                    return `
                        <span class="gp-costeo-h-badge gp-costeo-h-badge-blue">
                            Sí
                        </span>
                    `;
                }

                return `
                    <span class="gp-costeo-h-badge gp-costeo-h-badge-muted">
                        ${data ?? "—"}
                    </span>
                `;
            },
        },
        {
            data: "cliente",
            title: "Cliente",
            className: "gp-costeo-h-client-cell",
        },
        {
            data: "contacto",
            title: "Contacto",
            visible: false,
        },
        {
            data: "direccion_entrega",
            title: "Dirección entrega",
            visible: false,
        },
        {
            data: "observaciones_costeo",
            title: "Obsv. Costeo",
            className: "gp-costeo-h-observation-cell",
            render: (data) => {
                if (!data) {
                    return `
                        <span class="gp-costeo-h-empty">
                            Sin observaciones
                        </span>
                    `;
                }

                return `<span>${data}</span>`;
            },
        },
        {
            data: "observaciones_cliente",
            title: "Obsv. Cliente",
            visible: false,
        },
        {
            data: "costeo_observaciones",
            title: "Obsv. Vendedor",
            className: "gp-costeo-h-observation-cell",
            render: (data) => {
                if (!data) {
                    return `
                        <span class="gp-costeo-h-empty">
                            Sin observaciones
                        </span>
                    `;
                }

                return `<span>${data}</span>`;
            },
        },
        {
            data: "idcotizacionoriginal",
            title: "ID CotizacionOriginal",
            visible: false,
        },
        {
            data: "idcliente",
            title: "ID Cliente",
            visible: false,
        },
        {
            data: "idcontacto",
            title: "ID Contacto",
            visible: false,
        },
        {
            data: "trabajo",
            title: "Trabajo",
            visible: false,
        },
        {
            data: "version",
            title: "Versión",
            visible: false,
        },
        {
            data: "estado",
            title: "Estado",
            visible: false,
        },
        {
            data: "archivo_costeo",
            title: "Archivo Costeo",
            className: "gp-costeo-h-file-cell",
            render: (data) => {
                const hasFile =
                    data != null &&
                    typeof data === "string" &&
                    data.trim() !== "" &&
                    data.toLowerCase() !== "null";

                if (hasFile) {
                    return `
                        <a
                            class="gp-costeo-h-file-link"
                            href="/${data}"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir archivo de costeo"
                        >
                            <i class="fa-solid fa-file-arrow-down"></i>
                            <span>Ver archivo</span>
                        </a>
                    `;
                }

                return `
                    <span class="gp-costeo-h-no-file">
                        Sin archivo
                    </span>
                `;
            },
        },
    ];

    useEffect(() => {
        const handleButtonClick = async (event) => {
            const button = event.target.closest("button");

            if (!button) return;

            const id = button.getAttribute("data-id");

            if (!id) return;

            const token = localStorage.getItem("token");

            if (button.classList.contains("pdf-btn")) {
                if (!token) {
                    alertify.error(
                        "Token no encontrado para generar PDF."
                    );
                    return;
                }

                try {
                    const response = await fetch(
                        `/api/cotizacionescosteo/${id}/pdf`,
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
            }
        };

        document.addEventListener("click", handleButtonClick);

        return () => {
            document.removeEventListener("click", handleButtonClick);
        };
    }, []);

    const options = {
        autoWidth: false,
        language: spanishTranslation,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        order: [],

        rowCallback: (row, data) => {
            row.classList.remove(
                "gp-costeo-h-row-pending",
                "gp-costeo-h-row-special"
            );

            if (Number(data.estado) === 1 && data.costear === "S") {
                row.classList.add("gp-costeo-h-row-pending");
            } else if (Number(data.estado) === 3) {
                row.classList.add("gp-costeo-h-row-special");
            }
        },
    };

    return (
        <div className="gp-module-page gp-costeo-h-page">
            {pdfData && (
                <div className="gp-costeo-h-pdf-overlay">
                    <div className="gp-costeo-h-pdf-modal">
                        <div className="gp-costeo-h-pdf-header">
                            <div className="gp-costeo-h-pdf-title-area">
                                <div className="gp-costeo-h-pdf-icon">
                                    <ReceiptText size={20} />
                                </div>

                                <div>
                                    <span>
                                        COTIZACIONES · COSTEO
                                    </span>

                                    <h2>
                                        Vista previa de cotización
                                    </h2>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="gp-costeo-h-pdf-close"
                                onClick={() => setPdfData(null)}
                                title="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="gp-costeo-h-pdf-body">
                            <PDFViewer
                                width="100%"
                                height="100%"
                            >
                                <CotizacionPDF
                                    cotizacion={
                                        pdfData.cotizacion
                                    }
                                    totalEnLetras={
                                        pdfData.totalEnLetras
                                    }
                                    logoSrc="/images/LogoGP.jpg"
                                />
                            </PDFViewer>
                        </div>

                        <div className="gp-costeo-h-pdf-footer">
                            <button
                                type="button"
                                className="gp-btn-danger gp-costeo-h-close-pdf"
                                onClick={() => setPdfData(null)}
                            >
                                <X size={16} />
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="gp-module-card gp-costeo-h-card">
                <div className="gp-costeo-h-header">
                    <div>
                        <div className="gp-module-meta">
                            MÓDULO · COTIZACIONES
                        </div>

                        <h1 className="gp-costeo-h-title">
                            Consulta de costeo
                        </h1>

                        <p className="gp-costeo-h-description">
                            Consulta las cotizaciones enviadas a
                            costeo por rango de fechas, sus
                            observaciones y archivos relacionados.
                        </p>
                    </div>

                    <div className="gp-costeo-h-header-icon">
                        <FileSpreadsheet size={25} />
                    </div>
                </div>

                <div className="gp-costeo-h-filter-section">
                    <div className="gp-costeo-h-filter-title">
                        <div>
                            <CalendarDays size={17} />

                            <span>Rango de consulta</span>
                        </div>

                        {!loading && (
                            <span className="gp-costeo-h-count">
                                {cotizaciones.length}{" "}
                                {cotizaciones.length === 1
                                    ? "registro"
                                    : "registros"}
                            </span>
                        )}
                    </div>

                    <div className="gp-costeo-h-filters">
                        <div className="gp-costeo-h-field">
                            <label htmlFor="fechaInicio">
                                Fecha inicio
                            </label>

                            <input
                                type="date"
                                id="fechaInicio"
                                value={fechaInicio}
                                onChange={(e) =>
                                    setFechaInicio(
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="gp-costeo-h-field">
                            <label htmlFor="fechaFin">
                                Fecha fin
                            </label>

                            <input
                                type="date"
                                id="fechaFin"
                                value={fechaFin}
                                onChange={(e) =>
                                    setFechaFin(
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        <button
                            type="button"
                            className="gp-action-button gp-action-consult gp-costeo-h-consult"
                            onClick={handleFiltrar}
                        >
                            <Search size={16} />
                            Consultar
                        </button>
                    </div>
                </div>

                <div className="gp-module-body gp-costeo-h-body">
                    <div className="gp-costeo-h-section-heading">
                        <div>
                            <h2>
                                Cotizaciones registradas
                            </h2>

                            <p>
                                Consulta el documento original,
                                observaciones y archivo generado
                                durante el proceso de costeo.
                            </p>
                        </div>

                        <div className="gp-costeo-h-legend">
                            <span>
                                <i className="gp-costeo-h-dot gp-costeo-h-dot-gray" />
                                Pendiente
                            </span>

                            <span>
                                <i className="gp-costeo-h-dot gp-costeo-h-dot-yellow" />
                                Estado especial
                            </span>
                        </div>
                    </div>

                    {loading || !spanishTranslation ? (
                        <div className="gp-costeo-h-loading">
                            <div className="gp-costeo-h-spinner" />

                            <div>
                                <strong>
                                    Cargando cotizaciones
                                </strong>

                                <span>
                                    Consultando información de
                                    costeo...
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="gp-costeo-h-table-wrapper">
                            <DataTable
                                data={cotizaciones}
                                columns={columns}
                                options={options}
                                className="table gp-costeo-h-table"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ListaCotizacionesCosteo;