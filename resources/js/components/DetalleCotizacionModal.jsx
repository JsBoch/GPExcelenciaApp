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
import ImagenModal from "./ImagenModal";
import "../../css/detalle-cotizacion-premium.css";

const DetalleCotizacionModal = ({ detalle, estadoCotizacion, onClose }) => {
    const [detalleItems, setDetalleItems] = useState([]);
    const [totalGeneral, setTotalGeneral] = useState(0);
    const [porcentajeGlobal, setPorcentajeGlobal] = useState(0);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);

    /* -------------------------------
          NORMALIZACIÓN DE DETALLE
       ------------------------------- */
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

    /* -------------------------------
          TOTAL GENERAL
       ------------------------------- */
    useEffect(() => {
        const total = detalleItems.reduce((sum, item) => {
            const subtotal = parseFloat(item.total);
            return sum + (isNaN(subtotal) ? 0 : subtotal);
        }, 0);
        setTotalGeneral(total);
    }, [detalleItems]);

    /* -------------------------------
        CAMBIO DE PORCENTAJE POR FILA
       ------------------------------- */
    const handlePorcentajeChange = (rowIndex, nuevoPorcentaje) => {
        if (nuevoPorcentaje >= 0 && nuevoPorcentaje <= 10) {
            const items = [...detalleItems];
            const item = { ...items[rowIndex] };

            const precioOriginal =
                item.precio / (1 + (item.porcentaje_aplicado || 0) / 100);

            const porcentajeDecimal = nuevoPorcentaje / 100;

            item.precio = parseFloat(
                (precioOriginal * (1 + porcentajeDecimal)).toFixed(2)
            );
            item.porcentaje_aplicado = nuevoPorcentaje;
            item.total = parseFloat((item.precio * item.cantidad).toFixed(2));

            items[rowIndex] = item;
            setDetalleItems(items);
        }
    };

    /* -------------------------------
              VER IMAGEN
       ------------------------------- */
    const handleViewImage = (imagen_ruta) => {
        const url = imagen_ruta ? `/images_cotizaciones/${imagen_ruta}` : null;
        setSelectedImageUrl(url || null);
        setIsImageModalOpen(true);
    };

    const toggleImageModal = () => {
        setIsImageModalOpen(!isImageModalOpen);
    };

    /* -------------------------------
            GUARDAR DETALLE
       ------------------------------- */
    const handleGuardarDetalle = async () => {
        const token = localStorage.getItem("token");
        const idCotizacion = detalle[0]?.idcotizacion;

        if (!token || !idCotizacion) {
            alertify.error("Error: Token o ID no encontrados.");
            return;
        }

        try {
            const response = await axios.post(
                `/api/cotizaciones/${idCotizacion}/detalle/guardar`,
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

    /* -------------------------------
    % GLOBAL
    ------------------------------- */
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

    /* -------------------------------
              COLUMNAS TABLA
       ------------------------------- */
    const columns = useMemo(
        () => [
            { accessorKey: "producto", header: "Producto" },
            { accessorKey: "unidad_medida", header: "Unidad" },
            { accessorKey: "cantidad", header: "Cantidad" },
            { accessorKey: "ancho", header: "Ancho" },
            { accessorKey: "alto", header: "Alto" },
            { accessorKey: "m2", header: "M2" },
            { accessorKey: "profundidad", header: "Prof." },

            {
                accessorKey: "precio",
                header: "Precio Unitario",
                Cell: ({ cell }) =>
                    Number(cell.getValue()).toLocaleString("es-GT", {
                        style: "currency",
                        currency: "GTQ",
                    }),
            },

            {
                accessorKey: "porcentaje_aplicado",
                header: "Porcentaje (%)",
                Cell: ({ row }) => (
                    <TextField
                        type="number"
                        size="small"
                        inputProps={{ min: 0, max: 10 }}
                        value={row.original.porcentaje_aplicado || 0}
                        onChange={(e) =>
                            handlePorcentajeChange(
                                row.index,
                                parseFloat(e.target.value)
                            )
                        }
                    />
                ),
            },

            {
                accessorKey: "total",
                header: "Subtotal",
                Cell: ({ cell }) =>
                    Number(cell.getValue()).toLocaleString("es-GT", {
                        style: "currency",
                        currency: "GTQ",
                    }),
            },

            {
                id: "imagen_ruta",
                header: "Imagen",
                accessorKey: "imagen_ruta",
                Cell: ({ row }) => (
                    <button
                        className="detalle-image-btn"
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

    /* -------------------------------
            RENDER
       ------------------------------- */
    return (
        <Dialog
            open
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            className="detalle-modal"
        >
            <DialogTitle className="detalle-modal-title">
                Detalle de Cotización No.{" "}
                <strong>{detalle[0]?.idcotizacion}</strong>
            </DialogTitle>

            {/* % GLOBAL */}
            <Box display="flex" justifyContent="flex-end" mb={2} px={2}>
                <TextField
                    label="Aplicar % a todos"
                    type="number"
                    size="small"
                    className="detalle-input-global"
                    inputProps={{ min: 0, max: 10 }}
                    value={porcentajeGlobal}
                    onChange={(e) =>
                        aplicarPorcentajeGlobal(parseFloat(e.target.value))
                    }
                    style={{ width: "160px" }}
                />
            </Box>

            <DialogContent className="detalle-body">
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

                {/* TOTAL GENERAL */}
                <Box mt={2} textAlign="right" className="detalle-total-box">
                    <div className="label">Total General</div>
                    <div className="value">
                        {totalGeneral.toLocaleString("es-GT", {
                            style: "currency",
                            currency: "GTQ",
                        })}
                    </div>
                </Box>

                {/* MODAL DE IMAGEN */}
                {isImageModalOpen && selectedImageUrl && (
                    <ImagenModal
                        imagenSrc={selectedImageUrl}
                        onClose={toggleImageModal}
                    />
                )}
            </DialogContent>

            <DialogActions className="detalle-modal-footer">
                <Button
                    variant="contained"
                    onClick={handleGuardarDetalle}
                    className="detalle-btn detalle-btn-primary"
                    disabled={estadoCotizacion === 2 || estadoCotizacion === 4}
                >
                    Guardar Cambios
                </Button>

                <Button
                    onClick={onClose}
                    className="detalle-btn detalle-btn-close"
                >
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DetalleCotizacionModal;
