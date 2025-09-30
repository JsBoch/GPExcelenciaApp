import React, { useState, useEffect } from "react";
import axios from "axios";
import Header from "../../Header";

export default function ResumenFacturasPagadas() {
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [cargando, setCargando] = useState(false);
  const [data, setData] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Al montar, usa la fecha del servidor (ruta sin auth). Si tu ruta sí requiere auth, agrega { headers: getAuthHeaders() }
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const resp = await axios.get(`/api/fecha-servidor`); // -> { fecha: "YYYY-MM-DD" }
        const hoy = resp.data?.fecha;
        if (!cancel && hoy) {
          setInicio((prev) => prev || hoy);
          setFin((prev) => prev || hoy);
        }
      } catch {
        // Fallback local
        const d = new Date();
        const hoyLocal = d.toISOString().slice(0, 10);
        if (!cancel) {
          setInicio((p) => p || hoyLocal);
          setFin((p) => p || hoyLocal);
        }
      }
    })();
    return () => { cancel = true; };
  }, []);

  const consultar = async (e) => {
    e.preventDefault();
    if (!inicio || !fin) return alert("Selecciona ambas fechas");

    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      alert("Sesión expirada. Vuelve a iniciar sesión.");
      return;
    }

    setCargando(true);
    try {
      const resp = await axios.get(
        `/api/reportes-contabilidad/resumen-facturas-pagadas/data`,
        { headers, params: { fecha_inicio: inicio, fecha_fin: fin } }
      );
      setData(resp.data);
    } catch (err) {
      console.error(err);
      alert("No se pudo cargar la información");
    } finally {
      setCargando(false);
    }
  };

  // Descargar/abrir PDF con el mismo header Authorization
  const verPdf = async () => {
    if (!inicio || !fin) return alert("Selecciona ambas fechas");

    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      alert("Sesión expirada. Vuelve a iniciar sesión.");
      return;
    }

    try {
      const resp = await axios.get(
        `/api/reportes-contabilidad/resumen-facturas-pagadas/pdf`,
        { headers, params: { fecha_inicio: inicio, fecha_fin: fin }, responseType: "blob" }
      );
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
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
          <h5 className="card-title mb-3">RESUMEN DE FACTURAS PAGADAS</h5>
          <form className="row g-3" onSubmit={consultar}>
            <div className="col-md-3">
              <label className="form-label">Fecha inicio (recibo)</label>
              <input type="date" className="form-control" value={inicio}
                     onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Fecha fin (recibo)</label>
              <input type="date" className="form-control" value={fin}
                     onChange={(e) => setFin(e.target.value)} />
            </div>
            <div className="col-md-6 d-flex align-items-end gap-2">
              <button type="submit" className="btn btn-primary" disabled={cargando}>
                {cargando ? "Cargando…" : "Ver datos"}
              </button>
              <button type="button" className="btn btn-outline-success" onClick={verPdf}>
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
                  <strong>{data.rango.inicio}</strong> a <strong>{data.rango.fin}</strong>
                </div>
              </div>
              <div>
                <small className="text-muted">Total general cobrado</small>
                <div className="fs-5 fw-bold">
                  Q {Number(data.total_general).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  <strong>Cliente:</strong> {cli.codigo} — {cli.nombre}
                  <span className="float-end">
                    <strong>Total cliente:</strong> Q{" "}
                    {cli.total_cliente.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm align-middle table-hover">
                    <thead>
                      <tr className="table-secondary">
                        <th style={{ minWidth: 120 }}>Fecha recibo</th>
                        <th>Serie</th>
                        <th>Número</th>
                        <th style={{ minWidth: 120 }}>Fecha emisión CxC</th>
                        <th>No interno</th>
                        <th className="text-end" style={{ minWidth: 140 }}>Monto pagado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cli.recibos.flatMap((rec) =>
                        rec.detalles.map((d, idx) => (
                          <tr key={`${rec.idrecibo}-${idx}`}>
                            <td>{rec.fecha_recibo}</td>
                            <td>{rec.serie}</td>
                            <td>{rec.numero}</td>
                            <td>{d.fecha_emision ?? ""}</td>
                            <td>{d.nointerno ?? ""}</td>
                            <td className="text-end">
                              {Number(d.monto_pagado).toLocaleString(undefined, {
                                minimumFractionDigits: 2, maximumFractionDigits: 2,
                              })}
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