// NotaEnvioModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";

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
    const envios = config?.envios || [];

    const token = useMemo(() => localStorage.getItem("token"), []);

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
        if (!countReady) {
            alertify.warning("Selecciona al menos un ítem sin envío.");
            return;
        }
        if (!direccion.trim()) {
            alertify.warning("Ingresa una dirección de envío.");
            return;
        }

        try {
            setLoading(true);
            const { data } = await axios.post(
                `/api/cotizaciones/${idCotizacion}/nota-envio/generar`,
                {
                    detalle_ids: Array.from(checked),
                    direccion_envio: direccion.trim(),
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Mando el payload hacia arriba para que muestres el PDF
            onPdfReady?.(data);
            onClose?.();
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                "No se pudo generar la Nota de Envío.";
            alertify.error(msg);
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
                                                            disabled={disabled}
                                                            checked={isChecked}
                                                            onChange={() =>
                                                                toggle(
                                                                    it.iddetallecotizacion
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                    <td>{it.descripcion}</td>
                                                    <td className="text-center">
                                                        {it.cantidad}
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
        </div>
    );
}
