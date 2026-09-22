import React, { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link, useNavigate } from "react-router-dom";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

import {
    Layers3,
    Package,
    Plus,
} from "lucide-react";

import "../../css/tableFormat.css";
import "../../css/lista-productos-predefinidos.css";

DataTable.use(DT);

function ListaProductosPredefinidos() {
    const [productosPredefinidos, setProductosPredefinidos] =
        useState([]);

    const [loading, setLoading] = useState(true);

    const [spanishTranslation, setSpanishTranslation] =
        useState(null);

    const navigate = useNavigate();

    /* =========================================================
       TRADUCCIÓN DATATABLE
       ========================================================= */

    useEffect(() => {
        fetch("/i18n/Spanish.json")
            .then((response) => response.json())
            .then((data) =>
                setSpanishTranslation(data)
            )
            .catch((error) =>
                console.error(
                    "Error al cargar la traducción:",
                    error
                )
            );
    }, []);

    /* =========================================================
       CARGAR PRODUCTOS
       ========================================================= */

    useEffect(() => {
        const token =
            localStorage.getItem("token");

        if (!token) {
            console.error(
                "Token de autenticación no encontrado"
            );

            setLoading(false);

            return;
        }

        axios
            .get("/api/productopredefinido", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                setProductosPredefinidos(
                    response.data
                );

                setLoading(false);
            })
            .catch((error) => {
                console.error(
                    "Error al obtener los productos predefinidos:",
                    error
                );

                setLoading(false);
            });
    }, []);

    /* =========================================================
       FORMATEADORES
       ========================================================= */

    const formatCantidad = (data) => {
        if (
            data === null ||
            data === undefined ||
            data === ""
        ) {
            return "";
        }

        return Number(data).toLocaleString(
            "es-GT",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }
        );
    };

    const formatPrecio = (data) => {
        if (
            data === null ||
            data === undefined ||
            data === ""
        ) {
            return "";
        }

        try {
            return Number(data).toLocaleString(
                "es-GT",
                {
                    style: "currency",
                    currency: "GTQ",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }
            );
        } catch (error) {
            console.error(
                "Error al formatear la moneda:",
                error
            );

            return data;
        }
    };

    /* =========================================================
       COLUMNAS
       ========================================================= */

    const columns = [
        {
            data: "idproductopredefinido",
            title: "Acciones",
            orderable: false,
            searchable: false,
            className:
                "gp-predef-list-actions-cell",

            render: (data) => {
                return `
                    <div class="gp-predef-list-actions">
                        <button
                            type="button"
                            class="gp-predef-list-action gp-predef-list-edit editar-btn"
                            data-id="${data}"
                            title="Editar producto"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button
                            type="button"
                            class="gp-predef-list-action gp-predef-list-delete desactivar-btn"
                            data-id="${data}"
                            title="Eliminar producto"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
            },
        },

        {
            data: "titulo",
            title: "Tipo",
            className:
                "gp-predef-list-title-cell",
        },

        {
            data: "descripcion",
            title: "Descripción",
            visible: false,
        },

        {
            data: "unidad_medida",
            title: "Unidad Medida",
            className:
                "gp-predef-list-unit-cell",
        },

        {
            data: "variacion",
            title: "Variación",
            className:
                "gp-predef-list-variation-cell",

            render: (data) => {
                const tieneVariacion =
                    data === 1 ||
                    data === "1" ||
                    data === true ||
                    String(data).toUpperCase() ===
                        "S";

                if (tieneVariacion) {
                    return `
                        <span class="gp-predef-list-badge gp-predef-list-badge-variation">
                            <i class="fa-solid fa-layer-group"></i>
                            Sí
                        </span>
                    `;
                }

                return `
                    <span class="gp-predef-list-badge gp-predef-list-badge-simple">
                        No
                    </span>
                `;
            },
        },

        {
            data: "ancho",
            title: "Ancho",
            className:
                "gp-predef-list-number-cell",
        },

        {
            data: "alto",
            title: "Alto",
            className:
                "gp-predef-list-number-cell",
        },

        {
            data: "profundidad",
            title: "Profundidad",
            className:
                "gp-predef-list-number-cell",
        },

        {
            data: "cantidad",
            title: "Cantidad",
            className:
                "gp-predef-list-number-cell",
            render: formatCantidad,
        },

        {
            data: "precio",
            title: "Precio",
            className:
                "gp-predef-list-price-cell",
            render: formatPrecio,
        },

        {
            data: "cantidad_uno",
            title: "Cantidad 1",
            className:
                "gp-predef-list-number-cell",
            render: formatCantidad,
        },

        {
            data: "precio_uno",
            title: "Precio 1",
            className:
                "gp-predef-list-price-cell",
            render: formatPrecio,
        },

        {
            data: "cantidad_dos",
            title: "Cantidad 2",
            className:
                "gp-predef-list-number-cell",
            render: formatCantidad,
        },

        {
            data: "precio_dos",
            title: "Precio 2",
            className:
                "gp-predef-list-price-cell",
            render: formatPrecio,
        },

        {
            data: "cantidad_tres",
            title: "Cantidad 3",
            className:
                "gp-predef-list-number-cell",
            render: formatCantidad,
        },

        {
            data: "precio_tres",
            title: "Precio 3",
            className:
                "gp-predef-list-price-cell",
            render: formatPrecio,
        },

        {
            data: "cantidad_cuatro",
            title: "Cantidad 4",
            className:
                "gp-predef-list-number-cell",
            render: formatCantidad,
        },

        {
            data: "precio_cuatro",
            title: "Precio 4",
            className:
                "gp-predef-list-price-cell",
            render: formatPrecio,
        },

        {
            data: "observaciones",
            title: "Observaciones",
            visible: false,
        },
    ];

    /* =========================================================
       EVENTOS BOTONES DATATABLE
       ========================================================= */

    useEffect(() => {
        const handleButtonClick = (event) => {
            const button =
                event.target.closest("button");

            if (!button) return;

            const id =
                button.getAttribute("data-id");

            if (!id) return;

            if (
                button.classList.contains(
                    "editar-btn"
                )
            ) {
                navigate(
                    `/productospredefinidos/editar/${id}`
                );

                return;
            }

            if (
                button.classList.contains(
                    "desactivar-btn"
                )
            ) {
                alertify.confirm(
                    "Confirmar Eliminación",
                    "¿Estás seguro de que deseas eliminar este registro?",
                    () => {
                        handleDesactivar(id);
                    },
                    () => {
                        alertify.error(
                            "Eliminación cancelada"
                        );
                    }
                );
            }
        };

        document.addEventListener(
            "click",
            handleButtonClick
        );

        return () => {
            document.removeEventListener(
                "click",
                handleButtonClick
            );
        };
    }, [navigate]);

    /* =========================================================
       DESACTIVAR
       ========================================================= */

    const handleDesactivar = (id) => {
        const token =
            localStorage.getItem("token");

        if (!token) return;

        axios
            .put(
                `/api/productopredefinido/desactivar/${id}`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )
            .then(() => {
                setProductosPredefinidos(
                    (prevProductos) =>
                        prevProductos.filter(
                            (producto) =>
                                Number(
                                    producto.idproductopredefinido
                                ) !==
                                Number(id)
                        )
                );

                alertify.success(
                    "Registro eliminado correctamente"
                );
            })
            .catch((error) => {
                console.error(
                    "Error al desactivar el producto predefinido:",
                    error
                );

                alertify.error(
                    "Error al eliminar el registro"
                );
            });
    };

    /* =========================================================
       DATATABLE
       ========================================================= */

    const options = {
        autoWidth: false,
        language: spanishTranslation,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        order: [],
    };

    return (
        <div className="gp-module-page gp-predef-list-page">
            <div className="gp-module-card gp-predef-list-card">

                {/* =================================================
                    HEADER
                   ================================================= */}

                <div className="gp-predef-list-header">
                    <div>
                        <div className="gp-module-meta">
                            MÓDULO · COTIZACIONES
                        </div>

                        <h1 className="gp-predef-list-title">
                            Productos predefinidos
                        </h1>

                        <p className="gp-predef-list-description">
                            Consulta y administra los productos
                            utilizados como base para la creación
                            de cotizaciones.
                        </p>
                    </div>

                    <div className="gp-predef-list-header-icon">
                        <Package size={25} />
                    </div>
                </div>

                {/* =================================================
                    RESUMEN / TOOLBAR
                   ================================================= */}

                <div className="gp-predef-list-toolbar">
                    <div className="gp-predef-list-summary">
                        <div className="gp-predef-list-summary-icon">
                            <Layers3 size={18} />
                        </div>

                        <div>
                            <span>
                                Registros disponibles
                            </span>

                            <strong>
                                {loading
                                    ? "—"
                                    : productosPredefinidos.length}
                            </strong>
                        </div>
                    </div>

                    <Link
                        to="/productospredefinidos/crear"
                        className="gp-action-button gp-action-save gp-predef-list-new"
                    >
                        <Plus size={16} />
                        Nuevo producto
                    </Link>
                </div>

                {/* =================================================
                    TABLA
                   ================================================= */}

                <div className="gp-module-body gp-predef-list-body">
                    <div className="gp-predef-list-section-heading">
                        <div>
                            <h2>
                                Productos registrados
                            </h2>

                            <p>
                                Utiliza el buscador para
                                localizar un producto o las
                                acciones de cada fila para
                                editarlo o eliminarlo.
                            </p>
                        </div>
                    </div>

                    {loading ||
                    !spanishTranslation ? (
                        <div className="gp-predef-list-loading">
                            <div className="gp-predef-list-spinner" />

                            <div>
                                <strong>
                                    Cargando registros
                                </strong>

                                <span>
                                    Obteniendo productos
                                    predefinidos...
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="gp-predef-list-table-wrapper">
                            <DataTable
                                data={
                                    productosPredefinidos
                                }
                                columns={columns}
                                options={options}
                                className="table gp-predef-list-table"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ListaProductosPredefinidos;