import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";

function EnvioEditModal({
    open,
    onClose,
    noEnvio,
    direccionInicial,
    contactoInicial,
    contactosLista,
    token,
    itemsIniciales,
    onSubmit,
}) {
    const [direccion, setDireccion] = useState(direccionInicial || "");
    const [rows, setRows] = useState(itemsIniciales || []);
    const [idContacto, setIdContacto] = useState(contactoInicial || "");

    useEffect(() => {
        setDireccion(direccionInicial || "");
        setRows(itemsIniciales || []);
        setIdContacto(contactoInicial || "");
    }, [open, direccionInicial, itemsIniciales, contactoInicial]);

    if (!open) return null;

    return (
        <div
            className="modal d-block"
            style={{ background: "rgba(0,0,0,0.5)" }}
        >
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Editar envío #{noEnvio}</h5>
                        <button className="btn-close" onClick={onClose} />
                    </div>

                    <div className="modal-body">
                        {/* Dirección */}
                        <div className="mb-2">
                            <label className="form-label fw-bold">
                                Dirección
                            </label>
                            <textarea
                                className="form-control"
                                rows={3}
                                value={direccion}
                                onChange={(e) => setDireccion(e.target.value)}
                            />
                        </div>

                        {/* Contacto */}
                        <div className="mb-2">
                            <label className="form-label fw-bold">
                                Contacto
                            </label>
                            <select
                                className="form-select"
                                value={idContacto}
                                onChange={(e) => setIdContacto(e.target.value)}
                            >
                                <option value="">-- Seleccionar --</option>
                                {contactosLista.map((c) => (
                                    <option
                                        key={c.id_contactocliente}
                                        value={c.id_contactocliente}
                                    >
                                        {c.nombre} — {c.telefono}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Items */}
                        <div className="table-responsive">
                            <table className="table table-sm table-bordered align-middle">
                                <thead className="table-dark">
                                    <tr>
                                        <th style={{ width: 80 }}>Cant.</th>
                                        <th>Descripción</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={2}
                                                className="text-center text-muted"
                                            >
                                                Sin ítems
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((r, idx) => (
                                            <tr
                                                key={
                                                    r.iddetallecotizacion ?? idx
                                                }
                                            >
                                                <td style={{ width: 80 }}>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm text-end"
                                                        min={0}
                                                        step="0.01"
                                                        value={r.cantidad}
                                                        onChange={(e) => {
                                                            const v = Math.max(
                                                                0,
                                                                Number(
                                                                    e.target
                                                                        .value ||
                                                                        0
                                                                )
                                                            );
                                                            setRows((prev) =>
                                                                prev.map(
                                                                    (x, i) =>
                                                                        i ===
                                                                        idx
                                                                            ? {
                                                                                  ...x,
                                                                                  cantidad:
                                                                                      v,
                                                                              }
                                                                            : x
                                                                )
                                                            );
                                                        }}
                                                    />
                                                </td>
                                                <td>{r.descripcion}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            className="btn btn-success"
                            onClick={() => {
                                // console.log("Enviando desde EditModal:", {
                                //     no_envio: noEnvio,
                                //     direccion: direccion.trim(),
                                //     id_contacto: idContacto,
                                //     items: rows,
                                // });

                                onSubmit({
                                    no_envio: noEnvio,
                                    direccion: direccion.trim(),
                                    id_contacto: idContacto || null,
                                    items: rows.map((r) => ({
                                        iddetallecotizacion:
                                            r.iddetallecotizacion,
                                        cantidad: Number(r.cantidad || 0),
                                    })),
                                });
                            }}
                        >
                            Guardar cambios
                        </button>

                        <button className="btn btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EnvioEditModal;
