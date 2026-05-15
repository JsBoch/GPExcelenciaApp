import React, { useEffect, useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Typography,
} from "@mui/material";
import axios from "axios";
import alertify from "alertifyjs";
import ImagenModal from "./ImagenModal";

const DetallePedidoVistaModal = ({
    detalle,
    pedido,
    onClose,
}) => {
    const [detalleItems, setDetalleItems] = useState([]);
    const [areasPedido, setAreasPedido] = useState([]);
    const [mostrarAreas, setMostrarAreas] = useState(false);

    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);

    useEffect(() => {
        if (Array.isArray(detalle)) {
            setDetalleItems(detalle);
        }
    }, [detalle]);

    const formatearFecha = (fecha) => {
        if (!fecha) return "";

        const soloFecha = fecha.split(" ")[0];
        const partes = soloFecha.split("-");

        if (partes.length !== 3) return fecha;

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    const handleViewImage = (imagen_ruta) => {
        if (!imagen_ruta) {
            alertify.warning("Este item no tiene imagen.");
            return;
        }

        setSelectedImageUrl(
            `/images_pedidosproduccion/${imagen_ruta}`
        );

        setIsImageModalOpen(true);
    };

    const toggleImageModal = () => {
        setIsImageModalOpen((prev) => !prev);
    };

    const cargarAreasPedido = async () => {
        const token = localStorage.getItem("token");

        try {
            const response = await axios.get(
                `/api/pedidosproduccion/${pedido.idpedidoproduccion}/areas`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setAreasPedido(response.data || []);
            setMostrarAreas(true);

        } catch (error) {
            console.error(error);
            alertify.error("Error al consultar áreas.");
        }
    };

    return (
        <>
            <Dialog open maxWidth="xl" fullWidth onClose={onClose}>
                <DialogTitle>
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <div>
                            <Typography variant="h5">
                                PEDIDO A PRODUCCIÓN
                            </Typography>

                            <Typography variant="body2">
                                Vista tipo impresión
                            </Typography>
                        </div>

                        <Button
                            variant="contained"
                            color="warning"
                            onClick={cargarAreasPedido}
                        >
                            Ver Áreas
                        </Button>
                    </Box>
                </DialogTitle>

                <DialogContent dividers>
                    <Box
                        sx={{
                            border: "1px solid #ddd",
                            borderRadius: 2,
                            padding: 3,
                            backgroundColor: "#fff",
                        }}
                    >
                        <div className="row g-3">

                            <div className="col-md-3">
                                <strong>No. Pedido</strong>
                                <div>{pedido?.nopedido}</div>
                            </div>

                            <div className="col-md-3">
                                <strong>No. Cotización</strong>
                                <div>{pedido?.nocotizacion || "N/A"}</div>
                            </div>

                            <div className="col-md-3">
                                <strong>Fecha Pedido</strong>
                                <div>{formatearFecha(pedido?.fecha_pedido)}</div>
                            </div>

                            <div className="col-md-3">
                                <strong>Fecha Entrega</strong>
                                <div>{formatearFecha(pedido?.fecha_entrega)}</div>
                            </div>

                            <div className="col-md-6">
                                <strong>Cliente</strong>
                                <div>{pedido?.cliente}</div>
                            </div>

                            <div className="col-md-6">
                                <strong>Contacto</strong>
                                <div>{pedido?.contacto}</div>
                            </div>

                            <div className="col-md-6">
                                <strong>Trabajo</strong>
                                <div>{pedido?.trabajo}</div>
                            </div>

                            <div className="col-md-6">
                                <strong>Asesor</strong>
                                <div>{pedido?.asesor}</div>
                            </div>

                            <div className="col-md-12">
                                <strong>Dirección Entrega</strong>
                                <div>{pedido?.direccion_entrega}</div>
                            </div>

                            <div className="col-md-6">
                                <strong>Observaciones Cliente</strong>
                                <div>{pedido?.observaciones_cliente}</div>
                            </div>

                            <div className="col-md-6">
                                <strong>Observaciones Costeo</strong>
                                <div>{pedido?.observaciones_costeo}</div>
                            </div>
                        </div>

                        {mostrarAreas && (
                            <>
                                <Divider sx={{ my: 3 }} />

                                <Typography variant="h6">
                                    Áreas Asignadas
                                </Typography>

                                <ol>
                                    {areasPedido.map((area) => (
                                        <li key={area.id}>
                                            {area.nombre} (
                                            {formatearFecha(area.fecha_programada)})
                                        </li>
                                    ))}
                                </ol>
                            </>
                        )}

                        <Divider sx={{ my: 3 }} />

                        <Typography variant="h6" mb={2}>
                            Detalle del Pedido
                        </Typography>

                        <div className="table-responsive">
                            <table className="table table-bordered table-sm">
                                <thead className="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Cantidad</th>
                                        <th>Material</th>
                                        <th>Caras</th>
                                        <th>Ancho</th>
                                        <th>Alto</th>
                                        <th>Unidad</th>
                                        <th>Versión</th>
                                        <th>Acabados</th>
                                        <th>Medida Real</th>
                                        <th>Imagen</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {detalleItems.map((item, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{item.cantidad}</td>
                                            <td>{item.material}</td>
                                            <td>{item.caras}</td>
                                            <td>{item.ancho}</td>
                                            <td>{item.alto}</td>
                                            <td>{item.unidad_medida}</td>
                                            <td>{item.version}</td>
                                            <td>{item.acabados}</td>
                                            <td>{item.medida_real}</td>
                                            <td>
                                                <button
                                                    className="btn btn-outline-info btn-sm"
                                                    onClick={() =>
                                                        handleViewImage(
                                                            item.imagen_ruta
                                                        )
                                                    }
                                                    disabled={!item.imagen_ruta}
                                                >
                                                    <i className="fas fa-image"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button onClick={onClose}>
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>

            {isImageModalOpen && selectedImageUrl && (
                <ImagenModal
                    imagenSrc={selectedImageUrl}
                    onClose={toggleImageModal}
                />
            )}
        </>
    );
};

export default DetallePedidoVistaModal;