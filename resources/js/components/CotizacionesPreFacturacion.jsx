import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import axios from "axios";

import {
    MaterialReactTable,
    useMaterialReactTable,
} from "material-react-table";

import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    Snackbar,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";

import {
    ChatBubbleOutline,
    CheckCircleOutline,
    Comment,
    Description,
    ReceiptLong,
    Search,
    Visibility,
} from "@mui/icons-material";

import alertify from "alertifyjs";

import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

import "../../css/cotizaciones-prefacturacion.css";


/* =========================================================
   FORMATO FECHA
   ========================================================= */

const fmtDMY = (value) => {
    if (!value) return "";

    const s = String(value).trim();

    /*
     * Si viene YYYY-MM-DD o con hora,
     * evitamos desfases de zona horaria.
     */
    const m = s.match(
        /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (m) {
        return `${m[3]}/${m[2]}/${m[1]}`;
    }

    const d = new Date(
        s.includes(" ")
            ? s.replace(" ", "T")
            : s
    );

    if (!isNaN(d)) {
        const dd = String(
            d.getDate()
        ).padStart(2, "0");

        const mm = String(
            d.getMonth() + 1
        ).padStart(2, "0");

        const yy =
            d.getFullYear();

        return `${dd}/${mm}/${yy}`;
    }

    return s;
};


function CotizacionesPreFacturacion() {
    /* =========================================================
       ESTADOS
       ========================================================= */

    const [
        cotizaciones,
        setCotizaciones,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        selectedCotizacion,
        setSelectedCotizacion,
    ] = useState(null);

    const [
        comentario,
        setComentario,
    ] = useState("");

    const [
        openModal,
        setOpenModal,
    ] = useState(false);

    const [
        snackbar,
        setSnackbar,
    ] = useState({
        open: false,
        message: "",
        severity: "success",
    });

    const [
        openComentarios,
        setOpenComentarios,
    ] = useState(false);

    const [
        filtroNo,
        setFiltroNo,
    ] = useState("");

    const [
        comentariosPaginated,
        setComentariosPaginated,
    ] = useState(null);

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        rowSelection,
        setRowSelection,
    ] = useState({});


    /* =========================================================
       FILTRO
       ========================================================= */

    const cotizacionesFiltradas =
        useMemo(() => {
            if (!filtroNo.trim()) {
                return cotizaciones;
            }

            const needle =
                filtroNo
                    .trim()
                    .toLowerCase();

            const needleNum =
                needle
                    .replace(/^ct/i, "")
                    .replace(/\D/g, "");

            return cotizaciones.filter(
                (c) => {
                    const no = String(
                        c.nocotizacion || ""
                    ).toLowerCase();

                    const noNum =
                        no
                            .replace(
                                /^ct/i,
                                ""
                            )
                            .replace(
                                /\D/g,
                                ""
                            );

                    return (
                        no.includes(
                            needle
                        ) ||
                        (
                            !!needleNum &&
                            noNum.includes(
                                needleNum
                            )
                        )
                    );
                }
            );
        }, [
            cotizaciones,
            filtroNo,
        ]);


    /* =========================================================
       CARGAR COTIZACIONES
       ========================================================= */

    const fetchCotizaciones =
        async () => {
            const token =
                localStorage.getItem(
                    "token"
                );

            const headers = {
                Authorization:
                    `Bearer ${token}`,
            };

            try {
                setLoading(true);

                const { data } =
                    await axios.get(
                        `${
                            import.meta.env
                                .VITE_API_URL
                        }/cotizaciones-estado4`,
                        {
                            headers,
                        }
                    );

                setCotizaciones(
                    data
                );
            } catch (error) {
                console.error(
                    "Error cargando cotizaciones:",
                    error
                );

                alertify.error(
                    "Error al cargar las cotizaciones."
                );
            } finally {
                setLoading(false);
            }
        };


    useEffect(() => {
        fetchCotizaciones();
    }, []);


    /* =========================================================
       COMENTARIOS
       ========================================================= */

    const guardarComentario =
        async () => {
            if (
                !selectedCotizacion
            ) {
                return;
            }

            const token =
                localStorage.getItem(
                    "token"
                );

            const headers = {
                Authorization:
                    `Bearer ${token}`,
            };

            try {
                await axios.post(
                    `${
                        import.meta.env
                            .VITE_API_URL
                    }/cotizaciones-estado4/agregar-comentario`,
                    {
                        idcotizacion:
                            selectedCotizacion
                                .idcotizacion,

                        comentario,
                    },
                    {
                        headers,
                    }
                );

                setSnackbar({
                    open: true,
                    message:
                        "Comentario guardado",
                    severity:
                        "success",
                });

                setComentario("");
                setOpenModal(false);

                /*
                 * No cambia el proceso:
                 * solo actualiza visualmente el contador.
                 */
                setCotizaciones(
                    (prev) =>
                        prev.map(
                            (cot) =>
                                Number(
                                    cot.idcotizacion
                                ) ===
                                Number(
                                    selectedCotizacion
                                        .idcotizacion
                                )
                                    ? {
                                          ...cot,
                                          comentarios_count:
                                              Number(
                                                  cot.comentarios_count ||
                                                      0
                                              ) +
                                              1,
                                      }
                                    : cot
                        )
                );
            } catch (error) {
                console.error(
                    "Error al guardar comentario:",
                    error
                );

                setSnackbar({
                    open: true,
                    message:
                        "Error al guardar",
                    severity:
                        "error",
                });
            }
        };


    /*
     * cotizacionParam permite abrir comentarios directamente
     * desde el chip sin depender de que setState haya terminado.
     */
    const obtenerComentarios =
        async (
            pageParam = 1,
            cotizacionParam = null
        ) => {
            const cotizacion =
                cotizacionParam ||
                selectedCotizacion;

            if (!cotizacion) {
                return;
            }

            const token =
                localStorage.getItem(
                    "token"
                );

            const headers = {
                Authorization:
                    `Bearer ${token}`,
            };

            try {
                const { data } =
                    await axios.get(
                        `${
                            import.meta.env
                                .VITE_API_URL
                        }/cotizaciones-estado4/${
                            cotizacion.idcotizacion
                        }/comentarios`,
                        {
                            headers,
                            params: {
                                page:
                                    pageParam,
                            },
                        }
                    );

                setSelectedCotizacion(
                    cotizacion
                );

                setComentariosPaginated(
                    data
                );

                setPage(
                    pageParam
                );

                setOpenComentarios(
                    true
                );
            } catch (error) {
                console.error(
                    "Error al obtener comentarios:",
                    error
                );

                setSnackbar({
                    open: true,
                    message:
                        "Error al obtener comentarios",
                    severity:
                        "error",
                });
            }
        };


    /* =========================================================
       COLUMNAS
       ========================================================= */

    const columns = useMemo(
        () => [
            {
                accessorKey:
                    "nocotizacion",

                header:
                    "No. Cotización",

                size: 130,

                Cell: ({ cell }) => (
                    <strong className="gp-prefact-no">
                        {cell.getValue()}
                    </strong>
                ),
            },

            {
                accessorKey:
                    "fecha_prefacturacion",

                header:
                    "Fecha",

                size: 110,

                Cell: ({ cell }) =>
                    fmtDMY(
                        cell.getValue()
                    ),

                sortingFn: (
                    rowA,
                    rowB,
                    columnId
                ) => {
                    const a =
                        rowA.getValue(
                            columnId
                        );

                    const b =
                        rowB.getValue(
                            columnId
                        );

                    const da =
                        new Date(a);

                    const db =
                        new Date(b);

                    return da - db;
                },
            },

            {
                accessorKey:
                    "cliente",

                header:
                    "Cliente",

                minSize: 240,
            },

            {
                accessorKey:
                    "total",

                header:
                    "Total",

                size: 125,

                muiTableHeadCellProps: {
                    align: "right",
                },

                muiTableBodyCellProps: {
                    align: "right",
                },

                Cell: ({ cell }) => {
                    const value =
                        parseFloat(
                            cell.getValue()
                        );

                    if (
                        !Number.isFinite(
                            value
                        )
                    ) {
                        return "";
                    }

                    return value.toLocaleString(
                        "es-GT",
                        {
                            style:
                                "currency",

                            currency:
                                "GTQ",
                        }
                    );
                },
            },

            {
                accessorKey:
                    "comentarios_count",

                header: "Comentarios",

                size: 95,

                enableSorting:
                    false,

                enableColumnFilter:
                    false,

                muiTableHeadCellProps: {
                    align: "center",
                },

                muiTableBodyCellProps: {
                    align: "center",
                },

                Cell: ({
                    cell,
                    row,
                }) => {
                    const cnt =
                        Number(
                            cell.getValue() ||
                                0
                        );

                    if (!cnt) {
                        return (
                            <span className="gp-prefact-no-comments">
                                —
                            </span>
                        );
                    }

                    return (
                        <Tooltip
                            title="Ver comentarios"
                        >
                            <Chip
                                size="small"
                                icon={
                                    <ChatBubbleOutline />
                                }
                                label={cnt}
                                className="gp-prefact-comment-chip"
                                onClick={(
                                    e
                                ) => {
                                    e.stopPropagation();

                                    obtenerComentarios(
                                        1,
                                        row.original
                                    );
                                }}
                            />
                        </Tooltip>
                    );
                },
            },
        ],
        []
    );


    /* =========================================================
       TABLA
       ========================================================= */

    const table =
        useMaterialReactTable({
            columns,

            data:
                cotizacionesFiltradas,

            enableRowSelection:
                true,

            enableMultiRowSelection:
                true,

            enableColumnFilters:
                false,

            enableGlobalFilter:
                false,

            enablePagination:
                true,

            enableDensityToggle:
                false,

            enableFullScreenToggle:
                true,

            enableHiding:
                false,

            enableColumnActions:
                false,

            positionToolbarAlertBanner:
                "none",

            muiTableContainerProps: {
                sx: {
                    maxHeight:
                        600,
                },
            },

            muiTablePaperProps: {
                elevation: 0,

                sx: {
                    border:
                        "none",

                    boxShadow:
                        "none",
                },
            },

            muiTableHeadCellProps: {
                sx: {
                    backgroundColor:
                        "#f3f6f9",

                    color:
                        "#475569",

                    fontSize:
                        "11px",

                    fontWeight:
                        700,

                    borderBottom:
                        "1px solid #dfe6ec",
                },
            },

            muiTableBodyCellProps: {
                sx: {
                    fontSize:
                        "11.5px",

                    color:
                        "#334155",

                    borderBottom:
                        "1px solid #edf1f4",
                },
            },

            muiTableBodyRowProps: ({
                row,
            }) => ({
                onClick: () => {
                    /*
                     * Click en fila selecciona exclusivamente
                     * esa cotización para comentarios.
                     * Los checkboxes continúan controlando
                     * la selección múltiple para facturación.
                     */
                    setSelectedCotizacion(
                        row.original
                    );
                },

                sx: {
                    cursor:
                        "pointer",

                    "&:hover td":
                        {
                            backgroundColor:
                                "#f5f9fb",
                        },

                    "&[data-selected='true'] td":
                        {
                            backgroundColor:
                                "#c9e2f3",
                        },
                },
            }),

            initialState: {
                density:
                    "compact",

                pagination: {
                    pageIndex: 0,
                    pageSize: 10,
                },
            },

            state: {
                isLoading:
                    loading,

                rowSelection,
            },

            onRowSelectionChange:
                setRowSelection,
        });


    /* =========================================================
       SINCRONIZAR FILA PRINCIPAL SELECCIONADA
       ========================================================= */

    useEffect(() => {
        const rows =
            table
                .getSelectedRowModel()
                .flatRows;

        /*
         * Conservamos el comportamiento original:
         * la primera selección se considera la
         * cotización principal para comentarios.
         */
        setSelectedCotizacion(
            rows.length
                ? rows[0].original
                : null
        );
    }, [
        rowSelection,
        table,
    ]);


    /* =========================================================
       CAMBIAR ESTADO INDIVIDUAL
       Se conserva aunque actualmente no tenga botón visible.
       ========================================================= */

    const handleCambiarEstado = (
        cotizacion,
        estado
    ) => {
        const id =
            cotizacion?.idcotizacion;

        if (
            !cotizacion ||
            !id
        ) {
            alertify.alert(
                "Error",
                "No se encontró la cotización seleccionada."
            );

            return;
        }

        const token =
            localStorage.getItem(
                "token"
            );

        if (token) {
            axios
                .put(
                    `/api/cotizaciones/activarfacturacion/${id}`,
                    {
                        estado:
                            estado,
                    },
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                )
                .then(
                    (response) => {
                        alertify.success(
                            response
                                .data
                                .message
                        );

                        fetchCotizaciones();
                    }
                )
                .catch(
                    (error) => {
                        console.error(
                            "Error al cambiar estado:",
                            error
                        );
                    }
                );
        }
    };


    /* =========================================================
       FACTURACIÓN MASIVA
       ========================================================= */

    const handleCambiarEstadoMasivo =
        async (estado) => {
            const ids =
                table
                    .getSelectedRowModel()
                    .flatRows
                    .map(
                        (r) =>
                            r.original
                                ?.idcotizacion
                    )
                    .filter((v) =>
                        Number.isInteger(
                            Number(v)
                        )
                    )
                    .map((v) =>
                        Number(v)
                    );

            if (!ids.length) {
                alertify.alert(
                    "Atención",
                    "No hay filas válidas seleccionadas."
                );

                return;
            }

            alertify.confirm(
                "Confirmar",
                `¿Enviar ${ids.length} cotización(es) a estado ${estado} (PARA FACTURAR)?`,

                async () => {
                    try {
                        const token =
                            localStorage.getItem(
                                "token"
                            );

                        const { data } =
                            await axios.put(
                                `${
                                    import
                                        .meta
                                        .env
                                        .VITE_API_URL
                                }/cotizaciones/activarfacturacion/masivo`,

                                {
                                    ids,
                                    estado,
                                },

                                {
                                    headers:
                                        {
                                            Authorization:
                                                `Bearer ${token}`,
                                        },
                                }
                            );

                        const {
                            total,
                            actualizadas,
                            ignoradas,
                            no_encontradas,
                        } = data;

                        alertify.success(
                            `Procesadas: ${total}. Actualizadas: ${actualizadas}. Omitidas: ${ignoradas}.` +
                                (
                                    no_encontradas?.length
                                        ? ` No encontradas: ${no_encontradas.join(
                                              ", "
                                          )}`
                                        : ""
                                )
                        );

                        setRowSelection(
                            {}
                        );

                        await fetchCotizaciones();
                    } catch (err) {
                        console.error(
                            err
                        );

                        alertify.error(
                            err.response
                                ?.data
                                ?.message ||
                                "Error al actualizar en lote."
                        );
                    }
                },

                () => {}
            );
        };


    const seleccionadas =
        table
            .getSelectedRowModel()
            .rows.length;


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-prefact-page">
            <div className="gp-module-card gp-prefact-card">

                {/* HEADER */}

                <div className="gp-prefact-header">
                    <div>
                        <div className="gp-module-meta">
                            MÓDULO · FACTURACIÓN
                        </div>

                        <h1 className="gp-prefact-title">
                            Cotizaciones en
                            pre-facturación
                        </h1>

                        <p className="gp-prefact-description">
                            Revisa las cotizaciones aprobadas,
                            agrega observaciones y selecciona
                            las que están listas para pasar al
                            proceso de facturación.
                        </p>
                    </div>

                    <div className="gp-prefact-header-icon">
                        <Description />
                    </div>
                </div>


                {/* RESUMEN */}

                <div className="gp-prefact-summary">
                    <div className="gp-prefact-summary-item">
                        <div className="gp-prefact-summary-icon">
                            <Description fontSize="small" />
                        </div>

                        <div>
                            <span>
                                En pre-facturación
                            </span>

                            <strong>
                                {cotizaciones.length}
                            </strong>
                        </div>
                    </div>

                    <div
                        className={`gp-prefact-summary-item ${
                            seleccionadas
                                ? "is-active"
                                : ""
                        }`}
                    >
                        <div className="gp-prefact-summary-icon">
                            <CheckCircleOutline fontSize="small" />
                        </div>

                        <div>
                            <span>
                                Seleccionadas
                            </span>

                            <strong>
                                {seleccionadas}
                            </strong>
                        </div>
                    </div>
                </div>


                {/* BUSCADOR */}

                <div className="gp-prefact-controls">
                    <TextField
                        value={filtroNo}
                        onChange={(e) =>
                            setFiltroNo(
                                e.target.value
                            )
                        }
                        placeholder="Buscar CT123 o 123..."
                        size="small"
                        className="gp-prefact-search"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {filtroNo && (
                        <span className="gp-prefact-filter-count">
                            {
                                cotizacionesFiltradas.length
                            }{" "}
                            resultado
                            {cotizacionesFiltradas.length !==
                            1
                                ? "s"
                                : ""}
                        </span>
                    )}
                </div>


                {/* ACCIONES */}

                <div className="gp-prefact-toolbar">
                    <div className="gp-prefact-toolbar-left">
                        <Button
                            variant="outlined"
                            size="small"
                            disabled={
                                !selectedCotizacion
                            }
                            onClick={() =>
                                setOpenModal(
                                    true
                                )
                            }
                            startIcon={
                                <Comment />
                            }
                        >
                            Agregar comentario
                        </Button>

                        <Button
                            variant="outlined"
                            size="small"
                            disabled={
                                !selectedCotizacion
                            }
                            onClick={() =>
                                obtenerComentarios()
                            }
                            startIcon={
                                <Visibility />
                            }
                        >
                            Ver comentarios
                        </Button>
                    </div>

                    <div className="gp-prefact-toolbar-right">
                        <div className="gp-prefact-selection-status">
                            {seleccionadas >
                            0 ? (
                                <>
                                    <CheckCircleOutline fontSize="small" />

                                    <strong>
                                        {
                                            seleccionadas
                                        }
                                    </strong>

                                    <span>
                                        seleccionada
                                        {seleccionadas >
                                        1
                                            ? "s"
                                            : ""}
                                    </span>
                                </>
                            ) : (
                                <span>
                                    Selecciona una o
                                    varias cotizaciones
                                    para facturar.
                                </span>
                            )}
                        </div>

                        <Button
                            variant="contained"
                            size="small"
                            disabled={
                                seleccionadas ===
                                0
                            }
                            onClick={() =>
                                handleCambiarEstadoMasivo(
                                    5
                                )
                            }
                            startIcon={
                                <ReceiptLong />
                            }
                            className="gp-prefact-bill-button"
                        >
                            Facturar seleccionadas
                        </Button>
                    </div>
                </div>


                {/* TABLA */}

                <div className="gp-module-body gp-prefact-body">
                    <div className="gp-prefact-table-heading">
                        <div>
                            <h2>
                                Cotizaciones aprobadas
                            </h2>

                            <p>
                                Marca las casillas de
                                las cotizaciones que
                                deseas enviar a
                                facturación.
                            </p>
                        </div>

                        <span>
                            {
                                cotizacionesFiltradas.length
                            }{" "}
                            registros
                        </span>
                    </div>

                    <div className="gp-prefact-table-wrapper">
                        <MaterialReactTable
                            table={table}
                        />
                    </div>
                </div>
            </div>


            {/* =================================================
                AGREGAR COMENTARIO
               ================================================= */}

            <Dialog
                open={openModal}
                onClose={() =>
                    setOpenModal(false)
                }
                fullWidth
                maxWidth="sm"
                className="gp-prefact-dialog"
            >
                <DialogTitle>
                    <div className="gp-prefact-dialog-title">
                        <div className="gp-prefact-dialog-icon">
                            <Comment fontSize="small" />
                        </div>

                        <div>
                            <strong>
                                Agregar comentario
                            </strong>

                            <span>
                                Cotización{" "}
                                {selectedCotizacion
                                    ?.nocotizacion ||
                                    ""}
                            </span>
                        </div>
                    </div>
                </DialogTitle>

                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={
                            comentario
                        }
                        onChange={(e) =>
                            setComentario(
                                e.target.value
                            )
                        }
                        placeholder="Escribe el comentario..."
                        sx={{
                            mt: 1,
                        }}
                    />
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() =>
                            setOpenModal(
                                false
                            )
                        }
                    >
                        Cancelar
                    </Button>

                    <Button
                        variant="contained"
                        onClick={
                            guardarComentario
                        }
                        disabled={
                            !comentario.trim()
                        }
                    >
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>


            {/* =================================================
                COMENTARIOS
               ================================================= */}

            <Dialog
                open={
                    openComentarios
                }
                onClose={() =>
                    setOpenComentarios(
                        false
                    )
                }
                fullWidth
                maxWidth="md"
                className="gp-prefact-dialog"
            >
                <DialogTitle>
                    <div className="gp-prefact-dialog-title">
                        <div className="gp-prefact-dialog-icon">
                            <ChatBubbleOutline fontSize="small" />
                        </div>

                        <div>
                            <strong>
                                Comentarios
                            </strong>

                            <span>
                                Cotización{" "}
                                {selectedCotizacion
                                    ?.nocotizacion ||
                                    ""}
                            </span>
                        </div>
                    </div>
                </DialogTitle>

                <DialogContent dividers>
                    {comentariosPaginated
                        ?.data
                        ?.length >
                    0 ? (
                        <>
                            <div className="gp-prefact-comments-list">
                                {comentariosPaginated.data.map(
                                    (
                                        coment,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                index
                                            }
                                            className="gp-prefact-comment-card"
                                        >
                                            <div className="gp-prefact-comment-text">
                                                {
                                                    coment.comentario
                                                }
                                            </div>

                                            <div className="gp-prefact-comment-meta">
                                                <span>
                                                    Usuario:{" "}
                                                    <strong>
                                                        {coment.nombre_usuario ||
                                                            "—"}
                                                    </strong>
                                                </span>

                                                <span>
                                                    {new Date(
                                                        coment.fecha_registro
                                                    ).toLocaleString()}
                                                </span>

                                                <Chip
                                                    size="small"
                                                    label={`Estado ${coment.estado}`}
                                                />
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="gp-prefact-comments-pagination">
                                <Button
                                    variant="outlined"
                                    size="small"
                                    disabled={
                                        !comentariosPaginated
                                            .prev_page_url
                                    }
                                    onClick={() =>
                                        obtenerComentarios(
                                            page -
                                                1
                                        )
                                    }
                                >
                                    Anterior
                                </Button>

                                <span>
                                    Página{" "}
                                    {page}
                                </span>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    disabled={
                                        !comentariosPaginated
                                            .next_page_url
                                    }
                                    onClick={() =>
                                        obtenerComentarios(
                                            page +
                                                1
                                        )
                                    }
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="gp-prefact-empty-comments">
                            <ChatBubbleOutline />

                            <strong>
                                Sin comentarios
                            </strong>

                            <span>
                                Esta cotización
                                todavía no tiene
                                comentarios
                                registrados.
                            </span>
                        </div>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() =>
                            setOpenComentarios(
                                false
                            )
                        }
                    >
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>


            {/* =================================================
                SNACKBAR
               ================================================= */}

            <Snackbar
                open={
                    snackbar.open
                }
                autoHideDuration={
                    3000
                }
                onClose={() =>
                    setSnackbar(
                        (prev) => ({
                            ...prev,
                            open: false,
                        })
                    )
                }
                anchorOrigin={{
                    vertical:
                        "bottom",
                    horizontal:
                        "right",
                }}
            >
                <Alert
                    severity={
                        snackbar.severity
                    }
                    variant="filled"
                    onClose={() =>
                        setSnackbar(
                            (prev) => ({
                                ...prev,
                                open: false,
                            })
                        )
                    }
                >
                    {
                        snackbar.message
                    }
                </Alert>
            </Snackbar>
        </div>
    );
}

export default CotizacionesPreFacturacion;