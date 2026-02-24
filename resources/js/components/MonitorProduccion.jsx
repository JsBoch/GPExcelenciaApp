import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button
} from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

function MonitorProduccion() {

    const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
    const [estadoFiltro, setEstadoFiltro] = useState("PENDIENTE");

    const [areas, setAreas] = useState([]);
    const [columns, setColumns] = useState({});

    const [pedidos, setPedidos] = useState([]);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState("");
    const [detalles, setDetalles] = useState([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
    const [areaSeleccionada, setAreaSeleccionada] = useState("");

    useEffect(() => {
        cargarTablero();
        cargarPedidos();
    }, [fecha, estadoFiltro]);

    useEffect(() => {
        if (pedidoSeleccionado) {
            cargarDetallesPedido(pedidoSeleccionado);
        } else {
            setDetalles([]);
        }
    }, [pedidoSeleccionado]);

    const getHeaders = () => {
        const token = localStorage.getItem("token");
        return { Authorization: `Bearer ${token}` };
    };

    const cargarTablero = async () => {
        const res = await axios.get(
            `/api/planificacion/tablero/${fecha}?estado=${estadoFiltro}`,
            { headers: getHeaders() }
        );
        setAreas(res.data.areas || []);
        setColumns(res.data.columns || {});
    };

    const cargarPedidos = async () => {
        const res = await axios.get(
            `/api/planificacion/pedidos/${fecha}`,
            { headers: getHeaders() }
        );
        setPedidos(res.data || []);
    };

    const cargarDetallesPedido = async (idpedido) => {
        const res = await axios.get(
            `/api/planificacion/pedidos/${fecha}/${idpedido}`,
            { headers: getHeaders() }
        );
        setDetalles(res.data || []);
    };

    const abrirModal = (detalle) => {
        setDetalleSeleccionado(detalle);
        setAreaSeleccionada("");
        setModalOpen(true);
    };

    const confirmarAsignacion = async () => {
        if (!areaSeleccionada) return alert("Seleccione un área");

        try {
            await axios.post(
                "/api/planificacion/asignar",
                {
                    iddetallepedidoproduccion:
                        detalleSeleccionado.iddetallepedidoproduccion,
                    id_areatrabajo: areaSeleccionada,
                    fecha_programada: fecha,
                },
                { headers: getHeaders() }
            );

            setModalOpen(false);
            cargarTablero();
        } catch (error) {
            alert(error.response?.data?.message || "Error al asignar");
        }
    };

    const getEstadoColor = (estado) => {
        switch (estado) {
            case "PENDIENTE":
                return "#fff3cd";
            case "EN_PROCESO":
                return "#cce5ff";
            case "TERMINADO":
                return "#d4edda";
            default:
                return "#ffffff";
        }
    };

    const onDragEnd = async (result) => {

        if (!result.destination) return;

        const sourceArea = result.source.droppableId;
        const destArea = result.destination.droppableId;

        const sourceItems = Array.from(columns[sourceArea] || []);
        const [movedItem] = sourceItems.splice(result.source.index, 1);

        const destItems =
            sourceArea === destArea
                ? sourceItems
                : Array.from(columns[destArea] || []);

        destItems.splice(result.destination.index, 0, movedItem);

        setColumns({
            ...columns,
            [sourceArea]: sourceArea === destArea ? destItems : sourceItems,
            [destArea]: destItems
        });

        try {
            await axios.put(
                "/api/planificacion/mover",
                {
                    id_planificacion: movedItem.id_planificacion,
                    to_area: parseInt(destArea),
                    to_fecha: fecha,
                    to_index: result.destination.index
                },
                { headers: getHeaders() }
            );

            await axios.put(
                "/api/planificacion/reordenar",
                {
                    id_area: parseInt(destArea),
                    fecha: fecha,
                    ids: destItems.map(x => x.id_planificacion)
                },
                { headers: getHeaders() }
            );

        } catch {
            alert("Error moviendo item");
            cargarTablero();
        }
    };

    return (
        <Box className="mt-4">
            <Typography variant="h5">Monitor de Producción</Typography>

            {/* FILTROS */}
            <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
                <div>
                    <Typography variant="caption">Fecha</Typography>
                    <input
                        type="date"
                        className="form-control form-control-sm"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                    />
                </div>

                <div>
                    <Typography variant="caption">Estado</Typography>
                    <select
                        className="form-control form-control-sm"
                        value={estadoFiltro}
                        onChange={(e) => setEstadoFiltro(e.target.value)}
                        style={{ width: 180 }}
                    >
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="EN_PROCESO">EN PROCESO</option>
                        <option value="TERMINADO">TERMINADO</option>
                    </select>
                </div>
            </div>

            {/* PEDIDOS */}
            <Card sx={{ mt: 3 }}>
                <CardContent>
                    <Typography variant="h6">Pedidos Pendientes</Typography>
                    <select
                        className="form-control"
                        value={pedidoSeleccionado}
                        onChange={(e) =>
                            setPedidoSeleccionado(e.target.value)
                        }
                    >
                        <option value="">Seleccione pedido</option>
                        {pedidos.map((p) => (
                            <option
                                key={p.idpedidoproduccion}
                                value={p.idpedidoproduccion}
                            >
                                Pedido #{p.nopedido}
                            </option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            {/* DETALLES */}
            {pedidoSeleccionado && (
                <Card sx={{ mt: 3 }}>
                    <CardContent>
                        <Typography variant="h6">
                            Detalles del Pedido
                        </Typography>

                        {detalles.map((d) => (
                            <div
                                key={d.iddetallepedidoproduccion}
                                style={{
                                    marginTop: 10,
                                    padding: 8,
                                    border: "1px solid #ddd",
                                    borderRadius: 6,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    transition: "all .2s ease"
                                }}
                            >
                                <div>
                                    <strong>{d.descripcion}</strong>
                                    <br />
                                    Cliente: {d.cliente}
                                </div>

                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => abrirModal(d)}
                                >
                                    Asignar
                                </button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* COLUMNAS */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div style={{ display: "flex", gap: 20, marginTop: 30, overflowX: "auto" }}>
                    {areas.map((area) => (
                        <Droppable
                            droppableId={String(area.id_areatrabajo)}
                            key={area.id_areatrabajo}
                        >
                            {(provided, snapshot) => (
                                <Card
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    style={{
                                        minWidth: 300,
                                        background: snapshot.isDraggingOver ? "#f8f9fa" : "#ffffff",
                                        transition: "background .2s ease"
                                    }}
                                >
                                    <CardContent>
                                        <Typography variant="h6">
                                            {area.nombre}
                                        </Typography>

                                        <Typography variant="caption">
                                            Capacidad: {area.usado_min} / {area.capacidad_diaria_min} min
                                        </Typography>

                                        {(columns[area.id_areatrabajo] || []).map((item, index) => (
                                            <Draggable
                                                key={item.id_planificacion}
                                                draggableId={String(item.id_planificacion)}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            marginTop: 10,
                                                            padding: 10,
                                                            borderRadius: 8,
                                                            border: "1px solid #ddd",
                                                            background: getEstadoColor(item.estado),
                                                            boxShadow: snapshot.isDragging
                                                                ? "0 8px 20px rgba(0,0,0,0.2)"
                                                                : "0 2px 4px rgba(0,0,0,0.05)",
                                                            transform: snapshot.isDragging
                                                                ? "rotate(2deg)"
                                                                : "none",
                                                            transition: "all .2s ease",
                                                            cursor: "grab",
                                                            ...provided.draggableProps.style
                                                        }}
                                                    >
                                                        <strong>Pedido #{item.nopedido}</strong>
                                                        <br />
                                                        {item.descripcion}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}

                                        {provided.placeholder}
                                    </CardContent>
                                </Card>
                            )}
                        </Droppable>
                    ))}
                </div>
            </DragDropContext>

            {/* MODAL */}
            <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
                <DialogTitle>Asignar Detalle</DialogTitle>
                <DialogContent>
                    {detalleSeleccionado && (
                        <>
                            <Typography>
                                {detalleSeleccionado.descripcion}
                            </Typography>

                            <Typography variant="caption">
                                Área
                            </Typography>

                            <select
                                className="form-control"
                                value={areaSeleccionada}
                                onChange={(e) =>
                                    setAreaSeleccionada(e.target.value)
                                }
                            >
                                <option value="">Seleccione área</option>
                                {areas.map((a) => (
                                    <option
                                        key={a.id_areatrabajo}
                                        value={a.id_areatrabajo}
                                    >
                                        {a.nombre}
                                    </option>
                                ))}
                            </select>
                        </>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setModalOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={confirmarAsignacion}
                    >
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default MonitorProduccion;