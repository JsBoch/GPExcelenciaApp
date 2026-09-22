import React, {
    useEffect,
    useState,
} from "react";

import axios from "axios";
import alertify from "alertifyjs";

import {
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Button,
} from "reactstrap";

import {
    CalendarDays,
    FileText,
    Landmark,
    Search,
    WalletCards,
} from "lucide-react";

import "../../css/cuentas-por-cobrar-filtro.css";


const CuentasPorCobrarFiltro = () => {
    const [clientes, setClientes] =
        useState([]);

    const [idCliente, setIdCliente] =
        useState("");

    const [fechaInicio, setFechaInicio] =
        useState("");

    const [fechaFin, setFechaFin] =
        useState("");

    const [pdfUrl, setPdfUrl] =
        useState(null);

    const [tipoReporte, setTipoReporte] =
        useState("");

    const [loading, setLoading] =
        useState(false);


    /* =========================================================
       FECHA SERVIDOR
       ========================================================= */

    useEffect(() => {
        const token =
            localStorage.getItem("token");

        axios
            .get(
                `${import.meta.env.VITE_API_URL}/fecha-servidor`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                },
            )
            .then((res) => {
                setFechaInicio(
                    res.data.fecha,
                );

                setFechaFin(
                    res.data.fecha,
                );
            })
            .catch(() => {
                const today =
                    new Date()
                        .toISOString()
                        .split("T")[0];

                setFechaInicio(
                    today,
                );

                setFechaFin(
                    today,
                );
            });
    }, []);


    /* =========================================================
       CLIENTES
       ========================================================= */

    useEffect(() => {
        const token =
            localStorage.getItem("token");

        axios
            .get(
                "/api/clientes",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                },
            )
            .then((res) =>
                setClientes(
                    res.data || [],
                ),
            )
            .catch(() =>
                alertify.error(
                    "Error al cargar clientes",
                ),
            );
    }, []);


    /* =========================================================
       UTILIDADES
       ========================================================= */

    const validarCampos = () => {
        if (
            !idCliente ||
            !fechaInicio ||
            !fechaFin
        ) {
            alertify.error(
                "Todos los campos son obligatorios",
            );

            return false;
        }

        return true;
    };


    const actualizarPdf = (
        blob,
        tipo,
    ) => {
        if (pdfUrl) {
            URL.revokeObjectURL(
                pdfUrl,
            );
        }

        const url =
            URL.createObjectURL(
                blob,
            );

        setPdfUrl(
            url,
        );

        setTipoReporte(
            tipo,
        );
    };


    /* =========================================================
       ESTADO DE CUENTA
       ========================================================= */

    const handleGenerar =
        async () => {
            if (
                !validarCampos()
            ) {
                return;
            }

            const token =
                localStorage.getItem(
                    "token",
                );

            try {
                setLoading(true);

                const response =
                    await fetch(
                        `/api/cuentas-por-cobrar/estado-cuenta-con-recibos/pdf?idcliente=${idCliente}&fecha_inicio=${fechaInicio}&fecha_final=${fechaFin}`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        },
                    );

                if (
                    !response.ok
                ) {
                    throw new Error(
                        "No se pudo generar el PDF",
                    );
                }

                const blob =
                    await response.blob();

                actualizarPdf(
                    blob,
                    "Estado de cuenta",
                );
            } catch (error) {
                console.error(
                    error,
                );

                alertify.error(
                    "Error al generar PDF",
                );
            } finally {
                setLoading(false);
            }
        };


    /* =========================================================
       SALDOS
       ========================================================= */

    const handleSaldos =
        async () => {
            if (
                !validarCampos()
            ) {
                return;
            }

            const token =
                localStorage.getItem(
                    "token",
                );

            try {
                setLoading(true);

                const response =
                    await fetch(
                        `/api/cuentas-por-cobrar/saldos/pdf?idcliente=${idCliente}&fecha_inicio=${fechaInicio}&fecha_final=${fechaFin}`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        },
                    );

                if (
                    !response.ok
                ) {
                    throw new Error(
                        "No se pudo generar el PDF",
                    );
                }

                const blob =
                    await response.blob();

                actualizarPdf(
                    blob,
                    "Saldos",
                );
            } catch (error) {
                console.error(
                    error,
                );

                alertify.error(
                    "Error al generar PDF",
                );
            } finally {
                setLoading(false);
            }
        };


    /* =========================================================
       CERRAR PDF
       ========================================================= */

    const cerrarPdf = () => {
        if (pdfUrl) {
            URL.revokeObjectURL(
                pdfUrl,
            );
        }

        setPdfUrl(null);
        setTipoReporte("");
    };


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-cxc-filter-page">
            <div className="gp-module-card gp-cxc-filter-card">

                {/* HEADER */}

                <div className="gp-cxc-filter-header">
                    <div className="gp-cxc-filter-heading">
                        <div className="gp-cxc-filter-heading-icon">
                            <Landmark
                                size={22}
                            />
                        </div>

                        <div>
                            <div className="gp-module-meta">
                                CUENTAS POR COBRAR · REPORTES
                            </div>

                            <h1>
                                Estado de cuenta
                            </h1>

                            <p>
                                Consulta el estado de cuenta
                                o saldos de un cliente dentro
                                de un rango de fechas.
                            </p>
                        </div>
                    </div>
                </div>


                {/* FILTROS */}

                <div className="gp-cxc-filter-body">

                    <section className="gp-cxc-filter-section">

                        <div className="gp-cxc-filter-section-header">
                            <div>
                                <Search
                                    size={16}
                                />

                                <strong>
                                    Parámetros del reporte
                                </strong>
                            </div>

                            <span>
                                Todos los campos son obligatorios
                            </span>
                        </div>


                        <div className="gp-cxc-filter-grid">

                            {/* CLIENTE */}

                            <div className="gp-cxc-field gp-cxc-client">
                                <label>
                                    Cliente
                                </label>

                                <select
                                    value={
                                        idCliente
                                    }
                                    onChange={(e) =>
                                        setIdCliente(
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">
                                        Seleccione un cliente
                                    </option>

                                    {clientes.map(
                                        (cliente) => (
                                            <option
                                                key={
                                                    cliente.idcliente
                                                }
                                                value={
                                                    cliente.idcliente
                                                }
                                            >
                                                {
                                                    cliente.nombre
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>


                            {/* FECHA INICIO */}

                            <div className="gp-cxc-field">
                                <label>
                                    Fecha inicio
                                </label>

                                <div className="gp-cxc-date-control">
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


                            {/* FECHA FIN */}

                            <div className="gp-cxc-field">
                                <label>
                                    Fecha final
                                </label>

                                <div className="gp-cxc-date-control">
                                    <CalendarDays
                                        size={14}
                                    />

                                    <input
                                        type="date"
                                        value={
                                            fechaFin
                                        }
                                        onChange={(e) =>
                                            setFechaFin(
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </section>


                    {/* ACCIONES */}

                    <div className="gp-cxc-report-actions">

                        <button
                            type="button"
                            className="gp-cxc-report-button gp-cxc-state-button"
                            onClick={
                                handleGenerar
                            }
                            disabled={
                                loading
                            }
                        >
                            <FileText
                                size={17}
                            />

                            <div>
                                <strong>
                                    Estado de cuenta
                                </strong>

                                <span>
                                    Incluye movimientos y recibos
                                </span>
                            </div>
                        </button>


                        <button
                            type="button"
                            className="gp-cxc-report-button gp-cxc-balance-button"
                            onClick={
                                handleSaldos
                            }
                            disabled={
                                loading
                            }
                        >
                            <WalletCards
                                size={17}
                            />

                            <div>
                                <strong>
                                    Reporte de saldos
                                </strong>

                                <span>
                                    Consulta los saldos del cliente
                                </span>
                            </div>
                        </button>
                    </div>


                    {loading && (
                        <div className="gp-cxc-loading">
                            Generando reporte...
                        </div>
                    )}
                </div>
            </div>


            {/* =================================================
                MODAL PDF
               ================================================= */}

            <Modal
                isOpen={
                    !!pdfUrl
                }
                toggle={
                    cerrarPdf
                }
                size="xl"
                centered
                backdrop="static"
                className="gp-cxc-pdf-modal"
            >
                <ModalHeader
                    toggle={
                        cerrarPdf
                    }
                >
                    <div className="gp-cxc-pdf-title">
                        <FileText
                            size={18}
                        />

                        <div>
                            <span>
                                CUENTAS POR COBRAR
                            </span>

                            <strong>
                                {tipoReporte ||
                                    "Estado de cuenta"}
                            </strong>
                        </div>
                    </div>
                </ModalHeader>

                <ModalBody className="gp-cxc-pdf-body">
                    <iframe
                        src={
                            pdfUrl
                        }
                        width="100%"
                        height="100%"
                        title="Vista previa del reporte PDF"
                    />
                </ModalBody>

                <ModalFooter className="gp-cxc-pdf-footer">
                    <Button
                        color="secondary"
                        size="sm"
                        onClick={
                            cerrarPdf
                        }
                    >
                        Cerrar
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default CuentasPorCobrarFiltro;