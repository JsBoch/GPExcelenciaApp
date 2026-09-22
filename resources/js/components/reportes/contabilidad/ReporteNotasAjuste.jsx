import React, {
    useState,
} from "react";

import axios from "axios";

import {
    CalendarDays,
    FileDown,
    FileText,
    Search,
    SlidersHorizontal,
    WalletCards,
} from "lucide-react";

import alertify from "alertifyjs";

import "../../../../css/reporte-notas-ajuste.css";


const ReporteNotasAjuste = () => {
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
        tipo,
        setTipo,
    ] = useState(
        "TODOS",
    );


    const [
        data,
        setData,
    ] = useState({
        registros: [],
        porTipo: [],
        totalGeneral: 0,
        sumaGeneral: 0,
    });


    const [
        loading,
        setLoading,
    ] = useState(
        false,
    );


    const [
        exporting,
        setExporting,
    ] = useState(
        false,
    );


    const token =
        localStorage.getItem(
            "token",
        );


    /* =========================================================
       VALIDACIÓN
       ========================================================= */

    const validarFiltros =
        () => {
            if (
                !fechaInicio ||
                !fechaFinal
            ) {
                alertify.warning(
                    "Selecciona ambas fechas",
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
       BUSCAR
       ========================================================= */

    const handleBuscar =
        async () => {
            if (
                !validarFiltros()
            ) {
                return;
            }


            setLoading(
                true,
            );


            try {
                const res =
                    await axios.get(
                        `${import.meta.env.VITE_API_URL}/reporte/notas-ajuste`,
                        {
                            params: {
                                fechaInicio,
                                fechaFinal,
                                tipo,
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
                        porTipo: [],
                        totalGeneral: 0,
                        sumaGeneral: 0,
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
                !validarFiltros()
            ) {
                return;
            }


            try {
                setExporting(
                    true,
                );


                const res =
                    await axios.get(
                        `${import.meta.env.VITE_API_URL}/reporte/notas-ajuste`,
                        {
                            params: {
                                fechaInicio,
                                fechaFinal,
                                tipo,
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
                        [res.data],
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
                    `reporte_notas_${tipo}_${fechaInicio}_a_${fechaFinal}.pdf`,
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
       FORMATO
       ========================================================= */

    const formatoMoneda =
        (valor) =>
            Number(
                valor || 0,
            ).toLocaleString(
                "es-GT",
                {
                    minimumFractionDigits:
                        2,

                    maximumFractionDigits:
                        2,
                },
            );


    const obtenerTipoNota =
        (valor) => {
            if (
                valor === "NCRE"
            ) {
                return {
                    texto:
                        "Nota de Crédito",

                    clase:
                        "gp-adjustment-note-credit",
                };
            }


            if (
                valor === "NDEB"
            ) {
                return {
                    texto:
                        "Nota de Débito",

                    clase:
                        "gp-adjustment-note-debit",
                };
            }


            return {
                texto:
                    valor ||
                    "Sin tipo",

                clase:
                    "gp-adjustment-note-default",
            };
        };


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-adjustment-page">
            <div className="gp-module-card gp-adjustment-card">

                {/* HEADER */}

                <div className="gp-adjustment-header">
                    <div className="gp-adjustment-heading">

                        <div className="gp-adjustment-heading-icon">
                            <SlidersHorizontal
                                size={22}
                            />
                        </div>


                        <div>
                            <div className="gp-module-meta">
                                CONTABILIDAD · AJUSTES
                            </div>

                            <h1>
                                Notas de crédito y débito
                            </h1>

                            <p>
                                Consulta las notas de ajuste
                                emitidas dentro de un rango
                                de fechas y revisa sus montos.
                            </p>
                        </div>
                    </div>


                    <div className="gp-adjustment-total">
                        <span>
                            Monto general
                        </span>

                        <strong>
                            Q{" "}
                            {formatoMoneda(
                                data.sumaGeneral,
                            )}
                        </strong>
                    </div>
                </div>


                {/* FILTROS */}

                <div className="gp-adjustment-filter-wrapper">

                    <section className="gp-adjustment-filter">

                        <div className="gp-adjustment-filter-header">

                            <div>
                                <Search
                                    size={16}
                                />

                                <strong>
                                    Filtros del reporte
                                </strong>
                            </div>

                            <span>
                                Consulta todas las notas o
                                filtra por tipo.
                            </span>
                        </div>


                        <div className="gp-adjustment-filter-grid">

                            {/* FECHA INICIO */}

                            <div className="gp-adjustment-field">
                                <label>
                                    Fecha inicio
                                </label>

                                <div className="gp-adjustment-date">
                                    <CalendarDays
                                        size={14}
                                    />

                                    <input
                                        type="date"
                                        value={
                                            fechaInicio
                                        }
                                        onChange={(e) =>
                                            setFechaInicio(
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>


                            {/* FECHA FINAL */}

                            <div className="gp-adjustment-field">
                                <label>
                                    Fecha final
                                </label>

                                <div className="gp-adjustment-date">
                                    <CalendarDays
                                        size={14}
                                    />

                                    <input
                                        type="date"
                                        value={
                                            fechaFinal
                                        }
                                        onChange={(e) =>
                                            setFechaFinal(
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>


                            {/* TIPO */}

                            <div className="gp-adjustment-field">
                                <label>
                                    Tipo de nota
                                </label>

                                <select
                                    value={
                                        tipo
                                    }
                                    onChange={(e) =>
                                        setTipo(
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="TODOS">
                                        Todos
                                    </option>

                                    <option value="NCRE">
                                        Notas de Crédito
                                    </option>

                                    <option value="NDEB">
                                        Notas de Débito
                                    </option>
                                </select>
                            </div>


                            {/* BOTONES */}

                            <div className="gp-adjustment-filter-actions">

                                <button
                                    type="button"
                                    className="gp-adjustment-search-button"
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
                                    className="gp-adjustment-pdf-button"
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

                <div className="gp-adjustment-results">

                    <div className="gp-adjustment-results-heading">

                        <div>
                            <h2>
                                Detalle de notas
                            </h2>

                            <p>
                                Notas encontradas para el
                                período y tipo seleccionados.
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
                        <div className="gp-adjustment-loading">
                            Consultando notas de ajuste...
                        </div>
                    ) : data.registros.length === 0 ? (
                        <div className="gp-adjustment-empty">
                            <FileText
                                size={28}
                            />

                            <strong>
                                No hay registros
                            </strong>

                            <span>
                                No se encontraron notas
                                para los filtros seleccionados.
                            </span>
                        </div>
                    ) : (
                        <div className="gp-adjustment-table-wrapper">

                            <table className="gp-adjustment-table">

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
                                            Fecha certificación
                                        </th>

                                        <th>
                                            Tipo nota
                                        </th>

                                        <th>
                                            No. Nota
                                        </th>

                                        <th>
                                            Fecha nota
                                        </th>

                                        <th className="gp-adjustment-money">
                                            Monto total
                                        </th>
                                    </tr>
                                </thead>


                                <tbody>
                                    {data.registros.map(
                                        (
                                            registro,
                                            index,
                                        ) => {
                                            const tipoVisual =
                                                obtenerTipoNota(
                                                    registro.tipo_nota,
                                                );


                                            return (
                                                <tr
                                                    key={
                                                        registro.numero_nota ||
                                                        `${registro.nocotizacion}-${index}`
                                                    }
                                                >

                                                    <td>
                                                        <strong className="gp-adjustment-quote">
                                                            {
                                                                registro.nocotizacion
                                                            }
                                                        </strong>
                                                    </td>


                                                    <td>
                                                        <strong className="gp-adjustment-client">
                                                            {
                                                                registro.cliente
                                                            }
                                                        </strong>
                                                    </td>


                                                    <td>
                                                        {registro.nointerno ? (
                                                            <span className="gp-adjustment-internal">
                                                                {
                                                                    registro.nointerno
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="gp-adjustment-muted">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>


                                                    <td>
                                                        {
                                                            registro.numero_factura
                                                        }
                                                    </td>


                                                    <td>
                                                        {
                                                            registro.fecha_certificacion
                                                        }
                                                    </td>


                                                    <td>
                                                        <span
                                                            className={`gp-adjustment-note-type ${tipoVisual.clase}`}
                                                        >
                                                            {
                                                                tipoVisual.texto
                                                            }
                                                        </span>
                                                    </td>


                                                    <td>
                                                        <strong className="gp-adjustment-note-number">
                                                            {
                                                                registro.numero_nota
                                                            }
                                                        </strong>
                                                    </td>


                                                    <td>
                                                        {
                                                            registro.fecha_nota
                                                        }
                                                    </td>


                                                    <td className="gp-adjustment-money">
                                                        Q{" "}
                                                        {formatoMoneda(
                                                            registro.monto_total,
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}


                    {/* RESUMEN */}

                    {data.porTipo.length > 0 && (
                        <section className="gp-adjustment-summary">

                            <div className="gp-adjustment-summary-header">

                                <div>
                                    <WalletCards
                                        size={16}
                                    />

                                    <strong>
                                        Resumen por tipo
                                    </strong>
                                </div>

                                <span>
                                    Cantidad y monto acumulado
                                    por tipo de nota.
                                </span>
                            </div>


                            <div className="gp-adjustment-summary-grid">

                                {data.porTipo.map(
                                    (
                                        item,
                                        index,
                                    ) => {
                                        const tipoVisual =
                                            obtenerTipoNota(
                                                item.tipo,
                                            );


                                        return (
                                            <div
                                                key={`${item.tipo}-${index}`}
                                                className="gp-adjustment-summary-card"
                                            >

                                                <div>
                                                    <span
                                                        className={`gp-adjustment-note-type ${tipoVisual.clase}`}
                                                    >
                                                        {
                                                            tipoVisual.texto
                                                        }
                                                    </span>


                                                    <small>
                                                        Cantidad
                                                    </small>


                                                    <strong>
                                                        {
                                                            item.total
                                                        }
                                                    </strong>
                                                </div>


                                                <div className="gp-adjustment-summary-amount">
                                                    <small>
                                                        Monto
                                                    </small>

                                                    <strong>
                                                        Q{" "}
                                                        {formatoMoneda(
                                                            item.monto,
                                                        )}
                                                    </strong>
                                                </div>
                                            </div>
                                        );
                                    },
                                )}
                            </div>


                            <div className="gp-adjustment-grand-total">

                                <div>
                                    <span>
                                        Total general
                                    </span>

                                    <strong>
                                        {
                                            data.totalGeneral
                                        }{" "}
                                        notas
                                    </strong>
                                </div>


                                <strong>
                                    Q{" "}
                                    {formatoMoneda(
                                        data.sumaGeneral,
                                    )}
                                </strong>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};


export default ReporteNotasAjuste;