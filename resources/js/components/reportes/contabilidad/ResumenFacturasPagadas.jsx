import React, {
    useEffect,
    useState,
} from "react";

import axios from "axios";

import {
    CalendarDays,
    FileDown,
    FileText,
    Filter,
    ReceiptText,
    Search,
    WalletCards,
} from "lucide-react";

import alertify from "alertifyjs";

import "../../../../css/resumen-facturas-pagadas.css";


export default function ResumenFacturasPagadas() {
    const [
        inicio,
        setInicio,
    ] = useState("");

    const [
        fin,
        setFin,
    ] = useState("");

    const [
        cargando,
        setCargando,
    ] = useState(false);

    const [
        generandoPdf,
        setGenerandoPdf,
    ] = useState("");

    const [
        data,
        setData,
    ] = useState(null);

    const [
        tipo,
        setTipo,
    ] = useState("TODO");


    /* =========================================================
       AUTH
       ========================================================= */

    const getAuthHeaders = () => {
        const token =
            localStorage.getItem(
                "token",
            );

        return token
            ? {
                  Authorization:
                      `Bearer ${token}`,
              }
            : {};
    };


    /* =========================================================
       FECHA INICIAL
       ========================================================= */

    useEffect(() => {
        let cancel =
            false;

        const cargarFecha =
            async () => {
                try {
                    const resp =
                        await axios.get(
                            "/api/fecha-servidor",
                        );

                    const hoy =
                        resp.data?.fecha;

                    if (
                        !cancel &&
                        hoy
                    ) {
                        setInicio(
                            (prev) =>
                                prev ||
                                hoy,
                        );

                        setFin(
                            (prev) =>
                                prev ||
                                hoy,
                        );
                    }
                } catch {
                    const hoyLocal =
                        new Date()
                            .toISOString()
                            .slice(
                                0,
                                10,
                            );

                    if (
                        !cancel
                    ) {
                        setInicio(
                            (prev) =>
                                prev ||
                                hoyLocal,
                        );

                        setFin(
                            (prev) =>
                                prev ||
                                hoyLocal,
                        );
                    }
                }
            };

        cargarFecha();

        return () => {
            cancel =
                true;
        };
    }, []);


    /* =========================================================
       VALIDACIÓN
       ========================================================= */

    const validarParametros =
        () => {
            if (
                !inicio ||
                !fin
            ) {
                alertify.warning(
                    "Selecciona ambas fechas",
                );

                return false;
            }

            if (
                inicio > fin
            ) {
                alertify.warning(
                    "La fecha inicial no puede ser mayor que la fecha final",
                );

                return false;
            }

            const headers =
                getAuthHeaders();

            if (
                !headers.Authorization
            ) {
                alertify.error(
                    "Sesión expirada. Vuelve a iniciar sesión.",
                );

                return false;
            }

            return true;
        };


    /* =========================================================
       CONSULTAR
       ========================================================= */

    const consultar =
        async (e) => {
            e.preventDefault();

            if (
                !validarParametros()
            ) {
                return;
            }

            const headers =
                getAuthHeaders();

            try {
                setCargando(
                    true,
                );

                const resp =
                    await axios.get(
                        "/api/reportes-contabilidad/resumen-facturas-pagadas/data",
                        {
                            headers,

                            params: {
                                fecha_inicio:
                                    inicio,

                                fecha_fin:
                                    fin,

                                tipo,
                            },
                        },
                    );

                setData(
                    resp.data,
                );
            } catch (err) {
                console.error(
                    err,
                );

                alertify.error(
                    "No se pudo cargar la información",
                );
            } finally {
                setCargando(
                    false,
                );
            }
        };


    /* =========================================================
       ABRIR PDF
       ========================================================= */

    const abrirPdf =
        async (
            endpoint,
            tipoPdf,
        ) => {
            if (
                !validarParametros()
            ) {
                return;
            }

            const headers =
                getAuthHeaders();

            try {
                setGenerandoPdf(
                    tipoPdf,
                );

                const resp =
                    await axios.get(
                        endpoint,
                        {
                            headers,

                            params: {
                                fecha_inicio:
                                    inicio,

                                fecha_fin:
                                    fin,

                                tipo,
                            },

                            responseType:
                                "blob",
                        },
                    );


                const blob =
                    new Blob(
                        [
                            resp.data,
                        ],
                        {
                            type:
                                "application/pdf",
                        },
                    );

                const url =
                    URL.createObjectURL(
                        blob,
                    );


                window.open(
                    url,
                    "_blank",
                    "noopener,noreferrer",
                );


                /*
                 * La pestaña nueva necesita tiempo
                 * para consumir el ObjectURL.
                 */
                setTimeout(
                    () => {
                        URL.revokeObjectURL(
                            url,
                        );
                    },
                    30000,
                );
            } catch (err) {
                console.error(
                    err,
                );

                alertify.error(
                    tipoPdf ===
                        "recibo"
                        ? "No se pudo generar el PDF por recibo"
                        : "No se pudo generar el PDF",
                );
            } finally {
                setGenerandoPdf(
                    "",
                );
            }
        };


    const verPdf = () =>
        abrirPdf(
            "/api/reportes-contabilidad/resumen-facturas-pagadas/pdf",
            "general",
        );


    const verPdfPorRecibo =
        () =>
            abrirPdf(
                "/api/reportes-contabilidad/resumen-facturas-pagadas-por-recibo/pdf",
                "recibo",
            );


    /* =========================================================
       FORMATOS
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


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-paid-invoices-page">
            <div className="gp-module-card gp-paid-invoices-card">

                {/* HEADER */}

                <div className="gp-paid-invoices-header">
                    <div className="gp-paid-invoices-heading">

                        <div className="gp-paid-invoices-heading-icon">
                            <ReceiptText
                                size={
                                    22
                                }
                            />
                        </div>

                        <div>
                            <div className="gp-module-meta">
                                CONTABILIDAD · COBROS
                            </div>

                            <h1>
                                Resumen de facturas pagadas
                            </h1>

                            <p>
                                Consulta los pagos aplicados
                                a facturas por fecha de recibo
                                y tipo de documento.
                            </p>
                        </div>
                    </div>


                    {data && (
                        <div className="gp-paid-invoices-header-total">
                            <span>
                                Total cobrado
                            </span>

                            <strong>
                                Q{" "}
                                {formatoMoneda(
                                    data.total_general,
                                )}
                            </strong>
                        </div>
                    )}
                </div>


                {/* FILTROS */}

                <div className="gp-paid-invoices-filter-wrapper">

                    <form
                        onSubmit={
                            consultar
                        }
                        className="gp-paid-invoices-filter"
                    >

                        <div className="gp-paid-invoices-filter-header">
                            <div>
                                <Filter
                                    size={
                                        16
                                    }
                                />

                                <strong>
                                    Parámetros del reporte
                                </strong>
                            </div>

                            <span>
                                Las fechas corresponden al recibo.
                            </span>
                        </div>


                        <div className="gp-paid-invoices-filter-grid">

                            {/* INICIO */}

                            <div className="gp-paid-invoices-field">
                                <label>
                                    Fecha inicio
                                </label>

                                <div className="gp-paid-invoices-date">
                                    <CalendarDays
                                        size={
                                            14
                                        }
                                    />

                                    <input
                                        type="date"
                                        value={
                                            inicio
                                        }
                                        onChange={(e) =>
                                            setInicio(
                                                e.target
                                                    .value,
                                            )
                                        }
                                    />
                                </div>
                            </div>


                            {/* FIN */}

                            <div className="gp-paid-invoices-field">
                                <label>
                                    Fecha final
                                </label>

                                <div className="gp-paid-invoices-date">
                                    <CalendarDays
                                        size={
                                            14
                                        }
                                    />

                                    <input
                                        type="date"
                                        value={
                                            fin
                                        }
                                        onChange={(e) =>
                                            setFin(
                                                e.target
                                                    .value,
                                            )
                                        }
                                    />
                                </div>
                            </div>


                            {/* TIPO */}

                            <div className="gp-paid-invoices-field">
                                <label>
                                    Tipo
                                </label>

                                <select
                                    value={
                                        tipo
                                    }
                                    onChange={(e) =>
                                        setTipo(
                                            e.target
                                                .value,
                                        )
                                    }
                                >
                                    <option value="TODO">
                                        Todos
                                    </option>

                                    <option value="RECIBO">
                                        Recibo
                                    </option>

                                    <option value="RETENCIÓN">
                                        Retención
                                    </option>
                                </select>
                            </div>


                            {/* CONSULTAR */}

                            <div className="gp-paid-invoices-search-action">
                                <button
                                    type="submit"
                                    className="gp-paid-invoices-search-button"
                                    disabled={
                                        cargando
                                    }
                                >
                                    <Search
                                        size={
                                            15
                                        }
                                    />

                                    {cargando
                                        ? "Consultando..."
                                        : "Ver datos"}
                                </button>
                            </div>
                        </div>


                        {/* EXPORTACIONES */}

                        <div className="gp-paid-invoices-export-row">

                            <div className="gp-paid-invoices-export-info">
                                <FileText
                                    size={
                                        14
                                    }
                                />

                                <span>
                                    Los PDF utilizan los mismos
                                    filtros seleccionados.
                                </span>
                            </div>


                            <div className="gp-paid-invoices-export-actions">

                                <button
                                    type="button"
                                    className="gp-paid-invoices-export gp-paid-invoices-pdf"
                                    onClick={
                                        verPdf
                                    }
                                    disabled={
                                        !!generandoPdf
                                    }
                                >
                                    <FileDown
                                        size={
                                            15
                                        }
                                    />

                                    {generandoPdf ===
                                    "general"
                                        ? "Generando..."
                                        : "PDF general"}
                                </button>


                                <button
                                    type="button"
                                    className="gp-paid-invoices-export gp-paid-invoices-receipt-pdf"
                                    onClick={
                                        verPdfPorRecibo
                                    }
                                    disabled={
                                        !!generandoPdf
                                    }
                                >
                                    <ReceiptText
                                        size={
                                            15
                                        }
                                    />

                                    {generandoPdf ===
                                    "recibo"
                                        ? "Generando..."
                                        : "PDF por recibo"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>


                {/* RESULTADOS */}

                {data && (
                    <div className="gp-paid-invoices-results">

                        {/* RESUMEN */}

                        <div className="gp-paid-invoices-summary">

                            <div className="gp-paid-invoices-summary-item">
                                <span>
                                    Rango consultado
                                </span>

                                <strong>
                                    {data.rango?.inicio ||
                                        inicio}
                                    {" → "}
                                    {data.rango?.fin ||
                                        fin}
                                </strong>
                            </div>


                            <div className="gp-paid-invoices-summary-item">
                                <span>
                                    Clientes
                                </span>

                                <strong>
                                    {
                                        data.clientes
                                            ?.length
                                    }
                                </strong>
                            </div>


                            <div className="gp-paid-invoices-summary-total">
                                <WalletCards
                                    size={
                                        18
                                    }
                                />

                                <div>
                                    <span>
                                        Total general cobrado
                                    </span>

                                    <strong>
                                        Q{" "}
                                        {formatoMoneda(
                                            data.total_general,
                                        )}
                                    </strong>
                                </div>
                            </div>
                        </div>


                        {/* SIN RESULTADOS */}

                        {data.clientes?.length ===
                            0 && (
                            <div className="gp-paid-invoices-empty">
                                <ReceiptText
                                    size={
                                        28
                                    }
                                />

                                <strong>
                                    Sin resultados
                                </strong>

                                <span>
                                    No existen pagos para el
                                    rango y tipo seleccionados.
                                </span>
                            </div>
                        )}


                        {/* CLIENTES */}

                        {data.clientes?.map(
                            (
                                cliente,
                            ) => (
                                <section
                                    key={
                                        cliente.idcliente
                                    }
                                    className="gp-paid-invoices-client"
                                >

                                    {/* CLIENTE HEADER */}

                                    <div className="gp-paid-invoices-client-header">

                                        <div className="gp-paid-invoices-client-name">
                                            <span>
                                                Cliente
                                            </span>

                                            <strong>
                                                {
                                                    cliente.codigo
                                                }
                                                {" · "}
                                                {
                                                    cliente.nombre
                                                }
                                            </strong>
                                        </div>


                                        <div className="gp-paid-invoices-client-total">
                                            <span>
                                                Total cliente
                                            </span>

                                            <strong>
                                                Q{" "}
                                                {formatoMoneda(
                                                    cliente.total_cliente,
                                                )}
                                            </strong>
                                        </div>
                                    </div>


                                    {/* TABLA */}

                                    <div className="gp-paid-invoices-table-wrapper">
                                        <table className="gp-paid-invoices-table">

                                            <thead>
                                                <tr>
                                                    <th>
                                                        Fecha recibo
                                                    </th>

                                                    <th>
                                                        Serie
                                                    </th>

                                                    <th>
                                                        Número
                                                    </th>

                                                    <th>
                                                        Fecha emisión CxC
                                                    </th>

                                                    <th>
                                                        No. interno
                                                    </th>

                                                    <th className="gp-paid-invoices-money">
                                                        Monto pagado
                                                    </th>
                                                </tr>
                                            </thead>


                                            <tbody>
                                                {cliente.recibos?.flatMap(
                                                    (
                                                        recibo,
                                                    ) =>
                                                        recibo.detalles?.map(
                                                            (
                                                                detalle,
                                                                index,
                                                            ) => (
                                                                <tr
                                                                    key={`${recibo.idrecibo}-${index}`}
                                                                >

                                                                    <td>
                                                                        {
                                                                            recibo.fecha_recibo
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        <span className="gp-paid-invoices-series">
                                                                            {
                                                                                recibo.serie
                                                                            }
                                                                        </span>
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            recibo.numero
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {detalle.fecha_emision ??
                                                                            "—"}
                                                                    </td>

                                                                    <td>
                                                                        {detalle.nointerno ??
                                                                            "—"}
                                                                    </td>

                                                                    <td className="gp-paid-invoices-money">
                                                                        Q{" "}
                                                                        {formatoMoneda(
                                                                            detalle.monto_pagado,
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        ) ||
                                                        [],
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            ),
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}