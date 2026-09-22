import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

import {
    Link,
    useParams,
    useLocation,
} from "react-router-dom";

import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

import {
    Save,
    Search,
    Eraser,
    X,
    UserRound,
    Phone,
    Mail,
    BriefcaseBusiness,
    MessageSquareText,
} from "lucide-react";

import FormSection from "./FormSection";

import "../../css/ContactoClienteForm.css";

function ContactoClienteForm({
    clienteId,
    onClose,
    onContactCreated,
    contactoAEditarId,
}) {
    const { id: idFromUrl } = useParams();
    const location = useLocation();

    /*
     * Si estamos en:
     *
     * /contacto_cliente/editar/:id
     *
     * el ID corresponde al CONTACTO.
     *
     * Si el componente está dentro de ClienteRegistro,
     * clienteId corresponde al CLIENTE.
     */
    const isContactPath =
        /\/contacto_cliente\/(editar|ver|detalle)\//i.test(
            location.pathname
        );

    const idFromUrlIfContact =
        isContactPath ? idFromUrl : null;

    /*
     * Prioridad:
     *
     * 1. contactoAEditarId recibido como prop
     * 2. ID recibido desde ruta de contacto
     * 3. null = nuevo contacto
     */
    const idParaEditar =
        contactoAEditarId ??
        idFromUrlIfContact ??
        null;

    const [clientes, setClientes] = useState([]);

    const [nombreClienteFijado, setNombreClienteFijado] =
        useState("");

    const [isEditModeContacto, setIsEditModeContacto] =
        useState(false);

    const [loading, setLoading] = useState(false);

    const [contactoCliente, setContactoCliente] =
        useState({
            idcliente: 0,
            nombre: "",
            telefono: "",
            correo: "",
            puesto: "",
            observaciones: "",
        });

    /*
     * =========================================================
     * CARGA DE CLIENTES + CONTACTO
     * =========================================================
     */

    useEffect(() => {
        const cargarDatos = async () => {
            const token =
                localStorage.getItem("token");

            const headers = {
                Authorization: `Bearer ${token}`,
            };

            try {
                setLoading(true);

                /*
                 * Cargar clientes.
                 */
                const resClientes =
                    await axios.get(
                        "/api/lista_clientes",
                        {
                            headers,
                        }
                    );

                const listaClientes =
                    resClientes.data || [];

                setClientes(listaClientes);

                /*
                 * Si el formulario viene desde un cliente,
                 * obtener el nombre para mostrarlo bloqueado.
                 */
                if (clienteId) {
                    const cliente =
                        listaClientes.find(
                            (item) =>
                                String(
                                    item.idcliente
                                ) ===
                                String(clienteId)
                        );

                    if (cliente) {
                        setNombreClienteFijado(
                            cliente.nombre
                        );
                    }
                }

                /*
                 * MODO EDICIÓN
                 */
                if (idParaEditar) {
                    setIsEditModeContacto(true);

                    const resContacto =
                        await axios.get(
                            `/api/contacto_cliente/${idParaEditar}`,
                            {
                                headers,
                            }
                        );

                    const data =
                        resContacto.data || {};

                    setContactoCliente({
                        idcliente:
                            data.idcliente ||
                            clienteId ||
                            0,

                        nombre:
                            data.nombre || "",

                        telefono:
                            data.telefono || "",

                        correo:
                            data.correo || "",

                        puesto:
                            data.puesto || "",

                        observaciones:
                            data.observaciones ||
                            "",
                    });
                } else {
                    /*
                     * MODO NUEVO
                     */
                    setIsEditModeContacto(false);

                    setContactoCliente({
                        idcliente:
                            clienteId || 0,

                        nombre: "",
                        telefono: "",
                        correo: "",
                        puesto: "",
                        observaciones: "",
                    });
                }
            } catch (error) {
                console.error(
                    "Error cargando información del contacto:",
                    error
                );

                alertify.error(
                    "No fue posible cargar la información"
                );
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();
    }, [
        clienteId,
        idParaEditar,
        location.pathname,
    ]);

    /*
     * =========================================================
     * CAMBIOS
     * =========================================================
     */

    const handleChange = (e) => {
        const { name, value } = e.target;

        setContactoCliente((prev) => ({
            ...prev,

            [name]:
                name === "nombre" ||
                name === "puesto"
                    ? value.toUpperCase()
                    : value,
        }));
    };

    /*
     * =========================================================
     * TELÉFONO
     * =========================================================
     */

    const handleTelefonoChange = (e) => {
        const value =
            e.target.value.replace(/\D/g, "");

        if (value.length <= 8) {
            setContactoCliente((prev) => ({
                ...prev,
                telefono: value,
            }));
        }
    };

    /*
     * =========================================================
     * LIMPIAR
     * =========================================================
     */

    const limpiarCampos = () => {
        setContactoCliente({
            idcliente: clienteId || 0,
            nombre: "",
            telefono: "",
            correo: "",
            puesto: "",
            observaciones: "",
        });
    };

    /*
     * =========================================================
     * GUARDAR / ACTUALIZAR
     * =========================================================
     */

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        /*
         * Validaciones originales.
         */
        const camposObligatorios = [
            {
                campo:
                    contactoCliente.idcliente,
                nombre: "Cliente",
            },
            {
                campo:
                    contactoCliente.nombre,
                nombre: "Nombre",
            },
            {
                campo:
                    contactoCliente.telefono,
                nombre: "Teléfono",
            },
            {
                campo:
                    contactoCliente.puesto,
                nombre: "Puesto",
            },
        ];

        const camposFaltantes =
            camposObligatorios.filter(
                (item) =>
                    item.campo == null ||
                    (typeof item.campo ===
                        "string" &&
                        item.campo.trim() === "")
            );

        if (camposFaltantes.length > 0) {
            const nombres =
                camposFaltantes
                    .map(
                        (item) =>
                            item.nombre
                    )
                    .join(", ");

            alertify.alert(
                "DATOS OBLIGATORIOS",
                `Por favor, complete los siguientes campos obligatorios: ${nombres}`
            );

            return;
        }

        const token =
            localStorage.getItem("token");

        const headers = {
            Authorization: `Bearer ${token}`,
        };

        try {
            setLoading(true);

            /*
             * EDICIÓN
             */
            if (
                isEditModeContacto &&
                idParaEditar
            ) {
                await axios.put(
                    `/api/contacto_cliente/${idParaEditar}`,
                    contactoCliente,
                    {
                        headers,
                    }
                );

                alertify.success(
                    "Contacto actualizado correctamente"
                );
            } else {
                /*
                 * CREACIÓN
                 */
                await axios.post(
                    "/api/contacto_cliente",
                    contactoCliente,
                    {
                        headers,
                    }
                );

                alertify.success(
                    "Contacto creado correctamente"
                );
            }

            /*
             * Callback utilizado desde ClienteRegistro/modal.
             */
            if (
                typeof onContactCreated ===
                "function"
            ) {
                onContactCreated();
            }

            /*
             * Si está dentro de modal, cerrarlo.
             */
            if (
                typeof onClose === "function"
            ) {
                onClose();
            } else {
                /*
                 * Si es pantalla independiente,
                 * limpiar después de guardar.
                 */
                limpiarCampos();
            }
        } catch (error) {
            console.error(
                "Error guardando contacto:",
                error
            );

            alertify.error(
                isEditModeContacto
                    ? "Error actualizando el contacto"
                    : "Error creando el contacto"
            );
        } finally {
            setLoading(false);
        }
    };

    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (
        <div
            className={`gp-module-page contacto-form-page ${
                typeof onClose === "function"
                    ? "contacto-form-modal"
                    : ""
            }`}
        >
            <div className="gp-module-card">
                <div className="contacto-form-body">

                    {/* =========================
                        CABECERA
                       ========================= */}

                    <div className="erp-meta-header contacto-meta-header">
                        <div>
                            <span className="erp-badge">
                                Módulo · Clientes
                            </span>

                            <h2 className="contacto-page-title">
                                {isEditModeContacto
                                    ? "Editar contacto"
                                    : "Nuevo contacto"}
                            </h2>

                            <span className="text-muted small d-block">
                                {isEditModeContacto
                                    ? "Actualice la información del contacto seleccionado."
                                    : "Registre una nueva persona de contacto asociada a un cliente."}
                            </span>
                        </div>

                        <div
                            className={`contacto-mode-badge ${
                                isEditModeContacto
                                    ? "is-edit"
                                    : "is-new"
                            }`}
                        >
                            <UserRound
                                size={15}
                            />

                            {isEditModeContacto
                                ? "Editando"
                                : "Nuevo"}
                        </div>
                    </div>

                    <form
                        onSubmit={
                            handleSubmit
                        }
                    >
                        {/* =========================
                            CLIENTE
                           ========================= */}

                        <FormSection title="Cliente asociado">
                            <div className="row g-3">
                                <div className="col-12">
                                    <label className="form-label contacto-label">
                                        Cliente
                                        <span className="contacto-required">
                                            *
                                        </span>
                                    </label>

                                    {clienteId &&
                                    nombreClienteFijado ? (
                                        <div className="contacto-fixed-client">
                                            <div className="contacto-field-icon">
                                                <UserRound
                                                    size={
                                                        17
                                                    }
                                                />
                                            </div>

                                            <div className="contacto-fixed-client-info">
                                                <span>
                                                    Cliente
                                                    seleccionado
                                                </span>

                                                <strong>
                                                    {
                                                        nombreClienteFijado
                                                    }
                                                </strong>
                                            </div>

                                            <div className="contacto-client-id">
                                                ID{" "}
                                                {
                                                    clienteId
                                                }
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="contacto-input-wrapper">
                                            <UserRound
                                                size={
                                                    17
                                                }
                                                className="contacto-input-icon"
                                            />

                                            <select
                                                name="idcliente"
                                                value={
                                                    contactoCliente.idcliente
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                className="form-select form-select-sm contacto-control contacto-control-icon campo-obligatorio-fondo"
                                                disabled={
                                                    !!clienteId &&
                                                    !contactoAEditarId
                                                }
                                            >
                                                <option value="">
                                                    Seleccionar
                                                    cliente
                                                </option>

                                                {clientes.map(
                                                    (
                                                        cliente
                                                    ) => (
                                                        <option
                                                            key={
                                                                cliente.idcliente
                                                            }
                                                            value={
                                                                cliente.idcliente
                                                            }
                                                        >
                                                            {
                                                                cliente.nombre
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </FormSection>

                        {/* =========================
                            DATOS DEL CONTACTO
                           ========================= */}

                        <FormSection title="Datos del contacto">
                            <div className="row g-3">

                                {/* NOMBRE */}

                                <div className="col-lg-6 col-md-12">
                                    <label className="form-label contacto-label">
                                        Nombre
                                        <span className="contacto-required">
                                            *
                                        </span>
                                    </label>

                                    <div className="contacto-input-wrapper">
                                        <UserRound
                                            size={17}
                                            className="contacto-input-icon"
                                        />

                                        <input
                                            type="text"
                                            name="nombre"
                                            value={
                                                contactoCliente.nombre
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Nombre completo del contacto"
                                            className="form-control form-control-sm contacto-control contacto-control-icon campo-obligatorio-fondo"
                                        />
                                    </div>
                                </div>

                                {/* PUESTO */}

                                <div className="col-lg-6 col-md-12">
                                    <label className="form-label contacto-label">
                                        Puesto
                                        <span className="contacto-required">
                                            *
                                        </span>
                                    </label>

                                    <div className="contacto-input-wrapper">
                                        <BriefcaseBusiness
                                            size={17}
                                            className="contacto-input-icon"
                                        />

                                        <input
                                            type="text"
                                            name="puesto"
                                            value={
                                                contactoCliente.puesto
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Ej. GERENTE DE COMPRAS"
                                            className="form-control form-control-sm contacto-control contacto-control-icon campo-obligatorio-fondo"
                                        />
                                    </div>
                                </div>

                                {/* TELÉFONO */}

                                <div className="col-lg-6 col-md-12">
                                    <label className="form-label contacto-label">
                                        Teléfono
                                        <span className="contacto-required">
                                            *
                                        </span>
                                    </label>

                                    <div className="contacto-input-wrapper">
                                        <Phone
                                            size={17}
                                            className="contacto-input-icon"
                                        />

                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            name="telefono"
                                            value={
                                                contactoCliente.telefono
                                            }
                                            onChange={
                                                handleTelefonoChange
                                            }
                                            placeholder="00000000"
                                            maxLength={
                                                8
                                            }
                                            className="form-control form-control-sm contacto-control contacto-control-icon campo-obligatorio-fondo"
                                        />

                                        <span className="contacto-phone-counter">
                                            {
                                                contactoCliente
                                                    .telefono
                                                    .length
                                            }
                                            /8
                                        </span>
                                    </div>
                                </div>

                                {/* CORREO */}

                                <div className="col-lg-6 col-md-12">
                                    <label className="form-label contacto-label">
                                        Correo
                                    </label>

                                    <div className="contacto-input-wrapper">
                                        <Mail
                                            size={17}
                                            className="contacto-input-icon"
                                        />

                                        <input
                                            type="email"
                                            name="correo"
                                            value={
                                                contactoCliente.correo
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="correo@empresa.com"
                                            className="form-control form-control-sm contacto-control contacto-control-icon"
                                        />
                                    </div>
                                </div>

                                {/* OBSERVACIONES */}

                                <div className="col-12">
                                    <label className="form-label contacto-label">
                                        Observaciones
                                    </label>

                                    <div className="contacto-textarea-wrapper">
                                        <MessageSquareText
                                            size={17}
                                            className="contacto-textarea-icon"
                                        />

                                        <textarea
                                            name="observaciones"
                                            value={
                                                contactoCliente.observaciones
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Información adicional sobre el contacto..."
                                            rows={
                                                3
                                            }
                                            className="form-control contacto-control contacto-observaciones"
                                        />
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        {/* =========================
                            ACCIONES
                           ========================= */}

                        <div className="gp-action-footer contacto-actions">
                            <div className="contacto-actions-secondary">
                                <button
                                    type="button"
                                    className="gp-action-button gp-action-clean"
                                    onClick={
                                        limpiarCampos
                                    }
                                    disabled={
                                        loading
                                    }
                                >
                                    <Eraser
                                        size={17}
                                    />

                                    Limpiar
                                </button>

                                {typeof onClose ===
                                    "function" && (
                                    <button
                                        type="button"
                                        className="gp-action-button contacto-btn-cancel"
                                        onClick={
                                            onClose
                                        }
                                        disabled={
                                            loading
                                        }
                                    >
                                        <X
                                            size={
                                                17
                                            }
                                        />

                                        Cancelar
                                    </button>
                                )}

                                {typeof onClose !==
                                    "function" && (
                                    <Link
                                        to="/contacto_cliente/lista"
                                        className="gp-action-button gp-action-consult contacto-link-button"
                                    >
                                        <Search
                                            size={
                                                17
                                            }
                                        />

                                        Consultar
                                    </Link>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="gp-action-button gp-action-save contacto-save-button"
                                disabled={
                                    loading
                                }
                            >
                                <Save
                                    size={18}
                                />

                                {loading
                                    ? "Guardando..."
                                    : isEditModeContacto
                                      ? "Actualizar contacto"
                                      : "Guardar contacto"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ContactoClienteForm;