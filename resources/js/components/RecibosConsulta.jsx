import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import axios from "axios";
import alertify from "alertifyjs";

import {
    Autocomplete,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from "@mui/material";

import {
    MaterialReactTable,
    useMaterialReactTable,
} from "material-react-table";

import {
    CalendarDays,
    Download,
    FileText,
    ReceiptText,
    Search,
    Trash2,
    WalletCards,
    X,
} from "lucide-react";

import "../../css/recibos-consulta.css";


const RecibosConsulta = () => {
    const [
        recibos,
        setRecibos,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        generandoPdf,
        setGenerandoPdf,
    ] = useState(false);

    const [
        rowSelection,
        setRowSelection,
    ] = useState({});

    const [
        selectedRecibo,
        setSelectedRecibo,
    ] = useState(null);


    const [
        fechaInicio,
        setFechaInicio,
    ] = useState("");

    const [
        fechaFin,
        setFechaFin,
    ] = useState("");

    const [
        clienteFiltro,
        setClienteFiltro,
    ] = useState("");

    const [
        clientes,
        setClientes,
    ] = useState([]);

    const [
        tipoFiltro,
        setTipoFiltro,
    ] = useState("");


    const [
        pdfUrl,
        setPdfUrl,
    ] = useState(null);


    const [
        verFacturasOpen,
        setVerFacturasOpen,
    ] = useState(false);

    const [
        facturasRecibo,
        setFacturasRecibo,
    ] = useState([]);

    const [
        loadingFacturas,
        setLoadingFacturas,
    ] = useState(false);


    /* =========================================================
       FECHA SERVIDOR
       ========================================================= */

    useEffect(() => {
        const token =
            localStorage.getItem(
                "token",
            );


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
            localStorage.getItem(
                "token",
            );


        axios
            .get(
                `${import.meta.env.VITE_API_URL}/clientes`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                },
            )
            .then((res) => {
                setClientes(
                    Array.isArray(
                        res.data,
                    )
                        ? res.data
                        : [],
                );
            })
            .catch(() => {
                alertify.error(
                    "No se pudo cargar clientes",
                );
            });
    }, []);


    /* =========================================================
       RECIBO SELECCIONADO
       ========================================================= */

    useEffect(() => {
        const selectedKey =
            Object.keys(
                rowSelection,
            )[0];


        if (
            selectedKey !==
            undefined
        ) {
            const encontrado =
                recibos.find(
                    (recibo) =>
                        String(
                            recibo.idrecibo,
                        ) ===
                        String(
                            selectedKey,
                        ),
                );


            setSelectedRecibo(
                encontrado ||
                    null,
            );
        } else {
            setSelectedRecibo(
                null,
            );
        }
    }, [
        rowSelection,
        recibos,
    ]);


    /* =========================================================
       VALIDAR FECHAS
       ========================================================= */

    const validarFiltros =
        () => {
            if (
                !fechaInicio ||
                !fechaFin
            ) {
                alertify.warning(
                    "Selecciona ambas fechas",
                );

                return false;
            }


            if (
                fechaInicio >
                fechaFin
            ) {
                alertify.warning(
                    "La fecha inicial no puede ser mayor que la fecha final",
                );

                return false;
            }


            return true;
        };


    /* =========================================================
       CONSULTAR RECIBOS
       ========================================================= */

    const fetchRecibos =
        async () => {
            if (
                !validarFiltros()
            ) {
                return;
            }


            setLoading(
                true,
            );


            const token =
                localStorage.getItem(
                    "token",
                );


            const headers = {
                Authorization:
                    `Bearer ${token}`,
            };


            try {
                const params =
                    {};


                if (fechaInicio) {
                    params.fecha_inicio =
                        fechaInicio;
                }


                if (fechaFin) {
                    params.fecha_fin =
                        fechaFin;
                }


                if (
                    clienteFiltro
                ) {
                    params.cliente =
                        clienteFiltro;
                }


                if (
                    tipoFiltro
                ) {
                    params.tipo =
                        tipoFiltro;
                }


                const {
                    data,
                } =
                    await axios.get(
                        `${import.meta.env.VITE_API_URL}/recibos`,
                        {
                            headers,
                            params,
                        },
                    );


                setRecibos(
                    Array.isArray(
                        data,
                    )
                        ? data
                        : [],
                );


                setRowSelection(
                    {},
                );
            } catch (error) {
                console.error(
                    error,
                );


                alertify.error(
                    "Error al cargar recibos",
                );
            } finally {
                setLoading(
                    false,
                );
            }
        };


    /* =========================================================
       GENERAR PDF
       ========================================================= */

    const handleGenerarPdf =
        async () => {
            if (
                !validarFiltros()
            ) {
                return;
            }


            const token =
                localStorage.getItem(
                    "token",
                );


            const params =
                new URLSearchParams();


            if (fechaInicio) {
                params.append(
                    "fecha_inicio",
                    fechaInicio,
                );
            }


            if (fechaFin) {
                params.append(
                    "fecha_fin",
                    fechaFin,
                );
            }


            if (
                clienteFiltro
            ) {
                params.append(
                    "cliente",
                    clienteFiltro,
                );
            }


            if (
                tipoFiltro
            ) {
                params.append(
                    "tipo",
                    tipoFiltro,
                );
            }


            try {
                setGenerandoPdf(
                    true,
                );


                const response =
                    await fetch(
                        `${
                            import.meta.env.VITE_API_URL
                        }/recibos-reporte/pdf?${params.toString()}`,
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
                        "Error al generar PDF",
                    );
                }


                const blob =
                    await response.blob();


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
            } catch (error) {
                console.error(
                    error,
                );


                alertify.error(
                    "No se pudo generar el PDF",
                );
            } finally {
                setGenerandoPdf(
                    false,
                );
            }
        };


    /* =========================================================
       CERRAR PDF
       ========================================================= */

    const cerrarPdf =
        () => {
            if (pdfUrl) {
                URL.revokeObjectURL(
                    pdfUrl,
                );
            }


            setPdfUrl(
                null,
            );
        };


    /* =========================================================
       ELIMINAR / DESACTIVAR
       ========================================================= */

    const handleEliminarRecibo =
        () => {
            if (
                !selectedRecibo
            ) {
                alertify.error(
                    "Selecciona un recibo para eliminar",
                );

                return;
            }


            alertify
                .confirm(
                    "Confirmación",
                    "¿Está seguro de que desea desactivar el recibo seleccionado?",
                    () => {
                        const token =
                            localStorage.getItem(
                                "token",
                            );


                        axios
                            .put(
                                `${
                                    import.meta.env.VITE_API_URL
                                }/recibos/desactivar/${
                                    selectedRecibo.idrecibo
                                }`,
                                {},
                                {
                                    headers: {
                                        Authorization:
                                            `Bearer ${token}`,
                                    },
                                },
                            )
                            .then(() => {
                                alertify.success(
                                    "Recibo eliminado",
                                );


                                setRowSelection(
                                    {},
                                );


                                fetchRecibos();
                            })
                            .catch(() => {
                                alertify.error(
                                    "Error al eliminar el recibo",
                                );
                            });
                    },
                    () =>
                        alertify.error(
                            "Cancelado",
                        ),
                )
                .set(
                    "labels",
                    {
                        ok:
                            "Sí",
                        cancel:
                            "No",
                    },
                );
        };


    /* =========================================================
       VER FACTURAS
       ========================================================= */

    const handleVerFacturas =
        async (
            reciboRow,
        ) => {
            try {
                setLoadingFacturas(
                    true,
                );


                const token =
                    localStorage.getItem(
                        "token",
                    );


                const {
                    data,
                } =
                    await axios.get(
                        `${
                            import.meta.env.VITE_API_URL
                        }/recibos/${
                            reciboRow.idrecibo
                        }`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        },
                    );


                const detalles =
                    data?.detalles ??
                    [];


                const items =
                    detalles.map(
                        (
                            detalle,
                        ) => ({
                            idcuentaporcobrar:
                                detalle.idcuentaporcobrar,

                            nofactura:
                                detalle
                                    ?.cuenta
                                    ?.cotizacion
                                    ?.nofactura ??
                                "",

                            fecha_emision:
                                detalle
                                    ?.cuenta
                                    ?.fecha_emision ??
                                "",

                            monto_original:
                                Number(
                                    detalle
                                        ?.cuenta
                                        ?.monto_original ??
                                        0,
                                ),

                            saldo_pendiente:
                                Number(
                                    detalle
                                        ?.cuenta
                                        ?.saldo_pendiente ??
                                        0,
                                ),

                            monto_pagado:
                                Number(
                                    detalle?.monto ??
                                        0,
                                ),
                        }),
                    );


                setFacturasRecibo(
                    items,
                );


                setVerFacturasOpen(
                    true,
                );
            } catch (error) {
                console.error(
                    error,
                );


                alertify.error(
                    "No se pudieron cargar las facturas del recibo",
                );
            } finally {
                setLoadingFacturas(
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
                    style:
                        "currency",

                    currency:
                        "GTQ",

                    minimumFractionDigits:
                        2,
                },
            );


    /* =========================================================
       COLUMNAS
       ========================================================= */

    const columns =
        useMemo(
            () => [
                {
                    accessorKey:
                        "idrecibo",

                    header:
                        "ID",

                    size:
                        70,
                },

                {
                    accessorKey:
                        "serie",

                    header:
                        "Serie",

                    size:
                        65,
                },

                {
                    accessorKey:
                        "numero",

                    header:
                        "Número",

                    size:
                        90,
                },

                {
                    accessorKey:
                        "tipo",

                    header:
                        "Tipo",

                    size:
                        100,

                    Cell:
                        ({
                            cell,
                        }) => (
                            <span
                                className={
                                    cell.getValue() ===
                                    "RETENCIÓN"
                                        ? "gp-receipts-type gp-receipts-type-retention"
                                        : "gp-receipts-type"
                                }
                            >
                                {
                                    cell.getValue()
                                }
                            </span>
                        ),
                },

                {
                    accessorFn:
                        (row) =>
                            row.cliente
                                ?.nombre ||
                            "Sin nombre",

                    id:
                        "cliente_nombre",

                    header:
                        "Cliente",

                    size:
                        220,
                },

                {
                    accessorKey:
                        "fecha_recibo",

                    header:
                        "Fecha",

                    size:
                        110,
                },

                {
                    accessorKey:
                        "monto_recibido",

                    header:
                        "Monto recibo",

                    Cell:
                        ({
                            cell,
                        }) => (
                            <strong className="gp-receipts-money">
                                {formatoMoneda(
                                    cell.getValue(),
                                )}
                            </strong>
                        ),

                    size:
                        140,

                    muiTableBodyCellProps:
                        {
                            align:
                                "right",
                        },
                },

                {
                    id:
                        "detalle_count",

                    header:
                        "Facturas",

                    accessorFn:
                        (row) =>
                            Array.isArray(
                                row.detalles,
                            )
                                ? row.detalles
                                      .length
                                : 0,

                    Cell:
                        ({
                            row,
                        }) => {
                            const detalles =
                                row.original
                                    ?.detalles ??
                                [];


                            const count =
                                detalles.length;


                            return (
                                <button
                                    type="button"
                                    className="gp-receipts-invoices-button"
                                    onClick={(e) => {
                                        e.stopPropagation();

                                        handleVerFacturas(
                                            row.original,
                                        );
                                    }}
                                >
                                    <FileText
                                        size={
                                            13
                                        }
                                    />

                                    {count >
                                    0
                                        ? `${count} factura${
                                              count ===
                                              1
                                                  ? ""
                                                  : "s"
                                          }`
                                        : "Ver"}
                                </button>
                            );
                        },

                    size:
                        130,
                },
            ],
            [],
        );


    /* =========================================================
       TABLE
       ========================================================= */

    const table =
        useMaterialReactTable({
            columns,

            data:
                recibos,

            getRowId:
                (row) =>
                    String(
                        row.idrecibo,
                    ),

            enableRowSelection:
                true,

            enableMultiRowSelection:
                false,

            enablePagination:
                true,

            enableColumnFilters:
                true,

            enableGlobalFilter:
                true,

            state: {
                isLoading:
                    loading,

                rowSelection,
            },

            onRowSelectionChange:
                setRowSelection,

            muiTableContainerProps:
                {
                    sx: {
                        maxHeight:
                            600,
                    },
                },

            muiTablePaperProps:
                {
                    elevation:
                        0,

                    sx: {
                        border:
                            "1px solid #dfe6ec",

                        borderRadius:
                            "8px",

                        overflow:
                            "hidden",
                    },
                },

            muiTableHeadCellProps:
                {
                    sx: {
                        backgroundColor:
                            "#f3f6f9",

                        color:
                            "#475569",

                        fontSize:
                            "10px",

                        fontWeight:
                            700,

                        padding:
                            "8px",
                    },
                },

            muiTableBodyCellProps:
                {
                    sx: {
                        color:
                            "#344256",

                        fontSize:
                            "10px",

                        padding:
                            "7px 8px",
                    },
                },

            muiTableBodyRowProps:
                ({
                    row,
                }) => {
                    const selected =
                        !!rowSelection[
                            row.id
                        ];


                    return {
                        sx: {
                            cursor:
                                "pointer",

                            "& td":
                                selected
                                    ? {
                                          backgroundColor:
                                              "#c9e2f3",
                                      }
                                    : {},

                            "&:hover td":
                                {
                                    backgroundColor:
                                        selected
                                            ? "#bddbef"
                                            : "#f5f9fb",
                                },

                            "& td:first-of-type":
                                selected
                                    ? {
                                          borderLeft:
                                              "5px solid #0e4f84",
                                      }
                                    : {},
                        },

                        onClick: () => {
                            setRowSelection(
                                selected
                                    ? {}
                                    : {
                                          [row.id]:
                                              true,
                                      },
                            );
                        },
                    };
                },

            muiSearchTextFieldProps:
                {
                    size:
                        "small",

                    placeholder:
                        "Buscar recibo...",
                },

            initialState: {
                density:
                    "compact",
            },
        });


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-receipts-page">

            <div className="gp-module-card gp-receipts-card">

                {/* HEADER */}

                <div className="gp-receipts-header">

                    <div className="gp-receipts-heading">

                        <div className="gp-receipts-heading-icon">
                            <ReceiptText
                                size={
                                    22
                                }
                            />
                        </div>


                        <div>
                            <div className="gp-module-meta">
                                CUENTAS POR COBRAR · RECIBOS
                            </div>

                            <h1>
                                Consulta de recibos
                            </h1>

                            <p>
                                Consulta recibos y retenciones,
                                revisa sus facturas aplicadas
                                y genera reportes en PDF.
                            </p>
                        </div>
                    </div>


                    <div className="gp-receipts-counter">
                        <span>
                            Registros
                        </span>

                        <strong>
                            {
                                recibos.length
                            }
                        </strong>
                    </div>
                </div>


                {/* FILTROS */}

                <div className="gp-receipts-filter-wrapper">

                    <section className="gp-receipts-filter">

                        <div className="gp-receipts-filter-header">

                            <div>
                                <Search
                                    size={
                                        16
                                    }
                                />

                                <strong>
                                    Filtros de consulta
                                </strong>
                            </div>


                            <span>
                                Filtra por fecha, tipo y cliente.
                            </span>
                        </div>


                        <div className="gp-receipts-filter-grid">

                            {/* INICIO */}

                            <div className="gp-receipts-field">

                                <label>
                                    Fecha inicio
                                </label>


                                <div className="gp-receipts-date">

                                    <CalendarDays
                                        size={
                                            14
                                        }
                                    />


                                    <input
                                        type="date"
                                        value={
                                            fechaInicio
                                        }
                                        onChange={(e) =>
                                            setFechaInicio(
                                                e.target
                                                    .value,
                                            )
                                        }
                                    />
                                </div>
                            </div>


                            {/* FIN */}

                            <div className="gp-receipts-field">

                                <label>
                                    Fecha final
                                </label>


                                <div className="gp-receipts-date">

                                    <CalendarDays
                                        size={
                                            14
                                        }
                                    />


                                    <input
                                        type="date"
                                        value={
                                            fechaFin
                                        }
                                        onChange={(e) =>
                                            setFechaFin(
                                                e.target
                                                    .value,
                                            )
                                        }
                                    />
                                </div>
                            </div>


                            {/* TIPO */}

                            <div className="gp-receipts-field">

                                <label>
                                    Tipo
                                </label>


                                <select
                                    value={
                                        tipoFiltro
                                    }
                                    onChange={(e) =>
                                        setTipoFiltro(
                                            e.target
                                                .value,
                                        )
                                    }
                                >
                                    <option value="">
                                        Todas
                                    </option>

                                    <option value="RECIBO">
                                        RECIBO
                                    </option>

                                    <option value="RETENCIÓN">
                                        RETENCIÓN
                                    </option>
                                </select>
                            </div>


                            {/* CLIENTE */}

                            <div className="gp-receipts-client-filter">

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
                                        option?.nombre ??
                                        ""
                                    }
                                    isOptionEqualToValue={(
                                        option,
                                        value,
                                    ) =>
                                        String(
                                            option.idcliente,
                                        ) ===
                                        String(
                                            value.idcliente,
                                        )
                                    }
                                    value={
                                        clientes.find(
                                            (
                                                cliente,
                                            ) =>
                                                String(
                                                    cliente.idcliente,
                                                ) ===
                                                String(
                                                    clienteFiltro,
                                                ),
                                        ) ??
                                        null
                                    }
                                    onChange={(
                                        _,
                                        value,
                                    ) =>
                                        setClienteFiltro(
                                            value
                                                ? value.idcliente
                                                : "",
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
                                    filterOptions={(
                                        options,
                                        state,
                                    ) => {
                                        const q =
                                            state.inputValue
                                                .trim()
                                                .toLowerCase();


                                        if (!q) {
                                            return options.slice(
                                                0,
                                                50,
                                            );
                                        }


                                        return options
                                            .filter(
                                                (
                                                    option,
                                                ) =>
                                                    (
                                                        option.nombre ??
                                                        ""
                                                    )
                                                        .toLowerCase()
                                                        .includes(
                                                            q,
                                                        ),
                                            )
                                            .slice(
                                                0,
                                                50,
                                            );
                                    }}
                                    clearOnBlur={
                                        false
                                    }
                                    openOnFocus
                                />
                            </div>
                        </div>


                        {/* ACTIONS */}

                        <div className="gp-receipts-filter-actions">

                            <div className="gp-receipts-filter-help">

                                <WalletCards
                                    size={
                                        14
                                    }
                                />


                                <span>
                                    Selecciona un recibo para
                                    habilitar la desactivación.
                                </span>
                            </div>


                            <div className="gp-receipts-buttons">

                                <button
                                    type="button"
                                    className="gp-receipts-search-button"
                                    onClick={
                                        fetchRecibos
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
                                    className="gp-receipts-pdf-button"
                                    onClick={
                                        handleGenerarPdf
                                    }
                                    disabled={
                                        generandoPdf
                                    }
                                >
                                    <FileText
                                        size={
                                            15
                                        }
                                    />

                                    {generandoPdf
                                        ? "Generando..."
                                        : "Generar PDF"}
                                </button>


                                <button
                                    type="button"
                                    className="gp-receipts-delete-button"
                                    disabled={
                                        !selectedRecibo
                                    }
                                    onClick={
                                        handleEliminarRecibo
                                    }
                                >
                                    <Trash2
                                        size={
                                            15
                                        }
                                    />

                                    Desactivar
                                </button>
                            </div>
                        </div>
                    </section>
                </div>


                {/* TABLE */}

                <div className="gp-receipts-results">

                    <div className="gp-receipts-results-header">

                        <div>
                            <h2>
                                Recibos registrados
                            </h2>

                            <p>
                                Selecciona una fila para
                                realizar acciones sobre el recibo.
                            </p>
                        </div>


                        {selectedRecibo && (
                            <div className="gp-receipts-selected-info">
                                <span>
                                    Seleccionado
                                </span>

                                <strong>
                                    {
                                        selectedRecibo.serie
                                    }
                                    -
                                    {
                                        selectedRecibo.numero
                                    }
                                </strong>
                            </div>
                        )}
                    </div>


                    <div className="gp-receipts-mrt">
                        <MaterialReactTable
                            table={
                                table
                            }
                        />
                    </div>
                </div>
            </div>


            {/* =================================================
                MODAL PDF
               ================================================= */}

            <Dialog
                open={
                    !!pdfUrl
                }
                onClose={
                    cerrarPdf
                }
                maxWidth="lg"
                fullWidth
                className="gp-receipts-dialog"
            >

                <DialogTitle className="gp-receipts-dialog-title">

                    <div>
                        <FileText
                            size={
                                18
                            }
                        />

                        <div>
                            <span>
                                REPORTE
                            </span>

                            <strong>
                                Recibos
                            </strong>
                        </div>
                    </div>


                    <button
                        type="button"
                        onClick={
                            cerrarPdf
                        }
                    >
                        <X
                            size={
                                17
                            }
                        />
                    </button>
                </DialogTitle>


                <DialogContent
                    className="gp-receipts-pdf-content"
                    dividers
                >

                    <iframe
                        src={
                            pdfUrl
                        }
                        width="100%"
                        height="100%"
                        title="PDF Reporte"
                    />
                </DialogContent>


                <DialogActions className="gp-receipts-dialog-actions">

                    <button
                        type="button"
                        className="gp-receipts-download-button"
                        onClick={() => {
                            const now =
                                new Date();


                            const timestamp =
                                now
                                    .toISOString()
                                    .replace(
                                        /[:T]/g,
                                        "-",
                                    )
                                    .split(
                                        ".",
                                    )[0];


                            const link =
                                document.createElement(
                                    "a",
                                );


                            link.href =
                                pdfUrl;


                            link.download =
                                `reporte_recibos_${timestamp}.pdf`;


                            link.click();
                        }}
                    >
                        <Download
                            size={
                                14
                            }
                        />

                        Descargar PDF
                    </button>


                    <button
                        type="button"
                        className="gp-receipts-close-button"
                        onClick={
                            cerrarPdf
                        }
                    >
                        Cerrar
                    </button>
                </DialogActions>
            </Dialog>


            {/* =================================================
                MODAL FACTURAS
               ================================================= */}

            <Dialog
                open={
                    verFacturasOpen
                }
                onClose={() =>
                    setVerFacturasOpen(
                        false,
                    )
                }
                maxWidth="md"
                fullWidth
                className="gp-receipts-dialog"
            >

                <DialogTitle className="gp-receipts-dialog-title">

                    <div>
                        <WalletCards
                            size={
                                18
                            }
                        />

                        <div>
                            <span>
                                DETALLE DEL RECIBO
                            </span>

                            <strong>
                                Facturas asociadas
                            </strong>
                        </div>
                    </div>


                    <button
                        type="button"
                        onClick={() =>
                            setVerFacturasOpen(
                                false,
                            )
                        }
                    >
                        <X
                            size={
                                17
                            }
                        />
                    </button>
                </DialogTitle>


                <DialogContent
                    className="gp-receipts-invoices-content"
                    dividers
                >

                    {loadingFacturas ? (
                        <div className="gp-receipts-modal-loading">
                            Cargando facturas...
                        </div>
                    ) : facturasRecibo.length ===
                      0 ? (
                        <div className="gp-receipts-modal-empty">

                            <FileText
                                size={
                                    26
                                }
                            />


                            <strong>
                                Sin facturas asociadas
                            </strong>
                        </div>
                    ) : (
                        <div className="gp-receipts-invoices-table-wrapper">

                            <table className="gp-receipts-invoices-table">

                                <thead>
                                    <tr>
                                        <th>
                                            ID CxC
                                        </th>

                                        <th>
                                            No. Interno
                                        </th>

                                        <th>
                                            Fecha
                                        </th>

                                        <th className="gp-receipts-money-column">
                                            Monto original
                                        </th>

                                        <th className="gp-receipts-money-column">
                                            Saldo
                                        </th>

                                        <th className="gp-receipts-money-column">
                                            Pagado en recibo
                                        </th>
                                    </tr>
                                </thead>


                                <tbody>
                                    {facturasRecibo.map(
                                        (
                                            factura,
                                        ) => (
                                            <tr
                                                key={
                                                    factura.idcuentaporcobrar
                                                }
                                            >

                                                <td>
                                                    <span className="gp-receipts-cxc-id">
                                                        {
                                                            factura.idcuentaporcobrar
                                                        }
                                                    </span>
                                                </td>


                                                <td>
                                                    {
                                                        factura.nofactura ||
                                                        "—"
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        factura.fecha_emision
                                                    }
                                                </td>


                                                <td className="gp-receipts-money-column">
                                                    {formatoMoneda(
                                                        factura.monto_original,
                                                    )}
                                                </td>


                                                <td className="gp-receipts-money-column">
                                                    {formatoMoneda(
                                                        factura.saldo_pendiente,
                                                    )}
                                                </td>


                                                <td className="gp-receipts-money-column gp-receipts-applied">
                                                    {formatoMoneda(
                                                        factura.monto_pagado,
                                                    )}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DialogContent>


                <DialogActions className="gp-receipts-dialog-actions">

                    <button
                        type="button"
                        className="gp-receipts-close-button"
                        onClick={() =>
                            setVerFacturasOpen(
                                false,
                            )
                        }
                    >
                        Cerrar
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    );
};


export default RecibosConsulta;