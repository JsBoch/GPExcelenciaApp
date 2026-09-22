import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import axios from "axios";

import {
    Alert,
    Snackbar,
} from "@mui/material";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Cell,
} from "recharts";

import {
    BarChart3,
    CalendarDays,
    FileDown,
    FileSpreadsheet,
    Filter,
    Search,
    TrendingUp,
    UsersRound,
} from "lucide-react";

import "../../../../css/reporte-ventas-por-cliente.css";


const ReporteVentasPorCliente = () => {
    const [
        vendedores,
        setVendedores,
    ] = useState([]);

    const [
        filtros,
        setFiltros,
    ] = useState({
        desde:
            new Date()
                .toISOString()
                .slice(0, 10),

        hasta:
            new Date()
                .toISOString()
                .slice(0, 10),

        vendedor_id: "",
    });

    const [
        reportData,
        setReportData,
    ] = useState(null);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        exporting,
        setExporting,
    ] = useState("");

    const [
        snackbar,
        setSnackbar,
    ] = useState({
        open: false,
        message: "",
        severity: "success",
    });


    /* =========================================================
       AUTH
       ========================================================= */

    const authHeaders = () => {
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
       VENDEDORES
       ========================================================= */

    useEffect(() => {
        axios
            .get(
                "/api/reportes-contabilidad/vendedores",
                {
                    headers:
                        authHeaders(),
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

                setVendedores(
                    [],
                );
            });
    }, []);


    /* =========================================================
       FILTROS
       ========================================================= */

    const handleChange = (
        e,
    ) => {
        const {
            name,
            value,
        } = e.target;

        setFiltros(
            (prev) => ({
                ...prev,
                [name]: value,
            }),
        );
    };


    /* =========================================================
       BUSCAR
       ========================================================= */

    const handleBuscar =
        async () => {
            if (
                !filtros.desde ||
                !filtros.hasta
            ) {
                setSnackbar({
                    open: true,
                    message:
                        "Seleccione las fechas",
                    severity:
                        "warning",
                });

                return;
            }

            if (
                filtros.desde >
                filtros.hasta
            ) {
                setSnackbar({
                    open: true,
                    message:
                        "La fecha inicial no puede ser mayor a la fecha final",
                    severity:
                        "warning",
                });

                return;
            }

            setLoading(
                true,
            );

            try {
                const params = {
                    desde:
                        filtros.desde,

                    hasta:
                        filtros.hasta,

                    ...(filtros.vendedor_id && {
                        vendedor_id:
                            filtros.vendedor_id,
                    }),
                };


                const resp =
                    await axios.get(
                        "/api/reportes-contabilidad/cotizacionesventas",
                        {
                            headers:
                                authHeaders(),

                            params,
                        },
                    );


                setReportData(
                    resp.data,
                );
            } catch (err) {
                console.error(
                    "Error en buscar:",
                    err,
                );

                setSnackbar({
                    open: true,

                    message:
                        "No se pudo cargar el reporte",

                    severity:
                        "error",
                });
            } finally {
                setLoading(
                    false,
                );
            }
        };


    /* =========================================================
       EXPORTAR
       ========================================================= */

    const handleExport =
        async (tipo) => {
            if (
                !filtros.desde ||
                !filtros.hasta
            ) {
                setSnackbar({
                    open: true,

                    message:
                        "Seleccione las fechas",

                    severity:
                        "warning",
                });

                return;
            }


            setExporting(
                tipo,
            );


            const endpoint =
                tipo === "excel"
                    ? "/api/reportes-contabilidad/export/excelventas"
                    : "/api/reportes-contabilidad/export/pdfventas";


            const params = {
                desde:
                    filtros.desde,

                hasta:
                    filtros.hasta,

                ...(filtros.vendedor_id && {
                    vendedor_id:
                        filtros.vendedor_id,
                }),
            };


            try {
                const response =
                    await axios.get(
                        endpoint,
                        {
                            headers:
                                authHeaders(),

                            params,

                            responseType:
                                "blob",
                        },
                    );


                const blob =
                    new Blob([
                        response.data,
                    ]);


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

                    tipo === "excel"
                        ? "ventas_por_cliente.xlsx"
                        : "ventas_por_cliente.pdf",
                );


                document.body.appendChild(
                    link,
                );


                link.click();

                link.remove();


                window.URL.revokeObjectURL(
                    url,
                );


                setSnackbar({
                    open: true,

                    message:
                        tipo === "excel"
                            ? "Archivo Excel generado exitosamente"
                            : "Archivo PDF generado exitosamente",

                    severity:
                        "success",
                });
            } catch (error) {
                console.error(
                    "Error exportando:",
                    error,
                );


                setSnackbar({
                    open: true,

                    message:
                        "Error al generar el archivo",

                    severity:
                        "error",
                });
            } finally {
                setExporting(
                    "",
                );
            }
        };


    /* =========================================================
       SNACKBAR
       ========================================================= */

    const handleCloseSnackbar =
        () => {
            setSnackbar(
                (prev) => ({
                    ...prev,

                    open: false,
                }),
            );
        };


    /* =========================================================
       AGRUPACIÓN
       ========================================================= */

    const vendedoresAgrupados =
        useMemo(() => {
            if (
                !reportData
            ) {
                return [];
            }


            return (
                reportData.data ||
                []
            ).map(
                (vendedor) => ({
                    vendedor_nombre:
                        vendedor.vendedor_nombre,

                    total_por_vendedor:
                        vendedor.total_por_vendedor,

                    clientes: [
                        ...(
                            vendedor.clientes ||
                            []
                        ),
                    ].sort(
                        (
                            a,
                            b,
                        ) =>
                            Number(
                                b.total_ventas,
                            ) -
                            Number(
                                a.total_ventas,
                            ),
                    ),
                }),
            );
        }, [
            reportData,
        ]);


    /* =========================================================
       PALETA GRÁFICA
       ========================================================= */

    const palette = [
        "#0e4f84",
        "#39b54a",
        "#fdb515",
        "#1769aa",
        "#6b7280",
        "#2e7d32",
        "#9a6700",
        "#4f46e5",
        "#0891b2",
        "#7c3aed",
        "#c2410c",
        "#475569",
    ];


    /* =========================================================
       FORMATO
       ========================================================= */

    const formatoNumero =
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
        <div className="gp-module-page gp-sales-client-page">

            <div className="gp-module-card gp-sales-client-card">

                {/* HEADER */}

                <div className="gp-sales-client-header">

                    <div className="gp-sales-client-heading">

                        <div className="gp-sales-client-heading-icon">
                            <TrendingUp
                                size={
                                    22
                                }
                            />
                        </div>

                        <div>
                            <div className="gp-module-meta">
                                CONTABILIDAD · VENTAS
                            </div>

                            <h1>
                                Ventas por cliente
                            </h1>

                            <p>
                                Analiza las ventas agrupadas
                                por vendedor y cliente dentro
                                de un rango de fechas.
                            </p>
                        </div>
                    </div>


                    {reportData && (
                        <div className="gp-sales-client-total">
                            <span>
                                Total general
                            </span>

                            <strong>
                                Q{" "}
                                {formatoNumero(
                                    reportData.total_general,
                                )}
                            </strong>
                        </div>
                    )}
                </div>


                {/* FILTROS */}

                <div className="gp-sales-client-filter-wrapper">

                    <section className="gp-sales-client-filter">

                        <div className="gp-sales-client-filter-header">

                            <div>
                                <Filter
                                    size={
                                        16
                                    }
                                />

                                <strong>
                                    Filtros del reporte
                                </strong>
                            </div>

                            <span>
                                Selecciona el período y,
                                opcionalmente, un vendedor.
                            </span>
                        </div>


                        <div className="gp-sales-client-filter-grid">

                            {/* DESDE */}

                            <div className="gp-sales-client-field">
                                <label>
                                    Desde
                                </label>

                                <div className="gp-sales-client-date">
                                    <CalendarDays
                                        size={
                                            14
                                        }
                                    />

                                    <input
                                        type="date"
                                        name="desde"
                                        value={
                                            filtros.desde
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />
                                </div>
                            </div>


                            {/* HASTA */}

                            <div className="gp-sales-client-field">
                                <label>
                                    Hasta
                                </label>

                                <div className="gp-sales-client-date">
                                    <CalendarDays
                                        size={
                                            14
                                        }
                                    />

                                    <input
                                        type="date"
                                        name="hasta"
                                        value={
                                            filtros.hasta
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />
                                </div>
                            </div>


                            {/* VENDEDOR */}

                            <div className="gp-sales-client-field gp-sales-client-vendor">
                                <label>
                                    Vendedor
                                </label>

                                <select
                                    name="vendedor_id"
                                    value={
                                        filtros.vendedor_id
                                    }
                                    onChange={
                                        handleChange
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


                            {/* CONSULTAR */}

                            <div className="gp-sales-client-search-action">
                                <button
                                    type="button"
                                    className="gp-sales-client-search-button"
                                    onClick={
                                        handleBuscar
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
                                        : "Ver reporte"}
                                </button>
                            </div>
                        </div>


                        {/* EXPORTAR */}

                        {reportData && (
                            <div className="gp-sales-client-export-row">

                                <div className="gp-sales-client-export-info">
                                    <BarChart3
                                        size={
                                            14
                                        }
                                    />

                                    <span>
                                        Exporta los resultados
                                        utilizando los filtros
                                        actuales.
                                    </span>
                                </div>


                                <div className="gp-sales-client-export-actions">

                                    <button
                                        type="button"
                                        className="gp-sales-client-export gp-sales-client-excel"
                                        onClick={() =>
                                            handleExport(
                                                "excel",
                                            )
                                        }
                                        disabled={
                                            !!exporting
                                        }
                                    >
                                        <FileSpreadsheet
                                            size={
                                                15
                                            }
                                        />

                                        {exporting ===
                                        "excel"
                                            ? "Generando..."
                                            : "Exportar Excel"}
                                    </button>


                                    <button
                                        type="button"
                                        className="gp-sales-client-export gp-sales-client-pdf"
                                        onClick={() =>
                                            handleExport(
                                                "pdf",
                                            )
                                        }
                                        disabled={
                                            !!exporting
                                        }
                                    >
                                        <FileDown
                                            size={
                                                15
                                            }
                                        />

                                        {exporting ===
                                        "pdf"
                                            ? "Generando..."
                                            : "Exportar PDF"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>


                {/* RESULTADOS */}

                {reportData && (
                    <div className="gp-sales-client-results">

                        {/* RESUMEN */}

                        <div className="gp-sales-client-summary">

                            <div className="gp-sales-client-summary-item">
                                <span>
                                    Período
                                </span>

                                <strong>
                                    {
                                        filtros.desde
                                    }
                                    {" → "}
                                    {
                                        filtros.hasta
                                    }
                                </strong>
                            </div>


                            <div className="gp-sales-client-summary-item">
                                <span>
                                    Vendedores
                                </span>

                                <strong>
                                    {
                                        vendedoresAgrupados.length
                                    }
                                </strong>
                            </div>


                            <div className="gp-sales-client-summary-total">
                                <TrendingUp
                                    size={
                                        18
                                    }
                                />

                                <div>
                                    <span>
                                        Total general
                                    </span>

                                    <strong>
                                        Q{" "}
                                        {formatoNumero(
                                            reportData.total_general,
                                        )}
                                    </strong>
                                </div>
                            </div>
                        </div>


                        {/* SIN RESULTADOS */}

                        {vendedoresAgrupados.length ===
                            0 && (
                            <div className="gp-sales-client-empty">
                                <UsersRound
                                    size={
                                        28
                                    }
                                />

                                <strong>
                                    Sin resultados
                                </strong>

                                <span>
                                    No se encontraron ventas
                                    para los filtros seleccionados.
                                </span>
                            </div>
                        )}


                        {/* VENDEDORES */}

                        {vendedoresAgrupados.map(
                            (
                                vendedor,
                                vendedorIndex,
                            ) => (
                                <section
                                    key={`${vendedor.vendedor_nombre}-${vendedorIndex}`}
                                    className="gp-sales-client-vendor-section"
                                >

                                    {/* HEADER VENDEDOR */}

                                    <div className="gp-sales-client-vendor-header">

                                        <div className="gp-sales-client-vendor-name">
                                            <span>
                                                Vendedor
                                            </span>

                                            <strong>
                                                {
                                                    vendedor.vendedor_nombre
                                                }
                                            </strong>
                                        </div>


                                        <div className="gp-sales-client-vendor-total">
                                            <span>
                                                Total vendedor
                                            </span>

                                            <strong>
                                                Q{" "}
                                                {formatoNumero(
                                                    vendedor.total_por_vendedor,
                                                )}
                                            </strong>
                                        </div>
                                    </div>


                                    {/* TABLA */}

                                    <div className="gp-sales-client-table-wrapper">
                                        <table className="gp-sales-client-table">

                                            <thead>
                                                <tr>
                                                    <th className="gp-sales-client-position">
                                                        #
                                                    </th>

                                                    <th>
                                                        Código
                                                    </th>

                                                    <th>
                                                        Cliente
                                                    </th>

                                                    <th className="gp-sales-client-money">
                                                        Total ventas
                                                    </th>
                                                </tr>
                                            </thead>


                                            <tbody>
                                                {vendedor.clientes.map(
                                                    (
                                                        cliente,
                                                        clienteIndex,
                                                    ) => (
                                                        <tr
                                                            key={`${cliente.codigo}-${clienteIndex}`}
                                                        >

                                                            <td className="gp-sales-client-position">
                                                                <span className="gp-sales-client-ranking">
                                                                    {
                                                                        clienteIndex +
                                                                        1
                                                                    }
                                                                </span>
                                                            </td>


                                                            <td>
                                                                <span className="gp-sales-client-code">
                                                                    {
                                                                        cliente.codigo
                                                                    }
                                                                </span>
                                                            </td>


                                                            <td>
                                                                <strong className="gp-sales-client-customer-name">
                                                                    {
                                                                        cliente.nombre
                                                                    }
                                                                </strong>
                                                            </td>


                                                            <td className="gp-sales-client-money">
                                                                Q{" "}
                                                                {formatoNumero(
                                                                    cliente.total_ventas,
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}


                                                {/* SUBTOTAL */}

                                                <tr className="gp-sales-client-subtotal">
                                                    <td
                                                        colSpan={
                                                            3
                                                        }
                                                    >
                                                        Subtotal{" "}
                                                        {
                                                            vendedor.vendedor_nombre
                                                        }
                                                    </td>

                                                    <td className="gp-sales-client-money">
                                                        Q{" "}
                                                        {formatoNumero(
                                                            vendedor.total_por_vendedor,
                                                        )}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>


                                    {/* GRÁFICA */}

                                    {vendedor.clientes.length >
                                        0 && (
                                        <div className="gp-sales-client-chart-card">

                                            <div className="gp-sales-client-chart-header">
                                                <div>
                                                    <BarChart3
                                                        size={
                                                            16
                                                        }
                                                    />

                                                    <strong>
                                                        Distribución de ventas por cliente
                                                    </strong>
                                                </div>

                                                <span>
                                                    Ordenado de mayor a menor
                                                </span>
                                            </div>


                                            <div
                                                className="gp-sales-client-chart"
                                                style={{
                                                    height:
                                                        Math.max(
                                                            280,
                                                            vendedor
                                                                .clientes
                                                                .length *
                                                                36,
                                                        ),
                                                }}
                                            >
                                                <ResponsiveContainer
                                                    width="100%"
                                                    height="100%"
                                                >
                                                    <BarChart
                                                        data={
                                                            vendedor.clientes
                                                        }
                                                        layout="vertical"
                                                        margin={{
                                                            top: 10,
                                                            right:
                                                                35,
                                                            left: 20,
                                                            bottom:
                                                                10,
                                                        }}
                                                    >
                                                        <CartesianGrid
                                                            strokeDasharray="3 3"
                                                            horizontal={
                                                                false
                                                            }
                                                        />

                                                        <XAxis
                                                            type="number"
                                                            tickFormatter={(
                                                                value,
                                                            ) =>
                                                                Number(
                                                                    value,
                                                                ).toLocaleString(
                                                                    "es-GT",
                                                                )
                                                            }
                                                        />

                                                        <YAxis
                                                            type="category"
                                                            dataKey="nombre"
                                                            width={
                                                                210
                                                            }
                                                            tick={{
                                                                fontSize:
                                                                    9,
                                                            }}
                                                        />

                                                        <Tooltip
                                                            formatter={(
                                                                value,
                                                            ) => [
                                                                `Q ${formatoNumero(
                                                                    value,
                                                                )}`,

                                                                "Total ventas",
                                                            ]}
                                                        />

                                                        <Bar
                                                            dataKey="total_ventas"
                                                            name="Total ventas"
                                                            radius={[
                                                                0,
                                                                4,
                                                                4,
                                                                0,
                                                            ]}
                                                        >
                                                            {vendedor.clientes.map(
                                                                (
                                                                    _,
                                                                    index,
                                                                ) => (
                                                                    <Cell
                                                                        key={`cell-${index}`}
                                                                        fill={
                                                                            palette[
                                                                                index %
                                                                                    palette.length
                                                                            ]
                                                                        }
                                                                    />
                                                                ),
                                                            )}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            ),
                        )}


                        {/* TOTAL GENERAL */}

                        {vendedoresAgrupados.length >
                            0 && (
                            <div className="gp-sales-client-grand-total">

                                <div>
                                    <TrendingUp
                                        size={
                                            18
                                        }
                                    />

                                    <div>
                                        <span>
                                            Total general
                                        </span>

                                        <strong>
                                            Ventas del período consultado
                                        </strong>
                                    </div>
                                </div>

                                <strong>
                                    Q{" "}
                                    {formatoNumero(
                                        reportData.total_general,
                                    )}
                                </strong>
                            </div>
                        )}
                    </div>
                )}
            </div>


            {/* SNACKBAR */}

            <Snackbar
                open={
                    snackbar.open
                }
                autoHideDuration={
                    4000
                }
                onClose={
                    handleCloseSnackbar
                }
                anchorOrigin={{
                    vertical:
                        "bottom",

                    horizontal:
                        "center",
                }}
            >
                <Alert
                    onClose={
                        handleCloseSnackbar
                    }
                    severity={
                        snackbar.severity
                    }
                    sx={{
                        width:
                            "100%",
                    }}
                >
                    {
                        snackbar.message
                    }
                </Alert>
            </Snackbar>
        </div>
    );
};


export default ReporteVentasPorCliente;