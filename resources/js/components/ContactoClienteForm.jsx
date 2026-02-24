import React, { useState, useEffect } from "react";
//Axios es un cliente HTTP basado en promesas que facilita la realización de solicitudes HTTP desde el navegador o Node.js.
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css"; // Importa los estilos de Bootstrap
import { Link, useParams, useNavigate } from "react-router-dom";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";
import { FaSave, FaSearch, FaHome, FaBroom } from "react-icons/fa";
import Header from "./Header";
import FormSection from "./FormSection"; // 3. Importa el componente FormSection

// NO necesitas useParams aquí si el ID del contacto siempre viene de la URL (para edición)
// o no existe (para creación). Si el modal SIEMPRE es para CREAR, entonces 'id' de useParams no se usa.
// Si el modal puede ser para EDITAR un contacto existente, entonces sí lo necesitas.
// Por simplicidad, asumimos que el modal desde ClienteRegistro es para CREAR un contacto.
// const { id } = useParams(); // id del CONTACTO (si se edita desde una ruta de contacto)

function ContactoClienteForm({
    clienteId,
    onClose,
    onContactCreated,
    contactoAEditarId,
}) {
    // Recibe clienteId como prop  // contactoAEditarId es opcional
    // const { id } = useParams(); // Obtiene el id de la URL
    // const { id: idContactoDesdeUrl } = useParams(); // Para edición de contacto si se accede por URL
    // const idParaEditar = contactoAEditarId || idContactoDesdeUrl; // Prioriza prop si existe
    // El formulario recibe clienteId (para asignar el contacto al cliente) y, opcionalmente, contactoAEditarId si se quiere editar un contacto específico
    // Si estamos en una ruta de contactos, el :id de la URL es el ID DEL CONTACTO
    // Si estamos en /clientes/editar/:id el :id es DEL CLIENTE => NO usarlo para editar contacto
    const { id: idFromUrl } = useParams();
    const isContactPath = /\/contacto_cliente\/(editar|ver|detalle)\//i.test(
        location.pathname
    );
    const idFromUrlIfContact = isContactPath ? idFromUrl : null;

    // Prioriza: prop explícita de edición > id de URL de rutas de contacto > null
    const idParaEditar = contactoAEditarId ?? idFromUrlIfContact ?? null;

    const navigate = useNavigate();
    const [clientes, setClientes] = useState([]);
    const [nombreClienteFijado, setNombreClienteFijado] = useState(""); // Para mostrar nombre si está deshabilitado
    //const fechaActual = new Date().toISOString().split("T")[0];
    //maneja el estado, en este caso un objeto con varios campos.
    //este objeto representa los datos de un empleado y cada campo es una propiedad del empleado.
    const [contactoCliente, setContactoCliente] = useState({
        idcliente: 0,
        nombre: "",
        telefono: "",
        correo: "",
        puesto: "",
        observaciones: "",
    });

    // Estado para saber si estamos en modo edición de un CONTACTO
    const [isEditModeContacto, setIsEditModeContacto] = useState(false);

    
    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        axios
            .get("/api/lista_clientes", { headers })
            .then((res) => {
                setClientes(res.data);
                if (clienteId) {
                    const c = res.data.find(
                        (x) => String(x.idcliente) === String(clienteId)
                    );
                    if (c) setNombreClienteFijado(c.nombre);
                }
            })
            .catch((error) =>
                console.error("Error al cargar lista de clientes:", error)
            );

        if (idParaEditar) {
            // MODO EDICIÓN — solo cuando hay id de contacto real
            setIsEditModeContacto(true);
            axios
                .get(`/api/contacto_cliente/${idParaEditar}`, { headers })
                .then((res) => {
                    const data = res.data || {};
                    setContactoCliente({
                        idcliente: data.idcliente || clienteId || 0,
                        nombre: data.nombre || "",
                        telefono: data.telefono || "",
                        correo: data.correo || "",
                        puesto: data.puesto || "",
                        observaciones: data.observaciones || "",
                    });
                })
                .catch((error) =>
                    console.error(
                        "Error al cargar el contacto para editar:",
                        error
                    )
                );
        } else {
            // MODO NUEVO
            setIsEditModeContacto(false);
            setContactoCliente({
                idcliente: clienteId || 0,
                nombre: "",
                telefono: "",
                correo: "",
                puesto: "",
                observaciones: "",
            });
        }
    }, [clienteId, idParaEditar, location.pathname]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        if (clienteId) {
            setContactoCliente((prev) => ({ ...prev, idcliente: clienteId })); //Actualiza idcliente con el clienteId
        }

        axios
            .get("/api/lista_clientes", { headers })
            .then((res) => setClientes(res.data));
    }, [clienteId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setContactoCliente({
            ...contactoCliente,
            //[e.target.name]: e.target.value,
            [name]:
                name === "nombre" || name === "puesto"
                    ? value.toUpperCase()
                    : value, // Convierte a mayúsculas solo para nombre y puesto
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Detiene la propagación del evento submit
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Validación de campos obligatorios
        const camposObligatorios = [
            { campo: contactoCliente.idcliente, nombre: "Cliente" },
            { campo: contactoCliente.nombre, nombre: "Nombre" },
            { campo: contactoCliente.telefono, nombre: "Teléfono" },
            { campo: contactoCliente.puesto, nombre: "Puesto" },
        ];

        const camposFaltantes = camposObligatorios.filter(
            (c) =>
                // Verifica si c.campo es null o undefined (usamos == null para cubrir ambos)
                c.campo == null ||
                // O si c.campo es una cadena Y (typeof verifica que sea string)
                // la cadena está vacía después de quitar espacios (trim())
                (typeof c.campo === "string" && c.campo.trim() === "")
        );
        if (camposFaltantes.length > 0) {
            const nombres = camposFaltantes.map((c) => c.nombre).join(", ");
            alertify.alert(
                "DATOS OBLIGATORIOS",
                `Por favor, complete los siguientes campos obligatorios: ${nombres}`
            );
            return;
        }

        //
        if (isEditModeContacto && idParaEditar) {
            // Editando un contacto
            axios
                .put(`/api/contacto_cliente/${idParaEditar}`, contactoCliente, {
                    headers,
                })
                .then((res) => {
                    alertify.success("Contacto actualizado correctamente");
                    if (onContactCreated) onContactCreated(); // Callback general
                    if (onClose) onClose(); // Cierra el modal
                })
                .catch((error) => {
                    /* ... tu manejo de error ... */
                });
        } else {
            // Creando un nuevo contacto
            axios
                .post("/api/contacto_cliente", contactoCliente, { headers })
                .then((res) => {
                    alertify.success("Contacto creado correctamente");
                    if (onContactCreated) onContactCreated(); // Llama al callback
                    if (onClose) onClose(); // Cierra el modal
                })
                .catch((error) => {
                    /* ... tu manejo de error ... */
                });
        }

        limpiarCampos(); // Limpia los campos después de guardar
    };

    const limpiarCampos = () => {
        setContactoCliente({
            idcliente: clienteId || 0, // Mantiene el clienteId si vino como prop
            nombre: "",
            telefono: "",
            correo: "",
            puesto: "",
            observaciones: "",
        });
    };

    return (
        <div className="mt-4">
            <Header
                title={
                    isEditModeContacto
                        ? "Editar Contacto"
                        : "Registrar Nuevo Contacto"
                }
            />
            <div className="card shadow p-4">
                {/* <div className="card-header bg-primary text-white">
                    <h4 className="mb-0">Registro de contactos</h4>
                </div> */}
                <div className="card shadow p-3">
                    {" "}
                    {/* Menos padding si es modal */}
                    <div className="card-body card-form">
                        <form onSubmit={handleSubmit}>
                            <div className="row g-2">
                                <div className="col-md-12">
                                    <label className="form-label">
                                        Cliente
                                    </label>
                                    {/* <select name="idcliente" value={contactoCliente.idcliente} onChange={handleChange} className='form-control form-control-sm campo-obligatorio-fondo'>
                                    <option value="">Seleccionar Cliente</option>
                                    {clientes.map(cliente => (
                                        <option key={cliente.idcliente} value={cliente.idcliente}>
                                            {cliente.nombre}
                                        </option>
                                    ))}
                                </select> */}
                                    {clienteId && nombreClienteFijado ? (
                                        <input
                                            type="text"
                                            value={`${nombreClienteFijado} (ID: ${clienteId})`}
                                            className="form-control form-control-sm"
                                            disabled
                                        />
                                    ) : (
                                        <select
                                            name="idcliente"
                                            value={contactoCliente.idcliente}
                                            onChange={handleChange}
                                            className="form-control form-control-sm campo-obligatorio-fondo"
                                            // Deshabilitar si es para un clienteId específico Y NO estamos editando un contacto existente
                                            // (si contactoAEditarId está presente, es edición y se debe poder cambiar si es necesario, aunque raro)
                                            disabled={
                                                !!clienteId &&
                                                !contactoAEditarId
                                            }
                                        >
                                            <option value="">
                                                Seleccionar Cliente
                                            </option>
                                            {clientes.map((cliente) => (
                                                <option
                                                    key={cliente.idcliente}
                                                    value={cliente.idcliente}
                                                >
                                                    {cliente.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                            <FormSection title={"Datos del contacto"}>
                                <div className="row g-2">
                                    <div className="col-md-4">
                                        <label className="form-label">
                                            Nombre
                                        </label>
                                        <input
                                            type="text"
                                            name="nombre"
                                            value={contactoCliente.nombre}
                                            onChange={handleChange}
                                            placeholder="Nombre"
                                            className="form-control form-control-sm campo-obligatorio-fondo"
                                        />
                                    </div>
                                </div>
                                <div className="row g-2">
                                    <div className="col-md-4">
                                        <label className="form-label">
                                            Teléfono
                                        </label>
                                        <input
                                            type="text"
                                            name="telefono"
                                            value={contactoCliente.telefono}
                                            //onChange={handleChange}
                                            onChange={(e) => {
                                                const value =
                                                    e.target.value.replace(
                                                        /\D/g,
                                                        ""
                                                    ); // Solo números
                                                if (value.length <= 8) {
                                                    handleChange({
                                                        target: {
                                                            name: "telefono",
                                                            value,
                                                        },
                                                    });
                                                }
                                            }}
                                            placeholder="Teléfono"
                                            className="form-control form-control-sm campo-obligatorio-fondo"
                                        />
                                    </div>
                                </div>
                                <div className="row g-2">
                                    <div className="col-md-4">
                                        <label className="form-label">
                                            Correo
                                        </label>
                                        <input
                                            type="text"
                                            name="correo"
                                            value={contactoCliente.correo}
                                            onChange={handleChange}
                                            placeholder="Correo"
                                            className="form-control form-control-sm"
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">
                                            Puesto
                                        </label>
                                        <input
                                            type="text"
                                            name="puesto"
                                            value={contactoCliente.puesto}
                                            onChange={handleChange}
                                            placeholder="Puesto"
                                            className="form-control form-control-sm campo-obligatorio-fondo"
                                        />
                                    </div>
                                </div>
                                <div className="row g-2">
                                    <div className="col-md-10">
                                        <label className="form-label">
                                            Observaciones
                                        </label>
                                        <input
                                            type="text"
                                            name="observaciones"
                                            value={
                                                contactoCliente.observaciones
                                            }
                                            onChange={handleChange}
                                            placeholder="Observaciones"
                                            className="form-control form-contorl-lg"
                                        />
                                    </div>
                                </div>
                            </FormSection>
                            <div
                                className="mt-4 p-3 border rounded shadow-sm bg-light"
                                style={{ borderColor: "#ddd" }}
                            >
                                <div className="d-flex flex-wrap gap-2 justify-content-between">
                                    <button
                                        type="submit"
                                        className="btn btn-sm btn-guardar d-flex align-items-center justify-content-center gap-2 flex-fill"
                                        style={{ minWidth: "150px" }}
                                    >
                                        <FaSave />
                                        {isEditModeContacto
                                            ? "ACTUALIZAR"
                                            : "GUARDAR"}
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
                                        <FaBroom /> LIMPIAR
                                    </button>
                                    {typeof onClose === "function" && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm d-flex align-items-center justify-content-center gap-2" // btn-sm
                                            onClick={onClose}
                                        >
                                            CANCELAR
                                        </button>
                                    )}
                                    <Link
                                        to="/contacto_cliente/lista"
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
        </div>
    );
}

export default ContactoClienteForm;
