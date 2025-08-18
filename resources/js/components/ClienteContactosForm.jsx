// resources/js/components/ClienteContactosMRT.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import {
    Box,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Typography,
    IconButton,
    Radio,
    Tooltip,
    TextField,
    Autocomplete,
} from "@mui/material";
import {
    MaterialReactTable,
    useMaterialReactTable,
} from "material-react-table";
import { Add, Delete, Save } from "@mui/icons-material";
import Header from "./Header";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

// Usa tu .env (ej. VITE_API_URL=http://localhost:8000/api) o /api por defecto
const API = import.meta.env.VITE_API_URL || "/api";

// Helper headers con token
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
};

export default function ClienteContactosForm({
    idclienteInicial = null, //si viene se preselecciona
    bloquearSeleccion = false, //si es true, no se puede cambiar el cliente
    onClose,
    onSaved,
} = {}) {
    const [clientes, setClientes] = useState([]);
    const [clienteId, setClienteId] = useState(
        idclienteInicial ? Number(idclienteInicial) : ""
    );
    const [emails, setEmails] = useState([]);
    const [direcciones, setDirecciones] = useState([]);
    const [eliminarEmails, setEliminarEmails] = useState([]);
    const [eliminarDirecciones, setEliminarDirecciones] = useState([]);

    // Catálogo de departamentos
    const [departamentos, setDepartamentos] = useState([]);
    const deptoById = useMemo(() => {
        const m = new Map();
        departamentos.forEach((d) => m.set(Number(d.id), d.nombre));
        return m;
    }, [departamentos]);

    // Cargar clientes y departamentos (con token)
    useEffect(() => {
        if (idclienteInicial != null) {
            setClienteId(Number(idclienteInicial));
        }
        const loadClientes = async () => {
            try {
                // Prioriza tu endpoint con token
                const res = await axios.get(`${API}/lista_clientes`, {
                    headers: getAuthHeaders(),
                });
                // Si tu endpoint devuelve idcliente/nombre:
                const mapped = res.data.map((c) => ({
                    id: c.id ?? c.idcliente, // compat
                    nombre: c.nombre,
                }));
                setClientes(mapped);
            } catch (err) {
                // Fallback a /clientes/options si existe en tu backend
                try {
                    const res2 = await axios.get(
                        `${API}/clientes-contacto/options`,
                        {
                            headers: getAuthHeaders(),
                        }
                    );
                    setClientes(res2.data);
                } catch (err2) {
                    alertify.error("Error al cargar clientes");
                    // console.error(err2);
                }
            }
        };

        const loadDepartamentos = async () => {
            try {
                const res = await axios.get(`${API}/departamentos/options`, {
                    headers: getAuthHeaders(),
                });
                setDepartamentos(res.data || []);
            } catch (err) {
                // Fallback alternativo si usas otro endpoint
                try {
                    const res2 = await axios.get(`${API}/lista_departamentos`, {
                        headers: getAuthHeaders(),
                    });
                    const mapped = (res2.data || []).map((d) => ({
                        id: d.id ?? d.iddepartamento,
                        nombre: d.nombre ?? d.departamento ?? d.descripcion,
                    }));
                    setDepartamentos(mapped);
                } catch (err2) {
                    alertify.error("Error al cargar departamentos");
                    // console.error(err2);
                }
            }
        };

        loadClientes();
        loadDepartamentos();
    }, [idclienteInicial]);

    // Cargar contactos del cliente seleccionado (con token)
    useEffect(() => {
        const loadContactos = async () => {
            if (!clienteId) return;
            try {
                const res = await axios.get(
                    `${API}/clientes-contacto/${clienteId}/contactos`,
                    {
                        headers: getAuthHeaders(),
                    }
                );
                setEmails(
                    (res.data.emails || []).map((e) => ({
                        ...e,
                        tmpId: e.id ?? uid(),
                    }))
                );
                setDirecciones(
                    (res.data.direcciones || []).map((d) => ({
                        ...d,
                        referencia:
                            d.referencia == null ? "" : String(d.referencia), // ←
                        ciudad: d.ciudad == null ? "" : String(d.ciudad),
                        pais: d.pais == null ? "Guatemala" : String(d.pais),
                        tmpId: d.id ?? uid(),
                    }))
                );
                setEliminarEmails([]);
                setEliminarDirecciones([]);
            } catch (err) {
                alertify.error("Error al cargar contactos del cliente");
                console.error(err);
            }
        };
        loadContactos();
    }, [clienteId]);

    // ————— Helpers principal —————
    const setEmailPrincipal = (rowIndex) => {
        setEmails((prev) =>
            prev.map((r, i) => ({ ...r, es_principal: i === rowIndex }))
        );
    };
    const setDireccionPrincipal = (rowIndex) => {
        setDirecciones((prev) =>
            prev.map((r, i) => ({ ...r, es_principal: i === rowIndex }))
        );
    };

    // ————— Columns Emails —————
    const emailColumns = useMemo(
        () => [
            {
                header: "Email",
                accessorKey: "email",
                muiEditTextFieldProps: {
                    required: true,
                    type: "email",
                    inputProps: { maxLength: 190 },
                },
                cell: ({ row }) => row.original.email || "",
            },
            {
                header: "Tipo",
                accessorKey: "tipo",
                muiEditTextFieldProps: {
                    placeholder: "facturacion/trabajo/personal",
                },
            },
            {
                header: "Principal",
                accessorKey: "es_principal",
                enableEditing: false,
                size: 60,
                Cell: ({ row }) => (
                    <Radio
                        checked={!!row.original.es_principal}
                        onChange={() => setEmailPrincipal(row.index)}
                    />
                ),
            },
        ],
        []
    );

    // ————— Columns Direcciones (Departamento como SELECT) —————
    const dirColumns = useMemo(
        () => [
            {
                header: "Dirección",
                accessorKey: "direccion",
                muiEditTextFieldProps: {
                    required: true,
                    inputProps: { maxLength: 255 },
                },
                cell: ({ row }) => row.original.direccion || "",
            },
            {
                header: "Referencia",
                accessorKey: "referencia",
                muiEditTextFieldProps: { inputProps: { maxLength: 255 } },
            },
            {
                header: "Ciudad",
                accessorKey: "ciudad",
                muiEditTextFieldProps: { inputProps: { maxLength: 80 } },
            },
            {
                header: "Departamento",
                accessorKey: "iddepartamento",
                size: 220,
                editVariant: "select",
                editSelectOptions: [
                    { value: "", label: "— Sin departamento —" },
                    ...departamentos.map((d) => ({
                        value: String(d.id),
                        label: d.nombre,
                    })),
                ],
                Cell: ({ row }) => {
                    const id = row.original.iddepartamento;
                    if (id == null || id === "") return "—";
                    return deptoById.get(Number(id)) ?? `#${id}`;
                },
            },
            {
                header: "País",
                accessorKey: "pais",
                muiEditTextFieldProps: { inputProps: { maxLength: 80 } },
                size: 120,
            },
            {
                header: "Lat",
                accessorKey: "lat",
                muiEditTextFieldProps: {
                    type: "number",
                    step: "any",
                    placeholder: "Opcional",
                },
                size: 90,
            },
            {
                header: "Lng",
                accessorKey: "lng",
                muiEditTextFieldProps: {
                    type: "number",
                    step: "any",
                    placeholder: "Opcional",
                },
                size: 90,
            },
            {
                header: "Principal",
                accessorKey: "es_principal",
                enableEditing: false,
                size: 60,
                Cell: ({ row }) => (
                    <Radio
                        checked={!!row.original.es_principal}
                        onChange={() => setDireccionPrincipal(row.index)}
                    />
                ),
            },
        ],
        [departamentos, deptoById]
    );

    // ————— Tablas MRT —————
    const tableEmails = useMaterialReactTable({
        columns: emailColumns,
        data: emails,
        getRowId: (row) => String(row.id ?? row.tmpId),
        enableEditing: true,
        editDisplayMode: "row",
        createDisplayMode: "row",
        initialState: { density: "compact" },
        positionActionsColumn: "last",
        enableRowActions: true,
        onCreatingRowSave: async ({ values, table }) => {
            const newRow = {
                id: null,
                tmpId: uid(),
                email: values.email?.trim() || "",
                tipo: values.tipo?.trim() || "",
                es_principal:
                    emails.length === 0 ? true : !!values.es_principal,
                estado: 1,
            };
            setEmails((prev) => {
                const list = [...prev, newRow];
                if (newRow.es_principal) {
                    return list.map((r, i) => ({
                        ...r,
                        es_principal: i === list.length - 1,
                    }));
                }
                return list;
            });
            table.setCreatingRow(null);
        },
        onEditingRowSave: async ({ values, row, table }) => {
            setEmails((prev) => {
                const list = prev.map((r, i) =>
                    i === row.index
                        ? {
                              ...r,
                              email: values.email?.trim() || "",
                              tipo: values.tipo?.trim() || "",
                          }
                        : r
                );
                if (values.es_principal) {
                    return list.map((r, i) => ({
                        ...r,
                        es_principal: i === row.index,
                    }));
                }
                return list;
            });
            table.setEditingRow(null);
        },
        renderTopToolbarCustomActions: ({ table }) => (
            <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={() => table.setCreatingRow(true)}
            >
                Agregar correo
            </Button>
        ),
        renderRowActions: ({ row }) => (
            <Tooltip title="Eliminar">
                <IconButton
                    color="error"
                    onClick={() => {
                        const item = emails[row.index];
                        if (item?.id) setEliminarEmails((p) => [...p, item.id]);
                        setEmails((p) => p.filter((_, i) => i !== row.index));
                    }}
                >
                    <Delete />
                </IconButton>
            </Tooltip>
        ),
        muiTableBodyRowProps: { hover: true },
    });

    const tableDirecciones = useMaterialReactTable({
        columns: dirColumns,
        data: direcciones,
        getRowId: (row) => String(row.id ?? row.tmpId),
        enableEditing: true,
        editDisplayMode: "row",
        createDisplayMode: "row",
        initialState: { density: "compact" },
        positionActionsColumn: "last",
        enableRowActions: true,
        onCreatingRowSave: async ({ values, table }) => {
            const iddep =
                values.iddepartamento === "" || values.iddepartamento == null
                    ? null
                    : Number(values.iddepartamento);

            const newRow = {
                id: null,
                tmpId: uid(),
                direccion: values.direccion?.trim() || "",
                referencia: (values.referencia ?? "").toString().trim(),
                ciudad: values.ciudad?.trim() || "",
                iddepartamento: iddep,
                pais: values.pais?.trim() || "Guatemala",
                lat:
                    values.lat === "" || values.lat == null
                        ? null
                        : Number(values.lat),
                lng:
                    values.lng === "" || values.lng == null
                        ? null
                        : Number(values.lng),
                es_principal:
                    direcciones.length === 0 ? true : !!values.es_principal,
                estado: 1,
            };
            setDirecciones((prev) => {
                const list = [...prev, newRow];
                if (newRow.es_principal) {
                    return list.map((r, i) => ({
                        ...r,
                        es_principal: i === list.length - 1,
                    }));
                }
                return list;
            });
            table.setCreatingRow(null);
        },
        onEditingRowSave: async ({ values, row, table }) => {
            const iddep =
                values.iddepartamento === "" || values.iddepartamento == null
                    ? null
                    : Number(values.iddepartamento);

            setDirecciones((prev) => {
                const list = prev.map((r, i) =>
                    i === row.index
                        ? {
                              ...r,
                              direccion: values.direccion?.trim() || "",
                              referencia: (values.referencia ?? "")
                                  .toString()
                                  .trim(),
                              ciudad: values.ciudad?.trim() || "",
                              iddepartamento: iddep,
                              pais: values.pais?.trim() || "Guatemala",
                              lat:
                                  values.lat === "" || values.lat == null
                                      ? null
                                      : Number(values.lat),
                              lng:
                                  values.lng === "" || values.lng == null
                                      ? null
                                      : Number(values.lng),
                          }
                        : r
                );
                if (values.es_principal) {
                    return list.map((r, i) => ({
                        ...r,
                        es_principal: i === row.index,
                    }));
                }
                return list;
            });
            table.setEditingRow(null);
        },
        renderTopToolbarCustomActions: ({ table }) => (
            <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={() => table.setCreatingRow(true)}
            >
                Agregar dirección
            </Button>
        ),
        renderRowActions: ({ row }) => (
            <Tooltip title="Eliminar">
                <IconButton
                    color="error"
                    onClick={() => {
                        const item = direcciones[row.index];
                        if (item?.id)
                            setEliminarDirecciones((p) => [...p, item.id]);
                        setDirecciones((p) =>
                            p.filter((_, i) => i !== row.index)
                        );
                    }}
                >
                    <Delete />
                </IconButton>
            </Tooltip>
        ),
        muiTableBodyRowProps: { hover: true },
    });

    // ————— Guardar en backend (con token) —————
    const handleSubmit = async () => {
        if (!clienteId) return alertify.warning("Selecciona un cliente.");

        const badEmail = emails.some(
            (e) => !e.email || !/^\S+@\S+\.\S+$/.test(e.email)
        );
        if (badEmail)
            return alertify.error("Hay correos con formato inválido.");
        const badDir = direcciones.some((d) => !d.direccion);
        if (badDir)
            return alertify.error(
                "Toda dirección debe tener el campo 'Dirección'."
            );

        const payload = {
            emails: emails.map((e) => ({
                id: e.id ?? null,
                email: e.email,
                tipo: e.tipo || "",
                es_principal: !!e.es_principal,
                estado: e.estado ?? 1,
            })),
            direcciones: direcciones.map((d) => ({
                id: d.id ?? null,
                direccion: d.direccion,
                referencia:
                    typeof d.referencia === "string" ? d.referencia : "",
                ciudad: d.ciudad || "",
                iddepartamento: d.iddepartamento ?? null,
                pais: d.pais || "Guatemala",
                lat: d.lat ?? null,
                lng: d.lng ?? null,
                es_principal: !!d.es_principal,
                estado: d.estado ?? 1,
            })),
            eliminarEmails,
            eliminarDirecciones,
        };

        try {
            const { data } = await axios.post(
                `${API}/clientes-contacto/${clienteId}/contactos`,
                payload,
                { headers: getAuthHeaders() }
            );

            setEmails(
                (data.emails || []).map((e) => ({ ...e, tmpId: e.id ?? uid() }))
            );
            setDirecciones(
                (data.direcciones || []).map((d) => ({
                    ...d,
                    tmpId: d.id ?? uid(),
                }))
            );
            setEliminarEmails([]);
            setEliminarDirecciones([]);
            alertify.success("Guardado correctamente.");
            onSaved?.(); // ← notifica al padre si lo envían
        } catch (err) {
            if (err.response) {
                const { status, data } = err.response;

                // Si es error de validación Laravel (422)
                if (status === 422) {
                    if (data.errors) {
                        // Recorre todos los mensajes y los muestra
                        Object.values(data.errors)
                            .flat()
                            .forEach((msg) => {
                                alertify.error(msg);
                            });
                    } else if (data.message) {
                        // Si no hay errors[] pero sí message
                        alertify.error(data.message);
                    } else {
                        alertify.error("Error de validación en el servidor.");
                    }
                }
                // Si es otro tipo de error (500, 403, etc.)
                else if (data.message) {
                    alertify.error(data.message);
                } else {
                    alertify.error("Ocurrió un error en el servidor.");
                }
            } else {
                // Error de red o sin respuesta
                alertify.error("No se pudo conectar con el servidor.");
            }

            console.error(err);
        }
    };

    return (
        // <Box sx={{ p: 2, maxWidth: 1200, mx: "auto", display: "grid", gap: 2 }}>
        <Box
            sx={{
                p: 2,
                maxWidth: "100%",
                width: "100%",
                mx: "auto",
                display: "grid",
                gap: 2,
            }}
        >
            <Header title="Datos de contacto por cliente" />
            <Typography variant="h6">
                Registro de correos y direcciones por cliente
            </Typography>

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "end",
                    gap: 2,
                }}
            >
                <FormControl fullWidth>
                    {/* <InputLabel id="cliente-label">Cliente</InputLabel>
                    <Select
                        labelId="cliente-label"
                        label="Cliente"
                        value={clienteId}
                        onChange={(e) => setClienteId(e.target.value)}
                    >
                        {clientes.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                                {c.nombre}
                            </MenuItem>
                        ))}
                    </Select> */}
                    <Autocomplete
                        options={clientes} // [{id, nombre}]
                        getOptionLabel={(o) => o?.nombre ?? ""}
                        value={clientes.find((c) => c.id === clienteId) || null}
                        onChange={(e, val) => setClienteId(val ? val.id : "")}
                        disableClearable={!!bloquearSeleccion}
                        readOnly={!!bloquearSeleccion}
                        renderInput={(params) => (
                            <TextField {...params} label="Cliente" />
                        )}
                    />
                </FormControl>

                <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSubmit}
                    disabled={!clienteId}
                >
                    Guardar cambios
                </Button>
            </Box>

            <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Correos electrónicos
                </Typography>
                <MaterialReactTable table={tableEmails} />
            </Box>

            <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Direcciones de establecimientos
                </Typography>
                <MaterialReactTable table={tableDirecciones} />
            </Box>
        </Box>
    );
}
