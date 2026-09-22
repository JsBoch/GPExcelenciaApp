import React, {
    useState,
} from "react";

import axios from "axios";

import {
    CalendarDays,
    FileDown,
    FileText,
    Search,
    ShieldAlert,
    UserRound,
} from "lucide-react";

import alertify from "alertifyjs";

import "../../../../css/reporte-facturas-anuladas.css";


const ReporteFacturasAnuladas = () => {
    const hoy =
        new Date();

    const primerDiaMes =
        new Date(
            hoy.getFullYear(),
            hoy.getMonth(),
            1,
        );


    const [
        fechaInicio,
        setFechaInicio,
    ] = useState(
        primerDiaMes
            .toISOString()
            .split("T")[0],
    );


    const [
        fechaFinal,
        setFechaFinal,
    ] = useState(
        hoy
            .toISOString()
            .split("T")[0],
    );


    const [
        data,
        setData,
    ] = useState({
        registros: [],
        porUsuario: [],
        totalGeneral: 0,
    });


    const [
        loading,
        setLoading,
    ] = useState(false);


    const [
        exporting,
        setExporting,
    ] = useState(false);


    const token =
        localStorage.getItem(
            "token",
        );


    /* =========================================================
       VALIDACIÓN
       ========================================================= */

    const validarFechas = () => {
        if (
            !fechaInicio ||
            !fechaFinal
        ) {
            alertify.warning(
                "Por favor selecciona ambas fechas",
            );

            return false;
        }


        if (
            fechaInicio >
            fechaFinal
        ) {
            alertify.warning(
                "La fecha inicial no puede ser mayor que la fecha final",
            );

            return false;
        }


        return true;
    };


    /* =========================================================
       CONSULTAR
       ========================================================= */

    const handleBuscar =
        async () => {
            if (
                !validarFechas()
            ) {
                return;
            }


            setLoading(
                true,
            );


            try {
                const res =
                    await axios.get(
                        `${import.meta.env.VITE_API_URL}/reporte/anuladas`,
                        {
                            params: {
                                fechaInicio,
                                fechaFinal,
                            },

                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        },
                    );


                setData(
                    res.data || {
                        registros: [],
                        porUsuario: [],
                        totalGeneral: 0,
                    },
                );
            } catch (error) {
                console.error(
                    "Error al obtener reporte:",
                    error,
                );


                alertify.error(
                    "Error al cargar reporte",
                );
            } finally {
                setLoading(
                    false,
                );
            }
        };


    /* =========================================================
       EXPORTAR PDF
       ========================================================= */

    const handleExportarPDF =
        async () => {
            if (
                !validarFechas()
            ) {
                return;
            }


            try {
                setExporting(
                    true,
                );


                const res =
                    await axios.get(
                        `${import.meta.env.VITE_API_URL}/reporte/anuladas`,
                        {
                            params: {
                                fechaInicio,
                                fechaFinal,
                                format:
                                    "pdf",
                            },

                            responseType:
                                "blob",

                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        },
                    );


                const blob =
                    new Blob(
                        [
                            res.data,
                        ],
                        {
                            type:
                                "application/pdf",
                        },
                    );


                const url =
                    window.URL.createObjectURL(
                        blob,
                    );


                const link =
                    document.createElement(
                        "a",
                    );


                link.href =
                    url;


                link.setAttribute(
                    "download",
                    `reporte_facturas_anuladas_${fechaInicio}_a_${fechaFinal}.pdf`,
                );


                document.body.appendChild(
                    link,
                );


                link.click();

                link.remove();


                window.URL.revokeObjectURL(
                    url,
                );
            } catch (error) {
                console.error(
                    "Error al generar PDF:",
                    error,
                );


                alertify.error(
                    "Error al exportar PDF",
                );
            } finally {
                setExporting(
                    false,
                );
            }
        };


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-cancelled-invoices-page">
            <div className="gp-module-card gp-cancelled-invoices-card">

                {/* HEADER */}

                <div className="gp-cancelled-invoices-header">
                    <div className="gp-cancelled-invoices-heading">

                        <div className="gp-cancelled-invoices-heading-icon">
                            <ShieldAlert
                                size={22}
                            />
                        </div>


                        <div>
                            <div className="gp-module-meta">
                                CONTABILIDAD · FACTURACIÓN
                            </div>

                            <h1>
                                Facturas anuladas
                            </h1>

                            <p>
                                Consulta las facturas anuladas
                                dentro de un rango de fechas y
                                revisa quién realizó cada anulación.
                            </p>
                        </div>
                    </div>


                    <div className="gp-cancelled-invoices-total">
                        <span>
                            Total anuladas
                        </span>

                        <strong>
                            {data.totalGeneral || 0}
                        </strong>
                    </div>
                </div>


                {/* FILTROS */}

                <div className="gp-cancelled-invoices-filter-wrapper">

                    <section className="gp-cancelled-invoices-filter">

                        <div className="gp-cancelled-invoices-filter-header">

                            <div>
                                <Search
                                    size={16}
                                />

                                <strong>
                                    Rango de consulta
                                </strong>
                            </div>

                            <span>
                                Selecciona el período a consultar.
                            </span>
                        </div>


                        <div className="gp-cancelled-invoices-filter-grid">

                            {/* INICIO */}

                            <div className="gp-cancelled-invoices-field">
                                <label>
                                    Fecha inicio
                                </label>

                                <div className="gp-cancelled-invoices-date">
                                    <CalendarDays
                                        size={14}
                                    />

                                    <input
                                        type="date"
                                        value={fechaInicio}
                                        onChange={(e) =>
                                            setFechaInicio(
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>


                            {/* FINAL */}

                            <div className="gp-cancelled-invoices-field">
                                <label>
                                    Fecha final
                                </label>

                                <div className="gp-cancelled-invoices-date">
                                    <CalendarDays
                                        size={14}
                                    />

                                    <input
                                        type="date"
                                        value={fechaFinal}
                                        onChange={(e) =>
                                            setFechaFinal(
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>


                            {/* BOTONES */}

                            <div className="gp-cancelled-invoices-filter-actions">

                                <button
                                    type="button"
                                    className="gp-cancelled-invoices-search-button"
                                    onClick={
                                        handleBuscar
                                    }
                                    disabled={
                                        loading
                                    }
                                >
                                    <Search
                                        size={15}
                                    />

                                    {loading
                                        ? "Consultando..."
                                        : "Buscar"}
                                </button>


                                <button
                                    type="button"
                                    className="gp-cancelled-invoices-pdf-button"
                                    onClick={
                                        handleExportarPDF
                                    }
                                    disabled={
                                        exporting
                                    }
                                >
                                    <FileDown
                                        size={15}
                                    />

                                    {exporting
                                        ? "Generando..."
                                        : "Exportar PDF"}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>


                {/* RESULTADOS */}

                <div className="gp-cancelled-invoices-results">

                    <div className="gp-cancelled-invoices-results-heading">

                        <div>
                            <h2>
                                Detalle de facturas anuladas
                            </h2>

                            <p>
                                Registros encontrados en el
                                período seleccionado.
                            </p>
                        </div>


                        <span>
                            {data.registros.length}{" "}
                            {data.registros.length === 1
                                ? "registro"
                                : "registros"}
                        </span>
                    </div>


                    {loading ? (
                        <div className="gp-cancelled-invoices-loading">
                            Consultando facturas anuladas...
                        </div>
                    ) : data.registros.length === 0 ? (
                        <div className="gp-cancelled-invoices-empty">
                            <FileText
                                size={28}
                            />

                            <strong>
                                No hay registros
                            </strong>

                            <span>
                                No existen facturas anuladas
                                para el rango seleccionado.
                            </span>
                        </div>
                    ) : (
                        <div className="gp-cancelled-invoices-table-wrapper">

                            <table className="gp-cancelled-invoices-table">

                                <thead>
                                    <tr>
                                        <th>
                                            No. Cotización
                                        </th>

                                        <th>
                                            Cliente
                                        </th>

                                        <th>
                                            No. Interno
                                        </th>

                                        <th>
                                            No. Factura
                                        </th>

                                        <th>
                                            UUID
                                        </th>

                                        <th>
                                            Fecha certificación
                                        </th>

                                        <th>
                                            Fecha anulación
                                        </th>

                                        <th>
                                            Usuario anulación
                                        </th>
                                    </tr>
                                </thead>


                                <tbody>
                                    {data.registros.map(
                                        (
                                            registro,
                                        ) => (
                                            <tr
                                                key={
                                                    registro.uuid ||
                                                    `${registro.nocotizacion}-${registro.numero}`
                                                }
                                            >

                                                <td>
                                                    <strong className="gp-cancelled-invoices-quote">
                                                        {
                                                            registro.nocotizacion
                                                        }
                                                    </strong>
                                                </td>


                                                <td>
                                                    <strong className="gp-cancelled-invoices-client">
                                                        {
                                                            registro.cliente
                                                        }
                                                    </strong>
                                                </td>


                                                <td>
                                                    {registro.nointerno ? (
                                                        <span className="gp-cancelled-invoices-internal">
                                                            {
                                                                registro.nointerno
                                                            }
                                                        </span>
                                                    ) : (
                                                        <span className="gp-cancelled-invoices-muted">
                                                            —
                                                        </span>
                                                    )}
                                                </td>


                                                <td>
                                                    {
                                                        registro.numero
                                                    }
                                                </td>


                                                <td>
                                                    <span
                                                        className="gp-cancelled-invoices-uuid"
                                                        title={
                                                            registro.uuid
                                                        }
                                                    >
                                                        {
                                                            registro.uuid
                                                        }
                                                    </span>
                                                </td>


                                                <td>
                                                    {
                                                        registro.fecha_certificacion
                                                    }
                                                </td>


                                                <td>
                                                    <span className="gp-cancelled-invoices-cancel-date">
                                                        {
                                                            registro.fecha_anulacion
                                                        }
                                                    </span>
                                                </td>


                                                <td>
                                                    <span className="gp-cancelled-invoices-user">
                                                        <UserRound
                                                            size={12}
                                                        />

                                                        {
                                                            registro.usuario_anulacion
                                                        }
                                                    </span>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}


                    {/* RESUMEN POR USUARIO */}

                    {data.porUsuario.length > 0 && (
                        <section className="gp-cancelled-invoices-user-summary">

                            <div className="gp-cancelled-invoices-user-summary-header">
                                <div>
                                    <UserRound
                                        size={16}
                                    />

                                    <strong>
                                        Resumen por usuario
                                    </strong>
                                </div>

                                <span>
                                    Cantidad de anulaciones realizadas.
                                </span>
                            </div>


                            <div className="gp-cancelled-invoices-user-grid">

                                {data.porUsuario.map(
                                    (
                                        usuario,
                                    ) => (
                                        <div
                                            key={
                                                usuario.usuario
                                            }
                                            className="gp-cancelled-invoices-user-card"
                                        >

                                            <div>
                                                <span>
                                                    Usuario
                                                </span>

                                                <strong>
                                                    {
                                                        usuario.usuario
                                                    }
                                                </strong>
                                            </div>


                                            <strong className="gp-cancelled-invoices-user-count">
                                                {
                                                    usuario.total
                                                }
                                            </strong>
                                        </div>
                                    ),
                                )}
                            </div>


                            <div className="gp-cancelled-invoices-grand-total">

                                <span>
                                    Total general
                                </span>

                                <strong>
                                    {
                                        data.totalGeneral
                                    }
                                </strong>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};


export default ReporteFacturasAnuladas;