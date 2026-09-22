import React, {
    useEffect,
    useState,
} from "react";

import axios from "axios";

import {
    Autocomplete,
    TextField,
} from "@mui/material";

import {
    CalendarDays,
    CircleDollarSign,
    FileDown,
    FileText,
    Filter,
    ReceiptText,
    Search,
    StickyNote,
    UserRound,
    WalletCards,
} from "lucide-react";

import alertify from "alertifyjs";

import "../../../../css/reporte-cuentas-por-cobrar.css";


const ReporteCuentasPorCobrar = () => {
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
        clientes,
        setClientes,
    ] = useState([]);


    const [
        clienteSel,
        setClienteSel,
    ] = useState(null);


    const [
        saldo,
        setSaldo,
    ] = useState(
        "PENDIENTES",
    );


    const [
        data,
        setData,
    ] = useState({
        cuentas: [],

        totales: {
            cantidad: 0,
            saldoPendiente: 0,
            montoPagado: 0,
            montoOriginal: 0,
        },
    });


    const [
        loading,
        setLoading,
    ] = useState(false);


    const [
        exporting,
        setExporting,
    ] = useState(false);


    const [
        seleccion,
        setSeleccion,
    ] = useState(null);


    const [
        detalles,
        setDetalles,
    ] = useState({
        recibos: [],
        notas: [],
    });


    const [
        loadingDet,
        setLoadingDet,
    ] = useState(false);


    const token =
        localStorage.getItem(
            "token",
        );


    /* =========================================================
       CLIENTES
       ========================================================= */

    useEffect(() => {
        const headers = {
            Authorization:
                `Bearer ${token}`,
        };


        axios
            .get(
                `${import.meta.env.VITE_API_URL}/lista_clientes`,
                {
                    headers,
                },
            )
            .then((res) => {
                setClientes(
                    res.data || [],
                );
            })
            .catch((error) => {
                console.error(
                    "Error cargando clientes:",
                    error,
                );

                alertify.error(
                    "Error al cargar clientes",
                );
            });
    }, []);


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
       BUSCAR CUENTAS
       ========================================================= */

    const buscar =
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
                        `${import.meta.env.VITE_API_URL}/reporte/cxc`,
                        {
                            params: {
                                fechaInicio,
                                fechaFinal,

                                idcliente:
                                    clienteSel?.idcliente ||
                                    undefined,

                                saldo,
                            },

                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        },
                    );


                setData(
                    res.data || {
                        cuentas: [],

                        totales: {
                            cantidad: 0,
                            saldoPendiente: 0,
                            montoPagado: 0,
                            montoOriginal: 0,
                        },
                    },
                );


                setSeleccion(
                    null,
                );


                setDetalles({
                    recibos: [],
                    notas: [],
                });
            } catch (error) {
                console.error(
                    error,
                );


                alertify.error(
                    "Error al cargar cuentas por cobrar",
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

    const exportarPDF =
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
                        `${import.meta.env.VITE_API_URL}/reporte/cxc`,
                        {
                            params: {
                                fechaInicio,
                                fechaFinal,

                                idcliente:
                                    clienteSel?.idcliente ||
                                    undefined,

                                saldo,

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


                const a =
                    document.createElement(
                        "a",
                    );


                a.href =
                    url;


                a.download =
                    `reporte_cxc_${fechaInicio}_a_${fechaFinal}.pdf`;


                document.body.appendChild(
                    a,
                );


                a.click();

                a.remove();


                window.URL.revokeObjectURL(
                    url,
                );
            } catch (error) {
                console.error(
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
       DETALLES
       ========================================================= */

    const cargarDetalles =
        async (fila) => {
            setSeleccion(
                fila,
            );


            setLoadingDet(
                true,
            );


            try {
                const res =
                    await axios.get(
                        `${import.meta.env.VITE_API_URL}/reporte/cxc/${fila.idcuentaporcobrar}/detalles`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        },
                    );


                setDetalles(
                    res.data || {
                        recibos: [],
                        notas: [],
                    },
                );
            } catch (error) {
                console.error(
                    error,
                );


                alertify.error(
                    "Error al cargar detalles",
                );
            } finally {
                setLoadingDet(
                    false,
                );
            }
        };


    /* =========================================================
       FORMATO
       ========================================================= */

    const formatoMoneda =
        (valor) =>
            new Intl.NumberFormat(
                "es-GT",
                {
                    style:
                        "currency",

                    currency:
                        "GTQ",

                    minimumFractionDigits:
                        2,
                },
            ).format(
                Number(
                    valor || 0,
                ),
            );


    /* =========================================================
       CARGA INICIAL
       ========================================================= */

    useEffect(() => {
        buscar();
    }, []);


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-cxc-report-page">
            <div className="gp-module-card gp-cxc-report-card">

                {/* HEADER */}

                <div className="gp-cxc-report-header">

                    <div className="gp-cxc-report-heading">

                        <div className="gp-cxc-report-heading-icon">
                            <WalletCards
                                size={22}
                            />
                        </div>


                        <div>
                            <div className="gp-module-meta">
                                CONTABILIDAD · CUENTAS POR COBRAR
                            </div>

                            <h1>
                                Cuentas por cobrar
                            </h1>

                            <p>
                                Consulta saldos pendientes,
                                pagos aplicados y movimientos
                                relacionados con cada cuenta.
                            </p>
                        </div>
                    </div>


                    <div className="gp-cxc-report-header-total">
                        <span>
                            Saldo pendiente
                        </span>

                        <strong>
                            {formatoMoneda(
                                data.totales
                                    ?.saldoPendiente,
                            )}
                        </strong>
                    </div>
                </div>


                {/* FILTROS */}

                <div className="gp-cxc-report-filter-wrapper">

                    <section className="gp-cxc-report-filter">

                        <div className="gp-cxc-report-filter-header">

                            <div>
                                <Filter
                                    size={16}
                                />

                                <strong>
                                    Filtros del reporte
                                </strong>
                            </div>

                            <span>
                                Selecciona fechas, cliente
                                y estado del saldo.
                            </span>
                        </div>


                        <div className="gp-cxc-report-filter-grid">

                            {/* INICIO */}

                            <div className="gp-cxc-report-field">
                                <label>
                                    Fecha inicio
                                </label>

                                <div className="gp-cxc-report-date">
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


                            {/* FINAL */}

                            <div className="gp-cxc-report-field">
                                <label>
                                    Fecha final
                                </label>

                                <div className="gp-cxc-report-date">
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


                            {/* CLIENTE */}

                            <div className="gp-cxc-report-autocomplete">
                                <label>
                                    Cliente
                                </label>

                                <Autocomplete
                                    options={
                                        clientes
                                    }
                                    getOptionLabel={(
                                        option,
                                    ) =>
                                        option.nombre ||
                                        ""
                                    }
                                    value={
                                        clienteSel
                                    }
                                    onChange={(
                                        _,
                                        nuevo,
                                    ) =>
                                        setClienteSel(
                                            nuevo,
                                        )
                                    }
                                    isOptionEqualToValue={(
                                        option,
                                        value,
                                    ) =>
                                        Number(
                                            option.idcliente,
                                        ) ===
                                        Number(
                                            value.idcliente,
                                        )
                                    }
                                    renderInput={(
                                        params,
                                    ) => (
                                        <TextField
                                            {...params}
                                            placeholder="Buscar cliente..."
                                            size="small"
                                        />
                                    )}
                                />
                            </div>


                            {/* SALDO */}

                            <div className="gp-cxc-report-field">
                                <label>
                                    Saldo
                                </label>

                                <select
                                    value={
                                        saldo
                                    }
                                    onChange={(e) =>
                                        setSaldo(
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="PENDIENTES">
                                        Pendientes
                                    </option>

                                    <option value="PAGADAS">
                                        Pagadas
                                    </option>

                                    <option value="TODAS">
                                        Todas
                                    </option>
                                </select>
                            </div>
                        </div>


                        {/* ACCIONES */}

                        <div className="gp-cxc-report-filter-actions">

                            <div className="gp-cxc-report-filter-help">
                                <CircleDollarSign
                                    size={14}
                                />

                                <span>
                                    Selecciona una fila para
                                    consultar recibos y notas.
                                </span>
                            </div>


                            <div className="gp-cxc-report-buttons">

                                <button
                                    type="button"
                                    className="gp-cxc-report-search-button"
                                    onClick={
                                        buscar
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
                                    className="gp-cxc-report-pdf-button"
                                    onClick={
                                        exportarPDF
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


                {/* =================================================
                    RESUMEN
                   ================================================= */}

                <div className="gp-cxc-report-summary">

                    <div className="gp-cxc-report-summary-card">
                        <span>
                            Registros
                        </span>

                        <strong>
                            {
                                data.totales
                                    ?.cantidad
                            }
                        </strong>
                    </div>


                    <div className="gp-cxc-report-summary-card">
                        <span>
                            Monto original
                        </span>

                        <strong>
                            {formatoMoneda(
                                data.totales
                                    ?.montoOriginal,
                            )}
                        </strong>
                    </div>


                    <div className="gp-cxc-report-summary-card gp-cxc-report-summary-paid">
                        <span>
                            Pagado
                        </span>

                        <strong>
                            {formatoMoneda(
                                data.totales
                                    ?.montoPagado,
                            )}
                        </strong>
                    </div>


                    <div className="gp-cxc-report-summary-card gp-cxc-report-summary-balance">
                        <span>
                            Saldo pendiente
                        </span>

                        <strong>
                            {formatoMoneda(
                                data.totales
                                    ?.saldoPendiente,
                            )}
                        </strong>
                    </div>
                </div>


                {/* =================================================
                    TABLA PRINCIPAL
                   ================================================= */}

                <div className="gp-cxc-report-results">

                    <div className="gp-cxc-report-results-heading">
                        <div>
                            <h2>
                                Cuentas por cobrar
                            </h2>

                            <p>
                                Haz clic en una cuenta para
                                consultar sus movimientos.
                            </p>
                        </div>


                        <span>
                            {data.cuentas.length}{" "}
                            {data.cuentas.length === 1
                                ? "registro"
                                : "registros"}
                        </span>
                    </div>


                    {loading ? (
                        <div className="gp-cxc-report-loading">
                            Consultando cuentas por cobrar...
                        </div>
                    ) : data.cuentas.length === 0 ? (
                        <div className="gp-cxc-report-empty">
                            <FileText
                                size={28}
                            />

                            <strong>
                                Sin resultados
                            </strong>

                            <span>
                                No existen cuentas que coincidan
                                con los filtros seleccionados.
                            </span>
                        </div>
                    ) : (
                        <div className="gp-cxc-report-table-wrapper">

                            <table className="gp-cxc-report-table">

                                <thead>
                                    <tr>
                                        <th>
                                            Cliente
                                        </th>

                                        <th>
                                            No. Cotización
                                        </th>

                                        <th>
                                            No. Interno
                                        </th>

                                        <th>
                                            No. Factura
                                        </th>

                                        <th>
                                            Emisión
                                        </th>

                                        <th>
                                            Vencimiento
                                        </th>

                                        <th className="gp-cxc-report-center">
                                            Días emisión
                                        </th>

                                        <th className="gp-cxc-report-center">
                                            Días vencidos
                                        </th>

                                        <th className="gp-cxc-report-money">
                                            Monto original
                                        </th>

                                        <th className="gp-cxc-report-money">
                                            Pagado
                                        </th>

                                        <th className="gp-cxc-report-money">
                                            Saldo pendiente
                                        </th>
                                    </tr>
                                </thead>


                                <tbody>
                                    {data.cuentas.map(
                                        (
                                            cuenta,
                                        ) => {
                                            const selected =
                                                Number(
                                                    seleccion?.idcuentaporcobrar,
                                                ) ===
                                                Number(
                                                    cuenta.idcuentaporcobrar,
                                                );


                                            return (
                                                <tr
                                                    key={
                                                        cuenta.idcuentaporcobrar
                                                    }
                                                    className={
                                                        selected
                                                            ? "gp-cxc-report-row-selected"
                                                            : ""
                                                    }
                                                    onClick={() =>
                                                        cargarDetalles(
                                                            cuenta,
                                                        )
                                                    }
                                                >

                                                    <td>
                                                        <strong className="gp-cxc-report-client">
                                                            {
                                                                cuenta.cliente
                                                            }
                                                        </strong>
                                                    </td>


                                                    <td>
                                                        <span className="gp-cxc-report-quote">
                                                            {
                                                                cuenta.nocotizacion
                                                            }
                                                        </span>
                                                    </td>


                                                    <td>
                                                        {cuenta.nointerno ? (
                                                            <span className="gp-cxc-report-internal">
                                                                {
                                                                    cuenta.nointerno
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="gp-cxc-report-muted">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>


                                                    <td>
                                                        {
                                                            cuenta.numero
                                                        }
                                                    </td>


                                                    <td>
                                                        {
                                                            cuenta.fecha_emision
                                                        }
                                                    </td>


                                                    <td>
                                                        {
                                                            cuenta.fecha_vencimiento
                                                        }
                                                    </td>


                                                    <td className="gp-cxc-report-center">
                                                        {
                                                            cuenta.dias_desde_emision
                                                        }
                                                    </td>


                                                    <td className="gp-cxc-report-center">
                                                        <span
                                                            className={
                                                                Number(
                                                                    cuenta.dias_vencidos,
                                                                ) >
                                                                0
                                                                    ? "gp-cxc-report-days gp-cxc-report-days-overdue"
                                                                    : "gp-cxc-report-days"
                                                            }
                                                        >
                                                            {
                                                                cuenta.dias_vencidos
                                                            }
                                                        </span>
                                                    </td>


                                                    <td className="gp-cxc-report-money">
                                                        {formatoMoneda(
                                                            cuenta.monto_original,
                                                        )}
                                                    </td>


                                                    <td className="gp-cxc-report-money gp-cxc-report-paid">
                                                        {formatoMoneda(
                                                            cuenta.monto_pagado,
                                                        )}
                                                    </td>


                                                    <td className="gp-cxc-report-money gp-cxc-report-balance">
                                                        {formatoMoneda(
                                                            cuenta.monto_total_saldo_pendiente,
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


                    {/* =================================================
                        DETALLES
                       ================================================= */}

                    {seleccion && (
                        <section className="gp-cxc-report-details">

                            <div className="gp-cxc-report-details-header">

                                <div>
                                    <ReceiptText
                                        size={16}
                                    />

                                    <div>
                                        <strong>
                                            Detalle de movimientos
                                        </strong>

                                        <span>
                                            CxC #{seleccion.idcuentaporcobrar}
                                            {" · "}
                                            {seleccion.cliente}
                                        </span>
                                    </div>
                                </div>


                                <div className="gp-cxc-report-details-balance">
                                    <span>
                                        Saldo
                                    </span>

                                    <strong>
                                        {formatoMoneda(
                                            seleccion.monto_total_saldo_pendiente,
                                        )}
                                    </strong>
                                </div>
                            </div>


                            {loadingDet ? (
                                <div className="gp-cxc-report-loading-details">
                                    Cargando movimientos...
                                </div>
                            ) : (
                                <div className="gp-cxc-report-details-grid">

                                    {/* RECIBOS */}

                                    <div className="gp-cxc-report-detail-card">

                                        <div className="gp-cxc-report-detail-title">
                                            <ReceiptText
                                                size={15}
                                            />

                                            <div>
                                                <strong>
                                                    Recibos / Retenciones
                                                </strong>

                                                <span>
                                                    {detalles.recibos.length} movimientos
                                                </span>
                                            </div>
                                        </div>


                                        {detalles.recibos.length === 0 ? (
                                            <div className="gp-cxc-report-detail-empty">
                                                Sin recibos o retenciones
                                            </div>
                                        ) : (
                                            <div className="gp-cxc-report-detail-table-wrapper">

                                                <table className="gp-cxc-report-detail-table">

                                                    <thead>
                                                        <tr>
                                                            <th>
                                                                Documento
                                                            </th>

                                                            <th>
                                                                Fecha
                                                            </th>

                                                            <th>
                                                                Método
                                                            </th>

                                                            <th>
                                                                Referencia
                                                            </th>

                                                            <th>
                                                                Tipo
                                                            </th>

                                                            <th className="gp-cxc-report-money">
                                                                Recibido
                                                            </th>

                                                            <th className="gp-cxc-report-money">
                                                                Aplicado
                                                            </th>
                                                        </tr>
                                                    </thead>


                                                    <tbody>
                                                        {detalles.recibos.map(
                                                            (
                                                                recibo,
                                                                index,
                                                            ) => (
                                                                <tr
                                                                    key={`${recibo.documento}-${recibo.fecha_recibo}-${index}`}
                                                                >
                                                                    <td>
                                                                        <strong>
                                                                            {
                                                                                recibo.documento
                                                                            }
                                                                        </strong>
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            recibo.fecha_recibo
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            recibo.metodo_pago
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            recibo.referencia
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        <span className="gp-cxc-report-detail-type">
                                                                            {
                                                                                recibo.tipo
                                                                            }
                                                                        </span>
                                                                    </td>

                                                                    <td className="gp-cxc-report-money">
                                                                        {formatoMoneda(
                                                                            recibo.monto_recibido,
                                                                        )}
                                                                    </td>

                                                                    <td className="gp-cxc-report-money gp-cxc-report-paid">
                                                                        {formatoMoneda(
                                                                            recibo.monto_aplicado,
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>


                                    {/* NOTAS */}

                                    <div className="gp-cxc-report-detail-card">

                                        <div className="gp-cxc-report-detail-title">
                                            <StickyNote
                                                size={15}
                                            />

                                            <div>
                                                <strong>
                                                    Notas de ajuste
                                                </strong>

                                                <span>
                                                    {detalles.notas.length} movimientos
                                                </span>
                                            </div>
                                        </div>


                                        {detalles.notas.length === 0 ? (
                                            <div className="gp-cxc-report-detail-empty">
                                                Sin notas de ajuste
                                            </div>
                                        ) : (
                                            <div className="gp-cxc-report-detail-table-wrapper">

                                                <table className="gp-cxc-report-detail-table">

                                                    <thead>
                                                        <tr>
                                                            <th>
                                                                Documento
                                                            </th>

                                                            <th>
                                                                Fecha
                                                            </th>

                                                            <th>
                                                                Referencia
                                                            </th>

                                                            <th>
                                                                Tipo
                                                            </th>

                                                            <th className="gp-cxc-report-money">
                                                                Monto total
                                                            </th>
                                                        </tr>
                                                    </thead>


                                                    <tbody>
                                                        {detalles.notas.map(
                                                            (
                                                                nota,
                                                                index,
                                                            ) => (
                                                                <tr
                                                                    key={`${nota.documento}-${nota.fecha_nota}-${index}`}
                                                                >
                                                                    <td>
                                                                        <strong>
                                                                            {
                                                                                nota.documento
                                                                            }
                                                                        </strong>
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            nota.fecha_nota
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            nota.referencia
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        <span className="gp-cxc-report-note-type">
                                                                            {
                                                                                nota.tipo
                                                                            }
                                                                        </span>
                                                                    </td>

                                                                    <td className="gp-cxc-report-money">
                                                                        {formatoMoneda(
                                                                            nota.monto_total,
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};


export default ReporteCuentasPorCobrar;