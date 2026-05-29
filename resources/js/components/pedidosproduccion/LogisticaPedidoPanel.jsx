import React from "react";
import "../../../css/logistica_pedido_panel.css";

export default function LogisticaPedidoPanel({
    idCotizacion,
    areasSeleccionadas,
    toggleAreasModal,
    resumenEnvios,
    tieneNotaEnvio,
    envioSeleccionado,
    setEnvioSeleccionado,
    onRegistrarNotaEnvio,
    onReimprimirNotaEnvio,

    permisosEstado,
    permisosJustificacion,
    setPedidoProduccion,
    adjuntosPermisos = [],
    onAdjuntarPermisos,

    requiereInstalacion,
    requiereEntrega,
    montajesEstado,
    montajesJustificacion,
    adjuntosMontajes = [],
    onAdjuntarMontajes,
}) {
    const cantidadAreas = areasSeleccionadas?.length || 0;
    const cantidadEnvios = resumenEnvios?.length || 0;
    const cantidadPermisos = adjuntosPermisos?.length || 0;
    const cantidadMontajes = adjuntosMontajes?.length || 0;

    const handleInstalacionChange = (valor) => {
        setPedidoProduccion((prev) => ({
            ...prev,
            requiere_instalacion: valor,
            montajes_estado: valor === "S" ? prev.montajes_estado : "",
            montajes_justificacion:
                valor === "S" ? prev.montajes_justificacion : "",
        }));
    };

    return (
        <div className="border rounded p-4 mb-4 logistica-container shadow-sm">
            <div className="mb-4">
                <h5 className="mb-1 fw-bold">Logística del pedido</h5>

                <small className="text-muted d-block mb-3">
                    Áreas, permisos, montaje y nota de envío del pedido.
                </small>

                <button
                    type="button"
                    className={`btn ${
                        cantidadAreas > 0 ? "btn-areas-ok" : "btn-areas"
                    }`}
                    onClick={toggleAreasModal}
                >
                    {cantidadAreas > 0
                        ? `✓ Áreas asignadas (${cantidadAreas})`
                        : "Asignar áreas de producción"}
                </button>
            </div>

            {/* ========================= */}
            {/* NOTA DE ENVÍO */}
            {/* ========================= */}

            <div className="logistica-card">
                <div className="logistica-card-title">📦 Nota de envío</div>

                <div className="row g-3 align-items-end">
                    <div className="col-md-4">
                        {tieneNotaEnvio ? (
                            <div className="alert alert-success py-2 mb-0 fw-bold">
                                ✓ Tiene {cantidadEnvios} nota(s) de envío
                            </div>
                        ) : (
                            <div className="alert alert-danger py-2 mb-0 fw-bold">
                                Sin nota de envío
                            </div>
                        )}
                    </div>

                    <div className="col-md-4">
                        <label className="form-label fw-bold">
                            Nota asociada al pedido
                        </label>

                        <select
                            className="form-select"
                            value={envioSeleccionado || ""}
                            onChange={(e) =>
                                setEnvioSeleccionado(e.target.value)
                            }
                            disabled={!tieneNotaEnvio}
                        >
                            <option value="">-- Seleccionar envío --</option>

                            {resumenEnvios.map((envio) => (
                                <option
                                    key={envio.no_envio}
                                    value={envio.no_envio}
                                >
                                    Envío #{envio.no_envio}
                                    {envio.fecha_envio
                                        ? ` — ${new Date(envio.fecha_envio)
                                              .toISOString()
                                              .slice(0, 10)}`
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-4 d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-primary flex-fill fw-bold"
                            disabled={!idCotizacion}
                            onClick={onRegistrarNotaEnvio}
                        >
                            {tieneNotaEnvio
                                ? "Generar nueva"
                                : "Registrar nota"}
                        </button>

                        <button
                            type="button"
                            className="btn btn-outline-success flex-fill fw-bold"
                            disabled={!idCotizacion || !envioSeleccionado}
                            onClick={onReimprimirNotaEnvio}
                        >
                            Ver PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* ========================= */}
            {/* INSTALACIÓN */}
            {/* ========================= */}

            <div className="logistica-card">
                <div className="logistica-card-title">
                    🛠 Instalación, entrega y montajes
                </div>

                <div className="row g-3">
                    <div className="col-md-3">
                        <label className="form-label fw-bold">
                            ¿Requiere instalación?
                        </label>

                        <select
                            className="form-select"
                            value={requiereInstalacion || "N"}
                            onChange={(e) =>
                                handleInstalacionChange(e.target.value)
                            }
                        >
                            <option value="N">No</option>
                            <option value="S">Sí</option>
                        </select>

                        <label className="form-label fw-bold mt-3">
                            ¿Requiere entrega?
                        </label>

                        <select
                            className="form-select"
                            value={requiereEntrega || "N"}
                            onChange={(e) =>
                                setPedidoProduccion((prev) => ({
                                    ...prev,
                                    requiere_entrega: e.target.value,
                                }))
                            }
                        >
                            <option value="N">No</option>
                            <option value="S">Sí</option>
                        </select>
                    </div>

                    {requiereInstalacion === "S" && (
                        <>
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Estado montajes
                                </label>

                                <select
                                    className="form-select"
                                    value={montajesEstado || ""}
                                    onChange={(e) =>
                                        setPedidoProduccion((prev) => ({
                                            ...prev,
                                            montajes_estado: e.target.value,
                                            montajes_justificacion:
                                                e.target.value === "ADJUNTADO"
                                                    ? ""
                                                    : prev.montajes_justificacion,
                                        }))
                                    }
                                >
                                    <option value="">-- Seleccionar --</option>

                                    <option value="ADJUNTADO">
                                        Adjuntar montajes
                                    </option>

                                    <option value="PENDIENTE">
                                        Pendiente con justificación
                                    </option>
                                </select>
                            </div>

                            <div className="col-md-4">
                                <button
                                    type="button"
                                    className="btn btn-link fw-bold p-0 mb-2"
                                    disabled={montajesEstado !== "ADJUNTADO"}
                                    onClick={onAdjuntarMontajes}
                                >
                                    Adjuntar montajes
                                </button>

                                <div
                                    className={`alert py-2 mb-0 fw-bold ${
                                        cantidadMontajes > 0
                                            ? "alert-success"
                                            : "alert-warning"
                                    }`}
                                >
                                    {cantidadMontajes > 0
                                        ? `✓ ${cantidadMontajes} archivo(s)`
                                        : "Sin archivos"}
                                </div>
                            </div>

                            {montajesEstado === "PENDIENTE" && (
                                <div className="col-md-12">
                                    <label className="form-label fw-bold">
                                        Justificación montajes
                                    </label>

                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        value={montajesJustificacion || ""}
                                        onChange={(e) =>
                                            setPedidoProduccion((prev) => ({
                                                ...prev,
                                                montajes_justificacion:
                                                    e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ========================= */}
            {/* PERMISOS */}
            {/* ========================= */}

            <div className="logistica-card">
                <div className="logistica-card-title">📋 Permisos</div>

                <div className="row g-3 align-items-end">
                    <div className="col-md-4">
                        <label className="form-label fw-bold">
                            Estado permisos
                        </label>

                        <select
                            className="form-select"
                            value={permisosEstado || ""}
                            onChange={(e) => {
                                const value = e.target.value;

                                setPedidoProduccion((prev) => ({
                                    ...prev,
                                    permisos_estado: value,
                                    permisos_justificacion:
                                        value === "ADJUNTADO"
                                            ? ""
                                            : prev.permisos_justificacion,
                                }));
                            }}
                        >
                            <option value="">-- Seleccionar --</option>
                            <option value="ADJUNTADO">Adjuntar permisos</option>
                            <option value="PENDIENTE">
                                Pendiente con justificación
                            </option>
                            <option value="NO_REQUIERE">
                                No requiere permisos
                            </option>
                        </select>
                    </div>

                    <div className="col-md-4">
                        <label className="form-label fw-bold">
                            Archivos permisos
                        </label>

                        <div
                            className={`alert py-2 mb-0 fw-bold ${
                                cantidadPermisos > 0
                                    ? "alert-success"
                                    : "alert-warning"
                            }`}
                        >
                            {cantidadPermisos > 0
                                ? `✓ ${cantidadPermisos} archivo(s)`
                                : "Sin archivos"}
                        </div>
                    </div>

                    <div className="col-md-4">
                        <button
                            type="button"
                            className="btn btn-outline-primary w-100 fw-bold"
                            disabled={permisosEstado !== "ADJUNTADO"}
                            onClick={onAdjuntarPermisos}
                        >
                            Adjuntar permisos
                        </button>
                    </div>

                    {["PENDIENTE", "NO_REQUIERE"].includes(permisosEstado) && (
                        <div className="col-md-12">
                            <label className="form-label fw-bold">
                                Justificación permisos
                            </label>

                            <textarea
                                className="form-control"
                                rows="3"
                                value={permisosJustificacion || ""}
                                onChange={(e) =>
                                    setPedidoProduccion((prev) => ({
                                        ...prev,
                                        permisos_justificacion: e.target.value,
                                    }))
                                }
                                placeholder={
                                    permisosEstado === "NO_REQUIERE"
                                        ? "Ejemplo: El trabajo no requiere permisos municipales."
                                        : "Ejemplo: El cliente enviará el permiso firmado posteriormente."
                                }
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
