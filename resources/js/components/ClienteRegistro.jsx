import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

import {
    Link,
    useParams,
} from "react-router-dom";

import alertify from "alertifyjs";

import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

import {
    FaSave,
    FaSearch,
    FaBroom,
    FaPlusCircle,
    FaUser,
    FaMapMarkerAlt,
    FaCreditCard,
    FaPhoneAlt,
} from "react-icons/fa";

import ContactoClienteForm from "./ContactoClienteForm";
import FormSection from "./FormSection";

import "../../css/modalStyles.css";
import "../../css/ClienteRegistro.css";

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
        idpais: "",
    });


    const [departamentosPais, setDepartamentosPais] = useState([]);

    const [municipios, setMunicipios] = useState([]);

    const [vendedores, setVendedores] = useState([]);

    const [paises, setPaises] = useState([]);

    const [errors, setErrors] = useState({});

    const [isContactoModalOpen, setIsContactoModalOpen] =
        useState(false);


    const { id } = useParams();

    const [modoEdicion, setModoEdicion] =
        useState(!!id);


    /* =====================================================
       CARGA
    ===================================================== */

    useEffect(() => {

        const token =
            localStorage.getItem("token");

        const headers = {
            Authorization:
                `Bearer ${token}`,
        };


        const cargarEdicion =
            async () => {

                try {

                    setModoEdicion(true);


                    const [
                        cliRes,
                        deptRes,
                        vendRes,
                        paisRes,
                    ] = await Promise.all([

                        axios.get(
                            `/api/clientes/${id}`,
                            { headers }
                        ),

                        axios.get(
                            "/api/departamentos-pais",
                            { headers }
                        ),

                        axios.get(
                            "/api/vendedores",
                            { headers }
                        ),

                        axios.get(
                            "/api/paises",
                            { headers }
                        ),

                    ]);


                    const data =
                        cliRes.data || {};

                    const departamentos =
                        deptRes.data || [];

                    const vendedoresSrv =
                        vendRes.data || [];

                    const paisesSrv =
                        paisRes.data || [];


                    setDepartamentosPais(
                        departamentos
                    );

                    setVendedores(
                        vendedoresSrv
                    );

                    setPaises(
                        paisesSrv
                    );


                    const iddepartamentoStr =
                        data.iddepartamento != null
                            ? String(
                                  data.iddepartamento
                              )
                            : "";


                    const idEmpleadoStr =
                        data.id_empleado != null
                            ? String(
                                  data.id_empleado
                              )
                            : "";


                    const idMunicipioStr =
                        data.id_municipio != null
                            ? String(
                                  data.id_municipio
                              )
                            : "";


                    const idPaisStr =
                        data.idpais != null
                            ? String(
                                  data.idpais
                              )
                            : "";


                    setCliente((prev) => ({

                        ...prev,

                        idcliente:
                            data.idcliente || id,

                        codigo:
                            data.codigo || "",

                        nit:
                            data.nit || "",

                        cui:
                            data.cui || "",

                        nombre:
                            data.nombre || "",

                        razonsocial:
                            data.razonsocial || "",

                        direccion:
                            data.direccion || "",

                        email:
                            data.email || "",

                        telefono_uno:
                            data.telefono_uno || "",

                        telefono_dos:
                            data.telefono_dos || "",

                        telefono_tres:
                            data.telefono_tres || "",

                        iddepartamento:
                            iddepartamentoStr,

                        monto_credito:
                            data.monto_credito ?? "",

                        dias_credito:
                            data.dias_credito != null
                                ? String(
                                      data.dias_credito
                                  )
                                : "",

                        id_empleado:
                            idEmpleadoStr,

                        comentario:
                            data.comentario || "",

                        idtipocliente:
                            data.idtipocliente ?? "",

                        id_municipio:
                            idMunicipioStr,

                        codigo_postal:
                            data.codigo_postal || "",

                        usuario_registro:
                            data.usuario_registro || "",

                        usuario_modifica:
                            data.usuario_modifica || "",

                        fecharegistro:
                            data.fecharegistro || "",

                        fecha_modificacion:
                            data.fecha_modificacion || "",

                        estado:
                            data.estado ?? "",

                        extranjero:
                            data.extranjero || "",

                        pasaporte:
                            data.pasaporte || "",

                        excento_iva:
                            data.excento_iva || "N",

                        idpais:
                            idPaisStr,

                    }));


                    if (
                        iddepartamentoStr
                    ) {

                        await loadMunicipios(
                            iddepartamentoStr
                        );

                    }


                    if (
                        !data.codigo_postal ||
                        data.codigo_postal === ""
                    ) {

                        const depto =
                            departamentos.find(
                                (d) =>
                                    String(
                                        d.iddepartamentopais
                                    ) ===
                                    iddepartamentoStr
                            );


                        if (
                            depto?.codigo_postal
                        ) {

                            setCliente(
                                (prev) => ({
                                    ...prev,
                                    codigo_postal:
                                        depto.codigo_postal,
                                })
                            );

                        }

                    }

                } catch (err) {

                    console.error(
                        "Error al cargar edición:",
                        err
                    );

                }

            };


        const cargarNuevo =
            async () => {

                try {

                    setModoEdicion(false);


                    const [
                        deptRes,
                        vendRes,
                        paisRes,
                    ] = await Promise.all([

                        axios.get(
                            "/api/departamentos-pais",
                            { headers }
                        ),

                        axios.get(
                            "/api/vendedores",
                            { headers }
                        ),

                        axios.get(
                            "/api/paises",
                            { headers }
                        ),

                    ]);


                    const departamentos =
                        deptRes.data || [];

                    const vendedoresSrv =
                        vendRes.data || [];

                    const paisesSrv =
                        paisRes.data || [];


                    setDepartamentosPais(
                        departamentos
                    );

                    setVendedores(
                        vendedoresSrv
                    );

                    setPaises(
                        paisesSrv
                    );


                    const deptoGuatemala =
                        departamentos.find(
                            (d) =>
                                d.nombre?.toUpperCase() ===
                                "GUATEMALA"
                        );


                    if (deptoGuatemala) {

                        const idDeptStr =
                            String(
                                deptoGuatemala.iddepartamentopais
                            );


                        setCliente(
                            (prev) => ({
                                ...prev,
                                iddepartamento:
                                    idDeptStr,
                                codigo_postal:
                                    deptoGuatemala.codigo_postal ||
                                    "",
                            })
                        );


                        await loadMunicipios(
                            idDeptStr
                        );

                    }


                    const paisGuatemala =
                        paisesSrv.find(
                            (p) =>
                                p.codigo_iso ===
                                    "GT" ||
                                p.nombre?.toUpperCase() ===
                                    "GUATEMALA"
                        );


                    if (paisGuatemala) {

                        setCliente(
                            (prev) => ({
                                ...prev,
                                idpais:
                                    String(
                                        paisGuatemala.idpais
                                    ),
                            })
                        );

                    }

                } catch (err) {

                    console.error(
                        "Error al iniciar nuevo:",
                        err
                    );

                }

            };


        if (id) {

            cargarEdicion();

        } else {

            cargarNuevo();

        }

    }, [id]);


    /* =====================================================
       VALIDADORES
    ===================================================== */

    const validators = {

        nit:
            validateNIT,

        telefono_uno:
            (val) =>
                validateOnlyNumbers(
                    val,
                    8,
                    8
                ),

        telefono_dos:
            (val) =>
                validateOnlyNumbers(
                    val,
                    8,
                    8
                ),

        telefono_tres:
            (val) =>
                validateOnlyNumbers(
                    val,
                    8,
                    8
                ),

        monto_credito:
            (val) =>
                validateDecimalAmount(
                    val,
                    10,
                    2
                ),

        dias_credito:
            (val) =>
                validateOnlyNumbers(
                    val,
                    0,
                    2
                ),

    };


    validators.codigo_postal =
        (val) => {

            if (!val) {
                return true;
            }

            return /^\d{5}$/.test(val)
                ? true
                : "Código postal debe tener 5 dígitos";

        };


    /* =====================================================
       MUNICIPIOS
    ===================================================== */

    const loadMunicipios =
        async (idDepartamento) => {

            const token =
                localStorage.getItem("token");

            const headers = {
                Authorization:
                    `Bearer ${token}`,
            };


            if (!idDepartamento) {

                setMunicipios([]);

                return;

            }


            try {

                const res =
                    await axios.get(
                        `/api/municipios/${idDepartamento}`,
                        { headers }
                    );


                setMunicipios(
                    res.data || []
                );

            } catch (e) {

                console.error(
                    "Error al cargar municipios:",
                    e
                );

                setMunicipios([]);

            }

        };


    /* =====================================================
       HANDLE CHANGE
    ===================================================== */

    const handleChange = (e) => {

        const {
            name,
            value,
        } = e.target;


        const uppercaseFields = [
            "nombre",
            "razonsocial",
            "nit",
        ];


        const formattedValue =
            uppercaseFields.includes(name)
                ? value.toUpperCase()
                : value;


        setCliente(
            (prev) => ({
                ...prev,
                [name]:
                    formattedValue,
            })
        );


        if (validators[name]) {

            const result =
                validators[name](
                    formattedValue
                );


            setErrors(
                (prev) => ({
                    ...prev,

                    [name]:
                        result === true
                            ? null
                            : result,
                })
            );

        }


        if (
            name ===
            "iddepartamento"
        ) {

            const d =
                departamentosPais.find(
                    (d) =>
                        String(
                            d.iddepartamentopais
                        ) ===
                        String(value)
                );


            const cp =
                d?.codigo_postal || "";


            setCliente(
                (prev) => ({
                    ...prev,
                    iddepartamento:
                        value,
                    codigo_postal:
                        cp,
                    id_municipio:
                        "",
                })
            );


            loadMunicipios(
                value
            );

        }

    };


    /* =====================================================
       GUARDAR
    ===================================================== */

    const handleSubmit = (e) => {

        e.preventDefault();


        const token =
            localStorage.getItem("token");

        const headers = {
            Authorization:
                `Bearer ${token}`,
        };


        const clienteData = {
            ...cliente,
        };


        if (!clienteData.cui) {

            clienteData.cui =
                "0";

        }


        const camposObligatorios = [

            {
                campo:
                    clienteData.nit,
                nombre:
                    "Nit",
            },

            {
                campo:
                    clienteData.nombre,
                nombre:
                    "Nombre",
            },

            {
                campo:
                    clienteData.razonsocial,
                nombre:
                    "Razón Social",
            },

            {
                campo:
                    clienteData.direccion,
                nombre:
                    "Dirección",
            },

            {
                campo:
                    clienteData.monto_credito,
                nombre:
                    "Monto crédito",
            },

            {
                campo:
                    clienteData.dias_credito,
                nombre:
                    "Días crédito",
            },

            {
                campo:
                    clienteData.id_empleado,
                nombre:
                    "Vendedor asociado",
            },

            {
                campo:
                    clienteData.idpais,
                nombre:
                    "País",
            },

        ];


        const camposFaltantes =
            camposObligatorios.filter(
                (c) =>
                    !c.campo ||
                    String(
                        c.campo
                    ).trim() === ""
            );


        if (
            camposFaltantes.length > 0
        ) {

            const nombres =
                camposFaltantes
                    .map(
                        (c) =>
                            c.nombre
                    )
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
                    `/api/clientes/${id}`,
                    clienteData,
                    { headers }
                )
                .then(() => {

                    alertify.success(
                        "Cliente actualizado correctamente"
                    );

                    limpiarCampos();

                })
                .catch((error) => {

                    console.error(
                        error
                    );

                    alertify.error(
                        "Error al actualizar el cliente"
                    );

                });

        } else {

            axios
                .post(
                    "/api/clientes",
                    clienteData,
                    { headers }
                )
                .then((res) => {

                    alertify.success(
                        "Cliente creado correctamente"
                    );


                    if (
                        res.data &&
                        res.data.idcliente
                    ) {

                        setCliente(
                            (prevCliente) => ({
                                ...prevCliente,

                                idcliente:
                                    res.data.idcliente,
                            })
                        );

                    }


                    limpiarCampos();

                })
                .catch((error) => {

                    console.error(
                        error
                    );

                    alertify.error(
                        "Error al crear el cliente"
                    );

                });

        }

    };


    /* =====================================================
       LIMPIAR
    ===================================================== */

    const limpiarCampos = () => {

        const deptoGuatemala =
            departamentosPais.find(
                (d) =>
                    d.nombre?.toUpperCase() ===
                    "GUATEMALA"
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

            iddepartamento:
                deptoGuatemala
                    ? deptoGuatemala.iddepartamentopais
                    : "",

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

            excento_iva: "N",

            idpais:
                paises.find(
                    (p) =>
                        p.codigo_iso ===
                        "GT"
                )?.idpais || "",

        });


        setModoEdicion(false);

    };


    /* =====================================================
       CONTACTO
    ===================================================== */

    const handleOpenContactoModal =
        () => {

            if (
                !cliente.idcliente &&
                !id
            ) {

                alertify.warning(
                    "Por favor, primero guarde el cliente para poder agregarle contactos."
                );

                return;

            }


            setIsContactoModalOpen(
                true
            );

        };


    const handleCloseContactoModal =
        () => {

            setIsContactoModalOpen(
                false
            );

        };


    const handleContactCreated =
        () => {

            alertify.success(
                "Contacto asociado al cliente creado exitosamente."
            );

        };


    /* =====================================================
       INFILE
    ===================================================== */

    const consultarNitInfile =
        async (nit) => {

            if (
                !nit ||
                modoEdicion
            ) {
                return;
            }


            try {

                const token =
                    localStorage.getItem(
                        "token"
                    );


                const res =
                    await axios.get(
                        `/api/infile/consulta-nit/${nit}`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        }
                    );


                if (
                    res.data.ok
                ) {

                    setCliente(
                        (prev) => ({
                            ...prev,

                            nombre:
                                prev.nombre ||
                                res.data.razon_social,

                            razonsocial:
                                prev.razonsocial ||
                                res.data.razon_social,

                            direccion:
                                prev.direccion ||
                                res.data.direccion ||
                                "",
                        })
                    );


                    alertify.success(
                        "Datos obtenidos desde INFILE"
                    );

                }

            } catch (err) {

                alertify.warning(
                    err.response?.data?.message ||
                    "No se pudo consultar el NIT"
                );

            }

        };


    /* =====================================================
       UI
    ===================================================== */

    return (

        <div className="gp-module-page cliente-registro-page">

            <div className="gp-module-card">

                <div className="card-body">


                    {/* =====================================
                        META HEADER
                    ====================================== */}

                    <div className="erp-meta-header d-flex justify-content-between align-items-center">

                        <div>

                            <span className="erp-badge">
                                Módulo · Clientes
                            </span>

                            <span className="text-muted small d-block">

                                {id
                                    ? "Actualización de información del cliente"
                                    : "Registro de nuevo cliente"}

                            </span>

                        </div>


                        {id && (

                            <div className="cliente-edit-status">

                                <span>
                                    EDITANDO
                                </span>

                                <strong>
                                    #{id}
                                </strong>

                            </div>

                        )}

                    </div>


                    <form
                        onSubmit={
                            handleSubmit
                        }
                    >


                        {/* =================================
                            IDENTIFICACIÓN
                        ================================== */}

                        <FormSection title="Identificación del cliente">

                            <div className="cliente-section-hint">

                                <FaUser />

                                <span>
                                    Información fiscal y datos principales del cliente.
                                </span>

                            </div>


                            <div className="row g-3">


                                <div className="col-md-3">

                                    <label className="form-label">
                                        NIT
                                    </label>

                                    <input
                                        type="text"
                                        name="nit"
                                        value={
                                            cliente.nit
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        onBlur={(e) =>
                                            consultarNitInfile(
                                                e.target.value
                                            )
                                        }
                                        placeholder="NIT"
                                        className={
                                            `form-control form-control-sm campo-obligatorio-fondo ${
                                                errors.nit
                                                    ? "is-invalid"
                                                    : ""
                                            }`
                                        }
                                    />

                                    {errors.nit && (

                                        <div className="invalid-feedback">
                                            {errors.nit}
                                        </div>

                                    )}

                                </div>


                                <div className="col-md-3">

                                    <label className="form-label">
                                        CUI
                                    </label>

                                    <input
                                        type="text"
                                        name="cui"
                                        value={
                                            cliente.cui
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="CUI"
                                        className="form-control form-control-sm"
                                    />

                                </div>


                                <div className="col-md-3">

                                    <label className="form-label">
                                        Tipo de cliente
                                    </label>

                                    <select
                                        className="form-select form-select-sm"
                                        name="extranjero"
                                        value={
                                            cliente.extranjero
                                        }
                                        onChange={(e) => {

                                            const value =
                                                e.target.value;


                                            setCliente(
                                                (prev) => ({
                                                    ...prev,

                                                    extranjero:
                                                        value,

                                                    pasaporte:
                                                        value === "S"
                                                            ? prev.pasaporte
                                                            : "",
                                                })
                                            );

                                        }}
                                    >

                                        <option value="">
                                            Seleccione
                                        </option>

                                        <option value="N">
                                            LOCAL
                                        </option>

                                        <option value="S">
                                            EXTRANJERO
                                        </option>

                                    </select>

                                </div>


                                {cliente.extranjero === "S" && (

                                    <div className="col-md-3">

                                        <label className="form-label">
                                            Pasaporte
                                        </label>

                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            name="pasaporte"
                                            value={
                                                cliente.pasaporte
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Número de pasaporte"
                                        />

                                    </div>

                                )}

                            </div>


                            <div className="row g-3 mt-1">


                                <div className="col-md-6">

                                    <label className="form-label">
                                        Nombre
                                    </label>

                                    <input
                                        type="text"
                                        name="nombre"
                                        value={
                                            cliente.nombre
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Nombre del cliente"
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
                                        value={
                                            cliente.razonsocial
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Razón social"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />

                                </div>

                            </div>


                            <div className="row g-3 mt-1">


                                <div className="col-md-8">

                                    <label className="form-label">
                                        Dirección
                                    </label>

                                    <input
                                        type="text"
                                        name="direccion"
                                        value={
                                            cliente.direccion
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Dirección fiscal"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />

                                </div>


                                <div className="col-md-4">

                                    <label className="form-label">
                                        Correo
                                    </label>

                                    <input
                                        type="text"
                                        name="email"
                                        value={
                                            cliente.email
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="correo@empresa.com"
                                        className="form-control form-control-sm"
                                    />

                                </div>

                            </div>


                            <div className="row g-3 mt-1 align-items-end">


                                <div className="col-md-4">

                                    <label className="form-label">
                                        País
                                    </label>

                                    <select
                                        name="idpais"
                                        value={
                                            cliente.idpais ||
                                            ""
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        className="form-select form-select-sm campo-obligatorio-fondo"
                                    >

                                        <option value="">
                                            Seleccione país
                                        </option>


                                        {paises.map(
                                            (pais) => (

                                                <option
                                                    key={
                                                        pais.idpais
                                                    }
                                                    value={
                                                        pais.idpais
                                                    }
                                                >
                                                    {pais.nombre}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>


                                <div className="col-md-4">

                                    <div className="cliente-check-card">

                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="excentoIva"
                                            checked={
                                                cliente.excento_iva ===
                                                "S"
                                            }
                                            onChange={(e) => {

                                                setCliente(
                                                    (prev) => ({
                                                        ...prev,

                                                        excento_iva:
                                                            e.target.checked
                                                                ? "S"
                                                                : "N",
                                                    })
                                                );

                                            }}
                                        />


                                        <label
                                            htmlFor="excentoIva"
                                        >

                                            Cliente exento de IVA

                                        </label>

                                    </div>

                                </div>

                            </div>

                        </FormSection>


                        {/* =================================
                            CONTACTO
                        ================================== */}

                        <FormSection title="Información de contacto">

                            <div className="cliente-section-hint">

                                <FaPhoneAlt />

                                <span>
                                    Datos utilizados para comunicación y seguimiento comercial.
                                </span>

                            </div>


                            <div className="row g-3">


                                {[
                                    [
                                        "telefono_uno",
                                        "Teléfono uno",
                                    ],

                                    [
                                        "telefono_dos",
                                        "Teléfono dos",
                                    ],

                                    [
                                        "telefono_tres",
                                        "Teléfono tres",
                                    ],

                                ].map(
                                    ([campo, label]) => (

                                        <div
                                            className="col-md-4"
                                            key={
                                                campo
                                            }
                                        >

                                            <label className="form-label">

                                                {label}

                                            </label>


                                            <input
                                                type="text"
                                                name={
                                                    campo
                                                }
                                                value={
                                                    cliente[
                                                        campo
                                                    ]
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                placeholder="Teléfono"
                                                className={
                                                    `form-control form-control-sm ${
                                                        errors[
                                                            campo
                                                        ]
                                                            ? "is-invalid"
                                                            : ""
                                                    }`
                                                }
                                                inputMode="numeric"
                                                maxLength={
                                                    8
                                                }
                                            />


                                            {errors[
                                                campo
                                            ] && (

                                                <div className="invalid-feedback">

                                                    {
                                                        errors[
                                                            campo
                                                        ]
                                                    }

                                                </div>

                                            )}

                                        </div>

                                    )
                                )}

                            </div>

                        </FormSection>


                        {/* =================================
                            UBICACIÓN
                        ================================== */}

                        <FormSection title="Ubicación">

                            <div className="cliente-section-hint">

                                <FaMapMarkerAlt />

                                <span>
                                    Ubicación geográfica y datos postales.
                                </span>

                            </div>


                            <div className="row g-3">


                                <div className="col-md-4">

                                    <label className="form-label">
                                        Departamento
                                    </label>

                                    <select
                                        name="iddepartamento"
                                        value={
                                            cliente.iddepartamento
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        className="form-select form-select-sm"
                                    >

                                        <option value="">
                                            Seleccionar Departamento
                                        </option>


                                        {departamentosPais.map(
                                            (
                                                departamentoPais
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

                                            )
                                        )}

                                    </select>

                                </div>


                                <div className="col-md-4">

                                    <label className="form-label">
                                        Municipio
                                    </label>

                                    <select
                                        name="id_municipio"
                                        value={
                                            cliente.id_municipio ||
                                            ""
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        className="form-select form-select-sm"
                                        disabled={
                                            !cliente.iddepartamento
                                        }
                                    >

                                        <option value="">
                                            Seleccionar Municipio
                                        </option>


                                        {municipios.map(
                                            (m) => (

                                                <option
                                                    key={
                                                        m.id_municipio
                                                    }
                                                    value={
                                                        m.id_municipio
                                                    }
                                                >
                                                    {m.nombre}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>


                                <div className="col-md-4">

                                    <label className="form-label">
                                        Código Postal
                                    </label>

                                    <input
                                        type="text"
                                        name="codigo_postal"
                                        value={
                                            cliente.codigo_postal ||
                                            ""
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        className="form-control form-control-sm"
                                        placeholder="Código Postal"
                                    />

                                    <small className="text-muted cliente-helper">

                                        Se completa según el departamento y puede modificarse.

                                    </small>

                                </div>

                            </div>

                        </FormSection>


                        {/* =================================
                            CRÉDITO / COMERCIAL
                        ================================== */}

                        <FormSection title="Condiciones comerciales">

                            <div className="cliente-section-hint">

                                <FaCreditCard />

                                <span>
                                    Configuración de crédito y vendedor responsable.
                                </span>

                            </div>


                            <div className="row g-3">


                                <div className="col-md-4">

                                    <label className="form-label">
                                        Monto crédito
                                    </label>

                                    <div className="cliente-money-input">

                                        <span>
                                            Q
                                        </span>

                                        <input
                                            type="text"
                                            name="monto_credito"
                                            value={
                                                cliente.monto_credito
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="0.00"
                                            className={
                                                `form-control form-control-sm campo-obligatorio-fondo ${
                                                    errors.monto_credito
                                                        ? "is-invalid"
                                                        : ""
                                                }`
                                            }
                                            inputMode="numeric"
                                        />

                                    </div>


                                    {errors.monto_credito && (

                                        <div className="invalid-feedback d-block">

                                            {
                                                errors.monto_credito
                                            }

                                        </div>

                                    )}

                                </div>


                                <div className="col-md-3">

                                    <label className="form-label">
                                        Días crédito
                                    </label>

                                    <input
                                        type="text"
                                        name="dias_credito"
                                        value={
                                            cliente.dias_credito
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="0"
                                        className={
                                            `form-control form-control-sm campo-obligatorio-fondo ${
                                                errors.dias_credito
                                                    ? "is-invalid"
                                                    : ""
                                            }`
                                        }
                                        inputMode="numeric"
                                    />


                                    {errors.dias_credito && (

                                        <div className="invalid-feedback">

                                            {
                                                errors.dias_credito
                                            }

                                        </div>

                                    )}

                                </div>


                                <div className="col-md-5">

                                    <label className="form-label">
                                        Vendedor asociado
                                    </label>

                                    <select
                                        name="id_empleado"
                                        value={
                                            cliente.id_empleado
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        className="form-select form-select-sm campo-obligatorio-fondo"
                                    >

                                        <option value="">
                                            Seleccionar vendedor
                                        </option>


                                        {vendedores.map(
                                            (vendedor) => (

                                                <option
                                                    key={
                                                        vendedor.id_empleado
                                                    }
                                                    value={
                                                        vendedor.id_empleado
                                                    }
                                                >

                                                    {
                                                        vendedor.nombre
                                                    }

                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>

                            </div>

                        </FormSection>


                        {/* =================================
                            ACCIONES
                        ================================== */}

                        <div className="gp-action-footer">

                            <div className="gp-action-toolbar">


                                <button
                                    type="submit"
                                    className="gp-action-button gp-action-save flex-fill"
                                >

                                    <FaSave />

                                    {id
                                        ? "ACTUALIZAR"
                                        : "GUARDAR"}

                                </button>


                                {modoEdicion && (

                                    <button
                                        type="button"
                                        className="gp-action-button cliente-contact-button flex-fill"
                                        onClick={
                                            handleOpenContactoModal
                                        }
                                    >

                                        <FaPlusCircle />

                                        AGREGAR CONTACTO

                                    </button>

                                )}


                                <button
                                    type="button"
                                    className="gp-action-button gp-action-clean flex-fill"
                                    onClick={
                                        limpiarCampos
                                    }
                                >

                                    <FaBroom />

                                    LIMPIAR

                                </button>


                                <Link
                                    to="/clientes/lista"
                                    className="gp-action-button gp-action-consult flex-fill"
                                >

                                    <FaSearch />

                                    CONSULTAR

                                </Link>

                            </div>

                        </div>

                    </form>

                </div>

            </div>


            {/* =============================================
                MODAL CONTACTO
            ============================================== */}

            {isContactoModalOpen && (

                <div className="modal-overlay">

                    <div className="cliente-contact-modal">

                        <ContactoClienteForm
                            clienteId={
                                id ||
                                cliente.idcliente
                            }
                            onClose={
                                handleCloseContactoModal
                            }
                            onContactCreated={
                                handleContactCreated
                            }
                        />

                    </div>

                </div>

            )}

        </div>

    );

}


export default ClienteRegistro;