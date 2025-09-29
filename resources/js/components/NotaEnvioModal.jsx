// NotaEnvioModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";

function EnvioEditModal({
    open,
    onClose,
    noEnvio,
    direccionInicial,
    itemsIniciales,
    onSubmit,
}) {
    const [direccion, setDireccion] = useState(direccionInicial || "");
    const [rows, setRows] = useState(itemsIniciales || []); // [{iddetallecotizacion, descripcion, cantidad}]

    useEffect(() => {
        setDireccion(direccionInicial || "");
        setRows(itemsIniciales || []);
    }, [open, direccionInicial, itemsIniciales]);

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

                        <div className="table-responsive">
                            <table className="table table-sm table-bordered align-middle">
                                <thead className="table-dark">
                                    <tr>
                                        <th style={{ width: 80 }}>Cant.</th>
                                        <th>Descripción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, idx) => (
                                        <tr key={r.iddetallecotizacion ?? idx}>
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
                                                                    .value || 0
                                                            )
                                                        );
                                                        setRows((prev) =>
                                                            prev.map((x, i) =>
                                                                i === idx
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
                                    ))}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={2}
                                                className="text-center text-muted"
                                            >
                                                Sin ítems
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button
                            className="btn btn-success"
                            onClick={() =>
                                onSubmit({
                                    no_envio: noEnvio,
                                    direccion_envio: direccion.trim(),
                                    items: rows.map((r) => ({
                                        iddetallecotizacion:
                                            r.iddetallecotizacion,
                                        cantidad: Number(r.cantidad || 0),
                                    })),
                                })
                            }
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

export default function NotaEnvioModal({
    open,
    onClose,
    idCotizacion,
    onPdfReady,
    direccionSugerida = "",
    coerceZeroAsNoShipment = false,
}) {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState(null); // { cotizacion, detalles, siguiente_envio, envios, direccion_sugerida }
    const [checked, setChecked] = useState(new Set());
    const [direccion, setDireccion] = useState("");
    const [noEnvioReimp, setNoEnvioReimp] = useState("");
    const envios = (config?.envios || []).filter(
        (e) => e?.no_envio && Number(e.no_envio) > 0 && e?.fecha_envio
    );

    const [qty, setQty] = useState({}); // { iddetalle: cantidad a enviar }
    useEffect(() => {
        // cuando llega config, autollenar qty con cantidad_pendiente
        const q = {};
        (config?.detalles || []).forEach((d) => {
            const pend = Number(d.cantidad_pendiente ?? d.cantidad ?? 0);
            if (pend > 0) q[d.iddetallecotizacion] = pend;
        });
        setQty(q);
    }, [config]);

    const token = useMemo(() => localStorage.getItem("token"), []);

    const [editOpen, setEditOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    // { noEnvio, direccion, items: [{iddetallecotizacion, descripcion, cantidad}] }

    const abrirEditorEnvio = async () => {
        if (!noEnvioReimp) {
            alertify.warning("Selecciona un envío.");
            return;
        }
        try {
            setLoading(true);
            const { data } = await axios.post(
                `/api/cotizaciones/${idCotizacion}/nota-envio/reimprimir`,
                { no_envio: Number(noEnvioReimp) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Espera que data.items traiga iddetallecotizacion, descripcion, cantidad
            setEditData({
                noEnvio: Number(noEnvioReimp),
                direccion: data?.direccion || "",
                items: (data?.items || []).map((it) => ({
                    iddetallecotizacion: it.iddetallecotizacion,
                    descripcion: it.descripcion,
                    cantidad: Number(it.cantidad || 0),
                })),
            });
            setEditOpen(true);
        } catch (e) {
            alertify.error(
                e?.response?.data?.message || "No se pudo cargar el envío."
            );
        } finally {
            setLoading(false);
        }
    };

    const guardarEdicionEnvio = async (payload) => {
        // payload = { no_envio, direccion_envio, items: [{iddetallecotizacion, cantidad}] }
        if (!payload.items?.length) {
            alertify.warning("Agrega al menos un ítem con cantidad > 0.");
            return;
        }
        try {
            setLoading(true);
            await axios.post(
                `/api/cotizaciones/${idCotizacion}/nota-envio/actualizar`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alertify.success("Envío actualizado.");
            setEditOpen(false);
            setEditData(null);

            // refrescar config
            const { data } = await axios.get(
                `/api/cotizaciones/${idCotizacion}/nota-envio/config`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setConfig(data || null);
        } catch (e) {
            alertify.error(
                e?.response?.data?.message || "No se pudo actualizar el envío."
            );
        } finally {
            setLoading(false);
        }
    };

    // Cargar config al abrir
    useEffect(() => {
        if (!open || !idCotizacion) return;

        const fetchConfig = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(
                    `/api/cotizaciones/${idCotizacion}/nota-envio/config`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setConfig(data || null);

                // Preseleccionar ítems sin envío (numero_envio == null/0)
                const initial = new Set(
                    (data?.detalles || [])
                        .filter(
                            (d) =>
                                !d.numero_envio || Number(d.numero_envio) === 0
                        )
                        .map((d) => d.iddetallecotizacion)
                );
                setChecked(initial);

                // 👉 Precargar dirección: prioridad config > prop > vacío
                const sugerida =
                    (data?.direccion_sugerida &&
                        String(data.direccion_sugerida).trim()) ||
                    (direccionSugerida && String(direccionSugerida).trim()) ||
                    "";
                setDireccion(sugerida);

                // NUEVO: preseleccionar el último envío para reimpresión
                const ultimo =
                    data?.envios && data.envios.length
                        ? data.envios[data.envios.length - 1].no_envio
                        : "";
                setNoEnvioReimp(ultimo);
            } catch (err) {
                console.error(err);
                const msg =
                    err?.response?.data?.message ||
                    `Error ${err?.response?.status || ""}`;
                alertify.error(
                    `No se pudo cargar la configuración de Nota de Envío. ${msg}`
                );
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, [open, idCotizacion, token, direccionSugerida]);

    if (!open) return null;

    const detalles = config?.detalles || [];
    const siguienteEnvio = config?.siguiente_envio || 1;

    const toggle = (id) => {
        const next = new Set(checked);
        next.has(id) ? next.delete(id) : next.add(id);
        setChecked(next);
        if (!qty[id]) {
            const d = detalles.find((x) => x.iddetallecotizacion === id);
            const pend = Number(d?.cantidad_pendiente ?? d?.cantidad ?? 0);
            setQty((prev) => ({ ...prev, [id]: Math.max(0, pend) }));
        }
    };

    const countReady = checked.size;

    const fmtMoney = (n) =>
        Number(n || 0).toLocaleString("es-GT", {
            style: "currency",
            currency: "GTQ",
        });

    const estadoBadge = (numero_envio) => {
        const has = !!(numero_envio && Number(numero_envio) > 0);
        return (
            <span className={`badge ${has ? "bg-secondary" : "bg-success"}`}>
                {has ? `Envío #${numero_envio}` : "Sin envío"}
            </span>
        );
    };

    const generar = async () => {
        if (!checked.size) {
            alertify.warning("Selecciona al menos un ítem.");
            return;
        }
        if (!direccion.trim()) {
            alertify.warning("Ingresa una dirección de envío.");
            return;
        }

        const payloadItems = Array.from(checked)
            .map((id) => ({
                iddetallecotizacion: id,
                cantidad: Number(qty[id] ?? 0),
            }))
            .filter((it) => it.cantidad > 0);

        if (payloadItems.length === 0) {
            alertify.warning("Todas las cantidades son 0.");
            return;
        }

        try {
            setLoading(true);
            const { data } = await axios.post(
                `/api/cotizaciones/${idCotizacion}/nota-envio/generar`,
                { items: payloadItems, direccion_envio: direccion.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onPdfReady?.(data);
            onClose?.();
        } catch (err) {
            alertify.error(
                err?.response?.data?.message ||
                    "No se pudo generar la Nota de Envío."
            );
        } finally {
            setLoading(false);
        }
    };

    const reimprimir = async () => {
        if (!noEnvioReimp) {
            alertify.warning("Selecciona un envío para reimprimir.");
            return;
        }
        try {
            setLoading(true);
            const { data } = await axios.post(
                `/api/cotizaciones/${idCotizacion}/nota-envio/reimprimir`,
                { no_envio: Number(noEnvioReimp) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onPdfReady?.(data); // reutilizas el overlay del PDF ya implementado
            onClose?.();
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                "No se pudo reimprimir la Nota de Envío.";
            alertify.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="modal d-block"
            style={{ background: "rgba(0,0,0,0.5)" }}
        >
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Nota de Envío</h5>
                        <button className="btn-close" onClick={onClose} />
                    </div>

                    <div className="modal-body">
                        {/* Header info */}
                        <div
                            className="d-flex align-items-center justify-content-between p-2 mb-3 rounded"
                            style={{
                                background: "#e7f5ff",
                                border: "1px solid #b6e0fe",
                            }}
                        >
                            <strong>Siguiente envío: {siguienteEnvio}</strong>
                            <small className="text-muted">
                                Selecciona ítems <em>Sin envío</em> para crear
                                uno nuevo.
                            </small>
                        </div>

                        {/* Tabla de detalles */}
                        <div className="table-responsive">
                            <table className="table table-sm table-bordered align-middle">
                                <thead className="table-dark">
                                    <tr>
                                        <th style={{ width: 40 }}></th>
                                        <th>Descripción</th>
                                        <th
                                            style={{
                                                width: 80,
                                                textAlign: "center",
                                            }}
                                        >
                                            Cant.
                                        </th>
                                        <th
                                            style={{
                                                width: 140,
                                                textAlign: "right",
                                            }}
                                        >
                                            Total
                                        </th>
                                        <th style={{ width: 140 }}>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="text-center"
                                            >
                                                Cargando…
                                            </td>
                                        </tr>
                                    ) : detalles.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="text-center"
                                            >
                                                Sin ítems
                                            </td>
                                        </tr>
                                    ) : (
                                        detalles.map((it) => {
                                            const disabled = !!(
                                                it.numero_envio &&
                                                Number(it.numero_envio) > 0
                                            );
                                            const isChecked = checked.has(
                                                it.iddetallecotizacion
                                            );
                                            return (
                                                <tr
                                                    key={it.iddetallecotizacion}
                                                >
                                                    <td className="text-center">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            disabled={
                                                                Number(
                                                                    it.cantidad_pendiente ??
                                                                        (it.numero_envio
                                                                            ? 0
                                                                            : it.cantidad) ??
                                                                        0
                                                                ) <= 0
                                                            }
                                                            checked={isChecked}
                                                            onChange={() =>
                                                                toggle(
                                                                    it.iddetallecotizacion
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                    <td>{it.descripcion}</td>
                                                    <td style={{ width: 80 }}>
                                                        {(() => {
                                                            const pend = Number(
                                                                it.cantidad_pendiente ??
                                                                    (it.numero_envio
                                                                        ? 0
                                                                        : it.cantidad) ??
                                                                    0
                                                            );
                                                            const isChecked =
                                                                checked.has(
                                                                    it.iddetallecotizacion
                                                                );
                                                            const value =
                                                                qty[
                                                                    it
                                                                        .iddetallecotizacion
                                                                ] ?? pend;

                                                            if (pend <= 0)
                                                                return (
                                                                    <span className="text-muted">
                                                                        0
                                                                    </span>
                                                                );

                                                            return isChecked ? (
                                                                <div>
                                                                    <input
                                                                        type="number"
                                                                        className="form-control form-control-sm text-end"
                                                                        min={0}
                                                                        max={
                                                                            pend
                                                                        }
                                                                        step="0.01"
                                                                        value={
                                                                            value
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) => {
                                                                            const v =
                                                                                Math.max(
                                                                                    0,
                                                                                    Math.min(
                                                                                        pend,
                                                                                        Number(
                                                                                            e
                                                                                                .target
                                                                                                .value ||
                                                                                                0
                                                                                        )
                                                                                    )
                                                                                );
                                                                            setQty(
                                                                                (
                                                                                    prev
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [it.iddetallecotizacion]:
                                                                                        v,
                                                                                })
                                                                            );
                                                                        }}
                                                                    />
                                                                    <div className="small text-muted">
                                                                        Pend.:{" "}
                                                                        {pend}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <span className="text-muted">
                                                                        {pend}
                                                                    </span>
                                                                    <div className="small text-muted">
                                                                        Pend.:{" "}
                                                                        {pend}
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}
                                                    </td>

                                                    <td className="text-end">
                                                        {fmtMoney(it.total)}
                                                    </td>
                                                    <td>
                                                        {estadoBadge(
                                                            it.numero_envio
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Dirección */}
                        <div className="mb-2 fw-bold">
                            Dirección para este envío (nuevo):
                        </div>
                        <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Ej.: 5a avenida 10-20 zona 10, Ciudad de Guatemala"
                            value={direccion}
                            onChange={(e) => setDireccion(e.target.value)}
                        />
                        {/* ===== Reimprimir envío existente ===== */}
                        {envios.length > 0 && (
                            <div className="mt-4 p-2 border rounded">
                                <div className="fw-bold mb-2">
                                    Reimprimir envío existente
                                </div>
                                <div className="row g-2 align-items-end">
                                    <div className="col-md-6">
                                        <label className="form-label">
                                            Envío
                                        </label>
                                        <select
                                            className="form-select"
                                            value={noEnvioReimp}
                                            onChange={(e) =>
                                                setNoEnvioReimp(e.target.value)
                                            }
                                        >
                                            <option value="">
                                                -- Selecciona --
                                            </option>
                                            {envios.map((e) => (
                                                <option
                                                    key={e.no_envio}
                                                    value={e.no_envio}
                                                >
                                                    {`#${
                                                        e.no_envio
                                                    } — ${new Date(
                                                        e.fecha_envio
                                                    )
                                                        .toISOString()
                                                        .slice(0, 10)}`}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="col-md-3">
                                            <button
                                                className="btn btn-outline-secondary w-100"
                                                onClick={async () => {
                                                    if (!noEnvioReimp)
                                                        return alertify.warning(
                                                            "Selecciona un envío."
                                                        );
                                                    if (
                                                        !confirm(
                                                            `Eliminar envío #${noEnvioReimp}?`
                                                        )
                                                    )
                                                        return;
                                                    try {
                                                        setLoading(true);
                                                        await axios.post(
                                                            `/api/cotizaciones/${idCotizacion}/nota-envio/eliminar`,
                                                            {
                                                                no_envio:
                                                                    Number(
                                                                        noEnvioReimp
                                                                    ),
                                                            },
                                                            {
                                                                headers: {
                                                                    Authorization: `Bearer ${token}`,
                                                                },
                                                            }
                                                        );
                                                        alertify.success(
                                                            "Envío eliminado."
                                                        );
                                                        // Refresca config
                                                        const { data } =
                                                            await axios.get(
                                                                `/api/cotizaciones/${idCotizacion}/nota-envio/config`,
                                                                {
                                                                    headers: {
                                                                        Authorization: `Bearer ${token}`,
                                                                    },
                                                                }
                                                            );
                                                        setConfig(data || null);
                                                        setNoEnvioReimp("");
                                                    } catch (e) {
                                                        alertify.error(
                                                            e?.response?.data
                                                                ?.message ||
                                                                "No se pudo eliminar."
                                                        );
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                                disabled={
                                                    loading || !noEnvioReimp
                                                }
                                            >
                                                Eliminar envío
                                            </button>
                                        </div>

                                        <div className="col-md-3">
                                            <button
                                                className="btn btn-outline-success w-100"
                                                onClick={abrirEditorEnvio}
                                                disabled={
                                                    loading || !noEnvioReimp
                                                }
                                            >
                                                Editar envío
                                            </button>
                                        </div>

                                        {noEnvioReimp && (
                                            <small className="text-muted d-block mt-1">
                                                {(() => {
                                                    const x = envios.find(
                                                        (v) =>
                                                            String(
                                                                v.no_envio
                                                            ) ===
                                                            String(noEnvioReimp)
                                                    );
                                                    return x
                                                        ? `Dirección: ${x.direccion_envio}`
                                                        : "";
                                                })()}
                                            </small>
                                        )}
                                    </div>
                                    <div className="col-md-3">
                                        <button
                                            className="btn btn-outline-primary w-100"
                                            onClick={reimprimir}
                                            disabled={loading || !noEnvioReimp}
                                        >
                                            {loading
                                                ? "Generando…"
                                                : "Reimprimir PDF"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-2 text-muted">
                            Ítems listos para generar:{" "}
                            <strong>{countReady}</strong>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            className="btn btn-primary"
                            onClick={generar}
                            disabled={
                                loading || !countReady || !direccion.trim()
                            }
                        >
                            {loading
                                ? "Generando…"
                                : "Generar PDF (nuevo envío)"}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
            <EnvioEditModal
                open={editOpen}
                onClose={() => {
                    setEditOpen(false);
                    setEditData(null);
                }}
                noEnvio={editData?.noEnvio}
                direccionInicial={editData?.direccion}
                itemsIniciales={editData?.items || []}
                onSubmit={guardarEdicionEnvio}
            />
        </div>
    );
}
