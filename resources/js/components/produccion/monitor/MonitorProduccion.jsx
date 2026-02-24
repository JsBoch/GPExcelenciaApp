import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import AreaColumn from "./AreaColumn";
import { getTablero, moverItem, reordenarColumna } from "./api";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function MonitorProduccion() {
  const [fecha, setFecha] = useState(todayISO());
  const [areas, setAreas] = useState([]);
  const [columns, setColumns] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchTablero = async () => {
    try {
      setLoading(true);
      const data = await getTablero(fecha);
      setAreas(data.areas || []);
      setColumns(data.columns || {});
    } catch (e) {
      alertify.error("Error cargando tablero");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTablero();
  }, [fecha]);

  const findContainer = (dragId) => {
    // dragId viene como "plan-123"
    for (const [areaId, items] of Object.entries(columns)) {
      if ((items || []).some((x) => `plan-${x.id_planificacion}` === dragId)) {
        return areaId;
      }
    }
    return null;
  };

  const onDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id; // "plan-10"
    const overId = over.id;     // puede ser "plan-12" o "area-3"

    const fromAreaId = findContainer(activeId);
    if (!fromAreaId) return;

    // destino: si cae sobre card => buscar su contenedor; si cae sobre columna => parse
    let toAreaId = null;

    if (String(overId).startsWith("area-")) {
      toAreaId = String(overId).replace("area-", "");
    } else {
      toAreaId = findContainer(overId);
    }

    if (!toAreaId) return;

    const fromItems = columns[fromAreaId] || [];
    const toItems = columns[toAreaId] || [];

    const activeIndex = fromItems.findIndex((x) => `plan-${x.id_planificacion}` === activeId);

    // si cae sobre columna vacía (overId = area-x), lo ponemos al final
    let overIndex = toItems.length;
    if (!String(overId).startsWith("area-")) {
      overIndex = toItems.findIndex((x) => `plan-${x.id_planificacion}` === overId);
      if (overIndex < 0) overIndex = toItems.length;
    }

    // No cambio
    if (fromAreaId === toAreaId && activeIndex === overIndex) return;

    // ====== UI optimista ======
    const snapshot = JSON.parse(JSON.stringify(columns));

    try {
      if (fromAreaId === toAreaId) {
        // Reordenar dentro misma columna
        const newItems = arrayMove(fromItems, activeIndex, overIndex);
        setColumns((prev) => ({ ...prev, [fromAreaId]: newItems }));

        // Persistir orden (ids en orden)
        await reordenarColumna({
          id_area: Number(fromAreaId),
          fecha,
          ids: newItems.map((x) => x.id_planificacion),
        });

      } else {
        // Mover entre columnas (misma fecha)
        const moving = fromItems[activeIndex];

        const newFrom = [...fromItems];
        newFrom.splice(activeIndex, 1);

        const newTo = [...toItems];
        newTo.splice(overIndex, 0, moving);

        setColumns((prev) => ({
          ...prev,
          [fromAreaId]: newFrom,
          [toAreaId]: newTo,
        }));

        // Persistir move
        await moverItem({
          id_planificacion: Number(moving.id_planificacion),
          to_area: Number(toAreaId),
          to_fecha: fecha,
          to_index: Number(overIndex),
        });

        // (opcional) re-fetch para recalcular usado/capacidad con exactitud
        await fetchTablero();
      }
    } catch (e) {
      // rollback
      setColumns(snapshot);
      const msg = e?.response?.data?.message || "No se pudo mover (capacidad/validación)";
      alertify.alert("NO PERMITIDO", msg);
      await fetchTablero(); // asegurar consistencia final
    }
  };

  const columnsUI = useMemo(() => {
    return areas.map((a) => ({
      area: a,
      items: columns[String(a.id_areatrabajo)] || [],
    }));
  }, [areas, columns]);

  return (
    <Box className="mt-4 px-3 px-md-4">
      <Typography variant="h5" style={{ fontWeight: 900 }}>
        Monitor de Producción (Kanban)
      </Typography>

      <Card className="mt-3 shadow-sm">
        <CardContent style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <Typography variant="caption" color="text.secondary">Fecha</Typography>
            <input
              type="date"
              className="form-control form-control-sm"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={{ width: 180 }}
            />
          </div>

          <div>
            <Typography variant="caption" color="text.secondary">Estado</Typography>
            <div style={{ fontSize: 13 }}>
              {loading ? "Cargando..." : "Listo"}
            </div>
          </div>
        </CardContent>
      </Card>

      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div style={{ display: "flex", gap: 16, marginTop: 16, overflowX: "auto", paddingBottom: 12 }}>
          {columnsUI.map(({ area, items }) => (
            <div key={area.id_areatrabajo} id={`area-${area.id_areatrabajo}`}>
              {/* IMPORTANTE: el SortableContext ya está adentro de AreaColumn */}
              <AreaColumn area={area} items={items} />
            </div>
          ))}
        </div>
      </DndContext>
    </Box>
  );
}