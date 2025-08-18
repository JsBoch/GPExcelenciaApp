import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import ReportePrefacturacionPDF from './ReportePrefacturacionModal';
import Header from "../../Header";

export default function ReportePrefacturacion() {
  const [vendedores, setVendedores] = useState([]);
  const [filtros, setFiltros] = useState(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    return { desde: hoy, hasta: hoy, vendedor_id: '' };
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    axios.get('/api/vendedores', { headers: authHeaders() })
      .then(res => setVendedores(res.data || []))
      .catch(() => setVendedores([]));
  }, []);

  const canBuscar = useMemo(() => Boolean(filtros.desde && filtros.hasta), [filtros]);
  const onChange = (e) => setFiltros(f => ({ ...f, [e.target.name]: e.target.value }));

  const verReporte = async (e) => {
    e.preventDefault();
    if (!canBuscar) return;
    try {
      setLoading(true);
      const body = { desde: filtros.desde, hasta: filtros.hasta, vendedor_id: filtros.vendedor_id || undefined };
      const resp = await axios.post('/api/reportes-contabilidad/cotizaciones/prefacturacion/data', body, {
        headers: { ...authHeaders(), 'Content-Type': 'application/json' }
      });
      setData(resp.data);
      setShow(true);
    } catch (err) {
      console.error(err);
      alert('No se pudo cargar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3">      
      <Header title="Reporte de Cotizaciones (Prefacturación)" />
      <form onSubmit={verReporte} className="row g-3 align-items-end">
        <div className="col-12 col-md-3">
          <label className="form-label">Desde</label>
          <input type="date" name="desde" className="form-control" value={filtros.desde} onChange={onChange} required />
        </div>
        <div className="col-12 col-md-3">
          <label className="form-label">Hasta</label>
          <input type="date" name="hasta" className="form-control" value={filtros.hasta} onChange={onChange} required />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label">Vendedor</label>
          <select name="vendedor_id" className="form-select" value={filtros.vendedor_id} onChange={onChange}>
            <option value="">Todos</option>
            {vendedores.map(v => <option key={v.id_empleado} value={v.id_empleado}>{v.nombre}</option>)}
          </select>
        </div>
        <div className="col-12 col-md-2 d-grid">
          <button type="submit" className="btn btn-primary" disabled={!canBuscar || loading}>
            {loading ? 'Generando…' : 'Ver reporte'}
          </button>
        </div>
      </form>

      {show && data && <ReportePrefacturacionPDF data={data} onClose={() => setShow(false)} />}
    </div>
  );
}
