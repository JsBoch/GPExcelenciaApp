import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import {
    MaterialReactTable,
    useMaterialReactTable,
} from "material-react-table";
import axios from "axios";
import Header from "./Header";
import alertify from "alertifyjs";
import { useNavigate } from "react-router-dom";

const RecibosConsulta = () => {
    //const today = new Date().toISOString().split("T")[0];
    const [recibos, setRecibos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rowSelection, setRowSelection] = useState({});
    const [selectedRecibo, setSelectedRecibo] = useState(null);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [clienteFiltro, setClienteFiltro] = useState("");
    const [clientes, setClientes] = useState([]);
    const [pdfUrl, setPdfUrl] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setFechaInicio(res.data.fecha);
                setFechaFin(res.data.fecha);
            })
            .catch(() => {
                // fallback por si falla
                const today = new Date().toISOString().split("T")[0];
                setFechaInicio(today);
                setFechaFin(today);
            });
    }, []);

    const fetchRecibos = async () => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const params = {};
            if (fechaInicio) params.fecha_inicio = fechaInicio;
            if (fechaFin) params.fecha_fin = fechaFin;
            if (clienteFiltro) params.cliente = clienteFiltro;

            const { data } = await axios.get(
                `${import.meta.env.VITE_API_URL}/recibos`,
                {
                    headers,
                    params,
                }
            );
            setRecibos(data);
        } catch (error) {
            alertify.error("Error al cargar recibos");
        } finally {
            setLoading(false);
        }
    };

    // useEffect(() => {
    //     fetchRecibos();
    // }, [fechaInicio, fechaFin, clienteFiltro]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        axios
            .get(`${import.meta.env.VITE_API_URL}/clientes`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setClientes(res.data));
    }, []);

    useEffect(() => {
        const selectedKey = Object.keys(rowSelection)[0];
        if (selectedKey !== undefined) {
            setSelectedRecibo(recibos[selectedKey]);
        } else {
            setSelectedRecibo(null);
        }
    }, [rowSelection, recibos]);

    const columns = [
        {
            accessorKey: "idrecibo",
            header: "Recibo No.",
            size: 80,
        },
        // {
        //     accessorKey: "idcliente",
        //     header: "Cliente",
        //     size: 120,
        // },
        {
            accessorFn: (row) => row.cliente?.nombre || "Sin nombre",
            id: "cliente_nombre",
            header: "Cliente",
            size: 150,
        },
        {
            accessorKey: "idcuentaporcobrar",
            header: "Cuenta CxC",
            size: 100,
        },
        {
            accessorKey: "fecha_recibo",
            header: "Fecha",
            size: 100,
        },
        {
            accessorKey: "monto_recibido",
            header: "Monto",
            Cell: ({ cell }) =>
                parseFloat(cell.getValue()).toLocaleString("es-GT", {
                    style: "currency",
                    currency: "GTQ",
                }),
        },
        {
            accessorKey: "metodo_pago",
            header: "Pago",
            size: 100,
        },
        {
            accessorKey: "referencia",
            header: "Ref.",
        },
    ];

    const table = useMaterialReactTable({
        columns,
        data: recibos,
        enableRowSelection: true,
        enablePagination: true,
        enableColumnFilters: true,
        enableGlobalFilter: true,
        state: { isLoading: loading, rowSelection },
        onRowSelectionChange: setRowSelection,
        muiTableContainerProps: { sx: { maxHeight: 600 } },
    });

    // const handleGenerarPdf = () => {
    //     if (!selectedRecibo) {
    //         alertify.error("Selecciona un recibo");
    //         return;
    //     }

    //     const token = localStorage.getItem("token");
    //     const url = `${import.meta.env.VITE_API_URL}/recibos/${
    //         selectedRecibo.idrecibo
    //     }/pdf`;
    //     window.open(url, "_blank");
    // };
    const handleGenerarPdf = async () => {
        const token = localStorage.getItem("token");

        const params = new URLSearchParams();
        if (fechaInicio) params.append("fecha_inicio", fechaInicio);
        if (fechaFin) params.append("fecha_fin", fechaFin);

        try {
            const response = await fetch(
                `${
                    import.meta.env.VITE_API_URL
                }/recibos-reporte/pdf?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Error al generar PDF");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (error) {
            alertify.error("No se pudo generar el PDF");
        }
    };

    const handleEliminarRecibo = () => {
        if (!selectedRecibo) {
            alertify.error("Selecciona un recibo para eliminar");
            return;
        }

        alertify.confirm(
            "¿Estás seguro?",
            "Esta acción desactivará el recibo permanentemente.",
            () => {
                const token = localStorage.getItem("token");
                axios
                    .put(
                        `${import.meta.env.VITE_API_URL}/recibos/desactivar/${
                            selectedRecibo.idrecibo
                        }`,
                        {},
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    )
                    .then(() => {
                        alertify.success("Recibo eliminado");
                        setLoading(true);
                        fetchRecibos(); // recargar la tabla
                        setRowSelection({});
                    })
                    .catch((error) => {
                        console.error("Error al eliminar recibo:", error);
                        alertify.error("Error al eliminar el recibo");
                    });
            },
            () => {
                alertify.error("Cancelado");
            }
        );
    };

    return (
        <Box sx={{ p: 2 }}>
            <Header title="Consulta de Recibos" />
            <Paper elevation={3} sx={{ mt: 2, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Recibos Registrados
                </Typography>
                <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
                    <TextField
                        label="Fecha inicio"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                    />
                    <TextField
                        label="Fecha fin"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                    />
                    <FormControl fullWidth>
                        <InputLabel>Cliente</InputLabel>
                        <Select
                            label="Cliente"
                            value={clienteFiltro}
                            onChange={(e) => setClienteFiltro(e.target.value)}
                        >
                            <MenuItem value="">Todos</MenuItem>
                            {clientes.map((cl) => (
                                <MenuItem
                                    key={cl.idcliente}
                                    value={cl.idcliente}
                                >
                                    {cl.nombre}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={fetchRecibos}
                        disabled={loading}
                    >
                        Consultar
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleGenerarPdf}
                        // disabled={!selectedRecibo}
                        startIcon={<PictureAsPdfIcon />}
                        disabled={loading}
                    >
                        Generar PDF
                    </Button>
                    <Button
                        variant="contained"
                        color="warning"
                        disabled={!selectedRecibo || loading}
                        onClick={() =>
                            navigate(
                                `/recibos/editar/${selectedRecibo.idrecibo}`
                            )
                        }
                    >
                        Editar
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={!selectedRecibo}
                        onClick={handleEliminarRecibo}
                    >
                        Eliminar
                    </Button>
                </Box>
                <MaterialReactTable table={table} />
            </Paper>
            <Dialog
                open={!!pdfUrl}
                onClose={() => setPdfUrl(null)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>Reporte de Recibos</DialogTitle>
                <DialogContent dividers style={{ height: "80vh" }}>
                    <iframe
                        src={pdfUrl}
                        width="100%"
                        height="100%"
                        style={{ border: "none" }}
                        title="PDF Reporte"
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            const now = new Date();
                            const timestamp = now
                                .toISOString()
                                .replace(/[:T]/g, "-")
                                .split(".")[0]; // yyyy-mm-dd-hh-mm-ss

                            const link = document.createElement("a");
                            link.href = pdfUrl;
                            link.download = `reporte_recibos_${timestamp}.pdf`;
                            link.click();
                        }}
                        color="success"
                        variant="outlined"
                    >
                        Descargar PDF
                    </Button>
                    <Button onClick={() => setPdfUrl(null)} color="primary">
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RecibosConsulta;
