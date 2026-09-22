import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import axios from "axios";

import {
    CalendarDays,
    FileText,
    ReceiptText,
    Search,
} from "lucide-react";

import ReportePrefacturacionPDF from "./ReportePrefacturacionModal";

import "../../../../css/reporte-prefacturacion.css";


export default function ReportePrefacturacion() {
    const [
        vendedores,
        setVendedores,
    ] = useState([]);

    const [
        filtros,
        setFiltros,
    ] = useState(() => {
        const hoy =
            new Date()
                .toISOString()
                .slice(0, 10);

        return {
            desde: hoy,
            hasta: hoy,
            vendedor_id: "",
        };
    });

    const [
        data,
        setData,
    ] = useState(null);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        show,
        setShow,
    ] = useState(false);


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
                "/api/vendedores",
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
       VALIDACIÓN
       ========================================================= */

    const canBuscar =
        useMemo(
            () =>
                Boolean(
                    filtros.desde &&
                        filtros.hasta,
                ),
            [
                filtros.desde,
                filtros.hasta,
            ],
        );


    /* =========================================================
       CAMBIO FILTROS
       ========================================================= */

    const onChange = (
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
       VER REPORTE
       ========================================================= */

    const verReporte =
        async (e) => {
            e.preventDefault();

            if (!canBuscar) {
                return;
            }

            try {
                setLoading(true);

                const body = {
                    desde:
                        filtros.desde,

                    hasta:
                        filtros.hasta,

                    vendedor_id:
                        filtros.vendedor_id ||
                        undefined,
                };


                const resp =
                    await axios.post(
                        "/api/reportes-contabilidad/cotizaciones/prefacturacion/data",
                        body,
                        {
                            headers: {
                                ...authHeaders(),

                                "Content-Type":
                                    "application/json",
                            },
                        },
                    );


                setData(
                    resp.data,
                );

                setShow(
                    true,
                );
            } catch (err) {
                console.error(
                    err,
                );

                alert(
                    "No se pudo cargar el reporte.",
                );
            } finally {
                setLoading(false);
            }
        };


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-prefact-report-page">
            <div className="gp-module-card gp-prefact-report-card">

                {/* HEADER */}

                <div className="gp-prefact-report-header">
                    <div className="gp-prefact-report-heading">

                        <div className="gp-prefact-report-heading-icon">
                            <ReceiptText
                                size={
                                    22
                                }
                            />
                        </div>

                        <div>
                            <div className="gp-module-meta">
                                CONTABILIDAD · PRE-FACTURACIÓN
                            </div>

                            <h1>
                                Reporte de cotizaciones
                            </h1>

                            <p>
                                Consulta las cotizaciones
                                en pre-facturación por rango
                                de fechas y vendedor.
                            </p>
                        </div>
                    </div>
                </div>


                {/* BODY */}

                <div className="gp-prefact-report-body">

                    <form
                        onSubmit={
                            verReporte
                        }
                    >

                        <section className="gp-prefact-filter-section">

                            <div className="gp-prefact-filter-header">
                                <div>
                                    <Search
                                        size={
                                            16
                                        }
                                    />

                                    <strong>
                                        Parámetros del reporte
                                    </strong>
                                </div>

                                <span>
                                    Selecciona el rango de
                                    fechas y, opcionalmente,
                                    un vendedor.
                                </span>
                            </div>


                            <div className="gp-prefact-filter-grid">

                                {/* DESDE */}

                                <div className="gp-prefact-field">
                                    <label>
                                        Desde
                                    </label>

                                    <div className="gp-prefact-date-control">
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
                                                onChange
                                            }
                                            required
                                        />
                                    </div>
                                </div>


                                {/* HASTA */}

                                <div className="gp-prefact-field">
                                    <label>
                                        Hasta
                                    </label>

                                    <div className="gp-prefact-date-control">
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
                                                onChange
                                            }
                                            required
                                        />
                                    </div>
                                </div>


                                {/* VENDEDOR */}

                                <div className="gp-prefact-field gp-prefact-field-wide">
                                    <label>
                                        Vendedor
                                    </label>

                                    <select
                                        name="vendedor_id"
                                        value={
                                            filtros.vendedor_id
                                        }
                                        onChange={
                                            onChange
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
                            </div>


                            {/* ACCIÓN */}

                            <div className="gp-prefact-action-row">

                                <div className="gp-prefact-help">
                                    <FileText
                                        size={
                                            14
                                        }
                                    />

                                    <span>
                                        El reporte se abrirá
                                        en una vista previa.
                                    </span>
                                </div>


                                <button
                                    type="submit"
                                    className="gp-prefact-view-button"
                                    disabled={
                                        !canBuscar ||
                                        loading
                                    }
                                >
                                    <Search
                                        size={
                                            15
                                        }
                                    />

                                    {loading
                                        ? "Generando..."
                                        : "Ver reporte"}
                                </button>
                            </div>
                        </section>


                        {loading && (
                            <div className="gp-prefact-loading">
                                Generando reporte de
                                pre-facturación...
                            </div>
                        )}
                    </form>
                </div>
            </div>


            {/* MODAL / PDF */}

            {show &&
                data && (
                    <ReportePrefacturacionPDF
                        data={
                            data
                        }
                        onClose={() =>
                            setShow(
                                false,
                            )
                        }
                    />
                )}
        </div>
    );
}