import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link, useParams, useNavigate } from "react-router-dom";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";
import Select from "react-select";
import ContactoClienteForm from "./ContactoClienteForm";
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from "reactstrap";
import ProductoPredefinidoModal from "./ProductoPredefinidoModal";
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
import TipoPagoModal from "./TipoPagoModal";
import CotizacionPDF from "./CotizacionPDF";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import "../../css/form-cotizacion.css";
import { v4 as uuidv4 } from "uuid";
import {
    aplicarDescuentoAGrilla,
    calcularCabeceraDesdeTotalConIva,
    calcularDetalleConIVA,
} from "../utils/calculosCotizacion.js";
import { MaterialReactTable } from "material-react-table";
import { MRT_Localization_ES } from "material-react-table/locales/es";
import { Box, IconButton, Tooltip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ImageIcon from "@mui/icons-material/Image";
import CloseIcon from "@mui/icons-material/Close";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

// Interceptor global de errores Axios
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            alertify.error(
                "Su sesión ha expirado. Por favor, inicie sesión nuevamente."
            );
            // Aquí puedes limpiar token y redirigir si lo deseas
            localStorage.removeItem("token");
            // Redirigir al login (si usas react-router-dom)
            window.location.href = "/login"; // o usa navigate("/login") si estás dentro del componente
        }
        return Promise.reject(error);
    }
);

function CotizacionForm() {
    // const fechaActual = new Date().toISOString().split("T")[0];
    //const fechaActual = new Date().toLocaleDateString("en-CA");
    const [fechaActual, setFechaActual] = useState("");
    const { id } = useParams();
    const navigate = useNavigate();
    const [esComodin, setEsComodin] = useState(false);
    const [vendedores, setVendedores] = useState([]);
    const [vendedorAsignado, setVendedorAsignado] = useState(null);
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
    const [tipoPagoModalOpen, setTipoPagoModalOpen] = useState(false);
    const toggleTipoPagoModal = () => setTipoPagoModalOpen(!tipoPagoModalOpen);
    const [pdfData, setPdfData] = useState(null); // payload para renderizar el PDF
    const [saving, setSaving] = useState(false);
    const idemKeyRef = useRef(null);
    const fechaRef = useRef(null);
    const [inputDescuentoPorcentaje, setInputDescuentoPorcentaje] =
        useState("");

    const ensureIdemKey = () => {
        if (!idemKeyRef.current) {
            // usa crypto.randomUUID() si está disponible en tu runtime
            idemKeyRef.current = window.crypto?.randomUUID?.() || uuidv4();
        }
        return idemKeyRef.current;
    };
    const [nitCliente, setNitCliente] = useState("");

    const cantidadRef = useRef(null);
    const [inputDescuentoMonto, setInputDescuentoMonto] = useState("");
    const [modoDescuento, setModoDescuento] = useState("NO APLICA");
    const isInitialLoad = useRef(true);

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
        const token = localStorage.getItem("token");
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };
        axios
            .get(`${import.meta.env.VITE_API_URL}/user`, { headers })
            .then((res) => {
                if (res.data.es_comodin === 1) {
                    setEsComodin(true);
                    // cargar todos los vendedores activos
                    axios
                        .get(
                            `${import.meta.env.VITE_API_URL}/lista_vendedores`,
                            { headers }
                        )
                        .then((r) => setVendedores(r.data))
                        .catch(() =>
                            alertify.error("Error cargando vendedores")
                        );
                }
            })
            .catch(() => alertify.error("Error verificando rol de usuario"));
    }, []);

    //Estado de la cotización principal
    const [cotizacion, setCotizacion] = useState({
        idcotizacion: 0,
        idcotizacionoriginal: 0,
        idcliente: "",
        cliente: "",
        idcontacto: 0,
        contacto: "",
        fecha_cotizacion: fechaActual,
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
        tipo_facturacion: "BIEN",
        subtotal: 0,
        descuento_porcentaje: 0,
        descuento_monto: 0,
        impuesto_iva: 0,
        total: 0,
        modo_descuento: "NO APLICA",
    });

    //Estado del detalle de la cotización
    const [detalle, setDetalle] = useState({
        unidad_medida: "UNIDAD",
        descripcion: "",
        cantidad: 0,
        ancho: 0,
        alto: 0,
        m2: 0,
        profundidad: 0,
        imagen: null, //nuevo estado para el archivo de imagen
        imagen_preview: null, //para mostrar una vista previa de la imágen
        imagen_ruta: null, //para almacenar la ruta de la imagen
        precio_unitario: 0,
        precio: 0,
        descuento: 0,
        impuesto_iva: 0,
        subtotal: 0,
        total: 0,
        porcentaje_aplicado: 0,
    });

    useEffect(() => {
        if (fechaActual) {
            setCotizacion((prev) => ({
                ...prev,
                fecha_cotizacion: fechaActual,
            }));
        }
    }, [fechaActual, id]);

    //sincronizar valor al cargar cotización
    useEffect(() => {
        setInputDescuentoPorcentaje(cotizacion.descuento_porcentaje || "");
    }, [cotizacion.descuento_porcentaje]);

    useEffect(() => {
        setInputDescuentoMonto(cotizacion.descuento_monto || "");
    }, [cotizacion.descuento_monto]);

    //CAMBIO: Estados para almacenar precios y cantidades del modal
    const [productoPredefinido, setProductoPredefinido] = useState(null);

    // --- Efecto: solo aplicar descuento cuando esté en modo porcentaje ---
    useEffect(() => {
        if (
            modoDescuento === "porcentaje" &&
            detalles.length &&
            cotizacion.descuento_porcentaje > 0
        ) {
            const nuevosDetalles = aplicarDescuentoAGrilla(
                detalles,
                cotizacion.descuento_porcentaje
            );
            setDetalles(nuevosDetalles);
        }
    }, [cotizacion.descuento_porcentaje, modoDescuento]);

    // const [cantidadDetalle, setCantidadDetalle] = useState(0); //No se usa directamente

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
                        .get("/api/lista_tipospago", { headers })
                        .then((res) => setTiposPago(res.data)),
                    axios
                        .get("/api/lista_unidadesmedida", { headers })
                        .then((res) => setUnidadesMedida(res.data)),
                ];

                if (id) {
                    requests.push(
                        axios
                            .get(`/api/cotizaciones/${id}`, { headers })
                            .then((res) => {
                                const data = res.data;
                                let formattedDate = "";
                                if (data.fecha_cotizacion) {
                                    formattedDate =
                                        data.fecha_cotizacion.split(" ")[0];
                                }
                                setCotizacion({
                                    idcotizacionoriginal:
                                        data.idcotizacionoriginal || 0,
                                    idcotizacion: data.idcotizacion || 0,
                                    idcliente: data.idcliente || 0,
                                    cliente: data.cliente || "",
                                    idcontacto: data.idcontacto || 0,
                                    contacto: data.contacto || "",
                                    fecha_cotizacion:
                                        formattedDate || fechaActual,
                                    trabajo: data.trabajo || "",
                                    observaciones_costeo:
                                        data.observaciones_costeo || "",
                                    observaciones_cliente:
                                        data.observaciones_cliente || "",
                                    total_general: data.total_general || 0,
                                    costeo_observaciones:
                                        data.costeo_observaciones || "",
                                    nocotizacion: data.nocotizacion || "",
                                    version: data.version || 1,
                                    idtipopago: data.idtipopago || "",
                                    direccion_entrega:
                                        data.direccion_entrega || "",
                                    costear: data.costear || "N",
                                    tipo_facturacion:
                                        data.tipo_facturacion || "BIEN",
                                    subtotal: data.subtotal || 0,
                                    descuento_porcentaje:
                                        data.descuento_porcentaje || 0,
                                    descuento_monto: data.descuento_monto || 0,
                                    impuesto_iva: data.impuesto_iva || 0,
                                    total: data.total || 0,
                                    modo_descuento:
                                        data.modo_descuento || "NO APLICA",
                                });

                                if (data.idvendedor) {
                                    setVendedorAsignado(data.idvendedor);
                                    //console.log("[LOAD] Vendedor asignado:", data.idvendedor);
                                }

                                setNitCliente(data.nit || "");
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

                                setModoDescuento(
                                    data.modo_descuento || "NO APLICA"
                                ); // NUEVO
                                setInputDescuentoPorcentaje(
                                    data.descuento_porcentaje
                                );
                                setInputDescuentoMonto(data.descuento_monto);
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
        const { precio, total, impuesto_iva, subtotal, porcentaje_aplicado } =
            calcularDetalleConIVA({
                cantidad: detalle.cantidad,
                precio_unitario: detalle.precio_unitario,
                descuento: detalle.descuento,
            });

        setDetalle((prev) => ({
            ...prev,
            precio,
            total,
            impuesto_iva,
            subtotal,
            porcentaje_aplicado,
        }));
    }, [detalle.cantidad, detalle.precio_unitario, detalle.descuento]);

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
        if (
            detalles.length &&
            modoDescuento === "porcentaje" &&
            cotizacion.descuento_porcentaje > 0
        ) {
            const nuevosDetalles = aplicarDescuentoAGrilla(
                detalles,
                cotizacion.descuento_porcentaje
            );
            setDetalles(nuevosDetalles);
        }
    }, [cotizacion.descuento_porcentaje, modoDescuento]);

    //-- función para calcular el total general de la cotización ---
    const calcularTotalGeneral = () => {
        const totalBruto = detalles.reduce(
            (acc, item) =>
                acc +
                parseFloat(item.precio_unitario || 0) *
                    parseFloat(item.cantidad || 0),
            0
        );
        setCotizacion((prev) => ({
            ...prev,
            total_general: totalBruto.toFixed(2),
        }));
    };

    useEffect(() => {
        calcularTotalGeneral();
    }, [detalles]);

    //Carga el listado de clientes
    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        axios
            .get("/api/lista_clientes", { headers })
            .then((res) => {
                const options = res.data.map((cliente) => ({
                    value: cliente.idcliente,
                    label: cliente.nombre,
                    nit: cliente.nit ?? "",
                }));
                setClienteOptions(options);
            })
            .catch((error) => {
                //console.error('Error al cargar clientes:', error);
                alertify.error("Error al cargar clientes");
            });
    }, []);

    useEffect(() => {
        if (!detalles.length) return;

        const totalBruto = detalles.reduce(
            (acc, item) => acc + item.precio_unitario * item.cantidad,
            0
        );

        const descuento = detalles.reduce(
            (acc, item) => acc + (parseFloat(item.descuento) || 0),
            0
        );

        const totalConDescuento = totalBruto - descuento;
        const subtotal = totalConDescuento / IVA_FACTOR;
        const impuestoIva = totalConDescuento - subtotal;
        const porcentaje = totalBruto > 0 ? (descuento / totalBruto) * 100 : 0;

        setCotizacion((prev) => ({
            ...prev,
            descuento_monto: parseFloat(descuento.toFixed(2)),
            descuento_porcentaje: parseFloat(porcentaje.toFixed(2)),
            subtotal: parseFloat(subtotal.toFixed(2)),
            impuesto_iva: parseFloat(impuestoIva.toFixed(2)),
            total: parseFloat(totalConDescuento.toFixed(2)),
        }));
    }, [detalles]);

    /*********************************** */

    // helper: garantiza un nombre de archivo con extensión
    const ensureNamedFile = (file) => {
        if (file.name && file.name.includes(".")) return file;
        const mime = file.type || "image/png";
        const ext = (mime.split("/")[1] || "png").replace("jpeg", "jpg");
        return new File([file], `pasted-${Date.now()}.${ext}`, { type: mime });
    };

    const handleClienteChange = (selectedOption) => {
        setClienteId(selectedOption.value);
        setNitCliente(selectedOption.nit || "");
        setCotizacion({
            ...cotizacion,
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
                // if (res.data.length === 0) {
                //     setModalIsOpen(true);
                // }
            })
            .catch((error) => {
                //console.error('Error al cargar contactos:', error);
                alertify.error("Error al cargar contactos");
            });
    };

    const generarPDFPorId = async (idCot, fecha) => {
        const token = localStorage.getItem("token");
        if (!token) {
            alertify.error("Token no encontrado.");
            return;
        }

        alertify.message("Generando PDF…");
        // console.log("[PDF] Solicitando:", `/api/cotizaciones/${idCot}/pdf`, {
        //     fecha,
        // });

        try {
            const res = await fetch(`/api/cotizaciones/${idCot}/pdf`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ fecha_cotizacion: fecha }),
            });
            let data;
            try {
                data = await res.json();
            } catch (e) {
                console.error("[PDF] Error parseando JSON:", e);
                alertify.error("Respuesta inválida del servidor.");
                return;
            }
            if (!res.ok) {
                console.error("[PDF] HTTP error:", res.status, data);
                alertify.error(data?.message || "Error generando PDF.");
                return;
            }
            //console.log("[PDF] OK:", data);
            setPdfData(data); // 👉 esto abre el overlay
            limpiarCampos();
        } catch (err) {
            console.error("[PDF] Fetch error:", err);
            alertify.error("No se pudo solicitar el PDF.");
        }
    };

    //Actualiza el estado de la cotización con el valor de cada campo cuando estos cambian
    const handleChange = (e) => {
        setCotizacion({ ...cotizacion, [e.target.name]: e.target.value });
    };

    const getIdFromCreateResponse = (res) => {
        return (
            res?.data?.idcotizacion ??
            res?.data?.cotizacion?.idcotizacion ??
            res?.data?.data?.idcotizacion ??
            res?.data?.id ?? // por si el backend usa 'id'
            null
        );
    };

    /**
     * Funciones para el calculo de descuento e impuesto
     */

    const IVA_FACTOR = 1.12; // si el IVA es 12%, multiplico por 1.12

    const calcularCabecera = (totalConIva, descPorcentaje, descMonto) => {
        let descuentoMontoCalc = descMonto;
        let descuentoPorcentajeCalc = descPorcentaje;

        if (descPorcentaje > 0) {
            descuentoMontoCalc = Math.round(
                totalConIva * (descPorcentaje / 100)
            );
        } else if (descMonto > 0) {
            descuentoPorcentajeCalc = (descMonto / totalConIva) * 100;
        }

        const totalConDescuento = totalConIva - descuentoMontoCalc;
        const subtotalSinIva = parseFloat(
            (totalConDescuento / IVA_FACTOR).toFixed(2)
        );
        const impuestoIva = parseFloat(
            (totalConDescuento - subtotalSinIva).toFixed(2)
        );
        const totalFinal = totalConDescuento;

        return {
            descuento_porcentaje: parseFloat(
                descuentoPorcentajeCalc.toFixed(2)
            ),
            descuento_monto: parseFloat(descuentoMontoCalc.toFixed(2)),
            subtotal: subtotalSinIva,
            impuesto_iva: impuestoIva,
            total: parseFloat(totalFinal.toFixed(2)),
        };
    };

    const handleDescuentoPorcentajeChange = (e) => {
        const porcentaje = parseFloat(e.target.value) || 0;
        setModoDescuento("PORCENTAJE");
        setInputDescuentoPorcentaje(porcentaje);

        const totalBruto = parseFloat(cotizacion.total_general) || 0;
        const calc = calcularCabecera(totalBruto, porcentaje, 0);
        const nuevosDetalles = aplicarDescuentoAGrilla(detalles, porcentaje);

        setDetalles(nuevosDetalles);
        setCotizacion((prev) => ({
            ...prev,
            descuento_porcentaje: calc.descuento_porcentaje,
            descuento_monto: calc.descuento_monto,
            subtotal: calc.subtotal,
            impuesto_iva: calc.impuesto_iva,
            total: calc.total,
        }));
    };

    const handleDescuentoMontoChange = (event) => {
        const monto = parseFloat(event.target.value || 0);
        setModoDescuento("MONTO");

        const totalBruto = detalles.reduce(
            (acc, item) => acc + item.precio_unitario * item.cantidad,
            0
        );
        const porcentaje = (monto / totalBruto) * 100;

        let nuevosDetalles = aplicarDescuentoAGrilla(detalles, porcentaje);

        const descuentoAplicado = nuevosDetalles.reduce(
            (acc, item) => acc + item.descuento,
            0
        );
        const diferencia = monto - descuentoAplicado;

        if (Math.abs(diferencia) > 0.01 && nuevosDetalles.length > 0) {
            const idx = nuevosDetalles.length - 1;
            nuevosDetalles[idx].descuento += diferencia;
            const totalConDescuento =
                nuevosDetalles[idx].precio - nuevosDetalles[idx].descuento;
            const subtotal = totalConDescuento / IVA_FACTOR;
            const iva = totalConDescuento - subtotal;

            nuevosDetalles[idx].subtotal = parseFloat(subtotal.toFixed(2));
            nuevosDetalles[idx].impuesto_iva = parseFloat(iva.toFixed(2));
        }

        const totalConDescuento = nuevosDetalles.reduce(
            (acc, item) => acc + (item.precio - item.descuento),
            0
        );
        const subtotalSinIva = totalConDescuento / IVA_FACTOR;
        const impuestoIva = totalConDescuento - subtotalSinIva;

        setDetalles(nuevosDetalles);
        setCotizacion({
            ...cotizacion,
            descuento_monto: parseFloat(monto.toFixed(2)),
            descuento_porcentaje: parseFloat(porcentaje.toFixed(2)),
            total: parseFloat(totalConDescuento.toFixed(2)),
            subtotal: parseFloat(subtotalSinIva.toFixed(2)),
            impuesto_iva: parseFloat(impuestoIva.toFixed(2)),
        });
    };

    const handleEliminarDetalle = (index) => {
        const nuevosDetalles = detalles.filter((_, i) => i !== index);
        const resumen = recalcularCabeceraDesdeDetalles(nuevosDetalles);

        setDetalles(nuevosDetalles);
        setCotizacion((prev) => ({
            ...prev,
            ...resumen,
        }));
    };
    /*********************************************************** */

    /**
     * Valida los campos obligatorios de la cotización antes de enviarla al back-end en una sola función
     * fuera del handleSubmit para mejor legibilidad
     */
    const validarCotizacion = (cotizacion, detalles) => {
        if (!cotizacion.idcliente) {
            return "Debe seleccionar un cliente.";
        }

        if (!cotizacion.idcontacto) {
            // No es obligatorio, solo asignamos 0
            cotizacion.idcontacto = 0;
        }

        if (!cotizacion.idtipopago) {
            return "Debe seleccionar una forma de pago.";
        }

        if (!detalles || detalles.length === 0) {
            return "Debe asignar registros en el detalle de la cotización.";
        }

        if (
            !cotizacion.direccion_entrega ||
            cotizacion.direccion_entrega.trim() === ""
        ) {
            return "Debe ingresar la dirección de entrega.";
        }

        return null; // ✔️ Todo OK
    };

    //Envía los datos al back-end para registrar, en el método store.
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (saving) return;
        setSaving(true);

        const token = localStorage.getItem("token");
        const headers = {
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": ensureIdemKey(),
        };

        // Actualizar fecha
        const fechaSeleccionada = fechaRef.current?.value || fechaActual;
        const cotizacionActualizada = {
            ...cotizacion,
            fecha_cotizacion: fechaSeleccionada,
        };

        // ✔️ VALIDAR ANTES DE HACER FORM DATA
        const errorValidacion = validarCotizacion(
            cotizacionActualizada,
            detalles
        );

        if (errorValidacion) {
            alertify.alert("CAMPO OBLIGATORIO", errorValidacion);
            setSaving(false); // ⬅️ Fix crítico
            return;
        }

        // Si todo está OK, preparar formData
        const formData = new FormData();
        formData.append("idcliente", cotizacionActualizada.idcliente);
        formData.append("idcontacto", cotizacionActualizada.idcontacto);
        formData.append("idtipopago", cotizacionActualizada.idtipopago);
        formData.append(
            "fecha_cotizacion",
            cotizacionActualizada.fecha_cotizacion
        );
        formData.append("trabajo", cotizacionActualizada.trabajo);
        formData.append(
            "observaciones_costeo",
            cotizacionActualizada.observaciones_costeo
        );
        formData.append(
            "observaciones_cliente",
            cotizacionActualizada.observaciones_cliente
        );
        formData.append(
            "direccion_entrega",
            cotizacionActualizada.direccion_entrega
        );

        // COSTEAR
        const tieneTotalCero = detalles.some((d) => parseFloat(d.total) === 0);
        formData.append("costear", tieneTotalCero ? "S" : "N");

        formData.append("estado", "1");
        formData.append(
            "idcotizacionoriginal",
            cotizacionActualizada.idcotizacionoriginal
        );
        formData.append("version", cotizacionActualizada.version);
        formData.append("total_general", cotizacionActualizada.total_general);
        formData.append(
            "tipo_facturacion",
            cotizacionActualizada.tipo_facturacion
        );

        if (esComodin && vendedorAsignado) {
            formData.append("idvendedor_asignado", vendedorAsignado);
        }

        formData.append("subtotal", cotizacionActualizada.subtotal);
        formData.append(
            "descuento_porcentaje",
            cotizacionActualizada.descuento_porcentaje
        );
        formData.append(
            "descuento_monto",
            cotizacionActualizada.descuento_monto
        );
        formData.append("impuesto_iva", cotizacionActualizada.impuesto_iva);
        formData.append("total", cotizacionActualizada.total);
        formData.append("modo_descuento", modoDescuento);

        // DETALLES (igual)
        detalles.forEach((detalle, index) => {
            formData.append(
                `detalles[${index}][unidad_medida]`,
                detalle.unidad_medida
            );
            formData.append(
                `detalles[${index}][descripcion]`,
                detalle.descripcion
            );
            formData.append(
                `detalles[${index}][cantidad]`,
                detalle.cantidad || 0
            );
            formData.append(`detalles[${index}][ancho]`, detalle.ancho || 0);
            formData.append(`detalles[${index}][alto]`, detalle.alto || 0);
            formData.append(`detalles[${index}][m2]`, detalle.m2 || 0);
            formData.append(
                `detalles[${index}][profundidad]`,
                detalle.profundidad || 0
            );
            formData.append(
                `detalles[${index}][precio_unitario]`,
                detalle.precio_unitario || 0
            );
            formData.append(`detalles[${index}][precio]`, detalle.precio || 0);
            formData.append(
                `detalles[${index}][descuento]`,
                parseFloat(detalle.descuento) || 0
            );
            formData.append(
                `detalles[${index}][porcentaje_aplicado]`,
                detalle.porcentaje_aplicado || 0
            );
            formData.append(
                `detalles[${index}][impuesto_iva]`,
                detalle.impuesto_iva
            );
            formData.append(
                `detalles[${index}][subtotal]`,
                detalle.subtotal || 0
            );
            formData.append(`detalles[${index}][total]`, detalle.total || 0);

            // Imagenes
            if (detalle.imagen) {
                formData.append(
                    `detalles[${index}][imagen]`,
                    detalle.imagen,
                    detalle.imagen.name || "imagen.png"
                );
            } else if (detalle.imagen_ruta) {
                formData.append(
                    `detalles[${index}][imagen_ruta]`,
                    detalle.imagen_ruta
                );
            }
        });

        try {
            let res;

            if (id) {
                formData.append("_method", "PUT");
                res = await axios.post(`/api/cotizaciones/${id}`, formData, {
                    headers,
                });
                idemKeyRef.current = null;
                await generarPDFPorId(
                    id,
                    cotizacionActualizada.fecha_cotizacion
                );
            } else {
                res = await axios.post("/api/cotizaciones", formData, {
                    headers,
                });
                const nuevoId = getIdFromCreateResponse(res);
                idemKeyRef.current = null;
                await generarPDFPorId(
                    nuevoId,
                    cotizacionActualizada.fecha_cotizacion
                );
            }

            navigate("/cotizaciones/crear");
        } catch (error) {
            console.error("Error al guardar la cotización:", error);
            alertify.error("Error guardando la cotización.");
        } finally {
            setSaving(false); // ✔️ SIEMPRE SE RESETEA
        }
    };

    //Para cargar el detalle de la cotización
    const handleDetalleChange = (e) => {
        setDetalle({ ...detalle, [e.target.name]: e.target.value });
    };

    const handleImagenChange = (e) => {
        const file = e.target.files?.[0] || null;
        if (file) setImagenFromFile(file);
        else
            setDetalle((prev) => ({
                ...prev,
                imagen: null,
                imagen_preview: null,
            }));
    };

    // Ref al input file (para dispararlo desde un botón si quieres)
    const fileInputRef = useRef(null);

    // Centraliza el seteo de la imagen (click, pegar o arrastrar)
    const setImagenFromFile = useCallback((file) => {
        if (!file) return;
        if (!file.type?.startsWith("image/")) {
            alertify.error("Solo se permiten archivos de imagen.");
            return;
        }
        const named = ensureNamedFile(file);
        setDetalle((prev) => {
            // Libera el blob anterior para evitar fugas de memoria
            if (
                prev.imagen_preview &&
                String(prev.imagen_preview).startsWith("blob:")
            ) {
                URL.revokeObjectURL(prev.imagen_preview);
            }
            return {
                ...prev,
                imagen: named,
                //imagen: file, // ← archivo File real
                imagen_preview: URL.createObjectURL(named), // ← preview
                imagen_ruta: null, // ← anulamos ruta antigua si existía
            };
        });
    }, []);

    const handlePasteImage = useCallback(
        (e) => {
            const items = e.clipboardData?.items || [];
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                if (it.kind === "file" && it.type.startsWith("image/")) {
                    const file = it.getAsFile();
                    if (file) {
                        e.preventDefault(); // evita que pegue texto en algún input
                        setImagenFromFile(file);
                        break;
                    }
                }
            }
        },
        [setImagenFromFile]
    );

    const handleDragOverImage = (e) => {
        // Necesario para permitir drop
        e.preventDefault();
    };

    const handleDropImage = useCallback(
        (e) => {
            e.preventDefault();
            const file = e.dataTransfer?.files?.[0];
            if (file) setImagenFromFile(file);
        },
        [setImagenFromFile]
    );

    //Agregar los datos del detalle al DataTable
    const handleAddDetalle = () => {
        const nuevoDetalle = { ...detalle };

        if (detalleSeleccionado) {
            const index = detalles.findIndex((d) => d === detalleSeleccionado);
            if (index !== -1) {
                const originalItem = detalleSeleccionado; // El objeto original del array (viene de backend o agregado antes)
                const formState = detalle; // El estado actual de los inputs del formulario de detalle

                // Construir el objeto actualizado para poner de vuelta en el array `detalles`
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
                    precio: formState.precio,
                    subtotal: formState.subtotal,
                    total: formState.total,
                    porcentaje_aplicado: formState.porcentaje_aplicado,
                    impuesto_iva: formState.impuesto_iva,
                    descuento: formState.descuento,
                    precio_unitario: formState.precio_unitario || 0,

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
            // Lógica para AGREGAR un NUEVO detalle (esta parte parecía funcionar bien)
            const formState = detalle; // Usar formState para claridad aquí también
            const newItem = {
                // NO uses ...originalItem aquí porque no existe.
                // Genera un ID temporal si lo necesitas para el key en la lista, o deja que el backend lo asigne.
                // iddetallecotizacion: Date.now(), // Ejemplo de ID temporal para el frontend
                unidad_medida: formState.unidad_medida,
                descripcion: formState.descripcion,
                cantidad: formState.cantidad,
                ancho: formState.ancho,
                alto: formState.alto,
                m2: formState.m2,
                profundidad: formState.profundidad,
                precio_unitario: formState.precio_unitario || 0,
                precio: formState.precio,
                subtotal: formState.subtotal,
                total: formState.total,
                porcentaje_aplicado: formState.porcentaje_aplicado,
                impuesto_iva: formState.impuesto_iva,
                descuento: formState.descuento,
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
            unidad_medida: "UNIDAD",
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
            precio_unitario: 0,
        });
        // Enfocar cantidad tras limpiar (sirve para Enter y para clic en Agregar)
        requestAnimationFrame(() => {
            if (cantidadRef.current) {
                cantidadRef.current.focus();
                cantidadRef.current.select(); // opcional: selecciona el 0 para teclear directo
            }
        });
    };

    const handleAgregarContacto = () => {
        if (!cotizacion.idcliente || cotizacion.idcliente === "") {
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
                    unidad_medida: "UNIDAD",
                    descripcion: "",
                    cantidad: 0,
                    ancho: 0,
                    alto: 0,
                    m2: 0,
                    profundidad: 0,
                    precio: 0,
                    total: 0,
                    precio_unitario: 0,
                    imagen: null,
                    imagen_preview: null,
                });
                alertify.success("Detalle eliminado.");
            },
            () => {
                alertify.error("Cancelado");
            }
        );
    };

    //Carga los valores de la fila seleccionada en el DataTable a los inputs correspondientes del detalle.
    const handleRowClick = (rowData) => {
        //console.log('rowData:', rowData);
        setDetalleSeleccionado(rowData);

        const previewUrl = rowData.imagen_ruta
            ? `/images_cotizaciones/${rowData.imagen_ruta}`
            : rowData.imagen_preview || null;

        setDetalle({
            unidad_medida: rowData.unidad_medida,
            descripcion: rowData.descripcion,
            cantidad: rowData.cantidad,
            ancho: rowData.ancho,
            alto: rowData.alto,
            m2: rowData.m2,
            profundidad: rowData.profundidad,
            precio: rowData.precio,
            precio_unitario: rowData.precio_unitario || 0,
            descuento: rowData.descuento || 0,
            impuesto_iva: rowData.impuesto_iva || 0,
            subtotal: rowData.subtotal || 0,
            porcentaje_aplicado: rowData.porcentaje_aplicado || 0,
            total: rowData.total,
            imagen: null, // Cuando se edita, la imagen ya está guardada, no se "carga" aquí
            imagen_preview: previewUrl,
            imagen_ruta: rowData.imagen_ruta || null, // ¡CRUCIAL! Conservar la ruta de la imagen existente en el estado del formulario.
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

    const columns = [
        {
            accessorKey: "unidad_medida",
            header: "UM",
            size: 50,
        },
        {
            accessorKey: "cantidad",
            header: "Cant",
            size: 50,
        },
        // {
        //     accessorKey: "ancho",
        //     header: "Ancho",
        //     size: 50,
        // },
        // {
        //     accessorKey: "alto",
        //     header: "Alto",
        //     size: 50,
        // },
        // {
        //     accessorKey: "m2",
        //     header: "M2",
        //     size: 60,
        // },
        // {
        //     accessorKey: "profundidad",
        //     header: "Prof.",
        //     size: 60,
        // },
        {
            accessorKey: "precio_unitario",
            header: "Precio",
            size: 60,
            Cell: ({ cell }) =>
                parseFloat(cell.getValue() || 0).toLocaleString("es-GT", {
                    style: "currency",
                    currency: "GTQ",
                }),
        },
        {
            accessorKey: "precio",
            header: "Total",
            size: 60,
            Cell: ({ cell }) =>
                parseFloat(cell.getValue() || 0).toLocaleString("es-GT", {
                    style: "currency",
                    currency: "GTQ",
                }),
            Footer: () => (
                <strong>
                    {detalles
                        .reduce(
                            (acc, item) => acc + (parseFloat(item.precio) || 0),
                            0
                        )
                        .toLocaleString("es-GT", {
                            style: "currency",
                            currency: "GTQ",
                        })}
                </strong>
            ),
        },
        {
            accessorKey: "descripcion",
            header: "Descripción",
            size: 400,
            grow: true,
            muiTableBodyCellProps: {
                sx: {
                    whiteSpace: "normal !important",
                    wordBreak: "break-word !important",
                    lineHeight: "1.3rem",
                },
            },
            muiTableHeadCellProps: {
                sx: { backgroundColor: "#f5f6fa", fontWeight: "bold" },
            },
            enableColumnDragging: false,
            Cell: ({ cell }) => <strong>{cell.getValue()}</strong>,
            enablePinning: true, // 👉 columna sticky izquierda
        },
        {
            accessorKey: "acciones",
            header: "Acciones",
            size: 70,
            enablePinning: true, // 👉 sticky derecha
            Cell: ({ row }) => (
                <Box sx={{ display: "flex", gap: "6px" }}>
                    {/* Ver imagen */}
                    {row.original.imagen_ruta || row.original.imagen_preview ? (
                        <Tooltip title="Ver imagen">
                            <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                    const src = row.original.imagen_ruta
                                        ? `/images_cotizaciones/${row.original.imagen_ruta}`
                                        : row.original.imagen_preview;

                                    setSelectedImageUrl(src);
                                    setIsImageModalOpen(true);
                                }}
                            >
                                <VisibilityIcon />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Sin imagen">
                            <IconButton size="small" disabled>
                                <CloseIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            ),
        },
    ];

    const handleProductoPredefinidoSeleccionado = (producto) => {
        setProductoPredefinido(producto);
        // Prepara el detalle con los datos del producto
        const nuevoDetalleInicial = {
            unidad_medida: producto.unidad_medida,
            descripcion: producto.titulo,
            ancho: producto.ancho,
            alto: producto.alto,
            profundidad: producto.profundidad,
            cantidad: 0, // Cantidad inicial es 0 al seleccionar el producto
            precio: 0, // El precio se calculará a continuación
            total: 0, // El total también se calculará
            precio_unitario: 0,
            imagen: null,
            imagen_preview: null, // El producto predefinido no trae imagen de detalle aquí
        };

        // Actualiza el estado del detalle
        setDetalle((prevDetalle) => ({
            ...prevDetalle,
            ...nuevoDetalleInicial, // Aplica los campos del nuevo producto
        }));

        calcularPrecioDetalle(0, producto); // Calcular el precio inicial al seleccionar el producto
        toggleProductoPredefinidoModal();
    };

    const handleCantidadDetalleChange = (e) => {
        const value = parseInt(e.target.value, 10) || 0;

        setDetalle((prevDetalle) => ({
            //const updatedDetalle = {
            ...prevDetalle,
            cantidad: value,
            //};

            // Vuelve a calcular el precio y total con la *nueva cantidad* y el *producto predefinido actual*
            // Es importante usar el 'productoPredefinido' del estado aquí, ya que este handler
            // se llama DESPUÉS de que un producto ya ha sido seleccionado y su estado ha sido actualizado.
            //calcularPrecioDetalle(value, productoPredefinido); // Usa el valor de la cantidad recién ingresado y el producto del estado

            // Retorna el estado actualizado del detalle
            //return updatedDetalle;
        }));
    };

    // Este efecto se ejecuta cuando la cantidad o el producto cambian
    useEffect(() => {
        if (!productoPredefinido || !detalle || !detalle.cantidad) return;
        if (!productoPredefinido || !detalle.cantidad) return;

        const calcularPrecioDetalle = (cantidad, productData) => {
            const {
                variacion,
                precio,
                cantidad_uno,
                cantidad_dos,
                cantidad_tres,
                cantidad_cuatro,
                precio_uno,
                precio_dos,
                precio_tres,
                precio_cuatro,
            } = productData;

            let nuevoPrecio = 0;

            if (variacion === "S") {
                const c = parseFloat(cantidad);
                const cu = parseFloat(cantidad_uno || 0);
                const cd = parseFloat(cantidad_dos || 0);
                const ct = parseFloat(cantidad_tres || 0);
                const cc = parseFloat(cantidad_cuatro || 0);

                if (c <= cu) {
                    nuevoPrecio = parseFloat(precio_uno || 0);
                } else if (c >= cu && c <= cd) {
                    nuevoPrecio = parseFloat(precio_dos || 0);
                } else if (c >= cd && c <= ct) {
                    nuevoPrecio = parseFloat(precio_tres || 0);
                } else if (c > ct) {
                    nuevoPrecio = parseFloat(precio_cuatro || 0);
                }
            } else {
                nuevoPrecio = parseFloat(precio || 0);
            }

            setDetalle((prevDetalle) => ({
                ...prevDetalle,
                precio: nuevoPrecio,
            }));
        };

        calcularPrecioDetalle(detalle.cantidad, productoPredefinido);
    }, [detalle.cantidad, productoPredefinido]);

    // Modificar calcularPrecioDetalle para aceptar el producto como argumento
    const calcularPrecioDetalle = (cantidad, productData) => {
        let nuevoPrecio = 0;

        // Usa los datos del producto pasados como argumento. Si por alguna razón no se pasan,
        // usa el estado 'productoPredefinido' (aunque con la corrección siempre se pasarán).
        const currentProductData = productData || productoPredefinido;

        // Asegúrate de que tenemos datos del producto para calcular
        if (!currentProductData) {
            //console.warn("calcularPrecioDetalle llamado sin datos de producto.");
            // Establece precio a 0 si no hay datos para evitar errores
            setDetalle((prevDetalle) => ({
                ...prevDetalle,
                precio: 0,
                total: 0,
                precio_unitario: 0,
            }));
            return;
        }

        //console.log('Calculando precio para:', currentProductData.titulo, ', Cantidad:', cantidad, ', Variación:', currentProductData.variacion); // Log para depuración

        // Lógica de cálculo basada en la VARIACIÓN (usar solo 'N' o 'S')
        // Asegúrate de que los valores del backend son exactamente 'N' y 'S'
        if (currentProductData.variacion === "N") {
            //console.log('Variación N: Usando precio base.');
            nuevoPrecio = parseFloat(currentProductData.precio) || 0;
        } else if (currentProductData.variacion === "S") {
            //console.log('Variación S: Aplicando reglas de cantidad.');
            // Lógica de rangos de cantidad
            if (
                cantidad > 0 &&
                cantidad <= parseFloat(currentProductData.cantidad_uno || 0)
            ) {
                nuevoPrecio = parseFloat(currentProductData.precio_uno) || 0;
            } else if (
                parseFloat(currentProductData.cantidad_dos || 0) > 0 &&
                cantidad > parseFloat(currentProductData.cantidad_uno || 0) &&
                cantidad <= parseFloat(currentProductData.cantidad_dos || 0)
            ) {
                nuevoPrecio = parseFloat(currentProductData.precio_dos) || 0;
            } else if (
                parseFloat(currentProductData.cantidad_tres || 0) > 0 &&
                cantidad > parseFloat(currentProductData.cantidad_dos || 0) &&
                cantidad <= parseFloat(currentProductData.cantidad_tres || 0)
            ) {
                nuevoPrecio = parseFloat(currentProductData.precio_tres) || 0;
            } else if (
                parseFloat(currentProductData.cantidad_cuatro || 0) > 0 &&
                cantidad > parseFloat(currentProductData.cantidad_tres || 0)
            ) {
                nuevoPrecio = parseFloat(currentProductData.precio_cuatro) || 0;
            } else {
                // Qué hacer si la cantidad no cae en ningún rango para variación 'S'?
                // Tu lógica actual calculaba cantidad * precio base, lo cual puede no ser correcto.
                // Considera establecer el precio a 0, mostrar un mensaje, o usar otra lógica de negocio.
                //console.warn('Cantidad', cantidad, 'fuera de rangos definidos para variación S. Estableciendo precio a 0.');
                nuevoPrecio = 0; // O define una lógica de fallback adecuada
            }
        } else {
            // Manejar casos inesperados de variación
            //console.warn('Variación desconocida:', currentProductData.variacion, '. Estableciendo precio a 0.');
            nuevoPrecio = 0;
        }

        // Asegura que el precio calculado sea un número válido
        if (isNaN(nuevoPrecio)) {
            //console.error("Precio calculado es NaN. Estableciendo a 0.");
            alertify.error("Error al calcular el precio. Estableciendo a 0.");
            nuevoPrecio = 0;
        }

        // Calcula el total basado en la cantidad y el nuevo precio
        const totalCalculado = (cantidad * nuevoPrecio).toFixed(2);

        // Actualiza el estado del detalle con el nuevo precio y total
        setDetalle((prevDetalle) => ({
            ...prevDetalle,
            precio: parseFloat(nuevoPrecio.toFixed(2)), // Asegura 2 decimales y tipo number
            total: totalCalculado, // El total ya está como string con 2 decimales
        }));
    };

    const limpiarCampos = () => {
        setCotizacion({
            idcotizacion: 0,
            idcotizacionoriginal: 0,
            idcliente: "",
            cliente: "",
            idcontacto: 0,
            contacto: "",
            fecha_cotizacion: fechaActual,
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
            unidad_medida: "UNIDAD",
            descripcion: "",
            cantidad: 0,
            ancho: 0,
            alto: 0,
            m2: 0,
            profundidad: 0,
            precio: 0,
            total: 0,
            precio_unitario: 0,
            imagen: null,
            imagen_preview: null,
            imagen_ruta: null,
        });
        setClienteId("");
        setContactos([]);
        setDetalleSeleccionado(null);
        setProductoPredefinido(null);
        setIsImageModalOpen(false);
        setSelectedImageUrl(null);
        setNitCliente("");
    };

    const handleKeyDownDetalle = (e) => {
        if (e.key === "Enter") {
            e.preventDefault(); // evitar el submit
            handleAddDetalle(); // ejecutar la función del botón
        }
    };

    const exportarExcel = () => {
        // Si ya tenés algún exportador, lo integro; si no, uso este rápido:
        const encabezados = columns.map((c) => c.header).join(",");
        const filas = detalles
            .map((d) =>
                columns
                    .map((c) => {
                        const key = c.accessorKey;
                        return key ? (d[key] != null ? d[key] : "") : "";
                    })
                    .join(",")
            )
            .join("\n");

        const contenido = encabezados + "\n" + filas;
        const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `detalles_cotizacion_${Date.now()}.csv`;
        link.click();
    };

    return (
        <div className="cotizacion-layout mt-4 mb-4">
            <Header title={id ? "Editar Cotización" : "Crear Cotización"} />

            <div className="card cotizacion-card shadow-sm p-4">
                <div className="card-body card-form">
                    {/* Meta header ERP */}
                    <div className="erp-meta-header mb-3 d-flex justify-content-between align-items-center">
                        <div>
                            <span className="badge erp-badge me-2">
                                Módulo · Cotizaciones
                            </span>
                            <span className="text-muted small d-block">
                                {id
                                    ? "Edición de cotización existente"
                                    : "Registro de nueva cotización para cliente"}
                            </span>
                        </div>
                        <div className="text-end small text-muted">
                            <div>
                                Fecha servidor:{" "}
                                <strong>{fechaActual || "--"}</strong>
                            </div>
                            {cotizacion.nocotizacion && (
                                <div>
                                    No. Cotización:{" "}
                                    <strong>{cotizacion.nocotizacion}</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} encType="multipart/form-data">
                        {/* --- Sección Cliente/Contacto/Pago --- */}
                        <FormSection title="Datos generales">
                            {esComodin && (
                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">
                                            Vendedor asignado
                                        </label>
                                        <select
                                            className="form-select form-select-sm campo-obligatorio-fondo"
                                            value={vendedorAsignado || ""}
                                            onChange={(e) =>
                                                setVendedorAsignado(
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Seleccionar vendedor
                                            </option>
                                            {vendedores.map((v) => (
                                                <option
                                                    key={v.id_empleado}
                                                    value={v.id_empleado}
                                                >
                                                    {v.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Fila cliente / NIT / contacto */}
                            <div className="row g-3 mb-3">
                                <div className="col-md-5">
                                    <label className="form-label">
                                        Cliente
                                    </label>
                                    <Select
                                        value={clienteOptions.find(
                                            (option) =>
                                                option.value ===
                                                cotizacion.idcliente
                                        )}
                                        onChange={handleClienteChange}
                                        options={clienteOptions}
                                        isSearchable={true}
                                        placeholder="Seleccionar Cliente"
                                        className="react-select-erp campo-obligatorio-fondo"
                                    />
                                </div>

                                <div className="col-md-3">
                                    <label className="form-label">NIT</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={nitCliente}
                                        readOnly
                                        placeholder="NIT del cliente"
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label">
                                        Contacto
                                    </label>
                                    <select
                                        name="idcontacto"
                                        value={cotizacion.idcontacto}
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
                                        className="btn btn-link p-0 ms-1 erp-small-link-btn"
                                        onClick={handleAgregarContacto}
                                    >
                                        <i className="bi bi-person-plus me-1"></i>{" "}
                                        Nuevo contacto
                                    </button>
                                </div>
                            </div>

                            {/* Fila forma pago / tipo facturación / fecha / trabajo */}
                            <div className="row g-2 mb-3">
                                <div className="col-md-3">
                                    <label className="form-label">
                                        Forma de pago
                                    </label>
                                    <select
                                        name="idtipopago"
                                        value={cotizacion.idtipopago}
                                        onChange={handleChange}
                                        className="form-select form-select-sm campo-obligatorio-fondo"
                                    >
                                        <option value="">
                                            Seleccionar forma de pago
                                        </option>
                                        {tiposPago.map((tipoPago) => (
                                            <option
                                                key={tipoPago.idtipopago}
                                                value={tipoPago.idtipopago}
                                            >
                                                {tipoPago.tipo}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* BOTÓN + aquí */}
                                <div className="col-auto d-flex align-items-end">
                                    <button
                                        type="button"
                                        className="erp-btn-add shadow-sm"
                                        onClick={toggleTipoPagoModal}
                                        title="Agregar nueva forma de pago"
                                    >
                                        <span className="erp-btn-add-icon">
                                            +
                                        </span>
                                    </button>
                                </div>

                                <div className="col-md-3">
                                    <label className="form-label">
                                        Tipo de Facturación
                                    </label>
                                    <select
                                        name="tipo_facturacion"
                                        value={cotizacion.tipo_facturacion}
                                        onChange={handleChange}
                                        className="form-select form-select-sm campo-obligatorio-fondo"
                                    >
                                        <option value="BIEN">BIEN</option>
                                        <option value="SERVICIO">
                                            SERVICIO
                                        </option>
                                    </select>
                                </div>

                                <div className="col-md-3">
                                    <label className="form-label">
                                        Fecha cotización
                                    </label>
                                    <input
                                        type="date"
                                        name="fecha_cotizacion"
                                        ref={fechaRef}
                                        value={
                                            cotizacion.fecha_cotizacion ??
                                            fechaActual
                                        }
                                        onChange={handleChange}
                                        className="form-control form-control-sm"
                                    />
                                </div>
                            </div>

                            <div className="col-md-5">
                                <label className="form-label">
                                    Trabajo / proyecto
                                </label>
                                <input
                                    type="text"
                                    name="trabajo"
                                    value={cotizacion.trabajo}
                                    onChange={handleChange}
                                    placeholder="Nombre del trabajo o proyecto"
                                    className="form-control form-control-sm"
                                />
                            </div>

                            {/* Dirección de entrega */}
                            <div className="row g-3 mb-4">
                                <div className="col-md-12">
                                    <label className="form-label">
                                        Dirección de entrega
                                    </label>
                                    <input
                                        type="text"
                                        name="direccion_entrega"
                                        value={cotizacion.direccion_entrega}
                                        onChange={handleChange}
                                        placeholder="Dirección de entrega"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                            </div>
                        </FormSection>

                        {/* --- Sección Detalle de Cotización --- */}
                        <FormSection title="Detalle de Cotización">
                            <div onKeyDown={handleKeyDownDetalle}>
                                {/* Toolbar detalle */}
                                <div className="detalle-toolbar mb-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-producto-predefinido"
                                            onClick={
                                                toggleProductoPredefinidoModal
                                            }
                                        >
                                            <FaProductHunt /> Producto
                                            predefinido
                                        </button>
                                        <span className="text-muted small">
                                            Usá productos guardados o carga un
                                            detalle manualmente.
                                        </span>
                                    </div>
                                    <div className="small text-muted">
                                        Enter = Agregar detalle
                                    </div>
                                </div>

                                {/* Fila 1: unidad, cantidad, descripción */}
                                <div className="row g-3 mb-2">
                                    <div className="col-md-2">
                                        <label className="form-label">
                                            Unidad medida
                                        </label>
                                        <select
                                            name="unidad_medida"
                                            value={detalle.unidad_medida}
                                            onChange={handleDetalleChange}
                                            className="form-select form-select-sm"
                                        >
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
                                            onChange={
                                                handleCantidadDetalleChange
                                            }
                                            className="form-control form-control-sm"
                                            step="1"
                                            min="0"
                                            ref={cantidadRef}
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

                                {/* Fila 2: medidas / precio / total / imagen / botones */}
                                <div className="row g-2 align-items-end mb-3">
                                    <div className="col">
                                        <label className="form-label">
                                            Ancho
                                        </label>
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

                                    <div className="col">
                                        <label className="form-label">
                                            Alto
                                        </label>
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

                                    <div className="col">
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

                                    <div className="col">
                                        <label className="form-label">
                                            Prof.
                                        </label>
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

                                    <div className="col">
                                        <label className="form-label">
                                            Precio unitario
                                        </label>
                                        <input
                                            type="number"
                                            name="precio_unitario"
                                            value={detalle.precio_unitario}
                                            onChange={handleDetalleChange}
                                            className="form-control form-control-sm"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>

                                    <div className="col">
                                        <label className="form-label">
                                            Total
                                        </label>
                                        <input
                                            type="number"
                                            name="total"
                                            value={detalle.total}
                                            className="form-control form-control-sm"
                                            readOnly
                                            step="0.01"
                                        />
                                    </div>

                                    <div className="col-md-3">
                                        <label className="form-label fw-bold">
                                            Imagen (opcional)
                                        </label>
                                        <div
                                            className="form-control form-control-sm d-flex flex-column align-items-center justify-content-center image-dropzone-erp"
                                            onPaste={handlePasteImage}
                                            onDragOver={handleDragOverImage}
                                            onDrop={handleDropImage}
                                            tabIndex={0}
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            title="Click para seleccionar, o arrastra/pega una imagen"
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                name="imagen"
                                                style={{ display: "none" }}
                                                onChange={handleImagenChange}
                                            />
                                            <div className="text-center small">
                                                <strong>Click</strong> para
                                                seleccionar
                                                <br />o{" "}
                                                <strong>
                                                    arrastra / pega
                                                </strong>{" "}
                                                una imagen
                                            </div>
                                        </div>
                                        {detalle.imagen_preview && (
                                            <img
                                                src={detalle.imagen_preview}
                                                alt="Vista previa"
                                                className="mt-1 erp-thumb"
                                            />
                                        )}
                                    </div>

                                    <div className="col-auto d-flex flex-column gap-2">
                                        <button
                                            type="button"
                                            onClick={handleAddDetalle}
                                            className="btn erp-btn-primary btn-sm me-2"
                                        >
                                            <i className="bi bi-plus-square me-1"></i>
                                            {detalleSeleccionado
                                                ? "Actualizar"
                                                : "Agregar"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleQuitarDetalle}
                                            className="btn erp-btn-danger btn-sm"
                                        >
                                            <i className="bi bi-x-circle me-1"></i>
                                            Quitar
                                        </button>
                                    </div>
                                </div>

                                {/* --- Tabla de Detalles Agregados --- */}
                                <h5 className="mt-4 mb-3 erp-subsection-title">
                                    Detalles agregados
                                </h5>
                                <div
                                    className="mb-4"
                                    style={{
                                        maxHeight: "400px",
                                        overflowY: "auto",
                                    }}
                                >
                                    <MaterialReactTable
                                        columns={columns}
                                        data={detalles}
                                        localization={MRT_Localization_ES}
                                        enableColumnFilters={false}
                                        enableDensityToggle={false}
                                        enableFullScreenToggle={false}
                                        enableColumnActions={false}
                                        enableHiding={false}
                                        enableStickyHeader
                                        enableStickyFooter
                                        initialState={{
                                            density: "compact",
                                            pagination: { pageSize: 50 },
                                            columnPinning: {
                                                left: [],
                                                right: [
                                                    "descripcion",
                                                    "acciones",
                                                ],
                                            },
                                        }}
                                        muiTableBodyRowProps={({ row }) => ({
                                            onClick: () =>
                                                handleRowClick(row.original),
                                            sx: {
                                                cursor: "pointer",
                                                backgroundColor:
                                                    detalleSeleccionado ===
                                                    row.original
                                                        ? "#e8f1ff"
                                                        : "white",
                                                borderLeft:
                                                    detalleSeleccionado ===
                                                    row.original
                                                        ? "4px solid #0d6efd"
                                                        : "4px solid transparent",
                                            },
                                        })}
                                        muiTableContainerProps={{
                                            sx: {
                                                borderRadius: "8px",
                                                boxShadow:
                                                    "0 0 6px rgba(0,0,0,0.15)",
                                            },
                                        }}
                                        renderTopToolbarCustomActions={() => (
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    gap: "10px",
                                                    padding: "8px",
                                                }}
                                            >
                                                <Tooltip title="Exportar Excel">
                                                    <IconButton
                                                        color="success"
                                                        onClick={exportarExcel}
                                                    >
                                                        <FileDownloadIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        )}
                                    />
                                </div>

                                {/* Totales y descuento */}
                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <div className="mb-3 d-flex justify-content-start">
                                            <div className="erp-summary-box me-3">
                                                <label>
                                                    Total general (sin
                                                    descuento)
                                                </label>
                                                <input
                                                    type="text"
                                                    name="total_general"
                                                    value={parseFloat(
                                                        cotizacion.total_general ||
                                                            0
                                                    ).toLocaleString("es-GT", {
                                                        style: "currency",
                                                        currency: "GTQ",
                                                    })}
                                                    readOnly
                                                />
                                            </div>
                                        </div>

                                        <div className="card erp-discount-card">
                                            <div className="card-body p-3">
                                                <label className="form-label mb-2">
                                                    Método de descuento
                                                </label>
                                                <select
                                                    className="form-select form-select-sm mb-3"
                                                    value={modoDescuento}
                                                    onChange={(e) =>
                                                        setModoDescuento(
                                                            e.target.value
                                                        )
                                                    }
                                                >
                                                    <option value="NO APLICA">
                                                        NO APLICA
                                                    </option>
                                                    <option value="PORCENTAJE">
                                                        PORCENTAJE
                                                    </option>
                                                    <option value="MONTO">
                                                        MONTO
                                                    </option>
                                                </select>

                                                <div className="row g-2">
                                                    <div className="col-md-6">
                                                        <label className="form-label">
                                                            Descuento (%)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            name="descuento_porcentaje"
                                                            value={
                                                                inputDescuentoPorcentaje
                                                            }
                                                            onChange={(e) =>
                                                                setInputDescuentoPorcentaje(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            onBlur={
                                                                handleDescuentoPorcentajeChange
                                                            }
                                                            className="form-control form-control-sm"
                                                            step="0.01"
                                                            min="0"
                                                            max="100"
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label">
                                                            Descuento monto
                                                        </label>
                                                        <input
                                                            type="number"
                                                            name="descuento_monto"
                                                            value={
                                                                inputDescuentoMonto
                                                            }
                                                            onChange={(e) =>
                                                                setInputDescuentoMonto(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            onBlur={
                                                                handleDescuentoMontoChange
                                                            }
                                                            className="form-control form-control-sm"
                                                            step="0.01"
                                                            min="0"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-text small mt-1">
                                                    El descuento se reparte en
                                                    todos los renglones según el
                                                    método seleccionado.
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Resumen de subtotal / IVA / total */}
                                    <div className="col-md-6 d-flex flex-column justify-content-between">
                                        <div className="row g-2 mb-2">
                                            <div className="col-md-4">
                                                <label className="form-label">
                                                    Subtotal
                                                </label>
                                                <input
                                                    type="text"
                                                    name="subtotal"
                                                    value={parseFloat(
                                                        cotizacion.subtotal || 0
                                                    ).toFixed(2)}
                                                    readOnly
                                                    className="form-control form-control-sm"
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label">
                                                    IVA
                                                </label>
                                                <input
                                                    type="text"
                                                    name="impuesto_iva"
                                                    value={parseFloat(
                                                        cotizacion.impuesto_iva ||
                                                            0
                                                    ).toFixed(2)}
                                                    readOnly
                                                    className="form-control form-control-sm"
                                                />
                                            </div>
                                            <div className="col-md-4 d-flex align-items-end">
                                                <div className="erp-summary-box erp-summary-box-main w-100">
                                                    <label>Total</label>
                                                    <input
                                                        type="text"
                                                        name="total"
                                                        value={parseFloat(
                                                            cotizacion.total ||
                                                                0
                                                        ).toLocaleString(
                                                            "es-GT",
                                                            {
                                                                style: "currency",
                                                                currency: "GTQ",
                                                            }
                                                        )}
                                                        readOnly
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* --- Sección Observaciones --- */}
                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">
                                            Observaciones cliente
                                        </label>
                                        <textarea
                                            rows="3"
                                            name="observaciones_cliente"
                                            value={
                                                cotizacion.observaciones_cliente
                                            }
                                            onChange={handleChange}
                                            placeholder="Observaciones visibles para el cliente en la cotización"
                                            className="form-control form-control-sm"
                                        ></textarea>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">
                                            Observaciones costeo (internas)
                                        </label>
                                        <textarea
                                            rows="3"
                                            name="observaciones_costeo"
                                            value={
                                                cotizacion.observaciones_costeo
                                            }
                                            onChange={handleChange}
                                            placeholder="Notas internas para costeo y seguimiento"
                                            className="form-control form-control-sm"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        {/* --- Barra de acciones inferior --- */}
                        <div className="mt-4 p-3 border rounded shadow-sm bg-light erp-footer">
                            <div className="mt-1 action-toolbar">
                                <button
                                    type="submit"
                                    className="btn-action btn-save flex-fill"
                                    disabled={saving}
                                >
                                    <FaSave />{" "}
                                    {saving
                                        ? "GUARDANDO…"
                                        : id
                                        ? "ACTUALIZAR"
                                        : "GUARDAR"}
                                </button>

                                <button
                                    type="button"
                                    className="btn-action btn-clean flex-fill"
                                    onClick={limpiarCampos}
                                >
                                    <FaBroom /> LIMPIAR
                                </button>

                                <Link
                                    to="/cotizaciones/lista"
                                    className="btn-action btn-consult flex-fill"
                                >
                                    <FaSearch /> CONSULTAR
                                </Link>
                            </div>
                        </div>

                        {/* Modales existentes (SIN CAMBIOS) */}
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

                        <ProductoPredefinidoModal
                            isOpen={productoPredefinidoModalIsOpen}
                            onClose={toggleProductoPredefinidoModal}
                            onProductoSeleccionado={
                                handleProductoPredefinidoSeleccionado
                            }
                        />

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
                    </form>

                    {/* Modal TipoPago + Overlay PDF (SIN CAMBIOS DE LÓGICA) */}
                    <TipoPagoModal
                        isOpen={tipoPagoModalOpen}
                        toggle={toggleTipoPagoModal}
                        onTipoPagoCreado={(nuevoTipo) => {
                            setTiposPago((prevTipos) => {
                                const nuevaLista = [...prevTipos, nuevoTipo];
                                nuevaLista.sort((a, b) =>
                                    a.tipo.localeCompare(b.tipo, "es", {
                                        sensitivity: "base",
                                    })
                                );
                                return nuevaLista;
                            });

                            setCotizacion((prev) => ({
                                ...prev,
                                idtipopago: nuevoTipo.idtipopago,
                            }));
                        }}
                        tiposExistentes={tiposPago}
                    />

                    {pdfData && (
                        <div className="pdf-overlay-erp">
                            <div className="pdf-container-erp">
                                <PDFViewer width="100%" height="100%">
                                    <CotizacionPDF
                                        cotizacion={pdfData.cotizacion}
                                        totalEnLetras={pdfData.totalEnLetras}
                                        logoSrc="/images/LogoGP.jpg"
                                    />
                                </PDFViewer>
                            </div>

                            <div className="mt-3 d-flex gap-2">
                                <PDFDownloadLink
                                    document={
                                        <CotizacionPDF
                                            cotizacion={pdfData.cotizacion}
                                            totalEnLetras={
                                                pdfData.totalEnLetras
                                            }
                                            logoSrc="/images/LogoGP.jpg"
                                        />
                                    }
                                    fileName={`COTIZACION-${pdfData.cotizacion.nocotizacion}.pdf`}
                                    className="btn btn-primary"
                                >
                                    {({ loading }) =>
                                        loading
                                            ? "Preparando PDF..."
                                            : "Descargar PDF"
                                    }
                                </PDFDownloadLink>

                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setPdfData(null);
                                        navigate("/cotizaciones/lista");
                                    }}
                                >
                                    Ir a la lista
                                </button>
                                <button
                                    className="btn btn-outline-danger"
                                    onClick={() => setPdfData(null)}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CotizacionForm;
