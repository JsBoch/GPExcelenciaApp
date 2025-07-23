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

const DetallePedidoModal = ({ detalle, estadoPedido,nopedido, onClose }) => {
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
                (precioOriginal * (1 + porcentajeDecimal)).toFixed(2)
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
        const url = imagen_ruta ? `/images_pedidosproduccion/${imagen_ruta}` : null;
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
                }
            );
            alertify.success(response.data.message || "Guardado exitosamente.");
            onClose();
        } catch (error) {
            alertify.error(
                error.response?.data?.message || "Error al guardar."
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
                    (precioOriginal * (1 + nuevoPorcentaje / 100)).toFixed(2)
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

    const columns = useMemo(
        () => [
            {
                accessorKey: "cantidad",
                header: "Cantidad",
            },
            {
                accessorKey: "material",
                header: "Material",
            },
            // {
            //   accessorKey: 'titulo',
            //   header: 'Título',
            // },
            // {
            //   accessorKey: 'descripcion',
            //   header: 'Descripción',
            // },
            {
                accessorKey: "caras",
                header: "Caras",
            },
            {
                accessorKey: "ancho",
                header: "Ancho",
            },
            {
                accessorKey: "alto",
                header: "Alto",
            },
            {
                accessorKey: "unidad_medida",
                header: "Unidad de Medida",
            },
            {
                accessorKey: "maquina",
                header: "Maquina",
            },
            {
                accessorKey: "version",
                header: "Versión",
            },
            {
                accessorKey: "acabados",
                header: "Acabados",
            },
            // {
            //     accessorKey: "precio",
            //     header: "Precio Unitario",
            //     Cell: ({ cell }) =>
            //         Number(cell.getValue()).toLocaleString("es-GT", {
            //             style: "currency",
            //             currency: "GTQ",
            //         }),
            // },
            // {
            //     accessorKey: "porcentaje_aplicado",
            //     header: "Porcentaje (%)",
            //     Cell: ({ row }) => (
            //         <TextField
            //             type="number"
            //             size="small"
            //             inputProps={{ min: 0, max: 10 }}
            //             value={row.original.porcentaje_aplicado || 0}
            //             onChange={(e) =>
            //                 handlePorcentajeChange(
            //                     row.index,
            //                     parseFloat(e.target.value)
            //                 )
            //             }
            //         />
            //     ),
            // },
            // {
            //     accessorKey: "total",
            //     header: "Subtotal",
            //     Cell: ({ cell }) =>
            //         Number(cell.getValue()).toLocaleString("es-GT", {
            //             style: "currency",
            //             currency: "GTQ",
            //         }),
            // },
            {
                id: "imagen_ruta", // <- obligatorio si header no es string
                header: "Imagen",
                accessorKey: "imagen_ruta",
                Cell: ({ row }) => (
                    <button
                        className="btn btn-outline-info btn-sm"
                        onClick={() =>
                            handleViewImage(row.original.imagen_ruta)
                        }
                        disabled={!row.original.imagen_ruta}
                        title={
                            row.original.imagen_ruta
                                ? "Ver imagen"
                                : "Sin imagen"
                        }
                    >
                        <i className="fas fa-image"></i>
                    </button>
                ),
            },
        ],
        [detalleItems]
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
                    muiTableProps={{
                        sx: {
                            zIndex: 1040,
                            tableLayout: "auto",
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
