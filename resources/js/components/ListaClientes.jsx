import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Box, Button, TextField, Autocomplete } from "@mui/material";
import { MaterialReactTable } from "material-react-table";
import { Link, useNavigate } from "react-router-dom";
import { FaRegFileAlt } from "react-icons/fa";
import Header from "./Header";
import alertify from "alertifyjs";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";
import "../../css/ListaClientes.css";
import "../../css/tableFormat.css";

function ListaClientes() {
    const navigate = useNavigate();
    const [clientes, setClientes] = useState([]);
    const [filteredClientes, setFilteredClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // 🔹 Cargar clientes
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("Token de autenticación no encontrado");
            setLoading(false);
            return;
        }

        axios
            .get("/api/clientes", {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setClientes(res.data);
                setFilteredClientes(res.data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error al obtener clientes:", err);
                setLoading(false);
            });
    }, []);

    // 🔍 Filtro dinámico (nombre, NIT, correo, teléfono, razón social)
    useEffect(() => {
        if (!searchInput) {
            setFilteredClientes(clientes);
        } else {
            const term = searchInput.toLowerCase();
            setFilteredClientes(
                clientes.filter(
                    (c) =>
                        c.nombre?.toLowerCase().includes(term) ||
                        c.nit?.toLowerCase().includes(term) ||
                        c.razonsocial?.toLowerCase().includes(term) ||
                        c.telefono_uno?.toLowerCase().includes(term) ||
                        c.telefono_dos?.toLowerCase().includes(term) ||
                        c.telefono_tres?.toLowerCase().includes(term) ||
                        c.email?.toLowerCase().includes(term),
                ),
            );
        }
    }, [searchInput, clientes]);

    // 🗑️ Desactivar cliente
    const handleDesactivar = (id) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        alertify
            .confirm(
                "Confirmación",
                "¿Está seguro de que desea eliminar el registro seleccionado?",
                function () {
                    axios
                        .put(
                            `/api/clientes/desactivar/${id}`,
                            {},
                            { headers: { Authorization: `Bearer ${token}` } },
                        )
                        .then(() => {
                            setClientes((prev) =>
                                prev.filter(
                                    (c) => Number(c.idcliente) !== Number(id),
                                ),
                            );
                            alertify.success("Cliente eliminado correctamente");
                        })
                        .catch((err) =>
                            console.error("Error al eliminar cliente:", err),
                        );
                },
                function () {
                    alertify.error("Acción cancelada");
                },
            )
            .set("labels", { ok: "Sí", cancel: "No" });
    };

    // 📊 Columnas para MaterialReactTable
    const columnas = useMemo(
        () => [
            { accessorKey: "codigo", header: "Código" },
            { accessorKey: "nit", header: "NIT" },
            { accessorKey: "nombre", header: "Nombre" },
            { accessorKey: "razonsocial", header: "Razón Social" },
            { accessorKey: "direccion", header: "Dirección" },
            { accessorKey: "telefono_uno", header: "Teléfono 1" },
            { accessorKey: "telefono_dos", header: "Teléfono 2" },
            { accessorKey: "telefono_tres", header: "Teléfono 3" },
            { accessorKey: "email", header: "Correo" },
            {
                accessorKey: "fecha_ultima_compra",
                header: "Última Compra",
                Cell: ({ cell }) => {
                    const value = cell.getValue();
                    if (!value) return "";

                    return new Date(value).toLocaleDateString("es-GT", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                    });
                },
            },
            {
                header: "Acciones",
                accessorKey: "acciones",
                Cell: ({ row }) => (
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                            variant="contained"
                            size="small"
                            color="primary"
                            onClick={() =>
                                navigate(
                                    `/clientes/editar/${row.original.idcliente}`,
                                )
                            }
                        >
                            Editar
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            color="error"
                            onClick={() =>
                                handleDesactivar(row.original.idcliente)
                            }
                        >
                            Eliminar
                        </Button>
                    </Box>
                ),
            },
        ],
        [navigate],
    );

    // 💾 Exportar a Excel
    const exportToExcel = () => {
        const data = filteredClientes.map((c) => ({
            Código: c.codigo,
            NIT: c.nit,
            Nombre: c.nombre,
            "Razón Social": c.razonsocial,
            Dirección: c.direccion,
            "Teléfono 1": c.telefono_uno,
            "Teléfono 2": c.telefono_dos,
            "Teléfono 3": c.telefono_tres,
            Correo: c.email,
            "Última Compra": c.fecha_ultima_compra
                ? new Date(c.fecha_ultima_compra).toLocaleDateString("es-GT")
                : "",
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Clientes");
        XLSX.writeFile(
            wb,
            `Clientes_${new Date().toISOString().slice(0, 10)}.xlsx`,
        );
    };

    // 📄 Exportar a PDF
    const exportToPDF = () => {
        const doc = new jsPDF();
        const fecha = new Date().toLocaleString();
        doc.setFontSize(14);
        doc.text("Listado de Clientes", 14, 15);
        doc.setFontSize(10);
        doc.text(`Generado: ${fecha}`, 14, 22);

        const tableData = filteredClientes.map((c) => [
            c.codigo,
            c.nit,
            c.nombre,
            c.razonsocial,
            c.telefono_uno,
            c.email,
            c.fecha_ultima_compra
                ? new Date(c.fecha_ultima_compra).toLocaleDateString("es-GT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                  })
                : "",
        ]);

        autoTable(doc, {
            head: [
                [
                    "Código",
                    "NIT",
                    "Nombre",
                    "Razón Social",
                    "Teléfono",
                    "Correo",
                    "Última Compra",
                ],
            ],
            body: tableData,
            startY: 28,
            styles: { fontSize: 8 },
            columnStyles: {
                6: { cellWidth: 25 }, // 👈 columna fecha
            },
        });

        doc.save(`Clientes_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    // 🔐 Validar si el usuario es admin desde backend
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        axios
            .get("/api/user", {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                const user = res.data;
                if (
                    user &&
                    typeof user.name === "string" &&
                    user.name.toLowerCase() === "admin"
                ) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            })
            .catch((err) => {
                console.error("Error verificando usuario:", err);
                setIsAdmin(false);
            });
    }, []);

    if (loading) return <p>Cargando clientes...</p>;

    return (
        <div className="mt-4 px-3 px-md-4">
            <Header title="Lista de Clientes" />

            {/* 🔍 Autocompletar búsqueda */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 3,
                    mt: 3,
                }}
            >
                <Autocomplete
                    fullWidth
                    options={clientes}
                    getOptionLabel={(o) => o?.nombre ?? ""}
                    isOptionEqualToValue={(o, v) =>
                        String(o.idcliente) === String(v.idcliente)
                    }
                    value={selectedCliente}
                    onChange={(_, val) => {
                        setSelectedCliente(val);
                        setSearchInput(val?.nombre ?? "");
                    }}
                    inputValue={searchInput}
                    onInputChange={(_, val) => setSearchInput(val)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Buscar cliente"
                            placeholder="Nombre, NIT, teléfono o correo..."
                        />
                    )}
                />
            </Box>

            {/* 📋 Tabla moderna con exportación */}
            <MaterialReactTable
                columns={columnas}
                data={filteredClientes}
                enablePagination
                enableSorting
                enableColumnResizing
                muiTableContainerProps={{ sx: { maxHeight: 600 } }}
                initialState={{
                    pagination: { pageSize: 15 },
                }}
                renderTopToolbarCustomActions={() => (
                    <Box sx={{ display: "flex", gap: 2 }}>
                        <Button
                            variant="outlined"
                            color="success"
                            onClick={exportToExcel}
                        >
                            Exportar Excel
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={exportToPDF}
                        >
                            Exportar PDF
                        </Button>
                    </Box>
                )}
            />

            {/* 🟢 Botón nuevo cliente */}
            <div
                className="mt-4 p-3 border rounded shadow-sm bg-light"
                style={{ borderColor: "#ddd" }}
            >
                <div className="d-flex flex-wrap gap-2 justify-content-between">
                    <Link
                        to="/clientes/crear"
                        className="btn btn-success d-flex align-items-end justify-content-center gap-2 flex-fill"
                        style={{ minWidth: "150px" }}
                    >
                        <FaRegFileAlt /> Registro de Clientes
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ListaClientes;
