import React, { useState, useEffect } from "react";
//Axios es un cliente HTTP basado en promesas que facilita la realización de solicitudes HTTP desde el navegador o Node.js.
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css"; // Importa los estilos de Bootstrap
import { Link, useParams, useNavigate } from "react-router-dom"; //
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";
import {
    FaSave,
    FaSearch,
    FaHome,
    FaBroom,
    FaPlusCircle,
} from "react-icons/fa";
import Header from "./Header";
import ContactoClienteForm from "./ContactoClienteForm"; // 1. Importa el formulario de contacto
import "../../css/modalStyles.css"; // 2. Crea y enlaza un CSS para el modal (ver abajo)
import FormSection from "./FormSection"; // 3. Importa el componente FormSection
import {
    validateNIT,
    validateOnlyNumbers,
    validateDecimalAmount,
} from "../utils/validators";

function ClienteRegistro() {
    const [cliente, setCliente] = useState({
        idcliente: "",
        nit: "",
        nombre: "",
        direccion: "",
        email: "",
        comentario: "",
        fecharegistro: "",
        estado: "",
        codigo: "",
        iddepartamento: "",
        razonsocial: "",
        monto_credito: "",
        id_empleado: "",
        dias_credito: "",
        id_municipio: "",
        idtipocliente: "",
        codigo_postal: "",
        cui: "",
        usuario_registro: "",
        usuario_modifica: "",
        telefono_uno: "",
        telefono_dos: "",
        telefono_tres: "",
        fecha_modificacion: "",
        pasaporte: "",
        extranjero: "",
        excento_iva: "N",
    });

    const [departamentosPais, setDepartamentosPais] = useState([]);
    // en ClienteRegistro()
    const [municipios, setMunicipios] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    //20250324 19:25 edit
    const { id } = useParams(); // Obtiene el id de la URL
    const navigate = useNavigate();
    // 3. Estado para controlar la visibilidad del modal de contacto
    const [isContactoModalOpen, setIsContactoModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(!!id); // true si hay id
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const cargarEdicion = async () => {
            try {
                setModoEdicion(true);

                // 1) Traer todo lo necesario en paralelo
                const [cliRes, deptRes, vendRes] = await Promise.all([
                    axios.get(`/api/clientes/${id}`, { headers }),
                    axios.get("/api/departamentos-pais", { headers }),
                    axios.get("/api/vendedores", { headers }),
                ]);

                const data = cliRes.data || {};
                const departamentos = deptRes.data || [];
                const vendedoresSrv = vendRes.data || [];

                setDepartamentosPais(departamentos);
                setVendedores(vendedoresSrv);

                // 2) Normaliza a string para selects
                const iddepartamentoStr =
                    data.iddepartamento != null
                        ? String(data.iddepartamento)
                        : "";
                const idEmpleadoStr =
                    data.id_empleado != null ? String(data.id_empleado) : "";
                const idMunicipioStr =
                    data.id_municipio != null ? String(data.id_municipio) : "";

                // 3) Setea el cliente
                setCliente((prev) => ({
                    ...prev,
                    idcliente: data.idcliente || id,
                    codigo: data.codigo || "",
                    nit: data.nit || "",
                    cui: data.cui || "",
                    nombre: data.nombre || "",
                    razonsocial: data.razonsocial || "",
                    direccion: data.direccion || "",
                    email: data.email || "",
                    telefono_uno: data.telefono_uno || "",
                    telefono_dos: data.telefono_dos || "",
                    telefono_tres: data.telefono_tres || "",
                    iddepartamento: iddepartamentoStr,
                    monto_credito: data.monto_credito ?? "",
                    dias_credito:
                        data.dias_credito != null
                            ? String(data.dias_credito)
                            : "", // ⬅️ asegura render
                    id_empleado: idEmpleadoStr,
                    comentario: data.comentario || "",
                    idtipocliente: data.idtipocliente ?? "",
                    id_municipio: idMunicipioStr,
                    codigo_postal: data.codigo_postal || "",
                    usuario_registro: data.usuario_registro || "",
                    usuario_modifica: data.usuario_modifica || "",
                    fecharegistro: data.fecharegistro || "",
                    fecha_modificacion: data.fecha_modificacion || "",
                    estado: data.estado ?? "",
                    extranjero: data.extranjero || "",
                    pasaporte: data.pasaporte || "",
                    excento_iva: data.excento_iva || "N",
                }));

                // 4) Municipios (si hay departamento)
                if (iddepartamentoStr) {
                    await loadMunicipios(iddepartamentoStr);
                }

                // 5) Si no traía código postal, usar el del departamento
                if (!data.codigo_postal || data.codigo_postal === "") {
                    const depto = departamentos.find(
                        (d) =>
                            String(d.iddepartamentopais) === iddepartamentoStr
                    );
                    if (depto?.codigo_postal) {
                        setCliente((prev) => ({
                            ...prev,
                            codigo_postal: depto.codigo_postal,
                        }));
                    }
                }
            } catch (err) {
                console.error("Error al cargar edición:", err);
            }
        };

        const cargarNuevo = async () => {
            try {
                setModoEdicion(false);
                const [deptRes, vendRes] = await Promise.all([
                    axios.get("/api/departamentos-pais", { headers }),
                    axios.get("/api/vendedores", { headers }),
                ]);

                const departamentos = deptRes.data || [];
                const vendedoresSrv = vendRes.data || [];

                setDepartamentosPais(departamentos);
                setVendedores(vendedoresSrv);

                const deptoGuatemala = departamentos.find(
                    (d) => d.nombre?.toUpperCase() === "GUATEMALA"
                );
                if (deptoGuatemala) {
                    const idDeptStr = String(deptoGuatemala.iddepartamentopais);
                    setCliente((prev) => ({
                        ...prev,
                        iddepartamento: idDeptStr,
                        codigo_postal: deptoGuatemala.codigo_postal || "",
                    }));
                    await loadMunicipios(idDeptStr);
                }
            } catch (err) {
                console.error("Error al iniciar nuevo:", err);
            }
        };

        if (id) cargarEdicion();
        else cargarNuevo();
    }, [id]);

    const validators = {
        nit: validateNIT,
        telefono_uno: (val) => validateOnlyNumbers(val, 8, 8),
        telefono_dos: (val) => validateOnlyNumbers(val, 8, 8),
        telefono_tres: (val) => validateOnlyNumbers(val, 8, 8),
        monto_credito: (val) => validateDecimalAmount(val, 10, 2),
        dias_credito: (val) => validateOnlyNumbers(val, 0, 2),
    };

    const loadMunicipios = async (idDepartamento) => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        if (!idDepartamento) {
            setMunicipios([]);
            return;
        }
        try {
            const res = await axios.get(`/api/municipios/${idDepartamento}`, {
                headers,
            });
            setMunicipios(res.data || []);
        } catch (e) {
            console.error("Error al cargar municipios:", e);
            setMunicipios([]);
        }
    };
    //Maneja los cambios en el formulario
    const handleChange = (e) => {
        //setCliente({ ...cliente, [e.target.name]: e.target.value });
        const { name, value } = e.target;

        const uppercaseFields = ["nombre", "razonsocial", "nit"];

        const formattedValue = uppercaseFields.includes(name)
            ? value.toUpperCase()
            : value;

        setCliente((prev) => ({ ...prev, [name]: formattedValue }));

        if (validators[name]) {
            const result = validators[name](formattedValue);
            setErrors((prev) => ({
                ...prev,
                [name]: result === true ? null : result,
            }));
        }

        if (validators[name]) {
            const result = validators[name](value);
            setErrors((prev) => ({
                ...prev,
                [name]: result === true ? null : result,
            }));
        }

        // --- lógica especial por campo ---
        if (name === "iddepartamento") {
            // 1) actualizar CP según el departamento
            const d = departamentosPais.find(
                (d) => String(d.iddepartamentopais) === String(value)
            );
            const cp = d?.codigo_postal || "";
            setCliente((prev) => ({
                ...prev,
                iddepartamento: value,
                codigo_postal: cp,
                id_municipio: "", // resetea municipio seleccionado
            }));
            // 2) cargar municipios filtrados
            loadMunicipios(value);
        }
    };

    //maneja el envío del formulario
    const handleSubmit = (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const clienteData = { ...cliente };

        // Verifica si el campo 'cui' está presente
        if (!clienteData.cui) {
            clienteData.cui = "0"; // O clienteData.cui = 'valor_predeterminado';
        }

        // Validación de campos obligatorios
        const camposObligatorios = [
            { campo: clienteData.nit, nombre: "Nit" },
            { campo: clienteData.nombre, nombre: "Nombre" },
            { campo: clienteData.razonsocial, nombre: "Razón Social" },
            { campo: clienteData.direccion, nombre: "Dirección" },
            { campo: clienteData.monto_credito, nombre: "Monto crédito" },
            { campo: clienteData.dias_credito, nombre: "Días crédito" },
            { campo: clienteData.id_empleado, nombre: "Vendedor asociado" },
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
            // Editar cliente existente (solicitud PUT)
            axios
                .put(`/api/clientes/${id}`, clienteData, { headers })
                .then((res) => {
                    // console.log('Cliente actualizado:', res.data);
                    // navigate('/clientes/lista'); // Redirige a la lista
                    alertify.success("Cliente actualizado correctamente");
                    limpiarCampos(); // Llama a la función para limpiar los campos
                })
                .catch((error) => {
                    //console.log("Error al actualizar el cliente:", error);
                    //console.error("Error al actualizar el cliente:", error);
                    alertify.error("Error al actualizar el cliente");
                });
        } else {
            // Crear nuevo cliente (solicitud POST)
            axios
                .post("/api/clientes", clienteData, { headers })
                .then((res) => {
                    // console.log('Cliente creado:', res.data);
                    // navigate('/clientes/lista'); // Redirige a la lista
                    alertify.success("Cliente creado correctamente");
                    // Si la API devuelve el cliente creado con su ID:
                    if (res.data && res.data.idcliente) {
                        setCliente((prevCliente) => ({
                            ...prevCliente,
                            idcliente: res.data.idcliente,
                        }));
                        // Ahora podrías, por ejemplo, abrir el modal de contactos automáticamente
                        // o simplemente el botón "Agregar Contacto" ya funcionará con este ID.
                        // O redirigir a la edición de este nuevo cliente:
                        // navigate(`/clientes/editar/${res.data.idcliente}`);
                    }
                    limpiarCampos(); // Llama a la función para limpiar los campos
                })
                .catch((error) => {
                    //console.log("Error al crear el cliente:", error);
                    //console.error("Error al crear el cliente:", error);
                    alertify.error("Error al crear el cliente");
                });
        }
    };

    const limpiarCampos = () => {
        const deptoGuatemala = departamentosPais.find(
            (d) => d.nombre?.toUpperCase() === "GUATEMALA"
        );

        setCliente({
            idcliente: "",
            nit: "",
            nombre: "",
            direccion: "",
            email: "",
            comentario: "",
            fecharegistro: "",
            estado: "",
            codigo: "",
            iddepartamento: deptoGuatemala
                ? deptoGuatemala.iddepartamentopais
                : "", // ← aquí se asigna GUATEMALA
            razonsocial: "",
            monto_credito: "",
            id_empleado: "",
            dias_credito: "",
            id_municipio: "",
            idtipocliente: "",
            codigo_postal: "",
            cui: "",
            usuario_registro: "",
            usuario_modifica: "",
            telefono_uno: "",
            telefono_dos: "",
            telefono_tres: "",
            fecha_modificacion: "",
            extranjero: "",
            pasaporte: "",
            excento_iva: "",
        });
        setModoEdicion(false); // Oculta el botón Agregar Contacto
    };

    // 4. Funciones para manejar el modal de contacto
    const handleOpenContactoModal = () => {
        if (!cliente.idcliente && !id) {
            // Si es un cliente nuevo sin ID y no estamos en modo edición de un cliente existente
            alertify.warning(
                "Por favor, primero guarde el cliente para poder agregarle contactos."
            );
            return;
        }
        setIsContactoModalOpen(true);
    };

    const handleCloseContactoModal = () => {
        setIsContactoModalOpen(false);
    };

    const handleContactCreated = () => {
        alertify.success("Contacto asociado al cliente creado exitosamente.");
        // Podrías querer recargar una lista de contactos si la muestras aquí, o simplemente cerrar.
        // handleCloseContactoModal(); // ContactoClienteForm ya llama a onClose, que es esta función.
    };

    validators.codigo_postal = (val) => {
        if (!val) return true; // opcional
        return /^\d{5}$/.test(val)
            ? true
            : "Código postal debe tener 5 dígitos";
    };

    const consultarNitInfile = async (nit) => {
    if (!nit || modoEdicion) return;

    try {
        const token = localStorage.getItem("token");

        const res = await axios.get(`/api/infile/consulta-nit/${nit}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.ok) {
            setCliente(prev => ({
                ...prev,
                nombre: prev.nombre || res.data.razon_social,
                razonsocial: prev.razonsocial || res.data.razon_social,
                direccion: prev.direccion || res.data.direccion || ""
            }));

            alertify.success("Datos obtenidos desde INFILE");
        }
    } catch (err) {
        alertify.warning(
            err.response?.data?.message || "No se pudo consultar el NIT"
        );
    }
};


    return (
        <div className="mt-4">
            <Header
                title={
                    id
                        ? "Actualizar registro de cliente"
                        : "Crear registro de cliente"
                }
            />
            <div className="card shadow p-4">
                <div className="card-body card-form">
                    <form onSubmit={handleSubmit}>
                        <FormSection title="Datos generales">
                            <div className="row g-2">
                                {/* <div className='col-md-2'>
                                <label className='form-label'>Código</label>
                                <input type="text" name="codigo" value={cliente.codigo} onChange={handleChange} placeholder="Código" className='form-control form-control-sm' />
                            </div> */}
                                <div className="col-md-4">
                                    <label className="form-label">NIT</label>
                                    <input
                                        type="text"
                                        name="nit"
                                        value={cliente.nit}
                                        onChange={handleChange}
                                        onBlur={(e) => consultarNitInfile(e.target.value)}
                                        placeholder="NIT"
                                        //className="form-control form-control-sm campo-obligatorio-fondo"
                                        className={`form-control form-control-sm campo-obligatorio-fondo ${
                                            errors.nit ? "is-invalid" : ""
                                        }`}
                                    />
                                    {errors.nit && (
                                        <div className="invalid-feedback">
                                            {errors.nit}
                                        </div>
                                    )}
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">CUI</label>
                                    <input
                                        type="text"
                                        name="cui"
                                        value={cliente.cui}
                                        onChange={handleChange}
                                        placeholder="CUI"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                            </div>
                            <div className="row g-2">
                                <div className="col-md-6">
                                    <label className="form-label">Nombre</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={cliente.nombre}
                                        onChange={handleChange}
                                        placeholder="Nombre"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">
                                        Razón Social
                                    </label>
                                    <input
                                        type="text"
                                        name="razonsocial"
                                        value={cliente.razonsocial}
                                        onChange={handleChange}
                                        placeholder="Razón social"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                            </div>
                            <div className="row g-2">
                                <div className="col-md-8">
                                    <label className="form-label">
                                        Dirección
                                    </label>
                                    <input
                                        type="text"
                                        name="direccion"
                                        value={cliente.direccion}
                                        onChange={handleChange}
                                        placeholder="Dirección"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Correo</label>
                                    <input
                                        type="text"
                                        name="email"
                                        value={cliente.email}
                                        onChange={handleChange}
                                        placeholder="Correo"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                            </div>
                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Tipo de Cliente
                                    </label>
                                    <select
                                        className="form-control form-control-sm"
                                        name="extranjero"
                                        value={cliente.extranjero}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setCliente((prev) => ({
                                                ...prev,
                                                extranjero: value,
                                                pasaporte:
                                                    value === "S"
                                                        ? prev.pasaporte
                                                        : "",
                                            }));
                                        }}
                                    >
                                        <option value="">Seleccione</option>
                                        <option value="N">LOCAL</option>
                                        <option value="S">EXTRANJERO</option>
                                    </select>
                                </div>
                                {cliente.extranjero === "S" && (
                                    <div className="col-md-4">
                                        <label className="form-label">
                                            Pasaporte
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            name="pasaporte"
                                            value={cliente.pasaporte}
                                            onChange={handleChange}
                                            placeholder="Número de pasaporte"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="row g-2">
                                <div className="col-md-4 form-check mt-3">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="excentoIva"
                                        checked={cliente.excento_iva === "S"}
                                        onChange={(e) => {
                                            setCliente((prev) => ({
                                                ...prev,
                                                excento_iva: e.target.checked
                                                    ? "S"
                                                    : "N",
                                            }));
                                        }}
                                    />
                                    <label
                                        className="form-check-label"
                                        htmlFor="excentoIva"
                                    >
                                        Cliente exento de IVA
                                    </label>
                                </div>
                            </div>
                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Telefono uno
                                    </label>
                                    <input
                                        type="text"
                                        name="telefono_uno"
                                        value={cliente.telefono_uno}
                                        onChange={handleChange}
                                        placeholder="Teléfono"
                                        //className="form-control form-control-sm"
                                        className={`form-control form-control-sm ${
                                            errors.telefono_uno
                                                ? "is-invalid"
                                                : ""
                                        }`}
                                        inputMode="numeric"
                                        maxLength={8}
                                    />
                                    {errors.telefono_uno && (
                                        <div className="invalid-feedback">
                                            {errors.telefono_uno}
                                        </div>
                                    )}
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Telefono dos
                                    </label>
                                    <input
                                        type="text"
                                        name="telefono_dos"
                                        value={cliente.telefono_dos}
                                        onChange={handleChange}
                                        placeholder="Teléfono"
                                        //className="form-control form-control-sm"
                                        className={`form-control form-control-sm ${
                                            errors.telefono_dos
                                                ? "is-invalid"
                                                : ""
                                        }`}
                                        inputMode="numeric"
                                        maxLength={8}
                                    />
                                    {errors.telefono_dos && (
                                        <div className="invalid-feedback">
                                            {errors.telefono_dos}
                                        </div>
                                    )}
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Telefono tres
                                    </label>
                                    <input
                                        type="text"
                                        name="telefono_tres"
                                        value={cliente.telefono_tres}
                                        onChange={handleChange}
                                        placeholder="Teléfono"
                                        //className="form-control form-control-sm"
                                        className={`form-control form-control-sm ${
                                            errors.telefono_tres
                                                ? "is-invalid"
                                                : ""
                                        }`}
                                        inputMode="numeric"
                                        maxLength={8}
                                    />
                                    {errors.telefono_tres && (
                                        <div className="invalid-feedback">
                                            {errors.telefono_tres}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Departamento
                                    </label>
                                    <select
                                        name="iddepartamento"
                                        value={cliente.iddepartamento}
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
                            </div>
                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Municipio
                                    </label>
                                    <select
                                        name="id_municipio"
                                        value={cliente.id_municipio || ""}
                                        onChange={handleChange}
                                        className="form-control form-control-sm"
                                        disabled={!cliente.iddepartamento}
                                    >
                                        <option value="">
                                            Seleccionar Municipio
                                        </option>
                                        {municipios.map((m) => (
                                            <option
                                                key={m.id_municipio}
                                                value={m.id_municipio}
                                            >
                                                {m.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label">
                                        Código Postal
                                    </label>
                                    <input
                                        type="text"
                                        name="codigo_postal"
                                        value={cliente.codigo_postal || ""}
                                        onChange={handleChange}
                                        className="form-control form-control-sm"
                                        placeholder="Código Postal"
                                    />
                                    <small className="text-muted">
                                        Se autollenó por departamento, puedes
                                        editarlo si aplica.
                                    </small>
                                </div>
                            </div>

                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Monto crédito
                                    </label>
                                    <input
                                        type="text"
                                        name="monto_credito"
                                        value={cliente.monto_credito}
                                        onChange={handleChange}
                                        placeholder="Monto crédito"
                                        //className="form-control form-control-sm campo-obligatorio-fondo"
                                        className={`form-control form-control-sm campo-obligatorio-fondo ${
                                            errors.monto_credito
                                                ? "is-invalid"
                                                : ""
                                        }`}
                                        inputMode="numeric"
                                    />
                                    {errors.monto_credito && (
                                        <div className="invalid-feedback">
                                            {errors.monto_credito}
                                        </div>
                                    )}
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Días crédito
                                    </label>
                                    <input
                                        type="text"
                                        name="dias_credito"
                                        value={cliente.dias_credito}
                                        onChange={handleChange}
                                        placeholder="Días crédito"
                                        //className="form-control form-control-sm campo-obligatorio-fondo"
                                        className={`form-control form-control-sm campo-obligatorio-fondo ${
                                            errors.dias_credito
                                                ? "is-invalid"
                                                : ""
                                        }`}
                                        inputMode="numeric"
                                    />
                                    {errors.dias_credito && (
                                        <div className="invalid-feedback">
                                            {errors.dias_credito}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="row g-2">
                                <div className="col-md-6">
                                    <label className="form-label mt-3">
                                        Vendedor asociado
                                    </label>
                                    <select
                                        name="id_empleado"
                                        value={cliente.id_empleado}
                                        onChange={handleChange}
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    >
                                        <option value="">
                                            Seleccionar vendedor
                                        </option>
                                        {vendedores.map((vendedor) => (
                                            <option
                                                key={vendedor.id_empleado}
                                                value={vendedor.id_empleado}
                                            >
                                                {vendedor.nombre}
                                            </option>
                                        ))}
                                    </select>
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
                                    <FaSave /> {id ? "ACTUALIZAR" : "GUARDAR"}
                                </button>
                                {/* 5. Botón para abrir el modal de contacto */}
                                {/* Mostrar solo si estamos editando un cliente (id existe) o si el cliente nuevo ya tiene idcliente */}
                                {modoEdicion && (
                                    <button
                                        type="button"
                                        className="btn btn-info d-flex align-items-center justify-content-center gap-2"
                                        style={{ minWidth: "180px" }}
                                        onClick={handleOpenContactoModal}
                                    >
                                        <FaPlusCircle /> Agregar Contacto
                                    </button>
                                )}
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
                                    to="/clientes/lista"
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
            {/* 6. Renderizado condicional del modal de contacto */}
            {isContactoModalOpen && (
                <div className="modal-overlay">
                    <div
                        className="modal-content-wrapper"
                        style={{
                            width: "90%",
                            maxWidth: "1000px",
                            margin: "10vh auto",
                            backgroundColor: "#fff",
                            padding: "20px",
                            borderRadius: "8px",
                            boxShadow: "0 0 15px rgba(0,0,0,0.3)",
                        }}
                    >
                        <ContactoClienteForm
                            clienteId={id || cliente.idcliente} // Pasa el ID del cliente actual
                            onClose={handleCloseContactoModal}
                            onContactCreated={handleContactCreated}
                        />
                        {/* Podrías añadir un botón "Cerrar" explícito aquí también si ContactoClienteForm no lo tiene visible */}
                        {/* <button onClick={handleCloseContactoModal} className="btn btn-sm btn-danger mt-2">Cerrar Modal</button> */}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClienteRegistro;
