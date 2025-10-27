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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Search, Download } from "lucide-react";
import Header from "../../Header";

const ReporteNotasAjuste = () => {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [fechaInicio, setFechaInicio] = useState(
    primerDiaMes.toISOString().split("T")[0]
  );
  const [fechaFinal, setFechaFinal] = useState(hoy.toISOString().split("T")[0]);
  const [tipo, setTipo] = useState("TODOS");
  const [data, setData] = useState({
    registros: [],
    porTipo: [],
    totalGeneral: 0,
    sumaGeneral: 0,
  });
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const handleBuscar = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/reporte/notas-ajuste`,
        {
          params: { fechaInicio, fechaFinal, tipo },
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
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/reporte/notas-ajuste`,
        {
          params: { fechaInicio, fechaFinal, tipo, format: "pdf" },
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `reporte_notas_${tipo}_${fechaInicio}_a_${fechaFinal}.pdf`
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
      <Header title="Reporte de notas de Crédito y Débito"/>
<br/>
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
        <FormControl>
          <InputLabel>Tipo</InputLabel>
          <Select
            value={tipo}
            label="Tipo"
            onChange={(e) => setTipo(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="TODOS">Todos</MenuItem>
            <MenuItem value="NCRE">Notas de Crédito</MenuItem>
            <MenuItem value="NDEB">Notas de Débito</MenuItem>
          </Select>
        </FormControl>
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
                <TableCell>Fecha Certificación</TableCell>
                <TableCell>Tipo Nota</TableCell>
                <TableCell>No. Nota</TableCell>
                <TableCell>Fecha Nota</TableCell>
                <TableCell align="right">Monto Total (Q)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.registros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No hay registros
                  </TableCell>
                </TableRow>
              ) : (
                data.registros.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.nocotizacion}</TableCell>
                    <TableCell>{r.cliente}</TableCell>
                    <TableCell>{r.nointerno}</TableCell>
                    <TableCell>{r.numero_factura}</TableCell>
                    <TableCell>{r.fecha_certificacion}</TableCell>
                    <TableCell>{r.tipo_nota}</TableCell>
                    <TableCell>{r.numero_nota}</TableCell>
                    <TableCell>{r.fecha_nota}</TableCell>
                    <TableCell align="right">
                      {Number(r.monto_total).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {data.porTipo.length > 0 && (
            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                Resumen por tipo
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell align="center">Cantidad</TableCell>
                      <TableCell align="right">Monto Total (Q)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.porTipo.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell>{t.tipo}</TableCell>
                        <TableCell align="center">{t.total}</TableCell>
                        <TableCell align="right">
                          {Number(t.monto).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell>
                        <strong>Total General</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>{data.totalGeneral}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{Number(data.sumaGeneral).toFixed(2)}</strong>
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

export default ReporteNotasAjuste;
