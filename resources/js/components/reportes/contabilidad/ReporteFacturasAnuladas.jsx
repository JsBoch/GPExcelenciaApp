import React, { useState } from "react";
import axios from "axios";
import {
    Box,
    Button,
    TextField,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    CircularProgress,
} from "@mui/material";
import { Download, Search } from "lucide-react";
import Header from "../../Header";

const ReporteFacturasAnuladas = () => {
    //const [fechaInicio, setFechaInicio] = useState("");
    //const [fechaFinal, setFechaFinal] = useState("");
    //const [data, setData] = useState([]);
    //const [loading, setLoading] = useState(false);

    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const [fechaInicio, setFechaInicio] = useState(
        primerDiaMes.toISOString().split("T")[0]
    );
    const [fechaFinal, setFechaFinal] = useState(
        hoy.toISOString().split("T")[0]
    );
    const [data, setData] = useState({
        registros: [],
        porUsuario: [],
        totalGeneral: 0,
    });
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem("token");

    const handleBuscar = async () => {
        if (!fechaInicio || !fechaFinal) {
            alert("Por favor selecciona ambas fechas");
            return;
        }
        setLoading(true);
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/reporte/anuladas`,
                {
                    params: { fechaInicio, fechaFinal },
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setData(res.data);
        } catch (error) {
            console.error("Error al obtener reporte:", error);
            alert("Error al cargar reporte.");
        } finally {
            setLoading(false);
        }
    };

    const handleExportarPDF = async () => {
        if (!fechaInicio || !fechaFinal) {
            alert("Por favor selecciona ambas fechas");
            return;
        }
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/reporte/anuladas`,
                {
                    params: { fechaInicio, fechaFinal, format: "pdf" },
                    responseType: "blob",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                `reporte_facturas_anuladas_${fechaInicio}_a_${fechaFinal}.pdf`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error al generar PDF:", error);
            alert("Error al exportar PDF.");
        }
    };

    return (
        <Box p={3}>
            <Header title="Reporte de facturas anuladas"/>
            <br/>
            <Box display="flex" gap={2} mb={2}>
                <TextField
                    label="Fecha Inicio"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label="Fecha Final"
                    type="date"
                    value={fechaFinal}
                    onChange={(e) => setFechaFinal(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Search />}
                    onClick={handleBuscar}
                >
                    Buscar
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<Download />}
                    onClick={handleExportarPDF}
                >
                    Exportar PDF
                </Button>
            </Box>

            {loading ? (
                <CircularProgress />
            ) : (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>No. Cotización</TableCell>
                                <TableCell>Cliente</TableCell>
                                <TableCell>No. Interno</TableCell>
                                <TableCell>No. Factura</TableCell>
                                <TableCell>UUID</TableCell>
                                <TableCell>Fecha Certificación</TableCell>
                                <TableCell>Fecha Anulación</TableCell>
                                <TableCell>Usuario Anulación</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.registros.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        No hay registros
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.registros.map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{r.nocotizacion}</TableCell>
                                        <TableCell>{r.cliente}</TableCell>
                                        <TableCell>{r.nointerno}</TableCell>
                                        <TableCell>{r.numero}</TableCell>
                                        <TableCell>{r.uuid}</TableCell>
                                        <TableCell>
                                            {r.fecha_certificacion}
                                        </TableCell>
                                        <TableCell>
                                            {r.fecha_anulacion}
                                        </TableCell>
                                        <TableCell>
                                            {r.usuario_anulacion}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {data.porUsuario.length > 0 && (
                        <Box mt={3}>
                            <Typography variant="subtitle1" gutterBottom>
                                Resumen por usuario
                            </Typography>
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Usuario</TableCell>
                                            <TableCell align="center">
                                                Total Anuladas
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.porUsuario.map((u, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    {u.usuario}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {u.total}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow>
                                            <TableCell>
                                                <strong>Total General</strong>
                                            </TableCell>
                                            <TableCell align="center">
                                                <strong>
                                                    {data.totalGeneral}
                                                </strong>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </TableContainer>
            )}
        </Box>
    );
};

export default ReporteFacturasAnuladas;
