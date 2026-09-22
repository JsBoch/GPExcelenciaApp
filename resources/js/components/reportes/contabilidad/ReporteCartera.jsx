import {
    useEffect,
    useState,
} from "react";

import axios from "axios";

import {
    CalendarDays,
    Eye,
    FileDown,
    Filter,
    Landmark,
    LayoutPanelTop,
    UsersRound,
} from "lucide-react";

import "bootstrap/dist/css/bootstrap.min.css";

import "../../../../css/reporte-cartera.css";


export default function ReporteCartera() {
    const [
        departamentos,
        setDepartamentos,
    ] = useState([]);

    const [
        vendedores,
        setVendedores,
    ] = useState([]);

    const [
        filtros,
        setFiltros,
    ] = useState({
        departamento_id: "",
        vendedor_id: "",
        fecha_reporte:
            new Date()
                .toISOString()
                .slice(0, 10),
    });

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        tipoGeneracion,
        setTipoGeneracion,
    ] = useState("");

    const [
        opts,
        setOpts,
    ] = useState({
        break_por_cliente:
            false,

        landscape:
            true,
    });


    /* =========================================================
       CARGAR CATÁLOGOS
       ========================================================= */

    useEffect(() => {
        const token =
            localStorage.getItem(
                "token",
            );

        const headers = {
            Authorization:
                `Bearer ${token}`,
        };

        Promise.all([
            axios.get(
                "/api/departamentos-pais",
                {
                    headers,
                },
            ),

            axios.get(
                "/api/vendedores",
                {
                    headers,
                },
            ),
        ])
            .then(
                ([
                    deps,
                    vends,
                ]) => {
                    setDepartamentos(
                        deps.data || [],
                    );

                    setVendedores(
                        vends.data || [],
                    );
                },
            )
            .catch((error) => {
                console.error(
                    "Error cargando filtros de cartera:",
                    error,
                );
            });
    }, []);


    /* =========================================================
       CAMBIO DE FILTROS
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
       GENERAR HTML
       ========================================================= */

    const generarHtml =
        async () => {
            try {
                setLoading(true);
                setTipoGeneracion(
                    "html",
                );

                const token =
                    localStorage.getItem(
                        "token",
                    );

                if (!token) {
                    alert(
                        "Sesión expirada.",
                    );

                    return;
                }

                const headers = {
                    Authorization:
                        `Bearer ${token}`,
                };


                const body = {
                    departamento_id:
                        filtros.departamento_id
                            ? Number(
                                  filtros.departamento_id,
                              )
                            : undefined,

                    vendedor_id:
                        filtros.vendedor_id
                            ? Number(
                                  filtros.vendedor_id,
                              )
                            : undefined,

                    fecha_reporte:
                        filtros.fecha_reporte,

                    break_por_cliente:
                        opts.break_por_cliente
                            ? 1
                            : 0,

                    landscape:
                        opts.landscape
                            ? 1
                            : 0,
                };


                const resp =
                    await axios.post(
                        "/api/reportes-contabilidad/cartera/html",
                        body,
                        {
                            headers,

                            responseType:
                                "blob",
                        },
                    );


                const blob =
                    new Blob(
                        [resp.data],
                        {
                            type:
                                "text/html",
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


                setTimeout(() => {
                    URL.revokeObjectURL(
                        url,
                    );
                }, 30000);
            } catch (err) {
                console.error(
                    err,
                );

                alert(
                    "No se pudo generar el reporte.",
                );
            } finally {
                setLoading(false);
                setTipoGeneracion("");
            }
        };


    /* =========================================================
       GENERAR PDF
       ========================================================= */

    const generarPdf =
        async () => {
            try {
                setLoading(true);
                setTipoGeneracion(
                    "pdf",
                );

                const token =
                    localStorage.getItem(
                        "token",
                    );

                const headers = {
                    Authorization:
                        `Bearer ${token}`,
                };


                const toQuery = (
                    obj,
                ) => {
                    const params =
                        new URLSearchParams();

                    Object.entries(
                        obj,
                    ).forEach(
                        ([
                            key,
                            value,
                        ]) => {
                            if (
                                value ===
                                    "" ||
                                value ===
                                    null ||
                                value ===
                                    undefined
                            ) {
                                return;
                            }

                            if (
                                typeof value ===
                                "boolean"
                            ) {
                                value =
                                    value
                                        ? "1"
                                        : "0";
                            }

                            params.append(
                                key,
                                value,
                            );
                        },
                    );

                    return params.toString();
                };


                const qs =
                    toQuery({
                        ...filtros,
                        ...opts,
                    });


                const resp =
                    await axios.get(
                        `/api/reportes-contabilidad/cartera/pdf?${qs}`,
                        {
                            headers,

                            responseType:
                                "blob",
                        },
                    );


                const cd =
                    resp.headers[
                        "content-disposition"
                    ];


                const suggested =
                    (
                        cd &&
                        /filename="?([^"]+)"?/.exec(
                            cd,
                        )?.[1]
                    ) ||
                    `cartera_${filtros.fecha_reporte}.pdf`;


                const blob =
                    new Blob(
                        [resp.data],
                        {
                            type:
                                "application/pdf",
                        },
                    );


                const url =
                    URL.createObjectURL(
                        blob,
                    );


                const a =
                    document.createElement(
                        "a",
                    );

                a.href =
                    url;

                a.download =
                    suggested;

                document.body.appendChild(
                    a,
                );

                a.click();

                a.remove();

                URL.revokeObjectURL(
                    url,
                );
            } catch (err) {
                if (
                    err.response?.data instanceof
                    Blob
                ) {
                    const text =
                        await err.response.data.text();

                    console.error(
                        "PDF ERROR:",
                        text,
                    );

                    alert(
                        "No se pudo generar el PDF:\n" +
                            text,
                    );
                } else {
                    console.error(
                        err,
                    );

                    alert(
                        "No se pudo generar el PDF.",
                    );
                }
            } finally {
                setLoading(false);
                setTipoGeneracion("");
            }
        };


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-portfolio-page">
            <div className="gp-module-card gp-portfolio-card">

                {/* HEADER */}

                <div className="gp-portfolio-header">
                    <div className="gp-portfolio-heading">
                        <div className="gp-portfolio-heading-icon">
                            <Landmark
                                size={
                                    22
                                }
                            />
                        </div>

                        <div>
                            <div className="gp-module-meta">
                                CONTABILIDAD · CARTERA
                            </div>

                            <h1>
                                Reporte de cartera
                            </h1>

                            <p>
                                Genera el reporte de
                                cuentas por cobrar por
                                departamento, vendedor y
                                fecha de corte.
                            </p>
                        </div>
                    </div>
                </div>


                {/* FILTROS */}

                <div className="gp-portfolio-body">

                    <section className="gp-portfolio-filter-section">

                        <div className="gp-portfolio-section-header">
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
                                Selecciona los filtros y
                                opciones de presentación.
                            </span>
                        </div>


                        <div className="gp-portfolio-filter-grid">

                            {/* DEPARTAMENTO */}

                            <div className="gp-portfolio-field">
                                <label>
                                    Departamento
                                </label>

                                <select
                                    name="departamento_id"
                                    value={
                                        filtros.departamento_id
                                    }
                                    onChange={
                                        onChange
                                    }
                                >
                                    <option value="">
                                        Todos los departamentos
                                    </option>

                                    {departamentos.map(
                                        (
                                            departamento,
                                        ) => (
                                            <option
                                                key={
                                                    departamento.iddepartamentopais
                                                }
                                                value={
                                                    departamento.iddepartamentopais
                                                }
                                            >
                                                {
                                                    departamento.nombre
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>


                            {/* VENDEDOR */}

                            <div className="gp-portfolio-field">
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


                            {/* FECHA */}

                            <div className="gp-portfolio-field">
                                <label>
                                    Fecha del reporte
                                </label>

                                <div className="gp-portfolio-date">
                                    <CalendarDays
                                        size={
                                            14
                                        }
                                    />

                                    <input
                                        type="date"
                                        name="fecha_reporte"
                                        value={
                                            filtros.fecha_reporte
                                        }
                                        onChange={
                                            onChange
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </section>


                    {/* OPCIONES */}

                    <section className="gp-portfolio-options">

                        <div className="gp-portfolio-options-header">
                            <LayoutPanelTop
                                size={
                                    16
                                }
                            />

                            <div>
                                <strong>
                                    Opciones de presentación
                                </strong>

                                <span>
                                    Configura cómo se
                                    generará el reporte.
                                </span>
                            </div>
                        </div>


                        <div className="gp-portfolio-option-grid">

                            {/* SALTO CLIENTE */}

                            <label className="gp-portfolio-option">
                                <div>
                                    <UsersRound
                                        size={
                                            16
                                        }
                                    />

                                    <div>
                                        <strong>
                                            Salto por cliente
                                        </strong>

                                        <span>
                                            Inicia una nueva
                                            sección para cada
                                            cliente.
                                        </span>
                                    </div>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={
                                        opts.break_por_cliente
                                    }
                                    onChange={(e) =>
                                        setOpts(
                                            (
                                                prev,
                                            ) => ({
                                                ...prev,

                                                break_por_cliente:
                                                    e
                                                        .target
                                                        .checked,
                                            }),
                                        )
                                    }
                                />
                            </label>


                            {/* HORIZONTAL */}

                            <label className="gp-portfolio-option">
                                <div>
                                    <LayoutPanelTop
                                        size={
                                            16
                                        }
                                    />

                                    <div>
                                        <strong>
                                            Orientación horizontal
                                        </strong>

                                        <span>
                                            Genera el documento en
                                            formato apaisado.
                                        </span>
                                    </div>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={
                                        opts.landscape
                                    }
                                    onChange={(e) =>
                                        setOpts(
                                            (
                                                prev,
                                            ) => ({
                                                ...prev,

                                                landscape:
                                                    e
                                                        .target
                                                        .checked,
                                            }),
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </section>


                    {/* ACCIONES */}

                    <div className="gp-portfolio-actions">

                        <button
                            type="button"
                            className="gp-portfolio-action gp-portfolio-html"
                            onClick={
                                generarHtml
                            }
                            disabled={
                                loading
                            }
                        >
                            <Eye
                                size={
                                    16
                                }
                            />

                            <div>
                                <strong>
                                    {loading &&
                                    tipoGeneracion ===
                                        "html"
                                        ? "Generando..."
                                        : "Ver en HTML"}
                                </strong>

                                <span>
                                    Abre una vista previa en
                                    una nueva pestaña.
                                </span>
                            </div>
                        </button>


                        <button
                            type="button"
                            className="gp-portfolio-action gp-portfolio-pdf"
                            onClick={
                                generarPdf
                            }
                            disabled={
                                loading
                            }
                        >
                            <FileDown
                                size={
                                    16
                                }
                            />

                            <div>
                                <strong>
                                    {loading &&
                                    tipoGeneracion ===
                                        "pdf"
                                        ? "Generando..."
                                        : "Descargar PDF"}
                                </strong>

                                <span>
                                    Descarga el reporte
                                    listo para impresión.
                                </span>
                            </div>
                        </button>
                    </div>


                    {loading && (
                        <div className="gp-portfolio-loading">
                            Procesando reporte...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}