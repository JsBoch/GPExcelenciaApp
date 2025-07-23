import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import CommentIcon from "@mui/icons-material/Comment";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ReceiptIcon from "@mui/icons-material/Receipt";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

function CotizacionesEstado4() {
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
    const [search, setSearch] = useState("");
    const [comentariosPaginated, setComentariosPaginated] = useState(null);
    const [page, setPage] = useState(1);
    const [rowSelection, setRowSelection] = useState({});

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
            accessorKey: "fecha_cotizacion",
            header: "Fecha",
            size: 100,
        },
        // {
        //   accessorKey: "estado",
        //   header: "Estado",
        //   size: 80,
        // },
        {
            accessorKey: "tipo_pago",
            header: "Tipo de Pago",
            size: 150,
        },
        {
            accessorKey: "total_general",
            header: "Total",
            size: 100,
            Cell: ({ cell }) =>
                parseFloat(cell.getValue()).toLocaleString("es-GT", {
                    style: "currency",
                    currency: "GTQ",
                }),
        },
        {
            accessorKey: "direccion_entrega",
            header: "Dirección Entrega",
            size: 250,
        },
        {
            accessorKey: "observaciones_cliente",
            header: "Observaciones",
            size: 250,
        },
        {
            accessorKey: "estado_texto",
            header: "Estado",
            size: 100,
        },
    ];

    const table = useMaterialReactTable({
        columns,
        data: cotizaciones,
        enableRowSelection: true,
        enableColumnFilters: true,
        enableGlobalFilter: true,
        enablePagination: true,
        muiTableContainerProps: { sx: { maxHeight: 600 } },
        state: { isLoading: loading, rowSelection }, // 👈 importante
        onRowSelectionChange: setRowSelection, // 👈 asignas directamente
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

    const obtenerComentarios = async (pageParam = 1, searchParam = "") => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const { data } = await axios.get(
                `${import.meta.env.VITE_API_URL}/cotizaciones-estado4/${
                    selectedCotizacion.idcotizacion
                }/comentarios`,
                {
                    headers,
                    params: { page: pageParam, search: searchParam },
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

    useEffect(() => {
        if (selectedCotizacion) obtenerComentarios(1, search);
    }, [search]);

    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
        <Button
            disabled={!comentariosPaginated?.prev_page_url}
            onClick={() => obtenerComentarios(page - 1, search)}
        >
            Anterior
        </Button>
        <Button
            disabled={!comentariosPaginated?.next_page_url}
            onClick={() => obtenerComentarios(page + 1, search)}
        >
            Siguiente
        </Button>
    </Box>;

    useEffect(() => {
        const selectedKey = Object.keys(rowSelection)[0];
        if (selectedKey !== undefined) {
            setSelectedCotizacion(cotizaciones[selectedKey]);
        } else {
            setSelectedCotizacion(null);
        }
    }, [rowSelection, cotizaciones]);

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

                    <Button
                        variant="outlined"
                        color="success"
                        disabled={!selectedCotizacion}
                        onClick={() =>
                            handleCambiarEstado(selectedCotizacion, 5)
                        }
                        startIcon={<ReceiptIcon />}
                    >
                        Facturar
                    </Button>
                </Box>

                <TextField
                    fullWidth
                    variant="outlined"
                    label="Buscar comentario"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ mb: 2 }}
                />

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
                                        obtenerComentarios(page - 1, search)
                                    }
                                >
                                    Anterior
                                </Button>
                                <Button
                                    disabled={
                                        !comentariosPaginated.next_page_url
                                    }
                                    onClick={() =>
                                        obtenerComentarios(page + 1, search)
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

export default CotizacionesEstado4;
