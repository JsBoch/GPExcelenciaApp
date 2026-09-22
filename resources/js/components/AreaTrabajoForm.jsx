import React, {
    useEffect,
    useState,
} from "react";

import axios from "axios";

import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";

import alertify from "alertifyjs";

import "bootstrap/dist/css/bootstrap.min.css";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

import {
    ArrowLeft,
    Eraser,
    ClipboardList,
    Save,
    Search,
    Settings2,
    X,
} from "lucide-react";

import "../../css/area-trabajo-form.css";


function AreaTrabajoForm({
    onClose,
}) {
    const { id } =
        useParams();

    const navigate =
        useNavigate();

    const [
        isEditMode,
        setIsEditMode,
    ] = useState(false);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        area,
        setArea,
    ] = useState({
        nombre: "",
        descripcion: "",
    });


    /* =========================================================
       CARGA INICIAL
       ========================================================= */

    useEffect(() => {
        const token =
            localStorage.getItem(
                "token",
            );

        const headers = {
            Authorization:
                `Bearer ${token}`,
        };

        if (id) {
            setIsEditMode(true);
            setLoading(true);

            axios
                .get(
                    `/api/area_trabajo/${id}`,
                    {
                        headers,
                    },
                )
                .then((res) => {
                    const data =
                        res.data || {};

                    setArea({
                        nombre:
                            data.nombre ||
                            "",

                        descripcion:
                            data.descripcion ||
                            "",
                    });
                })
                .catch(() => {
                    alertify.error(
                        "Error cargando el área",
                    );
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setIsEditMode(false);

            setArea({
                nombre: "",
                descripcion: "",
            });
        }
    }, [id]);


    /* =========================================================
       CAMBIO DE CAMPOS
       ========================================================= */

    const handleChange = (
        e,
    ) => {
        const {
            name,
            value,
        } = e.target;

        setArea((prev) => ({
            ...prev,

            [name]:
                name === "nombre"
                    ? value.toUpperCase()
                    : value,
        }));
    };


    /* =========================================================
       LIMPIAR
       ========================================================= */

    const limpiarCampos =
        () => {
            setArea({
                nombre: "",
                descripcion: "",
            });
        };


    /* =========================================================
       GUARDAR
       ========================================================= */

    const handleSubmit =
        async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const token =
                localStorage.getItem(
                    "token",
                );

            const headers = {
                Authorization:
                    `Bearer ${token}`,
            };


            /* VALIDACIÓN */

            const faltantes =
                [];

            if (
                !area.nombre ||
                area.nombre.trim() ===
                    ""
            ) {
                faltantes.push(
                    "Nombre",
                );
            }

            if (
                faltantes.length >
                0
            ) {
                alertify.alert(
                    "DATOS OBLIGATORIOS",
                    `Por favor complete: ${faltantes.join(
                        ", ",
                    )}`,
                );

                return;
            }


            try {
                setSaving(true);

                if (
                    isEditMode &&
                    id
                ) {
                    await axios.put(
                        `/api/area_trabajo/${id}`,
                        area,
                        {
                            headers,
                        },
                    );

                    alertify.success(
                        "Área actualizada correctamente",
                    );

                    if (
                        typeof onClose ===
                        "function"
                    ) {
                        onClose();
                    }
                } else {
                    await axios.post(
                        "/api/area_trabajo",
                        area,
                        {
                            headers,
                        },
                    );

                    alertify.success(
                        "Área creada correctamente",
                    );

                    limpiarCampos();

                    if (
                        typeof onClose ===
                        "function"
                    ) {
                        onClose();
                    }
                }
            } catch (error) {
                const msg =
                    error?.response
                        ?.data
                        ?.message ||
                    (
                        isEditMode
                            ? "Error actualizando el área"
                            : "Error creando el área"
                    );

                alertify.alert(
                    "ERROR",
                    msg,
                );
            } finally {
                setSaving(false);
            }
        };


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-area-form-page">
            <div className="gp-module-card gp-area-form-card">

                {/* HEADER */}

                <div className="gp-area-form-header">
                    <div className="gp-area-form-heading">
                        <div className="gp-area-form-heading-icon">
                            <Settings2
                                size={
                                    21
                                }
                            />
                        </div>

                        <div>
                            <div className="gp-module-meta">
                                CATÁLOGOS · PRODUCCIÓN
                            </div>

                            <h1>
                                {isEditMode
                                    ? "Editar área de trabajo"
                                    : "Registrar área de trabajo"}
                            </h1>

                            <p>
                                Define las áreas que
                                pueden asignarse a los
                                pedidos de producción.
                            </p>
                        </div>
                    </div>

                    {typeof onClose ===
                        "function" && (
                        <button
                            type="button"
                            className="gp-area-form-close"
                            onClick={
                                onClose
                            }
                            title="Cerrar"
                        >
                            <X
                                size={
                                    17
                                }
                            />
                        </button>
                    )}
                </div>


                {/* BODY */}

                <form
                    onSubmit={
                        handleSubmit
                    }
                >
                    <div className="gp-area-form-body">

                        <div className="gp-area-form-section-header">
                            <div>
                                <ClipboardList
                                    size={
                                        16
                                    }
                                />

                                <strong>
                                    Datos del área
                                </strong>
                            </div>

                            <span>
                                <i />
                                Campo obligatorio
                            </span>
                        </div>


                        {loading ? (
                            <div className="gp-area-form-loading">
                                Cargando información...
                            </div>
                        ) : (
                            <div className="gp-area-form-fields">

                                {/* NOMBRE */}

                                <div className="gp-area-field gp-area-field-name">
                                    <label
                                        htmlFor="nombre"
                                    >
                                        Nombre

                                        <span>
                                            *
                                        </span>
                                    </label>

                                    <input
                                        id="nombre"
                                        type="text"
                                        name="nombre"
                                        value={
                                            area.nombre
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Ej. CARPINTERÍA"
                                        className="gp-area-input gp-area-required"
                                        autoComplete="off"
                                        maxLength={
                                            100
                                        }
                                    />

                                    <small>
                                        Se guardará en
                                        mayúsculas.
                                    </small>
                                </div>


                                {/* DESCRIPCIÓN */}

                                <div className="gp-area-field gp-area-field-description">
                                    <label
                                        htmlFor="descripcion"
                                    >
                                        Descripción

                                        <span className="gp-area-optional">
                                            Opcional
                                        </span>
                                    </label>

                                    <input
                                        id="descripcion"
                                        type="text"
                                        name="descripcion"
                                        value={
                                            area.descripcion
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Descripción breve del área de trabajo"
                                        className="gp-area-input"
                                        autoComplete="off"
                                    />

                                    <small>
                                        Puedes indicar
                                        qué tipo de
                                        trabajos se
                                        realizan en esta
                                        área.
                                    </small>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* FOOTER ACCIONES */}

                    <div className="gp-area-form-actions">

                        <div className="gp-area-form-actions-left">
                            {!onClose && (
                                <button
                                    type="button"
                                    className="gp-area-action gp-area-back"
                                    onClick={() =>
                                        navigate(
                                            -1,
                                        )
                                    }
                                >
                                    <ArrowLeft
                                        size={
                                            15
                                        }
                                    />

                                    Volver
                                </button>
                            )}
                        </div>


                        <div className="gp-area-form-actions-right">

                            <button
                                type="button"
                                className="gp-area-action gp-area-clear"
                                onClick={
                                    limpiarCampos
                                }
                                disabled={
                                    loading ||
                                    saving
                                }
                            >
                                <Eraser
                                    size={
                                        15
                                    }
                                />

                                Limpiar
                            </button>


                            <Link
                                to="/area_trabajo/lista"
                                className="gp-area-action gp-area-consult"
                            >
                                <Search
                                    size={
                                        15
                                    }
                                />

                                Consultar
                            </Link>


                            {typeof onClose ===
                                "function" && (
                                <button
                                    type="button"
                                    className="gp-area-action gp-area-cancel"
                                    onClick={
                                        onClose
                                    }
                                    disabled={
                                        saving
                                    }
                                >
                                    Cancelar
                                </button>
                            )}


                            <button
                                type="submit"
                                className="gp-area-action gp-area-save"
                                disabled={
                                    loading ||
                                    saving
                                }
                            >
                                <Save
                                    size={
                                        15
                                    }
                                />

                                {saving
                                    ? "Guardando..."
                                    : isEditMode
                                      ? "Actualizar"
                                      : "Guardar"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AreaTrabajoForm;