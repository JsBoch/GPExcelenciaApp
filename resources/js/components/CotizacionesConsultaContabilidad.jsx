import React, {
    useEffect,
    useState,
} from "react";

import axios from "axios";

import {
    Box,
    Pagination,
} from "@mui/material";

import {
    CalendarDays,
    FileDown,
    FileSpreadsheet,
    FileText,
    Filter,
    ReceiptText,
    Search,
    X,
} from "lucide-react";

import alertify from "alertifyjs";

import "../../css/cotizaciones-consulta-contabilidad.css";


const estados = [
    {
        value: "",
        label: "Todos",
    },
    {
        value: 0,
        label: "Anulada",
    },
    {
        value: 1,
        label: "Registro",
    },
    {
        value: 2,
        label: "Para costeo",
    },
    {
        value: 3,
        label: "Costeada",
    },
    {
        value: 4,
        label: "Pre-facturación",
    },
    {
        value: 5,
        label: "Para facturar",
    },
    {
        value: 6,
        label: "Facturada",
    },
    {
        value: 7,
        label: "Anulada",
    },
    {
        value: 8,
        label: "Rechazada",
    },
];


const CotizacionesConsultaContabilidad = () => {
    const [data, setData] = useState({
        data: [],
        total: 0,
        per_page: 10,
        current_page: 1,
    });

    const [
        vendedores,
        setVendedores,
    ] = useState([]);

    const [
        desde,
        setDesde,
    ] = useState("");

    const [
        hasta,
        setHasta,
    ] = useState("");

    const [
        vendedorId,
        setVendedorId,
    ] = useState("");

    const [
        estado,
        setEstado,
    ] = useState("");

    const [
        search,
        setSearch,
    ] = useState("");

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

    const headers = {
        Authorization:
            `Bearer ${token}`,
    };


    /* =========================================================
       CARGA INICIAL
       ========================================================= */

    useEffect(() => {
        axios
            .get(
                `${import.meta.env.VITE_API_URL}/fecha-servidor`,
                {
                    headers,
                },
            )
            .then((res) => {
                setDesde(
                    res.data.fecha,
                );

                setHasta(
                    res.data.fecha,
                );
            })
            .catch(() => {
                const fechaLocal =
                    new Date()
                        .toISOString()
                        .split("T")[0];

                setDesde(
                    fechaLocal,
                );

                setHasta(
                    fechaLocal,
                );
            });


        axios
            .get(
                `${import.meta.env.VITE_API_URL}/reportes-contabilidad/vendedores`,
                {
                    headers,
                },
            )
            .then((res) => {
                setVendedores(
                    res.data || [],
                );
            })
            .catch((error) => {
                console.error(
                    "Error cargando vendedores:",
                    error,
                );

                alertify.error(
                    "Error al cargar vendedores",
                );
            });
    }, []);


    /* =========================================================
       CONSULTA
       ========================================================= */

    const fetchData =
        async (page = 1) => {
            try {
                setLoading(true);

                const res =
                    await axios.get(
                        `${import.meta.env.VITE_API_URL}/reportes-contabilidad/cotizaciones`,
                        {
                            headers,

                            params: {
                                desde,
                                hasta,

                                vendedor_id:
                                    vendedorId,

                                estado,

                                search,

                                page,

                                per_page:
                                    data.per_page,
                            },
                        },
                    );

                setData(
                    res.data,
                );
            } catch (error) {
                console.error(
                    "Error consultando cotizaciones:",
                    error,
                );

                alertify.error(
                    "Error al consultar cotizaciones",
                );
            } finally {
                setLoading(false);
            }
        };


    const handlePage = (
        _,
        value,
    ) => {
        fetchData(
            value,
        );
    };


    /* =========================================================
       EXPORTAR EXCEL
       ========================================================= */

    const exportExcel =
        async () => {
            try {
                setExporting(true);

                const res =
                    await axios.get(
                        `${import.meta.env.VITE_API_URL}/reportes-contabilidad/export/excel`,
                        {
                            headers,

                            params: {
                                desde,
                                hasta,

                                vendedor_id:
                                    vendedorId,

                                estado,

                                search,
                            },

                            responseType:
                                "blob",
                        },
                    );


                const url =
                    window.URL.createObjectURL(
                        new Blob([
                            res.data,
                        ]),
                    );

                const link =
                    document.createElement(
                        "a",
                    );

                link.href =
                    url;

                link.setAttribute(
                    "download",
                    "cotizaciones.xlsx",
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
                    error,
                );

                alertify.error(
                    "Error al exportar Excel",
                );
            } finally {
                setExporting(false);
            }
        };


    /* =========================================================
       EXPORTAR PDF
       ========================================================= */

    const exportPdf =
        async () => {
            try {
                setExporting(true);

                const res =
                    await axios.get(
                        `${import.meta.env.VITE_API_URL}/reportes-contabilidad/export/pdf`,
                        {
                            headers,

                            params: {
                                desde,
                                hasta,

                                vendedor_id:
                                    vendedorId,

                                estado,

                                search,
                            },

                            responseType:
                                "blob",
                        },
                    );


                const url =
                    URL.createObjectURL(
                        new Blob(
                            [
                                res.data,
                            ],
                            {
                                type:
                                    "application/pdf",
                            },
                        ),
                    );


                const link =
                    document.createElement(
                        "a",
                    );

                link.href =
                    url;

                link.setAttribute(
                    "download",
                    "cotizaciones.pdf",
                );

                document.body.appendChild(
                    link,
                );

                link.click();

                link.remove();

                URL.revokeObjectURL(
                    url,
                );
            } catch (err) {
                const blob =
                    err?.response
                        ?.data;

                if (
                    blob &&
                    blob.type?.includes(
                        "application/json",
                    )
                ) {
                    const text =
                        await blob.text();

                    try {
                        const json =
                            JSON.parse(
                                text,
                            );

                        console.error(
                            json,
                        );

                        alertify.error(
                            json.message ||
                                "Error generando PDF",
                        );
                    } catch {
                        console.error(
                            text,
                        );

                        alertify.error(
                            "Error generando PDF",
                        );
                    }
                } else {
                    console.error(
                        err,
                    );

                    alertify.error(
                        "Error generando PDF",
                    );
                }
            } finally {
                setExporting(false);
            }
        };


    /* =========================================================
       LIMPIAR FILTROS
       ========================================================= */

    const limpiarFiltros =
        () => {
            setVendedorId("");
            setEstado("");
            setSearch("");
        };


    /* =========================================================
       ESTADO VISUAL
       ========================================================= */

    const obtenerEstado =
        (row) => {
            if (
                row.factura_anulada ===
                    1 &&
                Number(
                    row.estado,
                ) === 6
            ) {
                return {
                    texto:
                        "FACTURADA (ANULADA)",

                    clase:
                        "gp-accounting-status-cancelled",
                };
            }


            const info =
                estados.find(
                    (item) =>
                        Number(
                            item.value,
                        ) ===
                        Number(
                            row.estado,
                        ),
                );


            const estadoNumero =
                Number(
                    row.estado,
                );


            let clase =
                "gp-accounting-status-default";


            if (
                estadoNumero ===
                1
            ) {
                clase =
                    "gp-accounting-status-register";
            }

            if (
                estadoNumero ===
                2
            ) {
                clase =
                    "gp-accounting-status-cost";
            }

            if (
                estadoNumero ===
                3
            ) {
                clase =
                    "gp-accounting-status-costed";
            }

            if (
                estadoNumero ===
                4
            ) {
                clase =
                    "gp-accounting-status-prefact";
            }

            if (
                estadoNumero ===
                5
            ) {
                clase =
                    "gp-accounting-status-invoice";
            }

            if (
                estadoNumero ===
                6
            ) {
                clase =
                    "gp-accounting-status-billed";
            }

            if (
                estadoNumero ===
                    0 ||
                estadoNumero ===
                    7
            ) {
                clase =
                    "gp-accounting-status-cancelled";
            }

            if (
                estadoNumero ===
                8
            ) {
                clase =
                    "gp-accounting-status-rejected";
            }


            return {
                texto:
                    info?.label ||
                    "Sin estado",

                clase,
            };
        };


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-accounting-page">
            <div className="gp-module-card gp-accounting-card">

                {/* HEADER */}

                <div className="gp-accounting-header">
                    <div className="gp-accounting-heading">
                        <div className="gp-accounting-heading-icon">
                            <ReceiptText
                                size={22}
                            />
                        </div>

                        <div>
                            <div className="gp-module-meta">
                                CONTABILIDAD · REPORTES
                            </div>

                            <h1>
                                Consulta de cotizaciones
                            </h1>

                            <p>
                                Consulta cotizaciones por
                                fecha, vendedor y estado,
                                y exporta los resultados
                                para análisis contable.
                            </p>
                        </div>
                    </div>

                    <div className="gp-accounting-total">
                        <span>
                            Registros encontrados
                        </span>

                        <strong>
                            {
                                data.total
                            }
                        </strong>
                    </div>
                </div>


                {/* FILTROS */}

                <div className="gp-accounting-filter-section">

                    <div className="gp-accounting-filter-header">
                        <div>
                            <Filter
                                size={
                                    16
                                }
                            />

                            <strong>
                                Filtros de consulta
                            </strong>
                        </div>

                        <button
                            type="button"
                            onClick={
                                limpiarFiltros
                            }
                            className="gp-accounting-clear"
                        >
                            <X
                                size={
                                    13
                                }
                            />

                            Limpiar filtros
                        </button>
                    </div>


                    <div className="gp-accounting-filters">

                        {/* DESDE */}

                        <div className="gp-accounting-field">
                            <label>
                                Desde
                            </label>

                            <div className="gp-accounting-date">
                                <CalendarDays
                                    size={
                                        14
                                    }
                                />

                                <input
                                    type="date"
                                    value={
                                        desde
                                    }
                                    onChange={(e) =>
                                        setDesde(
                                            e.target
                                                .value,
                                        )
                                    }
                                />
                            </div>
                        </div>


                        {/* HASTA */}

                        <div className="gp-accounting-field">
                            <label>
                                Hasta
                            </label>

                            <div className="gp-accounting-date">
                                <CalendarDays
                                    size={
                                        14
                                    }
                                />

                                <input
                                    type="date"
                                    value={
                                        hasta
                                    }
                                    onChange={(e) =>
                                        setHasta(
                                            e.target
                                                .value,
                                        )
                                    }
                                />
                            </div>
                        </div>


                        {/* VENDEDOR */}

                        <div className="gp-accounting-field gp-accounting-field-wide">
                            <label>
                                Vendedor
                            </label>

                            <select
                                value={
                                    vendedorId
                                }
                                onChange={(e) =>
                                    setVendedorId(
                                        e.target
                                            .value,
                                    )
                                }
                            >
                                <option value="">
                                    Todos los vendedores
                                </option>

                                {vendedores.map(
                                    (
                                        vendedor,
                                    ) => (
                                        <option
                                            key={
                                                vendedor.id_empleado
                                            }
                                            value={
                                                vendedor.id_empleado
                                            }
                                        >
                                            {
                                                vendedor.nombre
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>


                        {/* ESTADO */}

                        <div className="gp-accounting-field">
                            <label>
                                Estado
                            </label>

                            <select
                                value={
                                    estado
                                }
                                onChange={(e) =>
                                    setEstado(
                                        e.target
                                            .value,
                                    )
                                }
                            >
                                {estados.map(
                                    (
                                        estadoItem,
                                    ) => (
                                        <option
                                            key={`${estadoItem.value}-${estadoItem.label}`}
                                            value={
                                                estadoItem.value
                                            }
                                        >
                                            {
                                                estadoItem.label
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                    </div>


                    {/* SEGUNDA FILA */}

                    <div className="gp-accounting-filter-bottom">

                        <div className="gp-accounting-search">
                            <Search
                                size={
                                    15
                                }
                            />

                            <input
                                type="text"
                                value={
                                    search
                                }
                                placeholder="Buscar No. cotización o cliente..."
                                onChange={(e) =>
                                    setSearch(
                                        e.target
                                            .value,
                                    )
                                }
                                onKeyDown={(e) => {
                                    if (
                                        e.key ===
                                        "Enter"
                                    ) {
                                        fetchData(
                                            1,
                                        );
                                    }
                                }}
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSearch(
                                            "",
                                        )
                                    }
                                >
                                    <X
                                        size={
                                            14
                                        }
                                    />
                                </button>
                            )}
                        </div>


                        <div className="gp-accounting-filter-actions">

                            <button
                                type="button"
                                className="gp-accounting-button gp-accounting-search-button"
                                onClick={() =>
                                    fetchData(
                                        1,
                                    )
                                }
                                disabled={
                                    loading
                                }
                            >
                                <Search
                                    size={
                                        15
                                    }
                                />

                                {loading
                                    ? "Consultando..."
                                    : "Consultar"}
                            </button>


                            <button
                                type="button"
                                className="gp-accounting-button gp-accounting-excel"
                                onClick={
                                    exportExcel
                                }
                                disabled={
                                    exporting
                                }
                            >
                                <FileSpreadsheet
                                    size={
                                        15
                                    }
                                />

                                Excel
                            </button>


                            <button
                                type="button"
                                className="gp-accounting-button gp-accounting-pdf"
                                onClick={
                                    exportPdf
                                }
                                disabled={
                                    exporting
                                }
                            >
                                <FileDown
                                    size={
                                        15
                                    }
                                />

                                PDF
                            </button>
                        </div>
                    </div>
                </div>


                {/* TABLA */}

                <div className="gp-accounting-body">

                    <div className="gp-accounting-table-heading">
                        <div>
                            <h2>
                                Resultados
                            </h2>

                            <p>
                                Cotizaciones que cumplen
                                con los filtros seleccionados.
                            </p>
                        </div>

                        <span>
                            Página{" "}
                            {
                                data.current_page
                            }
                        </span>
                    </div>


                    {loading ? (
                        <div className="gp-accounting-loading">
                            Consultando cotizaciones...
                        </div>
                    ) : data.data.length ===
                      0 ? (
                        <div className="gp-accounting-empty">
                            <FileText
                                size={
                                    28
                                }
                            />

                            <strong>
                                No hay resultados
                            </strong>

                            <span>
                                Ajusta los filtros y
                                realiza una nueva consulta.
                            </span>
                        </div>
                    ) : (
                        <div className="gp-accounting-table-wrapper">

                            <table className="gp-accounting-table">

                                <thead>
                                    <tr>
                                        <th>
                                            No. Cotización
                                        </th>

                                        <th>
                                            No. Interno
                                        </th>

                                        <th>
                                            Fecha
                                        </th>

                                        <th className="gp-accounting-center">
                                            Días vencidos
                                        </th>

                                        <th>
                                            Vendedor
                                        </th>

                                        <th>
                                            Cliente
                                        </th>

                                        <th>
                                            Estado
                                        </th>

                                        <th className="gp-accounting-total-column">
                                            Total
                                        </th>
                                    </tr>
                                </thead>


                                <tbody>
                                    {data.data.map(
                                        (
                                            row,
                                        ) => {
                                            const estadoVisual =
                                                obtenerEstado(
                                                    row,
                                                );

                                            return (
                                                <tr
                                                    key={
                                                        row.idcotizacion
                                                    }
                                                    className={
                                                        row.factura_anulada ===
                                                        1
                                                            ? "gp-accounting-row-cancelled"
                                                            : ""
                                                    }
                                                >

                                                    <td>
                                                        <strong className="gp-accounting-number">
                                                            {
                                                                row.nocotizacion
                                                            }
                                                        </strong>
                                                    </td>


                                                    <td>
                                                        {row.nofactura ? (
                                                            <span className="gp-accounting-internal">
                                                                {
                                                                    row.nofactura
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="gp-accounting-muted">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>


                                                    <td>
                                                        {row.fecha_cotizacion
                                                            ? new Date(
                                                                  row.fecha_cotizacion,
                                                              ).toLocaleDateString(
                                                                  "es-GT",
                                                              )
                                                            : ""}
                                                    </td>


                                                    <td className="gp-accounting-center">
                                                        <span
                                                            className={
                                                                Number(
                                                                    row.dias_desde_prefacturacion ??
                                                                        0,
                                                                ) >
                                                                0
                                                                    ? "gp-accounting-days gp-accounting-days-overdue"
                                                                    : "gp-accounting-days"
                                                            }
                                                        >
                                                            {
                                                                row.dias_desde_prefacturacion ??
                                                                0
                                                            }
                                                        </span>
                                                    </td>


                                                    <td>
                                                        {
                                                            row.vendedor
                                                        }
                                                    </td>


                                                    <td>
                                                        <strong className="gp-accounting-client">
                                                            {
                                                                row.cliente
                                                            }
                                                        </strong>
                                                    </td>


                                                    <td>
                                                        <span
                                                            className={`gp-accounting-status ${estadoVisual.clase}`}
                                                        >
                                                            {
                                                                estadoVisual.texto
                                                            }
                                                        </span>
                                                    </td>


                                                    <td className="gp-accounting-total-column">
                                                        {Number(
                                                            row.total_general,
                                                        ).toLocaleString(
                                                            "es-GT",
                                                            {
                                                                style:
                                                                    "currency",

                                                                currency:
                                                                    "GTQ",
                                                            },
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


                    {/* PAGINACIÓN */}

                    {data.total >
                        data.per_page && (
                        <Box className="gp-accounting-pagination">
                            <Pagination
                                count={Math.ceil(
                                    data.total /
                                        data.per_page,
                                )}
                                page={
                                    data.current_page
                                }
                                onChange={
                                    handlePage
                                }
                                color="primary"
                                shape="rounded"
                                size="small"
                            />
                        </Box>
                    )}
                </div>
            </div>
        </div>
    );
};


export default CotizacionesConsultaContabilidad;