import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, ModalHeader, ModalBody } from "reactstrap";
import { MaterialReactTable } from "material-react-table";
import { MRT_Localization_ES } from "material-react-table/locales/es";

import { Box, IconButton, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

const renderVariacion = (data) => (data === "S" ? "SI" : "NO");

function ListaProductosPredefinidos({
    isOpen,
    onClose,
    onProductoSeleccionado,
}) {
    const [productosPredefinidos, setProductosPredefinidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null);

    useEffect(() => {
        fetch("/i18n/Spanish.json")
            .then((response) => response.json())
            .then((data) => setSpanishTranslation(data))
            .catch((error) =>
                console.error("Error al cargar la traducción:", error)
            );
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            axios
                .get("/api/productopredefinido", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                .then((response) => {
                    setProductosPredefinidos(response.data);
                    setLoading(false);
                })
                .catch((error) => {
                    console.error(
                        "Error al obtener los productos predefinidos:",
                        error
                    );
                    setLoading(false);
                });
        } else {
            console.error("Token de autenticación no encontrado");
            setLoading(false);
        }
    }, []);

    const columns = [
        {
            accessorKey: "titulo",
            header: "Producto",
            size: 200,
            enablePinning: true,
            Cell: ({ cell }) => <strong>{cell.getValue()}</strong>,
        },
        {
            accessorKey: "unidad_medida",
            header: "UM",
            size: 60,
        },
        {
            accessorKey: "ancho",
            header: "Ancho",
            size: 60,
        },
        {
            accessorKey: "alto",
            header: "Alto",
            size: 60,
        },
        {
            accessorKey: "profundidad",
            header: "Prof.",
            size: 60,
        },
        {
            accessorKey: "variacion",
            header: "Variación",
            size: 80,
            Cell: ({ cell }) => (cell.getValue() === "S" ? "Variable" : "Fijo"),
        },
        {
            accessorKey: "precio",
            header: "Precio",
            size: 100,
            Cell: ({ cell }) =>
                parseFloat(cell.getValue() || 0).toLocaleString("es-GT", {
                    style: "currency",
                    currency: "GTQ",
                }),
        },
        {
            accessorKey: "acciones",
            header: "Acciones",
            size: 80,
            enablePinning: true,
            Cell: ({ row }) => (
                <Tooltip title="Seleccionar producto">
                    <IconButton
                        color="primary"
                        onClick={() => onProductoSeleccionado(row.original)}
                    >
                        <CheckCircleIcon />
                    </IconButton>
                </Tooltip>
            ),
        },
    ];

    const options = {
        language: spanishTranslation,
    };

    const handleRowClick = (producto) => {
        onProductoSeleccionado(producto);
    };

    const slots = {
        0: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        1: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        2: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        3: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        4: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        5: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        6: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        7: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        8: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        9: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        10: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        11: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        12: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        13: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        14: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        15: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        16: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        17: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
    };

    const exportarExcel = () => {
        const encabezados = columns
            .filter((c) => c.accessorKey !== "acciones")
            .map((c) => c.header)
            .join(",");

        const filas = productosPredefinidos
            .map((p) =>
                columns
                    .filter((c) => c.accessorKey !== "acciones")
                    .map((c) => p[c.accessorKey] ?? "")
                    .join(",")
            )
            .join("\n");

        const contenido = encabezados + "\n" + filas;

        const blob = new Blob([contenido], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `productos_predefinidos_${Date.now()}.csv`;
        link.click();
    };

    return (
        <Modal isOpen={isOpen} toggle={onClose} centered size="lg">
            <ModalHeader toggle={onClose}>
                Seleccionar Producto Predefinido
            </ModalHeader>
            <ModalBody>
                {loading ? (
                    <p className="text-center">Cargando productos...</p>
                ) : (                    
                    <MaterialReactTable
                        columns={columns}
                        data={productosPredefinidos}
                        localization={MRT_Localization_ES}
                        enableColumnFilters
                        enableStickyHeader
                        enableStickyFooter
                        enablePagination
                        enableSorting
                        enableTopToolbar
                        enableColumnActions={false}
                        enableHiding={false}
                        initialState={{
                            density: "compact",
                            pagination: { pageSize: 20 },
                            columnPinning: {
                                left: ["titulo"],
                                right: ["acciones"],
                            },
                        }}
                        muiTableBodyRowProps={({ row }) => ({
                            onDoubleClick: () =>
                                onProductoSeleccionado(row.original),
                            sx: {
                                cursor: "pointer",
                                "&:hover": {
                                    backgroundColor: "#eef5ff",
                                },
                            },
                        })}
                        renderTopToolbarCustomActions={() => (
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: "10px",
                                    padding: "8px",
                                }}
                            >
                                <Tooltip title="Exportar Excel">
                                    <IconButton
                                        color="success"
                                        onClick={exportarExcel}
                                    >
                                        <FileDownloadIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}
                    />
                )}
            </ModalBody>
        </Modal>
    );
}

export default ListaProductosPredefinidos;
