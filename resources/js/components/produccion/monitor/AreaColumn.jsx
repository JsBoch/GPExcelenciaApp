import React, { useMemo } from "react";
import { Card, CardContent, Typography, LinearProgress } from "@mui/material";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import DetalleCard from "./DetalleCard";

export default function AreaColumn({ area, items }) {
  const containerId = `area-${area.id_areatrabajo}`;

  const ids = useMemo(
    () => (items || []).map((x) => `plan-${x.id_planificacion}`),
    [items]
  );

  const usado = area.usado_min || 0;
  const cap = area.capacidad_diaria_min || 0;
  const pct = cap > 0 ? Math.min(100, Math.round((usado / cap) * 100)) : 0;

  return (
    <Card style={{ minWidth: 340, maxWidth: 360 }}>
      <CardContent>
        <Typography variant="h6" style={{ fontWeight: 800 }}>
          {area.nombre}
        </Typography>

        <Typography variant="caption" color={usado > cap ? "error" : "text.secondary"}>
          Capacidad: {usado}/{cap} min
        </Typography>

        <LinearProgress
          variant="determinate"
          value={pct}
          style={{ height: 8, borderRadius: 10, marginTop: 8, marginBottom: 12 }}
        />

        <SortableContext id={containerId} items={ids} strategy={verticalListSortingStrategy}>
          <div style={{ minHeight: 40 }}>
            {(items || []).map((it) => (
              <DetalleCard key={it.id_planificacion} item={it} />
            ))}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}