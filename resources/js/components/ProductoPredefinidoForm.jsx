import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

import {
    DollarSign,
    Eraser,
    Layers3,
    Package,
    Ruler,
    Save,
    Search,
} from "lucide-react";

import FormSection from "./FormSection";
import "../../css/producto-predefinido-form.css";

function ProductoPredefinidoForm() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [unidadesMedida, setUnidadesMedida] = useState([]);

    const [productoPredefinido, setProductoPredefinido] = useState({
        titulo: "",
        descripcion: "",
        ancho: 0,
        alto: 0,
        profundidad: 0,
        precio: 0,
        observaciones: "",
        cantidad: 0,
        cantidad_uno: 0,
        cantidad_dos: 0,
        cantidad_tres: 0,
        cantidad_cuatro: 0,
        precio_uno: 0,
        precio_dos: 0,
        precio_tres: 0,
        precio_cuatro: 0,
        variacion: false,
        idunidadmedida: 0,
    });

    /* =========================================================
       CARGA INICIAL
       ========================================================= */

    useEffect(() => {
        const token = localStorage.getItem("token");

        const headers = {
            Authorization: `Bearer ${token}`,
        };

        const loadUnidadesMedida = () => {
            axios
                .get("/api/lista_unidadesmedidapp", {
                    headers,
                })
                .then((res) => {
                    setUnidadesMedida(res.data);
                })
                .catch((error) => {
                    console.error(
                        "Error al cargar unidades de medida:",
                        error
                    );

                    alertify.error(
                        "Error al cargar unidades de medida"
                    );
                });
        };

        loadUnidadesMedida();

        if (id) {
            axios
                .get(`/api/productopredefinido/${id}`, {
                    headers,
                })
                .then((res) => {
                    const data = res.data;

                    setProductoPredefinido({
                        titulo: data.titulo || "",
                        descripcion: data.descripcion || "",
                        ancho: data.ancho || "",
                        alto: data.alto || "",
                        profundidad: data.profundidad || "",
                        precio: data.precio || "",
                        observaciones:
                            data.observaciones || "",
                        cantidad: data.cantidad || "",
                        cantidad_uno:
                            data.cantidad_uno || "",
                        cantidad_dos:
                            data.cantidad_dos || "",
                        cantidad_tres:
                            data.cantidad_tres || "",
                        cantidad_cuatro:
                            data.cantidad_cuatro || "",
                        precio_uno:
                            data.precio_uno || "",
                        precio_dos:
                            data.precio_dos || "",
                        precio_tres:
                            data.precio_tres || "",
                        precio_cuatro:
                            data.precio_cuatro || "",
                        variacion:
                            data.variacion === 1 ||
                            data.variacion === true,
                        idunidadmedida:
                            data.idunidadmedida || "",
                    });
                })
                .catch((error) => {
                    console.error(
                        "Error al cargar el producto predefinido:",
                        error
                    );
                });
        }
    }, [id]);

    /* =========================================================
       CAMBIOS
       ========================================================= */

    const handleChange = (e) => {
        const {
            name,
            value,
            type,
            checked,
        } = e.target;

        const newValue =
            name === "titulo"
                ? value.toUpperCase()
                : value;

        setProductoPredefinido((prevProducto) => ({
            ...prevProducto,
            [name]:
                type === "checkbox"
                    ? checked
                    : newValue,
        }));
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

        const dataToSend = {
            ...productoPredefinido,
            variacion:
                productoPredefinido.variacion
                    ? "1"
                    : "0",
        };

        const camposObligatorios = [
            {
                campo: dataToSend.titulo,
                nombre: "Título",
            },
            {
                campo: dataToSend.idunidadmedida,
                nombre: "Unidad medida",
            },
        ];

        /*
         * Mejora segura:
         * String() evita errores si el backend devuelve
         * idunidadmedida como número.
         */
        const camposFaltantes =
            camposObligatorios.filter(
                (c) =>
                    c.campo === null ||
                    c.campo === undefined ||
                    String(c.campo).trim() === "" ||
                    String(c.campo).trim() === "0"
            );

        if (camposFaltantes.length > 0) {
            const nombres = camposFaltantes
                .map((c) => c.nombre)
                .join(", ");

            alertify.alert(
                "DATOS OBLIGATORIOS",
                `Por favor, complete los siguientes campos obligatorios: ${nombres}`
            );

            return;
        }

        if (id) {
            axios
                .put(
                    `/api/productopredefinido/${id}`,
                    dataToSend,
                    { headers }
                )
                .then((res) => {
                    console.log(
                        "Producto predefinido actualizado:",
                        res.data
                    );

                    navigate(
                        "/productospredefinidos/lista"
                    );
                })
                .catch((error) => {
                    console.error(
                        "Error al actualizar el producto predefinido:",
                        error
                    );
                });
        } else {
            axios
                .post(
                    "/api/productopredefinido",
                    dataToSend,
                    { headers }
                )
                .then((res) => {
                    console.log(
                        "Producto predefinido creado:",
                        res.data
                    );

                    navigate(
                        "/productospredefinidos/lista"
                    );
                })
                .catch((error) => {
                    console.error(
                        "Error al crear el producto predefinido:",
                        error
                    );
                });
        }
    };

    /* =========================================================
       LIMPIAR
       ========================================================= */

    const limpiarCampos = () => {
        setProductoPredefinido({
            titulo: "",
            descripcion: "",
            ancho: 0,
            alto: 0,
            profundidad: 0,
            precio: 0,
            observaciones: "",
            cantidad: 0,
            cantidad_uno: 0,
            cantidad_dos: 0,
            cantidad_tres: 0,
            cantidad_cuatro: 0,
            precio_uno: 0,
            precio_dos: 0,
            precio_tres: 0,
            precio_cuatro: 0,
            variacion: false,
            idunidadmedida: 0,
        });
    };

    return (
        <div className="gp-module-page gp-predef-page">
            <div className="gp-module-card gp-predef-card">

                {/* =================================================
                    ENCABEZADO
                   ================================================= */}

                <div className="gp-predef-header">
                    <div>
                        <div className="gp-module-meta">
                            MÓDULO · COTIZACIONES
                        </div>

                        <h1 className="gp-predef-title">
                            {id
                                ? "Actualizar producto predefinido"
                                : "Crear producto predefinido"}
                        </h1>

                        <p className="gp-predef-description">
                            Configura la información,
                            dimensiones y estructura de
                            precios utilizada para productos
                            predefinidos en cotizaciones.
                        </p>
                    </div>

                    <div className="gp-predef-header-icon">
                        <Package size={25} />
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="gp-module-body gp-predef-body">

                        {/* =================================================
                            DATOS GENERALES
                           ================================================= */}

                        <FormSection title="Datos generales">
                            <div className="gp-predef-section-intro">
                                <Package size={16} />

                                <span>
                                    Información principal del
                                    producto.
                                </span>
                            </div>

                            <div className="gp-predef-grid-main">
                                <div className="gp-predef-field gp-predef-title-field">
                                    <label htmlFor="titulo">
                                        Título
                                        <span className="gp-required">
                                            *
                                        </span>
                                    </label>

                                    <input
                                        id="titulo"
                                        type="text"
                                        name="titulo"
                                        value={
                                            productoPredefinido.titulo
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Título del producto"
                                        className="gp-predef-required"
                                        style={{
                                            textTransform:
                                                "uppercase",
                                        }}
                                    />
                                </div>

                                <div className="gp-predef-field gp-predef-description-field">
                                    <label htmlFor="descripcion">
                                        Descripción
                                    </label>

                                    <input
                                        id="descripcion"
                                        type="text"
                                        name="descripcion"
                                        value={
                                            productoPredefinido.descripcion
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Descripción del producto"
                                    />
                                </div>

                                <div className="gp-predef-field gp-predef-unit-field">
                                    <label htmlFor="idunidadmedida">
                                        Unidad de medida
                                        <span className="gp-required">
                                            *
                                        </span>
                                    </label>

                                    <select
                                        id="idunidadmedida"
                                        name="idunidadmedida"
                                        value={
                                            productoPredefinido.idunidadmedida
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        className="gp-predef-required"
                                    >
                                        <option value="">
                                            Seleccionar unidad
                                        </option>

                                        {unidadesMedida.map(
                                            (
                                                unidadMedida
                                            ) => (
                                                <option
                                                    key={
                                                        unidadMedida.idunidadmedida
                                                    }
                                                    value={
                                                        unidadMedida.idunidadmedida
                                                    }
                                                >
                                                    {
                                                        unidadMedida.unidad
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="gp-predef-subsection">
                                <div className="gp-predef-subsection-title">
                                    <Ruler size={15} />

                                    <span>
                                        Dimensiones
                                    </span>
                                </div>

                                <div className="gp-predef-dimensions-grid">
                                    <div className="gp-predef-field">
                                        <label htmlFor="ancho">
                                            Ancho
                                        </label>

                                        <input
                                            id="ancho"
                                            type="text"
                                            name="ancho"
                                            value={
                                                productoPredefinido.ancho
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Ancho"
                                        />
                                    </div>

                                    <div className="gp-predef-field">
                                        <label htmlFor="alto">
                                            Alto
                                        </label>

                                        <input
                                            id="alto"
                                            type="text"
                                            name="alto"
                                            value={
                                                productoPredefinido.alto
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Alto"
                                        />
                                    </div>

                                    <div className="gp-predef-field">
                                        <label htmlFor="profundidad">
                                            Profundidad
                                        </label>

                                        <input
                                            id="profundidad"
                                            type="text"
                                            name="profundidad"
                                            value={
                                                productoPredefinido.profundidad
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Profundidad"
                                        />
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        {/* =================================================
                            PRECIOS
                           ================================================= */}

                        <FormSection title="Registro de precios">
                            <div className="gp-predef-price-header">
                                <div className="gp-predef-price-info">
                                    <DollarSign size={16} />

                                    <div>
                                        <strong>
                                            Estructura de precios
                                        </strong>

                                        <span>
                                            Utiliza un solo precio
                                            o activa variaciones
                                            para configurar hasta
                                            cuatro rangos.
                                        </span>
                                    </div>
                                </div>

                                <label className="gp-predef-switch">
                                    <input
                                        type="checkbox"
                                        name="variacion"
                                        checked={
                                            productoPredefinido.variacion
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                    <span className="gp-predef-switch-control" />

                                    <span className="gp-predef-switch-text">
                                        Variación
                                    </span>
                                </label>
                            </div>

                            {!productoPredefinido.variacion && (
                                <div className="gp-predef-mode-message">
                                    <DollarSign size={15} />

                                    <span>
                                        Precio único activo.
                                    </span>
                                </div>
                            )}

                            {productoPredefinido.variacion && (
                                <div className="gp-predef-mode-message gp-predef-mode-variation">
                                    <Layers3 size={15} />

                                    <span>
                                        Precios por variación
                                        activos.
                                    </span>
                                </div>
                            )}

                            <div className="gp-predef-price-table">
                                <div className="gp-predef-price-row gp-predef-price-row-main">
                                    <div className="gp-predef-price-label">
                                        <strong>
                                            Precio general
                                        </strong>

                                        <span>
                                            Sin variaciones
                                        </span>
                                    </div>

                                    <div className="gp-predef-field">
                                        <label>
                                            Cantidad
                                        </label>

                                        <input
                                            type="number"
                                            name="cantidad"
                                            value={
                                                productoPredefinido.cantidad
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                productoPredefinido.variacion
                                            }
                                        />
                                    </div>

                                    <div className="gp-predef-field">
                                        <label>
                                            Precio
                                        </label>

                                        <div className="gp-predef-money-input">
                                            <span>Q</span>

                                            <input
                                                type="number"
                                                name="precio"
                                                value={
                                                    productoPredefinido.precio
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                step="0.01"
                                                disabled={
                                                    productoPredefinido.variacion
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="gp-predef-variation-grid">
                                    <div className="gp-predef-variation-card">
                                        <div className="gp-predef-variation-number">
                                            1
                                        </div>

                                        <div className="gp-predef-field">
                                            <label>
                                                Cantidad 1
                                            </label>

                                            <input
                                                type="number"
                                                name="cantidad_uno"
                                                value={
                                                    productoPredefinido.cantidad_uno
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                disabled={
                                                    !productoPredefinido.variacion
                                                }
                                            />
                                        </div>

                                        <div className="gp-predef-field">
                                            <label>
                                                Precio 1
                                            </label>

                                            <div className="gp-predef-money-input">
                                                <span>
                                                    Q
                                                </span>

                                                <input
                                                    type="number"
                                                    name="precio_uno"
                                                    value={
                                                        productoPredefinido.precio_uno
                                                    }
                                                    onChange={
                                                        handleChange
                                                    }
                                                    step="0.01"
                                                    disabled={
                                                        !productoPredefinido.variacion
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="gp-predef-variation-card">
                                        <div className="gp-predef-variation-number">
                                            2
                                        </div>

                                        <div className="gp-predef-field">
                                            <label>
                                                Cantidad 2
                                            </label>

                                            <input
                                                type="number"
                                                name="cantidad_dos"
                                                value={
                                                    productoPredefinido.cantidad_dos
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                disabled={
                                                    !productoPredefinido.variacion
                                                }
                                            />
                                        </div>

                                        <div className="gp-predef-field">
                                            <label>
                                                Precio 2
                                            </label>

                                            <div className="gp-predef-money-input">
                                                <span>
                                                    Q
                                                </span>

                                                <input
                                                    type="number"
                                                    name="precio_dos"
                                                    value={
                                                        productoPredefinido.precio_dos
                                                    }
                                                    onChange={
                                                        handleChange
                                                    }
                                                    step="0.01"
                                                    disabled={
                                                        !productoPredefinido.variacion
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="gp-predef-variation-card">
                                        <div className="gp-predef-variation-number">
                                            3
                                        </div>

                                        <div className="gp-predef-field">
                                            <label>
                                                Cantidad 3
                                            </label>

                                            <input
                                                type="number"
                                                name="cantidad_tres"
                                                value={
                                                    productoPredefinido.cantidad_tres
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                disabled={
                                                    !productoPredefinido.variacion
                                                }
                                            />
                                        </div>

                                        <div className="gp-predef-field">
                                            <label>
                                                Precio 3
                                            </label>

                                            <div className="gp-predef-money-input">
                                                <span>
                                                    Q
                                                </span>

                                                <input
                                                    type="number"
                                                    name="precio_tres"
                                                    value={
                                                        productoPredefinido.precio_tres
                                                    }
                                                    onChange={
                                                        handleChange
                                                    }
                                                    step="0.01"
                                                    disabled={
                                                        !productoPredefinido.variacion
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="gp-predef-variation-card">
                                        <div className="gp-predef-variation-number">
                                            4
                                        </div>

                                        <div className="gp-predef-field">
                                            <label>
                                                Cantidad 4
                                            </label>

                                            <input
                                                type="number"
                                                name="cantidad_cuatro"
                                                value={
                                                    productoPredefinido.cantidad_cuatro
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                disabled={
                                                    !productoPredefinido.variacion
                                                }
                                            />
                                        </div>

                                        <div className="gp-predef-field">
                                            <label>
                                                Precio 4
                                            </label>

                                            <div className="gp-predef-money-input">
                                                <span>
                                                    Q
                                                </span>

                                                <input
                                                    type="number"
                                                    name="precio_cuatro"
                                                    value={
                                                        productoPredefinido.precio_cuatro
                                                    }
                                                    onChange={
                                                        handleChange
                                                    }
                                                    step="0.01"
                                                    disabled={
                                                        !productoPredefinido.variacion
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        {/* =================================================
                            OBSERVACIONES
                           ================================================= */}

                        <FormSection title="Observaciones">
                            <div className="gp-predef-field">
                                <label htmlFor="observaciones">
                                    Observaciones
                                </label>

                                <input
                                    id="observaciones"
                                    type="text"
                                    name="observaciones"
                                    value={
                                        productoPredefinido.observaciones
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Observaciones adicionales"
                                />
                            </div>
                        </FormSection>
                    </div>

                    {/* =================================================
                        ACCIONES
                       ================================================= */}

                    <div className="gp-action-footer gp-predef-footer">
                        <div className="gp-predef-footer-left">
                            <button
                                type="button"
                                className="gp-action-button gp-action-clean"
                                onClick={
                                    limpiarCampos
                                }
                            >
                                <Eraser size={16} />
                                Limpiar
                            </button>

                            <Link
                                to="/productospredefinidos/lista"
                                className="gp-action-button gp-action-consult"
                            >
                                <Search size={16} />
                                Consultar
                            </Link>
                        </div>

                        <button
                            type="submit"
                            className="gp-action-button gp-action-save gp-predef-save"
                        >
                            <Save size={16} />

                            {id
                                ? "Actualizar"
                                : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProductoPredefinidoForm;