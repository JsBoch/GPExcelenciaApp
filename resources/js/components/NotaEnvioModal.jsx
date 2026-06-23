import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import EnvioEditModal from "./EnvioEditModal"; // Asegúrate del path correcto

export default function NotaEnvioModal({
    open,
    onClose,
    idCotizacion,
    onPdfReady,
    direccionSugerida = "",
}) {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState(null);
    const [contactos, setContactos] = useState([]);

    const [checked, setChecked] = useState(new Set());
    const [direccion, setDireccion] = useState("");
    const [idContacto, setIdContacto] = useState("");

    const [qty, setQty] = useState({});
    const [editOpen, setEditOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [noEnvioReimp, setNoEnvioReimp] = useState("");

    //Se utiliza para seleccionar el tipo de nota de envío (carta o media carta) en el modal 2026-06-23
    const [tipoImpresion, setTipoImpresion] = useState("carta");

    const token = useMemo(() => localStorage.getItem("token"), []);

    const envios = (config?.envios || []).filter(
        (e) => e?.no_envio && Number(e.no_envio) > 0,
    );

    /* ============================================
       1. Cargar configuración
    ============================================ */
    useEffect(() => {
        if (!open || !idCotizacion) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(
                    `/api/cotizaciones/${idCotizacion}/nota-envio/config`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );

                setConfig(data || null);

                // Cargar contactos del cliente desde backend
                try {
                    // console.log(
                    //     "Cargando contactos para cliente:",
                    //     data.cotizacion.idcliente
                    // );
                    const resp = await axios.get(`/api/lista_contactos`, {
                        params: { idcliente: data.cotizacion.idcliente },
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    //console.log("Contactos cargados:", resp.data);
                    setContactos(resp.data);
                } catch (error) {
                    alertify.error("No se pudieron cargar los contactos.");
                }

                // preseleccionar items "sin envío"
                const initialChecked = new Set(
                    (data?.detalles || [])
                        .filter(
                            (d) =>
                                !d.numero_envio || Number(d.numero_envio) === 0,
                        )
                        .map((d) => d.iddetallecotizacion),
                );
                setChecked(initialChecked);

                // prellenar dirección
                const sug =
                    (data?.direccion_sugerida &&
                        String(data.direccion_sugerida).trim()) ||
                    (direccionSugerida && String(direccionSugerida).trim()) ||
                    "";
                setDireccion(sug);

                // llenar cantidades por defecto
                const qtyMap = {};
                (data?.detalles || []).forEach((it) => {
                    const pend = Number(
                        it.cantidad_pendiente ?? it.cantidad ?? 0,
                    );
                    if (pend > 0) qtyMap[it.iddetallecotizacion] = pend;
                });
                setQty(qtyMap);

                // preseleccionar último envío para reimpresión
                const last =
                    data?.envios?.length > 0
                        ? data.envios[data.envios.length - 1].no_envio
                        : "";
                setNoEnvioReimp(last);
            } catch (err) {
                alertify.error(
                    "No se pudo cargar información de Nota de Envío",
                );
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [open, idCotizacion, token, direccionSugerida]);

    const detalles = config?.detalles || [];
    const siguienteEnvio = config?.siguiente_envio || 1;

    /* ============================================
       2. Toggle de ítems
    ============================================ */
    const toggle = (id) => {
        const next = new Set(checked);
        next.has(id) ? next.delete(id) : next.add(id);
        setChecked(next);

        // si se activa, rellenar automáticamente la cantidad
        if (!qty[id]) {
            const d = detalles.find((x) => x.iddetallecotizacion === id);
            const pend = Number(d?.cantidad_pendiente ?? d?.cantidad ?? 0);
            setQty((prev) => ({ ...prev, [id]: pend }));
        }
    };

    /* ============================================
       3. Generar nuevo PDF
    ============================================ */
    const generar = async () => {
        if (!checked.size) return alertify.warning("Selecciona un ítem.");
        if (!direccion.trim())
            return alertify.warning("Ingresa una dirección.");

        const items = Array.from(checked)
            .map((id) => ({
                iddetallecotizacion: id,
                cantidad: Number(qty[id] || 0),
            }))
            .filter((x) => x.cantidad > 0);

        if (!items.length)
            return alertify.warning("Todas las cantidades son 0.");

        try {
            setLoading(true);
            const { data } = await axios.post(
                `/api/cotizaciones/${idCotizacion}/nota-envio/generar`,
                {
                    items,
                    direccion_envio: direccion.trim(),
                    id_contacto: idContacto || null,
                },
                { headers: { Authorization: `Bearer ${token}` } },
            );

            onPdfReady?.({
                ...data,
                tipoImpresion,
            });
            onClose?.();
        } catch (err) {
            alertify.error(
                err?.response?.data?.message ||
                    "Error al generar Nota de Envío.",
            );
        } finally {
            setLoading(false);
        }
    };

    /* ============================================
       4. Reimprimir
    ============================================ */
    const reimprimir = async () => {
        if (!noEnvioReimp) return alertify.warning("Selecciona un envío.");

        try {
            setLoading(true);
            const { data } = await axios.post(
                `/api/cotizaciones/${idCotizacion}/nota-envio/reimprimir`,
                { no_envio: Number(noEnvioReimp) },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            onPdfReady?.({
                ...data,
                tipoImpresion,
            });
            onClose?.();
        } catch (err) {
            alertify.error("Error al reimprimir PDF.");
        } finally {
            setLoading(false);
        }
    };

    /* ============================================
       5. Abrir editor
    ============================================ */
    const abrirEditorEnvio = async () => {
        if (!noEnvioReimp) return alertify.warning("Selecciona un envío.");

        try {
            setLoading(true);

            const { data } = await axios.post(
                `/api/cotizaciones/${idCotizacion}/nota-envio/reimprimir`,
                { no_envio: Number(noEnvioReimp) },
                { headers: { Authorization: `Bearer ${token}` } },
            );

            setEditData({
                noEnvio: Number(noEnvioReimp),
                direccion: data?.direccion || "",
                id_contacto: data?.id_contacto || "",
                items: (data?.items || []).map((it) => ({
                    iddetallecotizacion: it.iddetallecotizacion,
                    descripcion: it.descripcion,
                    cantidad: Number(it.cantidad || 0),
                })),
            });

            setEditOpen(true);
        } catch (err) {
            alertify.error("No se pudo cargar el envío.");
        } finally {
            setLoading(false);
        }
    };

    /* ============================================
       6. Guardar edición
    ============================================ */
    const guardarEdicionEnvio = async (payload) => {
        //console.log("Payload completo recibido:", payload);

        const fixedItems = (payload.items || [])
            .filter((it) => {
                const cantidad = Number(it.cantidad);
                const valido = cantidad > 0;
                // console.log(
                //     `Item ${it.iddetallecotizacion}: cantidad=${it.cantidad}, valido=${valido}`
                // );
                return valido;
            })
            .map((it) => ({
                iddetallecotizacion: Number(it.iddetallecotizacion),
                cantidad: Number(it.cantidad),
            }));

        //console.log("Items enviados al backend:", fixedItems);

        const body = {
            no_envio: Number(payload.no_envio),
            direccion_envio: payload.direccion,
            id_contacto: payload.id_contacto || null,
            items: fixedItems,
        };

        //console.log("Body final:", body);
        try {
            setLoading(true);
            // console.log("Llamando API actualizar envío:", {
            //     url: `/api/cotizaciones/${idCotizacion}/nota-envio/actualizar`,
            //     body,
            // });

            //console.log("DEBUG → enviando body al backend:", JSON.stringify(body, null, 2));
            await axios.post(
                `/api/cotizaciones/${idCotizacion}/nota-envio/actualizar`,
                body,
                { headers: { Authorization: `Bearer ${token}` } },
            );

            alertify.success("Envío actualizado.");
            setEditOpen(false);
            setEditData(null);

            // refrescar config
            const { data } = await axios.get(
                `/api/cotizaciones/${idCotizacion}/nota-envio/config`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setConfig(data || null);
        } catch (err) {
            alertify.error("No se pudo actualizar el envío.");
        } finally {
            setLoading(false);
        }
    };

    /* ============================================
       UI
    ============================================ */

    if (!open) return null;

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
                        {/* Tabla de ítems */}
                        <div className="table-responsive mb-3">
                            <table className="table table-sm table-bordered">
                                <thead className="table-dark">
                                    <tr>
                                        <th></th>
                                        <th>Descripción</th>
                                        <th style={{ width: 80 }}>Cant.</th>
                                        <th style={{ width: 120 }}>Total</th>
                                        <th style={{ width: 120 }}>Estado</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {detalles.length === 0 ? (
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
                                            const pend = Number(
                                                it.cantidad_pendiente ??
                                                    it.cantidad ??
                                                    0,
                                            );
                                            const isChecked = checked.has(
                                                it.iddetallecotizacion,
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
                                                                        0,
                                                                ) <= 0
                                                            }
                                                            checked={isChecked}
                                                            onChange={() =>
                                                                toggle(
                                                                    it.iddetallecotizacion,
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                    <td>{it.descripcion}</td>

                                                    <td>
                                                        {pend <= 0 ? (
                                                            <span className="text-muted">
                                                                0
                                                            </span>
                                                        ) : isChecked ? (
                                                            <input
                                                                type="number"
                                                                className="form-control form-control-sm text-end"
                                                                min={0}
                                                                max={pend}
                                                                value={
                                                                    qty[
                                                                        it
                                                                            .iddetallecotizacion
                                                                    ] ?? pend
                                                                }
                                                                onChange={(
                                                                    e,
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
                                                                                        0,
                                                                                ),
                                                                            ),
                                                                        );
                                                                    setQty(
                                                                        (
                                                                            prev,
                                                                        ) => ({
                                                                            ...prev,
                                                                            [it.iddetallecotizacion]:
                                                                                v,
                                                                        }),
                                                                    );
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="text-muted">
                                                                {pend}
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="text-end">
                                                        {Number(
                                                            it.total || 0,
                                                        ).toLocaleString(
                                                            "es-GT",
                                                            {
                                                                style: "currency",
                                                                currency: "GTQ",
                                                            },
                                                        )}
                                                    </td>

                                                    <td>
                                                        {it.numero_envio &&
                                                        Number(
                                                            it.numero_envio,
                                                        ) > 0 ? (
                                                            <span className="badge bg-secondary">
                                                                Envío #
                                                                {
                                                                    it.numero_envio
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-success">
                                                                Sin envío
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* CONTACTO */}

                        <label className="form-label fw-bold">Contacto</label>
                        {/* {console.log(
                            "Renderizando <select> contactos:",
                            contactos
                        )} */}
                        <select
                            className="form-select mb-3"
                            value={idContacto}
                            onChange={(e) => setIdContacto(e.target.value)}
                        >
                            <option value="">-- Seleccionar --</option>
                            {contactos.map((c) => (
                                <option
                                    key={`cont-${
                                        c.id_contactocliente
                                    }-${Math.random()}`}
                                    value={c.id_contactocliente}
                                >
                                    {c.nombre} — {c.telefono}
                                </option>
                            ))}
                        </select>
                        {/* DIRECCIÓN */}
                        <label className="form-label fw-bold">
                            Dirección de Envío
                        </label>
                        <textarea
                            className="form-control"
                            rows={3}
                            value={direccion}
                            onChange={(e) => setDireccion(e.target.value)}
                        />

                        {/* TAMAÑO DE IMPRESIÓN */}
                        <div className="mt-3 mb-3 p-3 border rounded bg-light">
                            <label className="form-label fw-bold d-block">
                                Tamaño de impresión
                            </label>

                            <div className="d-flex gap-4">
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        id="tipoCarta"
                                        name="tipoImpresion"
                                        value="carta"
                                        checked={tipoImpresion === "carta"}
                                        onChange={() =>
                                            setTipoImpresion("carta")
                                        }
                                    />
                                    <label
                                        className="form-check-label"
                                        htmlFor="tipoCarta"
                                    >
                                        Carta normal
                                    </label>
                                </div>

                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        id="tipoMediaCarta"
                                        name="tipoImpresion"
                                        value="media"
                                        checked={tipoImpresion === "media"}
                                        onChange={() =>
                                            setTipoImpresion("media")
                                        }
                                    />
                                    <label
                                        className="form-check-label"
                                        htmlFor="tipoMediaCarta"
                                    >
                                        Media carta
                                    </label>
                                </div>
                            </div>

                            <small className="text-muted">
                                Esta opción aplica para generar y reimprimir la
                                nota de envío.
                            </small>
                        </div>

                        {/* SECCIÓN DE REIMPRESIÓN */}
                        {envios.length > 0 && (
                            <div className="mt-4 p-3 border rounded">
                                <div className="fw-bold">Reimprimir envío</div>

                                <div className="row mt-2 g-2">
                                    <div className="col-md-6">
                                        {/* {console.log("Renderizando lista de envíos reimpresión:", envios)} */}
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
                                            {envios.map((e, idx) => (
                                                <option
                                                    key={`env-${e.no_envio}-${idx}`}
                                                    value={e.no_envio}
                                                >
                                                    {`#${e.no_envio} — ${
                                                        e.fecha_envio
                                                            ? new Date(
                                                                  e.fecha_envio,
                                                              )
                                                                  .toISOString()
                                                                  .slice(0, 10)
                                                            : "Sin fecha"
                                                    }`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-3">
                                        <button
                                            className="btn btn-outline-success w-100"
                                            onClick={abrirEditorEnvio}
                                            disabled={loading || !noEnvioReimp}
                                        >
                                            Editar envío
                                        </button>
                                    </div>

                                    <div className="col-md-3">
                                        <button
                                            className="btn btn-outline-primary w-100"
                                            onClick={reimprimir}
                                            disabled={loading || !noEnvioReimp}
                                        >
                                            Reimprimir PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            className="btn btn-primary"
                            onClick={generar}
                            disabled={loading || !direccion.trim()}
                        >
                            {loading ? "Generando…" : "Generar PDF"}
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
                contactoInicial={editData?.id_contacto}
                contactosLista={contactos}
                itemsIniciales={editData?.items || []}
                onSubmit={guardarEdicionEnvio}
            />
        </div>
    );
}
