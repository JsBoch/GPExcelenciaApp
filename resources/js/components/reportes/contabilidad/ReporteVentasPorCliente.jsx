import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
    Box,
    Button,
    TextField,
    MenuItem,
    CircularProgress,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Snackbar,
    Alert,
} from "@mui/material";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    CartesianGrid,
    Cell,
} from "recharts";
import Header from "../../Header";

const ReporteVentasPorCliente = () => {
    const [vendedores, setVendedores] = useState([]);
    const [filtros, setFiltros] = useState({
        desde: new Date().toISOString().slice(0, 10),
        hasta: new Date().toISOString().slice(0, 10),
        vendedor_id: "",
    });
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    const authHeaders = () => {
        const token = localStorage.getItem("token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    useEffect(() => {
        axios
            .get("/api/reportes-contabilidad/vendedores", {
                headers: authHeaders(),
            })
            .then((res) => setVendedores(res.data || []))
            .catch(() => setVendedores([]));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFiltros((f) => ({ ...f, [name]: value }));
    };

    const handleBuscar = async () => {
        if (!filtros.desde || !filtros.hasta) {
            alert("Seleccione las fechas");
            return;
        }
        setLoading(true);
        try {
            const params = {
                desde: filtros.desde,
                hasta: filtros.hasta,
                ...(filtros.vendedor_id && { vendedor_id: filtros.vendedor_id }),
            };
            const resp = await axios.get(
                "/api/reportes-contabilidad/cotizacionesventas",
                { headers: authHeaders(), params }
            );
            setReportData(resp.data);
        } catch (err) {
            console.error("Error en buscar:", err);
            alert("No se pudo cargar el reporte");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (tipo) => {
        if (!filtros.desde || !filtros.hasta) {
            alert("Seleccione las fechas");
            return;
        }

        setExporting(true);
        const endpoint =
            tipo === "excel"
                ? "/api/reportes-contabilidad/export/excelventas"
                : "/api/reportes-contabilidad/export/pdfventas";

        const params = {
            desde: filtros.desde,
            hasta: filtros.hasta,
            ...(filtros.vendedor_id && { vendedor_id: filtros.vendedor_id }),
        };

        try {
            const response = await axios.get(endpoint, {
                headers: authHeaders(),
                params,
                responseType: "blob",
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                tipo === "excel"
                    ? "ventas_por_cliente.xlsx"
                    : "ventas_por_cliente.pdf"
            );
            document.body.appendChild(link);
            link.click();
            link.remove();

            setSnackbar({
                open: true,
                message:
                    tipo === "excel"
                        ? "Archivo Excel generado exitosamente"
                        : "Archivo PDF generado exitosamente",
                severity: "success",
            });
        } catch (error) {
            console.error("Error exportando:", error);
            setSnackbar({
                open: true,
                message: "Error al generar el archivo",
                severity: "error",
            });
        } finally {
            setExporting(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const vendedoresAgrupados = useMemo(() => {
        if (!reportData) return [];
        return reportData.data.map((v) => ({
            vendedor_nombre: v.vendedor_nombre,
            total_por_vendedor: v.total_por_vendedor,
            clientes: [...v.clientes].sort(
                (a, b) => b.total_ventas - a.total_ventas
            ),
        }));
    }, [reportData]);

    const palette = [
        "#F44336", "#E91E63", "#9C27B0", "#673AB7",
        "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4",
        "#009688", "#4CAF50", "#8BC34A", "#CDDC39",
        "#FFC107", "#FF9800", "#FF5722", "#795548",
        "#607D8B", "#9E9E9E"
    ];

    return (
        <Box p={2}>
            <Header title="Reporte de Cotizaciones (Prefacturación)" />
            {/* <Typography variant="h5" gutterBottom>
                Reporte de Ventas por Cliente
            </Typography> */}

            {/* FILTROS */}
            <Box
                mb={2}
                display="flex"
                gap={2}
                alignItems="center"
                flexWrap="wrap"
            >
                <TextField
                    type="date"
                    name="desde"
                    label="Desde"
                    InputLabelProps={{ shrink: true }}
                    value={filtros.desde}
                    onChange={handleChange}
                />
                <TextField
                    type="date"
                    name="hasta"
                    label="Hasta"
                    InputLabelProps={{ shrink: true }}
                    value={filtros.hasta}
                    onChange={handleChange}
                />
                <TextField
                    select
                    name="vendedor_id"
                    label="Vendedor"
                    value={filtros.vendedor_id}
                    onChange={handleChange}
                    style={{ width: 200 }}
                >
                    <MenuItem value="">Todos</MenuItem>
                    {vendedores.map((v) => (
                        <MenuItem key={v.id_empleado} value={v.id_empleado}>
                            {v.nombre}
                        </MenuItem>
                    ))}
                </TextField>

                <Button
                    variant="contained"
                    onClick={handleBuscar}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={20} /> : "Ver Reporte"}
                </Button>

                {reportData && (
                    <>
                        <Button
                            variant="outlined"
                            onClick={() => handleExport("excel")}
                            disabled={exporting}
                        >
                            {exporting ? (
                                <CircularProgress size={18} />
                            ) : (
                                "Exportar Excel"
                            )}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => handleExport("pdf")}
                            disabled={exporting}
                        >
                            {exporting ? (
                                <CircularProgress size={18} />
                            ) : (
                                "Exportar PDF"
                            )}
                        </Button>
                    </>
                )}
            </Box>

            {/* TABLAS Y GRÁFICAS */}
            {reportData && (
                <>
                    {vendedoresAgrupados.map((v, index) => (
                        <Box key={index} mb={4}>
                            <Typography
                                variant="h6"
                                sx={{ mt: 2, mb: 1, color: "#1565c0", fontWeight: "bold" }}
                            >
                                {v.vendedor_nombre}
                            </Typography>

                            {/* Tabla por vendedor */}
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell><strong>Código Cliente</strong></TableCell>
                                            <TableCell><strong>Nombre Cliente</strong></TableCell>
                                            <TableCell align="right"><strong>Total Ventas</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {v.clientes.map((c, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{c.codigo}</TableCell>
                                                <TableCell>{c.nombre}</TableCell>
                                                <TableCell align="right">
                                                    {Number(c.total_ventas).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
                                            <TableCell colSpan={2}>SUBTOTAL {v.vendedor_nombre}</TableCell>
                                            <TableCell align="right">
                                                {Number(v.total_por_vendedor).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Gráfica multicolor */}
                            <Box height={400} mt={2}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={v.clientes}
                                        layout="vertical"
                                        margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            type="number"
                                            tickFormatter={(value) => Number(value).toLocaleString()}
                                        />
                                        <YAxis type="category" dataKey="nombre" width={280} />
                                        <Tooltip
                                            formatter={(value) =>
                                                Number(value).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                            }
                                        />
                                        <Legend />
                                        <Bar dataKey="total_ventas" name="Total Ventas">
                                            {v.clientes.map((_, idx) => (
                                                <Cell key={`cell-${idx}`} fill={palette[idx % palette.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </Box>
                    ))}

                    {/* TOTAL GENERAL */}
                    <TableContainer component={Paper}>
                        <Table>
                            <TableBody>
                                <TableRow style={{ backgroundColor: "#e0e0e0", fontWeight: "bold" }}>
                                    <TableCell colSpan={2}>TOTAL GENERAL</TableCell>
                                    <TableCell align="right">
                                        {Number(reportData.total_general).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ReporteVentasPorCliente;
