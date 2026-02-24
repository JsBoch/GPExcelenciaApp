import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    IconButton,
    TextField,
    Typography,
} from "@mui/material";
import { MaterialReactTable } from "material-react-table";
import { Edit, Delete } from "lucide-react";
import axios from "axios";
import alertify from "alertifyjs";
import Header from "./Header";
import { useNavigate } from "react-router-dom";

function ListaAreaTrabajo() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/area_trabajo", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRows(res.data || []);
        } catch (e) {
            alertify.error("Error cargando áreas");
        } finally {
            setLoading(false);
        }
    };

    const handleDesactivar = async (id) => {
        alertify.confirm(
            "Confirmación",
            "¿Está seguro de desactivar esta área?",
            async () => {
                try {
                    const token = localStorage.getItem("token");
                    await axios.put(
                        `/api/area_trabajo/desactivar/${id}`,
                        {},
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    setRows((prev) =>
                        prev.filter((x) => Number(x.id_areatrabajo) !== Number(id))
                    );

                    alertify.success("Área desactivada");
                } catch (e) {
                    alertify.error("Error desactivando");
                }
            },
            () => {}
        );
    };

    const columns = useMemo(
        () => [
            { accessorKey: "id_areatrabajo", header: "ID", size: 80 },
            { accessorKey: "nombre", header: "Nombre", size: 220 },
            { accessorKey: "descripcion", header: "Descripción", size: 300 },
            { accessorKey: "usuario_registro", header: "Usuario", size: 140 },
            { accessorKey: "fecha_registro", header: "Fecha", size: 160 },
            {
                header: "Acciones",
                size: 120,
                Cell: ({ row }) => (
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton
                            color="primary"
                            onClick={() =>
                                navigate(`/area_trabajo/editar/${row.original.id_areatrabajo}`)
                            }
                        >
                            <Edit size={18} />
                        </IconButton>

                        <IconButton
                            color="error"
                            onClick={() =>
                                handleDesactivar(row.original.id_areatrabajo)
                            }
                        >
                            <Delete size={18} />
                        </IconButton>
                    </Box>
                ),
            },
        ],
        []
    );

    const dataFiltrada = useMemo(() => {
        const s = busqueda
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        if (!s) return rows;

        return rows.filter((r) => {
            const nombre = (r.nombre ?? "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            const desc = (r.descripcion ?? "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            return nombre.includes(s) || desc.includes(s);
        });
    }, [rows, busqueda]);

    return (
        <Box className="mt-4 px-3 px-md-4">
            <Header title="Lista de Áreas de Trabajo" />

            <Card className="mt-4 mb-4 shadow-sm">
                <CardContent>
                    <TextField
                        fullWidth
                        label="Buscar por nombre o descripción"
                        placeholder="Ej: CARPINTERIA, IMPRESIÓN..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardContent>
                    {loading ? (
                        <Typography className="text-center py-4" color="text.secondary">
                            Cargando...
                        </Typography>
                    ) : (
                        <MaterialReactTable
                            columns={columns}
                            data={dataFiltrada}
                            enableColumnFilters={true}
                            enablePagination={true}
                            enableSorting={true}
                            muiTablePaperProps={{ elevation: 0 }}
                            initialState={{ density: "compact" }}
                        />
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}

export default ListaAreaTrabajo;