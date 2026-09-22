import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    BriefcaseBusiness,
    CalendarDays,
    ContactRound,
    Eraser,
    HeartPulse,
    Save,
    Search,
    UserRound,
} from "lucide-react";

import "../../css/empleado-form.css";

function EmpleadoForm() {
    // Obtener fecha actual en formato YYYY-MM-DD
    //const fechaActual = new Date().toISOString().split("T")[0];
    const [fechaActual, setFechaActual] = useState("");
    //maneja el estado, en este caso un objeto con varios campos.
    //este objeto representa los datos de un empleado y cada campo es una propiedad del empleado.
    const [empleado, setEmpleado] = useState({
        codigo: "",
        nombre: "",
        id_identificacion: "",
        numero_identificacion: "",
        telefono_casa: "",
        movil: "",
        otro_telefono: "",
        correo_personal: "",
        correo_empresa: "",
        salud: "",
        contacto_emergencia: "",
        telefono_emergencia: "",
        id_departamento: "",
        id_puesto: "",
        fecha_nacimiento: fechaActual,
        fecha_ingreso: fechaActual,
        observaciones: "",
        estado: "",
        nit: "",
        genero: "",
        direccion: "",
        id_departamentopais: "",
        usuario_registro: "",
    });

    const [identificaciones, setIdentificaciones] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [puestos, setPuestos] = useState([]);
    const [departamentosPais, setDepartamentosPais] = useState([]);
    const [departamentoId, setDepartamentoId] = useState(""); // Estado para el id del departamento seleccionado
    const { id } = useParams(); // Obtiene el id de la URL
    const navigate = useNavigate();
    // Cargar la fecha desde el servidor
    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, { headers })
            .then((res) => {
                setFechaActual(res.data.fecha);
            })
            .catch(() => {
                const localDate = new Date().toISOString().split("T")[0];
                setFechaActual(localDate); // fallback
            });
    }, []);

    useEffect(() => {
    if (!id && fechaActual) {
        setEmpleado((prev) => ({
            ...prev,
            fecha_nacimiento:
                prev.fecha_nacimiento || fechaActual,
            fecha_ingreso:
                prev.fecha_ingreso || fechaActual,
        }));
    }
}, [fechaActual, id]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        if (id) {
            // Cargar datos del empleado para editar
            axios
                .get(`/api/empleados/${id}`, { headers })
                .then((res) => {
                    const data = res.data;
                    setEmpleado({
                        codigo: data.codigo || "",
                        nombre: data.nombre || "",
                        id_identificacion: data.id_identificacion || "",
                        numero_identificacion: data.numero_identificacion || "",
                        telefono_casa: data.telefono_casa || "",
                        movil: data.movil || "",
                        otro_telefono: data.otro_telefono || "",
                        correo_personal: data.correo_personal || "",
                        correo_empresa: data.correo_empresa || "",
                        salud: data.salud || "",
                        contacto_emergencia: data.contacto_emergencia || "",
                        telefono_emergencia: data.telefono_emergencia || "",
                        id_departamento: data.id_departamento || "",
                        id_puesto: data.id_puesto || "",
                        fecha_nacimiento: data.fecha_nacimiento || fechaActual,
                        fecha_ingreso: data.fecha_ingreso || fechaActual,
                        observaciones: data.Observaciones || "",
                        estado: data.estado || "",
                        nit: data.nit || "",
                        genero: data.genero || "",
                        direccion: data.direccion || "",
                        id_departamentopais: data.id_departamentopais || "",
                        usuario_registro: data.usuario_registro || "",
                    });

                    // Cargar listas desplegables después de cargar los datos del empleado
                    axios
                        .get("/api/identificaciones", { headers })
                        .then((res) => setIdentificaciones(res.data));
                    axios
                        .get("/api/departamentos", { headers })
                        .then((res) => setDepartamentos(res.data));
                    axios
                        .get("/api/departamentos-pais", { headers })
                        .then((res) => setDepartamentosPais(res.data));
                    if (data.id_departamento) {
                        axios
                            .get(
                                `/api/puestos?id_departamento=${data.id_departamento}`,
                                { headers }
                            )
                            .then((res) => setPuestos(res.data));
                    } else {
                        setPuestos([]);
                    }
                })
                .catch((error) =>
                    console.error("Error al cargar empleado:", error)
                );
        } else {
            // Cargar listas desplegables para crear un nuevo empleado
            axios
                .get("/api/identificaciones", { headers })
                .then((res) => setIdentificaciones(res.data));
            axios
                .get("/api/departamentos", { headers })
                .then((res) => setDepartamentos(res.data));
            axios
                .get("/api/departamentos-pais", { headers })
                .then((res) => setDepartamentosPais(res.data));
            if (departamentoId) {
                axios
                    .get(`/api/puestos?id_departamento=${departamentoId}`, {
                        headers,
                    })
                    .then((res) => setPuestos(res.data));
            } else {
                setPuestos([]);
            }
        }
    }, [id, departamentoId]);

    const handleDepartamentoChange = (e) => {
    const value = e.target.value;

    setDepartamentoId(value);

    setEmpleado((prev) => ({
        ...prev,
        id_departamento: value,
        id_puesto: "",
    }));
};
    //maneja los cambios en los campos del formulario
    //...empleado, utiliza el operador de propagación para hacer una copia del objeto empleado
    //y luego actualiza el valor del campo correspondiente
    //e.target.name obtiene el valor del atributo name del elemento del formulario que ha desencadenado el evento
    //e.target.value obtiene el valor del elemento del formulario que ha desencadenado el evento
    const handleChange = (e) => {
    const { name, value } = e.target;

    setEmpleado((prev) => ({
        ...prev,

        [name]:
            name === "nombre" ||
            name === "contacto_emergencia"
                ? value.toUpperCase()
                : value,
    }));
};

    //maneja el envío del formulario
    //e.preventDefault() evita que el formulario se envíe de forma predeterminada
    //axios.post('/api/empleados', empleado) envía una solicitud POST a la ruta /api/empleados con los datos del empleado
    //res.data contiene la respuesta del servidor
    //console.log('Empleado creado:', res.data) muestra la respuesta en la consola del navegador
    //limpiar el formulario o mostrar un mensaje de éxito
    const handleSubmit = (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Validación de campos obligatorios
        const camposObligatorios = [
            { campo: empleado.nombre, nombre: "Nombre" },
            {
                campo: empleado.id_identificacion,
                nombre: "Tipo de Identificación",
            },
            {
                campo: empleado.numero_identificacion,
                nombre: "Número de Identificación",
            },
            { campo: empleado.movil, nombre: "Celular" },
            { campo: empleado.salud, nombre: "Problemas de Salud" },
            {
                campo: empleado.contacto_emergencia,
                nombre: "Contacto de Emergencia",
            },
            {
                campo: empleado.telefono_emergencia,
                nombre: "Teléfono de Emergencia",
            },
            {
                campo: empleado.id_departamento,
                nombre: "Área de Trabajo",
            },
            { campo: empleado.id_puesto, nombre: "Puesto" },
        ];

        const camposFaltantes = camposObligatorios.filter(
            (c) => !c.campo || String(c.campo).trim() === ""
        );
        if (camposFaltantes.length > 0) {
            const nombres = camposFaltantes.map((c) => c.nombre).join(", ");
            alertify.alert(
                "DATOS OBLIGATORIOS",
                `Por favor, complete los siguientes campos obligatorios: ${nombres}`
            );
            return;
        }

        if (id) {
            // Editar empleado existente (solicitud PUT)
            axios
                .put(`/api/empleados/${id}`, empleado, { headers })
                .then((res) => {
                    //console.log("Empleado actualizado:", res.data);
                    //navigate("/empleados/lista"); // Redirige a la lista
                    alertify.success("Empleado actualizado");
                    limpiarCampos();
                })
                .catch((error) => {
                    //console.error("Error al actualizar empleado:", error);
                    alertify.error("Error al actualizar empleado:");
                });
        } else {
            // Crear nuevo empleado (solicitud POST)
            axios
                .post("/api/empleados", empleado, { headers })
                .then((res) => {
                    //console.log("Empleado creado:", res.data);
                    //navigate("/empleados/lista"); // Redirige a la lista
                    alertify.success("Empleado creado");
                    limpiarCampos();
                })
                .catch((error) => {
                    //console.log("Error al crear empleado:", error);
                    alertify.error("Error al crear empleado");
                });
        }
    };

    const limpiarCampos = () => {
        setEmpleado({
            codigo: "",
            nombre: "",
            id_identificacion: "",
            numero_identificacion: "",
            telefono_casa: "",
            movil: "",
            otro_telefono: "",
            correo_personal: "",
            correo_empresa: "",
            salud: "",
            contacto_emergencia: "",
            telefono_emergencia: "",
            id_departamento: "",
            id_puesto: "",
            fecha_nacimiento: fechaActual,
            fecha_ingreso: fechaActual,
            observaciones: "",
            estado: "",
            nit: "",
            genero: "",
            direccion: "",
            id_departamentopais: "",
            usuario_registro: "",
        });
    };

    //return JSX que representa el formulario, se utiliza para devolver elementos HTML o mejor dicho elementos de React desde un componente funcional
    return (
    <div className="gp-module-page gp-employee-page">
        <div className="gp-module-card gp-employee-card">

            {/* =================================================
                HEADER
               ================================================= */}

            <div className="gp-employee-header">
                <div className="gp-employee-heading">
                    <div className="gp-employee-heading-icon">
                        <UserRound size={22} />
                    </div>

                    <div>
                        <div className="gp-module-meta">
                            ADMINISTRACIÓN · PERSONAL
                        </div>

                        <h1>
                            {id
                                ? "Editar empleado"
                                : "Registro de empleado"}
                        </h1>

                        <p>
                            Registra la información personal,
                            laboral y de contacto del empleado.
                        </p>
                    </div>
                </div>

                <div className="gp-employee-mode">
                    <span />
                    {id
                        ? "Editando registro"
                        : "Nuevo registro"}
                </div>
            </div>


            <form onSubmit={handleSubmit}>

                <div className="gp-employee-body">

                    {/* =================================================
                        DATOS PERSONALES
                       ================================================= */}

                    <section className="gp-employee-section">
                        <div className="gp-employee-section-header">
                            <div className="gp-employee-section-title">
                                <div className="gp-employee-section-icon">
                                    <ContactRound size={16} />
                                </div>

                                <div>
                                    <h2>
                                        Datos personales
                                    </h2>

                                    <p>
                                        Información de identificación
                                        y contacto del empleado.
                                    </p>
                                </div>
                            </div>

                            <div className="gp-employee-required-info">
                                <span />
                                Campos obligatorios
                            </div>
                        </div>


                        <div className="gp-employee-grid">

                            {/* NOMBRE */}

                            <div className="gp-employee-field gp-col-8">
                                <label>
                                    Nombre completo
                                    <b>*</b>
                                </label>

                                <input
                                    type="text"
                                    name="nombre"
                                    value={empleado.nombre}
                                    onChange={handleChange}
                                    placeholder="Nombre completo del empleado"
                                    className="gp-employee-input gp-required"
                                    required
                                />
                            </div>


                            {/* NIT */}

                            <div className="gp-employee-field gp-col-4">
                                <label>
                                    NIT
                                </label>

                                <input
                                    type="text"
                                    name="nit"
                                    value={empleado.nit}
                                    onChange={handleChange}
                                    placeholder="Número de NIT"
                                    className="gp-employee-input"
                                />
                            </div>


                            {/* TIPO IDENTIFICACIÓN */}

                            <div className="gp-employee-field gp-col-4">
                                <label>
                                    Tipo de identificación
                                    <b>*</b>
                                </label>

                                <select
                                    name="id_identificacion"
                                    value={
                                        empleado.id_identificacion
                                    }
                                    onChange={handleChange}
                                    className="gp-employee-input gp-required"
                                >
                                    <option value="">
                                        Seleccionar identificación
                                    </option>

                                    {identificaciones.map(
                                        (identificacion) => (
                                            <option
                                                key={
                                                    identificacion.id_identificacion
                                                }
                                                value={
                                                    identificacion.id_identificacion
                                                }
                                            >
                                                {
                                                    identificacion.nombre
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>


                            {/* NÚMERO IDENTIFICACIÓN */}

                            <div className="gp-employee-field gp-col-4">
                                <label>
                                    Número de identificación
                                    <b>*</b>
                                </label>

                                <input
                                    type="text"
                                    name="numero_identificacion"
                                    value={
                                        empleado.numero_identificacion
                                    }
                                    onChange={handleChange}
                                    placeholder="Número de identificación"
                                    className="gp-employee-input gp-required"
                                />
                            </div>


                            {/* GÉNERO */}

                            <div className="gp-employee-field gp-col-2">
                                <label>
                                    Género
                                </label>

                                <input
                                    type="text"
                                    name="genero"
                                    value={empleado.genero}
                                    onChange={handleChange}
                                    placeholder="Género"
                                    className="gp-employee-input"
                                />
                            </div>


                            {/* NACIMIENTO */}

                            <div className="gp-employee-field gp-col-2">
                                <label>
                                    Fecha nacimiento
                                </label>

                                <input
                                    type="date"
                                    name="fecha_nacimiento"
                                    value={
                                        empleado.fecha_nacimiento
                                    }
                                    onChange={handleChange}
                                    className="gp-employee-input"
                                />
                            </div>


                            {/* TELÉFONO CASA */}

                            <div className="gp-employee-field gp-col-4">
                                <label>
                                    Teléfono casa
                                </label>

                                <input
                                    type="text"
                                    name="telefono_casa"
                                    value={
                                        empleado.telefono_casa
                                    }
                                    onChange={(e) => {
                                        const value =
                                            e.target.value.replace(
                                                /\D/g,
                                                "",
                                            );

                                        if (
                                            value.length <= 8
                                        ) {
                                            handleChange({
                                                target: {
                                                    name: "telefono_casa",
                                                    value,
                                                },
                                            });
                                        }
                                    }}
                                    placeholder="00000000"
                                    className="gp-employee-input"
                                    inputMode="numeric"
                                    maxLength={8}
                                />
                            </div>


                            {/* CELULAR */}

                            <div className="gp-employee-field gp-col-4">
                                <label>
                                    Celular
                                    <b>*</b>
                                </label>

                                <input
                                    type="text"
                                    name="movil"
                                    value={empleado.movil}
                                    onChange={(e) => {
                                        const value =
                                            e.target.value.replace(
                                                /\D/g,
                                                "",
                                            );

                                        if (
                                            value.length <= 8
                                        ) {
                                            handleChange({
                                                target: {
                                                    name: "movil",
                                                    value,
                                                },
                                            });
                                        }
                                    }}
                                    placeholder="00000000"
                                    className="gp-employee-input gp-required"
                                    inputMode="numeric"
                                    maxLength={8}
                                />
                            </div>


                            {/* OTRO TEL */}

                            <div className="gp-employee-field gp-col-4">
                                <label>
                                    Otro teléfono
                                </label>

                                <input
                                    type="text"
                                    name="otro_telefono"
                                    value={
                                        empleado.otro_telefono
                                    }
                                    onChange={(e) => {
                                        const value =
                                            e.target.value.replace(
                                                /\D/g,
                                                "",
                                            );

                                        if (
                                            value.length <= 8
                                        ) {
                                            handleChange({
                                                target: {
                                                    name: "otro_telefono",
                                                    value,
                                                },
                                            });
                                        }
                                    }}
                                    placeholder="00000000"
                                    className="gp-employee-input"
                                    inputMode="numeric"
                                    maxLength={8}
                                />
                            </div>


                            {/* CORREO PERSONAL */}

                            <div className="gp-employee-field gp-col-6">
                                <label>
                                    Correo personal
                                </label>

                                <input
                                    type="email"
                                    name="correo_personal"
                                    value={
                                        empleado.correo_personal
                                    }
                                    onChange={handleChange}
                                    placeholder="correo@ejemplo.com"
                                    className="gp-employee-input"
                                />
                            </div>


                            {/* DIRECCIÓN */}

                            <div className="gp-employee-field gp-col-6">
                                <label>
                                    Dirección
                                </label>

                                <input
                                    type="text"
                                    name="direccion"
                                    value={
                                        empleado.direccion
                                    }
                                    onChange={handleChange}
                                    placeholder="Dirección del empleado"
                                    className="gp-employee-input"
                                />
                            </div>
                        </div>
                    </section>


                    {/* =================================================
                        SALUD / EMERGENCIA
                       ================================================= */}

                    <section className="gp-employee-section">
                        <div className="gp-employee-section-header">
                            <div className="gp-employee-section-title">
                                <div className="gp-employee-section-icon gp-health-icon">
                                    <HeartPulse size={16} />
                                </div>

                                <div>
                                    <h2>
                                        Salud y contacto de emergencia
                                    </h2>

                                    <p>
                                        Información necesaria para
                                        atención en caso de emergencia.
                                    </p>
                                </div>
                            </div>
                        </div>


                        <div className="gp-employee-grid">

                            <div className="gp-employee-field gp-col-4">
                                <label>
                                    Problemas de salud
                                    <b>*</b>
                                </label>

                                <input
                                    type="text"
                                    name="salud"
                                    value={empleado.salud}
                                    onChange={handleChange}
                                    placeholder="Indicar o escribir NINGUNO"
                                    className="gp-employee-input gp-required"
                                />
                            </div>


                            <div className="gp-employee-field gp-col-4">
                                <label>
                                    Contacto de emergencia
                                    <b>*</b>
                                </label>

                                <input
                                    type="text"
                                    name="contacto_emergencia"
                                    value={
                                        empleado.contacto_emergencia
                                    }
                                    onChange={handleChange}
                                    placeholder="Nombre del contacto"
                                    className="gp-employee-input gp-required"
                                />
                            </div>


                            <div className="gp-employee-field gp-col-4">
                                <label>
                                    Teléfono de emergencia
                                    <b>*</b>
                                </label>

                                <input
                                    type="text"
                                    name="telefono_emergencia"
                                    value={
                                        empleado.telefono_emergencia
                                    }
                                    onChange={(e) => {
                                        const value =
                                            e.target.value.replace(
                                                /\D/g,
                                                "",
                                            );

                                        if (
                                            value.length <= 8
                                        ) {
                                            handleChange({
                                                target: {
                                                    name: "telefono_emergencia",
                                                    value,
                                                },
                                            });
                                        }
                                    }}
                                    placeholder="00000000"
                                    className="gp-employee-input gp-required"
                                    inputMode="numeric"
                                    maxLength={8}
                                />
                            </div>
                        </div>
                    </section>


                    {/* =================================================
                        EMPRESA
                       ================================================= */}

                    <section className="gp-employee-section">
                        <div className="gp-employee-section-header">
                            <div className="gp-employee-section-title">
                                <div className="gp-employee-section-icon">
                                    <BriefcaseBusiness size={16} />
                                </div>

                                <div>
                                    <h2>
                                        Información de la empresa
                                    </h2>

                                    <p>
                                        Área, puesto e información
                                        administrativa del empleado.
                                    </p>
                                </div>
                            </div>
                        </div>


                        <div className="gp-employee-grid">

                            {/* ÁREA */}

                            <div className="gp-employee-field gp-col-4">
                                <label>
                                    Área de trabajo
                                    <b>*</b>
                                </label>

                                <select
                                    name="id_departamento"
                                    value={
                                        empleado.id_departamento
                                    }
                                    onChange={
                                        handleDepartamentoChange
                                    }
                                    className="gp-employee-input gp-required"
                                >
                                    <option value="">
                                        Seleccionar área
                                    </option>

                                    {departamentos.map(
                                        (departamento) => (
                                            <option
                                                key={
                                                    departamento.id_departamento
                                                }
                                                value={
                                                    departamento.id_departamento
                                                }
                                            >
                                                {
                                                    departamento.nombre
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>


                            {/* PUESTO */}

                            <div className="gp-employee-field gp-col-4">
                                <label>
                                    Puesto
                                    <b>*</b>
                                </label>

                                <select
                                    name="id_puesto"
                                    value={
                                        empleado.id_puesto
                                    }
                                    onChange={handleChange}
                                    className="gp-employee-input gp-required"
                                    disabled={
                                        !empleado.id_departamento
                                    }
                                >
                                    <option value="">
                                        {empleado.id_departamento
                                            ? "Seleccionar puesto"
                                            : "Seleccione primero un área"}
                                    </option>

                                    {puestos.map(
                                        (puesto) => (
                                            <option
                                                key={
                                                    puesto.id_puesto
                                                }
                                                value={
                                                    puesto.id_puesto
                                                }
                                            >
                                                {
                                                    puesto.nombre
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>


                            {/* FECHA INGRESO */}

                            <div className="gp-employee-field gp-col-4">
                                <label>
                                    Fecha de ingreso
                                </label>

                                <div className="gp-employee-date">
                                    <CalendarDays
                                        size={14}
                                    />

                                    <input
                                        type="date"
                                        name="fecha_ingreso"
                                        value={
                                            empleado.fecha_ingreso
                                        }
                                        onChange={handleChange}
                                        className="gp-employee-input"
                                    />
                                </div>
                            </div>


                            {/* CORREO EMPRESA */}

                            <div className="gp-employee-field gp-col-6">
                                <label>
                                    Correo empresa
                                </label>

                                <input
                                    type="email"
                                    name="correo_empresa"
                                    value={
                                        empleado.correo_empresa
                                    }
                                    onChange={handleChange}
                                    placeholder="empleado@empresa.com"
                                    className="gp-employee-input"
                                />
                            </div>


                            {/* DEPTO PAÍS */}

                            <div className="gp-employee-field gp-col-6">
                                <label>
                                    Departamento
                                </label>

                                <select
                                    name="id_departamentopais"
                                    value={
                                        empleado.id_departamentopais
                                    }
                                    onChange={handleChange}
                                    className="gp-employee-input"
                                >
                                    <option value="">
                                        Seleccionar departamento
                                    </option>

                                    {departamentosPais.map(
                                        (
                                            departamentoPais,
                                        ) => (
                                            <option
                                                key={
                                                    departamentoPais.iddepartamentopais
                                                }
                                                value={
                                                    departamentoPais.iddepartamentopais
                                                }
                                            >
                                                {
                                                    departamentoPais.nombre
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>


                            {/* OBSERVACIONES */}

                            <div className="gp-employee-field gp-col-12">
                                <label>
                                    Observaciones
                                </label>

                                <textarea
                                    name="observaciones"
                                    value={
                                        empleado.observaciones
                                    }
                                    onChange={handleChange}
                                    placeholder="Información adicional del empleado..."
                                    className="gp-employee-input gp-employee-textarea"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </section>
                </div>


                {/* =================================================
                    ACCIONES
                   ================================================= */}

                <div className="gp-employee-actions">

                    <div className="gp-employee-actions-info">
                        <span>
                            <b>*</b> Campos requeridos para guardar
                            el empleado.
                        </span>
                    </div>


                    <div className="gp-employee-actions-buttons">

                        <button
                            type="button"
                            className="gp-employee-action gp-employee-clear"
                            onClick={limpiarCampos}
                        >
                            <Eraser size={15} />

                            Limpiar
                        </button>


                        <Link
                            to="/empleados/lista"
                            className="gp-employee-action gp-employee-search"
                        >
                            <Search size={15} />

                            Consultar
                        </Link>


                        <button
                            type="submit"
                            className="gp-employee-action gp-employee-save"
                        >
                            <Save size={15} />

                            {id
                                ? "Actualizar empleado"
                                : "Guardar empleado"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
);
}

export default EmpleadoForm;
