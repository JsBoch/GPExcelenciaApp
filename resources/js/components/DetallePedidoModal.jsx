// DetalleCotizacionModal.js
import React, { useMemo, useState, useEffect } from "react";
import { MaterialReactTable } from "material-react-table";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from "@mui/material";
import axios from "axios";
import alertify from "alertifyjs";
import {
    Modal,
    ModalBody,
    ModalHeader,
    ModalFooter,
    Button as BootstrapButton,
} from "reactstrap";
import "../../css/tableFormat.css";
import ImagenModal from "./ImagenModal";

const DetallePedidoModal = ({ detalle, estadoPedido, nopedido, onClose }) => {
    const [detalleItems, setDetalleItems] = useState([]);
    const [totalGeneral, setTotalGeneral] = useState(0);
    const [porcentajeGlobal, setPorcentajeGlobal] = useState(0);

    useEffect(() => {
        if (Array.isArray(detalle)) {
            const normalizados = detalle.map((item) => ({
                ...item,
                precio: Number(item.precio) || 0,
                cantidad: Number(item.cantidad) || 0,
                total: Number(item.total) || 0,
                porcentaje_aplicado: Number(item.porcentaje_aplicado) || 0,
                m2: Number(item.m2) || 0,
            }));
            setDetalleItems(normalizados);
        }
    }, [detalle]);

    useEffect(() => {
        const total = detalleItems.reduce((sum, item) => {
            const subtotal = parseFloat(item.total);
            return sum + (isNaN(subtotal) ? 0 : subtotal);
        }, 0);
        setTotalGeneral(total);
    }, [detalleItems]);

    const handlePorcentajeChange = (rowIndex, nuevoPorcentaje) => {
        if (nuevoPorcentaje >= 0 && nuevoPorcentaje <= 10) {
            const items = [...detalleItems];
            const item = { ...items[rowIndex] };
            const porcentajeDecimal = nuevoPorcentaje / 100;
            const precioOriginal =
                item.precio / (1 + (item.porcentaje_aplicado || 0) / 100);
            item.precio = parseFloat(
                (precioOriginal * (1 + porcentajeDecimal)).toFixed(2),
            );
            item.porcentaje_aplicado = nuevoPorcentaje;
            item.total = parseFloat((item.precio * item.cantidad).toFixed(2));
            items[rowIndex] = item;
            setDetalleItems(items);
        }
    };

    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);

    const handleViewImage = (imagen_ruta) => {
        const url = imagen_ruta
            ? `/images_pedidosproduccion/${imagen_ruta}`
            : null;
        setSelectedImageUrl(url || null);
        setIsImageModalOpen(true);
    };

    const toggleImageModal = () => {
        setIsImageModalOpen(!isImageModalOpen);
    };

    const handleGuardarDetalle = async () => {
        const token = localStorage.getItem("token");
        const idPedidoProduccion = detalle[0]?.idpedidoproduccion;
        if (!token || !idpedidoproduccion) {
            alertify.error("Error: Token o ID no encontrados.");
            return;
        }

        try {
            const response = await axios.post(
                `/api/pedidosproduccion/${idpedidoproduccion}/detalle/guardar`,
                { detalle: detalleItems },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            alertify.success(response.data.message || "Guardado exitosamente.");
            onClose();
        } catch (error) {
            alertify.error(
                error.response?.data?.message || "Error al guardar.",
            );
        }
    };

    const aplicarPorcentajeGlobal = (nuevoPorcentaje) => {
        if (nuevoPorcentaje >= 0 && nuevoPorcentaje <= 10) {
            setPorcentajeGlobal(nuevoPorcentaje);

            const nuevosItems = detalleItems.map((item) => {
                const precioOriginal =
                    item.precio / (1 + (item.porcentaje_aplicado || 0) / 100);
                const nuevoPrecio = parseFloat(
                    (precioOriginal * (1 + nuevoPorcentaje / 100)).toFixed(2),
                );
                return {
                    ...item,
                    precio: nuevoPrecio,
                    porcentaje_aplicado: nuevoPorcentaje,
                    total: parseFloat((nuevoPrecio * item.cantidad).toFixed(2)),
                };
            });

            setDetalleItems(nuevosItems);
        }
    };

    // const columns = useMemo(
    //     () => [
    //         {
    //             accessorKey: "cantidad",
    //             header: "Cantidad",
    //         },
    //         {
    //             accessorKey: "material",
    //             header: "Material",
    //         },
    //         {
    //             accessorKey: "caras",
    //             header: "Caras",
    //         },
    //         {
    //             accessorKey: "ancho",
    //             header: "Ancho",
    //         },
    //         {
    //             accessorKey: "alto",
    //             header: "Alto",
    //         },
    //         {
    //             accessorKey: "unidad_medida",
    //             header: "Unidad de Medida",
    //         },
    //         {
    //             accessorKey: "maquina",
    //             header: "Maquina",
    //         },
    //         {
    //             accessorKey: "version",
    //             header: "Versión",
    //         },
    //         {
    //             accessorKey: "acabados",
    //             header: "Acabados",
    //         },
    //         {
    //             id: "imagen_ruta", // <- obligatorio si header no es string
    //             header: "Imagen",
    //             accessorKey: "imagen_ruta",
    //             Cell: ({ row }) => (
    //                 <button
    //                     className="btn btn-outline-info btn-sm"
    //                     onClick={() =>
    //                         handleViewImage(row.original.imagen_ruta)
    //                     }
    //                     disabled={!row.original.imagen_ruta}
    //                     title={
    //                         row.original.imagen_ruta
    //                             ? "Ver imagen"
    //                             : "Sin imagen"
    //                     }
    //                 >
    //                     <i className="fas fa-image"></i>
    //                 </button>
    //             ),
    //         },
    //     ],
    //     [detalleItems]
    // );
    const columns = useMemo(
        () => [
            { accessorKey: "cantidad", header: "Cantidad" },
            { accessorKey: "material", header: "Material" },
            { accessorKey: "caras", header: "Caras" },
            { accessorKey: "ancho", header: "Ancho" },
            { accessorKey: "alto", header: "Alto" },
            { accessorKey: "unidad_medida", header: "Unidad" },
            { accessorKey: "version", header: "Versión" },
            { accessorKey: "acabados", header: "Acabados" },
            { accessorKey: "medida_real", header: "Medida Real" },

            {
                accessorKey: "galaxy_plus",
                header: "Galaxy+",
                Cell: ({ cell }) => (cell.getValue() ? "✔" : ""),
            },
            {
                accessorKey: "uv",
                header: "UV",
                Cell: ({ cell }) => (cell.getValue() ? "✔" : ""),
            },
            {
                accessorKey: "cnc",
                header: "CNC",
                Cell: ({ cell }) => (cell.getValue() ? "✔" : ""),
            },
            {
                accessorKey: "laser",
                header: "Láser",
                Cell: ({ cell }) => (cell.getValue() ? "✔" : ""),
            },
            {
                accessorKey: "summa",
                header: "Summa",
                Cell: ({ cell }) => (cell.getValue() ? "✔" : ""),
            },

            {
                accessorKey: "imagen_ruta",
                header: "Imagen",
                Cell: ({ row }) => (
                    <button
                        className="btn btn-outline-info btn-sm"
                        onClick={() =>
                            handleViewImage(row.original.imagen_ruta)
                        }
                        disabled={!row.original.imagen_ruta}
                    >
                        <i className="fas fa-image"></i>
                    </button>
                ),
            },
        ],
        [],
    );

    return (
        <Dialog open onClose={onClose} maxWidth="xl" fullWidth>
            <DialogTitle>
                Detalle de Pedido a Producción No. {nopedido}
            </DialogTitle>
            <Box display="flex" justifyContent="flex-end" mb={2}>
                <TextField
                    label="Aplicar % a todos"
                    type="number"
                    size="small"
                    inputProps={{ min: 0, max: 10 }}
                    value={porcentajeGlobal}
                    onChange={(e) =>
                        aplicarPorcentajeGlobal(parseFloat(e.target.value))
                    }
                    style={{ width: "150px" }}
                />
            </Box>
            <DialogContent>
                <MaterialReactTable
                    columns={columns}
                    data={detalleItems}
                    enableColumnFilterModes
                    enableGlobalFilter
                    enableSorting
                    enablePagination
                    enableBottomToolbar
                    initialState={{ density: "compact" }} // menos padding
                    muiTableProps={{
                        sx: {
                            tableLayout: "auto",
                        },
                    }}
                    muiTableHeadCellProps={{
                        sx: {
                            fontSize: "0.75rem", // header más pequeño
                            borderBottom: "2px solid rgba(0,0,0,0.24)", // separador del header
                            backgroundColor: "#fafafa",
                        },
                    }}
                    muiTableBodyRowProps={{
                        sx: {
                            "& td": {
                                borderBottom: "1px solid rgba(0,0,0,0.12)", // ← línea inferior por registro
                                borderTop: 0,
                                borderLeft: 0,
                                borderRight: 0,
                            },
                            "&:last-of-type td": {
                                borderBottom: "1px solid rgba(0,0,0,0.12)", // asegura línea en la última fila
                            },
                        },
                    }}
                    muiTableBodyCellProps={{
                        sx: {
                            fontSize: "0.80rem", // cuerpo más pequeño (~12-13px)
                            py: 0.5, // menos alto de fila
                        },
                    }}
                />
                {/* <Box mt={2} textAlign="right">
                    <Typography variant="h6">
                        Total General:{" "}
                        {totalGeneral.toLocaleString("es-GT", {
                            style: "currency",
                            currency: "GTQ",
                        })}
                    </Typography>
                </Box> */}

                {isImageModalOpen && selectedImageUrl && (
                    <ImagenModal
                        imagenSrc={selectedImageUrl}
                        onClose={toggleImageModal}
                    />
                )}
            </DialogContent>
            <DialogActions>
                {/* <Button
                    variant="contained"
                    onClick={handleGuardarDetalle}
                    color="primary"
                    disabled={estadoPedido === 2 || estadoPedido === 4} 
                >
                    Guardar Cambios
                </Button> */}
                <Button onClick={onClose} color="secondary">
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DetallePedidoModal;
