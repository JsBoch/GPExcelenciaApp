import React, { useEffect, useMemo, useState } from "react";

import axios from "axios";
import alertify from "alertifyjs";

import {
    Edit3,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    Truck,
    X,
} from "lucide-react";

import "../../../css/logistica-ventas-catalogos.css";

function LogisticaVentasVehiculos() {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

    const [form, setForm] = useState({
        nombre: "",
        placa: "",
        tipo: "",
        marca: "",
        modelo: "",
        observaciones: "",
    });

    const headers = useMemo(() => {
        const token = localStorage.getItem("token");

        return {
            Authorization: `Bearer ${token}`,
        };
    }, []);

    useEffect(() => {
        cargarVehiculos();
    }, []);

    const cargarVehiculos = async () => {
        setLoading(true);

        try {
            const response = await axios.get(
                "/api/logistica-ventas/vehiculos",
                { headers },
            );

            setVehiculos(
                Array.isArray(response.data)
                    ? response.data
                    : [],
            );
        } catch (error) {
            console.error(error);

            alertify.error(
                "No se pudieron cargar los vehículos.",
            );
        } finally {
            setLoading(false);
        }
    };

    const limpiarForm = () => {
        setForm({
            nombre: "",
            placa: "",
            tipo: "",
            marca: "",
            modelo: "",
            observaciones: "",
        });

        setRegistroSeleccionado(null);
        setModoEdicion(false);
    };

    const abrirNuevo = () => {
        limpiarForm();
        setModalOpen(true);
    };

    const abrirEditar = (vehiculo) => {
        setRegistroSeleccionado(vehiculo);
        setModoEdicion(true);

        setForm({
            nombre: vehiculo.nombre || "",
            placa: vehiculo.placa || "",
            tipo: vehiculo.tipo || "",
            marca: vehiculo.marca || "",
            modelo: vehiculo.modelo || "",
            observaciones: vehiculo.observaciones || "",
        });

        setModalOpen(true);
    };

    const actualizarCampo = (campo, valor) => {
        setForm((prev) => ({
            ...prev,
            [campo]: valor,
        }));
    };

    const guardar = async () => {
        if (!form.nombre.trim()) {
            alertify.warning(
                "Debe ingresar el nombre del vehículo.",
            );
            return;
        }

        if (!form.tipo) {
            alertify.warning(
                "Debe seleccionar el tipo de vehículo.",
            );
            return;
        }

        setGuardando(true);

        const payload = {
            nombre: form.nombre.trim(),
            placa: form.placa.trim() || null,
            tipo: form.tipo,
            marca: form.marca.trim() || null,
            modelo: form.modelo.trim() || null,
            observaciones: form.observaciones.trim() || null,
        };

        try {
            let response;

            if (modoEdicion && registroSeleccionado) {
                response = await axios.put(
                    `/api/logistica-ventas/vehiculos/${registroSeleccionado.idvehiculo}`,
                    payload,
                    { headers },
                );
            } else {
                response = await axios.post(
                    "/api/logistica-ventas/vehiculos",
                    payload,
                    { headers },
                );
            }

            alertify.success(
                response.data?.message ||
                    "Vehículo guardado correctamente.",
            );

            setModalOpen(false);
            limpiarForm();

            await cargarVehiculos();
        } catch (error) {
            console.error(error);

            alertify.error(
                error?.response?.data?.message ||
                    "No se pudo guardar el vehículo.",
            );
        } finally {
            setGuardando(false);
        }
    };

    const desactivar = (vehiculo) => {
        alertify.confirm(
            "Desactivar vehículo",
            `¿Desea desactivar ${vehiculo.nombre}?`,
            async () => {
                try {
                    const response = await axios.put(
                        `/api/logistica-ventas/vehiculos/${vehiculo.idvehiculo}/desactivar`,
                        {},
                        { headers },
                    );

                    alertify.success(
                        response.data?.message ||
                            "Vehículo desactivado.",
                    );

                    await cargarVehiculos();
                } catch (error) {
                    console.error(error);

                    alertify.error(
                        error?.response?.data?.message ||
                            "No se pudo desactivar el vehículo.",
                    );
                }
            },
            () => {},
        );
    };

    return (
        <div className="gp-module-page gp-logcat-page">
            <div className="gp-module-card">
                <div className="card-body">

                    <div className="erp-meta-header d-flex justify-content-between align-items-center">
                        <div>
                            <span className="erp-badge">
                                Módulo · Logística de Ventas
                            </span>

                            <span className="text-muted small d-block">
                                Administración de vehículos para rutas de entrega
                            </span>
                        </div>

                        <button
                            type="button"
                            className="gp-action-button gp-action-save"
                            onClick={abrirNuevo}
                        >
                            <Plus size={14} />
                            NUEVO VEHÍCULO
                        </button>
                    </div>

                    <section className="gp-logcat-section">

                        <div className="gp-logcat-section-header">
                            <div>
                                <Truck size={16} />

                                <div>
                                    <strong>Vehículos activos</strong>

                                    <span>
                                        Flota disponible para programación de rutas.
                                    </span>
                                </div>
                            </div>

                            <div className="gp-logcat-section-actions">
                                <span className="gp-logcat-count">
                                    {vehiculos.length} vehículos
                                </span>

                                <button
                                    type="button"
                                    onClick={cargarVehiculos}
                                    disabled={loading}
                                >
                                    <RefreshCw size={14} />
                                    Actualizar
                                </button>
                            </div>
                        </div>

                        <div className="gp-logcat-table-wrapper">
                            <table className="gp-logcat-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Placa</th>
                                        <th>Tipo</th>
                                        <th>Marca</th>
                                        <th>Modelo</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="gp-logcat-empty"
                                            >
                                                Cargando vehículos...
                                            </td>
                                        </tr>
                                    ) : vehiculos.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="gp-logcat-empty"
                                            >
                                                No hay vehículos registrados.
                                            </td>
                                        </tr>
                                    ) : (
                                        vehiculos.map((vehiculo) => (
                                            <tr key={vehiculo.idvehiculo}>
                                                <td className="gp-logcat-name">
                                                    {vehiculo.nombre}
                                                </td>

                                                <td>
                                                    {vehiculo.placa || "—"}
                                                </td>

                                                <td>
                                                    {vehiculo.tipo}
                                                </td>

                                                <td>
                                                    {vehiculo.marca || "—"}
                                                </td>

                                                <td>
                                                    {vehiculo.modelo || "—"}
                                                </td>

                                                <td>
                                                    <div className="gp-logcat-actions">
                                                        <button
                                                            type="button"
                                                            className="edit"
                                                            onClick={() =>
                                                                abrirEditar(vehiculo)
                                                            }
                                                        >
                                                            <Edit3 size={13} />
                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="delete"
                                                            onClick={() =>
                                                                desactivar(vehiculo)
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
                <div className="gp-logcat-modal-backdrop">
                    <div className="gp-logcat-modal">

                        <div className="gp-logcat-modal-header">
                            <div>
                                <strong>
                                    {modoEdicion
                                        ? "Editar vehículo"
                                        : "Nuevo vehículo"}
                                </strong>

                                <span>
                                    Información del vehículo de logística.
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                            >
                                <X size={17} />
                            </button>
                        </div>

                        <div className="gp-logcat-form">

                            <div className="gp-logcat-field">
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
                                />
                            </div>

                            <div className="gp-logcat-field">
                                <label>Placa</label>

                                <input
                                    type="text"
                                    value={form.placa}
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "placa",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div className="gp-logcat-field">
                                <label>Tipo *</label>

                                <select
                                    value={form.tipo}
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "tipo",
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">
                                        Seleccione...
                                    </option>

                                    <option value="MOTO">
                                        Moto
                                    </option>

                                    <option value="CARRO">
                                        Carro
                                    </option>

                                    <option value="PANEL">
                                        Panel
                                    </option>

                                    <option value="CAMION">
                                        Camión
                                    </option>
                                </select>
                            </div>

                            <div className="gp-logcat-field">
                                <label>Marca</label>

                                <input
                                    type="text"
                                    value={form.marca}
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "marca",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div className="gp-logcat-field">
                                <label>Modelo</label>

                                <input
                                    type="text"
                                    value={form.modelo}
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "modelo",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div className="gp-logcat-field gp-logcat-full">
                                <label>Observaciones</label>

                                <textarea
                                    rows={3}
                                    value={form.observaciones}
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "observaciones",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                        </div>

                        <div className="gp-logcat-modal-footer">
                            <button
                                type="button"
                                className="gp-logcat-cancel"
                                onClick={() => setModalOpen(false)}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="gp-logcat-save"
                                disabled={guardando}
                                onClick={guardar}
                            >
                                <Save size={14} />

                                {guardando
                                    ? "Guardando..."
                                    : "Guardar vehículo"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

export default LogisticaVentasVehiculos;