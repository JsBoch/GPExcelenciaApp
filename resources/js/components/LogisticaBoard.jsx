import React, { useEffect, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";

export default function LogisticaBoard() {
    const [areas, setAreas] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    const cargarBoard = async () => {
        setLoading(true);

        try {
            const token = localStorage.getItem("token");

            const response = await axios.get("/api/logistica-produccion/board", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setAreas(response.data.areas || []);
            setItems(response.data.items || []);
        } catch (error) {
            console.error(error);
            alertify.error("Error al cargar monitor de logística.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarBoard();
    }, []);

    const cambiarFecha = async (itemId, fecha) => {
        try {
            const token = localStorage.getItem("token");

            await axios.put(
                `/api/logistica-produccion/${itemId}/fecha`,
                {
                    fecha_logistica: fecha,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            alertify.success("Fecha actualizada.");
            cargarBoard();
        } catch (error) {
            console.error(error);
            alertify.error("Error al actualizar fecha.");
        }
    };

    const cambiarEstado = async (itemId, estado) => {
        try {
            const token = localStorage.getItem("token");

            await axios.put(
                `/api/logistica-produccion/${itemId}/estado`,
                {
                    estado_logistica: estado,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            alertify.success("Estado actualizado.");
            cargarBoard();
        } catch (error) {
            console.error(error);
            alertify.error("Error al actualizar estado.");
        }
    };

    const getItemsPorArea = (idArea) => {
        return items.filter(
            (item) => Number(item.id_areatrabajo) === Number(idArea),
        );
    };

    if (loading) {
        return <p className="text-center">Cargando logística...</p>;
    }

    return (
        <div
            style={{
                display: "flex",
                gap: "16px",
                overflowX: "auto",
                paddingBottom: "16px",
            }}
        >
            {areas.map((area) => {
                const areaItems = getItemsPorArea(area.id_areatrabajo);

                return (
                    <div
                        key={area.id_areatrabajo}
                        style={{
                            minWidth: "320px",
                            background: "#f4f5f7",
                            borderRadius: "12px",
                            padding: "12px",
                            border: "1px solid #ddd",
                        }}
                    >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="fw-bold mb-0">{area.nombre}</h6>

                            <span className="badge bg-primary">
                                {areaItems.length}
                            </span>
                        </div>

                        <small className="text-muted d-block mb-3">
                            Capacidad diaria:{" "}
                            {area.capacidad_diaria_min || "No definida"}
                        </small>

                        {areaItems.length === 0 && (
                            <div className="alert alert-light border">
                                Sin pedidos asignados.
                            </div>
                        )}

                        {areaItems.map((item) => (
                            <div
                                key={item.id}
                                className="card mb-3 shadow-sm"
                                style={{
                                    borderLeft:
                                        item.estado_logistica === "FINALIZADO"
                                            ? "5px solid #198754"
                                            : item.estado_logistica ===
                                                "EN_PROCESO"
                                              ? "5px solid #0d6efd"
                                              : "5px solid #ffc107",
                                }}
                            >
                                <div className="card-body p-3">
                                    <div className="d-flex justify-content-between">
                                        <strong>{item.nopedido_texto}</strong>
                                        <span className="badge bg-warning text-dark">
                                            {item.estado_logistica}
                                        </span>
                                    </div>

                                    <div className="mt-2">
                                        <strong>Cliente:</strong>
                                        <br />
                                        {item.cliente}
                                    </div>

                                    <div className="mt-2">
                                        <strong>Trabajo:</strong>
                                        <br />
                                        {item.trabajo}
                                    </div>

                                    <div className="mt-2">
                                        <strong>Fecha logística:</strong>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm mt-1"
                                            value={
                                                item.fecha_logistica ||
                                                item.fecha_programada ||
                                                ""
                                            }
                                            onChange={(e) =>
                                                cambiarFecha(
                                                    item.id,
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="mt-2">
                                        <strong>Estado:</strong>
                                        <select
                                            className="form-select form-select-sm mt-1"
                                            value={item.estado_logistica}
                                            onChange={(e) =>
                                                cambiarEstado(
                                                    item.id,
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="PENDIENTE">
                                                Pendiente
                                            </option>
                                            <option value="EN_PROCESO">
                                                En proceso
                                            </option>
                                            <option value="PAUSADO">
                                                Pausado
                                            </option>
                                            <option value="FINALIZADO">
                                                Finalizado
                                            </option>
                                        </select>
                                    </div>

                                    <div className="mt-2 text-muted small">
                                        Entrega pedido:{" "}
                                        {item.fecha_entrega || "N/A"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}