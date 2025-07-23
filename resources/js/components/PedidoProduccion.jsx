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

DataTable.use(DT);

function PedidoProduccion() {
    // const fechaActual = new Date().toISOString().split("T")[0];
    const fechaActual = new Date().toLocaleDateString("en-CA");
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
    /***************************** */

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
        version: "",
    });

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
                    console.log("ID encontrado:", id);
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
                                            { headers }
                                        )
                                        .then((res) => setContactos(res.data));
                                } else {
                                    setContactos([]);
                                }

                                if (data.detalles) {
                                    setDetalles(data.detalles);
                                }
                            })
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
                }
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
        if (
            !pedidoProduccion.nocotizacion ||
            pedidoProduccion.nocotizacion === ""
        ) {
            alertify.alert("CAMPO OBLIGATORIO", "Debe asociar una cotización.");
            return;
        }

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
                "Debe asignar registros en el detalle de la cotización."
            );
            return;
        }

        if (
            !pedidoProduccion.direccion_entrega ||
            pedidoProduccion.direccion_entrega.trim() === ""
        ) {
            alertify.alert(
                "CAMPO OBLIGATORIO",
                "Debe ingresar la dirección de entrega."
            );
            return;
        }

        // --- VALIDACIÓN DEL DETALLE PARA COSTEAR ---
        const tieneTotalCero = detalles.some(
            (detalle) => parseFloat(detalle.total) === 0
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
        formData.append("nocotizacion", pedidoProduccion.nocotizacion);
        //formData.append("idcotizacion",cotizacionSeleccionada?.idcotizacion || "");
        formData.append("idcotizacion", idcotizacionFinal || "");
        formData.append("idtipopago", pedidoProduccion.idtipopago);
        formData.append("fecha_pedido", pedidoProduccion.fecha_pedido);
        formData.append("fecha_entrega", pedidoProduccion.fecha_entrega);
        formData.append("trabajo", pedidoProduccion.trabajo);
        formData.append(
            "observaciones_costeo",
            pedidoProduccion.observaciones_costeo
        );
        formData.append(
            "observaciones_cliente",
            pedidoProduccion.observaciones_cliente
        );
        formData.append(
            "direccion_entrega",
            pedidoProduccion.direccion_entrega
        );
        formData.append("costear", "N");

        formData.append("estado", "1");
        formData.append(
            "idpedidoproduccionoriginal",
            pedidoProduccion.idpedidoproduccionoriginal
        );
        formData.append("version", pedidoProduccion.version);
        formData.append("total_general", pedidoProduccion.total_general);

        detalles.forEach((detalle, index) => {
            formData.append(
                `detalles[${index}][unidad_medida]`,
                detalle.unidad_medida
            );
            formData.append(
                `detalles[${index}][descripcion]`,
                detalle.descripcion
            );
            formData.append(`detalles[${index}][cantidad]`, detalle.cantidad);
            formData.append(`detalles[${index}][ancho]`, detalle.ancho);
            formData.append(`detalles[${index}][alto]`, detalle.alto);
            formData.append(`detalles[${index}][m2]`, detalle.m2);
            formData.append(
                `detalles[${index}][profundidad]`,
                detalle.profundidad
            );
            formData.append(`detalles[${index}][precio]`, detalle.precio);
            formData.append(`detalles[${index}][total]`, detalle.total);
            formData.append(`detalles[${index}][material]`, detalle.material);
            formData.append(`detalles[${index}][caras]`, detalle.caras);
            formData.append(`detalles[${index}][maquina]`, detalle.maquina);
            formData.append(`detalles[${index}][acabados]`, detalle.acabados);
            formData.append(
                `detalles[${index}][version]`,
                detalle.version || ""
            );
            // --- Manejo de IMAGEN al enviar FormData ---
            if (detalle.imagen) {
                // Caso 1: Se seleccionó un NUEVO archivo
                formData.append(`detalles[${index}][imagen]`, detalle.imagen);
                //console.log(`Frontend: Adjuntando nuevo archivo para índice ${index}`); // Log para verificar
            } else if (detalle.imagen_ruta) {
                // Caso 2: NO se seleccionó un archivo nuevo, pero existe una ruta vieja
                // Enviamos la ruta vieja para que el backend sepa que debe mantenerla
                formData.append(
                    `detalles[${index}][imagen_ruta]`,
                    detalle.imagen_ruta
                );
                //console.log(`Frontend: Adjuntando ruta existente para índice ${index}: ${detalle.imagen_ruta}`); // Log para verificar
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
                    }
                );
                alertify.success("Pedido actualizado correctamente");
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

    //Para cargar el detalle de la cotización
    const handleDetalleChange = (e) => {
        setDetalle({ ...detalle, [e.target.name]: e.target.value });
    };

    //Para gestionar la imagen del detalle
    const handleImagenChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setDetalle({
                ...detalle,
                imagen: e.target.files[0],
                imagen_preview: URL.createObjectURL(e.target.files[0]),
            });
        } else {
            setDetalle({ ...detalle, imagen: null, imagen_preview: null });
        }
    };

    //Agregar los datos del detalle al DataTable
    const handleAddDetalle = () => {
        const nuevoDetalle = { ...detalle };
        const formState = detalle; // El estado actual de los inputs del formulario de detalle
        if (detalleSeleccionado) {
            const index = detalles.findIndex((d) => d === detalleSeleccionado);
            if (index !== -1) {
                const originalItem = detalleSeleccionado; // El objeto original del array (viene de backend o agregado antes)

                const updatedItem = {
                    ...originalItem, // Mantener todas las propiedades originales (incluyendo iddetallecotizacion si existe, y la original imagen_ruta)

                    // Sobrescribir/Actualizar campos con los valores del formulario
                    unidad_medida: formState.unidad_medida,
                    descripcion: formState.descripcion,
                    cantidad: formState.cantidad,
                    ancho: formState.ancho,
                    alto: formState.alto,
                    m2: formState.m2, // Asegúrate que m2 se calcula y está en formState si no es readOnly
                    profundidad: formState.profundidad,
                    material: formState.material,
                    caras: formState.caras,
                    maquina: formState.maquina,
                    acabados: formState.acabados,
                    version: formState.version || "", // Mantener la versión existente si no hay nueva
                    precio: 0,
                    total: 0, // Asegúrate que total se calcula y está en formState si no es readOnly
                    // MANEJO EXPLÍCITO DE IMAGEN:
                    imagen:
                        formState.imagen instanceof File
                            ? formState.imagen
                            : null, // Si hay un File nuevo, úsalo, sino, explícitamente null.
                    imagen_preview: formState.imagen_preview, // La preview del formulario (puede ser blob de nueva imagen o URL de la vieja)

                    imagen_ruta:
                        formState.imagen instanceof File
                            ? null // Si hay un archivo nuevo, la ruta vieja se anula (backend generará una nueva)
                            : formState.imagen_ruta ||
                              originalItem.imagen_ruta ||
                              null, // Mantener la ruta existente si no hay archivo nuevo
                };

                //console.log('[handleAddDetalle - Editando] updatedItem FINAL:', JSON.parse(JSON.stringify(updatedItem)));

                const nuevosDetalles = [...detalles];
                nuevosDetalles[index] = updatedItem; // Reemplazar el objeto original en el array
                setDetalles(nuevosDetalles); // Actualizar el estado principal de detalles
            }
            setDetalleSeleccionado(null);
        } else {
            const newItem = {
                unidad_medida: formState.unidad_medida,
                descripcion: formState.descripcion,
                cantidad: formState.cantidad,
                ancho: formState.ancho,
                alto: formState.alto,
                m2: formState.m2,
                profundidad: formState.profundidad,
                material: formState.material,
                caras: formState.caras,
                maquina: formState.maquina,
                acabados: formState.acabados,
                version: formState.version || "",
                precio: 0,
                total: 0,
                imagen:
                    formState.imagen instanceof File ? formState.imagen : null,
                imagen_preview: formState.imagen_preview,
                imagen_ruta: null, // Un nuevo ítem no tiene ruta de BD aún
                // otros campos que necesites para un nuevo detalle, como incluye_foto, etc.
                incluye_foto: formState.imagen instanceof File ? "S" : "N",
            };
            //console.log('[handleAddDetalle - Agregando Nuevo] newItem FINAL:', JSON.parse(JSON.stringify(newItem)));
            setDetalles([...detalles, newItem]);
        }

        setDetalle({
            unidad_medida: "",
            descripcion: "",
            cantidad: 0,
            ancho: 0,
            alto: 0,
            m2: 0,
            profundidad: 0,
            precio: 0,
            total: 0,
            imagen: null,
            imagen_preview: null,
            imagen_ruta: null,
            material: "",
            caras: "",
            maquina: "",
            acabados: "",
            version: "",
        });
    };

    const handleAgregarContacto = () => {
        if (!pedidoProduccion.idcliente || pedidoProduccion.idcliente === "") {
            alertify.error(
                "Debe seleccionar un cliente antes de agregar un contacto."
            );
            return;
        }
        toggleModal();
    };

    //Quitar el detalle seleccionado del DataTable
    const handleQuitarDetalle = () => {
        if (!detalleSeleccionado) {
            alertify.error("Por favor, selecciona un detalle para quitar.");
            return;
        }

        alertify.confirm(
            "¿Estás seguro de que deseas quitar este detalle?",
            () => {
                setDetalles(
                    detalles.filter(
                        (detalle) => detalle !== detalleSeleccionado
                    )
                );
                setDetalleSeleccionado(null);
                setDetalle({
                    unidad_medida: "",
                    descripcion: "",
                    cantidad: 0,
                    ancho: 0,
                    alto: 0,
                    m2: 0,
                    profundidad: 0,
                    precio: 0,
                    total: 0,
                    imagen: null,
                    imagen_preview: null,
                    material: "",
                    caras: "",
                    maquina: "",
                    acabados: "",
                    version: "",
                });
                alertify.success("Detalle eliminado.");
            },
            () => {
                alertify.error("Cancelado");
            }
        );
    };

    //Ejecutan la función handleRowClick cuando se hace clic en una fila del DataTable
    const slots = {
        0: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        1: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        2: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        3: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        4: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        5: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        6: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        7: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        8: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
    };

    //Carga los valores de la fila seleccionada en el DataTable a los inputs correspondientes del detalle.
    const handleRowClick = (rowData) => {
        //console.log('rowData:', rowData);
        setDetalleSeleccionado(rowData);

        const previewUrl = rowData.imagen_ruta
            ? `/images_pedidosproduccion/${rowData.imagen_ruta}`
            : rowData.imagen_preview || null;

        setDetalle({
            unidad_medida: rowData.unidad_medida,
            descripcion: rowData.descripcion,
            cantidad: rowData.cantidad,
            ancho: rowData.ancho,
            alto: rowData.alto,
            m2: rowData.m2,
            profundidad: rowData.profundidad,
            precio: 0,
            total: 0,
            imagen: null, // Cuando se edita, la imagen ya está guardada, no se "carga" aquí
            imagen_preview: previewUrl,
            imagen_ruta: rowData.imagen_ruta || null, // ¡CRUCIAL! Conservar la ruta de la imagen existente en el estado del formulario.
            material: rowData.material || "",
            caras: rowData.caras || "",
            maquina: rowData.maquina || "",
            acabados: rowData.acabados || "",
            version: rowData.version || "",
        });

        // Lógica del modal de imagen (parece estar bien, pero asegúrate que usa la previewUrl correcta)
        if (previewUrl) {
            // Usa la previewUrl que acabamos de definir
            setSelectedImageUrl(previewUrl);
            //console.log('Detalle Form State After Click:', detalle);
            setIsImageModalOpen(true);
        } else {
            // alertify.error("Este detalle no tiene una imagen asociada."); // Comentado si quieres evitar alerta si no hay imagen
            setSelectedImageUrl(null);
            //console.log('Detalle else Form State After Click:', detalle);
            setIsImageModalOpen(false);
        }
    };

    //Se establecen las columnas que se mostrarán en el DataTable
    const columns = [
        { title: "Unidad Medida", data: "unidad_medida" },
        { title: "Descripción", data: "descripcion" },
        { title: "Cantidad", data: "cantidad" },
        { title: "Ancho", data: "ancho" },
        { title: "Alto", data: "alto" },
        { title: "M2", data: "m2" },
        { title: "Profundidad", data: "profundidad" },
        { title: "Material", data: "material" },
        { title: "Caras", data: "caras" },
        { title: "Máquina", data: "maquina" },
        { title: "Acabados", data: "acabados" },
        { title: "Versión", data: "version" },
        {
            title: "Imagen",
            data: "imagen_ruta", // Mantenemos 'imagen_ruta' como data key principal si viene del backend
            render: (data, type, row) => {
                // 'data' es imagen_ruta, 'row' es el objeto completo del detalle
                // Verifica si hay imagen_ruta (desde backend) O si hay imagen (File object) O si hay imagen_preview (URL temporal)
                const hasImage =
                    row.imagen_ruta ||
                    (row.imagen && row.imagen instanceof File) ||
                    row.imagen_preview;

                if (hasImage) {
                    // Muestra un texto o ícono indicando que hay una imagen
                    return "Con imagen"; // O podrías usar '<i class="fas fa-image"></i>' si tienes Font Awesome
                } else {
                    return "Sin imagen";
                }
            },
        },
    ];

    const handleCantidadDetalleChange = (e) => {
        const value = parseInt(e.target.value, 10) || 0;

        setDetalle((prevDetalle) => ({
            ...prevDetalle,
            cantidad: value,
        }));
    };

    const limpiarCampos = () => {
        setPedidoProduccion({
            idproductopredefinido: 0,
            idproductopredefinidooriginal: 0,
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
        });
        setDetalles([]);
        setDetalle({
            unidad_medida: "",
            descripcion: "",
            cantidad: 0,
            ancho: 0,
            alto: 0,
            m2: 0,
            profundidad: 0,
            precio: 0,
            total: 0,
            material: "",
            caras: "",
            maquina: "",
            acabados: "",
            version: "",
        });
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
                            {/**
                             * Se abre el modal de selección de cotización
                             * para seleccionar una cotización existente y asociarla al registro
                             * del pedido.
                             */}
                            <div className="row g-1 mb-3">
                                <div className="col-md-3">
                                    <label className="form-label">
                                        Cotización
                                    </label>
                                    <div className="input-group input-group-sm">
                                        <input
                                            type="text"
                                            value={
                                                pedidoProduccion.nocotizacion
                                            }
                                            className="form-control form-control-sm campo-obligatorio-fondo"
                                            placeholder="Sin cotización"
                                            readOnly
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            style={{
                                                color: "#0d6efd",
                                                borderColor: "#0d6efd",
                                                backgroundColor: "#fff",
                                            }}
                                            onClick={toggleCotizacionModal}
                                        >
                                            Seleccionar Cotización
                                        </button>
                                    </div>
                                </div>
                            </div>
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
                                                pedidoProduccion.idcliente
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
                            <div className="row g-3 mb-2">
                                {/* Este bloque va aquí, después del botón */}
                                <div className="col-md-2">
                                    <label className="form-label">
                                        Unidad Medida
                                    </label>
                                    <select
                                        name="unidad_medida"
                                        value={detalle.unidad_medida}
                                        onChange={handleDetalleChange}
                                        className="form-select form-select-sm"
                                    >
                                        <option value="">Seleccionar</option>
                                        {unidadesMedida.map((um) => (
                                            <option
                                                key={um.idunidadmedida}
                                                value={um.unidad}
                                            >
                                                {um.unidad}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-1">
                                    <label className="form-label">
                                        Cantidad
                                    </label>
                                    <input
                                        type="number"
                                        name="cantidad"
                                        value={detalle.cantidad}
                                        onChange={handleCantidadDetalleChange} // <-- Use this!!!
                                        className="form-control form-control-sm"
                                        step="1"
                                        min="0"
                                    />
                                </div>
                                <div className="col-md-9">
                                    <label className="form-label">
                                        Descripción
                                    </label>
                                    <textarea
                                        rows="1"
                                        name="descripcion"
                                        value={detalle.descripcion}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                    ></textarea>
                                </div>
                            </div>
                            <div className="row g-4 mb-2">
                                <div className="col-md-3">
                                    <label className="form-label">Ancho</label>
                                    <input
                                        type="number"
                                        name="ancho"
                                        value={detalle.ancho}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                        step="any"
                                        min="0"
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Alto</label>
                                    <input
                                        type="number"
                                        name="alto"
                                        value={detalle.alto}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                        step="any"
                                        min="0"
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">M2</label>
                                    <input
                                        type="number"
                                        name="m2"
                                        value={detalle.m2}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                        step="any"
                                        min="0"
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Prof.</label>
                                    <input
                                        type="number"
                                        name="profundidad"
                                        value={detalle.profundidad}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                        step="any"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div className="row g-3 mb-2">
                                <div className="col-md-6">
                                    <label className="form-label">
                                        Material
                                    </label>
                                    <textarea
                                        rows="1"
                                        name="material"
                                        value={detalle.material}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                    ></textarea>
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">Caras</label>
                                    <input
                                        type="number"
                                        name="caras"
                                        value={detalle.caras}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                        step="any"
                                        min="0"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Máquina
                                    </label>
                                    <textarea
                                        rows="1"
                                        name="maquina"
                                        value={detalle.maquina}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                    ></textarea>
                                </div>
                            </div>
                            <div className="row g-3 mb-2">
                                <div className="col-md-8">
                                    <label className="form-label">
                                        Acabados
                                    </label>
                                    <textarea
                                        rows="1"
                                        name="acabados"
                                        value={detalle.acabados}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                    ></textarea>
                                </div>
                            </div>
                            {/* Fila 2: Medidas, Precio, Total y Botón Agregar */}
                            <div className="row g-2 align-items-end mb-3">
                                <div className="row g-2 mb-3">
                                    <div className="col-md-8">
                                        <label className="form-label">
                                            Versión
                                        </label>
                                        <textarea
                                            rows="1"
                                            name="version"
                                            value={detalle.version}
                                            onChange={handleDetalleChange}
                                            className="form-control form-control-sm"
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label fw-bold">
                                        Imagen (Opcional)
                                    </label>
                                    <input
                                        type="file"
                                        name="imagen"
                                        className="form-control form-control-sm"
                                        onChange={handleImagenChange}
                                    />
                                    {detalle.imagen_preview && (
                                        <img
                                            src={detalle.imagen_preview}
                                            alt="Vista previa"
                                            style={{
                                                maxWidth: "50px",
                                                marginTop: "5px",
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="col-auto">
                                    <button
                                        type="button"
                                        onClick={handleAddDetalle}
                                        className={
                                            detalleSeleccionado
                                                ? "btn btn-sm btn-agregar"
                                                : "btn btn-sm btn-agregar"
                                        }
                                    >
                                        <FaCheckSquare />
                                        {detalleSeleccionado
                                            ? " Actualizar"
                                            : " Agregar"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleQuitarDetalle}
                                        className="btn btn-danger btn-sm ms-2"
                                    >
                                        <FaWindowClose /> Quitar
                                    </button>
                                </div>
                            </div>

                            {/* --- Tabla de Detalles Agregados --- */}
                            <h5 className="mt-4 mb-3 border-bottom pb-2">
                                Detalles Agregados
                            </h5>
                            <div className="table-responsive mb-4">
                                <DataTable
                                    data={detalles}
                                    columns={columns}
                                    options={{
                                        paging: false,
                                        searching: false,
                                        info: false,
                                        ordering: true,
                                    }}
                                    slots={slots}
                                    className="table table-striped table-bordered table-hover table-sm"
                                    //style={{fontWeight: "#ddd" }}
                                    id="tabla-detalles"
                                >
                                    <thead>
                                        <tr>
                                            <th>Unidad Medida</th>
                                            <th>Descripción</th>
                                            <th>Cantidad</th>
                                            <th>Ancho</th>
                                            <th>Alto</th>
                                            <th>M2</th>
                                            <th>Profundidad</th>
                                            <th>Material</th>
                                            <th>Caras</th>
                                            <th>Máquina</th>
                                            <th>Acabados</th>
                                            <th>Versión</th>
                                            {/* <th>Precio</th>
                                            <th>Total</th> */}
                                        </tr>
                                    </thead>
                                </DataTable>
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
                                                                    " "
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
                                                                            prev
                                                                        ) => ({
                                                                            ...prev,
                                                                            nocotizacion:
                                                                                cot.numero_cotizacion,
                                                                        })
                                                                    );
                                                                    setCotizacionSeleccionada(
                                                                        cot
                                                                    );
                                                                    toggleCotizacionModal();
                                                                    alertify.success(
                                                                        "Cotización seleccionada correctamente"
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
