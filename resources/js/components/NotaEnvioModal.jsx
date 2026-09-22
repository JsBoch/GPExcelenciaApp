import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import EnvioEditModal from "./EnvioEditModal"; // Asegúrate del path correcto
import {
    Truck,
    X,
    Printer,
    Pencil,
    MapPin,
    User,
    Package,
    FileText,
} from "lucide-react";

import "../../css/nota-envio-modal.css";

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

    const itemsSeleccionados = checked.size;

    return (
        <div className="nota-envio-overlay">
            <div
                className="modal-dialog modal-xl nota-envio-dialog"
                role="dialog"
                aria-modal="true"
            >
                <div className="modal-content nota-envio-content">
                    {/* =================================================
                    HEADER
                   ================================================= */}

                    <div className="nota-envio-header">
                        <div className="nota-envio-header-main">
                            <div className="nota-envio-header-icon">
                                <Truck size={22} />
                            </div>

                            <div>
                                <span className="nota-envio-eyebrow">
                                    Cotizaciones
                                </span>

                                <h2>Nota de envío</h2>

                                <p>
                                    Prepare los productos y datos necesarios
                                    para generar el envío.
                                </p>
                            </div>
                        </div>

                        <div className="nota-envio-header-right">
                            <div className="nota-envio-number">
                                <span>Próximo envío</span>

                                <strong>#{siguienteEnvio}</strong>
                            </div>

                            <button
                                type="button"
                                className="nota-envio-close"
                                onClick={onClose}
                                disabled={loading}
                                title="Cerrar"
                            >
                                <X size={19} />
                            </button>
                        </div>
                    </div>

                    {/* =================================================
                    BODY
                   ================================================= */}

                    <div className="modal-body nota-envio-body">
                        {/* =================================================
                        RESUMEN
                       ================================================= */}

                        <div className="nota-envio-summary">
                            <div className="nota-envio-summary-item">
                                <Package size={17} />

                                <div>
                                    <span>Productos</span>

                                    <strong>{detalles.length}</strong>
                                </div>
                            </div>

                            <div className="nota-envio-summary-divider" />

                            <div className="nota-envio-summary-item">
                                <FileText size={17} />

                                <div>
                                    <span>Seleccionados</span>

                                    <strong>{itemsSeleccionados}</strong>
                                </div>
                            </div>

                            {envios.length > 0 && (
                                <>
                                    <div className="nota-envio-summary-divider" />

                                    <div className="nota-envio-summary-item">
                                        <Truck size={17} />

                                        <div>
                                            <span>Envíos previos</span>

                                            <strong>{envios.length}</strong>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* =================================================
                        PRODUCTOS
                       ================================================= */}

                        <section className="nota-envio-section">
                            <div className="nota-envio-section-heading">
                                <div className="nota-envio-section-icon">
                                    <Package size={18} />
                                </div>

                                <div>
                                    <h3>Productos del envío</h3>

                                    <p>
                                        Seleccione los productos y la cantidad
                                        que desea incluir en esta nota.
                                    </p>
                                </div>
                            </div>

                            <div className="nota-envio-table-wrapper">
                                <table className="nota-envio-table">
                                    <thead>
                                        <tr>
                                            <th className="nota-envio-check-column">
                                                Incluir
                                            </th>

                                            <th>Descripción</th>

                                            <th className="nota-envio-qty-column">
                                                Cantidad
                                            </th>

                                            <th className="nota-envio-money-column">
                                                Total
                                            </th>

                                            <th className="nota-envio-status-column">
                                                Estado
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {detalles.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="nota-envio-empty-row"
                                                >
                                                    No hay productos disponibles
                                                    para esta cotización.
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

                                                const sinPendiente =
                                                    Number(
                                                        it.cantidad_pendiente ??
                                                            0,
                                                    ) <= 0;

                                                return (
                                                    <tr
                                                        key={
                                                            it.iddetallecotizacion
                                                        }
                                                        className={
                                                            isChecked
                                                                ? "nota-envio-row-selected"
                                                                : sinPendiente
                                                                  ? "nota-envio-row-disabled"
                                                                  : ""
                                                        }
                                                    >
                                                        {/* SELECCIÓN */}

                                                        <td className="nota-envio-check-cell">
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input nota-envio-checkbox"
                                                                disabled={
                                                                    sinPendiente
                                                                }
                                                                checked={
                                                                    isChecked
                                                                }
                                                                onChange={() =>
                                                                    toggle(
                                                                        it.iddetallecotizacion,
                                                                    )
                                                                }
                                                            />
                                                        </td>

                                                        {/* DESCRIPCIÓN */}

                                                        <td>
                                                            <div className="nota-envio-product-description">
                                                                {it.descripcion}
                                                            </div>
                                                        </td>

                                                        {/* CANTIDAD */}

                                                        <td>
                                                            {pend <= 0 ? (
                                                                <span className="nota-envio-no-qty">
                                                                    0
                                                                </span>
                                                            ) : isChecked ? (
                                                                <div className="nota-envio-qty-input-wrapper">
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        max={
                                                                            pend
                                                                        }
                                                                        value={
                                                                            qty[
                                                                                it
                                                                                    .iddetallecotizacion
                                                                            ] ??
                                                                            pend
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
                                                                        className="nota-envio-qty-input"
                                                                    />

                                                                    <span>
                                                                        / {pend}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="nota-envio-pending-qty">
                                                                    {pend}
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* TOTAL */}

                                                        <td className="nota-envio-money">
                                                            {Number(
                                                                it.total || 0,
                                                            ).toLocaleString(
                                                                "es-GT",
                                                                {
                                                                    style: "currency",
                                                                    currency:
                                                                        "GTQ",
                                                                },
                                                            )}
                                                        </td>

                                                        {/* ESTADO */}

                                                        <td>
                                                            {it.numero_envio &&
                                                            Number(
                                                                it.numero_envio,
                                                            ) > 0 ? (
                                                                <span className="nota-envio-status previous">
                                                                    Envío #
                                                                    {
                                                                        it.numero_envio
                                                                    }
                                                                </span>
                                                            ) : (
                                                                <span className="nota-envio-status available">
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
                        </section>

                        {/* =================================================
                        DATOS DE ENTREGA
                       ================================================= */}

                        <section className="nota-envio-section">
                            <div className="nota-envio-section-heading">
                                <div className="nota-envio-section-icon green">
                                    <MapPin size={18} />
                                </div>

                                <div>
                                    <h3>Datos de entrega</h3>

                                    <p>
                                        Defina quién recibirá el pedido y la
                                        dirección de entrega.
                                    </p>
                                </div>
                            </div>

                            <div className="nota-envio-delivery-grid">
                                {/* CONTACTO */}

                                <div className="nota-envio-field">
                                    <label>
                                        <User size={15} />
                                        Contacto
                                    </label>

                                    <select
                                        className="nota-envio-control"
                                        value={idContacto}
                                        onChange={(e) =>
                                            setIdContacto(e.target.value)
                                        }
                                    >
                                        <option value="">
                                            Seleccionar contacto
                                        </option>

                                        {contactos.map((c) => (
                                            <option
                                                key={c.id_contactocliente}
                                                value={c.id_contactocliente}
                                            >
                                                {c.nombre}
                                                {c.telefono
                                                    ? ` — ${c.telefono}`
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* DIRECCIÓN */}

                                <div className="nota-envio-field">
                                    <label>
                                        <MapPin size={15} />
                                        Dirección de envío
                                        <span className="nota-envio-required">
                                            *
                                        </span>
                                    </label>

                                    <textarea
                                        className="nota-envio-control nota-envio-address"
                                        rows={3}
                                        value={direccion}
                                        onChange={(e) =>
                                            setDireccion(e.target.value)
                                        }
                                        placeholder="Ingrese la dirección completa de entrega..."
                                    />
                                </div>
                            </div>
                        </section>

                        {/* =================================================
                        TAMAÑO DE IMPRESIÓN
                       ================================================= */}

                        <section className="nota-envio-section">
                            <div className="nota-envio-section-heading">
                                <div className="nota-envio-section-icon yellow">
                                    <Printer size={18} />
                                </div>

                                <div>
                                    <h3>Formato de impresión</h3>

                                    <p>
                                        Seleccione el tamaño con el que desea
                                        generar la nota de envío.
                                    </p>
                                </div>
                            </div>

                            <div className="nota-envio-print-options">
                                {/* CARTA */}

                                <label
                                    className={`nota-envio-print-option ${
                                        tipoImpresion === "carta"
                                            ? "selected"
                                            : ""
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="tipoImpresion"
                                        value="carta"
                                        checked={tipoImpresion === "carta"}
                                        onChange={() =>
                                            setTipoImpresion("carta")
                                        }
                                    />

                                    <div className="nota-envio-print-icon">
                                        <FileText size={22} />
                                    </div>

                                    <div>
                                        <strong>Carta normal</strong>

                                        <span>
                                            Formato estándar de impresión
                                        </span>
                                    </div>
                                </label>

                                {/* MEDIA CARTA */}

                                <label
                                    className={`nota-envio-print-option ${
                                        tipoImpresion === "media"
                                            ? "selected"
                                            : ""
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="tipoImpresion"
                                        value="media"
                                        checked={tipoImpresion === "media"}
                                        onChange={() =>
                                            setTipoImpresion("media")
                                        }
                                    />

                                    <div className="nota-envio-print-icon">
                                        <FileText size={18} />
                                    </div>

                                    <div>
                                        <strong>Media carta</strong>

                                        <span>Formato compacto</span>
                                    </div>
                                </label>
                            </div>

                            <div className="nota-envio-print-note">
                                Este formato también será utilizado al
                                reimprimir una nota de envío.
                            </div>
                        </section>

                        {/* =================================================
                        ENVÍOS ANTERIORES
                       ================================================= */}

                        {envios.length > 0 && (
                            <section className="nota-envio-section nota-envio-history-section">
                                <div className="nota-envio-section-heading">
                                    <div className="nota-envio-section-icon gray">
                                        <Printer size={18} />
                                    </div>

                                    <div>
                                        <h3>Envíos anteriores</h3>

                                        <p>
                                            Edite o vuelva a imprimir una nota
                                            de envío previamente generada.
                                        </p>
                                    </div>
                                </div>

                                <div className="nota-envio-history-grid">
                                    <div className="nota-envio-field">
                                        <label>Envío</label>

                                        <select
                                            className="nota-envio-control"
                                            value={noEnvioReimp}
                                            onChange={(e) =>
                                                setNoEnvioReimp(e.target.value)
                                            }
                                        >
                                            <option value="">
                                                Seleccionar envío
                                            </option>

                                            {envios.map((e, idx) => (
                                                <option
                                                    key={`env-${e.no_envio}-${idx}`}
                                                    value={e.no_envio}
                                                >
                                                    {`Envío #${e.no_envio} — ${
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

                                    <button
                                        type="button"
                                        className="nota-envio-secondary-button edit"
                                        onClick={abrirEditorEnvio}
                                        disabled={loading || !noEnvioReimp}
                                    >
                                        <Pencil size={16} />
                                        Editar envío
                                    </button>

                                    <button
                                        type="button"
                                        className="nota-envio-secondary-button print"
                                        onClick={reimprimir}
                                        disabled={loading || !noEnvioReimp}
                                    >
                                        <Printer size={16} />
                                        Reimprimir PDF
                                    </button>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* =================================================
                    FOOTER
                   ================================================= */}

                    <div className="nota-envio-footer">
                        <div className="nota-envio-footer-info">
                            {itemsSeleccionados > 0 ? (
                                <>
                                    <strong>{itemsSeleccionados}</strong>{" "}
                                    producto
                                    {itemsSeleccionados === 1 ? "" : "s"}{" "}
                                    seleccionado
                                    {itemsSeleccionados === 1 ? "" : "s"}
                                </>
                            ) : (
                                "Seleccione al menos un producto para generar la nota."
                            )}
                        </div>

                        <div className="nota-envio-footer-actions">
                            <button
                                type="button"
                                className="nota-envio-cancel-button"
                                onClick={onClose}
                                disabled={loading}
                            >
                                <X size={17} />
                                Cerrar
                            </button>

                            <button
                                type="button"
                                className="nota-envio-generate-button"
                                onClick={generar}
                                disabled={loading || !direccion.trim()}
                            >
                                <Printer size={17} />

                                {loading ? "Generando..." : "Generar PDF"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* =====================================================
            EDITOR DE ENVÍO
           ===================================================== */}

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
