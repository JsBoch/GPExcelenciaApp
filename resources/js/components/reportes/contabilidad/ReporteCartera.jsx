import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../../Header";
import { FaEye, FaFilePdf } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

export default function ReporteCartera() {
    const [departamentos, setDepartamentos] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [filtros, setFiltros] = useState({
        departamento_id: "",
        vendedor_id: "",
        fecha_reporte: new Date().toISOString().slice(0, 10),
    });
    const [loading, setLoading] = useState(false);
    const [opts, setOpts] = useState({
        break_por_cliente: false,
        landscape: true,
    });

    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        Promise.all([
            axios.get(`/api/departamentos-pais`, { headers }),
            axios.get(`/api/vendedores`, { headers }),
        ])
            .then(([deps, vends]) => {
                setDepartamentos(deps.data || []);
                setVendedores(vends.data || []);
            })
            .catch(console.error);
    }, []);

    const onChange = (e) => {
        setFiltros((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const generarHtml = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Sesión expirada.");
                return;
            }
            const headers = { Authorization: `Bearer ${token}` };
            const body = {
                departamento_id: filtros.departamento_id
                    ? Number(filtros.departamento_id)
                    : undefined,
                vendedor_id: filtros.vendedor_id
                    ? Number(filtros.vendedor_id)
                    : undefined,
                fecha_reporte: filtros.fecha_reporte,
                break_por_cliente: opts.break_por_cliente ? 1 : 0,
                landscape: opts.landscape ? 1 : 0,
            };
            const resp = await axios.post(
                `/api/reportes-contabilidad/cartera/html`,
                body,
                { headers, responseType: "blob" }
            );
            const blob = new Blob([resp.data], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
        } catch (err) {
            console.error(err);
            alert("No se pudo generar el reporte.");
        } finally {
            setLoading(false);
        }
    };

    const generarPdf = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            const toQuery = (obj) => {
                const params = new URLSearchParams();
                Object.entries(obj).forEach(([k, v]) => {
                    if (v === "" || v === null || v === undefined) return;
                    if (typeof v === "boolean") v = v ? "1" : "0";
                    params.append(k, v);
                });
                return params.toString();
            };
            const qs = toQuery({ ...filtros, ...opts });
            const resp = await axios.get(
                `/api/reportes-contabilidad/cartera/pdf?${qs}`,
                { headers, responseType: "blob" }
            );
            const cd = resp.headers["content-disposition"];
            const suggested =
                (cd && /filename="?([^"]+)"?/.exec(cd)?.[1]) ||
                `cartera_${filtros.fecha_reporte}.pdf`;
            const blob = new Blob([resp.data], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = suggested;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            if (err.response?.data instanceof Blob) {
                const text = await err.response.data.text();
                console.error("PDF ERROR:", text);
                alert("No se pudo generar el PDF:\n" + text);
            } else {
                console.error(err);
                alert("No se pudo generar el PDF.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 bg-white rounded">
            <Header title="Reporte de Cartera" />

            <div className="row g-3 mb-3">
                <div className="col-md-3">
                    <label className="form-label">Departamento</label>
                    <select
                        name="departamento_id"
                        value={filtros.departamento_id}
                        onChange={onChange}
                        className="form-select"
                    >
                        <option value="">Todos</option>
                        {departamentos.map((d) => (
                            <option key={d.iddepartamentopais} value={d.iddepartamentopais}>
                                {d.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="col-md-3">
                    <label className="form-label">Vendedor</label>
                    <select
                        name="vendedor_id"
                        value={filtros.vendedor_id}
                        onChange={onChange}
                        className="form-select"
                    >
                        <option value="">Todos</option>
                        {vendedores.map((v) => (
                            <option key={v.id_empleado} value={v.id_empleado}>
                                {v.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="col-md-3">
                    <label className="form-label">Fecha del reporte</label>
                    <input
                        type="date"
                        name="fecha_reporte"
                        value={filtros.fecha_reporte}
                        onChange={onChange}
                        className="form-control"
                    />
                </div>

                <div className="col-md-3 d-flex flex-column justify-content-center">
                    <div className="form-check">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            checked={opts.break_por_cliente}
                            onChange={(e) =>
                                setOpts((o) => ({ ...o, break_por_cliente: e.target.checked }))
                            }
                            id="checkCliente"
                        />
                        <label className="form-check-label" htmlFor="checkCliente">
                            Salto por cliente
                        </label>
                    </div>
                    <div className="form-check">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            checked={opts.landscape}
                            onChange={(e) =>
                                setOpts((o) => ({ ...o, landscape: e.target.checked }))
                            }
                            id="checkHorizontal"
                        />
                        <label className="form-check-label" htmlFor="checkHorizontal">
                            Orientación horizontal
                        </label>
                    </div>
                </div>
            </div>

            <div className="d-flex gap-2">
                <button
                    onClick={generarHtml}
                    disabled={loading}
                    className="btn btn-primary d-flex align-items-center gap-2"
                >
                    <FaEye />
                    {loading ? "Generando…" : "Ver en HTML"}
                </button>
                <button
                    onClick={generarPdf}
                    disabled={loading}
                    className="btn btn-success d-flex align-items-center gap-2"
                >
                    <FaFilePdf />
                    {loading ? "Generando…" : "Descargar PDF"}
                </button>
            </div>
        </div>
    );
}
