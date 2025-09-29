import React, { useState,useEffect } from "react";
import axios from "axios";
import Header from "../../Header";

const token = localStorage.getItem("token");

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    withCredentials: true, // ⬅️ importante: usando Bearer, no cookies
    headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
});

export default function ResumenFacturasPagadas() {
    const [inicio, setInicio] = useState("");
    const [fin, setFin] = useState("");
    const [cargando, setCargando] = useState(false);
    const [data, setData] = useState(null);

    // ⬇️ Al montar, usa la fecha del servidor para setear ambos controles
    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                const { data } = await api.get("/fecha-servidor"); // -> { fecha: "YYYY-MM-DD" }
                const hoy = data?.fecha;
                if (!cancel && hoy) {
                    setInicio((prev) => prev || hoy);
                    setFin((prev) => prev || hoy);
                }
            } catch {
                // Fallback local (por si el endpoint falla)
                const d = new Date();
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                const hoyLocal = `${yyyy}-${mm}-${dd}`;
                if (!cancel) {
                    setInicio((prev) => prev || hoyLocal);
                    setFin((prev) => prev || hoyLocal);
                }
            }
        })();
        return () => {
            cancel = true;
        };
    }, []);

    const consultar = async (e) => {
        e.preventDefault();
        if (!inicio || !fin) return alert("Selecciona ambas fechas");
        setCargando(true);
        try {
            const { data } = await api.get(
                "/reportes-contabilidad/resumen-facturas-pagadas/data",
                { params: { fecha_inicio: inicio, fecha_fin: fin } }
            );
            setData(data);
        } catch (err) {
            console.error(err);
            alert("No se pudo cargar la información");
        } finally {
            setCargando(false);
        }
    };

    // ⚠️ window.open NO manda Authorization. Descarga el PDF como blob con Axios y ábrelo.
    const verPdf = async () => {
        if (!inicio || !fin) return alert("Selecciona ambas fechas");
        try {
            const resp = await api.get(
                "/reportes-contabilidad/resumen-facturas-pagadas/pdf",
                {
                    params: { fecha_inicio: inicio, fecha_fin: fin },
                    responseType: "blob",
                }
            );
            const blob = new Blob([resp.data], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            // Opcional: URL.revokeObjectURL(url) luego de cerrar
        } catch (err) {
            console.error(err);
            alert("No se pudo generar el PDF");
        }
    };

    return (
        <div className="container py-4">
            <Header title="FACTUAS PAGADAS" />
            <div className="card shadow-sm">
                <div className="card-body">
                    <h5 className="card-title mb-3">
                        RESUMEN DE FACTURAS PAGADAS
                    </h5>
                    <form className="row g-3" onSubmit={consultar}>
                        <div className="col-md-3">
                            <label className="form-label">
                                Fecha inicio (recibo)
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={inicio}
                                onChange={(e) => setInicio(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">
                                Fecha fin (recibo)
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={fin}
                                onChange={(e) => setFin(e.target.value)}
                            />
                        </div>
                        <div className="col-md-6 d-flex align-items-end gap-2">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={cargando}
                            >
                                {cargando ? "Cargando…" : "Ver datos"}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-success"
                                onClick={verPdf}
                            >
                                PDF
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {data && (
                <div className="card shadow-sm mt-4">
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <small className="text-muted">Rango:</small>
                                <div>
                                    <strong>{data.rango.inicio}</strong> a{" "}
                                    <strong>{data.rango.fin}</strong>
                                </div>
                            </div>
                            <div>
                                <small className="text-muted">
                                    Total general cobrado
                                </small>
                                <div className="fs-5 fw-bold">
                                    Q{" "}
                                    {Number(data.total_general).toLocaleString(
                                        undefined,
                                        {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }
                                    )}
                                </div>
                            </div>
                        </div>

                        {data.clientes.length === 0 && (
                            <div className="alert alert-warning mb-0">
                                Sin resultados para el rango seleccionado.
                            </div>
                        )}

                        {data.clientes.map((cli) => (
                            <div key={cli.idcliente} className="mb-4">
                                <div className="bg-light rounded px-3 py-2 mb-2 border">
                                    <strong>Cliente:</strong> {cli.codigo} —{" "}
                                    {cli.nombre}
                                    <span className="float-end">
                                        <strong>Total cliente:</strong> Q{" "}
                                        {cli.total_cliente.toLocaleString(
                                            undefined,
                                            {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            }
                                        )}
                                    </span>
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-sm align-middle table-hover">
                                        <thead>
                                            <tr className="table-secondary">
                                                <th style={{ minWidth: 120 }}>
                                                    Fecha recibo
                                                </th>
                                                <th>Serie</th>
                                                <th>Número</th>
                                                <th style={{ minWidth: 120 }}>
                                                    Fecha emisión CxC
                                                </th>
                                                <th>No interno</th>
                                                <th
                                                    className="text-end"
                                                    style={{ minWidth: 140 }}
                                                >
                                                    Monto pagado
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cli.recibos.flatMap((rec) =>
                                                rec.detalles.map((d, idx) => (
                                                    <tr
                                                        key={`${rec.idrecibo}-${idx}`}
                                                    >
                                                        <td>
                                                            {rec.fecha_recibo}
                                                        </td>
                                                        <td>{rec.serie}</td>
                                                        <td>{rec.numero}</td>
                                                        <td>
                                                            {d.fecha_emision ??
                                                                ""}
                                                        </td>
                                                        <td>
                                                            {d.nointerno ?? ""}
                                                        </td>
                                                        <td className="text-end">
                                                            {Number(
                                                                d.monto_pagado
                                                            ).toLocaleString(
                                                                undefined,
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                }
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
