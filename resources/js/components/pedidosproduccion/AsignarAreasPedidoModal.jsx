import React from "react";
import {
    CalendarDays,
    Check,
    Factory,
    Layers3,
    X,
} from "lucide-react";

import "../../../css/asignar-areas-pedido-modal.css";

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
        const idNormalizado = Number(idArea);

        setAreasSeleccionadas((prev) => {
            const normalizadas = prev.map((x) =>
                Number(x)
            );

            return normalizadas.includes(idNormalizado)
                ? normalizadas.filter(
                      (x) => x !== idNormalizado
                  )
                : [
                      ...normalizadas,
                      idNormalizado,
                  ];
        });
    };

    const totalSeleccionadas =
        areasSeleccionadas.length;

    return (
        <>
            <div
                className="modal fade show d-block gp-areas-modal"
                tabIndex="-1"
                role="dialog"
                aria-modal="true"
            >
                <div className="modal-dialog modal-md modal-dialog-centered">
                    <div className="modal-content gp-areas-modal-content">

                        {/* HEADER */}

                        <div className="gp-areas-modal-header">
                            <div className="gp-areas-modal-heading">
                                <div className="gp-areas-modal-icon">
                                    <Factory size={18} />
                                </div>

                                <div>
                                    <span>
                                        PRODUCCIÓN
                                    </span>

                                    <h5>
                                        Asignar áreas al pedido
                                    </h5>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="gp-areas-close"
                                onClick={toggle}
                                title="Cerrar"
                            >
                                <X size={17} />
                            </button>
                        </div>


                        {/* BODY */}

                        <div className="modal-body gp-areas-modal-body">

                            {/* FECHA */}

                            <div className="gp-areas-date-block">
                                <div className="gp-areas-date-label">
                                    <CalendarDays size={15} />

                                    <span>
                                        Fecha programada
                                    </span>
                                </div>

                                <input
                                    type="date"
                                    className="form-control"
                                    value={
                                        fechaProgramacion ||
                                        ""
                                    }
                                    disabled
                                    readOnly
                                />
                            </div>


                            {/* CABECERA ÁREAS */}

                            <div className="gp-areas-section-heading">
                                <div>
                                    <Layers3 size={16} />

                                    <strong>
                                        Áreas de trabajo
                                    </strong>
                                </div>

                                <span
                                    className={
                                        totalSeleccionadas
                                            ? "gp-areas-count is-active"
                                            : "gp-areas-count"
                                    }
                                >
                                    {totalSeleccionadas} seleccionada
                                    {totalSeleccionadas !== 1
                                        ? "s"
                                        : ""}
                                </span>
                            </div>


                            {/* SIN ÁREAS */}

                            {areasTrabajo.length === 0 && (
                                <div className="gp-areas-empty">
                                    No hay áreas activas disponibles.
                                </div>
                            )}


                            {/* LISTADO */}

                            {areasTrabajo.length > 0 && (
                                <div className="gp-areas-list">
                                    {areasTrabajo.map(
                                        (area) => {
                                            const idArea =
                                                Number(
                                                    area.id_areatrabajo
                                                );

                                            const checked =
                                                areasSeleccionadas
                                                    .map((x) =>
                                                        Number(x)
                                                    )
                                                    .includes(
                                                        idArea
                                                    );

                                            return (
                                                <label
                                                    key={
                                                        area.id_areatrabajo
                                                    }
                                                    className={`gp-area-option ${
                                                        checked
                                                            ? "is-selected"
                                                            : ""
                                                    }`}
                                                    htmlFor={`area-${area.id_areatrabajo}`}
                                                >
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id={`area-${area.id_areatrabajo}`}
                                                        checked={
                                                            checked
                                                        }
                                                        onChange={() =>
                                                            handleToggleArea(
                                                                area.id_areatrabajo
                                                            )
                                                        }
                                                    />

                                                    <div className="gp-area-option-main">
                                                        <div className="gp-area-option-name">
                                                            {
                                                                area.nombre
                                                            }
                                                        </div>

                                                        <span>
                                                            Área de producción
                                                        </span>
                                                    </div>

                                                    {checked && (
                                                        <div className="gp-area-selected-icon">
                                                            <Check
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </label>
                                            );
                                        }
                                    )}
                                </div>
                            )}
                        </div>


                        {/* FOOTER */}

                        <div className="gp-areas-modal-footer">
                            <div className="gp-areas-footer-info">
                                {totalSeleccionadas > 0
                                    ? `${totalSeleccionadas} área${
                                          totalSeleccionadas !==
                                          1
                                              ? "s"
                                              : ""
                                      } asignada${
                                          totalSeleccionadas !==
                                          1
                                              ? "s"
                                              : ""
                                      }`
                                    : "Sin áreas seleccionadas"}
                            </div>

                            <div className="gp-areas-footer-actions">
                                <button
                                    type="button"
                                    className="gp-areas-cancel"
                                    onClick={toggle}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    className="gp-areas-confirm"
                                    onClick={toggle}
                                >
                                    <Check size={15} />

                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal-backdrop fade show gp-areas-backdrop" />
        </>
    );
}