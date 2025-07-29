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
} from "@mui/material";
import { MaterialReactTable } from "material-react-table";
import Header from "./Header";
import { useParams } from "react-router-dom";



const ReciboRegistro = () => {
    const [clientes, setClientes] = useState([]);
    const [cuentas, setCuentas] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const { id } = useParams();
    const [modoEdicion, setModoEdicion] = useState(!!id);

    const [form, setForm] = useState({
        idcuentaporcobrar: "",
        idcliente: "",
        cliente_nombre: "",
        saldo_pendiente: 0,
        fecha_recibo: new Date().toISOString().split("T")[0],
        monto_recibido: "",
        metodo_pago: "Efectivo",
        referencia: "",
        observaciones: "",
        moneda: "GTQ",
    });

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
                //console.log("✅ Clientes cargados:", res.data);
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
                    });

                    console.log("✅ Formulario cargado:", {
                        ...data,
                        monto_recibido: parseFloat(data.monto_recibido),
                    });
                })
                .catch((err) => {
                    alertify.error("No se pudo cargar el recibo");
                });
        }
    }, [id]);

    const handleBuscarCuentas = () => {
        if (!clienteSeleccionado) return;
        axios
            .get(`/api/cuentas-por-cobrar?cliente=${clienteSeleccionado}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            })
            .then((res) => setCuentas(res.data));
    };

    const seleccionarCuenta = (cuenta) => {
        // Usar setClientes con callback actualizado
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

            return prevClientes; // No modificamos clientes, solo accedemos al valor actualizado
        });

        setModalOpen(false);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
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

        axios({
            method: id ? "put" : "post",
            url: id ? `/api/recibos/${id}` : "/api/recibos",
            data: form,
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
                // Aquí puedes redirigir si lo deseas:
                // navigate("/recibos/consulta");
            })
            .catch(() => {
                alertify.error("Error al guardar el recibo");
            });
    };

    const columnas = useMemo(
        () => [
            { accessorKey: "idcuentaporcobrar", header: "ID CxC" },
            { accessorKey: "fecha_emision", header: "Fecha Emisión" },
            { accessorKey: "monto_original", header: "Monto Original" },
            { accessorKey: "saldo_pendiente", header: "Saldo Pendiente" },
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
        setForm({
            idcuentaporcobrar: "",
            idcliente: "",
            cliente_nombre: "",
            saldo_pendiente: 0,
            fecha_recibo: new Date().toISOString().split("T")[0],
            monto_recibido: "",
            metodo_pago: "Efectivo",
            referencia: "",
            observaciones: "",
            moneda: "GTQ",
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
            {/* <Typography variant="h5" gutterBottom>
                Registrar Recibo
            </Typography> */}

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
                <TextField
                    fullWidth
                    type="number"
                    inputProps={{ step: "any" }} // permite enteros o decimales
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

            {/* {!id && ( */}
                <Dialog
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    fullWidth
                    maxWidth="md"
                >
                    <DialogTitle>Seleccionar Cuenta por Cobrar</DialogTitle>
                    <DialogContent>
                        <FormControl fullWidth sx={{ mb: 2 }}>
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
                        </FormControl>
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
                        <Button onClick={() => setModalOpen(false)}>
                            Cerrar
                        </Button>
                    </DialogActions>
                </Dialog>
            {/* )} */}
        </Box>
    );
};

export default ReciboRegistro;
