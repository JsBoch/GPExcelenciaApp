/**
 * Este componente muestra el listado de cotizaciones filtradas por fecha y vendedor.
 * Permite seleccionar un rango de fechas y un vendedor específico para generar un reporte.
 */
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Pagination,
} from "@mui/material";

const estados = [
    { value: "", label: "Todos" },
    { value: 1, label: "Registro" },
    { value: 2, label: "Para costeo" },
    { value: 3, label: "Costeada" },
    { value: 4, label: "Pre‑facturación" },
    { value: 5, label: "Para facturar" },
    { value: 6, label: "Facturada" },
    { value: 7, label: "Anulada" },
    { value: 8, label: "Rechazada" },
];

import Header from "./Header";

const CotizacionesConsultaContabilidad = () => {
    const [data, setData] = useState({
        data: [],
        total: 0,
        per_page: 10,
        current_page: 1,
    });
    const [vendedores, setVendedores] = useState([]);
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [vendedorId, setVendedorId] = useState("");
    const [estado, setEstado] = useState("");
    const [search, setSearch] = useState("");

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, { headers })
            .then((res) => {
                setDesde(res.data.fecha);
                setHasta(res.data.fecha);
            });

        axios
            .get(
                `${
                    import.meta.env.VITE_API_URL
                }/reportes-contabilidad/vendedores`,
                { headers }
            )
            .then((res) => setVendedores(res.data));
    }, []);

    const fetchData = (page = 1) => {
        axios
            .get(
                `${
                    import.meta.env.VITE_API_URL
                }/reportes-contabilidad/cotizaciones`,
                {
                    headers,
                    params: {
                        desde,
                        hasta,
                        vendedor_id: vendedorId,
                        estado,
                        search,
                        page,
                        per_page: data.per_page,
                    },
                }
            )
            .then((res) => setData(res.data));
    };

    const handlePage = (_, value) => fetchData(value);

    const exportExcel = () => {
        axios
            .get(
                `${
                    import.meta.env.VITE_API_URL
                }/reportes-contabilidad/export/excel`,
                {
                    headers,
                    params: {
                        desde,
                        hasta,
                        vendedor_id: vendedorId,
                        estado,
                        search,
                    },
                    responseType: "blob",
                }
            )
            .then((res) => {
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", "cotizaciones.xlsx");
                document.body.appendChild(link);
                link.click();
            });
    };

    // const exportPdf = () => {
    //   axios.get(`${import.meta.env.VITE_API_URL}/reportes-contabilidad/export/pdf`, {
    //     headers, params: { desde, hasta, vendedor_id: vendedorId, estado, search }, responseType: 'blob'
    //   }).then(res => {
    //     const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    //     const link = document.createElement('a');
    //     link.href = url; link.setAttribute('download','cotizaciones.pdf');
    //     document.body.appendChild(link); link.click();
    //   });
    // };
    const exportPdf = async () => {
        try {
            const res = await axios.get(
                `${
                    import.meta.env.VITE_API_URL
                }/reportes-contabilidad/export/pdf`,
                {
                    headers,
                    params: {
                        desde,
                        hasta,
                        vendedor_id: vendedorId,
                        estado,
                        search,
                    },
                    responseType: "blob",
                }
            );
            const url = URL.createObjectURL(
                new Blob([res.data], { type: "application/pdf" })
            );
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "cotizaciones.pdf");
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            const blob = err?.response?.data;
            if (blob && blob.type?.includes("application/json")) {
                const text = await blob.text();
                try {s
                    const json = JSON.parse(text);
                    console.error(json);
                    alert(json.message || "Error generando PDF");
                } catch {
                    console.error(text);
                    alert("Error generando PDF");
                }
            } else {
                console.error(err);
                alert("Error generando PDF");
            }
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Header title="Lista de Cotizaciones" />
            <Box
                sx={{ display: "flex", gap: 2, mb: 2, mt: 6, flexWrap: "wrap" }}
            >
                <TextField
                    label="Desde"
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label="Hasta"
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Vendedor</InputLabel>
                    <Select
                        value={vendedorId}
                        onChange={(e) => setVendedorId(e.target.value)}
                        label="Vendedor"
                    >
                        <MenuItem value="">Todos</MenuItem>
                        {vendedores.map((v) => (
                            <MenuItem key={v.id_empleado} value={v.id_empleado}>
                                {v.nombre}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Estado</InputLabel>
                    <Select
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                        label="Estado"
                    >
                        {estados.map((s) => (
                            <MenuItem key={s.value} value={s.value}>
                                {s.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <TextField
                    label="Buscar"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="n° cotización o cliente"
                />
                <Button variant="contained" onClick={() => fetchData(1)}>
                    Buscar
                </Button>
                <Button variant="outlined" onClick={exportExcel}>
                    Exportar Excel
                </Button>
                <Button variant="outlined" onClick={exportPdf}>
                    Exportar PDF
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {/* <TableCell>ID</TableCell> */}
                            <TableCell>No. Cotización</TableCell>
                            <TableCell>Fecha</TableCell>
                            <TableCell>Días Vencidos</TableCell>
                            <TableCell>Vendedor</TableCell>
                            <TableCell>Cliente</TableCell>
                            <TableCell>Estado</TableCell>
                            <TableCell align="right">Total</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.data.map((row) => (
                            <TableRow key={row.idcotizacion}>
                                {/* <TableCell>{row.idcotizacion}</TableCell> */}
                                <TableCell>{row.nocotizacion}</TableCell>
                                <TableCell>
                                    {new Date(
                                        row.fecha_cotizacion
                                    ).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{row.dias_desde_prefacturacion}</TableCell>
                                <TableCell>{row.vendedor}</TableCell>
                                <TableCell>{row.cliente}</TableCell>
                                <TableCell>
                                    {
                                        estados.find(
                                            (e) => e.value === row.estado
                                        )?.label
                                    }
                                </TableCell>
                                <TableCell align="right">
                                    {Number(row.total_general).toLocaleString(
                                        "es-GT",
                                        { style: "currency", currency: "GTQ" }
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box mt={2} display="flex" justifyContent="center">
                <Pagination
                    count={Math.ceil(data.total / data.per_page)}
                    page={data.current_page}
                    onChange={handlePage}
                    color="primary"
                />
            </Box>
        </Box>
    );
};

export default CotizacionesConsultaContabilidad;
