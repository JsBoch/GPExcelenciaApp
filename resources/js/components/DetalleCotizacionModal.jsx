import React, {
    useMemo,
    useState,
    useEffect,
} from "react";

import {
    MaterialReactTable,
} from "material-react-table";

import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Tooltip,
    IconButton,
} from "@mui/material";

import {
    Save,
    X,
    Image as ImageIcon,
    Percent,
    ReceiptText,
} from "lucide-react";

import axios from "axios";
import alertify from "alertifyjs";

import ImagenModal from "./ImagenModal";

import "../../css/detalle-cotizacion-premium.css";

const DetalleCotizacionModal = ({
    detalle,
    estadoCotizacion,
    onClose,
}) => {
    const [
        detalleItems,
        setDetalleItems,
    ] = useState([]);

    const [
        totalGeneral,
        setTotalGeneral,
    ] = useState(0);

    const [
        porcentajeGlobal,
        setPorcentajeGlobal,
    ] = useState(0);

    const [
        isImageModalOpen,
        setIsImageModalOpen,
    ] = useState(false);

    const [
        selectedImageUrl,
        setSelectedImageUrl,
    ] = useState(null);

    /* =========================================================
       NORMALIZACIÓN
       ========================================================= */

    useEffect(() => {
        if (Array.isArray(detalle)) {
            const normalizados =
                detalle.map((item) => ({
                    ...item,

                    precio:
                        Number(item.precio) || 0,

                    cantidad:
                        Number(item.cantidad) || 0,

                    total:
                        Number(item.total) || 0,

                    porcentaje_aplicado:
                        Number(
                            item.porcentaje_aplicado
                        ) || 0,

                    m2:
                        Number(item.m2) || 0,
                }));

            setDetalleItems(
                normalizados
            );
        }
    }, [detalle]);

    /* =========================================================
       TOTAL
       ========================================================= */

    useEffect(() => {
        const total =
            detalleItems.reduce(
                (sum, item) => {
                    const subtotal =
                        parseFloat(
                            item.total
                        );

                    return (
                        sum +
                        (isNaN(
                            subtotal
                        )
                            ? 0
                            : subtotal)
                    );
                },
                0
            );

        setTotalGeneral(total);
    }, [detalleItems]);

    /* =========================================================
       PORCENTAJE POR FILA
       ========================================================= */

    const handlePorcentajeChange = (
        rowIndex,
        nuevoPorcentaje
    ) => {
        if (
            nuevoPorcentaje >= 0 &&
            nuevoPorcentaje <= 10
        ) {
            const items = [
                ...detalleItems,
            ];

            const item = {
                ...items[rowIndex],
            };

            const precioOriginal =
                item.precio /
                (1 +
                    (item.porcentaje_aplicado ||
                        0) /
                        100);

            const porcentajeDecimal =
                nuevoPorcentaje /
                100;

            item.precio =
                parseFloat(
                    (
                        precioOriginal *
                        (1 +
                            porcentajeDecimal)
                    ).toFixed(2)
                );

            item.porcentaje_aplicado =
                nuevoPorcentaje;

            item.total =
                parseFloat(
                    (
                        item.precio *
                        item.cantidad
                    ).toFixed(2)
                );

            items[rowIndex] =
                item;

            setDetalleItems(items);
        }
    };

    /* =========================================================
       IMAGEN
       ========================================================= */

    const handleViewImage = (
        imagen_ruta
    ) => {
        const url =
            imagen_ruta
                ? `/images_cotizaciones/${imagen_ruta}`
                : null;

        setSelectedImageUrl(
            url || null
        );

        setIsImageModalOpen(
            true
        );
    };

    const toggleImageModal = () => {
        setIsImageModalOpen(
            (prev) => !prev
        );
    };

    /* =========================================================
       GUARDAR
       ========================================================= */

    const handleGuardarDetalle =
        async () => {
            const token =
                localStorage.getItem(
                    "token"
                );

            const idCotizacion =
                detalle[0]
                    ?.idcotizacion;

            if (
                !token ||
                !idCotizacion
            ) {
                alertify.error(
                    "Error: Token o ID no encontrados."
                );

                return;
            }

            try {
                const response =
                    await axios.post(
                        `/api/cotizaciones/${idCotizacion}/detalle/guardar`,
                        {
                            detalle:
                                detalleItems,
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );

                alertify.success(
                    response.data
                        .message ||
                        "Guardado exitosamente."
                );

                onClose();
            } catch (error) {
                alertify.error(
                    error.response
                        ?.data
                        ?.message ||
                        "Error al guardar."
                );
            }
        };

    /* =========================================================
       PORCENTAJE GLOBAL
       ========================================================= */

    const aplicarPorcentajeGlobal = (
        nuevoPorcentaje
    ) => {
        if (
            nuevoPorcentaje >= 0 &&
            nuevoPorcentaje <= 10
        ) {
            setPorcentajeGlobal(
                nuevoPorcentaje
            );

            const nuevosItems =
                detalleItems.map(
                    (item) => {
                        const precioOriginal =
                            item.precio /
                            (1 +
                                (item.porcentaje_aplicado ||
                                    0) /
                                    100);

                        const nuevoPrecio =
                            parseFloat(
                                (
                                    precioOriginal *
                                    (1 +
                                        nuevoPorcentaje /
                                            100)
                                ).toFixed(
                                    2
                                )
                            );

                        return {
                            ...item,

                            precio:
                                nuevoPrecio,

                            porcentaje_aplicado:
                                nuevoPorcentaje,

                            total:
                                parseFloat(
                                    (
                                        nuevoPrecio *
                                        item.cantidad
                                    ).toFixed(
                                        2
                                    )
                                ),
                        };
                    }
                );

            setDetalleItems(
                nuevosItems
            );
        }
    };

    /* =========================================================
       COLUMNAS
       ========================================================= */

    const columns =
        useMemo(
            () => [
                {
                    accessorKey:
                        "producto",

                    header:
                        "Producto",

                    size: 250,
                },

                {
                    accessorKey:
                        "unidad_medida",

                    header:
                        "Unidad",

                    size: 90,
                },

                {
                    accessorKey:
                        "cantidad",

                    header:
                        "Cantidad",

                    size: 85,
                },

                {
                    accessorKey:
                        "ancho",

                    header:
                        "Ancho",

                    size: 75,
                },

                {
                    accessorKey:
                        "alto",

                    header:
                        "Alto",

                    size: 75,
                },

                {
                    accessorKey:
                        "m2",

                    header:
                        "M²",

                    size: 75,
                },

                {
                    accessorKey:
                        "profundidad",

                    header:
                        "Prof.",

                    size: 75,
                },

                {
                    accessorKey:
                        "precio",

                    header:
                        "Precio Unitario",

                    size: 125,

                    Cell: ({
                        cell,
                    }) =>
                        Number(
                            cell.getValue()
                        ).toLocaleString(
                            "es-GT",
                            {
                                style: "currency",
                                currency:
                                    "GTQ",
                            }
                        ),
                },

                {
                    accessorKey:
                        "porcentaje_aplicado",

                    header:
                        "%",

                    size: 90,

                    Cell: ({
                        row,
                    }) => (
                        <div className="detalle-percent-cell">
                            <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.01"
                                value={
                                    row
                                        .original
                                        .porcentaje_aplicado ||
                                    0
                                }
                                onChange={(
                                    e
                                ) =>
                                    handlePorcentajeChange(
                                        row.index,
                                        parseFloat(
                                            e
                                                .target
                                                .value
                                        )
                                    )
                                }
                                className="detalle-percent-input"
                            />

                            <span>
                                %
                            </span>
                        </div>
                    ),
                },

                {
                    accessorKey:
                        "total",

                    header:
                        "Subtotal",

                    size: 125,

                    Cell: ({
                        cell,
                    }) => (
                        <strong className="detalle-subtotal">
                            {Number(
                                cell.getValue()
                            ).toLocaleString(
                                "es-GT",
                                {
                                    style: "currency",
                                    currency:
                                        "GTQ",
                                }
                            )}
                        </strong>
                    ),
                },

                {
                    id: "imagen_ruta",

                    header:
                        "Imagen",

                    accessorKey:
                        "imagen_ruta",

                    size: 80,

                    enableSorting:
                        false,

                    Cell: ({
                        row,
                    }) => (
                        <Tooltip
                            title={
                                row
                                    .original
                                    .imagen_ruta
                                    ? "Ver imagen"
                                    : "Sin imagen"
                            }
                            arrow
                        >
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={
                                        !row
                                            .original
                                            .imagen_ruta
                                    }
                                    className="detalle-image-btn"
                                    onClick={() =>
                                        handleViewImage(
                                            row
                                                .original
                                                .imagen_ruta
                                        )
                                    }
                                >
                                    <ImageIcon
                                        size={
                                            17
                                        }
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>
                    ),
                },
            ],
            [detalleItems]
        );

    /* =========================================================
       PERMISO EDICIÓN
       ========================================================= */

    const guardarDeshabilitado =
        Number(estadoCotizacion) ===
            2 ||
        Number(estadoCotizacion) ===
            4;

    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <Dialog
            open
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            className="detalle-modal"
            PaperProps={{
                className:
                    "detalle-modal-paper",
            }}
        >
            {/* =================================================
                HEADER
               ================================================= */}

            <DialogTitle className="detalle-modal-title">
                <div className="detalle-modal-heading">
                    <div className="detalle-modal-title-icon">
                        <ReceiptText
                            size={20}
                        />
                    </div>

                    <div>
                        <span className="detalle-modal-eyebrow">
                            Cotizaciones
                        </span>

                        <h2>
                            Detalle de
                            cotización
                        </h2>

                        <p>
                            Cotización No.{" "}
                            <strong>
                                {detalle[0]
                                    ?.idcotizacion ||
                                    "—"}
                            </strong>
                        </p>
                    </div>
                </div>

                <IconButton
                    onClick={
                        onClose
                    }
                    className="detalle-modal-close-icon"
                >
                    <X
                        size={19}
                    />
                </IconButton>
            </DialogTitle>

            {/* =================================================
                TOOLBAR
               ================================================= */}

            <div className="detalle-toolbar">
                <div className="detalle-toolbar-info">
                    <span>
                        {detalleItems.length}
                    </span>

                    producto
                    {detalleItems.length ===
                    1
                        ? ""
                        : "s"}{" "}
                    en la cotización
                </div>

                <div className="detalle-global-percent">
                    <div className="detalle-global-percent-icon">
                        <Percent
                            size={16}
                        />
                    </div>

                    <div>
                        <label>
                            Aplicar porcentaje
                            global
                        </label>

                        <span>
                            Máximo 10%
                        </span>
                    </div>

                    <div className="detalle-global-percent-input">
                        <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.01"
                            value={
                                porcentajeGlobal
                            }
                            onChange={(
                                e
                            ) => {
                                const value =
                                    parseFloat(
                                        e
                                            .target
                                            .value
                                    );

                                if (
                                    !isNaN(
                                        value
                                    )
                                ) {
                                    aplicarPorcentajeGlobal(
                                        value
                                    );
                                }
                            }}
                        />

                        <span>
                            %
                        </span>
                    </div>
                </div>
            </div>

            {/* =================================================
                CONTENIDO
               ================================================= */}

            <DialogContent className="detalle-body">
                <div className="detalle-table-container">
                    <MaterialReactTable
                        columns={
                            columns
                        }
                        data={
                            detalleItems
                        }

                        enableGlobalFilter={
                            false
                        }

                        enableColumnFilters={
                            false
                        }

                        enableColumnFilterModes={
                            false
                        }

                        enableSorting={
                            true
                        }

                        enablePagination={
                            true
                        }

                        enableDensityToggle={
                            false
                        }

                        enableFullScreenToggle={
                            true
                        }

                        enableHiding={
                            true
                        }

                        enableColumnResizing={
                            true
                        }

                        enableStickyHeader={
                            true
                        }

                        initialState={{
                            density:
                                "compact",

                            pagination:
                                {
                                    pageIndex:
                                        0,

                                    pageSize:
                                        10,
                                },
                        }}

                        muiTablePaperProps={{
                            elevation:
                                0,

                            sx: {
                                boxShadow:
                                    "none",
                            },
                        }}

                        muiTableContainerProps={{
                            sx: {
                                maxHeight:
                                    "470px",
                            },
                        }}

                        muiTableHeadCellProps={{
                            sx: {
                                backgroundColor:
                                    "#f8fafc",

                                color:
                                    "#334155",

                                fontSize:
                                    "0.72rem",

                                fontWeight:
                                    700,

                                borderBottom:
                                    "1px solid #dce4eb",

                                whiteSpace:
                                    "nowrap",
                            },
                        }}

                        muiTableBodyCellProps={{
                            sx: {
                                color:
                                    "#334155",

                                fontSize:
                                    "0.75rem",

                                borderBottom:
                                    "1px solid #edf1f5",

                                verticalAlign:
                                    "middle",
                            },
                        }}

                        muiTableBodyRowProps={{
                            hover:
                                true,
                        }}
                    />
                </div>

                {/* =================================================
                    TOTAL
                   ================================================= */}

                <div className="detalle-total-area">
                    <div className="detalle-total-description">
                        <span>
                            Resumen de cotización
                        </span>

                        <small>
                            Total calculado según
                            los productos y
                            porcentajes aplicados.
                        </small>
                    </div>

                    <div className="detalle-total-box">
                        <div className="label">
                            Total General
                        </div>

                        <div className="value">
                            {totalGeneral.toLocaleString(
                                "es-GT",
                                {
                                    style: "currency",
                                    currency:
                                        "GTQ",
                                }
                            )}
                        </div>
                    </div>
                </div>

                {/* =================================================
                    IMAGEN
                   ================================================= */}

                {isImageModalOpen &&
                    selectedImageUrl && (
                        <ImagenModal
                            imagenSrc={
                                selectedImageUrl
                            }
                            onClose={
                                toggleImageModal
                            }
                        />
                    )}
            </DialogContent>

            {/* =================================================
                FOOTER
               ================================================= */}

            <DialogActions className="detalle-modal-footer">
                <div className="detalle-footer-status">
                    {guardarDeshabilitado ? (
                        <span className="detalle-status-locked">
                            Esta cotización no
                            permite modificaciones
                            en su estado actual.
                        </span>
                    ) : (
                        <span className="detalle-status-editable">
                            Los porcentajes pueden
                            modificarse.
                        </span>
                    )}
                </div>

                <div className="detalle-footer-actions">
                    <Button
                        onClick={
                            onClose
                        }
                        className="detalle-btn detalle-btn-close"
                    >
                        <X
                            size={17}
                        />

                        Cerrar
                    </Button>

                    <Button
                        variant="contained"
                        onClick={
                            handleGuardarDetalle
                        }
                        className="detalle-btn detalle-btn-primary"
                        disabled={
                            guardarDeshabilitado
                        }
                    >
                        <Save
                            size={17}
                        />

                        Guardar cambios
                    </Button>
                </div>
            </DialogActions>
        </Dialog>
    );
};

export default DetalleCotizacionModal;