import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Header from "./Header";
import {
    MaterialReactTable,
    useMaterialReactTable,
} from "material-react-table";
import {
    Box,
    Typography,
    Paper,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Snackbar,
    Alert,
    Chip,
    Tooltip,
} from "@mui/material";
import CommentIcon from "@mui/icons-material/Comment";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ReceiptIcon from "@mui/icons-material/Receipt";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

// Convierte "2025-08-13T06:00:00.000000Z" o "2025-08-13" -> "13/08/2025"
const fmtDMY = (value) => {
    if (!value) return "";
    const s = String(value).trim();

    // Si viene como "YYYY-MM-DD..." (con o sin hora), uso los primeros 10 chars para evitar desfases por TZ
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;

    // Fallback: parseo con Date
    const d = new Date(s.includes(" ") ? s.replace(" ", "T") : s);
    if (!isNaN(d)) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
    }
    return s; // si todo falla, deja el valor tal cual
};

function CotizacionesPreFacturacion() {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedCotizacion, setSelectedCotizacion] = useState(null);
    const [comentario, setComentario] = useState("");
    const [openModal, setOpenModal] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success",
    });
    const [openComentarios, setOpenComentarios] = useState(false);
    const [comentarios, setComentarios] = useState([]);
    //const [search, setSearch] = useState("");
    const [filtroNo, setFiltroNo] = useState("");
    const [comentariosPaginated, setComentariosPaginated] = useState(null);
    const [page, setPage] = useState(1);
    const [rowSelection, setRowSelection] = useState({});

    // Filtra por No. Cotización (acepta "CT123" o "123")
    const cotizacionesFiltradas = useMemo(() => {
        if (!filtroNo.trim()) return cotizaciones;

        const needle = filtroNo.trim().toLowerCase();
        const needleNum = needle.replace(/^ct/i, "").replace(/\D/g, ""); // solo dígitos

        return cotizaciones.filter((c) => {
            const no = String(c.nocotizacion || "").toLowerCase(); // p.ej. "ct123"
            const noNum = no.replace(/^ct/i, "").replace(/\D/g, "");

            return (
                no.includes(needle) ||
                (!!needleNum && noNum.includes(needleNum))
            );
        });
    }, [cotizaciones, filtroNo]);

    const fetchCotizaciones = async () => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const { data } = await axios.get(
                `${import.meta.env.VITE_API_URL}/cotizaciones-estado4`,
                { headers }
            );
            setCotizaciones(data);
            setLoading(false);
        } catch (error) {
            console.error("Error cargando cotizaciones:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCotizaciones();
    }, []);

    const columns = [
        {
            accessorKey: "nocotizacion",
            header: "No. Cotización",
            size: 120,
        },
        {
            accessorKey: "fecha_prefacturacion",
            header: "Fecha",
            size: 110,
            Cell: ({ cell }) => fmtDMY(cell.getValue()),
            // (opcional) para ordenar por fecha real aunque muestres texto:
            sortingFn: (rowA, rowB, columnId) => {
                const a = rowA.getValue(columnId);
                const b = rowB.getValue(columnId);
                const da = new Date(a);
                const db = new Date(b);
                return da - db;
            },
        },
        // {
        //   accessorKey: "estado",
        //   header: "Estado",
        //   size: 80,
        // },
        {
            accessorKey: "cliente",
            header: "Cliente",
        },
        // {
        //     accessorKey: "tipo_pago",
        //     header: "Tipo de Pago",
        //     size: 150,
        // },
        {
            accessorKey: "total",
            header: "Total",
            size: 100,
            Cell: ({ cell }) =>
                parseFloat(cell.getValue()).toLocaleString("es-GT", {
                    style: "currency",
                    currency: "GTQ",
                }),
        },
        // {
        //     accessorKey: "direccion_entrega",
        //     header: "Dirección Entrega",
        //     size: 250,
        // },
        // {
        //     accessorKey: "observaciones_cliente",
        //     header: "Observaciones",
        //     size: 250,
        // },
        // {
        //     accessorKey: "estado_texto",
        //     header: "Estado",
        //     size: 100,
        // },
        {
            accessorKey: "comentarios_count",
            header: "💬",
            size: 60,
            enableSorting: false,
            enableColumnFilter: false,
            Cell: ({ cell, row }) => {
                const cnt = Number(cell.getValue() || 0);
                if (!cnt) return null; // deja vacío cuando no hay mensajes
                return (
                    <Tooltip title="Ver comentarios">
                        <Chip
                            size="small"
                            color="info"
                            label={cnt}
                            sx={{ cursor: "pointer" }}
                            onClick={() => {
                                // permite abrir directo el modal de comentarios desde el chip
                                setSelectedCotizacion(row.original);
                                obtenerComentarios(1, "");
                            }}
                        />
                    </Tooltip>
                );
            },
        },
    ];

    // const table = useMaterialReactTable({
    //     columns,
    //     data: cotizaciones,
    //     enableRowSelection: true,
    //     enableColumnFilters: true,
    //     enableGlobalFilter: true,
    //     enablePagination: true,
    //     muiTableContainerProps: { sx: { maxHeight: 600 } },
    //     state: { isLoading: loading, rowSelection }, // 👈 importante
    //     onRowSelectionChange: setRowSelection, // 👈 asignas directamente
    // });
    const table = useMaterialReactTable({
        columns,
        data: cotizacionesFiltradas,
        enableRowSelection: true,
        enableColumnFilters: false,
        enableGlobalFilter: false,
        enablePagination: true,
        muiTableContainerProps: { sx: { maxHeight: 600 } },
        state: { isLoading: loading, rowSelection },
        onRowSelectionChange: setRowSelection,
    });

    <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
    >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
    </Snackbar>;

    const guardarComentario = async () => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        try {
            await axios.post(
                `${
                    import.meta.env.VITE_API_URL
                }/cotizaciones-estado4/agregar-comentario`,
                {
                    idcotizacion: selectedCotizacion.idcotizacion,
                    comentario,
                },
                { headers }
            );

            setSnackbar({
                open: true,
                message: "Comentario guardado",
                severity: "success",
            });
            setComentario("");
            setOpenModal(false);
        } catch (error) {
            console.error("Error al guardar comentario:", error);
            setSnackbar({
                open: true,
                message: "Error al guardar",
                severity: "error",
            });
        }
    };

    const obtenerComentarios = async (pageParam = 1) => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const { data } = await axios.get(
                `${import.meta.env.VITE_API_URL}/cotizaciones-estado4/${
                    selectedCotizacion.idcotizacion
                }/comentarios`,
                {
                    headers,
                    params: { page: pageParam},
                }
            );
            setComentariosPaginated(data);
            setPage(pageParam);
            setOpenComentarios(true);
        } catch (error) {
            console.error("Error al obtener comentarios:", error);
            setSnackbar({
                open: true,
                message: "Error al obtener comentarios",
                severity: "error",
            });
        }
    };

    // useEffect(() => {
    //     if (selectedCotizacion) obtenerComentarios(1, search);
    // }, [search]);

    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
        <Button
            disabled={!comentariosPaginated?.prev_page_url}
            onClick={() => obtenerComentarios(page - 1)}
        >
            Anterior
        </Button>
        <Button
            disabled={!comentariosPaginated?.next_page_url}
            onClick={() => obtenerComentarios(page + 1)}
        >
            Siguiente
        </Button>
    </Box>;

    useEffect(() => {
        const rows = table.getSelectedRowModel().flatRows;
        setSelectedCotizacion(rows.length ? rows[0].original : null);
    }, [rowSelection, table]);

    const handleCambiarEstado = (cotizacion, estado) => {
        // if (!cotizacion) {
        //     alertify.alert(
        //         "Error",
        //         "No se encontró la cotización seleccionada."
        //     );
        //     return;
        // }
        const id = cotizacion?.idcotizacion;
        if (!cotizacion || !id) {
            alertify.alert(
                "Error",
                "No se encontró la cotización seleccionada."
            );
            return;
        }

        const token = localStorage.getItem("token");
        if (token) {
            axios
                .put(
                    `/api/cotizaciones/activarfacturacion/${id}`,
                    {
                        estado: estado,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )
                .then((response) => {
                    alertify.success(response.data.message);
                    fetchCotizaciones();
                })
                .catch((error) => {
                    console.error("Error al cambiar estado:", error);
                    error.response?.data?.message ||
                        "Ocurrió un error al actualizar la cotización.";
                });
        }
    };

    const handleCambiarEstadoMasivo = async (estado) => {
        const ids = table
            .getSelectedRowModel()
            .flatRows.map((r) => r.original?.idcotizacion)
            .filter((v) => Number.isInteger(Number(v)))
            .map((v) => Number(v));

        if (!ids.length) {
            alertify.alert("Atención", "No hay filas válidas seleccionadas.");
            return;
        }

        alertify.confirm(
            "Confirmar",
            `¿Enviar ${ids.length} cotización(es) a estado ${estado} (PARA FACTURAR)?`,
            async () => {
                try {
                    const token = localStorage.getItem("token");
                    const { data } = await axios.put(
                        `${
                            import.meta.env.VITE_API_URL
                        }/cotizaciones/activarfacturacion/masivo`,
                        { ids, estado },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    const { total, actualizadas, ignoradas, no_encontradas } =
                        data;
                    alertify.success(
                        `Procesadas: ${total}. Actualizadas: ${actualizadas}. Omitidas: ${ignoradas}.` +
                            (no_encontradas?.length
                                ? ` No encontradas: ${no_encontradas.join(
                                      ", "
                                  )}`
                                : "")
                    );
                    setRowSelection({});
                    await fetchCotizaciones();
                } catch (err) {
                    console.error(err);
                    alertify.error(
                        err.response?.data?.message ||
                            "Error al actualizar en lote."
                    );
                }
            },
            () => {}
        );
    };

    return (
        <Box sx={{ p: 2 }}>
            <Header title="Cotizaciones Aprobadas" />
            <Paper elevation={3} sx={{ mt: 2, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Lista de Cotizaciones en Pre-Facturación
                </Typography>

                <Box
                    sx={{
                        mb: 2,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                    }}
                >
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!selectedCotizacion}
                        onClick={() => setOpenModal(true)}
                        startIcon={<CommentIcon />}
                    >
                        Agregar Comentario
                    </Button>

                    <Button
                        variant="outlined"
                        color="secondary"
                        disabled={!selectedCotizacion}
                        onClick={() => obtenerComentarios()}
                        startIcon={<VisibilityIcon />}
                    >
                        Ver Comentarios
                    </Button>

                    {/* <Button
                        variant="outlined"
                        color="success"
                        disabled={!selectedCotizacion}
                        onClick={() =>
                            handleCambiarEstado(selectedCotizacion, 5)
                        }
                        startIcon={<ReceiptIcon />}
                    >
                        Facturar
                    </Button> */}
                    <Button
                        variant="contained"
                        color="success"
                        disabled={table.getSelectedRowModel().rows.length === 0}
                        onClick={() => handleCambiarEstadoMasivo(5)}
                        startIcon={<ReceiptIcon />}
                    >
                        Facturar seleccionadas
                    </Button>
                </Box>

                <TextField
                    fullWidth
                    variant="outlined"
                    label="Buscar por No. Cotización (CT123 o 123)"
                    value={filtroNo}
                    onChange={(e) => setFiltroNo(e.target.value)}
                    sx={{ mb: 2 }}
                />
                <Typography variant="body2" sx={{ mb: 1 }}>
                    Seleccionadas: {table.getSelectedRowModel().rows.length}
                </Typography>
                <MaterialReactTable table={table} />
            </Paper>
            <Dialog
                open={openModal}
                onClose={() => setOpenModal(false)}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>Agregar Comentario</DialogTitle>
                <DialogContent>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        Cotización: {selectedCotizacion?.nocotizacion}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Comentario"
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenModal(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => guardarComentario()}
                        disabled={!comentario.trim()}
                    >
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={openComentarios}
                onClose={() => setOpenComentarios(false)}
                fullWidth
            >
                <DialogTitle>
                    Comentarios - Cotización {selectedCotizacion?.nocotizacion}
                </DialogTitle>
                <DialogContent dividers>
                    {comentariosPaginated?.data?.length > 0 ? (
                        <>
                            {comentariosPaginated.data.map((coment, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        mb: 2,
                                        p: 2,
                                        border: "1px solid #ddd",
                                        borderRadius: 1,
                                    }}
                                >
                                    <Typography variant="body1" sx={{ mb: 1 }}>
                                        {coment.comentario}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Usuario: {coment.nombre_usuario} <br />
                                        Fecha:{" "}
                                        {new Date(
                                            coment.fecha_registro
                                        ).toLocaleString()}{" "}
                                        — Estado: {coment.estado}
                                    </Typography>
                                </Box>
                            ))}
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    mt: 2,
                                }}
                            >
                                <Button
                                    disabled={
                                        !comentariosPaginated.prev_page_url
                                    }
                                    onClick={() =>
                                        obtenerComentarios(page - 1)
                                    }
                                >
                                    Anterior
                                </Button>
                                <Button
                                    disabled={
                                        !comentariosPaginated.next_page_url
                                    }
                                    onClick={() =>
                                        obtenerComentarios(page + 1)
                                    }
                                >
                                    Siguiente
                                </Button>
                            </Box>
                        </>
                    ) : (
                        <Typography variant="body2">
                            No hay comentarios registrados.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenComentarios(false)}>
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default CotizacionesPreFacturacion;
