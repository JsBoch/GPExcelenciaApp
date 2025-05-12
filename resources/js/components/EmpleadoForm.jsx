import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaSave, FaSearch, FaHome, FaBroom } from "react-icons/fa";
import Header from "./Header";
import FormSection from "./FormSection";

function EmpleadoForm() {
    // Obtener fecha actual en formato YYYY-MM-DD
    const fechaActual = new Date().toISOString().split("T")[0];
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
        setDepartamentoId(e.target.value); // Actualizar el estado con el id del departamento seleccionado
        setEmpleado({
            ...empleado,
            id_departamento: e.target.value,
            id_puesto: "",
        }); // Actualizar el estado del empleado
    };
    //maneja los cambios en los campos del formulario
    //...empleado, utiliza el operador de propagación para hacer una copia del objeto empleado
    //y luego actualiza el valor del campo correspondiente
    //e.target.name obtiene el valor del atributo name del elemento del formulario que ha desencadenado el evento
    //e.target.value obtiene el valor del elemento del formulario que ha desencadenado el evento
    const handleChange = (e) => {
        //setEmpleado({ ...empleado, [e.target.name]: e.target.value });
        const { name, value } = e.target;
        setEmpleado({
            ...empleado,
            [name]: name === "nombre" ? value.toUpperCase() : value, //esto pasa nombre a mayúsculas en tiempo real
        });
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
        ];

        const camposFaltantes = camposObligatorios.filter(
            (c) => !c.campo || c.campo.trim() === ""
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
                    limpiarCampos();
                })
                .catch((error) =>
                    //console.error("Error al actualizar empleado:", error);
                    alertify.error("Error al actualizar empleado:")
                );
        } else {
            // Crear nuevo empleado (solicitud POST)
            axios
                .post("/api/empleados", empleado, { headers })
                .then((res) => {
                    //console.log("Empleado creado:", res.data);
                    //navigate("/empleados/lista"); // Redirige a la lista
                    limpiarCampos();
                })
                .catch((error) =>
                    //console.error("Error al crear empleado:", error)
                    alertify.error("Error al crear empleado")
                );
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
            // ... otros campos
        });
    };

    //return JSX que representa el formulario, se utiliza para devolver elementos HTML o mejor dicho elementos de React desde un componente funcional
    return (
        <div className="mt-4">
            <Header title="Registro de Empleados" />
            <div className="card shadow p-4">
                {/* <div className="card-header bg-primary text-white">
                    <h4 className="mb-0">Registro de Empleado</h4>
                </div> */}
                <div className="card-body card-form">
                    <form onSubmit={handleSubmit}>
                        <FormSection title="Datos personales">
                            <div className="row g-2">
                                {/* <div className='col-md-2'>
                                <label className="form-label">Código</label>
                                <input type="text" name="codigo" value={empleado.codigo} onChange={handleChange} placeholder="Código" className='form-control form-control-sm' />
                            </div> */}
                                <div className="col-md-6">
                                    <label className="form-label campo-obligatorio-label">
                                        Nombre
                                    </label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={empleado.nombre}
                                        onChange={handleChange}
                                        placeholder="Nombre"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                        required
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">NIT</label>
                                    <input
                                        type="text"
                                        name="nit"
                                        value={empleado.nit}
                                        onChange={handleChange}
                                        placeholder="Nit"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                            </div>
                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="form-label campo-obligatorio-label">
                                        Tipo Identificación
                                    </label>
                                    '
                                    <select
                                        name="id_identificacion"
                                        value={empleado.id_identificacion}
                                        onChange={handleChange}
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    >
                                        <option value="">
                                            Seleccionar Identificación
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
                                                    {identificacion.nombre}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label campo-obligatorio-label">
                                        Número de identificación
                                    </label>
                                    <input
                                        type="text"
                                        name="numero_identificacion"
                                        value={empleado.numero_identificacion}
                                        onChange={handleChange}
                                        placeholder="Número de identificación"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                            </div>
                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Teléfono casa
                                    </label>
                                    <input
                                        type="text"
                                        name="telefono_casa"
                                        value={empleado.telefono_casa}
                                        onChange={handleChange}
                                        placeholder="Teléfono casa"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label campo-obligatorio-label">
                                        Celular
                                    </label>
                                    <input
                                        type="text"
                                        name="movil"
                                        value={empleado.movil}
                                        onChange={handleChange}
                                        placeholder="Celular"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Otro teléfono
                                    </label>
                                    <input
                                        type="text"
                                        name="otro_telefono"
                                        value={empleado.otro_telefono}
                                        onChange={handleChange}
                                        placeholder="Otro teléfono"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                            </div>
                            <div className="row g-2">
                                <div className="col-md-5">
                                    <label className="form-label">
                                        Correo personal
                                    </label>
                                    <input
                                        type="email"
                                        name="correo_personal"
                                        value={empleado.correo_personal}
                                        onChange={handleChange}
                                        placeholder="Correo personal"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">Género</label>
                                    <input
                                        type="text"
                                        name="genero"
                                        value={empleado.genero}
                                        onChange={handleChange}
                                        placeholder="Género"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">
                                        Fecha nacimiento
                                    </label>
                                    <input
                                        type="date"
                                        name="fecha_nacimiento"
                                        value={empleado.fecha_nacimiento}
                                        onChange={handleChange}
                                        placeholder="Fecha nacimiento"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                            </div>
                            <div className="row g-2">
                                <div className="col-md-6">
                                    <label className="form-label">
                                        Dirección
                                    </label>
                                    <input
                                        type="text"
                                        name="direccion"
                                        value={empleado.direccion}
                                        onChange={handleChange}
                                        placeholder="Dirección"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                            </div>
                        </FormSection>
                        <FormSection title="Información de salud y contacto de emergencia">
                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="form-label campo-obligatorio-label">
                                        Problemas de salud
                                    </label>
                                    <input
                                        type="text"
                                        name="salud"
                                        value={empleado.salud}
                                        onChange={handleChange}
                                        placeholder="Problemas de salud"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label campo-obligatorio-label">
                                        Contacto emergencia
                                    </label>
                                    <input
                                        type="text"
                                        name="contacto_emergencia"
                                        value={empleado.contacto_emergencia}
                                        onChange={handleChange}
                                        placeholder="Contacto emergencia"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label campo-obligatorio-label">
                                        Teléfono emergencia
                                    </label>
                                    <input
                                        type="text"
                                        name="telefono_emergencia"
                                        value={empleado.telefono_emergencia}
                                        onChange={handleChange}
                                        placeholder="Teléfono emergencia"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                            </div>
                        </FormSection>
                        <FormSection title="Información de la empresa">                            
                            <div className="row g-2">
                                <div className="col-md-6">
                                    <label className="form-label">Área</label>
                                    <select
                                        name="id_departamento"
                                        value={empleado.id_departamento}
                                        onChange={handleDepartamentoChange}
                                        className="form-control form-control-sm"
                                    >
                                        <option value="">
                                            Seleccionar Área
                                        </option>
                                        {departamentos.map((departamento) => (
                                            <option
                                                key={
                                                    departamento.id_departamento
                                                }
                                                value={
                                                    departamento.id_departamento
                                                }
                                            >
                                                {departamento.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Puesto</label>
                                    <select
                                        name="id_puesto"
                                        value={empleado.id_puesto}
                                        onChange={handleChange}
                                        className="form-control form-control-sm"
                                    >
                                        <option value="">
                                            Seleccionar Puesto
                                        </option>
                                        {puestos.map((puesto) => (
                                            <option
                                                key={puesto.id_puesto}
                                                value={puesto.id_puesto}
                                            >
                                                {puesto.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="row g-2">
                                <div className="col-md-2">
                                    <label className="form-label">
                                        Fecha ingreso
                                    </label>
                                    <input
                                        type="date"
                                        name="fecha_ingreso"
                                        value={empleado.fecha_ingreso}
                                        onChange={handleChange}
                                        placeholder="Fecha ingreso"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                                <div className="col-md-5">
                                    <label className="form-label">
                                        Correo empresa
                                    </label>
                                    <input
                                        type="email"
                                        name="correo_empresa"
                                        value={empleado.correo_empresa}
                                        onChange={handleChange}
                                        placeholder="Correo empresa"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                            </div>
                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Departamento
                                    </label>
                                    <select
                                        name="id_departamentopais"
                                        value={empleado.id_departamentopais}
                                        onChange={handleChange}
                                        className="form-control form-control-sm"
                                    >
                                        <option value="">
                                            Seleccionar Departamento
                                        </option>
                                        {departamentosPais.map(
                                            (departamentoPais) => (
                                                <option
                                                    key={
                                                        departamentoPais.iddepartamentopais
                                                    }
                                                    value={
                                                        departamentoPais.iddepartamentopais
                                                    }
                                                >
                                                    {departamentoPais.nombre}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                                <div className="col-md-8">
                                    <label className="form-label">
                                        Observaciones
                                    </label>
                                    <input
                                        type="text"
                                        name="observaciones"
                                        value={empleado.observaciones}
                                        onChange={handleChange}
                                        placeholder="Observaciones"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                            </div>
                        </FormSection>
                        <div
                            className="mt-4 p-3 border rounded shadow-sm bg-light"
                            style={{ borderColor: "#ddd" }}
                        >
                            <div className="d-flex flex-wrap gap-2 justify-content-end">
                                <button
                                    type="submit"
                                    className="btn btn-sm btn-guardar d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px" }}
                                >
                                    <FaSave /> GUARDAR
                                </button>
                                <button
                                    type="button" // Importante: no es un botón de submit
                                    className="btn btn-sm btn-limpiar d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{
                                        minWidth: "150px",
                                        color: "#000",
                                        border: "1px solid #ccc",
                                    }}
                                    onClick={limpiarCampos} // Asocia la función al evento onClick
                                >
                                    <FaBroom />{" "}
                                    {/* Puedes usar otro icono como FaBroom */}{" "}
                                    LIMPIAR
                                </button>
                                <Link
                                    to="/empleados/lista"
                                    className="btn btn-sm btn-consultar d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px" }}
                                >
                                    <FaSearch /> CONSULTAR
                                </Link>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default EmpleadoForm;
