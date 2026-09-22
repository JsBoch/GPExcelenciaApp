import React, { useEffect, useMemo, useState } from "react";

import axios from "axios";
import alertify from "alertifyjs";

import {
    Edit3,
    MapPinned,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    Truck,
    UserRound,
    X,
} from "lucide-react";

import "../../../css/logistica-ventas-rutas.css";

function LogisticaVentasRutas() {
    const [rutas, setRutas] = useState([]);
    const [vehiculos, setVehiculos] = useState([]);
    const [pilotos, setPilotos] = useState([]);

    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [rutaSeleccionada, setRutaSeleccionada] = useState(null);

    const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    idvehiculo_default: "",
    idpiloto_default: "",
});

    const headers = useMemo(() => {
        const token = localStorage.getItem("token");

        return {
            Authorization: `Bearer ${token}`,
        };
    }, []);

    useEffect(() => {
        cargarTodo();
    }, []);

    const cargarTodo = async () => {
        setLoading(true);

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
        } finally {
            setLoading(false);
        }
    };

    const limpiarForm = () => {
       setForm({
    nombre: "",
    descripcion: "",
    idvehiculo_default: "",
    idpiloto_default: "",
});

        setRutaSeleccionada(null);
        setModoEdicion(false);
    };

    const abrirNuevaRuta = () => {
        limpiarForm();
        setModalOpen(true);
    };

    const abrirEditarRuta = (ruta) => {
        setRutaSeleccionada(ruta);
        setModoEdicion(true);

        setForm({
            nombre: ruta.nombre || "",

            descripcion: ruta.descripcion || "",

            idvehiculo_default: ruta.idvehiculo_default
                ? String(ruta.idvehiculo_default)
                : "",

            idpiloto_default: ruta.idpiloto_default
                ? String(ruta.idpiloto_default)
                : "",

            // hora_salida_default: ruta.hora_salida_default
            //     ? String(ruta.hora_salida_default).substring(0, 5)
            //     : "",
        });

        setModalOpen(true);
    };

    const actualizarCampo = (campo, valor) => {
        setForm((prev) => ({
            ...prev,
            [campo]: valor,
        }));
    };

    const guardarRuta = async () => {
        if (!form.nombre.trim()) {
            alertify.warning("Debe ingresar el nombre de la ruta.");
            return;
        }

        setGuardando(true);

        const payload = {
            nombre: form.nombre.trim(),

            descripcion: form.descripcion.trim() || null,

            idvehiculo_default: form.idvehiculo_default
                ? Number(form.idvehiculo_default)
                : null,

            idpiloto_default: form.idpiloto_default
                ? Number(form.idpiloto_default)
                : null,

                    };

        try {
            let response;

            if (modoEdicion && rutaSeleccionada) {
                response = await axios.put(
                    `/api/logistica-ventas/rutas/${rutaSeleccionada.idruta}`,
                    payload,
                    { headers },
                );
            } else {
                response = await axios.post(
                    "/api/logistica-ventas/rutas",
                    payload,
                    { headers },
                );
            }

            alertify.success(
                response.data?.message || "Ruta guardada correctamente.",
            );

            setModalOpen(false);
            limpiarForm();

            await cargarTodo();
        } catch (error) {
            console.error(error);

            alertify.error(
                error?.response?.data?.message || "No se pudo guardar la ruta.",
            );
        } finally {
            setGuardando(false);
        }
    };

    const desactivarRuta = (ruta) => {
        alertify.confirm(
            "Desactivar ruta",
            `¿Desea desactivar ${ruta.nombre}?`,
            async () => {
                try {
                    const response = await axios.put(
                        `/api/logistica-ventas/rutas/${ruta.idruta}/desactivar`,
                        {},
                        { headers },
                    );

                    alertify.success(
                        response.data?.message || "Ruta desactivada.",
                    );

                    await cargarTodo();
                } catch (error) {
                    console.error(error);

                    alertify.error(
                        error?.response?.data?.message ||
                            "No se pudo desactivar la ruta.",
                    );
                }
            },
            () => {},
        );
    };

    const buscarNombreVehiculo = (ruta) => {
        if (ruta.vehiculo_default) {
            return ruta.vehiculo_default;
        }

        const vehiculo = vehiculos.find(
            (item) =>
                Number(item.idvehiculo) === Number(ruta.idvehiculo_default),
        );

        if (!vehiculo) {
            return "—";
        }

        return `${vehiculo.nombre}${
            vehiculo.placa ? ` · ${vehiculo.placa}` : ""
        }`;
    };

    const buscarNombrePiloto = (ruta) => {
        if (ruta.piloto_default) {
            return ruta.piloto_default;
        }

        const piloto = pilotos.find(
            (item) => Number(item.idpiloto) === Number(ruta.idpiloto_default),
        );

        return piloto?.nombre || "—";
    };

    return (
        <div className="gp-module-page gp-rutas-page">
            <div className="gp-module-card">
                <div className="card-body">
                    {/* =====================================
                    META HEADER
                ====================================== */}

                    <div className="erp-meta-header d-flex justify-content-between align-items-center">
                        <div>
                            <span className="erp-badge">
                                Módulo · Logística de Ventas
                            </span>

                            <span className="text-muted small d-block">
                                Administración de rutas para programación de
                                entregas
                            </span>
                        </div>

                        <button
                            type="button"
                            className="gp-action-button gp-action-save"
                            onClick={abrirNuevaRuta}
                        >
                            <Plus size={14} />
                            NUEVA RUTA
                        </button>
                    </div>

                    {/* =====================================
                    LISTADO DE RUTAS
                ====================================== */}

                    <section className="gp-rutas-section">
                        <div className="gp-rutas-section-header">
                            <div>
                                <MapPinned size={16} />

                                <div>
                                    <strong>Rutas activas</strong>

                                    <span>
                                        Configuración disponible para
                                        programación de entregas.
                                    </span>
                                </div>
                            </div>

                            <div className="gp-rutas-section-actions">
                                <span className="gp-rutas-count">
                                    {rutas.length} rutas
                                </span>

                                <button
                                    type="button"
                                    onClick={cargarTodo}
                                    disabled={loading}
                                >
                                    <RefreshCw size={14} />
                                    Actualizar
                                </button>
                            </div>
                        </div>

                        <div className="gp-rutas-table-wrapper">
                            <table className="gp-rutas-table">
                                <thead>
                                    <tr>
                                        <th>Ruta</th>
                                        <th>Descripción</th>
                                        <th>Vehículo</th>
                                        <th>Piloto</th>
                                        {/* <th>Hora salida</th> */}
                                        <th>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="gp-rutas-empty"
                                            >
                                                Cargando rutas...
                                            </td>
                                        </tr>
                                    ) : rutas.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="gp-rutas-empty"
                                            >
                                                No hay rutas registradas.
                                            </td>
                                        </tr>
                                    ) : (
                                        rutas.map((ruta) => (
                                            <tr key={ruta.idruta}>
                                                <td className="gp-rutas-name">
                                                    {ruta.nombre}
                                                </td>

                                                <td>
                                                    {ruta.descripcion || "—"}
                                                </td>

                                                <td>
                                                    <div className="gp-rutas-inline">
                                                        <Truck size={13} />
                                                        {buscarNombreVehiculo(
                                                            ruta,
                                                        )}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="gp-rutas-inline">
                                                        <UserRound size={13} />
                                                        {buscarNombrePiloto(
                                                            ruta,
                                                        )}
                                                    </div>
                                                </td>

                                                {/* <td>
                                                    {ruta.hora_salida_default
                                                        ? String(
                                                              ruta.hora_salida_default,
                                                          ).substring(0, 5)
                                                        : "—"}
                                                </td> */}

                                                <td>
                                                    <div className="gp-rutas-actions">
                                                        <button
                                                            type="button"
                                                            className="edit"
                                                            onClick={() =>
                                                                abrirEditarRuta(
                                                                    ruta,
                                                                )
                                                            }
                                                        >
                                                            <Edit3 size={13} />
                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="delete"
                                                            onClick={() =>
                                                                desactivarRuta(
                                                                    ruta,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 size={13} />
                                                            Desactivar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>

            {modalOpen && (
                <div className="gp-rutas-modal-backdrop">
                    <div className="gp-rutas-modal">
                        <div className="gp-rutas-modal-header">
                            <div>
                                <strong>
                                    {modoEdicion ? "Editar ruta" : "Nueva ruta"}
                                </strong>

                                <span>
                                    Configura los valores predeterminados de la
                                    ruta.
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                            >
                                <X size={17} />
                            </button>
                        </div>

                        <div className="gp-rutas-form">
                            <div className="gp-rutas-field">
                                <label>Nombre *</label>

                                <input
                                    type="text"
                                    value={form.nombre}
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "nombre",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Ej. Ruta 2"
                                />
                            </div>

                            {/* <div className="gp-rutas-field">
                                <label>Hora de salida</label>

                                <input
                                    type="time"
                                    value={form.hora_salida_default}
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "hora_salida_default",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div> */}

                            <div className="gp-rutas-field">
                                <label>Vehículo predeterminado</label>

                                <select
                                    value={form.idvehiculo_default}
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "idvehiculo_default",
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

                            <div className="gp-rutas-field">
                                <label>Piloto predeterminado</label>

                                <select
                                    value={form.idpiloto_default}
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "idpiloto_default",
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

                            <div className="gp-rutas-field gp-rutas-field-full">
                                <label>Descripción</label>

                                <textarea
                                    rows={3}
                                    value={form.descripcion}
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "descripcion",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Descripción opcional de la ruta..."
                                />
                            </div>
                        </div>

                        <div className="gp-rutas-modal-footer">
                            <button
                                type="button"
                                className="gp-rutas-cancel"
                                onClick={() => setModalOpen(false)}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="gp-rutas-save"
                                disabled={guardando}
                                onClick={guardarRuta}
                            >
                                <Save size={14} />

                                {guardando ? "Guardando..." : "Guardar ruta"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LogisticaVentasRutas;
