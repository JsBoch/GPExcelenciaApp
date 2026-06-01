import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";
import { useParams, useNavigate } from "react-router-dom";

import Header from "./Header";
import "../../css/pedido_produccion.css";
import "../../css/pedido_produccion_moderno.css";

import PedidoProduccionForm from "./pedidosproduccion/PedidoProduccionForm";
import PedidoProduccionActions from "./pedidosproduccion/PedidoProduccionActions";
import CotizacionSelectorModal from "./pedidosproduccion/CotizacionSelectorModal";
import ContactoClienteModal from "./pedidosproduccion/ContactoClienteModal";
import ImagenDetalleModal from "./pedidosproduccion/ImagenDetalleModal";
import { pedidoProduccionService } from "./pedidosproduccion/services/pedidoProduccionService";
import CotizacionDetalleModal from "./pedidosproduccion/CotizacionDetalleModal";
import AsignarAreasPedidoModal from "./pedidosproduccion/AsignarAreasPedidoModal";
import NotaEnvioModal from "./NotaEnvioModal";
import NotaEnvioPDF from "./NotaEnvioPDF";
import NotaEnvioPDFHalf from "./NotaEnvioPDFHalf";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import LogisticaPedidoPanel from "./pedidosproduccion/LogisticaPedidoPanel";
import AdjuntarArchivosModal from "./pedidosproduccion/AdjuntarArchivosModal";

const pedidoInicial = {
    idpedidoproduccion: 0,
    idcotizacion: 0,
    no_envio_asociado: "",
    idpedidoproduccionoriginal: 0,
    idcliente: "",
    cliente: "",
    idcontacto: 0,
    contacto: "",
    fecha_pedido: "",
    fecha_entrega: "",
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
    permisos_estado: "",
    permisos_justificacion: "",
    requiere_instalacion: "N",
    requiere_entrega: "N",
    montajes_estado: "",
    montajes_justificacion: "",
};

export default function PedidoProduccion() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [fechaActual, setFechaActual] = useState("");
    const [unidadesMedida, setUnidadesMedida] = useState([]);
    const [contactos, setContactos] = useState([]);
    const [clienteId, setClienteId] = useState("");
    const [detalles, setDetalles] = useState([]);
    const [clienteOptions, setClienteOptions] = useState([]);

    const [pedidoProduccion, setPedidoProduccion] = useState(pedidoInicial);

    const [contactoModalIsOpen, setContactoModalIsOpen] = useState(false);
    const [cotizacionModalIsOpen, setCotizacionModalIsOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);

    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [estadoCotizacion, setEstadoCotizacion] = useState(1);
    const [cotizaciones, setCotizaciones] = useState([]);
    const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
    const [detalleCotizacion, setDetalleCotizacion] = useState([]);
    const [detalleCotizacionModal, setDetalleCotizacionModal] = useState(false);
    const [maquinasProduccion, setMaquinasProduccion] = useState([]);

    const [areasTrabajo, setAreasTrabajo] = useState([]);
    const [areasSeleccionadas, setAreasSeleccionadas] = useState([]);
    const [modalAreasOpen, setModalAreasOpen] = useState(false);
    const [fechaProgramacion, setFechaProgramacion] = useState("");

    const [resumenEnvios, setResumenEnvios] = useState([]);
    const [tieneNotaEnvio, setTieneNotaEnvio] = useState(false);
    const [envioSeleccionado, setEnvioSeleccionado] = useState("");
    const [showNotaEnvioModal, setShowNotaEnvioModal] = useState(false);
    const [notaEnvioPayload, setNotaEnvioPayload] = useState(null);
    const itemsNotaEnvio = notaEnvioPayload?.items ?? [];
    const useHalfLetter = itemsNotaEnvio.length <= 8;
    const PdfComponent = useHalfLetter ? NotaEnvioPDFHalf : NotaEnvioPDF;

    const [modalAdjuntosOpen, setModalAdjuntosOpen] = useState(false);
    const [adjuntosPermisos, setAdjuntosPermisos] = useState([]);
    const [adjuntosEliminados, setAdjuntosEliminados] = useState([]);

    const [modalMontajesOpen, setModalMontajesOpen] = useState(false);
    const [adjuntosMontajes, setAdjuntosMontajes] = useState([]);
    const [montajesEliminados, setMontajesEliminados] = useState([]);

    const toggleContactoModal = () => setContactoModalIsOpen((prev) => !prev);
    const toggleImageModal = () => setIsImageModalOpen((prev) => !prev);
    const toggleAreasModal = () => {
        if (!modalAreasOpen) {
            setFechaProgramacion(fechaActual);
        }

        setModalAreasOpen((prev) => !prev);
    };

    const toggleDetalleCotizacionModal = () =>
        setDetalleCotizacionModal((prev) => !prev);

    const toggleCotizacionModal = () => {
        if (!cotizacionModalIsOpen && fechaActual) {
            setFechaInicio(fechaActual);
            setFechaFin(fechaActual);
        }

        setCotizacionModalIsOpen((prev) => !prev);
    };

    useEffect(() => {
        cargarInicial();
    }, []);

    useEffect(() => {
        if (id) {
            cargarPedido(id);
        }
    }, [id]);

    useEffect(() => {
        if (!id && fechaActual) {
            setPedidoProduccion((prev) => ({
                ...prev,
                fecha_pedido: fechaActual,
                fecha_entrega: fechaActual,
            }));
        }
    }, [fechaActual, id]);

    useEffect(() => {
        setPedidoProduccion((prev) => ({
            ...prev,
            no_envio_asociado: envioSeleccionado || "",
        }));
    }, [envioSeleccionado]);

    const cargarInicial = async () => {
        try {
            const [fechaRes, unidadesRes, clientesRes, maquinasRes, areasRes] =
                await Promise.all([
                    pedidoProduccionService.getFechaServidor(),
                    pedidoProduccionService.getUnidadesMedida(),
                    pedidoProduccionService.getClientes(),
                    pedidoProduccionService.getMaquinasProduccion(),
                    pedidoProduccionService.getAreasTrabajo(),
                ]);

            setMaquinasProduccion(maquinasRes.data);
            setAreasTrabajo(areasRes.data);

            const fechaServidor = fechaRes.data.fecha;

            setFechaActual(fechaServidor);
            setFechaInicio(fechaServidor);
            setFechaFin(fechaServidor);
            setFechaProgramacion(fechaServidor);
            setUnidadesMedida(unidadesRes.data);

            setClienteOptions(
                clientesRes.data.map((cliente) => ({
                    value: cliente.idcliente,
                    label: cliente.nombre,
                })),
            );
        } catch (error) {
            console.error("Error al cargar datos iniciales:", error);

            const localDate = new Date().toISOString().split("T")[0];
            setFechaActual(localDate);
            setFechaInicio(localDate);
            setFechaFin(localDate);

            alertify.error("Error al cargar datos iniciales");
        }
    };

    const cargarPedido = async (idPedido) => {
        try {
            const res = await pedidoProduccionService.getPedido(idPedido);
            const data = res.data;

            const fechaPedido = data.fecha_pedido
                ? data.fecha_pedido.split(" ")[0]
                : fechaActual;

            const fechaEntrega = data.fecha_entrega
                ? data.fecha_entrega.split(" ")[0]
                : fechaActual;

            setPedidoProduccion({
                ...pedidoInicial,
                idpedidoproduccionoriginal:
                    data.idpedidoproduccionoriginal || 0,
                idpedidoproduccion: data.idpedidoproduccion || 0,
                idcliente: data.idcliente || "",
                cliente: data.cliente || "",
                idcontacto: data.idcontacto || 0,
                contacto: data.contacto || "",
                fecha_pedido: fechaPedido,
                fecha_entrega: fechaEntrega,
                trabajo: data.trabajo || "",
                observaciones_costeo: data.observaciones_costeo || "",
                observaciones_cliente: data.observaciones_cliente || "",
                total_general: data.total_general || 0,
                costeo_observaciones: data.costeo_observaciones || "",
                idcotizacion: data.idcotizacion || 0,
                nocotizacion: data.nocotizacion || "",
                version: data.version || 1,
                idtipopago: data.idtipopago || "",
                direccion_entrega: data.direccion_entrega || "",
                costear: data.costear || "N",
                no_envio_asociado: data.no_envio_asociado || "",
                permisos_estado: data.permisos_estado || "",
                permisos_justificacion: data.permisos_justificacion || "",
                requiere_instalacion: data.requiere_instalacion || "N",
                requiere_entrega: data.requiere_entrega || "N",
                montajes_estado: data.montajes_estado || "",
                montajes_justificacion: data.montajes_justificacion || "",
            });

            if (data.idcliente) {
                setClienteId(data.idcliente);
                const contactosRes = await pedidoProduccionService.getContactos(
                    data.idcliente,
                );
                setContactos(contactosRes.data);
            }

            if (data.detalles) {
                const detallesNormalizados = data.detalles.map((d) => ({
                    ...d,
                    maquinas: d.maquinas || [],
                }));

                setDetalles(detallesNormalizados);
            }

            if (data.areas) {
                setAreasSeleccionadas(
                    data.areas.map((a) => Number(a.id_areatrabajo)),
                );

                if (data.areas.length > 0) {
                    setFechaProgramacion(data.areas[0].fecha_programada);
                }
            }

            if (data.idcotizacion) {
                await cargarResumenEnvios(
                    data.idcotizacion,
                    data.no_envio_asociado || "",
                );
            }

            setAdjuntosPermisos(data.adjuntos_permisos || []);
            setAdjuntosMontajes(data.adjuntos_montajes || []);
            setAdjuntosEliminados([]);
            setMontajesEliminados([]);
        } catch (error) {
            console.error("Error al cargar pedido:", error);
            alertify.error("Error al cargar pedido");
        }
    };

    const cargarContactos = async (idcliente) => {
        if (!idcliente) {
            setContactos([]);
            return;
        }

        try {
            const res = await pedidoProduccionService.getContactos(idcliente);
            setContactos(res.data);
        } catch (error) {
            console.error("Error al cargar contactos:", error);
            alertify.error("Error al cargar contactos");
        }
    };

    const cargarResumenEnvios = async (idCotizacion, envioPreferido = "") => {
        if (!idCotizacion) {
            setResumenEnvios([]);
            setTieneNotaEnvio(false);
            setEnvioSeleccionado("");
            return;
        }

        try {
            const res =
                await pedidoProduccionService.getResumenEnvios(idCotizacion);

            const envios = res.data.envios || [];

            setResumenEnvios(envios);
            setTieneNotaEnvio(res.data.tiene_envios);

            if (envios.length > 0) {
                const existePreferido = envios.some(
                    (e) => Number(e.no_envio) === Number(envioPreferido),
                );

                setEnvioSeleccionado(
                    existePreferido ? envioPreferido : envios[0].no_envio,
                );
            } else {
                setEnvioSeleccionado("");
            }
        } catch (error) {
            console.error("Error al consultar resumen de envíos:", error);
            alertify.error("No se pudo consultar la nota de envío.");
        }
    };

    const handleClienteChange = async (selectedOption) => {
        const nuevoClienteId = selectedOption?.value || "";

        setClienteId(nuevoClienteId);

        setPedidoProduccion((prev) => ({
            ...prev,
            idcliente: nuevoClienteId,
            idcontacto: "",
        }));

        await cargarContactos(nuevoClienteId);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setPedidoProduccion((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleBuscarCotizaciones = async () => {
        if (!fechaInicio || !fechaFin) {
            alertify.error("Debe seleccionar ambas fechas");
            return;
        }

        try {
            const response = await pedidoProduccionService.buscarCotizaciones({
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                estado: estadoCotizacion,
            });

            setCotizaciones(response.data);
        } catch (error) {
            console.error("Error al obtener cotizaciones:", error);
            alertify.error("Error al consultar cotizaciones");
        }
    };

    const handleBuscarCotizacionPorNumero = async () => {
        if (!pedidoProduccion.nocotizacion?.trim()) {
            return;
        }

        try {
            const response =
                await pedidoProduccionService.buscarCotizacionPorNumero(
                    pedidoProduccion.nocotizacion,
                );

            await handleSeleccionarCotizacion(response.data, false);
        } catch (error) {
            console.error("Error al buscar cotización:", error);

            if (error.response?.status === 404) {
                alertify.warning("Cotización no encontrada");
                return;
            }

            alertify.error("Error al buscar cotización");
        }
    };

    const handleCotizacionKeyDown = async (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            await handleBuscarCotizacionPorNumero();
        }
    };

    const handleSeleccionarCotizacion = async (cot, manejarModal = true) => {
        try {
            setCotizacionSeleccionada(cot);
            setClienteId(cot.idcliente);

            const contactosRes = await pedidoProduccionService.getContactos(
                cot.idcliente,
            );

            setContactos(contactosRes.data);

            setPedidoProduccion((prev) => ({
                ...prev,
                idcotizacion: cot.idcotizacion,
                nocotizacion: cot.numero_cotizacion,
                no_envio_asociado: "",
                idcliente: cot.idcliente,
                cliente: cot.cliente,
                idcontacto: cot.idcontacto || 0,
                contacto: cot.contacto || "",
                trabajo: cot.trabajo || "",
                direccion_entrega: cot.direccion_entrega || "",
                observaciones_cliente: cot.observaciones_cliente || "",
                total_general: cot.total || 0,
            }));

            await cargarResumenEnvios(cot.idcotizacion);

            if (manejarModal) {
                toggleCotizacionModal();
            }
            alertify.success("Cotización seleccionada correctamente");
        } catch (error) {
            console.error("Error al cargar cotización:", error);
            alertify.error("Error al cargar cotización");
        }
    };

    const handleVerDetalleCotizacion = async () => {
        if (!pedidoProduccion.idcotizacion) {
            alertify.alert(
                "Cotización requerida",
                `
                <div style="
                    font-size:15px;
                    padding:10px;
                    text-align:center;
                ">
                    Debe seleccionar una cotización primero.
                </div>
            `,
            );

            return;
        }

        try {
            const response = await pedidoProduccionService.getDetalleCotizacion(
                pedidoProduccion.idcotizacion,
            );

            setDetalleCotizacion(response.data);

            setDetalleCotizacionModal(true);
        } catch (error) {
            console.error("Error al obtener detalle cotización:", error);

            alertify.error("Error al obtener detalle de cotización");
        }
    };

    const handleVerImagenCotizacion = (imagen) => {
        if (!imagen) {
            alertify.warning("La imagen no existe");
            return;
        }

        setSelectedImageUrl(`data:image/jpeg;base64,${imagen}`);

        setIsImageModalOpen(true);
    };

    const handleAgregarContacto = () => {
        if (!pedidoProduccion.idcliente) {
            alertify.error(
                "Debe seleccionar un cliente antes de agregar un contacto.",
            );
            return;
        }

        toggleContactoModal();
    };

    const limpiarCampos = () => {
        setPedidoProduccion({
            ...pedidoInicial,
            fecha_pedido: fechaActual,
            fecha_entrega: fechaActual,
        });

        setClienteId("");
        setContactos([]);
        setDetalles([]);
        setCotizacionSeleccionada(null);
        setAreasSeleccionadas([]);
        setFechaProgramacion(fechaActual);
        setResumenEnvios([]);
        setTieneNotaEnvio(false);
        setEnvioSeleccionado("");
        setNotaEnvioPayload(null);
        setShowNotaEnvioModal(false);
        setAdjuntosPermisos([]);
        setAdjuntosEliminados([]);
        setModalAdjuntosOpen(false);
        setAdjuntosMontajes([]);
        setMontajesEliminados([]);
        setModalMontajesOpen(false);
    };

    const buildFormData = () => {
        const formData = new FormData();

        formData.append("idcotizacion", pedidoProduccion.idcotizacion || 0);
        formData.append("no_envio_asociado", envioSeleccionado || "");
        formData.append(
            "permisos_estado",
            pedidoProduccion.permisos_estado || "",
        );
        formData.append(
            "permisos_justificacion",
            pedidoProduccion.permisos_justificacion || "",
        );
        formData.append("nocotizacion", pedidoProduccion.nocotizacion || "");
        formData.append("idcliente", pedidoProduccion.idcliente);
        formData.append("idcontacto", pedidoProduccion.idcontacto || 0);
        formData.append("idtipopago", pedidoProduccion.idtipopago || "");
        formData.append("fecha_pedido", pedidoProduccion.fecha_pedido);
        formData.append("fecha_entrega", pedidoProduccion.fecha_entrega);
        formData.append("trabajo", pedidoProduccion.trabajo || "");
        formData.append(
            "observaciones_costeo",
            pedidoProduccion.observaciones_costeo || "",
        );
        formData.append(
            "observaciones_cliente",
            pedidoProduccion.observaciones_cliente || "",
        );
        formData.append(
            "direccion_entrega",
            pedidoProduccion.direccion_entrega || "",
        );
        formData.append("costear", pedidoProduccion.costear || "N");
        formData.append("estado", "1");
        formData.append(
            "idpedidoproduccionoriginal",
            pedidoProduccion.idpedidoproduccionoriginal || 0,
        );
        formData.append("version", pedidoProduccion.version || 1);
        formData.append("total_general", pedidoProduccion.total_general || 0);
        formData.append(
            "fecha_programada",
            fechaProgramacion || pedidoProduccion.fecha_entrega,
        );

        areasSeleccionadas.forEach((idArea, index) => {
            formData.append(`areas[${index}]`, idArea);
        });

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
            // formData.append(
            //     `detalles[${index}][galaxy_plus]`,
            //     detalle.galaxy_plus ? 1 : 0,
            // );
            // formData.append(`detalles[${index}][uv]`, detalle.uv ? 1 : 0);
            // formData.append(`detalles[${index}][cnc]`, detalle.cnc ? 1 : 0);
            // formData.append(`detalles[${index}][laser]`, detalle.laser ? 1 : 0);
            // formData.append(`detalles[${index}][summa]`, detalle.summa ? 1 : 0);
            detalle.maquinas?.forEach((maq, maqIndex) => {
                formData.append(
                    `detalles[${index}][maquinas][${maqIndex}]`,
                    Number(maq),
                );
            });

            formData.append(`detalles[${index}][ancho]`, detalle.ancho ?? "");
            formData.append(`detalles[${index}][alto]`, detalle.alto ?? "");
            formData.append(
                `detalles[${index}][version]`,
                detalle.version ?? "",
            );

            if (detalle.imagen instanceof File) {
                formData.append(`detalles[${index}][imagen]`, detalle.imagen);
            } else if (detalle.imagen_ruta) {
                formData.append(
                    `detalles[${index}][imagen_ruta]`,
                    detalle.imagen_ruta,
                );
            }
        });

        // console.log("========= FORMDATA =========");

        // for (const pair of formData.entries()) {
        //     console.log(pair[0], pair[1]);
        // }

        // console.log("============================");

        adjuntosPermisos.forEach((adjunto, index) => {
            if (adjunto.file instanceof File) {
                formData.append(`adjuntos_permisos[${index}]`, adjunto.file);
            }
        });

        adjuntosEliminados.forEach((idadjunto, index) => {
            formData.append(`adjuntos_eliminados[${index}]`, idadjunto);
        });

        adjuntosMontajes.forEach((adjunto, index) => {
            if (adjunto.file instanceof File) {
                formData.append(`adjuntos_montajes[${index}]`, adjunto.file);
            }
        });

        montajesEliminados.forEach((idarchivo, index) => {
            formData.append(`montajes_eliminados[${index}]`, idarchivo);
        });

        formData.append(
            "requiere_instalacion",
            pedidoProduccion.requiere_instalacion || "N",
        );

        formData.append(
            "requiere_entrega",
            pedidoProduccion.requiere_entrega || "N",
        );

        formData.append(
            "montajes_estado",
            pedidoProduccion.montajes_estado || "",
        );

        formData.append(
            "montajes_justificacion",
            pedidoProduccion.montajes_justificacion || "",
        );

        return formData;
    };

    const handleReimprimirNotaEnvio = async () => {
        if (!pedidoProduccion.idcotizacion) {
            alertify.alert(
                "Cotización requerida",
                "Debe seleccionar una cotización.",
            );
            return;
        }

        if (!envioSeleccionado) {
            alertify.alert(
                "Nota requerida",
                "Debe seleccionar una nota de envío.",
            );
            return;
        }

        try {
            const { data } = await pedidoProduccionService.reimprimirNotaEnvio(
                pedidoProduccion.idcotizacion,
                envioSeleccionado,
            );

            setNotaEnvioPayload(data);
        } catch (error) {
            console.error("Error al reimprimir nota:", error);
            alertify.error("No se pudo generar el PDF de la nota de envío.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!pedidoProduccion.idcliente) {
            alertify.alert("CAMPO OBLIGATORIO", "Debe seleccionar un cliente.");
            return;
        }

        if (!detalles || detalles.length === 0) {
            alertify.alert(
                "CAMPO OBLIGATORIO",
                "Debe asignar registros en el detalle del pedido.",
            );
            return;
        }

        if (!pedidoProduccion.direccion_entrega?.trim()) {
            alertify.alert(
                "CAMPO OBLIGATORIO",
                "Debe ingresar la dirección de entrega.",
            );
            return;
        }

        if (!pedidoProduccion.idcotizacion) {
            alertify.alert(
                "CAMPO OBLIGATORIO",
                "Debe asociar una cotización al pedido.",
            );
            return;
        }

        if (!areasSeleccionadas || areasSeleccionadas.length === 0) {
            alertify.alert(
                "CAMPO OBLIGATORIO",
                "Debe asignar al menos un área de trabajo.",
            );
            return;
        }

        if (!tieneNotaEnvio) {
            alertify.alert(
                "CAMPO OBLIGATORIO",
                "Debe registrar una nota de envío antes de guardar el pedido.",
            );
            return;
        }

        if (!envioSeleccionado) {
            alertify.alert(
                "CAMPO OBLIGATORIO",
                "Debe seleccionar la nota de envío asociada al pedido.",
            );
            return;
        }

        const permisosEstado = pedidoProduccion.permisos_estado;

        if (!permisosEstado) {
            alertify.alert(
                "PERMISOS REQUERIDOS",
                "Debe adjuntar los permisos o marcarlos como pendientes con justificación.",
            );
            return;
        }

        const adjuntosActivos = adjuntosPermisos.filter((a) => !a._deleted);

        if (permisosEstado === "ADJUNTADO" && adjuntosActivos.length === 0) {
            alertify.alert(
                "PERMISOS REQUERIDOS",
                "Debe adjuntar al menos un permiso en PDF o imagen.",
            );
            return;
        }

        if (
            ["PENDIENTE", "NO_REQUIERE"].includes(permisosEstado) &&
            !pedidoProduccion.permisos_justificacion?.trim()
        ) {
            alertify.alert(
                "JUSTIFICACIÓN REQUERIDA",
                "Debe escribir una justificación para dejar los permisos pendientes.",
            );
            return;
        }

        if (!pedidoProduccion.requiere_instalacion) {
            alertify.alert(
                "INSTALACIÓN REQUERIDA",
                "Debe indicar si el pedido requiere instalación.",
            );
            return;
        }

        if (!pedidoProduccion.requiere_entrega) {
            alertify.alert(
                "ENTREGA REQUERIDA",
                "Debe indicar si el pedido requiere entrega.",
            );
            return;
        }

        if (pedidoProduccion.requiere_instalacion === "S") {
            if (!pedidoProduccion.montajes_estado) {
                alertify.alert(
                    "MONTAJES REQUERIDOS",
                    "Debe adjuntar los montajes o marcarlos como pendientes con justificación.",
                );
                return;
            }

            const montajesActivos = adjuntosMontajes.filter((a) => !a._deleted);

            if (
                pedidoProduccion.montajes_estado === "ADJUNTADO" &&
                montajesActivos.length === 0
            ) {
                alertify.alert(
                    "MONTAJES REQUERIDOS",
                    "Debe adjuntar al menos un montaje en PDF o imagen.",
                );
                return;
            }

            if (
                pedidoProduccion.montajes_estado === "PENDIENTE" &&
                !pedidoProduccion.montajes_justificacion?.trim()
            ) {
                alertify.alert(
                    "JUSTIFICACIÓN REQUERIDA",
                    "Debe escribir una justificación para dejar los montajes pendientes.",
                );
                return;
            }
        }

        try {
            const formData = buildFormData();

            console.log(
    "DETALLES ENVIADOS",
    JSON.stringify(detalles, null, 2)
);

            if (id) {
                await pedidoProduccionService.actualizarPedido(id, formData);
                alertify.success("Pedido actualizado correctamente");
                navigate("/pedidosproduccion/crear");
            } else {
                await pedidoProduccionService.crearPedido(formData);
                alertify.success("Pedido creado correctamente");
            }

            limpiarCampos();
        } catch (error) {
            console.error("Error al guardar el pedido:", error);
            alertify.error("Error al guardar el pedido");
        }
    };

    const handleContactCreated = async () => {
        await cargarContactos(clienteId);
    };

    return (
        <>
            <div className="mt-4 mb-4 pp-container">
                <Header
                    title={
                        id
                            ? "Editar Pedido a Producción"
                            : "Crear Nuevo Pedido a Producción"
                    }
                />

                <div className="card pp-card">
                    <div className="card-body card-form pp-card-body">
                        <form
                            onSubmit={handleSubmit}
                            encType="multipart/form-data"
                        >
                            <PedidoProduccionForm
                                pedidoProduccion={pedidoProduccion}
                                clienteOptions={clienteOptions}
                                contactos={contactos}
                                clienteId={clienteId}
                                detalles={detalles}
                                setDetalles={setDetalles}
                                unidadesMedida={unidadesMedida}
                                maquinasProduccion={maquinasProduccion}
                                handleClienteChange={handleClienteChange}
                                handleChange={handleChange}
                                handleAgregarContacto={handleAgregarContacto}
                                toggleCotizacionModal={toggleCotizacionModal}
                                handleVerDetalleCotizacion={
                                    handleVerDetalleCotizacion
                                }
                                handleBuscarCotizacionPorNumero={
                                    handleBuscarCotizacionPorNumero
                                }
                                handleCotizacionKeyDown={
                                    handleCotizacionKeyDown
                                }
                            />

                            <LogisticaPedidoPanel
                                idCotizacion={pedidoProduccion.idcotizacion}
                                areasSeleccionadas={areasSeleccionadas}
                                toggleAreasModal={toggleAreasModal}
                                resumenEnvios={resumenEnvios}
                                tieneNotaEnvio={tieneNotaEnvio}
                                envioSeleccionado={envioSeleccionado}
                                setEnvioSeleccionado={setEnvioSeleccionado}
                                onRegistrarNotaEnvio={() => {
                                    if (!pedidoProduccion.idcotizacion) {
                                        alertify.alert(
                                            "Cotización requerida",
                                            "Debe seleccionar una cotización antes de registrar nota de envío.",
                                        );
                                        return;
                                    }

                                    setShowNotaEnvioModal(true);
                                }}
                                onReimprimirNotaEnvio={
                                    handleReimprimirNotaEnvio
                                }
                                permisosEstado={
                                    pedidoProduccion.permisos_estado
                                }
                                permisosJustificacion={
                                    pedidoProduccion.permisos_justificacion
                                }
                                setPedidoProduccion={setPedidoProduccion}
                                adjuntosPermisos={adjuntosPermisos}
                                onAdjuntarPermisos={() =>
                                    setModalAdjuntosOpen(true)
                                }
                                requiereInstalacion={
                                    pedidoProduccion.requiere_instalacion
                                }
                                requiereEntrega={
                                    pedidoProduccion.requiere_entrega
                                }
                                montajesEstado={
                                    pedidoProduccion.montajes_estado
                                }
                                montajesJustificacion={
                                    pedidoProduccion.montajes_justificacion
                                }
                                adjuntosMontajes={adjuntosMontajes}
                                onAdjuntarMontajes={() =>
                                    setModalMontajesOpen(true)
                                }
                            />

                            <PedidoProduccionActions
                                id={id}
                                limpiarCampos={limpiarCampos}
                            />

                            <ContactoClienteModal
                                isOpen={contactoModalIsOpen}
                                toggle={toggleContactoModal}
                                clienteId={clienteId}
                                onContactCreated={handleContactCreated}
                            />

                            <ImagenDetalleModal
                                isOpen={isImageModalOpen}
                                toggle={toggleImageModal}
                                selectedImageUrl={selectedImageUrl}
                            />

                            <CotizacionDetalleModal
                                isOpen={detalleCotizacionModal}
                                toggle={toggleDetalleCotizacionModal}
                                detalles={detalleCotizacion}
                                onVerImagen={handleVerImagenCotizacion}
                            />

                            <CotizacionSelectorModal
                                isOpen={cotizacionModalIsOpen}
                                toggle={toggleCotizacionModal}
                                fechaInicio={fechaInicio}
                                setFechaInicio={setFechaInicio}
                                fechaFin={fechaFin}
                                setFechaFin={setFechaFin}
                                estadoCotizacion={estadoCotizacion}
                                setEstadoCotizacion={setEstadoCotizacion}
                                cotizaciones={cotizaciones}
                                onBuscar={handleBuscarCotizaciones}
                                onSeleccionar={handleSeleccionarCotizacion}
                            />

                            <AsignarAreasPedidoModal
                                isOpen={modalAreasOpen}
                                toggle={toggleAreasModal}
                                areasTrabajo={areasTrabajo}
                                areasSeleccionadas={areasSeleccionadas}
                                setAreasSeleccionadas={setAreasSeleccionadas}
                                fechaProgramacion={fechaProgramacion}
                            />

                            <AdjuntarArchivosModal
                                isOpen={modalAdjuntosOpen}
                                toggle={() =>
                                    setModalAdjuntosOpen((prev) => !prev)
                                }
                                titulo="Adjuntar permisos"
                                descripcion="Adjunte los permisos escritos para realizar instalación o entrega."
                                adjuntos={adjuntosPermisos}
                                setAdjuntos={setAdjuntosPermisos}
                                eliminados={adjuntosEliminados}
                                setEliminados={setAdjuntosEliminados}
                            />

                            <AdjuntarArchivosModal
                                isOpen={modalMontajesOpen}
                                toggle={() =>
                                    setModalMontajesOpen((prev) => !prev)
                                }
                                titulo="Adjuntar montajes"
                                descripcion="Adjunte los montajes, artes, referencias o documentos necesarios para instalación."
                                adjuntos={adjuntosMontajes}
                                setAdjuntos={setAdjuntosMontajes}
                                eliminados={montajesEliminados}
                                setEliminados={setMontajesEliminados}
                            />

                            {showNotaEnvioModal &&
                                pedidoProduccion.idcotizacion && (
                                    <NotaEnvioModal
                                        idCotizacion={
                                            pedidoProduccion.idcotizacion
                                        }
                                        open={showNotaEnvioModal}
                                        onClose={() =>
                                            setShowNotaEnvioModal(false)
                                        }
                                        onPdfReady={async (data) => {
                                            setNotaEnvioPayload(data);
                                            await cargarResumenEnvios(
                                                pedidoProduccion.idcotizacion,
                                                data?.no_envio || "",
                                            );
                                        }}
                                        direccionSugerida={
                                            pedidoProduccion.direccion_entrega ||
                                            ""
                                        }
                                    />
                                )}
                        </form>
                    </div>
                </div>
            </div>
            {notaEnvioPayload && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                    }}
                >
                    <div style={{ width: "80%", height: "80%" }}>
                        <PDFViewer width="100%" height="100%">
                            <PdfComponent data={notaEnvioPayload} />
                        </PDFViewer>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                        <PDFDownloadLink
                            document={<PdfComponent data={notaEnvioPayload} />}
                            fileName={`nota-envio-${notaEnvioPayload.cabecera.nocotizacion}-envio-${notaEnvioPayload.no_envio}.pdf`}
                            className="btn btn-primary"
                        >
                            {({ loading }) =>
                                loading
                                    ? "Generando PDF..."
                                    : "Descargar Nota de Envío"
                            }
                        </PDFDownloadLink>

                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => setNotaEnvioPayload(null)}
                        >
                            Cerrar PDF
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
