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

const pedidoInicial = {
    idpedidoproduccion: 0,
    idcotizacion: 0,
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

    const toggleContactoModal = () => setContactoModalIsOpen((prev) => !prev);
    const toggleImageModal = () => setIsImageModalOpen((prev) => !prev);
    const toggleAreasModal = () => setModalAreasOpen((prev) => !prev);

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
                idcliente: cot.idcliente,
                cliente: cot.cliente,
                idcontacto: cot.idcontacto || 0,
                contacto: cot.contacto || "",
                trabajo: cot.trabajo || "",
                direccion_entrega: cot.direccion_entrega || "",
                observaciones_cliente: cot.observaciones_cliente || "",
                total_general: cot.total || 0,
            }));

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
    };

    const buildFormData = () => {
        const formData = new FormData();

        formData.append("idcotizacion", pedidoProduccion.idcotizacion || 0);
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

        return formData;
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

        try {
            const formData = buildFormData();

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
                    <form onSubmit={handleSubmit} encType="multipart/form-data">
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
                            handleCotizacionKeyDown={handleCotizacionKeyDown}
                        />

                        <PedidoProduccionActions
                            id={id}
                            limpiarCampos={limpiarCampos}
                            toggleAreasModal={toggleAreasModal}
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
                            setFechaProgramacion={setFechaProgramacion}
                        />
                    </form>
                </div>
            </div>
        </div>
    );
}
