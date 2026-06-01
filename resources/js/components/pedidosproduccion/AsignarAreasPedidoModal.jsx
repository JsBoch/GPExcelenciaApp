import React from "react";

export default function AsignarAreasPedidoModal({
    isOpen,
    toggle,
    areasTrabajo,
    areasSeleccionadas,
    setAreasSeleccionadas,
    fechaProgramacion,
}) {
    if (!isOpen) return null;

    const handleToggleArea = (idArea) => {
        setAreasSeleccionadas((prev) =>
            prev.includes(idArea)
                ? prev.filter((x) => x !== idArea)
                : [...prev, idArea],
        );
    };

    return (
        <>
            <div className="modal fade show d-block" tabIndex="-1">
                <div className="modal-dialog modal-md modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                Asignar Áreas al Pedido
                            </h5>

                            <button
                                type="button"
                                className="btn-close"
                                onClick={toggle}
                            />
                        </div>

                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">
                                    Fecha programada
                                </label>

                                <input
                                    type="date"
                                    className="form-control"
                                    value={fechaProgramacion || ""}
                                    disabled
                                    readOnly
                                />
                            </div>

                            <div className="mb-2">
                                <strong>Áreas de trabajo</strong>
                            </div>

                            {areasTrabajo.length === 0 && (
                                <div className="alert alert-warning">
                                    No hay áreas activas disponibles.
                                </div>
                            )}

                            {areasTrabajo.map((area) => (
                                <div
                                    key={area.id_areatrabajo}
                                    className="form-check mb-2"
                                >
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`area-${area.id_areatrabajo}`}
                                        checked={areasSeleccionadas.includes(
                                            area.id_areatrabajo,
                                        )}
                                        onChange={() =>
                                            handleToggleArea(
                                                area.id_areatrabajo,
                                            )
                                        }
                                    />

                                    <label
                                        className="form-check-label"
                                        htmlFor={`area-${area.id_areatrabajo}`}
                                    >
                                        {area.nombre}
                                    </label>
                                </div>
                            ))}
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={toggle}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={toggle}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal-backdrop fade show"></div>
        </>
    );
}
