import React, { useEffect, useState } from "react";
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Divider,
    Autocomplete,
} from "@mui/material";
import { Search, Download } from "lucide-react";
import Header from "../../Header";

const ReporteCuentasPorCobrar = () => {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const [fechaInicio, setFechaInicio] = useState(primerDiaMes.toISOString().split("T")[0]);
    const [fechaFinal, setFechaFinal] = useState(hoy.toISOString().split("T")[0]);
    const [clientes, setClientes] = useState([]);
    const [clienteSel, setClienteSel] = useState(null);
    const [saldo, setSaldo] = useState("PENDIENTES");

    const [data, setData] = useState({
        cuentas: [],
        totales: { cantidad: 0, saldoPendiente: 0, montoPagado: 0, montoOriginal: 0 },
    });
    const [loading, setLoading] = useState(false);
    const [seleccion, setSeleccion] = useState(null);
    const [detalles, setDetalles] = useState({ recibos: [], notas: [] });
    const [loadingDet, setLoadingDet] = useState(false);

    const token = localStorage.getItem("token");

    // 🔹 Cargar lista de clientes una sola vez
    useEffect(() => {
        const headers = { Authorization: `Bearer ${token}` };
        axios
            .get(`${import.meta.env.VITE_API_URL}/lista_clientes`, { headers })
            .then((res) => setClientes(res.data))
            .catch(() => alert("Error al cargar clientes"));
    }, []);

    // 🔹 Buscar cuentas
    const buscar = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/reporte/cxc`, {
                params: {
                    fechaInicio,
                    fechaFinal,
                    idcliente: clienteSel?.idcliente || undefined,
                    saldo,
                },
                headers: { Authorization: `Bearer ${token}` },
            });
            setData(res.data);
            setSeleccion(null);
            setDetalles({ recibos: [], notas: [] });
        } catch (e) {
            console.error(e);
            alert("Error al cargar CxC");
        } finally {
            setLoading(false);
        }
    };

    // 🔹 Exportar PDF
    const exportarPDF = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/reporte/cxc`, {
                params: {
                    fechaInicio,
                    fechaFinal,
                    idcliente: clienteSel?.idcliente || undefined,
                    saldo,
                    format: "pdf",
                },
                responseType: "blob",
                headers: { Authorization: `Bearer ${token}` },
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = `reporte_cxc_${fechaInicio}_a_${fechaFinal}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            console.error(e);
            alert("Error al exportar PDF");
        }
    };

    // 🔹 Cargar detalles
    const cargarDetalles = async (fila) => {
        setSeleccion(fila);
        setLoadingDet(true);
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/reporte/cxc/${fila.idcuentaporcobrar}/detalles`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setDetalles(res.data);
        } catch (e) {
            console.error(e);
            alert("Error al cargar detalles");
        } finally {
            setLoadingDet(false);
        }
    };

    const formatoMoneda = (valor) =>
        new Intl.NumberFormat("es-GT", {
            style: "currency",
            currency: "GTQ",
            minimumFractionDigits: 2,
        }).format(valor);

    useEffect(() => {
        buscar();
    }, []);

    return (
        <Box p={3}>
            <Header title="Reporte de Cuentas por Cobrar" />
            <br />

            {/* 🔹 Filtros */}
            <Box display="flex" gap={2} mb={2} flexWrap="wrap">
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

                {/* Autocomplete local de clientes */}
                <Autocomplete
                    options={clientes}
                    getOptionLabel={(opt) => opt.nombre || ""}
                    value={clienteSel}
                    onChange={(e, nuevo) => setClienteSel(nuevo)}
                    renderInput={(params) => (
                        <TextField {...params} label="Cliente" placeholder="Buscar cliente..." />
                    )}
                    sx={{ minWidth: 250 }}
                />

                <FormControl sx={{ minWidth: 180 }}>
                    <InputLabel>Saldo</InputLabel>
                    <Select
                        value={saldo}
                        label="Saldo"
                        onChange={(e) => setSaldo(e.target.value)}
                    >
                        <MenuItem value="PENDIENTES">Pendientes</MenuItem>
                        <MenuItem value="PAGADAS">Pagadas</MenuItem>
                        <MenuItem value="TODAS">Todas</MenuItem>
                    </Select>
                </FormControl>

                <Button variant="contained" startIcon={<Search />} onClick={buscar}>
                    Buscar
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<Download />}
                    onClick={exportarPDF}
                >
                    Exportar PDF
                </Button>
            </Box>

            {/* 🔹 Tabla principal */}
            {loading ? (
                <CircularProgress />
            ) : (
                <>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Cliente</TableCell>
                                    <TableCell>No. Cotización</TableCell>
                                    <TableCell>No. Interno</TableCell>
                                    <TableCell>No. Factura</TableCell>
                                    <TableCell>Emisión</TableCell>
                                    <TableCell>Vencimiento</TableCell>
                                    <TableCell align="right">Días Emisión</TableCell>
                                    <TableCell align="right">Días Vencidos</TableCell>
                                    <TableCell align="right">Monto Original</TableCell>
                                    <TableCell align="right">Pagado</TableCell>
                                    <TableCell align="right">Saldo Pendiente</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.cuentas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} align="center">
                                            Sin resultados
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.cuentas.map((r) => (
                                        <TableRow
                                            key={r.idcuentaporcobrar}
                                            hover
                                            selected={
                                                seleccion?.idcuentaporcobrar ===
                                                r.idcuentaporcobrar
                                            }
                                            onClick={() => cargarDetalles(r)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <TableCell>{r.cliente}</TableCell>
                                            <TableCell>{r.nocotizacion}</TableCell>
                                            <TableCell>{r.nointerno}</TableCell>
                                            <TableCell>{r.numero}</TableCell>
                                            <TableCell>{r.fecha_emision}</TableCell>
                                            <TableCell>{r.fecha_vencimiento}</TableCell>
                                            <TableCell align="right">{r.dias_desde_emision}</TableCell>
                                            <TableCell align="right">{r.dias_vencidos}</TableCell>
                                            <TableCell align="right">{formatoMoneda(r.monto_original)}</TableCell>
                                            <TableCell align="right">{formatoMoneda(r.monto_pagado)}</TableCell>
                                            <TableCell align="right">{formatoMoneda(r.monto_total_saldo_pendiente)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* 🔹 Totales */}
                    <Box mt={2}>
                        <Typography variant="subtitle1">
                            Totales — Registros:{" "}
                            <strong>{data.totales.cantidad}</strong>
                            &nbsp;|&nbsp; Original:{" "}
                            <strong>{formatoMoneda(data.totales.montoOriginal)}</strong>
                            &nbsp;|&nbsp; Pagado:{" "}
                            <strong>{formatoMoneda(data.totales.montoPagado)}</strong>
                            &nbsp;|&nbsp; Saldo:{" "}
                            <strong>{formatoMoneda(data.totales.saldoPendiente)}</strong>
                        </Typography>
                    </Box>

                    {/* 🔹 Detalles */}
                    {seleccion && (
                        <>
                            <Divider sx={{ my: 3 }} />
                            <Typography variant="subtitle1" gutterBottom>
                                Detalles de la CxC seleccionada (ID:{" "}
                                {seleccion.idcuentaporcobrar})
                            </Typography>

                            {loadingDet ? (
                                <CircularProgress />
                            ) : (
                                <Box
                                    display="grid"
                                    gap={2}
                                    gridTemplateColumns={{
                                        xs: "1fr",
                                        md: "1fr 1fr",
                                    }}
                                >
                                    {/* Recibos */}
                                    <TableContainer component={Paper}>
                                        <Typography variant="subtitle2" p={1}>
                                            Recibos / Retenciones
                                        </Typography>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Documento</TableCell>
                                                    <TableCell>Fecha</TableCell>
                                                    <TableCell>Método</TableCell>
                                                    <TableCell>Referencia</TableCell>
                                                    <TableCell>Tipo</TableCell>
                                                    <TableCell align="right">Recibido</TableCell>
                                                    <TableCell align="right">Aplicado</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {detalles.recibos.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={7} align="center">
                                                            Sin recibos
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    detalles.recibos.map((r, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{r.documento}</TableCell>
                                                            <TableCell>{r.fecha_recibo}</TableCell>
                                                            <TableCell>{r.metodo_pago}</TableCell>
                                                            <TableCell>{r.referencia}</TableCell>
                                                            <TableCell>{r.tipo}</TableCell>
                                                            <TableCell align="right">
                                                                {formatoMoneda(r.monto_recibido)}
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                {formatoMoneda(r.monto_aplicado)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>

                                    {/* Notas */}
                                    <TableContainer component={Paper}>
                                        <Typography variant="subtitle2" p={1}>
                                            Notas de Ajuste
                                        </Typography>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Documento</TableCell>
                                                    <TableCell>Fecha</TableCell>
                                                    <TableCell>Referencia</TableCell>
                                                    <TableCell>Tipo</TableCell>
                                                    <TableCell align="right">Monto Total</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {detalles.notas.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} align="center">
                                                            Sin notas
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    detalles.notas.map((n, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{n.documento}</TableCell>
                                                            <TableCell>{n.fecha_nota}</TableCell>
                                                            <TableCell>{n.referencia}</TableCell>
                                                            <TableCell>{n.tipo}</TableCell>
                                                            <TableCell align="right">
                                                                {formatoMoneda(n.monto_total)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}
                        </>
                    )}
                </>
            )}
        </Box>
    );
};

export default ReporteCuentasPorCobrar;
