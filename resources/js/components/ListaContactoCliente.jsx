import React, { useState, useEffect } from "react";
import {
    Autocomplete,
    TextField,
    Card,
    CardContent,
    CircularProgress,
    Box,
    Typography,
    IconButton,
} from "@mui/material";
import { MaterialReactTable } from "material-react-table";
import { Edit, Delete } from "lucide-react";
import axios from "axios";
import alertify from "alertifyjs";
import Header from "./Header";
import { useNavigate } from "react-router-dom";
import { createFilterOptions } from "@mui/material/Autocomplete";

function ListaContactoCliente() {
    const [clientes, setClientes] = useState([]);
    const [contactos, setContactos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchClientes();
    }, []);

    const fetchClientes = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/lista_clientes", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setClientes(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error cargando clientes", error);
            setLoading(false);
        }
    };

    const fetchContactos = async (idcliente) => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(
                `/api/contacto_cliente/cliente/${idcliente}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setContactos(res.data);
        } catch (error) {
            console.error("Error cargando contactos", error);
        }
    };

    // const filterOptions = createFilterOptions({
    //     stringify: (option) => `${option.nombre} ${option.nit}`.toLowerCase(),
    //     trim: true,
    // });

    const handleDesactivar = async (id) => {
        alertify.confirm(
            "Confirmación",
            "¿Está seguro de eliminar este contacto?",
            async () => {
                try {
                    const token = localStorage.getItem("token");
                    await axios.put(
                        `/api/contacto_cliente/desactivar/${id}`,
                        {},
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );

                    setContactos((prev) =>
                        prev.filter(
                            (c) => Number(c.id_contactocliente) !== Number(id)
                        )
                    );

                    alertify.success("Contacto eliminado");
                } catch (error) {
                    alertify.error("Error eliminando");
                }
            },
            () => {}
        );
    };

    const columns = [
        { accessorKey: "id_contactocliente", header: "ID", size: 80 },
        { accessorKey: "nombre", header: "Nombre", size: 200 },
        { accessorKey: "telefono", header: "Teléfono", size: 130 },
        { accessorKey: "correo", header: "Correo", size: 200 },
        { accessorKey: "puesto", header: "Puesto", size: 150 },
        { accessorKey: "observaciones", header: "Observaciones", size: 220 },
        {
            header: "Acciones",
            size: 120,
            Cell: ({ row }) => (
                <Box sx={{ display: "flex", gap: 1 }}>
                    <IconButton
                        color="primary"
                        onClick={() =>
                            navigate(
                                `/contacto_cliente/editar/${row.original.id_contactocliente}`
                            )
                        }
                    >
                        <Edit size={18} />
                    </IconButton>

                    <IconButton
                        color="error"
                        onClick={() =>
                            handleDesactivar(row.original.id_contactocliente)
                        }
                    >
                        <Delete size={18} />
                    </IconButton>
                </Box>
            ),
        },
    ];

    const filterOptions = (options, { inputValue }) => {
        const search = inputValue
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        return options.filter((opt) => {
            const nombre = opt.nombre
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            const nit = (opt.nit ?? "").toLowerCase();

            return nombre.includes(search) || nit.includes(search);
        });
    };

    return (
        <Box className="mt-4 px-3 px-md-4">
            <Header title="Lista de Contactos de Clientes" />

            {/* AUTOCOMPLETE */}
            <Card className="mt-4 mb-4 shadow-sm">
                <CardContent>
                    <Autocomplete
                        options={clientes}
                        loading={loading}
                        getOptionKey={(option) => option.idcliente}
                        filterOptions={filterOptions}
                        getOptionLabel={(option) =>
                            `${option.nombre} — NIT: ${option.nit}`
                        }
                        onChange={(_, val) => {
                            setClienteSeleccionado(val);
                            if (val) fetchContactos(val.idcliente);
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Buscar Cliente por Nombre o NIT"
                                placeholder="Ejemplo: Juan, 4245265, cf"
                            />
                        )}
                    />
                </CardContent>
            </Card>

            {/* TABLA */}
            <Card className="shadow-sm">
                <CardContent>
                    {clienteSeleccionado ? (
                        <MaterialReactTable
                            columns={columns}
                            data={contactos}
                            enableColumnFilters={true}
                            enablePagination={true}
                            enableSorting={true}
                            muiTablePaperProps={{ elevation: 0 }}
                            initialState={{ density: "compact" }}
                        />
                    ) : (
                        <Typography
                            variant="body1"
                            color="text.secondary"
                            className="text-center py-4"
                        >
                            Seleccione un cliente para ver sus contactos.
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}

export default ListaContactoCliente;
