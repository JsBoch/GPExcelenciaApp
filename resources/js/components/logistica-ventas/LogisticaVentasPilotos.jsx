import React, { useEffect, useMemo, useState } from "react";

import axios from "axios";
import alertify from "alertifyjs";

import {
    Edit3,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    UserRound,
    X,
} from "lucide-react";

import "../../../css/logistica-ventas-catalogos.css";

function LogisticaVentasPilotos() {
    const [pilotos, setPilotos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

    const [form, setForm] = useState({
        nombre: "",
        telefono: "",
        licencia: "",
        observaciones: "",
    });

    const headers = useMemo(() => {
        const token = localStorage.getItem("token");

        return {
            Authorization: `Bearer ${token}`,
        };
    }, []);

    useEffect(() => {
        cargarPilotos();
    }, []);

    const cargarPilotos = async () => {
        setLoading(true);

        try {
            const response = await axios.get(
                "/api/logistica-ventas/pilotos",
                { headers },
            );

            setPilotos(
                Array.isArray(response.data)
                    ? response.data
                    : [],
            );
        } catch (error) {
            console.error(error);

            alertify.error(
                "No se pudieron cargar los pilotos.",
            );
        } finally {
            setLoading(false);
        }
    };

    const limpiarForm = () => {
        setForm({
            nombre: "",
            telefono: "",
            licencia: "",
            observaciones: "",
        });

        setRegistroSeleccionado(null);
        setModoEdicion(false);
    };

    const abrirNuevo = () => {
        limpiarForm();
        setModalOpen(true);
    };

    const abrirEditar = (piloto) => {
        setRegistroSeleccionado(piloto);
        setModoEdicion(true);

        setForm({
            nombre: piloto.nombre || "",
            telefono: piloto.telefono || "",
            licencia: piloto.licencia || "",
            observaciones: piloto.observaciones || "",
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
                "Debe ingresar el nombre del piloto.",
            );
            return;
        }

        setGuardando(true);

        const payload = {
            nombre: form.nombre.trim(),
            telefono: form.telefono.trim() || null,
            licencia: form.licencia.trim() || null,
            observaciones: form.observaciones.trim() || null,
        };

        try {
            let response;

            if (modoEdicion && registroSeleccionado) {
                response = await axios.put(
                    `/api/logistica-ventas/pilotos/${registroSeleccionado.idpiloto}`,
                    payload,
                    { headers },
                );
            } else {
                response = await axios.post(
                    "/api/logistica-ventas/pilotos",
                    payload,
                    { headers },
                );
            }

            alertify.success(
                response.data?.message ||
                    "Piloto guardado correctamente.",
            );

            setModalOpen(false);
            limpiarForm();

            await cargarPilotos();
        } catch (error) {
            console.error(error);

            alertify.error(
                error?.response?.data?.message ||
                    "No se pudo guardar el piloto.",
            );
        } finally {
            setGuardando(false);
        }
    };

    const desactivar = (piloto) => {
        alertify.confirm(
            "Desactivar piloto",
            `¿Desea desactivar ${piloto.nombre}?`,
            async () => {
                try {
                    const response = await axios.put(
                        `/api/logistica-ventas/pilotos/${piloto.idpiloto}/desactivar`,
                        {},
                        { headers },
                    );

                    alertify.success(
                        response.data?.message ||
                            "Piloto desactivado.",
                    );

                    await cargarPilotos();
                } catch (error) {
                    console.error(error);

                    alertify.error(
                        error?.response?.data?.message ||
                            "No se pudo desactivar el piloto.",
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
                                Administración de pilotos para rutas de entrega
                            </span>
                        </div>

                        <button
                            type="button"
                            className="gp-action-button gp-action-save"
                            onClick={abrirNuevo}
                        >
                            <Plus size={14} />
                            NUEVO PILOTO
                        </button>
                    </div>

                    <section className="gp-logcat-section">

                        <div className="gp-logcat-section-header">
                            <div>
                                <UserRound size={16} />

                                <div>
                                    <strong>Pilotos activos</strong>

                                    <span>
                                        Personal disponible para asignación de rutas.
                                    </span>
                                </div>
                            </div>

                            <div className="gp-logcat-section-actions">
                                <span className="gp-logcat-count">
                                    {pilotos.length} pilotos
                                </span>

                                <button
                                    type="button"
                                    onClick={cargarPilotos}
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
                                        <th>Teléfono</th>
                                        <th>Licencia</th>
                                        <th>Observaciones</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="gp-logcat-empty"
                                            >
                                                Cargando pilotos...
                                            </td>
                                        </tr>
                                    ) : pilotos.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="gp-logcat-empty"
                                            >
                                                No hay pilotos registrados.
                                            </td>
                                        </tr>
                                    ) : (
                                        pilotos.map((piloto) => (
                                            <tr key={piloto.idpiloto}>
                                                <td className="gp-logcat-name">
                                                    {piloto.nombre}
                                                </td>

                                                <td>
                                                    {piloto.telefono || "—"}
                                                </td>

                                                <td>
                                                    {piloto.licencia || "—"}
                                                </td>

                                                <td>
                                                    {piloto.observaciones || "—"}
                                                </td>

                                                <td>
                                                    <div className="gp-logcat-actions">
                                                        <button
                                                            type="button"
                                                            className="edit"
                                                            onClick={() =>
                                                                abrirEditar(piloto)
                                                            }
                                                        >
                                                            <Edit3 size={13} />
                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="delete"
                                                            onClick={() =>
                                                                desactivar(piloto)
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
                                        ? "Editar piloto"
                                        : "Nuevo piloto"}
                                </strong>

                                <span>
                                    Información del piloto de logística.
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
                                <label>Teléfono</label>

                                <input
                                    type="text"
                                    value={form.telefono}
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "telefono",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div className="gp-logcat-field">
                                <label>Licencia</label>

                                <input
                                    type="text"
                                    value={form.licencia}
                                    onChange={(e) =>
                                        actualizarCampo(
                                            "licencia",
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
                                    : "Guardar piloto"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

export default LogisticaVentasPilotos;