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
    const [clienteSeleccionado, setClienteSeleccionado] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const { id } = useParams();
    const [modoEdicion, setModoEdicion] = useState(!!id);
    const [fechaActual, setFechaActual] = useState("");
    const [clienteInput, setClienteInput] = useState(""); // lo que el usuario escribe

    // Cargar la fecha desde el servidor
    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, { headers })
            .then((res) => {
                setFechaActual(res.data.fecha);
            })
            .catch(() => {
                const localDate = new Date().toISOString().split("T")[0];
                setFechaActual(localDate); // fallback
            });
    }, []);

    const [form, setForm] = useState({
        idcuentaporcobrar: "",
        idcliente: "",
        cliente_nombre: "",
        saldo_pendiente: 0,
        fecha_recibo: fechaActual,
        monto_recibido: "",
        metodo_pago: "Efectivo",
        referencia: "",
        observaciones: "",
        moneda: "GTQ",
        // NUEVO: campos solicitados
        serie: "A", // string
        numero: "", // number (guardado como string hasta enviar)
        tipo: "RECIBO", // default
    });

    useEffect(() => {
        if (!id && fechaActual) {
            setForm((prev) => ({
                ...prev,
                fecha_recibo: fechaActual,
            }));
        }
    }, [fechaActual, id]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.warn("Token no disponible aún.");
            return;
        }

        axios
            .get("/api/lista_clientes", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((res) => {
                setClientes(res.data);
            })
            .catch((err) => {
                console.error(
                    "❌ Error al cargar clientes:",
                    err.response?.data || err.message
                );
                alertify.error("No se pudo cargar la lista de clientes");
            });
    }, []);

    useEffect(() => {
        if (id) {
            setModoEdicion(true);
            const token = localStorage.getItem("token");
            axios
                .get(`/api/recibos/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((res) => {
                    const data = res.data;

                    setForm({
                        idcuentaporcobrar: data.idcuentaporcobrar,
                        idcliente: data.idcliente,
                        cliente_nombre: data.cliente?.nombre || "",
                        saldo_pendiente:
                            parseFloat(data.cuenta?.saldo_pendiente) || 0,
                        fecha_recibo: data.fecha_recibo,
                        monto_recibido: parseFloat(data.monto_recibido) || 0,
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
        }
    }, [id]);

    const handleBuscarCuentas = () => {
        if (!clienteSeleccionado) return;
        axios
            .get(
                `/api/cuentas-por-cobrar/por-cliente?cliente=${clienteSeleccionado}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            )
            .then((res) => {
                if (import.meta.env.DEV) {
                    //console.log("status:", res.status);
                    // si res.data es un array, esto es más claro:
                    // Array.isArray(res.data)
                    //     ? console.table(res.data)
                    //     : console.dir(res.data, { depth: null });
                    // console.groupEnd?.();
                }
                setCuentas(res.data);
            });
    };

    const seleccionarCuenta = (cuenta) => {
        setClientes((prevClientes) => {
            const clienteObj = prevClientes.find(
                (c) =>
                    String(c.idcliente).trim() ===
                    String(cuenta.idcliente).trim()
            );

            setForm((prevForm) => ({
                ...prevForm,
                idcuentaporcobrar: cuenta.idcuentaporcobrar,
                idcliente: cuenta.idcliente,
                cliente_nombre: clienteObj
                    ? clienteObj.nombre
                    : "No encontrado",
                saldo_pendiente: cuenta.saldo_pendiente,
            }));

            return prevClientes;
        });

        setModalOpen(false);
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;

        // Validación puntual para número (solo enteros positivos)
        if (name === "numero") {
            const limpio = value.replace(/[^\d]/g, "");
            setForm({ ...form, numero: limpio });
            return;
        }

        // Forzar mayúsculas en serie
        if (name === "serie") {
            setForm({ ...form, serie: value.toUpperCase() });
            return;
        }

        setForm({ ...form, [name]: type === "number" ? Number(value) : value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.idcliente || !form.idcuentaporcobrar) {
            alertify.error("Debe seleccionar una cuenta por cobrar.");
            return;
        }

        if (
            parseFloat(form.monto_recibido) > parseFloat(form.saldo_pendiente)
        ) {
            alertify.error(
                "El monto recibido no puede ser mayor al saldo pendiente."
            );
            return;
        }

        // Validaciones de los nuevos campos
        if (!form.serie || form.serie.trim() === "") {
            alertify.error("La serie es obligatoria.");
            return;
        }
        if (
            !form.numero ||
            isNaN(Number(form.numero)) ||
            Number(form.numero) <= 0
        ) {
            alertify.error("El número de recibo debe ser un entero positivo.");
            return;
        }
        if (!form.tipo) {
            alertify.error("Debe seleccionar el tipo.");
            return;
        }

        axios({
            method: id ? "put" : "post",
            url: id ? `/api/recibos/${id}` : "/api/recibos",
            data: {
                ...form,
                numero: Number(form.numero), // asegurar envío como número
            },
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })
            .then(() => {
                alertify.success(
                    id
                        ? "Recibo actualizado correctamente"
                        : "Recibo registrado correctamente"
                );
                // navigate("/recibos/consulta");
            })
            .catch((err) => {
                if (err.response?.status === 422) {
                    const errs = err.response.data?.errors || {};
                    const msg =
                        Object.values(errs).flat().join("\n") ||
                        "Datos inválidos.";
                    alertify.error(msg);
                } else if (err.response?.data?.error) {
                    alertify.error(err.response.data.error);
                } else {
                    alertify.error("Error al guardar el recibo");
                }
            });
    };

    const fmt2 = new Intl.NumberFormat("es-GT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const columnas = useMemo(
        () => [
            { accessorKey: "idcuentaporcobrar", header: "ID CxC" },
            { accessorKey: "nofactura", header: "No. Interno" },
            { accessorKey: "fecha_emision", header: "Fecha Emisión" },
            {
                id: "monto_original",
                header: "Monto Original",
                accessorFn: (row) =>
                    Number.parseFloat(row?.monto_original ?? 0), // valor NUMÉRICO
                Cell: ({ cell }) => fmt2.format(cell.getValue() ?? 0), // vista con 2 decimales
                muiTableBodyCellProps: { align: "right" }, // alineación derecha
                size: 120,
            },
            {
                id: "saldo_pendiente",
                header: "Saldo Pendiente",
                accessorFn: (row) =>
                    Number.parseFloat(row?.saldo_pendiente ?? 0),
                Cell: ({ cell }) => fmt2.format(cell.getValue() ?? 0),
                muiTableBodyCellProps: { align: "right" },
                size: 120,
            },
            {
                id: "acciones",
                header: "Seleccionar",
                Cell: ({ row }) => (
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => seleccionarCuenta(row.original)}
                    >
                        Seleccionar
                    </Button>
                ),
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
            // defaults de los nuevos campos
            serie: "A",
            numero: "",
            tipo: "RECIBO",
        });
        setClienteSeleccionado("");
        setCuentas([]);
        setModalOpen(false);
        setModoEdicion(false);
        window.history.replaceState(null, "", "/recibos/registro");
    };

    return (
        <Box className="container mt-4">
            <Header title={"Registro de Recibo"} />

            <Box mb={2} mt={3}>
                {!modoEdicion && (
                    <Button
                        variant="outlined"
                        onClick={() => setModalOpen(true)}
                    >
                        Buscar Cuenta por Cobrar
                    </Button>
                )}
                {form.idcuentaporcobrar && (
                    <Box mt={1} mb={2}>
                        <Typography variant="subtitle2">
                            Cliente:{" "}
                            <strong>
                                {form.cliente_nombre || "Sin nombre"}
                            </strong>
                        </Typography>
                        <Typography variant="subtitle2">
                            Saldo Pendiente:{" "}
                            <strong>
                                Q
                                {parseFloat(
                                    form.saldo_pendiente
                                ).toLocaleString("es-GT", {
                                    minimumFractionDigits: 2,
                                })}
                            </strong>
                        </Typography>
                    </Box>
                )}
            </Box>

            <form onSubmit={handleSubmit}>
                {/* NUEVOS CAMPOS */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(3, 1fr)",
                        },
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
                        <Select
                            name="tipo"
                            value={form.tipo}
                            label="Tipo"
                            onChange={handleChange}
                            required
                        >
                            <MenuItem value="RECIBO">RECIBO</MenuItem>
                            <MenuItem value="RETENCIÓN">RETENCIÓN</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        name="fecha_recibo"
                        label="Fecha del recibo"
                        type="date"
                        value={form.fecha_recibo || ""} // yyyy-mm-dd
                        onChange={handleChange}
                        required
                        InputLabelProps={{ shrink: true }} // para que el label no tape el valor
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
                    <Select
                        name="metodo_pago"
                        value={form.metodo_pago}
                        label="Método de Pago"
                        onChange={handleChange}
                    >
                        <MenuItem value="Efectivo">Efectivo</MenuItem>
                        <MenuItem value="Transferencia">Transferencia</MenuItem>
                        <MenuItem value="Cheque">Cheque</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    fullWidth
                    name="referencia"
                    label="Referencia"
                    value={form.referencia}
                    onChange={handleChange}
                    sx={{ mb: 2 }}
                />

                <TextField
                    fullWidth
                    name="observaciones"
                    label="Observaciones"
                    multiline
                    rows={3}
                    value={form.observaciones}
                    onChange={handleChange}
                    sx={{ mb: 2 }}
                />

                <Button type="submit" variant="contained" color="success">
                    Guardar Recibo
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleNuevoRecibo}
                    sx={{ ml: 2 }}
                >
                    Nuevo Recibo
                </Button>
            </form>

            <Dialog
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                fullWidth
                maxWidth="xl"
            >
                <DialogTitle>Seleccionar Cuenta por Cobrar</DialogTitle>
                <DialogContent>
                    {/* <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Cliente</InputLabel>
                        <Select
                            value={clienteSeleccionado}
                            label="Cliente"
                            onChange={(e) =>
                                setClienteSeleccionado(e.target.value)
                            }
                        >
                            {clientes.map((cl) => (
                                <MenuItem
                                    key={cl.idcliente}
                                    value={cl.idcliente}
                                >
                                    {cl.nombre}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl> */}
                    <Autocomplete
                        fullWidth
                        options={clientes} // [{idcliente, nombre}, ...]
                        getOptionLabel={(o) => o?.nombre ?? ""}
                        value={
                            clientes.find(
                                (c) =>
                                    String(c.idcliente) ===
                                    String(clienteSeleccionado)
                            ) ?? null
                        }
                        onChange={(_, val) =>
                            setClienteSeleccionado(val?.idcliente ?? "")
                        }
                        inputValue={clienteInput}
                        onInputChange={(_, val) => setClienteInput(val)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Buscar cliente"
                                placeholder="Escribe nombre..."
                            />
                        )}
                        // filtro insensible a acentos y mayúsculas
                        filterOptions={(options, state) => {
                            const q = norm(state.inputValue);
                            if (!q) return options.slice(0, 50); // limite de 50 para no saturar
                            return options
                                .filter((o) => norm(o.nombre).includes(q))
                                .slice(0, 50);
                        }}
                        // resalta coincidencias (opcional)
                        renderOption={(props, option, { inputValue }) => {
                            const texto = option.nombre ?? "";
                            const q = norm(inputValue);
                            const idx = norm(texto).indexOf(q);
                            if (q && idx >= 0) {
                                const before = texto.slice(0, idx);
                                const match = texto.slice(
                                    idx,
                                    idx + inputValue.length
                                );
                                const after = texto.slice(
                                    idx + inputValue.length
                                );
                                return (
                                    <li {...props}>
                                        {before}
                                        <strong>{match}</strong>
                                        {after}
                                    </li>
                                );
                            }
                            return <li {...props}>{texto}</li>;
                        }}
                        clearOnBlur={false}
                        openOnFocus
                    />

                    <Button
                        variant="outlined"
                        onClick={handleBuscarCuentas}
                        disabled={!clienteSeleccionado}
                        sx={{ mb: 2 }}
                    >
                        Buscar Cuentas
                    </Button>

                    <MaterialReactTable
                        columns={columnas}
                        data={cuentas}
                        enablePagination
                        enableGlobalFilter
                        muiTableContainerProps={{ sx: { maxHeight: 400 } }}
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
