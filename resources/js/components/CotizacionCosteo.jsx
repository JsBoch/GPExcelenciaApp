import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    Link,
    useParams,
    useNavigate,
    useLocation,
} from "react-router-dom";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import "bootstrap/dist/css/bootstrap.min.css";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

import {
    Modal,
    ModalBody,
    ModalHeader,
    ModalFooter,
    Button,
} from "reactstrap";

import {
    Save,
    Search,
    Calculator,
    FileSpreadsheet,
    Download,
    Upload,
    Image as ImageIcon,
    MessageSquareText,
    BadgeDollarSign,
} from "lucide-react";

import "../../css/cotizacion-costeo.css";

DataTable.use(DT);

function CotizacionCosteo() {
    const [fechaActual, setFechaActual] = useState("");

    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [detalles, setDetalles] = useState([]);
    const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);

    const initialObservacionesCliente =
        location.state?.observaciones_cliente || "";

    const initialObservacionesCosteo =
        location.state?.observaciones_costeo || "";

    const [archivoExcel, setArchivoExcel] = useState(null);

    /* =========================================================
       FECHA DEL SERVIDOR
       ========================================================= */

    useEffect(() => {
        const token = localStorage.getItem("token");

        const headers = {
            Authorization: `Bearer ${token}`,
        };

        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, {
                headers,
            })
            .then((res) => {
                setFechaActual(res.data.fecha);
            })
            .catch(() => {
                const localDate = new Date()
                    .toISOString()
                    .split("T")[0];

                setFechaActual(localDate);
            });
    }, []);

    /* =========================================================
       COTIZACIÓN
       ========================================================= */

    const [cotizacion, setCotizacion] = useState({
        idcotizacion: 0,
        idcotizacionoriginal: 0,
        idcliente: "",
        cliente: "",
        idcontacto: 0,
        contacto: "",
        fecha_cotizacion: fechaActual,
        trabajo: "",
        observaciones_costeo: initialObservacionesCosteo,
        observaciones_cliente: initialObservacionesCliente,
        total_general: 0,
        costeo_observaciones: "",
        nocotizacion: "",
        version: 1,
        idtipopago: "",
        direccion_entrega: "",
        costear: "N",
    });

    /* =========================================================
       DETALLE
       ========================================================= */

    const [detalle, setDetalle] = useState({
        unidad_medida: "",
        descripcion: "",
        cantidad: 0,
        ancho: 0,
        alto: 0,
        m2: 0,
        profundidad: 0,
        precio: 0,
        total: 0,
    });

    /* =========================================================
       MODAL IMAGEN
       ========================================================= */

    const [isImageModalOpen, setIsImageModalOpen] =
        useState(false);

    const [selectedImageUrl, setSelectedImageUrl] =
        useState(null);

    const toggleImageModal = () =>
        setIsImageModalOpen(!isImageModalOpen);

    /* =========================================================
       CAMBIOS COTIZACIÓN
       ========================================================= */

    const handleChange = (e) => {
        setCotizacion({
            ...cotizacion,
            [e.target.name]: e.target.value,
        });
    };

    /* =========================================================
       GUARDAR
       ========================================================= */

    const handleSubmit = (e) => {
        e.preventDefault();

        const token = localStorage.getItem("token");

        const headers = {
            Authorization: `Bearer ${token}`,
        };

        const formData = new FormData();

        for (const key in cotizacion) {
            formData.append(key, cotizacion[key]);
        }

        formData.append("detalles", JSON.stringify(detalles));

        if (archivoExcel) {
            formData.append("archivo_costeo", archivoExcel);
        }

        if (id) {
            axios
                .post(
                    `/api/costeocotizaciones/${id}?_method=PUT`,
                    formData,
                    {
                        headers,
                        "Content-Type": "multipart/form-data",
                    }
                )
                .then((res) => {
                    alertify.success(
                        "Cotización actualizada correctamente"
                    );

                    setCotizacion(res.data);
                    setDetalles(res.data.detalles);

                    navigate("/costeocotizaciones/lista");
                })
                .catch(() => {
                    alertify.error(
                        "Error al actualizar la cotización"
                    );
                });
        } else {
            axios
                .post("/api/cotizaciones", formData, {
                    headers,
                    "Content-Type": "multipart/form-data",
                })
                .then(() => {
                    alertify.success(
                        "Cotización creada correctamente"
                    );

                    navigate("/cotizaciones/lista");
                })
                .catch((error) => {
                    console.error(
                        "Error al crear la cotización:",
                        error
                    );

                    alertify.error(
                        "Error al crear la cotización"
                    );
                });
        }
    };

    /* =========================================================
       CAMBIOS DETALLE
       ========================================================= */

    const handleDetalleChange = (e) => {
        setDetalle({
            ...detalle,
            [e.target.name]: e.target.value,
        });
    };

    /* =========================================================
       TOTAL DETALLE
       Se conserva la lógica original
       ========================================================= */

    useEffect(() => {
        const cantidadNum =
            parseFloat(detalle.cantidad) || 0;

        const precioNum =
            parseFloat(detalle.precio) || 0;

        const totalCalculado = (
            cantidadNum * precioNum
        ).toFixed(2);

        setDetalle((prevDetalle) => ({
            ...prevDetalle,
            total: totalCalculado,
        }));
    }, [detalle.precio]);

    /* =========================================================
       ASIGNAR PRECIO
       ========================================================= */

    const handleAddDetalle = () => {
        if (detalleSeleccionado) {
            const index = detalles.findIndex(
                (d) => d === detalleSeleccionado
            );

            if (index !== -1) {
                const nuevosDetalles = [...detalles];

                nuevosDetalles[index] = detalle;

                setDetalles(nuevosDetalles);
            }

            setDetalleSeleccionado(null);
        } else {
            setDetalles([...detalles, detalle]);
        }

        setDetalle({
            unidad_medida: "",
            descripcion: "",
            cantidad: 0,
            ancho: 0,
            alto: 0,
            m2: 0,
            profundidad: 0,
            precio: 0,
            total: 0,
        });
    };

    /* =========================================================
       COLUMNAS
       ========================================================= */

    const columns = [
        {
            title: "Unidad Medida",
            data: "unidad_medida",
        },
        {
            title: "Descripción",
            data: "descripcion",
        },
        {
            title: "Cantidad",
            data: "cantidad",
        },
        {
            title: "Ancho",
            data: "ancho",
        },
        {
            title: "Alto",
            data: "alto",
        },
        {
            title: "M2",
            data: "m2",
        },
        {
            title: "Profundidad",
            data: "profundidad",
        },
        {
            title: "Precio",
            data: "precio",
        },
        {
            title: "Total",
            data: "total",
        },
        {
            title: "Imagen",
            data: "imagen_ruta",
            render: (imagen_ruta) =>
                imagen_ruta ? (
                    <img
                        src={`/images_cotizaciones/${imagen_ruta}`}
                        alt="Imagen Detalle"
                        style={{ maxWidth: "50px" }}
                    />
                ) : (
                    "Sin imagen"
                ),
        },
    ];

    /* =========================================================
       CARGAR COTIZACIÓN
       ========================================================= */

    useEffect(() => {
        const token = localStorage.getItem("token");

        const headers = {
            Authorization: `Bearer ${token}`,
        };

        if (id) {
            axios
                .get(`/api/costeocotizaciones/${id}`, {
                    headers,
                })
                .then((res) => {
                    const cotizacionData = res.data;

                    setCotizacion({
                        ...cotizacionData,

                        observaciones_cliente:
                            cotizacionData.observaciones_cliente ||
                            "",

                        observaciones_costeo:
                            cotizacionData.observaciones_costeo ||
                            "",

                        costeo_observaciones:
                            cotizacionData.costeo_observaciones ||
                            "",
                    });

                    setDetalles(
                        cotizacionData.detalles
                    );
                })
                .catch((error) => {
                    console.error(
                        "Error al obtener la cotización:",
                        error
                    );

                    alertify.error(
                        "Error al obtener la cotización"
                    );
                });
        }
    }, [id]);

    /* =========================================================
       SLOTS DATATABLE
       Se conserva el comportamiento original de clic
       ========================================================= */

    const slots = {
        0: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                className="gp-costeo-cell-click"
            >
                {data}
            </div>
        ),

        1: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                className="gp-costeo-cell-click"
            >
                {data}
            </div>
        ),

        2: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                className="gp-costeo-cell-click"
            >
                {data}
            </div>
        ),

        3: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                className="gp-costeo-cell-click"
            >
                {data}
            </div>
        ),

        4: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                className="gp-costeo-cell-click"
            >
                {data}
            </div>
        ),

        5: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                className="gp-costeo-cell-click"
            >
                {data}
            </div>
        ),

        6: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                className="gp-costeo-cell-click"
            >
                {data}
            </div>
        ),

        7: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                className="gp-costeo-cell-click"
            >
                {data}
            </div>
        ),

        8: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                className="gp-costeo-cell-click"
            >
                {data}
            </div>
        ),
    };

    /* =========================================================
       SELECCIÓN DE FILA
       ========================================================= */

    const handleRowClick = (rowData) => {
        setDetalleSeleccionado(rowData);

        setDetalle({
            unidad_medida:
                rowData.unidad_medida || "",

            descripcion:
                rowData.descripcion || "",

            cantidad:
                rowData.cantidad || 0,

            ancho:
                rowData.ancho || 0,

            alto:
                rowData.alto || 0,

            m2:
                rowData.m2 || 0,

            profundidad:
                rowData.profundidad || 0,

            precio:
                rowData.precio || 0,

            total:
                rowData.total || 0,
        });

        if (rowData.imagen_ruta) {
            setSelectedImageUrl(
                `/images_cotizaciones/${rowData.imagen_ruta}`
            );

            setIsImageModalOpen(true);
        } else {
            alertify.error(
                "No hay imagen para mostrar"
            );

            setSelectedImageUrl(null);
            setIsImageModalOpen(false);
        }
    };

    /* =========================================================
       EXPORTAR EXCEL
       ========================================================= */

    const handleExportarExcel = () => {
        const token =
            localStorage.getItem("token");

        const headers = {
            Authorization: `Bearer ${token}`,
        };

        axios
            .get(`/api/exportar/cotizacion/${id}`, {
                headers,
                responseType: "blob",
            })
            .then((response) => {
                const url =
                    window.URL.createObjectURL(
                        new Blob([response.data])
                    );

                const link =
                    document.createElement("a");

                link.href = url;

                link.setAttribute(
                    "download",
                    `cotizacion_${
                        cotizacion.nocotizacion ||
                        "sin_numero"
                    }_detalles.xlsx`
                );

                document.body.appendChild(link);

                link.click();

                document.body.removeChild(link);

                window.URL.revokeObjectURL(url);
            })
            .catch((error) => {
                if (
                    error.response &&
                    error.response.data instanceof Blob
                ) {
                    const reader = new FileReader();

                    reader.onloadend = () => {
                        try {
                            const errorData =
                                JSON.parse(
                                    reader.result
                                );

                            alertify.error(
                                errorData.message ||
                                    "Error al exportar el archivo Excel"
                            );
                        } catch (e) {
                            alertify.error(
                                "Error al exportar el archivo Excel (error desconocido)"
                            );
                        }
                    };

                    reader.readAsText(
                        error.response.data
                    );
                } else {
                    alertify.error(
                        "Error al exportar el archivo Excel"
                    );
                }
            });
    };

    return (
        <div className="gp-module-page gp-costeo-form-page">
            <div className="gp-module-card gp-costeo-form-card">

                {/* =================================================
                    ENCABEZADO
                   ================================================= */}

                <div className="gp-costeo-form-header">
                    <div>
                        <div className="gp-module-meta">
                            MÓDULO · COTIZACIONES
                        </div>

                        <h1 className="gp-costeo-form-title">
                            Costeo de cotización
                        </h1>

                        <p className="gp-costeo-form-description">
                            Asigna precios a los productos,
                            documenta las observaciones del costeo
                            y adjunta el archivo final para el
                            vendedor.
                        </p>
                    </div>

                    <div className="gp-costeo-form-header-icon">
                        <Calculator size={25} />
                    </div>
                </div>

                {/* =================================================
                    RESUMEN COTIZACIÓN
                   ================================================= */}

                <div className="gp-costeo-form-summary">
                    <div className="gp-costeo-form-summary-item">
                        <span>Cotización</span>

                        <strong>
                            {cotizacion.nocotizacion ||
                                "—"}
                        </strong>
                    </div>

                    <div className="gp-costeo-form-summary-divider" />

                    <div className="gp-costeo-form-summary-item gp-costeo-form-summary-client">
                        <span>Cliente</span>

                        <strong>
                            {cotizacion.cliente || "—"}
                        </strong>
                    </div>

                    <div className="gp-costeo-form-summary-divider" />

                    <div className="gp-costeo-form-summary-item">
                        <span>Productos</span>

                        <strong>
                            {detalles.length}
                        </strong>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    encType="multipart/form-data"
                >
                    <div className="gp-module-body gp-costeo-form-body">

                        {/* =================================================
                            OBSERVACIONES RECIBIDAS
                           ================================================= */}

                        <section className="gp-costeo-section">
                            <div className="gp-costeo-section-title">
                                <div className="gp-costeo-section-title-icon">
                                    <MessageSquareText
                                        size={17}
                                    />
                                </div>

                                <div>
                                    <h2>
                                        Información para costeo
                                    </h2>

                                    <p>
                                        Observaciones recibidas
                                        con la cotización.
                                    </p>
                                </div>
                            </div>

                            <div className="gp-costeo-form-grid-2">
                                <div className="gp-costeo-field">
                                    <label>
                                        Observaciones cliente
                                    </label>

                                    <textarea
                                        rows="3"
                                        name="observaciones_cliente"
                                        value={
                                            cotizacion.observaciones_cliente
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Observaciones para cliente"
                                    />
                                </div>

                                <div className="gp-costeo-field">
                                    <label>
                                        Observaciones costeo
                                        <span className="gp-costeo-label-note">
                                            Internas
                                        </span>
                                    </label>

                                    <textarea
                                        rows="3"
                                        name="observaciones_costeo"
                                        value={
                                            cotizacion.observaciones_costeo
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Observaciones internas para costeo"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* =================================================
                            ASIGNACIÓN PRECIO
                           ================================================= */}

                        <section className="gp-costeo-section">
                            <div className="gp-costeo-section-title">
                                <div className="gp-costeo-section-title-icon">
                                    <BadgeDollarSign
                                        size={18}
                                    />
                                </div>

                                <div>
                                    <h2>
                                        Asignación de precio
                                    </h2>

                                    <p>
                                        Selecciona un producto de
                                        la tabla y asigna el precio
                                        correspondiente.
                                    </p>
                                </div>
                            </div>

                            {detalleSeleccionado && (
                                <div className="gp-costeo-selected-product">
                                    <div>
                                        <span>
                                            Producto seleccionado
                                        </span>

                                        <strong>
                                            {detalle.descripcion ||
                                                "Detalle seleccionado"}
                                        </strong>
                                    </div>

                                    <span className="gp-costeo-selected-badge">
                                        Editando precio
                                    </span>
                                </div>
                            )}

                            <div className="gp-costeo-price-row">
                                <div className="gp-costeo-field gp-costeo-price-field">
                                    <label htmlFor="precio">
                                        Precio
                                    </label>

                                    <div className="gp-costeo-price-input">
                                        <span>Q</span>

                                        <input
                                            id="precio"
                                            type="number"
                                            name="precio"
                                            value={
                                                detalle.precio
                                            }
                                            onChange={
                                                handleDetalleChange
                                            }
                                            step="0.01"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        handleAddDetalle
                                    }
                                    className={
                                        detalleSeleccionado
                                            ? "gp-action-button gp-costeo-assign-button gp-costeo-assign-edit"
                                            : "gp-action-button gp-costeo-assign-button gp-costeo-assign-new"
                                    }
                                >
                                    <BadgeDollarSign
                                        size={16}
                                    />

                                    Asignar precio
                                </button>
                            </div>
                        </section>

                        {/* =================================================
                            TABLA DETALLES
                           ================================================= */}

                        <section className="gp-costeo-section">
                            <div className="gp-costeo-section-title gp-costeo-section-title-between">
                                <div className="gp-costeo-section-title-left">
                                    <div className="gp-costeo-section-title-icon">
                                        <Calculator
                                            size={17}
                                        />
                                    </div>

                                    <div>
                                        <h2>
                                            Detalle de productos
                                        </h2>

                                        <p>
                                            Haz clic sobre un
                                            producto para
                                            seleccionarlo y
                                            consultar su imagen.
                                        </p>
                                    </div>
                                </div>

                                <span className="gp-costeo-products-count">
                                    {detalles.length}{" "}
                                    {detalles.length === 1
                                        ? "producto"
                                        : "productos"}
                                </span>
                            </div>

                            <div className="gp-costeo-details-table-wrapper">
                                <DataTable
                                    data={detalles}
                                    columns={columns}
                                    options={{
                                        paging: false,
                                        searching: false,
                                        info: false,
                                        ordering: true,
                                    }}
                                    slots={slots}
                                    className="table gp-costeo-details-table"
                                    id="tabla-detalles"
                                />
                            </div>
                        </section>

                        {/* =================================================
                            ARCHIVO COSTEO
                           ================================================= */}

                        <section className="gp-costeo-section">
                            <div className="gp-costeo-section-title">
                                <div className="gp-costeo-section-title-icon">
                                    <FileSpreadsheet
                                        size={18}
                                    />
                                </div>

                                <div>
                                    <h2>
                                        Archivo de costeo
                                    </h2>

                                    <p>
                                        Exporta los productos a
                                        Excel y adjunta el archivo
                                        trabajado antes de guardar.
                                    </p>
                                </div>
                            </div>

                            <div className="gp-costeo-excel-actions">
                                <button
                                    type="button"
                                    className="gp-costeo-excel-download"
                                    onClick={
                                        handleExportarExcel
                                    }
                                >
                                    <Download size={17} />

                                    <div>
                                        <strong>
                                            Exportar cotización
                                        </strong>

                                        <span>
                                            Descargar archivo
                                            Excel
                                        </span>
                                    </div>
                                </button>

                                <div className="gp-costeo-upload-box">
                                    <div className="gp-costeo-upload-icon">
                                        <Upload size={19} />
                                    </div>

                                    <div className="gp-costeo-upload-content">
                                        <label htmlFor="archivo_excel">
                                            Subir archivo de
                                            costeo
                                        </label>

                                        <span>
                                            Formatos permitidos:
                                            XLSX o XLS
                                        </span>

                                        <input
                                            type="file"
                                            id="archivo_excel"
                                            accept=".xlsx, .xls"
                                            onChange={(e) =>
                                                setArchivoExcel(
                                                    e.target
                                                        .files[0]
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {archivoExcel && (
                                <div className="gp-costeo-file-selected">
                                    <FileSpreadsheet
                                        size={15}
                                    />

                                    <span>
                                        Archivo seleccionado:
                                    </span>

                                    <strong>
                                        {archivoExcel.name}
                                    </strong>
                                </div>
                            )}
                        </section>

                        {/* =================================================
                            OBSERVACIONES VENDEDOR
                           ================================================= */}

                        <section className="gp-costeo-section">
                            <div className="gp-costeo-section-title">
                                <div className="gp-costeo-section-title-icon">
                                    <MessageSquareText
                                        size={17}
                                    />
                                </div>

                                <div>
                                    <h2>
                                        Observaciones para vendedor
                                    </h2>

                                    <p>
                                        Información resultante
                                        del proceso de costeo.
                                    </p>
                                </div>
                            </div>

                            <div className="gp-costeo-field gp-costeo-vendor-observation">
                                <label>
                                    Observaciones vendedor
                                </label>

                                <textarea
                                    rows="3"
                                    name="costeo_observaciones"
                                    value={
                                        cotizacion.costeo_observaciones
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Observaciones para vendedor"
                                />
                            </div>
                        </section>
                    </div>

                    {/* =================================================
                        FOOTER
                       ================================================= */}

                    <div className="gp-action-footer gp-costeo-footer">
                        <Link
                            to="/costeocotizaciones/lista"
                            className="gp-action-button gp-action-consult gp-costeo-footer-consult"
                        >
                            <Search size={17} />
                            Consultar
                        </Link>

                        <button
                            type="submit"
                            className="gp-action-button gp-action-save gp-costeo-footer-save"
                        >
                            <Save size={17} />
                            Guardar costeo
                        </button>
                    </div>
                </form>
            </div>

            {/* =================================================
                MODAL IMAGEN
               ================================================= */}

            <Modal
                isOpen={isImageModalOpen}
                toggle={toggleImageModal}
                centered
                size="lg"
                className="gp-costeo-image-modal"
                contentClassName="gp-costeo-image-modal-content"
            >
                <ModalHeader
                    toggle={toggleImageModal}
                    className="gp-costeo-image-modal-header"
                >
                    <div className="gp-costeo-image-title">
                        <ImageIcon size={19} />

                        <div>
                            <span>
                                DETALLE DE COTIZACIÓN
                            </span>

                            <strong>
                                Imagen del producto
                            </strong>
                        </div>
                    </div>
                </ModalHeader>

                <ModalBody className="gp-costeo-image-modal-body">
                    {selectedImageUrl ? (
                        <img
                            src={selectedImageUrl}
                            alt="Imagen del Detalle"
                            className="gp-costeo-detail-image"
                        />
                    ) : (
                        <div className="gp-costeo-no-image">
                            <ImageIcon size={34} />

                            <span>
                                Este detalle no tiene una
                                imagen asociada.
                            </span>
                        </div>
                    )}
                </ModalBody>

                <ModalFooter className="gp-costeo-image-modal-footer">
                    <Button
                        color="secondary"
                        size="sm"
                        onClick={toggleImageModal}
                    >
                        Cerrar
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

export default CotizacionCosteo;