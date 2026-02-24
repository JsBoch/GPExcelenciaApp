import React from "react";
import { Card, CardContent, Typography, Chip } from "@mui/material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cambiarEstado } from "./api";

export default function DetalleCard({ item }) {
  const id = `plan-${item.id_planificacion}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab",
    marginBottom: 8,
  };

  // 🔹 COLOR SEGÚN ESTADO
  const borderColor =
    item.estado === "EN_PROCESO"
      ? "#ff9800"
      : item.estado === "TERMINADO"
      ? "#4caf50"
      : "#1976d2";

  // 🔹 CAMBIO DE ESTADO
  const handleEstado = async (nuevoEstado) => {
    try {
      await cambiarEstado({
        id_planificacion: item.id_planificacion,
        estado: nuevoEstado,
      });

      window.location.reload(); // luego optimizamos a actualización local
    } catch {
      alert("No se pudo cambiar estado");
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={{ ...style, borderLeft: `6px solid ${borderColor}` }}
      {...attributes}
      {...listeners}
      variant="outlined"
    >
      <CardContent style={{ padding: 10 }}>
        <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
          P-{item.nopedido} • {item.cliente}
        </Typography>

        <Typography variant="body2" style={{ marginTop: 4 }}>
          {item.descripcion || "(Sin descripción)"}
        </Typography>

        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <Chip size="small" label={`Detalle: ${item.iddetallepedidoproduccion}`} />
          <Chip size="small" label={`${item.duracion_estimada_min} min`} />
          <Chip size="small" label={`Orden: ${item.orden_cola}`} />
          <Chip size="small" label={`Estado: ${item.estado}`} />
        </div>

        {/* 🔹 BOTONES DE ESTADO */}
        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
          {item.estado !== "EN_PROCESO" && (
            <button
              className="btn btn-warning btn-sm"
              onClick={() => handleEstado("EN_PROCESO")}
            >
              Iniciar
            </button>
          )}

          {item.estado !== "TERMINADO" && (
            <button
              className="btn btn-success btn-sm"
              onClick={() => handleEstado("TERMINADO")}
            >
              Terminar
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}