import React, { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import { useNavigate } from "react-router-dom";
import alertify from "alertifyjs";
import { format } from "date-fns";
import { PDFViewer } from "@react-pdf/renderer";
import {
    Calculator,
    ReceiptText,
    X,
    ClipboardList,
} from "lucide-react";

import "bootstrap/dist/css/bootstrap.min.css";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

import CotizacionPDF from "./CotizacionPDF";

import "../../css/tableFormat.css";
import "../../css/lista-cotizaciones-costeo.css";

DataTable.use(DT);

function ListaCotizacionesCosteo() {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null);
    const [pdfData, setPdfData] = useState(null);

    const navigate = useNavigate();

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

        if (!token) {
            console.error("Token de autenticación no encontrado");
            setLoading(false);
            return;
        }

        axios
            .get("/api/costeocotizaciones", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                setCotizaciones(response.data);
                setLoading(false);
            })
            .catch(() => {
                alertify.error("Error al obtener las cotizaciones");
                setLoading(false);
            });
    }, []);

    const columns = [
        {
            data: "idcotizacion",
            title: "Acciones",
            orderable: false,
            searchable: false,
            className: "gp-costeo-actions-cell",
            render: (data, type, row) => {
                return `
                    <div class="gp-costeo-row-actions">
                        <button
                            type="button"
                            class="gp-costeo-action gp-costeo-action-main costear-btn"
                            data-id="${data}"
                            data-obs-costeo="${row.observaciones_costeo ?? ""}"
                            data-obs-cliente="${row.observaciones_cliente ?? ""}"
                            title="Costear cotización"
                        >
                            <i class="fa-solid fa-calculator"></i>
                            <span>Costear</span>
                        </button>

                        <button
                            type="button"
                            class="gp-costeo-icon-action gp-costeo-pdf pdf-btn"
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
            className: "gp-costeo-number-cell",
        },
        {
            data: "fecha_cotizacion",
            title: "Fecha",
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
            className: "gp-costeo-total-cell",
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
            visible: false,
        },
        {
            data: "cliente",
            title: "Cliente",
            className: "gp-costeo-client-cell",
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
            className: "gp-costeo-observation-cell",
            render: (data) => {
                if (!data) {
                    return '<span class="gp-costeo-empty">Sin observaciones</span>';
                }

                return `<span title="${String(data).replace(/"/g, "&quot;")}">${data}</span>`;
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
            visible: false,
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
    ];

    useEffect(() => {
        const handleButtonClick = async (event) => {
            const button = event.target.closest("button");

            if (!button) return;

            const id = button.getAttribute("data-id");

            if (!id) return;

            const token = localStorage.getItem("token");

            if (button.classList.contains("costear-btn")) {
                const obsCosteo = button.getAttribute("data-obs-costeo");
                const obsCliente = button.getAttribute("data-obs-cliente");

                navigate(`/costeocotizaciones/costeo/${id}`, {
                    state: {
                        observaciones_costeo: obsCosteo,
                        observaciones_cliente: obsCliente,
                    },
                });

                return;
            }

            if (button.classList.contains("pdf-btn")) {
                if (!token) {
                    alertify.error("Token no encontrado para generar PDF.");
                    return;
                }

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
            }
        };

        document.addEventListener("click", handleButtonClick);

        return () => {
            document.removeEventListener("click", handleButtonClick);
        };
    }, [navigate]);

    const options = {
        language: spanishTranslation,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        order: [],
        autoWidth: false,
    };

    return (
        <div className="gp-module-page gp-costeo-page">
            {pdfData && (
                <div className="gp-costeo-pdf-overlay">
                    <div className="gp-costeo-pdf-modal">
                        <div className="gp-costeo-pdf-header">
                            <div className="gp-costeo-pdf-heading">
                                <div className="gp-costeo-pdf-icon">
                                    <ReceiptText size={20} />
                                </div>

                                <div>
                                    <span className="gp-costeo-pdf-eyebrow">
                                        COTIZACIONES
                                    </span>

                                    <h2>Vista previa de cotización</h2>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="gp-costeo-pdf-close"
                                onClick={() => setPdfData(null)}
                                title="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="gp-costeo-pdf-body">
                            <PDFViewer width="100%" height="100%">
                                <CotizacionPDF
                                    cotizacion={pdfData.cotizacion}
                                    totalEnLetras={pdfData.totalEnLetras}
                                    logoSrc="/images/LogoGP.jpg"
                                />
                            </PDFViewer>
                        </div>

                        <div className="gp-costeo-pdf-footer">
                            <button
                                type="button"
                                className="gp-btn-danger"
                                onClick={() => setPdfData(null)}
                            >
                                <X size={17} />
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="gp-module-card gp-costeo-card">
                <div className="gp-costeo-header">
                    <div>
                        <div className="gp-module-meta">
                            MÓDULO · COTIZACIONES
                        </div>

                        <h1 className="gp-costeo-title">
                            Cotizaciones para costeo
                        </h1>

                        <p className="gp-costeo-description">
                            Consulta las cotizaciones pendientes y accede al
                            proceso de costeo o a su documento PDF.
                        </p>
                    </div>

                    <div className="gp-costeo-header-icon">
                        <Calculator size={25} />
                    </div>
                </div>

                <div className="gp-costeo-summary">
                    <div className="gp-costeo-summary-icon">
                        <ClipboardList size={20} />
                    </div>

                    <div className="gp-costeo-summary-content">
                        <span>Cotizaciones disponibles</span>

                        <strong>
                            {loading ? "—" : cotizaciones.length}
                        </strong>
                    </div>
                </div>

                <div className="gp-module-body gp-costeo-body">
                    <div className="gp-costeo-section-heading">
                        <div>
                            <h2>Cotizaciones pendientes</h2>

                            <p>
                                Selecciona <strong>Costear</strong> para ingresar
                                al detalle o utiliza el botón PDF para consultar
                                la cotización.
                            </p>
                        </div>

                        {!loading && (
                            <span className="gp-costeo-record-count">
                                {cotizaciones.length}{" "}
                                {cotizaciones.length === 1
                                    ? "registro"
                                    : "registros"}
                            </span>
                        )}
                    </div>

                    {loading || !spanishTranslation ? (
                        <div className="gp-costeo-loading">
                            <div className="gp-costeo-spinner" />

                            <div>
                                <strong>Cargando cotizaciones</strong>
                                <span>
                                    Obteniendo información disponible para
                                    costeo...
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="gp-costeo-table-wrapper">
                            <DataTable
                                data={cotizaciones}
                                columns={columns}
                                options={options}
                                className="table gp-costeo-table"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ListaCotizacionesCosteo;