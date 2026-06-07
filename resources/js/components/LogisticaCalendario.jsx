import React, { useEffect, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function LogisticaCalendario() {
    const [events, setEvents] = useState([]);

    const cargarCalendario = async () => {
        try {
            const token = localStorage.getItem("token");

            const response = await axios.get(
                "/api/logistica-produccion/calendario",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            const eventos = response.data.map((item) => ({
                id: item.id,
                title: item.title,
                start: item.fecha_logistica,
                allDay: true,
                extendedProps: item,
            }));

            setEvents(eventos);
        } catch (error) {
            console.error(error);
            alertify.error("Error al cargar calendario.");
        }
    };

    useEffect(() => {
        cargarCalendario();
    }, []);

    const cambiarFechaEvento = async (info) => {
        try {
            const token = localStorage.getItem("token");

            await axios.put(
                `/api/logistica-produccion/${info.event.id}/fecha`,
                {
                    fecha_logistica: info.event.startStr,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            alertify.success("Fecha actualizada.");
            cargarCalendario();
        } catch (error) {
            console.error(error);
            info.revert();
            alertify.error("No se pudo mover el pedido.");
        }
    };

    return (
        <div className="bg-white p-3 border rounded">
            <FullCalendar
                plugins={[
                    dayGridPlugin,
                    timeGridPlugin,
                    interactionPlugin,
                ]}
                initialView="dayGridMonth"
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                locale="es"
                events={events}
                editable={true}
                eventDrop={cambiarFechaEvento}
                height="auto"
            />
        </div>
    );
}