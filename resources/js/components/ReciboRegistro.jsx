import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Autocomplete,
} from "@mui/material";
import { MaterialReactTable } from "material-react-table";
import Header from "./Header";
import { useParams } from "react-router-dom";
import { norm } from "../utils/text";

const ReciboRegistro = () => {
  const [clientes, setClientes] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const { id } = useParams();
  const [modoEdicion, setModoEdicion] = useState(!!id);
  const [fechaActual, setFechaActual] = useState("");
  const [clienteInput, setClienteInput] = useState("");
  const [clienteSelObj, setClienteSelObj] = useState(null);
  const [selectedCuentas, setSelectedCuentas] = useState([]); // [{...cxc, monto_a_pagar}]
  const [rowSelection, setRowSelection] = useState({});

  const clientesById = useMemo(() => {
    const m = new Map();
    for (const c of clientes) {
      const id = String(c.idcliente).trim();
      m.set(id, c);
      const n = Number(id);
      if (!Number.isNaN(n)) m.set(String(n), c);
    }
    return m;
  }, [clientes]);

  // Cargar fecha servidor
  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    axios
      .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, { headers })
      .then((res) => setFechaActual(res.data.fecha))
      .catch(() => {
        const localDate = new Date().toISOString().split("T")[0];
        setFechaActual(localDate);
      });
  }, []);

  const [form, setForm] = useState({
    idcuentaporcobrar: "",
    idcliente: "",
    cliente_nombre: "",
    saldo_pendiente: 0,
    fecha_recibo: "",
    monto_recibido: "",
    metodo_pago: "Efectivo",
    referencia: "",
    observaciones: "",
    moneda: "GTQ",
    serie: "A",
    numero: "",
    tipo: "RECIBO",
  });

  // Set default fecha en alta
  useEffect(() => {
    if (!id && fechaActual) {
      setForm((prev) => ({ ...prev, fecha_recibo: fechaActual }));
    }
  }, [fechaActual, id]);

  // Cargar clientes
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios
      .get("/api/lista_clientes", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const lista = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        const normalizados = lista.map((c) => ({
          ...c,
          nombre:
            c.nombre ??
            c.cliente ??
            c.nombre_comercial ??
            c.razon_social ??
            c.cuenta ??
            "",
        }));
        const map = new Map();
        for (const c of normalizados) {
          const id = String(c.idcliente).trim();
          if (!map.has(id)) map.set(id, c);
        }
        setClientes(Array.from(map.values()));
      })
      .catch((err) => {
        console.error("❌ Error al cargar clientes:", err.response?.data || err.message);
        alertify.error("No se pudo cargar la lista de clientes");
      });
  }, []);

  // Cargar recibo en edición (cabecera + detalles)
  useEffect(() => {
    if (!id) return;
    setModoEdicion(true);
    const token = localStorage.getItem("token");
    axios
      .get(`/api/recibos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        // hidratar detalles -> selectedCuentas
        const dets = data?.detalles ?? [];
        const sc = dets.map((d) => ({
          idcuentaporcobrar: d.idcuentaporcobrar,
          nofactura: d?.cuenta?.nofactura ?? "",
          fecha_emision: d?.cuenta?.fecha_emision ?? "",
          monto_original: Number(d?.cuenta?.monto_original ?? 0),
          // Para permitir tope correcto al editar, sumamos temporalmente lo pagado de este recibo:
          saldo_pendiente: Number(d?.cuenta?.saldo_pendiente ?? 0) + Number(d?.monto ?? 0),
          monto_a_pagar: Number(d?.monto ?? 0),
          idcliente: data.idcliente,
          cliente_nombre: data?.cliente?.nombre ?? "",
        }));
        setSelectedCuentas(sc);

        const total = sc.reduce((a, c) => a + (Number(c.monto_a_pagar) || 0), 0);
        setForm({
          idcuentaporcobrar: "", // modo multi
          idcliente: String(data.idcliente),
          cliente_nombre: data?.cliente?.nombre ?? "",
          saldo_pendiente: 0,
          fecha_recibo: data.fecha_recibo,
          monto_recibido: total,
          metodo_pago: data.metodo_pago,
          referencia: data.referencia,
          observaciones: data.observaciones,
          moneda: data.moneda || "GTQ",
          serie: data.serie ?? "A",
          numero: data.numero ?? "",
          tipo: data.tipo || "RECIBO",
        });
      })
      .catch(() => {
        alertify.error("No se pudo cargar el recibo");
      });
  }, [id]);

  // Sincronizar total con la suma de montos editados
  useEffect(() => {
    if (selectedCuentas.length > 0) {
      const total = selectedCuentas.reduce((a, c) => a + (Number(c.monto_a_pagar) || 0), 0);
      setForm((prev) => ({ ...prev, monto_recibido: total }));
    }
  }, [selectedCuentas]);

  const handleBuscarCuentas = () => {
    const idCliente = clienteSelObj?.idcliente;
    const nombreCliente = clienteSelObj?.nombre ?? "";
    if (!idCliente) {
      alertify.error("Selecciona un cliente de la lista");
      return;
    }
    axios
      .get(`/api/cuentas-por-cobrar/por-cliente?cliente=${idCliente}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        const cuentasEnriquecidas = data.map((c) => ({
          ...c,
          idcliente: c.idcliente ?? idCliente,
          cliente_nombre: c.cliente_nombre ?? c.cliente ?? nombreCliente,
        }));
        setCuentas(cuentasEnriquecidas);
      })
      .catch((err) => {
        console.error("❌ Error al cargar cuentas:", err.response?.data || err.message);
        alertify.error("No se pudo cargar las cuentas del cliente");
      });
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (name === "numero") {
      const limpio = value.replace(/[^\d]/g, "");
      setForm({ ...form, numero: limpio });
      return;
    }
    if (name === "serie") {
      setForm({ ...form, serie: value.toUpperCase() });
      return;
    }
    setForm({ ...form, [name]: type === "number" ? Number(value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones base
    if (!form.serie?.trim()) return alertify.error("La serie es obligatoria.");
    if (!form.numero || isNaN(Number(form.numero)) || Number(form.numero) <= 0)
      return alertify.error("El número de recibo debe ser un entero positivo.");
    if (!form.tipo) return alertify.error("Debe seleccionar el tipo.");
    if (!form.idcliente) return alertify.error("Debe seleccionar un cliente.");

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    // Construye detalle
    let detalle = [];
    if (selectedCuentas.length > 0) {
      detalle = selectedCuentas
        .filter((c) => (Number(c.monto_a_pagar) || 0) > 0)
        .map((c) => ({
          idcuentaporcobrar: c.idcuentaporcobrar,
          monto: Number(c.monto_a_pagar) || 0,
        }));
    } else {
      // modo simple (compatibilidad)
      if (!form.idcuentaporcobrar)
        return alertify.error("Debe seleccionar una cuenta por cobrar.");
      if (parseFloat(form.monto_recibido) > parseFloat(form.saldo_pendiente))
        return alertify.error("El monto recibido no puede ser mayor al saldo pendiente.");
      detalle = [
        {
          idcuentaporcobrar: form.idcuentaporcobrar,
          monto: Number(form.monto_recibido) || 0,
        },
      ];
    }

    const totalDetalle = detalle.reduce((a, d) => a + (Number(d.monto) || 0), 0);
    if (totalDetalle <= 0) return alertify.error("El total del recibo debe ser mayor a 0.");

    try {
      const payload = {
        idcliente: form.idcliente,
        fecha_recibo: form.fecha_recibo,
        metodo_pago: form.metodo_pago,
        referencia: form.referencia,
        observaciones: form.observaciones,
        moneda: form.moneda || "GTQ",
        serie: form.serie,
        numero: Number(form.numero),
        tipo: form.tipo,
        monto_recibido: totalDetalle,
        detalle,
      };

      if (modoEdicion && id) {
        await axios.put(`/api/recibos/${id}`, payload, { headers });
        alertify.success("Recibo actualizado correctamente");
      } else {
        await axios.post("/api/recibos", payload, { headers });
        alertify.success("Recibo registrado correctamente");
      }

      handleNuevoRecibo();
    } catch (err) {
      if (err.response?.status === 422) {
        const errs = err.response.data?.errors || {};
        const msg = Object.values(errs).flat().join("\n") || "Datos inválidos.";
        alertify.error(msg);
      } else if (err.response?.data?.error) {
        alertify.error(err.response.data.error);
      } else {
        alertify.error("Error al guardar el recibo");
      }
    }
  };

  const fmt2 = new Intl.NumberFormat("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Columnas para el modal (con edición inline)
  const columnas = useMemo(
    () => [
      { accessorKey: "idcuentaporcobrar", header: "ID CxC", size: 90 },
      { accessorKey: "nofactura", header: "No. Interno", size: 120 },
      { accessorKey: "fecha_emision", header: "Fecha Emisión", size: 120 },
      {
        id: "monto_original",
        header: "Monto Original",
        accessorFn: (row) => Number.parseFloat(row?.monto_original ?? 0),
        Cell: ({ cell }) => fmt2.format(cell.getValue() ?? 0),
        muiTableBodyCellProps: { align: "right" },
        size: 120,
      },
      {
        id: "saldo_pendiente",
        header: "Saldo Pendiente",
        accessorFn: (row) => Number.parseFloat(row?.saldo_pendiente ?? 0),
        Cell: ({ cell }) => fmt2.format(cell.getValue() ?? 0),
        muiTableBodyCellProps: { align: "right" },
        size: 120,
      },
      {
        accessorKey: "monto_a_pagar",
        header: "Monto a pagar",
        enableEditing: true,
        muiTableBodyCellEditTextFieldProps: ({ row }) => ({
          type: "number",
          inputProps: {
            step: "any",
            min: 0,
            max: Number(row.original.saldo_pendiente) || 0,
          },
        }),
        Cell: ({ row }) => fmt2.format(Number(row.original.monto_a_pagar ?? 0)),
        muiTableBodyCellProps: { align: "right" },
        size: 140,
      },
    ],
    []
  );

  const handleNuevoRecibo = () => {
    const hoy = fechaActual || new Date().toISOString().split("T")[0];
    setForm({
      idcuentaporcobrar: "",
      idcliente: "",
      cliente_nombre: "",
      saldo_pendiente: 0,
      fecha_recibo: hoy,
      monto_recibido: "",
      metodo_pago: "Efectivo",
      referencia: "",
      observaciones: "",
      moneda: "GTQ",
      serie: "A",
      numero: "",
      tipo: "RECIBO",
    });
    setClienteSelObj(null);
    setCuentas([]);
    setSelectedCuentas([]);
    setRowSelection({});
    setModalOpen(false);
    setModoEdicion(false);
    window.history.replaceState(null, "", "/recibos/registro");
  };

  return (
    <Box className="container mt-4">
      <Header title={"Registro de Recibo"} />

      {/* Botón abrir modal */}
      <Box mb={2} mt={3}>
        <Button variant="outlined" onClick={() => setModalOpen(true)}>
          Buscar Cuentas por Cobrar
        </Button>
      </Box>

      {/* Vista previa selección */}
      {selectedCuentas.length > 0 ? (
        <Box mt={1} mb={2}>
          <Typography variant="subtitle2">
            Cliente: <strong>{form.cliente_nombre || "Sin nombre"}</strong>
          </Typography>
          <Box sx={{ overflowX: "auto", mt: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 6 }}>ID CxC</th>
                  <th style={{ textAlign: "left", padding: 6 }}>No. Interno</th>
                  <th style={{ textAlign: "left", padding: 6 }}>Fecha</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Saldo</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Monto a pagar</th>
                </tr>
              </thead>
              <tbody>
                {selectedCuentas.map((c, idx) => (
                  <tr key={c.idcuentaporcobrar}>
                    <td style={{ padding: 6 }}>{c.idcuentaporcobrar}</td>
                    <td style={{ padding: 6 }}>{c.nofactura}</td>
                    <td style={{ padding: 6 }}>{c.fecha_emision}</td>
                    <td style={{ textAlign: "right", padding: 6 }}>
                      {fmt2.format(Number(c.saldo_pendiente) || 0)}
                    </td>
                    <td style={{ textAlign: "right", padding: 6 }}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{
                          step: "any",
                          min: 0,
                          max: Number(c.saldo_pendiente) || 0,
                        }}
                        value={c.monto_a_pagar}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSelectedCuentas((prev) => {
                            const copy = [...prev];
                            const max = Number(copy[idx].saldo_pendiente) || 0;
                            copy[idx] = {
                              ...copy[idx],
                              monto_a_pagar: isNaN(val)
                                ? 0
                                : Math.min(Math.max(val, 0), max),
                            };
                            return copy;
                          });
                        }}
                        sx={{ width: 140 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: "right", padding: 6 }}>
                    <strong>Total a recibir:</strong>
                  </td>
                  <td style={{ textAlign: "right", padding: 6 }}>
                    <strong>
                      {fmt2.format(
                        selectedCuentas.reduce(
                          (a, c) => a + (Number(c.monto_a_pagar) || 0),
                          0
                        )
                      )}
                    </strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </Box>
          <Typography variant="caption" color="text.secondary">
            * El total del recibo se calcula como la suma de “Monto a pagar”.
          </Typography>
        </Box>
      ) : form.idcuentaporcobrar ? (
        // Modo simple (compatibilidad)
        <Box mt={1} mb={2}>
          <Typography variant="subtitle2">
            Cliente: <strong>{form.cliente_nombre || "Sin nombre"}</strong>
          </Typography>
          <Typography variant="subtitle2">
            Saldo Pendiente:{" "}
            <strong>
              Q
              {parseFloat(form.saldo_pendiente).toLocaleString("es-GT", {
                minimumFractionDigits: 2,
              })}
            </strong>
          </Typography>
        </Box>
      ) : null}

      {/* Formulario cabecera */}
      <form onSubmit={handleSubmit}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 2,
            mb: 2,
          }}
        >
          <TextField
            name="serie"
            label="Serie"
            value={form.serie}
            onChange={handleChange}
            inputProps={{ maxLength: 10 }}
            required
          />
          <TextField
            name="numero"
            label="Número"
            value={form.numero}
            onChange={handleChange}
            inputMode="numeric"
            placeholder="Solo números"
            required
          />
          <FormControl>
            <InputLabel>Tipo</InputLabel>
            <Select name="tipo" value={form.tipo} label="Tipo" onChange={handleChange} required>
              <MenuItem value="RECIBO">RECIBO</MenuItem>
              <MenuItem value="RETENCIÓN">RETENCIÓN</MenuItem>
            </Select>
          </FormControl>
          <TextField
            name="fecha_recibo"
            label="Fecha del recibo"
            type="date"
            value={form.fecha_recibo || ""}
            onChange={handleChange}
            required
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <TextField
          fullWidth
          type="number"
          inputProps={{ step: "any" }}
          name="monto_recibido"
          label="Monto Recibido"
          required
          value={form.monto_recibido}
          onChange={handleChange}
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Método de Pago</InputLabel>
          <Select name="metodo_pago" value={form.metodo_pago} label="Método de Pago" onChange={handleChange}>
            <MenuItem value="Efectivo">Efectivo</MenuItem>
            <MenuItem value="Transferencia">Transferencia</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
          </Select>
        </FormControl>

        <TextField fullWidth name="referencia" label="Referencia" value={form.referencia} onChange={handleChange} sx={{ mb: 2 }} />
        <TextField fullWidth name="observaciones" label="Observaciones" multiline rows={3} value={form.observaciones} onChange={handleChange} sx={{ mb: 2 }} />

        <Button type="submit" variant="contained" color="success">
          {modoEdicion ? "Actualizar Recibo" : "Guardar Recibo"}
        </Button>
        <Button variant="outlined" color="secondary" onClick={handleNuevoRecibo} sx={{ ml: 2 }}>
          Nuevo Recibo
        </Button>
      </form>

      {/* Modal selección/edición inline */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="xl">
        <DialogTitle>Seleccionar Cuentas por Cobrar</DialogTitle>
        <DialogContent>
          <Autocomplete
            fullWidth
            options={clientes}
            getOptionLabel={(o) => o?.nombre ?? ""}
            isOptionEqualToValue={(o, v) => String(o.idcliente) === String(v.idcliente)}
            value={clienteSelObj}
            onChange={(_, val) => setClienteSelObj(val ?? null)}
            inputValue={clienteInput}
            onInputChange={(_, val) => setClienteInput(val)}
            renderInput={(params) => <TextField {...params} label="Buscar cliente" placeholder="Escribe nombre..." />}
            filterOptions={(options, state) => {
              const q = norm(state.inputValue);
              if (!q) return options.slice(0, 50);
              return options.filter((o) => norm(o.nombre).includes(q)).slice(0, 50);
            }}
            renderOption={(props, option, { inputValue }) => {
              const { key, ...rest } = props;
              const texto = option.nombre ?? "";
              const q = norm(inputValue);
              const idx = norm(texto).indexOf(q);
              return (
                <li key={String(option.idcliente)} {...rest}>
                  {q && idx >= 0 ? (
                    <>
                      {texto.slice(0, idx)}
                      <strong>{texto.slice(idx, idx + inputValue.length)}</strong>
                      {texto.slice(idx + inputValue.length)}
                    </>
                  ) : (
                    texto
                  )}
                </li>
              );
            }}
            clearOnBlur={false}
            openOnFocus
            sx={{ mb: 2 }}
          />

          <Button variant="outlined" onClick={handleBuscarCuentas} disabled={!clienteSelObj} sx={{ mb: 2 }}>
            Buscar Cuentas
          </Button>

          <MaterialReactTable
            columns={columnas}
            data={cuentas.map((c) => ({
              ...c,
              monto_a_pagar:
                selectedCuentas.find((sc) => sc.idcuentaporcobrar === c.idcuentaporcobrar)?.monto_a_pagar ??
                (Number(c.saldo_pendiente) || 0),
            }))}
            getRowId={(row) => String(row.idcuentaporcobrar)}
            enableGlobalFilter
            enablePagination
            enableRowSelection
            enableMultiRowSelection
            enableEditing
            editDisplayMode="cell"
            onRowSelectionChange={setRowSelection}
            state={{ rowSelection }}
            muiTableContainerProps={{ sx: { maxHeight: 400 } }}
            onEditingCellSave={({ row, value, table }) => {
              const max = Number(row.original.saldo_pendiente) || 0;
              const val = Math.min(Math.max(Number(value) || 0, 0), max);
              setSelectedCuentas((prev) => {
                const copy = [...prev];
                const idx = copy.findIndex((x) => x.idcuentaporcobrar === row.original.idcuentaporcobrar);
                if (idx >= 0) {
                  copy[idx] = { ...copy[idx], monto_a_pagar: val };
                } else {
                  copy.push({ ...row.original, monto_a_pagar: val });
                }
                return copy;
              });
              table.setEditingCell(null);
            }}
            renderTopToolbarCustomActions={({ table }) => {
              const selectedRows = table.getSelectedRowModel().rows ?? [];
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="body2">
                    Seleccionadas: <strong>{selectedRows.length}</strong>
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={selectedRows.length === 0}
                    onClick={() => {
                      const base = selectedRows.map((r) => r.original);
                      const enriquecidas = base.map((b) => {
                        const ya = selectedCuentas.find((x) => x.idcuentaporcobrar === b.idcuentaporcobrar);
                        return {
                          ...b,
                          monto_a_pagar: ya ? Number(ya.monto_a_pagar) || 0 : Number(b.saldo_pendiente) || 0,
                        };
                      });

                      setSelectedCuentas((prev) => {
                        // evita duplicados si reabre el modal y agrega más
                        const map = new Map();
                        [...prev, ...enriquecidas].forEach((x) =>
                          map.set(x.idcuentaporcobrar, x)
                        );
                        return Array.from(map.values());
                      });

                      // set cabecera cliente
                      const sample = (enriquecidas[0] ?? selectedCuentas[0]) || null;
                      if (sample) {
                        const idCliente = sample?.idcliente ?? clienteSelObj?.idcliente ?? "";
                        const nombreCliente =
                          sample?.cliente_nombre ??
                          clienteSelObj?.nombre ??
                          clientesById.get(String(idCliente).trim())?.nombre ??
                          "";
                        setForm((prev) => ({
                          ...prev,
                          idcliente: String(idCliente),
                          cliente_nombre: nombreCliente,
                          idcuentaporcobrar: "", // modo multi
                        }));
                      }

                      setModalOpen(false);
                    }}
                  >
                    Usar seleccionadas
                  </Button>
                </Box>
              );
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReciboRegistro;
