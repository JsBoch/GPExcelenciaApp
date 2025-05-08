/*
 * Importa React de la bibliotecha React import React from 'react';
 * React: es el punto de entrada principal para usar React en tu aplicación. Porporciona las funcionalidad
 * básicas para crear componentes, elementos y gestionar el ciclo de vida de los componentes.
 *
 * Es necesario importar React en cualquier archivo que contenga código JSX.
 * JSX: es la sintaxis que permite escribir HTML dentro de JavaScript
 *
 *  Hook: "gancho", es una función especial que permite enganchar el estado y el ciclo de vida de React en componentes
 * funcionales Esto significa que puedes usar características de React que antes solo estaban disponibles en componentes de clase, como el estado local y los efectos secundarios, en componentes que son simplemente funciones de JavaScript.
 * useState:
 * Es un hook que permite agregar "estado" a componentes funcionales.
 * El "estado" es una forma de almacenar y gestionar datos que pueden cambiar con el tiempo y que afectan la forma en que se renderiza el componente.
 * useState devuelve un array con dos elementos: el valor actual del estado y una función para actualizar ese valor.
 * useEffect:
 * Es un hook que permite realizar "efectos secundarios" en componentes funcionales.
 * Los "efectos secundarios" son acciones que se realizan fuera del flujo normal de renderizado de un componente, como:
 * Realizar llamadas a APIs para obtener datos.
 * Suscribirse a eventos.
 * Actualizar el DOM directamente.
 * useEffect se ejecuta después de que el componente se renderiza.
 */
import React, { useState, useEffect } from "react";
//Axios es un cliente HTTP basado en promesas que facilita la realización de solicitudes HTTP desde el navegador o Node.js.
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css"; // Importa los estilos de Bootstrap
import { Link, useParams, useNavigate } from "react-router-dom"; // Importa Link
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.min.css';
import 'alertifyjs/build/css/themes/default.min.css';
import { FaSave, FaSearch, FaHome,FaBroom  } from "react-icons/fa";
import Header from './Header';
import '../../css/generalesForm.css';

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
        // ... otros campos
    });

    const [identificaciones, setIdentificaciones] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [puestos, setPuestos] = useState([]);
    const [departamentosPais, setDepartamentosPais] = useState([]);
    const [departamentoId, setDepartamentoId] = useState(""); // Estado para el id del departamento seleccionado

    //20250324 19:25 edit
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
            { campo: empleado.nombre, nombre: 'Nombre' },
            { campo: empleado.id_identificacion, nombre: 'Tipo de Identificación' },
            { campo: empleado.numero_identificacion, nombre: 'Número de Identificación' },
            { campo: empleado.movil, nombre: 'Celular' },
            { campo: empleado.salud, nombre: 'Problemas de Salud' },
            { campo: empleado.contacto_emergencia, nombre: 'Contacto de Emergencia' },
            { campo: empleado.telefono_emergencia, nombre: 'Teléfono de Emergencia' },
        ];

        const camposFaltantes = camposObligatorios.filter(c => !c.campo || c.campo.trim() === '');
        if (camposFaltantes.length > 0) {
            const nombres = camposFaltantes.map(c => c.nombre).join(', ');
            alertify.alert('DATOS OBLIGATORIOS', `Por favor, complete los siguientes campos obligatorios: ${nombres}`);
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
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row g-2">
                            {/* <div className='col-md-2'>
                                <label className="form-label">Código</label>
                                <input type="text" name="codigo" value={empleado.codigo} onChange={handleChange} placeholder="Código" className='form-control form-control-sm' />
                            </div> */}
                            <div className="col-md-6">
                                <label className="form-label">Nombre</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={empleado.nombre}
                                    onChange={handleChange}
                                    placeholder="Nombre"
                                    className="form-control form-control-sm campo-obligatorio-fondo"
                                    
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
                                <label className="form-label">
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
                                    {identificaciones.map((identificacion) => (
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
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">
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
                                <label className="form-label">Celular</label>
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
                                    Problemas de salud
                                </label>
                                <input
                                    type="text"
                                    name="salud"
                                    value={empleado.salud}
                                    onChange={handleChange}
                                    placeholder="Problemas de salud"
                                    className="form-control form-contorl-lg campo-obligatorio-fondo"
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">
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
                                <label className="form-label">
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
                        <div className="row g-2">
                            <div className="col-md-6">
                                <label className="form-label">Área</label>
                                <select
                                    name="id_departamento"
                                    value={empleado.id_departamento}
                                    onChange={handleDepartamentoChange}
                                    className="form-control form-control-sm"
                                >
                                    <option value="">Seleccionar Área</option>
                                    {departamentos.map((departamento) => (
                                        <option
                                            key={departamento.id_departamento}
                                            value={departamento.id_departamento}
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
                                    <option value="">Seleccionar Puesto</option>
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
                            <div className="col-md-6">
                                <label className="form-label">Dirección</label>
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

                        {/* ... otros campos y listas desplegables */}
                        <div
                            className="mt-4 p-3 border rounded shadow-sm bg-light"
                            style={{ borderColor: "#ddd" }}
                        >
                            <div className="d-flex flex-wrap gap-2 justify-content-between">
                                <button
                                    type="submit"
                                    className="btn btn-primary d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px" }}
                                >
                                    <FaSave /> Guardar
                                </button>
                                <button
                                    type="button" // Importante: no es un botón de submit
                                    className="btn btn-light d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px", color: "#000",border:"1px solid #ccc" }}
                                    onClick={limpiarCampos} // Asocia la función al evento onClick
                                >
                                    <FaBroom  /> {/* Puedes usar otro icono como FaBroom */} Limpiar
                                </button>
                                <Link
                                    to="/empleados/lista"
                                    className="btn btn-success d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px" }}
                                >
                                    <FaSearch /> Consultar
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
