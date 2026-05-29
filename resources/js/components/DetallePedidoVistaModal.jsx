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
import NotaEnvioPDF from "./NotaEnvioPDF";
import NotaEnvioPDFHalf from "./NotaEnvioPDFHalf";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";

const DetallePedidoVistaModal = ({ detalle, pedido, onClose }) => {
    const [detalleItems, setDetalleItems] = useState([]);
    const [areasPedido, setAreasPedido] = useState([]);
    const [mostrarAreas, setMostrarAreas] = useState(false);

    const [documentosPedido, setDocumentosPedido] = useState([]);
    const [tituloDocumentos, setTituloDocumentos] = useState("");
    const [modalDocumentosVisible, setModalDocumentosVisible] = useState(false);

    const [notaEnvioPayload, setNotaEnvioPayload] = useState(null);

    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);

    const [justificacionDocumento, setJustificacionDocumento] = useState("");

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

        setSelectedImageUrl(`/images_pedidosproduccion/${imagen_ruta}`);

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
                },
            );

            setAreasPedido(response.data || []);
            setMostrarAreas(true);
        } catch (error) {
            console.error(error);
            alertify.error("Error al consultar áreas.");
        }
    };

    const verPermisos = async () => {
        const token = localStorage.getItem("token");

        try {
            const response = await axios.get(
                `/api/pedidosproduccion/${pedido.idpedidoproduccion}/permisos`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setTituloDocumentos("Permisos");
            setDocumentosPedido(response.data);
            setJustificacionDocumento(
                pedido?.permisos_estado === "PENDIENTE"
                    ? pedido?.permisos_justificacion || ""
                    : "",
            );
            setModalDocumentosVisible(true);
        } catch (error) {
            alertify.error("Error al obtener permisos.");
        }
    };

    const verMontajes = async () => {
        const token = localStorage.getItem("token");

        try {
            const response = await axios.get(
                `/api/pedidosproduccion/${pedido.idpedidoproduccion}/montajes`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setTituloDocumentos("Montajes");
            setDocumentosPedido(response.data);
            setJustificacionDocumento(
                pedido?.montajes_estado === "PENDIENTE"
                    ? pedido?.montajes_justificacion || ""
                    : "",
            );

            setModalDocumentosVisible(true);
        } catch (error) {
            alertify.error("Error al obtener montajes.");
        }
    };

    const verNotaEnvio = async () => {
        const token = localStorage.getItem("token");

        try {
            const response = await axios.post(
                `/api/cotizaciones/${pedido.idcotizacion}/nota-envio/reimprimir`,
                {
                    no_envio: Number(pedido.no_envio_asociado),
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setNotaEnvioPayload(response.data);
        } catch (error) {
            alertify.error("No se pudo generar la nota de envío.");
        }
    };

    const itemsNotaEnvio = notaEnvioPayload?.items ?? [];

    const useHalfLetter = itemsNotaEnvio.length <= 8;

    const PdfComponent = useHalfLetter ? NotaEnvioPDFHalf : NotaEnvioPDF;

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

                        <Box display="flex" gap={1} flexWrap="wrap">
                            <Button
                                variant="contained"
                                color="warning"
                                onClick={cargarAreasPedido}
                            >
                                Áreas
                            </Button>

                            <Button
                                variant="contained"
                                color="secondary"
                                disabled={!pedido?.no_envio_asociado}
                                onClick={verNotaEnvio}
                            >
                                Nota Envío
                            </Button>

                            <Button
                                variant="contained"
                                color="info"
                                disabled={
                                    Number(pedido?.total_permisos) === 0 &&
                                    pedido?.permisos_estado !== "PENDIENTE"
                                }
                                onClick={verPermisos}
                            >
                                Permisos ({pedido?.total_permisos || 0})
                            </Button>

                            <Button
                                variant="contained"
                                color="success"
                                disabled={
                                    Number(pedido?.total_montajes) === 0 &&
                                    pedido?.montajes_estado !== "PENDIENTE"
                                }
                                onClick={verMontajes}
                            >
                                Montajes ({pedido?.total_montajes || 0})
                            </Button>
                        </Box>
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
                                <div>
                                    {formatearFecha(pedido?.fecha_pedido)}
                                </div>
                            </div>

                            <div className="col-md-3">
                                <strong>Fecha Entrega</strong>
                                <div>
                                    {formatearFecha(pedido?.fecha_entrega)}
                                </div>
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
                                            {formatearFecha(
                                                area.fecha_programada,
                                            )}
                                            )
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
                                        <th>Máquinas</th>
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
                                                {item.maquinas_texto || "-"}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-outline-info btn-sm"
                                                    onClick={() =>
                                                        handleViewImage(
                                                            item.imagen_ruta,
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
                    <Button onClick={onClose}>Cerrar</Button>
                </DialogActions>

                {notaEnvioPayload && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            backgroundColor: "rgba(0,0,0,0.5)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 1000,
                        }}
                    >
                        <div
                            style={{
                                width: "80%",
                                height: "80%",
                            }}
                        >
                            <PDFViewer width="100%" height="100%">
                                <PdfComponent data={notaEnvioPayload} />
                            </PDFViewer>
                        </div>

                        <div className="mt-3 d-flex gap-2">
                            <PDFDownloadLink
                                document={
                                    <PdfComponent data={notaEnvioPayload} />
                                }
                                fileName={`nota-envio-${notaEnvioPayload.no_envio}.pdf`}
                                className="btn btn-primary"
                            >
                                {({ loading }) =>
                                    loading
                                        ? "Generando PDF..."
                                        : "Descargar Nota"
                                }
                            </PDFDownloadLink>

                            <button
                                className="btn btn-danger"
                                onClick={() => setNotaEnvioPayload(null)}
                            >
                                Cerrar PDF
                            </button>
                        </div>
                    </div>
                )}

                {modalDocumentosVisible && (
                    <>
                        <div className="modal fade show d-block">
                            <div className="modal-dialog modal-lg">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">
                                            {tituloDocumentos}
                                        </h5>

                                        <button
                                            className="btn-close"
                                            onClick={() =>
                                                setModalDocumentosVisible(false)
                                            }
                                        />
                                    </div>

                                    <div className="modal-body">
                                        {documentosPedido.length === 0 ? (
                                            <>
                                                <div className="alert alert-warning">
                                                    No existen archivos
                                                    adjuntos.
                                                </div>

                                                {justificacionDocumento && (
                                                    <div className="alert alert-info">
                                                        <strong>
                                                            Justificación:
                                                        </strong>
                                                        <br />
                                                        {justificacionDocumento}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <table className="table table-bordered">
                                                <thead>
                                                    <tr>
                                                        <th>Archivo</th>
                                                        <th width="120">
                                                            Acción
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {documentosPedido.map(
                                                        (archivo) => (
                                                            <tr
                                                                key={
                                                                    archivo.idarchivo
                                                                }
                                                            >
                                                                <td>
                                                                    {
                                                                        archivo.nombre_archivo
                                                                    }
                                                                </td>

                                                                <td>
                                                                    <a
                                                                        href={
                                                                            archivo.url
                                                                        }
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="btn btn-primary btn-sm"
                                                                    >
                                                                        Ver
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>

                                    <div className="modal-footer">
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() =>
                                                setModalDocumentosVisible(false)
                                            }
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-backdrop fade show"></div>
                    </>
                )}
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
