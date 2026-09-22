import React, { useMemo, useRef, useState } from "react";

import axios from "axios";
import alertify from "alertifyjs";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import {
    CalendarDays,
    Clock3,
    Route,
    Truck,
    TruckElectric,
    UserRound,
    X,
} from "lucide-react";

import "../../../css/logistica-ventas-calendario.css";

import { PDFDownloadLink } from "@react-pdf/renderer";

import { Download } from "lucide-react";

import HojaRutaLogisticaPDF from "./HojaRutaLogisticaPDF";

function CalendarioLogisticaVentas() {
    const calendarRef = useRef(null);

    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(false);

    const [detalle, setDetalle] = useState(null);
    const [detalleOpen, setDetalleOpen] = useState(false);

    const [modoEdicion, setModoEdicion] = useState(false);
    const [guardandoEdicion, setGuardandoEdicion] = useState(false);

    const [rutas, setRutas] = useState([]);
    const [vehiculos, setVehiculos] = useState([]);
    const [pilotos, setPilotos] = useState([]);

    const [formEdicion, setFormEdicion] = useState({
        idruta: "",
        fecha: "",
        hora_salida: "",
        idvehiculo: "",
        idpiloto: "",
        encargado: "",
        observaciones: "",
    });

    const headers = useMemo(() => {
        const token = localStorage.getItem("token");

        return {
            Authorization: `Bearer ${token}`,
        };
    }, []);

    const [modoEdicionPedidos, setModoEdicionPedidos] = useState(false);

    const [pedidosEdicion, setPedidosEdicion] = useState([]);

    const [guardandoPedidos, setGuardandoPedidos] = useState(false);

    const [agregarPedidosOpen, setAgregarPedidosOpen] = useState(false);

    const [pedidosDisponibles, setPedidosDisponibles] = useState([]);

    const [pedidosAgregar, setPedidosAgregar] = useState([]);

    const [cargandoDisponibles, setCargandoDisponibles] = useState(false);

    const [guardandoAgregarPedidos, setGuardandoAgregarPedidos] =
        useState(false);

    const [pedidoCronogramaOpen, setPedidoCronogramaOpen] = useState(false);

    const [pedidoCronograma, setPedidoCronograma] = useState(null);

    const [guardandoPedidoCronograma, setGuardandoPedidoCronograma] =
        useState(false);

    const [formPedidoCronograma, setFormPedidoCronograma] = useState({
        idruta: "",
        fecha: "",
        hora_salida: "",
        idvehiculo: "",
        idpiloto: "",
        hora_entrega: "",
    });

    const cargarEventos = async (fechaInicio, fechaFin) => {
        setLoading(true);

        try {
            const response = await axios.get(
                "/api/logistica-ventas/cronograma",
                {
                    headers,
                    params: {
                        fecha_inicio: fechaInicio,
                        fecha_fin: fechaFin,
                    },
                },
            );

            const data = Array.isArray(response.data) ? response.data : [];

            const nuevosEventos = data.map((item) => {
                const hora = item.hora_entrega
                    ? String(item.hora_entrega).substring(0, 5)
                    : item.hora_planificada
                      ? String(item.hora_planificada).substring(0, 5)
                      : item.hora_salida
                        ? String(item.hora_salida).substring(0, 5)
                        : "08:00";

                const sinRuta = !item.idprogramacion;

                const coloresRuta = {
                    1: {
                        backgroundColor: "#0e4f84",
                        borderColor: "#0e4f84",
                        textColor: "#ffffff",
                    },

                    2: {
                        backgroundColor: "#39b54a",
                        borderColor: "#39b54a",
                        textColor: "#ffffff",
                    },

                    3: {
                        backgroundColor: "#f59e0b",
                        borderColor: "#f59e0b",
                        textColor: "#ffffff",
                    },

                    4: {
                        backgroundColor: "#7c3aed",
                        borderColor: "#7c3aed",
                        textColor: "#ffffff",
                    },
                };

                const estiloEvento = sinRuta
                    ? {
                          backgroundColor: "#64748b",
                          borderColor: "#475569",
                          textColor: "#ffffff",
                      }
                    : coloresRuta[Number(item.idruta)] || {
                          backgroundColor: "#64748b",
                          borderColor: "#64748b",
                          textColor: "#ffffff",
                      };

                return {
                    id: `pedido-${item.idpedidoproduccion}`,

                    title:
                        `P-${item.nopedido} · ` +
                        `${item.cliente || "SIN CLIENTE"}`,

                    start: `${item.fecha}T${hora}`,

                    backgroundColor: estiloEvento.backgroundColor,

                    borderColor: estiloEvento.borderColor,

                    textColor: estiloEvento.textColor,

                    classNames: sinRuta
                        ? ["gp-logcal-event-sin-ruta"]
                        : ["gp-logcal-event-programado"],

                    extendedProps: {
                        ...item,
                        sinRuta,
                    },
                };
            });

            setEventos(nuevosEventos);
        } catch (error) {
            console.error(error);

            alertify.error("No se pudo cargar el cronograma.");
        } finally {
            setLoading(false);
        }
    };

    const [reprogramacionOpen, setReprogramacionOpen] = useState(false);

    const [pedidoReprogramar, setPedidoReprogramar] = useState(null);

    const [guardandoReprogramacion, setGuardandoReprogramacion] =
        useState(false);

    const [formReprogramacion, setFormReprogramacion] = useState({
        idruta: "",
        fecha: "",
        hora_salida: "",
        idvehiculo: "",
        idpiloto: "",
        encargado: "",
        observaciones_ruta: "",
        hora_entrega: "",
        observaciones_pedido: "",
    });

    const handleDatesSet = (info) => {
        const fechaInicio = info.startStr.substring(0, 10);

        const fechaFinDate = new Date(info.end);

        fechaFinDate.setDate(fechaFinDate.getDate() - 1);

        const fechaFin = fechaFinDate.toISOString().substring(0, 10);

        cargarEventos(fechaInicio, fechaFin);
    };

    // const handleEventClick = async (info) => {
    //     const item = info.event.extendedProps;

    //     /*
    //      * Pedido todavía sin ruta.
    //      * En la siguiente etapa aquí abriremos
    //      * el modal "Asignar a ruta".
    //      */
    //     if (!item.idprogramacion) {
    //         alertify.message(
    //             `P-${item.nopedido} todavía no tiene ruta asignada.`,
    //         );

    //         return;
    //     }

    //     try {
    //         const [responseDetalle] = await Promise.all([
    //             axios.get(
    //                 `/api/logistica-ventas/programaciones/${item.idprogramacion}`,
    //                 {
    //                     headers,
    //                 },
    //             ),
    //             cargarCatalogos(),
    //         ]);

    //         const data = responseDetalle.data;

    //         setDetalle(data);

    //         setPedidosEdicion(
    //             Array.isArray(data.pedidos)
    //                 ? data.pedidos.map((pedido) => ({
    //                       ...pedido,

    //                       hora_entrega: pedido.hora_entrega
    //                           ? String(pedido.hora_entrega).substring(0, 5)
    //                           : "",

    //                       observaciones: pedido.observaciones || "",
    //                   }))
    //                 : [],
    //         );

    //         setModoEdicionPedidos(false);

    //         setFormEdicion({
    //             idruta: data.idruta ? String(data.idruta) : "",

    //             fecha: data.fecha ? String(data.fecha).substring(0, 10) : "",

    //             hora_salida: data.hora_salida
    //                 ? String(data.hora_salida).substring(0, 5)
    //                 : "",

    //             idvehiculo: data.idvehiculo ? String(data.idvehiculo) : "",

    //             idpiloto: data.idpiloto ? String(data.idpiloto) : "",

    //             encargado: data.encargado || "",

    //             observaciones: data.observaciones || "",
    //         });

    //         setModoEdicion(false);
    //         setDetalleOpen(true);
    //     } catch (error) {
    //         console.error(error);

    //         alertify.error("No se pudo cargar el detalle de la ruta.");
    //     }
    // };

    const handleEventClick = async (info) => {
        const item = info.event.extendedProps;

        abrirPedidoCronograma(item);
    };

    const actualizarPedidoEdicion = (id, campo, valor) => {
        setPedidosEdicion((prev) =>
            prev.map((pedido) =>
                Number(pedido.id) === Number(id)
                    ? {
                          ...pedido,
                          [campo]: valor,
                      }
                    : pedido,
            ),
        );
    };

    const moverPedidoEdicion = (index, direccion) => {
        setPedidosEdicion((prev) => {
            const copia = [...prev];

            const nuevoIndex = direccion === "ARRIBA" ? index - 1 : index + 1;

            if (nuevoIndex < 0 || nuevoIndex >= copia.length) {
                return prev;
            }

            [copia[index], copia[nuevoIndex]] = [
                copia[nuevoIndex],
                copia[index],
            ];

            return copia.map((pedido, idx) => ({
                ...pedido,
                orden_entrega: idx + 1,
            }));
        });
    };

    const guardarPedidosProgramacion = async () => {
        if (!detalle) {
            return;
        }

        setGuardandoPedidos(true);

        try {
            const response = await axios.put(
                `/api/logistica-ventas/programaciones/${detalle.idprogramacion}/pedidos`,
                {
                    pedidos: pedidosEdicion.map((pedido, index) => ({
                        id: Number(pedido.id),

                        orden_entrega: index + 1,

                        hora_entrega: pedido.hora_entrega || null,

                        observaciones: pedido.observaciones?.trim() || null,
                    })),
                },
                {
                    headers,
                },
            );

            alertify.success(
                response.data?.message || "Entregas actualizadas.",
            );

            const detalleResponse = await axios.get(
                `/api/logistica-ventas/programaciones/${detalle.idprogramacion}`,
                {
                    headers,
                },
            );

            setDetalle(detalleResponse.data);

            setPedidosEdicion(
                detalleResponse.data.pedidos.map((pedido) => ({
                    ...pedido,

                    hora_entrega: pedido.hora_entrega
                        ? String(pedido.hora_entrega).substring(0, 5)
                        : "",

                    observaciones: pedido.observaciones || "",
                })),
            );

            setModoEdicionPedidos(false);
        } catch (error) {
            console.error(error);

            alertify.error(
                error?.response?.data?.message ||
                    "No se pudieron actualizar las entregas.",
            );
        } finally {
            setGuardandoPedidos(false);
        }
    };

    const actualizarFormEdicion = (campo, valor) => {
        setFormEdicion((prev) => ({
            ...prev,
            [campo]: valor,
        }));
    };

    const cambiarRutaEdicion = (valor) => {
        const ruta = rutas.find(
            (item) => Number(item.idruta) === Number(valor),
        );

        setFormEdicion((prev) => ({
            ...prev,

            idruta: valor,

            idvehiculo: ruta?.idvehiculo_default
                ? String(ruta.idvehiculo_default)
                : prev.idvehiculo,

            idpiloto: ruta?.idpiloto_default
                ? String(ruta.idpiloto_default)
                : prev.idpiloto,

            // hora_salida: ruta?.hora_salida_default
            //     ? String(ruta.hora_salida_default).substring(0, 5)
            //     : prev.hora_salida,
        }));
    };

    const guardarEdicionProgramacion = async () => {
        if (!detalle) {
            return;
        }

        if (!formEdicion.idruta) {
            alertify.warning("Debe seleccionar una ruta.");
            return;
        }

        if (!formEdicion.fecha) {
            alertify.warning("Debe seleccionar una fecha.");
            return;
        }

        if (!formEdicion.idvehiculo) {
            alertify.warning("Debe seleccionar un vehículo.");
            return;
        }

        if (!formEdicion.idpiloto) {
            alertify.warning("Debe seleccionar un piloto.");
            return;
        }

        setGuardandoEdicion(true);

        try {
            const response = await axios.put(
                `/api/logistica-ventas/programaciones/${detalle.idprogramacion}`,
                {
                    idruta: Number(formEdicion.idruta),

                    fecha: formEdicion.fecha,

                    hora_salida: formEdicion.hora_salida || null,

                    idvehiculo: Number(formEdicion.idvehiculo),

                    idpiloto: Number(formEdicion.idpiloto),

                    encargado: formEdicion.encargado.trim() || null,

                    observaciones: formEdicion.observaciones.trim() || null,
                },
                {
                    headers,
                },
            );

            alertify.success(
                response.data?.message || "Programación actualizada.",
            );

            setModoEdicion(false);

            /*
             * Recargamos detalle
             */
            const detalleResponse = await axios.get(
                `/api/logistica-ventas/programaciones/${detalle.idprogramacion}`,
                {
                    headers,
                },
            );

            setDetalle(detalleResponse.data);

            /*
             * Refrescamos el calendario visible.
             */
            const api = calendarRef.current?.getApi();

            if (api) {
                const view = api.view;

                const fechaInicio = view.activeStart
                    .toISOString()
                    .substring(0, 10);

                const fin = new Date(view.activeEnd);

                fin.setDate(fin.getDate() - 1);

                const fechaFin = fin.toISOString().substring(0, 10);

                await cargarEventos(fechaInicio, fechaFin);
            }
        } catch (error) {
            console.error(error);

            alertify.error(
                error?.response?.data?.message ||
                    "No se pudo actualizar la programación.",
            );
        } finally {
            setGuardandoEdicion(false);
        }
    };

    const formatearFecha = (valor) => {
        if (!valor) {
            return "—";
        }

        const [year, month, day] = String(valor).substring(0, 10).split("-");

        return `${day}/${month}/${year}`;
    };

    // const handleEventDrop = async (info) => {
    //     const evento = info.event;

    //     if (!evento.start) {
    //         info.revert();
    //         return;
    //     }

    //     const year = evento.start.getFullYear();

    //     const month = String(evento.start.getMonth() + 1).padStart(2, "0");

    //     const day = String(evento.start.getDate()).padStart(2, "0");

    //     const hours = String(evento.start.getHours()).padStart(2, "0");

    //     const minutes = String(evento.start.getMinutes()).padStart(2, "0");

    //     const fecha = `${year}-${month}-${day}`;

    //     const hora = `${hours}:${minutes}`;

    //     try {
    //         const response = await axios.put(
    //             `/api/logistica-ventas/programaciones/${evento.id}/fecha`,
    //             {
    //                 fecha,
    //                 hora_salida: hora,
    //             },
    //             {
    //                 headers,
    //             },
    //         );

    //         alertify.success(
    //             response.data?.message || "Ruta reprogramada correctamente.",
    //         );
    //     } catch (error) {
    //         console.error(error);

    //         info.revert();

    //         alertify.error(
    //             error?.response?.data?.message ||
    //                 "No se pudo reprogramar la ruta.",
    //         );
    //     }
    // };
    const handleEventDrop = async (info) => {
        const evento = info.event;

        const item = evento.extendedProps;

        if (!evento.start) {
            info.revert();
            return;
        }

        /*
         * Todavía no permitimos mover pedidos
         * SIN RUTA.
         */
        // if (!item.idprogramacion) {
        //     info.revert();

        //     alertify.warning(
        //         "Este pedido todavía no tiene ruta. Asígnelo primero a una ruta.",
        //     );

        //     return;
        // }

        /*
         * No permitir modificar entregados.
         */
        if (item.estado_entrega === "ENTREGADO") {
            info.revert();

            alertify.warning("Un pedido entregado ya no puede reprogramarse.");

            return;
        }

        /*
         * Fecha donde se soltó.
         */
        const year = evento.start.getFullYear();

        const month = String(evento.start.getMonth() + 1).padStart(2, "0");

        const day = String(evento.start.getDate()).padStart(2, "0");

        const nuevaFecha = `${year}-${month}-${day}`;

        /*
         * Hora donde se soltó.
         *
         * Esta será ahora la nueva hora
         * de entrega del pedido.
         */
        const hours = String(evento.start.getHours()).padStart(2, "0");

        const minutes = String(evento.start.getMinutes()).padStart(2, "0");

        const nuevaHoraEntrega = `${hours}:${minutes}`;

        /*
         * =========================================
         * PEDIDO SIN RUTA
         * =========================================
         */

        if (!item.idprogramacion) {
            try {
                const response = await axios.put(
                    `/api/logistica-ventas/cronograma/pedidos/${item.idpedidoproduccion}/mover`,
                    {
                        fecha: nuevaFecha,

                        hora: nuevaHoraEntrega,
                    },
                    {
                        headers,
                    },
                );

                alertify.success(
                    response.data?.message || "Pedido movido correctamente.",
                );

                const api = calendarRef.current?.getApi();

                if (api) {
                    const view = api.view;

                    const fechaInicio = view.activeStart
                        .toISOString()
                        .substring(0, 10);

                    const fin = new Date(view.activeEnd);

                    fin.setDate(fin.getDate() - 1);

                    await cargarEventos(
                        fechaInicio,
                        fin.toISOString().substring(0, 10),
                    );
                }

                return;
            } catch (error) {
                console.error(error);

                info.revert();

                alertify.error(
                    error?.response?.data?.message ||
                        "No se pudo mover el pedido.",
                );

                return;
            }
        }

        try {
            const response = await axios.post(
                `/api/logistica-ventas/cronograma/pedidos/${item.idpedidoproduccion}/asignar`,
                {
                    idruta: Number(item.idruta),

                    fecha: nuevaFecha,

                    /*
                     * Hora de salida de la ruta
                     * NO cambia por arrastrar
                     * un pedido.
                     */
                    hora_salida: item.hora_salida
                        ? String(item.hora_salida).substring(0, 5)
                        : null,

                    idvehiculo: Number(item.idvehiculo),

                    idpiloto: Number(item.idpiloto),

                    /*
                     * AQUÍ ESTÁ EL CAMBIO IMPORTANTE:
                     * guardamos la hora donde fue soltado.
                     */
                    hora_entrega: nuevaHoraEntrega,
                },
                {
                    headers,
                },
            );

            alertify.success(
                response.data?.message || "Pedido reprogramado correctamente.",
            );

            /*
             * Recargar desde BD.
             */
            const api = calendarRef.current?.getApi();

            if (api) {
                const view = api.view;

                const fechaInicio = view.activeStart
                    .toISOString()
                    .substring(0, 10);

                const fin = new Date(view.activeEnd);

                fin.setDate(fin.getDate() - 1);

                const fechaFin = fin.toISOString().substring(0, 10);

                await cargarEventos(fechaInicio, fechaFin);
            }
        } catch (error) {
            console.error(error);

            info.revert();

            alertify.error(
                error?.response?.data?.message || "No se pudo mover el pedido.",
            );
        }
    };

    const cargarCatalogos = async () => {
        try {
            const [rutasResponse, vehiculosResponse, pilotosResponse] =
                await Promise.all([
                    axios.get("/api/logistica-ventas/rutas", { headers }),
                    axios.get("/api/logistica-ventas/vehiculos", { headers }),
                    axios.get("/api/logistica-ventas/pilotos", { headers }),
                ]);

            setRutas(
                Array.isArray(rutasResponse.data) ? rutasResponse.data : [],
            );

            setVehiculos(
                Array.isArray(vehiculosResponse.data)
                    ? vehiculosResponse.data
                    : [],
            );

            setPilotos(
                Array.isArray(pilotosResponse.data) ? pilotosResponse.data : [],
            );
        } catch (error) {
            console.error(error);

            alertify.error("No se pudieron cargar los catálogos.");
        }
    };

    const cambiarEstadoRuta = async (nuevoEstado) => {
        if (nuevoEstado === "CANCELADA") {
            alertify.confirm(
                "Cancelar ruta",
                "¿Está seguro de cancelar esta ruta? Los pedidos no entregados volverán a quedar disponibles para una nueva programación.",
                () => {
                    ejecutarCambioEstadoRuta(nuevoEstado);
                },
                () => {},
            );

            return;
        }

        ejecutarCambioEstadoRuta(nuevoEstado);
    };

    const ejecutarCambioEstadoRuta = async (nuevoEstado) => {
        if (!detalle) return;

        try {
            const response = await axios.put(
                `/api/logistica-ventas/programaciones/${detalle.idprogramacion}/estado`,
                {
                    estado: nuevoEstado,
                },
                {
                    headers,
                },
            );

            alertify.success(
                response.data?.message || "Estado actualizado correctamente.",
            );

            const detalleResponse = await axios.get(
                `/api/logistica-ventas/programaciones/${detalle.idprogramacion}`,
                {
                    headers,
                },
            );

            setDetalle(detalleResponse.data);

            const api = calendarRef.current?.getApi();

            if (api) {
                const view = api.view;

                const fechaInicio = view.activeStart
                    .toISOString()
                    .substring(0, 10);

                const fin = new Date(view.activeEnd);

                fin.setDate(fin.getDate() - 1);

                const fechaFin = fin.toISOString().substring(0, 10);

                await cargarEventos(fechaInicio, fechaFin);
            }
        } catch (error) {
            console.error(error);

            alertify.error(
                error?.response?.data?.message ||
                    "No se pudo cambiar el estado.",
            );
        }
    };

    const cambiarEstadoPedido = async (id, nuevoEstado) => {
        try {
            const response = await axios.put(
                `/api/logistica-ventas/programaciones/pedidos/${id}/estado`,
                {
                    estado: nuevoEstado,
                },
                {
                    headers,
                },
            );

            alertify.success(response.data?.message || "Estado actualizado.");

            const detalleResponse = await axios.get(
                `/api/logistica-ventas/programaciones/${detalle.idprogramacion}`,
                {
                    headers,
                },
            );

            setDetalle(detalleResponse.data);

            setPedidosEdicion(
                detalleResponse.data.pedidos.map((pedido) => ({
                    ...pedido,

                    hora_entrega: pedido.hora_entrega
                        ? String(pedido.hora_entrega).substring(0, 5)
                        : "",

                    observaciones: pedido.observaciones || "",
                })),
            );
        } catch (error) {
            console.error(error);

            alertify.error(
                error?.response?.data?.message ||
                    "No se pudo cambiar el estado.",
            );
        }
    };

    const abrirReprogramacion = (pedido) => {
        setPedidoReprogramar(pedido);

        setFormReprogramacion({
            idruta: "",
            fecha: "",
            hora_salida: "",
            idvehiculo: "",
            idpiloto: "",
            encargado: "",
            observaciones_ruta: "",
            hora_entrega: "",
            observaciones_pedido: pedido.observaciones || "",
        });

        setReprogramacionOpen(true);
    };

    const cambiarRutaReprogramacion = (valor) => {
        const ruta = rutas.find(
            (item) => Number(item.idruta) === Number(valor),
        );

        setFormReprogramacion((prev) => ({
            ...prev,

            idruta: valor,

            idvehiculo: ruta?.idvehiculo_default
                ? String(ruta.idvehiculo_default)
                : "",

            idpiloto: ruta?.idpiloto_default
                ? String(ruta.idpiloto_default)
                : "",

            hora_salida: ruta?.hora_salida_default
                ? String(ruta.hora_salida_default).substring(0, 5)
                : "",
        }));
    };

    const actualizarReprogramacion = (campo, valor) => {
        setFormReprogramacion((prev) => ({
            ...prev,
            [campo]: valor,
        }));
    };

    const guardarReprogramacion = async () => {
        if (!pedidoReprogramar) return;

        if (!formReprogramacion.idruta) {
            alertify.warning("Debe seleccionar una ruta.");
            return;
        }

        if (!formReprogramacion.fecha) {
            alertify.warning("Debe seleccionar una fecha.");
            return;
        }

        setGuardandoReprogramacion(true);

        try {
            const response = await axios.post(
                `/api/logistica-ventas/programaciones/pedidos/${pedidoReprogramar.id}/reprogramar`,
                {
                    idruta: Number(formReprogramacion.idruta),

                    fecha: formReprogramacion.fecha,

                    hora_salida: formReprogramacion.hora_salida || null,

                    idvehiculo: formReprogramacion.idvehiculo
                        ? Number(formReprogramacion.idvehiculo)
                        : null,

                    idpiloto: formReprogramacion.idpiloto
                        ? Number(formReprogramacion.idpiloto)
                        : null,

                    encargado: formReprogramacion.encargado.trim() || null,

                    observaciones_ruta:
                        formReprogramacion.observaciones_ruta.trim() || null,

                    hora_entrega: formReprogramacion.hora_entrega || null,

                    observaciones_pedido:
                        formReprogramacion.observaciones_pedido.trim() || null,
                },
                {
                    headers,
                },
            );

            alertify.success(
                response.data?.message || "Pedido reprogramado correctamente.",
            );

            setReprogramacionOpen(false);
            setPedidoReprogramar(null);

            /*
             * Recargar detalle actual.
             */
            const detalleResponse = await axios.get(
                `/api/logistica-ventas/programaciones/${detalle.idprogramacion}`,
                {
                    headers,
                },
            );

            setDetalle(detalleResponse.data);

            /*
             * Recargar calendario.
             */
            const api = calendarRef.current?.getApi();

            if (api) {
                const view = api.view;

                const fechaInicio = view.activeStart
                    .toISOString()
                    .substring(0, 10);

                const fin = new Date(view.activeEnd);

                fin.setDate(fin.getDate() - 1);

                const fechaFin = fin.toISOString().substring(0, 10);

                await cargarEventos(fechaInicio, fechaFin);
            }
        } catch (error) {
            console.error(error);

            alertify.error(
                error?.response?.data?.message ||
                    "No se pudo reprogramar el pedido.",
            );
        } finally {
            setGuardandoReprogramacion(false);
        }
    };

    const abrirAgregarPedidos = async () => {
        setCargandoDisponibles(true);

        try {
            const response = await axios.get(
                "/api/logistica-ventas/pedidos-pendientes",
                {
                    headers,
                },
            );

            setPedidosDisponibles(
                Array.isArray(response.data) ? response.data : [],
            );

            setPedidosAgregar([]);

            setAgregarPedidosOpen(true);
        } catch (error) {
            console.error(error);

            alertify.error("No se pudieron cargar los pedidos disponibles.");
        } finally {
            setCargandoDisponibles(false);
        }
    };

    const pedidoEstaSeleccionadoAgregar = (id) =>
        pedidosAgregar.some(
            (item) => Number(item.idpedidoproduccion) === Number(id),
        );

    const alternarPedidoAgregar = (pedido) => {
        setPedidosAgregar((prev) => {
            const existe = prev.some(
                (item) =>
                    Number(item.idpedidoproduccion) ===
                    Number(pedido.idpedidoproduccion),
            );

            if (existe) {
                return prev.filter(
                    (item) =>
                        Number(item.idpedidoproduccion) !==
                        Number(pedido.idpedidoproduccion),
                );
            }

            return [
                ...prev,
                {
                    ...pedido,
                    hora_entrega: "",
                    observaciones_agregar: "",
                },
            ];
        });
    };

    const guardarAgregarPedidos = async () => {
        if (!detalle) {
            return;
        }

        if (pedidosAgregar.length === 0) {
            alertify.warning("Seleccione al menos un pedido.");
            return;
        }

        setGuardandoAgregarPedidos(true);

        try {
            const response = await axios.post(
                `/api/logistica-ventas/programaciones/${detalle.idprogramacion}/pedidos`,
                {
                    pedidos: pedidosAgregar.map((pedido) => ({
                        idpedidoproduccion: Number(pedido.idpedidoproduccion),

                        hora_entrega: pedido.hora_entrega || null,

                        observaciones:
                            pedido.observaciones_agregar?.trim() || null,
                    })),
                },
                {
                    headers,
                },
            );

            alertify.success(
                response.data?.message || "Pedidos agregados correctamente.",
            );

            setAgregarPedidosOpen(false);
            setPedidosAgregar([]);

            /*
             * Actualizar detalle.
             */
            const detalleResponse = await axios.get(
                `/api/logistica-ventas/programaciones/${detalle.idprogramacion}`,
                {
                    headers,
                },
            );

            setDetalle(detalleResponse.data);

            setPedidosEdicion(
                detalleResponse.data.pedidos.map((pedido) => ({
                    ...pedido,

                    hora_entrega: pedido.hora_entrega
                        ? String(pedido.hora_entrega).substring(0, 5)
                        : "",

                    observaciones: pedido.observaciones || "",
                })),
            );

            /*
             * Refrescar contador del calendario.
             */
            const api = calendarRef.current?.getApi();

            if (api) {
                const view = api.view;

                const fechaInicio = view.activeStart
                    .toISOString()
                    .substring(0, 10);

                const fin = new Date(view.activeEnd);

                fin.setDate(fin.getDate() - 1);

                await cargarEventos(
                    fechaInicio,
                    fin.toISOString().substring(0, 10),
                );
            }
        } catch (error) {
            console.error(error);

            alertify.error(
                error?.response?.data?.message ||
                    "No se pudieron agregar los pedidos.",
            );
        } finally {
            setGuardandoAgregarPedidos(false);
        }
    };

    const quitarPedidoRuta = (pedido) => {
        if (!detalle) {
            return;
        }

        alertify.confirm(
            "Quitar pedido",
            `¿Desea retirar el pedido P-${pedido.nopedido} de esta ruta?`,
            async () => {
                try {
                    const response = await axios.delete(
                        `/api/logistica-ventas/programaciones/pedidos/${pedido.id}`,
                        {
                            headers,
                        },
                    );

                    alertify.success(
                        response.data?.message || "Pedido retirado de la ruta.",
                    );

                    /*
                     * Recargar detalle.
                     */
                    const detalleResponse = await axios.get(
                        `/api/logistica-ventas/programaciones/${detalle.idprogramacion}`,
                        {
                            headers,
                        },
                    );

                    setDetalle(detalleResponse.data);

                    setPedidosEdicion(
                        detalleResponse.data.pedidos.map((item) => ({
                            ...item,

                            hora_entrega: item.hora_entrega
                                ? String(item.hora_entrega).substring(0, 5)
                                : "",

                            observaciones: item.observaciones || "",
                        })),
                    );

                    /*
                     * Refrescar calendario.
                     */
                    const api = calendarRef.current?.getApi();

                    if (api) {
                        const view = api.view;

                        const fechaInicio = view.activeStart
                            .toISOString()
                            .substring(0, 10);

                        const fin = new Date(view.activeEnd);

                        fin.setDate(fin.getDate() - 1);

                        const fechaFin = fin.toISOString().substring(0, 10);

                        await cargarEventos(fechaInicio, fechaFin);
                    }
                } catch (error) {
                    console.error(error);

                    alertify.error(
                        error?.response?.data?.message ||
                            "No se pudo quitar el pedido.",
                    );
                }
            },
            () => {},
        );
    };

    const abrirPedidoCronograma = async (item) => {
        await cargarCatalogos();

        setPedidoCronograma(item);

        setFormPedidoCronograma({
            idruta: item.idruta ? String(item.idruta) : "",

            fecha: item.fecha ? String(item.fecha).substring(0, 10) : "",

            hora_salida: item.hora_salida
                ? String(item.hora_salida).substring(0, 5)
                : "",

            idvehiculo: item.idvehiculo ? String(item.idvehiculo) : "",

            idpiloto: item.idpiloto ? String(item.idpiloto) : "",

            hora_entrega: item.hora_entrega
                ? String(item.hora_entrega).substring(0, 5)
                : "",
        });

        setPedidoCronogramaOpen(true);
    };

    const cambiarRutaPedidoCronograma = (valor) => {
        const ruta = rutas.find(
            (item) => Number(item.idruta) === Number(valor),
        );

        setFormPedidoCronograma((prev) => ({
            ...prev,

            idruta: valor,

            idvehiculo: ruta?.idvehiculo_default
                ? String(ruta.idvehiculo_default)
                : prev.idvehiculo,

            idpiloto: ruta?.idpiloto_default
                ? String(ruta.idpiloto_default)
                : prev.idpiloto,
        }));
    };

    const actualizarPedidoCronograma = (campo, valor) => {
        setFormPedidoCronograma((prev) => ({
            ...prev,
            [campo]: valor,
        }));
    };

    const guardarPedidoCronograma = async () => {
        if (!pedidoCronograma) return;

        if (!formPedidoCronograma.idruta) {
            alertify.warning("Debe seleccionar una ruta.");
            return;
        }

        if (!formPedidoCronograma.fecha) {
            alertify.warning("Debe seleccionar una fecha.");
            return;
        }

        if (!formPedidoCronograma.hora_salida) {
            alertify.warning("Debe ingresar la hora de salida.");
            return;
        }

        if (!formPedidoCronograma.idvehiculo) {
            alertify.warning("Debe seleccionar un vehículo.");
            return;
        }

        if (!formPedidoCronograma.idpiloto) {
            alertify.warning("Debe seleccionar un piloto.");
            return;
        }

        setGuardandoPedidoCronograma(true);

        try {
            const response = await axios.post(
                `/api/logistica-ventas/cronograma/pedidos/${pedidoCronograma.idpedidoproduccion}/asignar`,
                {
                    idruta: Number(formPedidoCronograma.idruta),

                    fecha: formPedidoCronograma.fecha,

                    hora_salida: formPedidoCronograma.hora_salida,

                    idvehiculo: Number(formPedidoCronograma.idvehiculo),

                    idpiloto: Number(formPedidoCronograma.idpiloto),

                    hora_entrega: formPedidoCronograma.hora_entrega || null,
                },
                {
                    headers,
                },
            );

            alertify.success(
                response.data?.message || "Pedido actualizado correctamente.",
            );

            setPedidoCronogramaOpen(false);
            setPedidoCronograma(null);

            const api = calendarRef.current?.getApi();

            if (api) {
                const view = api.view;

                const fechaInicio = view.activeStart
                    .toISOString()
                    .substring(0, 10);

                const fin = new Date(view.activeEnd);

                fin.setDate(fin.getDate() - 1);

                const fechaFin = fin.toISOString().substring(0, 10);

                await cargarEventos(fechaInicio, fechaFin);
            }
        } catch (error) {
            console.error(error);

            alertify.error(
                error?.response?.data?.message ||
                    "No se pudo actualizar el pedido.",
            );
        } finally {
            setGuardandoPedidoCronograma(false);
        }
    };

    const renderEventoCronograma = (eventInfo) => {
    const item = eventInfo.event.extendedProps;

    const sinRuta = !item.idprogramacion;

    return (
        <div className="gp-logcal-event-content">

            <div className="gp-logcal-event-order">
                P-{item.nopedido} · {item.cliente || "SIN CLIENTE"}
            </div>

            <span
                className={
                    sinRuta
                        ? "gp-logcal-event-route-badge sin-ruta"
                        : "gp-logcal-event-route-badge"
                }
            >
                {sinRuta
                    ? "SIN RUTA"
                    : item.ruta || "SIN RUTA"}
            </span>

        </div>
    );
};

    const montarTooltipEvento = (info) => {
        const item = info.event.extendedProps;

        const partes = [];

        partes.push(`Pedido: P-${item.nopedido}`);

        if (item.cliente) {
            partes.push(`Cliente: ${item.cliente}`);
        }

        if (item.ruta) {
            partes.push(`Ruta: ${item.ruta}`);
        } else {
            partes.push("Ruta: SIN RUTA");
        }

        if (item.direccion_entrega) {
            partes.push(`Dirección: ${item.direccion_entrega}`);
        }

        if (item.hora_entrega) {
            partes.push(
                `Hora entrega: ${String(item.hora_entrega).substring(0, 5)}`,
            );
        }

        if (item.piloto) {
            partes.push(`Piloto: ${item.piloto}`);
        }

        if (item.vehiculo) {
            partes.push(`Vehículo: ${item.vehiculo}`);
        }

        if (item.observaciones) {
            partes.push(`Comentario: ${item.observaciones}`);
        }

        info.el.setAttribute("title", partes.join("\n"));
    };

    return (
        <div className="gp-module-page gp-logcal-page">
            <div className="gp-module-card gp-logcal-card">
                <div className="gp-logcal-header">
                    <div className="gp-logcal-heading">
                        <div className="gp-logcal-heading-icon">
                            <CalendarDays size={22} />
                        </div>

                        <div>
                            <div className="gp-module-meta">
                                LOGÍSTICA · VENTAS
                            </div>

                            <h1>Cronograma</h1>

                            <p>
                                Consulta y organiza los pedidos por fecha y
                                ruta.
                            </p>
                        </div>
                    </div>

                    {loading && (
                        <div className="gp-logcal-loading">Actualizando...</div>
                    )}
                </div>

                <div className="gp-logcal-calendar">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[
                            dayGridPlugin,
                            timeGridPlugin,
                            interactionPlugin,
                        ]}
                        initialView="timeGridWeek"
                        firstDay={1}
                        locale="es"
                        height="auto"
                        nowIndicator={true}
                        editable={TruckElectric}
                        eventStartEditable={true}
                        eventDurationEditable={false}
                        slotEventOverlap={false}
                        eventMinHeight={24}
                        eventShortHeight={24}
                        selectable={false}
                        displayEventTime={false}
                        allDaySlot={false}
                        slotMinTime="06:00:00"
                        slotMaxTime="20:00:00"
                        slotDuration="00:30:00"
                        snapDuration="00:30:00"
                        defaultTimedEventDuration="00:30:00"
                        forceEventDuration={true}
                        eventContent={renderEventoCronograma}
                        eventDidMount={montarTooltipEvento}
                        headerToolbar={{
                            left: "prev,next today",
                            center: "title",
                            right: "dayGridMonth,timeGridWeek,timeGridDay",
                        }}
                        buttonText={{
                            today: "Hoy",
                            month: "Mes",
                            week: "Semana",
                            day: "Día",
                        }}
                        events={eventos}
                        datesSet={handleDatesSet}
                        eventClick={handleEventClick}
                        eventDrop={handleEventDrop}
                    />
                </div>
            </div>

            {detalleOpen && detalle && (
                <div className="gp-logcal-modal-backdrop">
                    <div className="gp-logcal-modal">
                        <div className="gp-logcal-modal-header">
                            <div>
                                <strong>{detalle.ruta}</strong>
                                <span>Detalle de la programación</span>
                            </div>

                            <div className="gp-logcal-modal-header-actions">
                                <PDFDownloadLink
                                    document={
                                        <HojaRutaLogisticaPDF
                                            detalle={detalle}
                                        />
                                    }
                                    fileName={`hoja-ruta-${detalle.ruta || "ruta"}-${detalle.fecha || ""}.pdf`}
                                    className="gp-logcal-pdf-button"
                                >
                                    {({ loading }) => (
                                        <>
                                            <Download size={14} />

                                            {loading
                                                ? "Generando..."
                                                : "Hoja de ruta"}
                                        </>
                                    )}
                                </PDFDownloadLink>
                                {!modoEdicion && (
                                    <button
                                        type="button"
                                        className="gp-logcal-edit-button"
                                        onClick={() => setModoEdicion(true)}
                                    >
                                        Editar
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="gp-logcal-close-button"
                                    onClick={() => {
                                        setDetalleOpen(false);
                                        setModoEdicion(false);
                                    }}
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        </div>

                        {modoEdicion ? (
                            <div className="gp-logcal-edit-form">
                                <div className="gp-logcal-edit-field">
                                    <label>Ruta *</label>

                                    <select
                                        value={formEdicion.idruta}
                                        onChange={(e) =>
                                            cambiarRutaEdicion(e.target.value)
                                        }
                                    >
                                        <option value="">Seleccione...</option>

                                        {rutas.map((ruta) => (
                                            <option
                                                key={ruta.idruta}
                                                value={ruta.idruta}
                                            >
                                                {ruta.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="gp-logcal-edit-field">
                                    <label>Fecha *</label>

                                    <input
                                        type="date"
                                        value={formEdicion.fecha}
                                        onChange={(e) =>
                                            actualizarFormEdicion(
                                                "fecha",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>

                                <div className="gp-logcal-edit-field">
                                    <label>Hora salida</label>

                                    <input
                                        type="time"
                                        value={formEdicion.hora_salida}
                                        onChange={(e) =>
                                            actualizarFormEdicion(
                                                "hora_salida",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>

                                <div className="gp-logcal-edit-field">
                                    <label>Vehículo *</label>

                                    <select
                                        value={formEdicion.idvehiculo}
                                        onChange={(e) =>
                                            actualizarFormEdicion(
                                                "idvehiculo",
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">Seleccione...</option>

                                        {vehiculos.map((vehiculo) => (
                                            <option
                                                key={vehiculo.idvehiculo}
                                                value={vehiculo.idvehiculo}
                                            >
                                                {vehiculo.nombre}
                                                {vehiculo.placa
                                                    ? ` · ${vehiculo.placa}`
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="gp-logcal-edit-field">
                                    <label>Piloto *</label>

                                    <select
                                        value={formEdicion.idpiloto}
                                        onChange={(e) =>
                                            actualizarFormEdicion(
                                                "idpiloto",
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">Seleccione...</option>

                                        {pilotos.map((piloto) => (
                                            <option
                                                key={piloto.idpiloto}
                                                value={piloto.idpiloto}
                                            >
                                                {piloto.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="gp-logcal-edit-field">
                                    <label>Encargado</label>

                                    <input
                                        type="text"
                                        value={formEdicion.encargado}
                                        onChange={(e) =>
                                            actualizarFormEdicion(
                                                "encargado",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>

                                <div className="gp-logcal-edit-field gp-logcal-edit-full">
                                    <label>Observaciones</label>

                                    <textarea
                                        rows={2}
                                        value={formEdicion.observaciones}
                                        onChange={(e) =>
                                            actualizarFormEdicion(
                                                "observaciones",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>

                                <div className="gp-logcal-edit-actions">
                                    <button
                                        type="button"
                                        className="gp-logcal-cancel-edit"
                                        onClick={() => setModoEdicion(false)}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="button"
                                        className="gp-logcal-save-edit"
                                        disabled={guardandoEdicion}
                                        onClick={guardarEdicionProgramacion}
                                    >
                                        {guardandoEdicion
                                            ? "Guardando..."
                                            : "Guardar cambios"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="gp-logcal-modal-info">
                                <div>
                                    <CalendarDays size={14} />

                                    <span>Fecha</span>

                                    <strong>
                                        {formatearFecha(detalle.fecha)}
                                    </strong>
                                </div>

                                <div>
                                    <Clock3 size={14} />

                                    <span>Salida</span>

                                    <strong>
                                        {detalle.hora_salida
                                            ? String(
                                                  detalle.hora_salida,
                                              ).substring(0, 5)
                                            : "—"}
                                    </strong>
                                </div>

                                <div>
                                    <Truck size={14} />

                                    <span>Vehículo</span>

                                    <strong>
                                        {detalle.vehiculo || "—"}
                                        {detalle.placa
                                            ? ` · ${detalle.placa}`
                                            : ""}
                                    </strong>
                                </div>

                                <div>
                                    <UserRound size={14} />

                                    <span>Piloto</span>

                                    <strong>{detalle.piloto || "—"}</strong>
                                </div>

                                <div className="gp-logcal-route-status-area">
                                    <div>
                                        <span>Estado de la ruta</span>

                                        <strong>{detalle.estado}</strong>
                                    </div>

                                    <div className="gp-logcal-route-status-actions">
                                        {detalle.estado === "PROGRAMADA" && (
                                            <button
                                                type="button"
                                                className="gp-logcal-state-start"
                                                onClick={() =>
                                                    cambiarEstadoRuta("EN_RUTA")
                                                }
                                            >
                                                Iniciar ruta
                                            </button>
                                        )}

                                        {detalle.estado === "EN_RUTA" && (
                                            <button
                                                type="button"
                                                className="gp-logcal-state-finish"
                                                onClick={() =>
                                                    cambiarEstadoRuta(
                                                        "FINALIZADA",
                                                    )
                                                }
                                            >
                                                Finalizar ruta
                                            </button>
                                        )}

                                        {detalle.estado !== "FINALIZADA" &&
                                            detalle.estado !== "CANCELADA" && (
                                                <button
                                                    type="button"
                                                    className="gp-logcal-state-cancel"
                                                    onClick={() =>
                                                        cambiarEstadoRuta(
                                                            "CANCELADA",
                                                        )
                                                    }
                                                >
                                                    Cancelar ruta
                                                </button>
                                            )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="gp-logcal-orders-main-actions">
                            {detalle.estado === "PROGRAMADA" &&
                                !modoEdicionPedidos && (
                                    <button
                                        type="button"
                                        className="gp-logcal-orders-add"
                                        onClick={abrirAgregarPedidos}
                                    >
                                        + Agregar pedidos
                                    </button>
                                )}

                            {!modoEdicionPedidos ? (
                                <button
                                    type="button"
                                    className="gp-logcal-orders-edit"
                                    onClick={() => setModoEdicionPedidos(true)}
                                >
                                    Editar entregas
                                </button>
                            ) : (
                                <div className="gp-logcal-orders-actions">
                                    <button
                                        type="button"
                                        className="gp-logcal-orders-cancel"
                                        onClick={() => {
                                            setModoEdicionPedidos(false);

                                            setPedidosEdicion(
                                                Array.isArray(detalle.pedidos)
                                                    ? detalle.pedidos.map(
                                                          (pedido) => ({
                                                              ...pedido,

                                                              hora_entrega:
                                                                  pedido.hora_entrega
                                                                      ? String(
                                                                            pedido.hora_entrega,
                                                                        ).substring(
                                                                            0,
                                                                            5,
                                                                        )
                                                                      : "",

                                                              observaciones:
                                                                  pedido.observaciones ||
                                                                  "",
                                                          }),
                                                      )
                                                    : [],
                                            );
                                        }}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="button"
                                        className="gp-logcal-orders-save"
                                        disabled={guardandoPedidos}
                                        onClick={guardarPedidosProgramacion}
                                    >
                                        {guardandoPedidos
                                            ? "Guardando..."
                                            : "Guardar"}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="gp-logcal-orders-wrapper">
                            <table className="gp-logcal-orders-table">
                                <thead>
                                    <tr>
                                        <th>Orden</th>
                                        <th>Pedido</th>
                                        <th>Hora</th>
                                        <th>Cliente</th>
                                        <th>Dirección</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {(modoEdicionPedidos
                                        ? pedidosEdicion
                                        : detalle.pedidos
                                    )?.map((pedido, index) => (
                                        <tr key={pedido.id}>
                                            <td>
                                                {modoEdicionPedidos ? (
                                                    <div className="gp-logcal-order-edit-controls">
                                                        <span className="gp-logcal-order-number">
                                                            {index + 1}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                index === 0
                                                            }
                                                            onClick={() =>
                                                                moverPedidoEdicion(
                                                                    index,
                                                                    "ARRIBA",
                                                                )
                                                            }
                                                        >
                                                            ↑
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                index ===
                                                                pedidosEdicion.length -
                                                                    1
                                                            }
                                                            onClick={() =>
                                                                moverPedidoEdicion(
                                                                    index,
                                                                    "ABAJO",
                                                                )
                                                            }
                                                        >
                                                            ↓
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="gp-logcal-order-number">
                                                        {pedido.orden_entrega}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="gp-logcal-order">
                                                P-{pedido.nopedido}
                                            </td>

                                            <td>
                                                {modoEdicionPedidos ? (
                                                    <input
                                                        type="time"
                                                        className="gp-logcal-order-inline"
                                                        value={
                                                            pedido.hora_entrega ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            actualizarPedidoEdicion(
                                                                pedido.id,
                                                                "hora_entrega",
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                ) : pedido.hora_entrega ? (
                                                    String(
                                                        pedido.hora_entrega,
                                                    ).substring(0, 5)
                                                ) : (
                                                    "—"
                                                )}
                                            </td>

                                            <td>{pedido.cliente}</td>

                                            <td>
                                                {pedido.direccion_entrega ||
                                                    "—"}
                                            </td>

                                            <td>
                                                {modoEdicionPedidos ? (
                                                    <input
                                                        type="text"
                                                        className="gp-logcal-order-inline gp-logcal-order-observation"
                                                        value={
                                                            pedido.observaciones ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            actualizarPedidoEdicion(
                                                                pedido.id,
                                                                "observaciones",
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Observaciones..."
                                                    />
                                                ) : (
                                                    <div className="gp-logcal-delivery-status">
                                                        <select
                                                            value={
                                                                pedido.estado_entrega
                                                            }
                                                            onChange={(e) =>
                                                                cambiarEstadoPedido(
                                                                    pedido.id,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        >
                                                            <option value="PROGRAMADO">
                                                                Programado
                                                            </option>

                                                            <option value="EN_RUTA">
                                                                En ruta
                                                            </option>

                                                            <option value="ENTREGADO">
                                                                Entregado
                                                            </option>

                                                            <option value="NO_ENTREGADO">
                                                                No entregado
                                                            </option>
                                                        </select>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="gp-logcal-row-actions">
                                                    {(pedido.estado_entrega ===
                                                        "PROGRAMADO" ||
                                                        pedido.estado_entrega ===
                                                            "NO_ENTREGADO") && (
                                                        <button
                                                            type="button"
                                                            className="gp-logcal-reprogram-button"
                                                            onClick={() =>
                                                                abrirReprogramacion(
                                                                    pedido,
                                                                )
                                                            }
                                                        >
                                                            Reprogramar
                                                        </button>
                                                    )}

                                                    {detalle.estado ===
                                                        "PROGRAMADA" &&
                                                        pedido.estado_entrega !==
                                                            "ENTREGADO" && (
                                                            <button
                                                                type="button"
                                                                className="gp-logcal-remove-button"
                                                                onClick={() =>
                                                                    quitarPedidoRuta(
                                                                        pedido,
                                                                    )
                                                                }
                                                            >
                                                                Quitar
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {reprogramacionOpen && pedidoReprogramar && (
                <div className="gp-logcal-reprogram-backdrop">
                    <div className="gp-logcal-reprogram-modal">
                        <div className="gp-logcal-reprogram-header">
                            <div>
                                <strong>
                                    Reprogramar pedido P-
                                    {pedidoReprogramar.nopedido}
                                </strong>

                                <span>
                                    Asigna una nueva ruta y fecha de entrega.
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setReprogramacionOpen(false)}
                            >
                                <X size={17} />
                            </button>
                        </div>

                        <div className="gp-logcal-reprogram-grid">
                            <div>
                                <label>Ruta *</label>

                                <select
                                    value={formReprogramacion.idruta}
                                    onChange={(e) =>
                                        cambiarRutaReprogramacion(
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">Seleccione...</option>

                                    {rutas.map((ruta) => (
                                        <option
                                            key={ruta.idruta}
                                            value={ruta.idruta}
                                        >
                                            {ruta.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label>Fecha *</label>

                                <input
                                    type="date"
                                    value={formReprogramacion.fecha}
                                    onChange={(e) =>
                                        actualizarReprogramacion(
                                            "fecha",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <label>Hora salida</label>

                                <input
                                    type="time"
                                    value={formReprogramacion.hora_salida}
                                    onChange={(e) =>
                                        actualizarReprogramacion(
                                            "hora_salida",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <label>Vehículo</label>

                                <select
                                    value={formReprogramacion.idvehiculo}
                                    onChange={(e) =>
                                        actualizarReprogramacion(
                                            "idvehiculo",
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">Seleccione...</option>

                                    {vehiculos.map((vehiculo) => (
                                        <option
                                            key={vehiculo.idvehiculo}
                                            value={vehiculo.idvehiculo}
                                        >
                                            {vehiculo.nombre}
                                            {vehiculo.placa
                                                ? ` · ${vehiculo.placa}`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label>Piloto</label>

                                <select
                                    value={formReprogramacion.idpiloto}
                                    onChange={(e) =>
                                        actualizarReprogramacion(
                                            "idpiloto",
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">Seleccione...</option>

                                    {pilotos.map((piloto) => (
                                        <option
                                            key={piloto.idpiloto}
                                            value={piloto.idpiloto}
                                        >
                                            {piloto.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label>Hora entrega</label>

                                <input
                                    type="time"
                                    value={formReprogramacion.hora_entrega}
                                    onChange={(e) =>
                                        actualizarReprogramacion(
                                            "hora_entrega",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div className="gp-logcal-reprogram-full">
                                <label>Observaciones</label>

                                <textarea
                                    rows={2}
                                    value={
                                        formReprogramacion.observaciones_pedido
                                    }
                                    onChange={(e) =>
                                        actualizarReprogramacion(
                                            "observaciones_pedido",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="gp-logcal-reprogram-footer">
                            <button
                                type="button"
                                className="gp-logcal-reprogram-cancel"
                                onClick={() => setReprogramacionOpen(false)}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="gp-logcal-reprogram-save"
                                disabled={guardandoReprogramacion}
                                onClick={guardarReprogramacion}
                            >
                                {guardandoReprogramacion
                                    ? "Reprogramando..."
                                    : "Reprogramar pedido"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {agregarPedidosOpen && (
                <div className="gp-logcal-add-backdrop">
                    <div className="gp-logcal-add-modal">
                        <div className="gp-logcal-add-header">
                            <div>
                                <strong>
                                    Agregar pedidos a {detalle?.ruta}
                                </strong>

                                <span>
                                    Selecciona pedidos aprobados que aún no
                                    tienen programación.
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setAgregarPedidosOpen(false)}
                            >
                                <X size={17} />
                            </button>
                        </div>

                        <div className="gp-logcal-add-content">
                            {cargandoDisponibles ? (
                                <div className="gp-logcal-add-empty">
                                    Cargando pedidos...
                                </div>
                            ) : pedidosDisponibles.length === 0 ? (
                                <div className="gp-logcal-add-empty">
                                    No existen pedidos pendientes de
                                    programación.
                                </div>
                            ) : (
                                <div className="gp-logcal-add-table-wrapper">
                                    <table className="gp-logcal-add-table">
                                        <thead>
                                            <tr>
                                                <th></th>
                                                <th>Pedido</th>
                                                <th>Entrega</th>
                                                <th>Cliente</th>
                                                <th>Dirección</th>
                                                <th>Hora</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {pedidosDisponibles.map(
                                                (pedido) => {
                                                    const seleccionado =
                                                        pedidoEstaSeleccionadoAgregar(
                                                            pedido.idpedidoproduccion,
                                                        );

                                                    const registro =
                                                        pedidosAgregar.find(
                                                            (item) =>
                                                                Number(
                                                                    item.idpedidoproduccion,
                                                                ) ===
                                                                Number(
                                                                    pedido.idpedidoproduccion,
                                                                ),
                                                        );

                                                    return (
                                                        <tr
                                                            key={
                                                                pedido.idpedidoproduccion
                                                            }
                                                            className={
                                                                seleccionado
                                                                    ? "selected"
                                                                    : ""
                                                            }
                                                        >
                                                            <td>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        seleccionado
                                                                    }
                                                                    onChange={() =>
                                                                        alternarPedidoAgregar(
                                                                            pedido,
                                                                        )
                                                                    }
                                                                />
                                                            </td>

                                                            <td className="gp-logcal-order">
                                                                {
                                                                    pedido.nopedido
                                                                }
                                                            </td>

                                                            <td>
                                                                {pedido.fecha_entrega
                                                                    ? String(
                                                                          pedido.fecha_entrega,
                                                                      ).substring(
                                                                          0,
                                                                          10,
                                                                      )
                                                                    : "—"}
                                                            </td>

                                                            <td>
                                                                {pedido.cliente}
                                                            </td>

                                                            <td>
                                                                {pedido.direccion_entrega ||
                                                                    "—"}
                                                            </td>

                                                            <td>
                                                                {seleccionado ? (
                                                                    <input
                                                                        type="time"
                                                                        value={
                                                                            registro?.hora_entrega ||
                                                                            ""
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setPedidosAgregar(
                                                                                (
                                                                                    prev,
                                                                                ) =>
                                                                                    prev.map(
                                                                                        (
                                                                                            item,
                                                                                        ) =>
                                                                                            Number(
                                                                                                item.idpedidoproduccion,
                                                                                            ) ===
                                                                                            Number(
                                                                                                pedido.idpedidoproduccion,
                                                                                            )
                                                                                                ? {
                                                                                                      ...item,
                                                                                                      hora_entrega:
                                                                                                          e
                                                                                                              .target
                                                                                                              .value,
                                                                                                  }
                                                                                                : item,
                                                                                    ),
                                                                            )
                                                                        }
                                                                    />
                                                                ) : (
                                                                    "—"
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                },
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="gp-logcal-add-footer">
                            <span>{pedidosAgregar.length} seleccionado(s)</span>

                            <div>
                                <button
                                    type="button"
                                    className="gp-logcal-add-cancel"
                                    onClick={() => setAgregarPedidosOpen(false)}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    className="gp-logcal-add-save"
                                    disabled={
                                        guardandoAgregarPedidos ||
                                        pedidosAgregar.length === 0
                                    }
                                    onClick={guardarAgregarPedidos}
                                >
                                    {guardandoAgregarPedidos
                                        ? "Agregando..."
                                        : "Agregar a la ruta"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {pedidoCronogramaOpen && pedidoCronograma && (
                <div className="gp-logcal-order-modal-backdrop">
                    <div className="gp-logcal-order-modal">
                        <div className="gp-logcal-order-modal-header">
                            <div>
                                <strong>
                                    Pedido P-{pedidoCronograma.nopedido}
                                </strong>

                                <span>
                                    {pedidoCronograma.cliente || "Sin cliente"}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPedidoCronogramaOpen(false)}
                            >
                                <X size={17} />
                            </button>
                        </div>

                        <div className="gp-logcal-order-summary">
                            <div>
                                <span>Cliente</span>

                                <strong>
                                    {pedidoCronograma.cliente || "—"}
                                </strong>
                            </div>

                            <div>
                                <span>Dirección</span>

                                <strong>
                                    {pedidoCronograma.direccion_entrega || "—"}
                                </strong>
                            </div>

                            <div>
                                <span>Estado</span>

                                <strong>
                                    {pedidoCronograma.idprogramacion
                                        ? pedidoCronograma.estado_entrega
                                        : "SIN RUTA"}
                                </strong>
                            </div>

                            <div>
                                <span>Ruta actual</span>

                                <strong>
                                    {pedidoCronograma.ruta || "Sin asignar"}
                                </strong>
                            </div>
                        </div>

                        <div className="gp-logcal-order-form">
                            <div>
                                <label>Ruta *</label>

                                <select
                                    value={formPedidoCronograma.idruta}
                                    onChange={(e) =>
                                        cambiarRutaPedidoCronograma(
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">Seleccione...</option>

                                    {rutas.map((ruta) => (
                                        <option
                                            key={ruta.idruta}
                                            value={ruta.idruta}
                                        >
                                            {ruta.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label>Fecha *</label>

                                <input
                                    type="date"
                                    value={formPedidoCronograma.fecha}
                                    onChange={(e) =>
                                        actualizarPedidoCronograma(
                                            "fecha",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <label>Hora salida *</label>

                                <input
                                    type="time"
                                    value={formPedidoCronograma.hora_salida}
                                    onChange={(e) =>
                                        actualizarPedidoCronograma(
                                            "hora_salida",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <label>Vehículo *</label>

                                <select
                                    value={formPedidoCronograma.idvehiculo}
                                    onChange={(e) =>
                                        actualizarPedidoCronograma(
                                            "idvehiculo",
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">Seleccione...</option>

                                    {vehiculos.map((vehiculo) => (
                                        <option
                                            key={vehiculo.idvehiculo}
                                            value={vehiculo.idvehiculo}
                                        >
                                            {vehiculo.nombre}
                                            {vehiculo.placa
                                                ? ` · ${vehiculo.placa}`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label>Piloto *</label>

                                <select
                                    value={formPedidoCronograma.idpiloto}
                                    onChange={(e) =>
                                        actualizarPedidoCronograma(
                                            "idpiloto",
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">Seleccione...</option>

                                    {pilotos.map((piloto) => (
                                        <option
                                            key={piloto.idpiloto}
                                            value={piloto.idpiloto}
                                        >
                                            {piloto.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label>Hora entrega</label>

                                <input
                                    type="time"
                                    value={formPedidoCronograma.hora_entrega}
                                    onChange={(e) =>
                                        actualizarPedidoCronograma(
                                            "hora_entrega",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="gp-logcal-order-modal-footer">
                            <button
                                type="button"
                                className="gp-logcal-order-cancel"
                                onClick={() => setPedidoCronogramaOpen(false)}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="gp-logcal-order-save"
                                disabled={guardandoPedidoCronograma}
                                onClick={guardarPedidoCronograma}
                            >
                                {guardandoPedidoCronograma
                                    ? "Guardando..."
                                    : pedidoCronograma.idprogramacion
                                      ? "Guardar cambios"
                                      : "Asignar a ruta"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CalendarioLogisticaVentas;
