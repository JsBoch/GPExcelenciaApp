import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import axios from "axios";
import alertify from "alertifyjs";

import {
    CalendarDays,
    CheckSquare,
    ClipboardList,
    Clock3,
    MapPinned,
    RefreshCw,
    Route,
    Search,
    Truck,
    UserRound,
    X,
} from "lucide-react";

import "../../../css/logistica-ventas-programacion.css";

function ProgramacionLogisticaVentas() {
    const [pedidos, setPedidos] = useState([]);
    const [pilotos, setPilotos] = useState([]);
    const [vehiculos, setVehiculos] = useState([]);
    const [rutas, setRutas] = useState([]);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [filtro, setFiltro] = useState("");

    const [seleccionados, setSeleccionados] = useState([]);

    const [fecha, setFecha] = useState("");
    const [idruta, setIdruta] = useState("");
    const [horaSalida, setHoraSalida] = useState("");
    const [idvehiculo, setIdvehiculo] = useState("");
    const [idpiloto, setIdpiloto] = useState("");
    // const [encargado, setEncargado] = useState("");
    // const [observaciones, setObservaciones] = useState("");

    const headers = useMemo(() => {
        const token = localStorage.getItem("token");

        return {
            Authorization: `Bearer ${token}`,
        };
    }, []);

    useEffect(() => {
        cargarInicial();
    }, []);

    const cargarInicial = async () => {
        setLoading(true);

        try {
            const [
                pedidosResponse,
                pilotosResponse,
                vehiculosResponse,
                rutasResponse,
            ] = await Promise.all([
                axios.get(
                    "/api/logistica-ventas/pedidos-pendientes",
                    { headers },
                ),

                axios.get(
                    "/api/logistica-ventas/pilotos",
                    { headers },
                ),

                axios.get(
                    "/api/logistica-ventas/vehiculos",
                    { headers },
                ),

                axios.get(
                    "/api/logistica-ventas/rutas",
                    { headers },
                ),
            ]);

            setPedidos(
                Array.isArray(pedidosResponse.data)
                    ? pedidosResponse.data
                    : [],
            );

            setPilotos(
                Array.isArray(pilotosResponse.data)
                    ? pilotosResponse.data
                    : [],
            );

            setVehiculos(
                Array.isArray(vehiculosResponse.data)
                    ? vehiculosResponse.data
                    : [],
            );

            setRutas(
                Array.isArray(rutasResponse.data)
                    ? rutasResponse.data
                    : [],
            );

            const hoy =
                new Date()
                    .toISOString()
                    .split("T")[0];

            setFecha((prev) => prev || hoy);
        } catch (error) {
            console.error(error);

            alertify.error(
                "No se pudo cargar la información de logística.",
            );
        } finally {
            setLoading(false);
        }
    };

    const pedidosFiltrados = useMemo(() => {
        const texto =
            filtro.trim().toLowerCase();

        if (!texto) {
            return pedidos;
        }

        return pedidos.filter((pedido) => {
            const valores = [
                pedido.nopedido,
                pedido.cliente,
                pedido.contacto,
                pedido.asesor,
                pedido.direccion_entrega,
                pedido.trabajo,
                pedido.no_envio_asociado,
            ];

            return valores.some((valor) =>
                String(valor ?? "")
                    .toLowerCase()
                    .includes(texto),
            );
        });
    }, [pedidos, filtro]);

    const estaSeleccionado = (id) =>
        seleccionados.some(
            (pedido) =>
                Number(
                    pedido.idpedidoproduccion,
                ) === Number(id),
        );

    const alternarSeleccion = (pedido) => {
        setSeleccionados((prev) => {
            const existe = prev.some(
                (item) =>
                    Number(
                        item.idpedidoproduccion,
                    ) ===
                    Number(
                        pedido.idpedidoproduccion,
                    ),
            );

            if (existe) {
                return prev
                    .filter(
                        (item) =>
                            Number(
                                item.idpedidoproduccion,
                            ) !==
                            Number(
                                pedido.idpedidoproduccion,
                            ),
                    )
                    .map((item, index) => ({
                        ...item,
                        orden_entrega:
                            index + 1,
                    }));
            }

            return [
                ...prev,
                {
                    ...pedido,
                    orden_entrega:
                        prev.length + 1,
                    hora_entrega: "",
                    observaciones_programacion:
                        "",
                },
            ];
        });
    };

    const seleccionarTodos = () => {
        const visibles =
            pedidosFiltrados.filter(
                (pedido) =>
                    !estaSeleccionado(
                        pedido.idpedidoproduccion,
                    ),
            );

        if (visibles.length === 0) {
            return;
        }

        setSeleccionados((prev) => {
            const nuevos = [
                ...prev,
                ...visibles.map(
                    (pedido, index) => ({
                        ...pedido,
                        orden_entrega:
                            prev.length +
                            index +
                            1,
                        hora_entrega: "",
                        observaciones_programacion:
                            "",
                    }),
                ),
            ];

            return nuevos;
        });
    };

    const limpiarSeleccion = () => {
        setSeleccionados([]);
    };

    const seleccionarRuta = (value) => {
        setIdruta(value);

        const ruta =
            rutas.find(
                (item) =>
                    Number(item.idruta) ===
                    Number(value),
            );

        if (!ruta) {
            return;
        }

        setIdvehiculo(
            ruta.idvehiculo_default
                ? String(
                      ruta.idvehiculo_default,
                  )
                : "",
        );

        setIdpiloto(
            ruta.idpiloto_default
                ? String(
                      ruta.idpiloto_default,
                  )
                : "",
        );

        setHoraSalida(
            ruta.hora_salida_default
                ? String(
                      ruta.hora_salida_default,
                  ).substring(0, 5)
                : "",
        );
    };

    const actualizarPedidoProgramacion = (
        id,
        campo,
        valor,
    ) => {
        setSeleccionados((prev) =>
            prev.map((pedido) =>
                Number(
                    pedido.idpedidoproduccion,
                ) === Number(id)
                    ? {
                          ...pedido,
                          [campo]: valor,
                      }
                    : pedido,
            ),
        );
    };

    const moverPedido = (
        index,
        direccion,
    ) => {
        setSeleccionados((prev) => {
            const nuevo = [...prev];

            const nuevoIndex =
                direccion === "ARRIBA"
                    ? index - 1
                    : index + 1;

            if (
                nuevoIndex < 0 ||
                nuevoIndex >= nuevo.length
            ) {
                return prev;
            }

            [
                nuevo[index],
                nuevo[nuevoIndex],
            ] = [
                nuevo[nuevoIndex],
                nuevo[index],
            ];

            return nuevo.map(
                (pedido, idx) => ({
                    ...pedido,
                    orden_entrega:
                        idx + 1,
                }),
            );
        });
    };

    const eliminarSeleccionado = (id) => {
        setSeleccionados((prev) =>
            prev
                .filter(
                    (pedido) =>
                        Number(
                            pedido.idpedidoproduccion,
                        ) !== Number(id),
                )
                .map((pedido, index) => ({
                    ...pedido,
                    orden_entrega:
                        index + 1,
                })),
        );
    };

    const guardarProgramacion = async () => {
        if (!fecha) {
            alertify.warning(
                "Debe seleccionar la fecha.",
            );
            return;
        }

        if (!idruta) {
            alertify.warning(
                "Debe seleccionar una ruta.",
            );
            return;
        }

        if (!idvehiculo) {
            alertify.warning(
                "Debe seleccionar un vehículo.",
            );
            return;
        }

        if (!idpiloto) {
            alertify.warning(
                "Debe seleccionar un piloto.",
            );
            return;
        }

        if (
            seleccionados.length === 0
        ) {
            alertify.warning(
                "Debe seleccionar al menos un pedido.",
            );
            return;
        }

        const payload = {
            idruta: Number(idruta),

            fecha,

            hora_salida:
                horaSalida || null,

            idvehiculo:
                Number(idvehiculo),

            idpiloto:
                Number(idpiloto),

            // encargado:
            //     encargado.trim() || null,

            observaciones:
                observaciones.trim() ||
                null,

            pedidos:
                seleccionados.map(
                    (pedido, index) => ({
                        idpedidoproduccion:
                            Number(
                                pedido.idpedidoproduccion,
                            ),

                        orden_entrega:
                            index + 1,

                        hora_entrega:
                            pedido.hora_entrega ||
                            null,

                        observaciones:
                            pedido.observaciones_programacion?.trim() ||
                            null,
                    }),
                ),
        };

        alertify.confirm(
            "Programar ruta",
            `¿Desea programar ${seleccionados.length} pedido(s) en la ruta seleccionada?`,
            async () => {
                setSaving(true);

                try {
                    const response =
                        await axios.post(
                            "/api/logistica-ventas/programaciones",
                            payload,
                            { headers },
                        );

                    alertify.success(
                        response.data
                            ?.message ||
                            "Ruta programada correctamente.",
                    );

                    setSeleccionados([]);
                    setObservaciones("");
                    setEncargado("");

                    await cargarInicial();
                } catch (error) {
                    console.error(error);

                    alertify.error(
                        error?.response
                            ?.data
                            ?.message ||
                            "No se pudo programar la ruta.",
                    );
                } finally {
                    setSaving(false);
                }
            },
            () => {},
        );
    };

    const formatearFecha = (valor) => {
        if (!valor) return "—";

        const [year, month, day] =
            String(valor)
                .substring(0, 10)
                .split("-");

        if (
            !year ||
            !month ||
            !day
        ) {
            return valor;
        }

        return `${day}/${month}/${year}`;
    };

    return (
        <div className="gp-module-page gp-logventas-page">
            <div className="gp-module-card gp-logventas-card">
                <div className="gp-logventas-header">
                    <div className="gp-logventas-heading">
                        <div className="gp-logventas-heading-icon">
                            <Truck size={22} />
                        </div>

                        <div>
                            <div className="gp-module-meta">
                                LOGÍSTICA · VENTAS
                            </div>

                            <h1>
                                Programación
                            </h1>

                            <p>
                                Organiza los pedidos aprobados por Contabilidad y asígnalos a una ruta de entrega.
                            </p>
                        </div>
                    </div>
                </div>

                <section className="gp-logventas-section">
                    <div className="gp-logventas-section-header">
                        <div>
                            <ClipboardList
                                size={16}
                            />

                            <div>
                                <strong>
                                    Pedidos pendientes
                                </strong>

                                <span>
                                    Pedidos aprobados que aún no han sido programados.
                                </span>
                            </div>
                        </div>

                        <span className="gp-logventas-count">
                            {
                                pedidosFiltrados.length
                            }{" "}
                            pendientes
                        </span>
                    </div>

                    <div className="gp-logventas-search-row">
                        <div className="gp-logventas-search">
                            <Search size={15} />

                            <input
                                type="text"
                                value={filtro}
                                onChange={(e) =>
                                    setFiltro(
                                        e.target.value,
                                    )
                                }
                                placeholder="Pedido, cliente, asesor, dirección..."
                            />

                            {filtro && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFiltro("")
                                    }
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="gp-logventas-search-actions">
                            <button
                                type="button"
                                className="gp-logventas-btn-secondary"
                                onClick={
                                    seleccionarTodos
                                }
                                disabled={
                                    pedidosFiltrados.length ===
                                    0
                                }
                            >
                                <CheckSquare
                                    size={14}
                                />
                                Seleccionar visibles
                            </button>

                            <button
                                type="button"
                                className="gp-logventas-btn-secondary"
                                onClick={
                                    cargarInicial
                                }
                                disabled={
                                    loading
                                }
                            >
                                <RefreshCw
                                    size={14}
                                />
                                Actualizar
                            </button>
                        </div>
                    </div>

                    <div className="gp-logventas-table-wrapper">
                        <table className="gp-logventas-table">
                            <thead>
                                <tr>
                                    <th className="gp-logventas-check-cell"></th>
                                    <th>
                                        Pedido
                                    </th>
                                    <th>
                                        Fecha entrega
                                    </th>
                                    <th>
                                        Cliente
                                    </th>
                                    <th>
                                        Asesor
                                    </th>
                                    <th>
                                        Dirección
                                    </th>
                                    <th>
                                        Envío
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="gp-logventas-message"
                                        >
                                            Cargando pedidos...
                                        </td>
                                    </tr>
                                ) : pedidosFiltrados.length ===
                                  0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="gp-logventas-message"
                                        >
                                            No existen pedidos pendientes de programación.
                                        </td>
                                    </tr>
                                ) : (
                                    pedidosFiltrados.map(
                                        (pedido) => {
                                            const seleccionado =
                                                estaSeleccionado(
                                                    pedido.idpedidoproduccion,
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
                                                    onClick={() =>
                                                        alternarSeleccion(
                                                            pedido,
                                                        )
                                                    }
                                                >
                                                    <td className="gp-logventas-check-cell">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                seleccionado
                                                            }
                                                            onChange={() =>
                                                                alternarSeleccion(
                                                                    pedido,
                                                                )
                                                            }
                                                            onClick={(
                                                                e,
                                                            ) =>
                                                                e.stopPropagation()
                                                            }
                                                        />
                                                    </td>

                                                    <td className="gp-logventas-order">
                                                        {
                                                            pedido.nopedido
                                                        }
                                                    </td>

                                                    <td>
                                                        {formatearFecha(
                                                            pedido.fecha_entrega,
                                                        )}
                                                    </td>

                                                    <td>
                                                        {
                                                            pedido.cliente
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            pedido.asesor
                                                        }
                                                    </td>

                                                    <td className="gp-logventas-address">
                                                        {pedido.direccion_entrega ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {pedido.no_envio_asociado ||
                                                            "—"}
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="gp-logventas-section">
                    <div className="gp-logventas-section-header">
                        <div>
                            <MapPinned
                                size={16}
                            />

                            <div>
                                <strong>
                                    Programar ruta
                                </strong>

                                <span>
                                    Define la salida y el orden de los pedidos seleccionados.
                                </span>
                            </div>
                        </div>

                        <span className="gp-logventas-count">
                            {
                                seleccionados.length
                            }{" "}
                            seleccionados
                        </span>
                    </div>

                    <div className="gp-logventas-form-grid">
                        <div className="gp-logventas-field">
                            <label>
                                Fecha
                                <span>*</span>
                            </label>

                            <div className="gp-logventas-input-icon">
                                <CalendarDays
                                    size={14}
                                />

                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={(e) =>
                                        setFecha(
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="gp-logventas-field">
                            <label>
                                Ruta
                                <span>*</span>
                            </label>

                            <div className="gp-logventas-input-icon">
                                <Route size={14} />

                                <select
                                    value={idruta}
                                    onChange={(e) =>
                                        seleccionarRuta(
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">
                                        Seleccione...
                                    </option>

                                    {rutas.map(
                                        (ruta) => (
                                            <option
                                                key={
                                                    ruta.idruta
                                                }
                                                value={
                                                    ruta.idruta
                                                }
                                            >
                                                {
                                                    ruta.nombre
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="gp-logventas-field">
                            <label>
                                Hora salida
                            </label>

                            <div className="gp-logventas-input-icon">
                                <Clock3
                                    size={14}
                                />

                                <input
                                    type="time"
                                    value={
                                        horaSalida
                                    }
                                    onChange={(e) =>
                                        setHoraSalida(
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="gp-logventas-field">
                            <label>
                                Vehículo
                                <span>*</span>
                            </label>

                            <div className="gp-logventas-input-icon">
                                <Truck size={14} />

                                <select
                                    value={
                                        idvehiculo
                                    }
                                    onChange={(e) =>
                                        setIdvehiculo(
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">
                                        Seleccione...
                                    </option>

                                    {vehiculos.map(
                                        (
                                            vehiculo,
                                        ) => (
                                            <option
                                                key={
                                                    vehiculo.idvehiculo
                                                }
                                                value={
                                                    vehiculo.idvehiculo
                                                }
                                            >
                                                {
                                                    vehiculo.nombre
                                                }
                                                {vehiculo.placa
                                                    ? ` · ${vehiculo.placa}`
                                                    : ""}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="gp-logventas-field">
                            <label>
                                Piloto
                                <span>*</span>
                            </label>

                            <div className="gp-logventas-input-icon">
                                <UserRound
                                    size={14}
                                />

                                <select
                                    value={
                                        idpiloto
                                    }
                                    onChange={(e) =>
                                        setIdpiloto(
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">
                                        Seleccione...
                                    </option>

                                    {pilotos.map(
                                        (piloto) => (
                                            <option
                                                key={
                                                    piloto.idpiloto
                                                }
                                                value={
                                                    piloto.idpiloto
                                                }
                                            >
                                                {
                                                    piloto.nombre
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* <div className="gp-logventas-field">
                            <label>
                                Encargado
                            </label>

                            <input
                                type="text"
                                value={encargado}
                                onChange={(e) =>
                                    setEncargado(
                                        e.target.value,
                                    )
                                }
                                maxLength={150}
                                placeholder="Opcional"
                            />
                        </div> */}

                        {/* <div className="gp-logventas-field gp-logventas-field-full">
                            <label>
                                Observaciones de la ruta
                            </label>

                            <textarea
                                rows={2}
                                value={
                                    observaciones
                                }
                                onChange={(e) =>
                                    setObservaciones(
                                        e.target.value,
                                    )
                                }
                                placeholder="Indicaciones generales para la salida..."
                            />
                        </div> */}
                    </div>

                    <div className="gp-logventas-selected-header">
                        <div>
                            <strong>
                                Orden de entregas
                            </strong>

                            {/* <span>
                                Define hora y observaciones por pedido.
                            </span> */}
                        </div>

                        {seleccionados.length >
                            0 && (
                            <button
                                type="button"
                                className="gp-logventas-btn-secondary"
                                onClick={
                                    limpiarSeleccion
                                }
                            >
                                <X size={14} />
                                Limpiar selección
                            </button>
                        )}
                    </div>

                    <div className="gp-logventas-table-wrapper">
                        <table className="gp-logventas-table gp-logventas-selected-table">
                            <thead>
                                <tr>
                                    <th>
                                        Orden
                                    </th>
                                    <th>
                                        Pedido
                                    </th>
                                    <th>
                                        Cliente
                                    </th>
                                    <th>
                                        Hora entrega
                                    </th>
                                    {/* <th>
                                        Observaciones
                                    </th> */}
                                    <th className="gp-logventas-actions-cell">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {seleccionados.length ===
                                0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="gp-logventas-message"
                                        >
                                            Selecciona pedidos del listado superior para agregarlos a la ruta.
                                        </td>
                                    </tr>
                                ) : (
                                    seleccionados.map(
                                        (
                                            pedido,
                                            index,
                                        ) => (
                                            <tr
                                                key={
                                                    pedido.idpedidoproduccion
                                                }
                                            >
                                                <td>
                                                    <span className="gp-logventas-order-badge">
                                                        {index +
                                                            1}
                                                    </span>
                                                </td>

                                                <td className="gp-logventas-order">
                                                    {
                                                        pedido.nopedido
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        pedido.cliente
                                                    }
                                                </td>

                                                <td>
                                                    <input
                                                        type="time"
                                                        value={
                                                            pedido.hora_entrega ||
                                                            ""
                                                        }
                                                        onChange={(
                                                            e,
                                                        ) =>
                                                            actualizarPedidoProgramacion(
                                                                pedido.idpedidoproduccion,
                                                                "hora_entrega",
                                                                e
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        className="gp-logventas-inline-input"
                                                    />
                                                </td>

                                                <td>
                                                    <input
                                                        type="text"
                                                        value={
                                                            pedido.observaciones_programacion ||
                                                            ""
                                                        }
                                                        onChange={(
                                                            e,
                                                        ) =>
                                                            actualizarPedidoProgramacion(
                                                                pedido.idpedidoproduccion,
                                                                "observaciones_programacion",
                                                                e
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        className="gp-logventas-inline-input gp-logventas-inline-wide"
                                                        placeholder="Observaciones..."
                                                    />
                                                </td>

                                                <td className="gp-logventas-actions-cell">
                                                    <div className="gp-logventas-row-actions">
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                index ===
                                                                0
                                                            }
                                                            onClick={() =>
                                                                moverPedido(
                                                                    index,
                                                                    "ARRIBA",
                                                                )
                                                            }
                                                            title="Subir"
                                                        >
                                                            ↑
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                index ===
                                                                seleccionados.length -
                                                                    1
                                                            }
                                                            onClick={() =>
                                                                moverPedido(
                                                                    index,
                                                                    "ABAJO",
                                                                )
                                                            }
                                                            title="Bajar"
                                                        >
                                                            ↓
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="danger"
                                                            onClick={() =>
                                                                eliminarSeleccionado(
                                                                    pedido.idpedidoproduccion,
                                                                )
                                                            }
                                                            title="Quitar"
                                                        >
                                                            <X
                                                                size={
                                                                    13
                                                                }
                                                            />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ),
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="gp-logventas-footer">
                        <div>
                            <strong>
                                {
                                    seleccionados.length
                                }{" "}
                                pedido(s)
                            </strong>

                            <span>
                                serán asociados a esta salida.
                            </span>
                        </div>

                        <button
                            type="button"
                            className="gp-logventas-save"
                            onClick={
                                guardarProgramacion
                            }
                            disabled={
                                saving ||
                                seleccionados.length ===
                                    0
                            }
                        >
                            <Route size={15} />

                            {saving
                                ? "Programando..."
                                : "Programar ruta"}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default ProgramacionLogisticaVentas;