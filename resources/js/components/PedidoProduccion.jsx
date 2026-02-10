import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link, useParams, useNavigate } from "react-router-dom";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";
import Select from "react-select";
import ContactoClienteForm from "./ContactoClienteForm";
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from "reactstrap";
import {
    FaSave,
    FaSearch,
    FaProductHunt,
    FaBroom,
    FaCheckSquare,
    FaWindowClose,
    FaPlus,
} from "react-icons/fa";
import Header from "./Header";
import FormSection from "./FormSection";
import $ from "jquery";
import "../../css/pedido_produccion.css";
import { version } from "jszip";
import DetalleGrid from "./pedidosproduccion/DetalleGrid";

DataTable.use(DT);

function PedidoProduccion() {
    // const fechaActual = new Date().toISOString().split("T")[0];
    //const fechaActual = new Date().toLocaleDateString("en-CA");
    const [fechaActual, setFechaActual] = useState("");
    const { id } = useParams();
    const navigate = useNavigate();
    const [tiposPago, setTiposPago] = useState([]);
    const [unidadesMedida, setUnidadesMedida] = useState([]);
    const [contactos, setContactos] = useState([]);
    const [clienteId, setClienteId] = useState("");
    const [detalles, setDetalles] = useState([]);
    const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
    const [clienteOptions, setClienteOptions] = useState([]);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const toggleModal = () => setModalIsOpen(!modalIsOpen);
    const [productoPredefinidoModalIsOpen, setProductoPredefinidoModalIsOpen] =
        useState(false);
    const toggleProductoPredefinidoModal = () =>
        setProductoPredefinidoModalIsOpen(!productoPredefinidoModalIsOpen);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    const toggleImageModal = () => setIsImageModalOpen(!isImageModalOpen);

    /**
     * Estados para el modal de selección de cotización y almacenar la cotización seleccionada
     * que se utilizará para crear el pedido de producción.
     */
    const [cotizacionModalIsOpen, setCotizacionModalIsOpen] = useState(false);
    const toggleCotizacionModal = () => {
        if (!cotizacionModalIsOpen) {
            const hoy = new Date().toISOString().split("T")[0];
            setFechaInicio(hoy);
            setFechaFin(hoy);
        }
        setCotizacionModalIsOpen(!cotizacionModalIsOpen);
    };
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [cotizaciones, setCotizaciones] = useState([]);
    const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
    const [modoEdicion, setModoEdicion] = useState(false);

    /***************************** */

    // Cargar la fecha desde el servidor
    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, { headers })
            .then((res) => {
                setFechaActual(res.data.fecha);
                setFechaInicio(res.data.fecha);
                setFechaFin(res.data.fecha);
            })
            .catch(() => {
                const localDate = new Date().toISOString().split("T")[0];
                setFechaActual(localDate); // fallback
                setFechaInicio(localDate);
                setFechaFin(localDate); // fallback
            });
    }, []);

    const [pedidoProduccion, setPedidoProduccion] = useState({
        idpedidoproduccion: 0,
        idcotizacion: 0,
        idpedidoproduccionoriginal: 0,
        idcliente: "",
        cliente: "",
        idcontacto: 0,
        contacto: "",
        fecha_pedido: fechaActual,
        fecha_entrega: fechaActual,
        trabajo: "",
        observaciones_costeo: "",
        observaciones_cliente: "",
        total_general: 0,
        costeo_observaciones: "",
        nocotizacion: "",
        version: 1,
        idtipopago: "",
        direccion_entrega: "",
        costear: "N",
    });

    //Estado del detalle de la cotización
    const [detalle, setDetalle] = useState({
        unidad_medida: "",
        descripcion: "",
        cantidad: 0,
        ancho: 0,
        alto: 0,
        m2: 0,
        profundidad: 0,
        precio: 0,
        total: 0,
        imagen: null, //nuevo estado para el archivo de imagen
        imagen_preview: null, //para mostrar una vista previa de la imágen
        imagen_ruta: null, //para almacenar la ruta de la imagen
        material: "",
        caras: "",
        maquina: "",
        acabados: "",
        medida_real: "",
        version: "",
        galaxy_plus: false,
        uv: false,
        cnc: false,
        laser: false,
        summa: false,
    });

    useEffect(() => {
        if (!id && fechaActual) {
            setPedidoProduccion((prev) => ({
                ...prev,
                fecha_pedido: fechaActual,
                fecha_entrega: fechaActual,
            }));
        }
    }, [fechaActual]);
    const loadContactos = () => {
        if (clienteId) {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            axios
                .get(`/api/lista_contactos?idcliente=${clienteId}`, { headers })
                .then((res) => setContactos(res.data))
                .catch((error) => {
                    //console.error('Error al cargar contactos:', error);
                    alertify.error("Error al cargar contactos");
                });
        } else {
            setContactos([]);
        }
    };

    const handleContactCreated = (newContact) => {
        loadContactos();
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const fetchData = async () => {
            try {
                let requests = [
                    axios
                        .get("/api/lista_unidadesmedida", { headers })
                        .then((res) => setUnidadesMedida(res.data)),
                ];

                if (id) {
                    setModoEdicion(true);
                    //console.log("ID encontrado:", id);
                    requests.push(
                        axios
                            .get(`/api/pedidosproduccion/${id}`, { headers })
                            .then((res) => {
                                const data = res.data;
                                let formattedDate = "";
                                let formattedDateEntrega = "";
                                if (data.fecha_pedido) {
                                    formattedDate =
                                        data.fecha_pedido.split(" ")[0];
                                }
                                if (data.fecha_entrega) {
                                    formattedDateEntrega =
                                        data.fecha_entrega.split(" ")[0];
                                }
                                setPedidoProduccion({
                                    idpedidoproduccionoriginal:
                                        data.idpedidoproduccionoriginal || 0,
                                    idpedidoproduccion:
                                        data.idpedidoproduccion || 0,
                                    idcliente: data.idcliente || 0,
                                    cliente: data.cliente || "",
                                    idcontacto: data.idcontacto || 0,
                                    contacto: data.contacto || "",
                                    fecha_pedido: formattedDate || fechaActual,
                                    fecha_entrega:
                                        formattedDateEntrega || fechaActual,
                                    trabajo: data.trabajo || "",
                                    observaciones_costeo:
                                        data.observaciones_costeo || "",
                                    observaciones_cliente:
                                        data.observaciones_cliente || "",
                                    total_general: data.total_general || 0,
                                    costeo_observaciones:
                                        data.costeo_observaciones || "",
                                    idcotizacion: data.idcotizacion || null,
                                    nocotizacion: data.nocotizacion || "",
                                    version: data.version || 1,
                                    idtipopago: data.idtipopago || "",
                                    direccion_entrega:
                                        data.direccion_entrega || "",
                                    costear: data.costear || "N",
                                });

                                if (data.idcliente) {
                                    setClienteId(data.idcliente);
                                    axios
                                        .get(
                                            `/api/lista_contactos?idcliente=${data.idcliente}`,
                                            { headers },
                                        )
                                        .then((res) => setContactos(res.data));
                                } else {
                                    setContactos([]);
                                }

                                if (data.detalles) {
                                    const detallesNormalizados =
                                        data.detalles.map((d) => ({
                                            ...d,
                                            galaxy_plus: d.galaxy_plus == 1,
                                            uv: d.uv == 1,
                                            cnc: d.cnc == 1,
                                            laser: d.laser == 1,
                                            summa: d.summa == 1,
                                        }));
                                    setDetalles(detallesNormalizados);
                                }
                            }),
                    );
                }

                await Promise.all(requests); // Wait for all requests to finish
            } catch (error) {
                console.error("Error al cargar datos:", error);
                alertify.error("Error al cargar datos");
            }
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        loadContactos();
    }, [clienteId]);

    useEffect(() => {
        if (clienteId) {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            axios
                .get(`/api/lista_contactos?idcliente=${clienteId}`, { headers })
                .then((res) => setContactos(res.data))
                .catch((error) => {
                    //console.error('Error al cargar contactos:', error);
                    alertify.error("Error al cargar contactos");
                });
        } else {
            setContactos([]);
        }
    }, [clienteId]);

    //Calcular el total del detalle ---
    useEffect(() => {
        const cantidadNum = parseFloat(detalle.cantidad) || 0;
        const precioNum = parseFloat(detalle.precio) || 0;
        const totalCalculado = (cantidadNum * precioNum).toFixed(2);
        setDetalle((prevDetalle) => ({
            ...prevDetalle,
            total: totalCalculado,
        }));
    }, [detalle.cantidad, detalle.precio]);

    // --- Calcula los m2 del detalle ---
    useEffect(() => {
        const anchoNum = parseFloat(detalle.ancho) || 0;
        const altoNum = parseFloat(detalle.alto) || 0;
        const m2Calculado = (anchoNum * altoNum).toFixed(2);
        setDetalle((prevDetalle) => ({
            ...prevDetalle,
            m2: m2Calculado,
        }));
    }, [detalle.ancho, detalle.alto]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        axios
            .get("/api/lista_clientes", { headers })
            .then((res) => {
                const options = res.data.map((cliente) => ({
                    value: cliente.idcliente,
                    label: cliente.nombre,
                }));
                setClienteOptions(options);
            })
            .catch((error) => {
                //console.error('Error al cargar clientes:', error);
                alertify.error("Error al cargar clientes");
            });
    }, []);

    const handleClienteChange = (selectedOption) => {
        setClienteId(selectedOption.value);
        setPedidoProduccion({
            ...pedidoProduccion,
            idcliente: selectedOption.value,
            idcontacto: "",
        });
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        axios
            .get(`/api/lista_contactos?idcliente=${selectedOption.value}`, {
                headers,
            })
            .then((res) => {
                setContactos(res.data);
            })
            .catch((error) => {
                //console.error('Error al cargar contactos:', error);
                alertify.error("Error al cargar contactos");
            });
    };

    //Actualiza el estado de la cotización con el valor de cada campo cuando estos cambian
    const handleChange = (e) => {
        setPedidoProduccion({
            ...pedidoProduccion,
            [e.target.name]: e.target.value,
        });
    };

    /**
     * Obtiene las cotizaciones del back-end para asociar el número de cotización al el pedido de producción
     * @returns cotizaciones en estado 1 registro 3 costeada y 4 pre-facturación
     */
    const handleBuscarCotizaciones = async () => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        if (!fechaInicio || !fechaFin) {
            alertify.error("Debe seleccionar ambas fechas");
            return;
        }

        try {
            const response = await axios.get(
                "/api/pedidosproduccion/cotizaciones_pedido_produccion",
                {
                    headers,
                    params: {
                        fecha_inicio: fechaInicio,
                        fecha_fin: fechaFin,
                    },
                },
            );
            setCotizaciones(response.data);
        } catch (error) {
            console.error("Error al obtener cotizaciones:", error);
            alertify.error("Error al consultar cotizaciones");
        }
    };
    /**************************************** */

    //Envía los datos al back-end para registrar, en el método store.
    const handleSubmit = async (e) => {
        // Make handleSubmit async
        e.preventDefault();
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const formData = new FormData();

        // Validaciones

        if (!pedidoProduccion.idcliente || pedidoProduccion.idcliente === "") {
            alertify.alert("CAMPO OBLIGATORIO", "Debe seleccionar un cliente.");
            return;
        }

        if (
            !pedidoProduccion.idcontacto ||
            pedidoProduccion.idcontacto === ""
        ) {
            pedidoProduccion.idcontacto = 0; // Si no hay contacto, asignamos 0
        }

        if (!detalles || detalles.length === 0) {
            alertify.alert(
                "CAMPO OBLIGATORIO",
                "Debe asignar registros en el detalle de la cotización.",
            );
            return;
        }

        if (
            !pedidoProduccion.direccion_entrega ||
            pedidoProduccion.direccion_entrega.trim() === ""
        ) {
            alertify.alert(
                "CAMPO OBLIGATORIO",
                "Debe ingresar la dirección de entrega.",
            );
            return;
        }

        // --- VALIDACIÓN DEL DETALLE PARA COSTEAR ---
        const tieneTotalCero = detalles.some(
            (detalle) => parseFloat(detalle.total) === 0,
        );
        const costearValue = tieneTotalCero ? "S" : "N"; // Guardamos el valor en una constante
        setPedidoProduccion((prevState) => ({
            ...prevState,
            costear: costearValue,
        }));

        const idcotizacionFinal = id
            ? pedidoProduccion.idcotizacion
            : cotizacionSeleccionada?.idcotizacion;

        formData.append("idcliente", pedidoProduccion.idcliente);
        formData.append("idcontacto", pedidoProduccion.idcontacto);
        //formData.append("nocotizacion", pedidoProduccion.nocotizacion);
        //formData.append("idcotizacion",cotizacionSeleccionada?.idcotizacion || "");
        //formData.append("idcotizacion", idcotizacionFinal || "");
        formData.append("idtipopago", pedidoProduccion.idtipopago);
        formData.append("fecha_pedido", pedidoProduccion.fecha_pedido);
        formData.append("fecha_entrega", pedidoProduccion.fecha_entrega);
        formData.append("trabajo", pedidoProduccion.trabajo);
        formData.append(
            "observaciones_costeo",
            pedidoProduccion.observaciones_costeo,
        );
        formData.append(
            "observaciones_cliente",
            pedidoProduccion.observaciones_cliente,
        );
        formData.append(
            "direccion_entrega",
            pedidoProduccion.direccion_entrega,
        );
        formData.append("costear", "N");

        formData.append("estado", "1");
        formData.append(
            "idpedidoproduccionoriginal",
            pedidoProduccion.idpedidoproduccionoriginal,
        );
        formData.append("version", pedidoProduccion.version);
        formData.append("total_general", pedidoProduccion.total_general);

        const detallesValidos = (detalles || []).filter((d) => !d._deleted);

        detallesValidos.forEach((detalle, index) => {
            formData.append(
                `detalles[${index}][iddetallepedidoproduccion]`,
                detalle.iddetallepedidoproduccion || "",
            );
            formData.append(
                `detalles[${index}][unidad_medida]`,
                detalle.unidad_medida || "",
            );
            formData.append(
                `detalles[${index}][cantidad]`,
                detalle.cantidad || 0,
            );
            formData.append(
                `detalles[${index}][material]`,
                detalle.material || "",
            );
            formData.append(`detalles[${index}][caras]`, detalle.caras || "");
            formData.append(
                `detalles[${index}][acabados]`,
                detalle.acabados ?? "",
            );
            formData.append(
                `detalles[${index}][medida_real]`,
                detalle.medida_real ?? "",
            );

            // CHECKS
            formData.append(
                `detalles[${index}][galaxy_plus]`,
                detalle.galaxy_plus ? 1 : 0,
            );
            formData.append(`detalles[${index}][uv]`, detalle.uv ? 1 : 0);
            formData.append(`detalles[${index}][cnc]`, detalle.cnc ? 1 : 0);
            formData.append(`detalles[${index}][laser]`, detalle.laser ? 1 : 0);
            formData.append(`detalles[${index}][summa]`, detalle.summa ? 1 : 0);
            formData.append(`detalles[${index}][ancho]`, detalle.ancho ?? "");
            formData.append(`detalles[${index}][alto]`, detalle.alto ?? "");
            formData.append(
                `detalles[${index}][version]`,
                detalle.version ?? "",
            );
            formData.append(
                `detalles[${index}][medida_real]`,
                detalle.medida_real ?? "",
            );

            // imagen
            if (detalle.imagen instanceof File) {
                formData.append(`detalles[${index}][imagen]`, detalle.imagen);
            } else if (detalle.imagen_ruta) {
                formData.append(
                    `detalles[${index}][imagen_ruta]`,
                    detalle.imagen_ruta,
                );
            }
        });

        try {
            let res;
            if (id) {
                formData.append("_method", "PUT"); // Para indicar que es una actualización
                //console.log('Detalles a enviar:', detalles);
                res = await axios.post(
                    `/api/pedidosproduccion/${id}`,
                    formData,
                    {
                        headers,
                    },
                );
                setModoEdicion(false);
                alertify.success("Pedido actualizado correctamente");
                navigate("/pedidosproduccion/crear");
            } else {
                res = await axios.post("/api/pedidosproduccion", formData, {
                    headers,
                });
                alertify.success("Pedido creado correctamente");
            }

            limpiarCampos();
        } catch (error) {
            console.error("Error al guardar el pedido:", error);
            alertify.error("Error al guardar el pedido", error);
        }
    };

    const handleAgregarContacto = () => {
        if (!pedidoProduccion.idcliente || pedidoProduccion.idcliente === "") {
            alertify.error(
                "Debe seleccionar un cliente antes de agregar un contacto.",
            );
            return;
        }
        toggleModal();
    };

    const limpiarCampos = () => {
        setModoEdicion(false);

        setPedidoProduccion({
            idpedidoproduccion: 0,
            idpedidoproduccionoriginal: 0,
            idcliente: "",
            cliente: "",
            idcontacto: 0,
            contacto: "",
            fecha_pedido: fechaActual,
            fecha_entrega: fechaActual,
            trabajo: "",
            observaciones_costeo: "",
            observaciones_cliente: "",
            total_general: 0,
            costeo_observaciones: "",
            nocotizacion: "",
            version: 1,
            idtipopago: "",
            direccion_entrega: "",
            costear: "N",
        });

        setClienteId("");
        setContactos([]);
        setDetalles([]);
    };

    useEffect(() => {
        if (cotizaciones.length > 0) {
            setTimeout(() => {
                $("#tabla-cotizaciones").DataTable({
                    destroy: true, // 🔑 clave para evitar dobles inicializaciones
                    language: {
                        search: "Buscar:",
                        zeroRecords: "No se encontraron resultados",
                        infoEmpty: "Sin registros disponibles",
                        paginate: {
                            next: "Siguiente",
                            previous: "Anterior",
                        },
                    },
                });
            }, 100);
        }
    }, [cotizaciones]);

    return (
        <div className="mt-4 mb-4">
            <Header
                title={
                    id
                        ? "Editar Pedido a Producción"
                        : "Crear Nuevo Pedido a Producción"
                }
            />
            <div className="card shadow p-4">
                <div className="card-body card-form">
                    <form onSubmit={handleSubmit} encType="multipart/form-data">
                        {/* --- Sección Cliente/Contacto/Pago --- */}
                        <FormSection title="Datos generales">
                            {/*-------------------------------------- */}
                            <div className="row g-2 mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">
                                        Cliente
                                    </label>
                                    <Select
                                        value={clienteOptions.find(
                                            (option) =>
                                                option.value ===
                                                pedidoProduccion.idcliente,
                                        )}
                                        onChange={handleClienteChange}
                                        options={clienteOptions}
                                        isSearchable={true}
                                        placeholder="Seleccionar Cliente"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">
                                        Contacto
                                    </label>
                                    <select
                                        name="idcontacto"
                                        value={pedidoProduccion.idcontacto}
                                        onChange={handleChange}
                                        className="form-select form-select-sm campo-obligatorio-fondo"
                                        disabled={!clienteId}
                                    >
                                        <option value="">
                                            Seleccionar Contacto
                                        </option>
                                        {contactos.map((contacto) => (
                                            <option
                                                key={
                                                    contacto.id_contactocliente
                                                }
                                                value={
                                                    contacto.id_contactocliente
                                                }
                                            >
                                                {contacto.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className="btn btn-link btn-sm"
                                        onClick={handleAgregarContacto}
                                        style={{
                                            textDecoration: "none",
                                            color: "#007bff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Agregar Contacto
                                    </button>
                                </div>
                            </div>
                            <div className="row g-3 mb-3">
                                <div className="col-md-3">
                                    <label className="form-label">
                                        Fecha Pedido
                                    </label>
                                    <input
                                        type="date"
                                        name="fecha_pedido"
                                        value={pedidoProduccion.fecha_pedido}
                                        onChange={handleChange}
                                        placeholder="Fecha pedido"
                                        className="form-control form-control-sm"
                                        required
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">
                                        Fecha Entrega
                                    </label>
                                    <input
                                        type="date"
                                        name="fecha_entrega"
                                        value={pedidoProduccion.fecha_entrega}
                                        onChange={handleChange}
                                        placeholder="Fecha entrega"
                                        className="form-control form-control-sm"
                                        required
                                    />
                                </div>
                                <div className="col-md-5">
                                    <label className="form-label">
                                        Trabajo
                                    </label>
                                    <input
                                        type="text"
                                        name="trabajo"
                                        value={pedidoProduccion.trabajo}
                                        onChange={handleChange}
                                        placeholder="Nombre del trabajo o proyecto"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                            </div>
                            <div className="row g-2 mb-4">
                                <div className="col-md-12">
                                    <label className="form-label">
                                        Dirección entrega
                                    </label>
                                    <input
                                        type="text"
                                        name="direccion_entrega"
                                        value={
                                            pedidoProduccion.direccion_entrega
                                        }
                                        onChange={handleChange}
                                        placeholder="Dirección de entrega"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                            </div>
                        </FormSection>
                        <FormSection title="Detalle de Cotización">
                            <FormSection title="Tareas del Pedido (tipo Excel)">
                                <DetalleGrid
                                    detalles={detalles}
                                    setDetalles={setDetalles}
                                    unidadesMedida={unidadesMedida}
                                />
                            </FormSection>
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
                                    to="/pedidosproduccion/lista"
                                    className="btn btn-sm btn-consultar d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px" }}
                                >
                                    <FaSearch /> CONSULTAR
                                </Link>
                            </div>
                        </div>
                        {/* Modal para ContactoClienteForm */}
                        <Modal
                            isOpen={modalIsOpen}
                            toggle={toggleModal}
                            centered
                            size="xl"
                        >
                            <ModalHeader toggle={toggleModal}>
                                Crear Nuevo Contacto
                            </ModalHeader>
                            <ModalBody>
                                <ContactoClienteForm
                                    clienteId={clienteId}
                                    onClose={toggleModal}
                                    onContactCreated={handleContactCreated}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button color="secondary" onClick={toggleModal}>
                                    Cerrar
                                </Button>
                            </ModalFooter>
                        </Modal>
                        {/* Modal para mostrar la imagen del detalle */}
                        <Modal
                            isOpen={isImageModalOpen}
                            toggle={toggleImageModal}
                            centered
                            size="lg"
                        >
                            <ModalHeader toggle={toggleImageModal}>
                                Imagen del Detalle
                            </ModalHeader>
                            <ModalBody>
                                {selectedImageUrl ? (
                                    <img
                                        src={selectedImageUrl}
                                        alt="Imagen del Detalle"
                                        style={{
                                            maxWidth: "100%",
                                            height: "auto",
                                        }}
                                    />
                                ) : (
                                    <p>
                                        Este detalle no tiene una imagen
                                        asociada.
                                    </p>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    color="secondary"
                                    onClick={toggleImageModal}
                                >
                                    Cerrar
                                </Button>
                            </ModalFooter>
                        </Modal>
                        {/**
                         *  Modal para seleccionar una cotización existente
                         *
                         */}
                        <Modal
                            isOpen={cotizacionModalIsOpen}
                            toggle={toggleCotizacionModal}
                            centered
                            size="xl"
                        >
                            <ModalHeader toggle={toggleCotizacionModal}>
                                Seleccionar Cotización
                            </ModalHeader>
                            <ModalBody>
                                <div className="row mb-3">
                                    <div className="col-md-5">
                                        <label>Fecha Inicio</label>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm"
                                            value={fechaInicio}
                                            onChange={(e) =>
                                                setFechaInicio(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="col-md-5">
                                        <label>Fecha Fin</label>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm"
                                            value={fechaFin}
                                            onChange={(e) =>
                                                setFechaFin(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="col-md-2 d-flex align-items-end">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-primary w-100"
                                            onClick={handleBuscarCotizaciones}
                                        >
                                            Consultar
                                        </button>
                                    </div>
                                </div>

                                <div
                                    className="table-responsive"
                                    style={{
                                        maxHeight: "400px",
                                        overflowY: "auto",
                                    }}
                                >
                                    {/* <table className="table table-bordered table-hover table-sm"> */}
                                    <table
                                        id="tabla-cotizaciones"
                                        className="table table-bordered table-hover table-sm"
                                    >
                                        <thead className="table-light">
                                            <tr>
                                                <th>Número</th>
                                                <th>Fecha</th>
                                                <th>Cliente</th>
                                                <th>Estado</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cotizaciones.length > 0 ? (
                                                cotizaciones.map((cot) => (
                                                    <tr key={cot.idcotizacion}>
                                                        <td>
                                                            {cot.nocotizacion}
                                                        </td>
                                                        <td>
                                                            {
                                                                cot.fecha_cotizacion.split(
                                                                    " ",
                                                                )[0]
                                                            }
                                                        </td>
                                                        <td className="cliente-columna">
                                                            {cot.cliente}
                                                        </td>
                                                        <td>
                                                            {cot.estado_texto}
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-success"
                                                                title="Seleccionar Cotización"
                                                                onClick={() => {
                                                                    setPedidoProduccion(
                                                                        (
                                                                            prev,
                                                                        ) => ({
                                                                            ...prev,
                                                                            nocotizacion:
                                                                                cot.numero_cotizacion,
                                                                        }),
                                                                    );
                                                                    setCotizacionSeleccionada(
                                                                        cot,
                                                                    );
                                                                    toggleCotizacionModal();
                                                                    alertify.success(
                                                                        "Cotización seleccionada correctamente",
                                                                    );
                                                                }}
                                                            >
                                                                <FaCheckSquare />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan="5"
                                                        className="text-center"
                                                    >
                                                        Sin resultados
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    color="secondary"
                                    onClick={toggleCotizacionModal}
                                >
                                    Cerrar
                                </Button>
                            </ModalFooter>
                        </Modal>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default PedidoProduccion;
