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
  const [recibos, setRecibos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rowSelection, setRowSelection] = useState({});
  const [selectedRecibo, setSelectedRecibo] = useState(null);

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [clientes, setClientes] = useState([]);
  const [tipoFiltro, setTipoFiltro] = useState("");

  const [pdfUrl, setPdfUrl] = useState(null);

  const [verFacturasOpen, setVerFacturasOpen] = useState(false);
  const [facturasRecibo, setFacturasRecibo] = useState([]); // detalles enriquecidos

  const navigate = useNavigate();

  // Fecha por defecto desde servidor
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
        const today = new Date().toISOString().split("T")[0];
        setFechaInicio(today);
        setFechaFin(today);
      });
  }, []);

  // Clientes para filtro
  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get(`${import.meta.env.VITE_API_URL}/clientes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setClientes(res.data))
      .catch(() => alertify.error("No se pudo cargar clientes"));
  }, []);

  // Selección de fila → recibo seleccionado
  useEffect(() => {
    const selectedKey = Object.keys(rowSelection)[0];
    if (selectedKey !== undefined) {
      setSelectedRecibo(recibos[selectedKey]);
    } else {
      setSelectedRecibo(null);
    }
  }, [rowSelection, recibos]);

  const fetchRecibos = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const params = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      if (clienteFiltro) params.cliente = clienteFiltro;
      if (tipoFiltro) params.tipo = tipoFiltro;

      // Importante: el backend debería traer detalles (detalles.cuenta) en index()
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/recibos`, {
        headers,
        params,
      });
      setRecibos(data);
    } catch (error) {
      console.error(error);
      alertify.error("Error al cargar recibos");
    } finally {
      setLoading(false);
    }
  };

  // Generar PDF reporte por rango/cliente/tipo
  const handleGenerarPdf = async () => {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    if (fechaInicio) params.append("fecha_inicio", fechaInicio);
    if (fechaFin) params.append("fecha_fin", fechaFin);
    if (tipoFiltro) params.append("tipo", tipoFiltro);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/recibos-reporte/pdf?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Error al generar PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch {
      alertify.error("No se pudo generar el PDF");
    }
  };

  // Elimina (desactiva) recibo
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
            `${import.meta.env.VITE_API_URL}/recibos/desactivar/${selectedRecibo.idrecibo}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .then(() => {
            alertify.success("Recibo eliminado");
            setRowSelection({});
            fetchRecibos();
          })
          .catch(() => alertify.error("Error al eliminar el recibo"));
      },
      () => alertify.error("Cancelado")
    );
  };

  // Ver facturas (detalles) de un recibo
  const handleVerFacturas = async (reciboRow) => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/recibos/${reciboRow.idrecibo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const dets = data?.detalles ?? [];
      // Normaliza para la tabla del modal
      const items = dets.map((d) => ({
        idcuentaporcobrar: d.idcuentaporcobrar,
        nofactura: d?.cuenta?.cotizacion?.nofactura ?? "",
        fecha_emision: d?.cuenta?.fecha_emision ?? "",
        monto_original: Number(d?.cuenta?.monto_original ?? 0),
        saldo_pendiente: Number(d?.cuenta?.saldo_pendiente ?? 0),
        monto_pagado: Number(d?.monto ?? 0),
      }));
      setFacturasRecibo(items);
      setVerFacturasOpen(true);
    } catch (e) {
      alertify.error("No se pudieron cargar las facturas del recibo");
    }
  };

  // Columnas (ajustadas a múltiple detalle)
  const columns = [
    { accessorKey: "idrecibo", header: "ID", size: 80 },
    { accessorKey: "serie", header: "SERIE", size: 60 },
    { accessorKey: "numero", header: "NÚMERO", size: 90 },
    { accessorKey: "tipo", header: "TIPO", size: 90 },
    {
      accessorFn: (row) => row.cliente?.nombre || "Sin nombre",
      id: "cliente_nombre",
      header: "Cliente",
      size: 180,
    },
    {
      accessorKey: "fecha_recibo",
      header: "Fecha",
      size: 110,
    },
    {
      accessorKey: "monto_recibido",
      header: "Monto Recibo",
      Cell: ({ cell }) =>
        parseFloat(cell.getValue()).toLocaleString("es-GT", {
          style: "currency",
          currency: "GTQ",
          minimumFractionDigits: 2,
        }),
      size: 140,
      muiTableBodyCellProps: { align: "right" },
    },
    {
      id: "detalle_count",
      header: "Facturas",
      accessorFn: (row) => (Array.isArray(row.detalles) ? row.detalles.length : 0),
      Cell: ({ row }) => {
        const dets = row.original?.detalles ?? [];
        const count = dets.length;
        return (
          <Button variant="outlined" size="small" onClick={() => handleVerFacturas(row.original)}>
            {count > 0 ? `${count} factura(s)` : "Ver"}
          </Button>
        );
      },
      size: 130,
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

  return (
    <Box sx={{ p: 2 }}>
      <Header title="Consulta de Recibos" />
      <Paper elevation={3} sx={{ mt: 2, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Recibos Registrados
        </Typography>

        {/* Filtros */}
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
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Tipo</InputLabel>
            <Select label="Tipo" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
              <MenuItem value="">TODAS</MenuItem>
              <MenuItem value="RECIBO">RECIBO</MenuItem>
              <MenuItem value="RETENCIÓN">RETENCIÓN</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 240 }}>
            <InputLabel>Cliente</InputLabel>
            <Select
              label="Cliente"
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {clientes.map((cl) => (
                <MenuItem key={cl.idcliente} value={cl.idcliente}>
                  {cl.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Acciones */}
        <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={fetchRecibos} disabled={loading}>
            Consultar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleGenerarPdf}
            startIcon={<PictureAsPdfIcon />}
            disabled={loading}
          >
            Generar PDF
          </Button>
          {/* <Button
            variant="contained"
            color="warning"
            disabled={!selectedRecibo || loading}
            onClick={() => navigate(`/recibos/editar/${selectedRecibo.idrecibo}`)}
          >
            Editar
          </Button> */}
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

      {/* Modal PDF de reporte */}
      <Dialog open={!!pdfUrl} onClose={() => setPdfUrl(null)} maxWidth="lg" fullWidth>
        <DialogTitle>Reporte de Recibos</DialogTitle>
        <DialogContent dividers style={{ height: "80vh" }}>
          <iframe src={pdfUrl} width="100%" height="100%" style={{ border: "none" }} title="PDF Reporte" />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              const now = new Date();
              const timestamp = now.toISOString().replace(/[:T]/g, "-").split(".")[0];
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

      {/* Modal Facturas asociadas */}
      <Dialog open={verFacturasOpen} onClose={() => setVerFacturasOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Facturas asociadas al recibo</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 6 }}>ID CxC</th>
                  <th style={{ textAlign: "left", padding: 6 }}>No. Interno</th>
                  <th style={{ textAlign: "left", padding: 6 }}>Fecha</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Monto Original</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Saldo</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Pagado en Recibo</th>
                </tr>
              </thead>
              <tbody>
                {facturasRecibo.map((f) => (
                  <tr key={f.idcuentaporcobrar}>
                    <td style={{ padding: 6 }}>{f.idcuentaporcobrar}</td>
                    <td style={{ padding: 6 }}>{f.nofactura}</td>
                    <td style={{ padding: 6 }}>{f.fecha_emision}</td>
                    <td style={{ textAlign: "right", padding: 6 }}>
                      {Number(f.monto_original).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: "right", padding: 6 }}>
                      {Number(f.saldo_pendiente).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: "right", padding: 6 }}>
                      {Number(f.monto_pagado).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerFacturasOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecibosConsulta;
