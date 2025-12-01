// src/hooks/useCotizaciones.js
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import alertify from "alertifyjs";

export const useCotizaciones = () => {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(false);

    const [fechaActual, setFechaActual] = useState("");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");

    const [filtro, setFiltro] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState("");

    const [esComodin, setEsComodin] = useState(false);
    const [vendedores, setVendedores] = useState([]);
    const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");

    const fechaInicioRef = useRef("");
    const fechaFinRef = useRef("");
    const searchDebounceRef = useRef(null);

    // ============================================================
    // 🔵 CARGA INICIAL — FECHA DEL SERVIDOR
    // ============================================================
    useEffect(() => {
        const cargarFecha = async () => {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/fecha-servidor`,
                    { headers }
                );

                const fecha = res.data.fecha; // formato YYYY-MM-DD

                setFechaActual(fecha);
                setFechaInicio(fecha);
                setFechaFin(fecha);

                // Mantener referencias actualizadas
                fechaInicioRef.current = fecha;
                fechaFinRef.current = fecha;

                // Cargar cotizaciones iniciales
                await fetchCotizaciones(fecha, fecha);
            } catch {
                // Si falla, usar fecha local
                const today = new Date().toISOString().split("T")[0];

                setFechaActual(today);
                setFechaInicio(today);
                setFechaFin(today);

                fechaInicioRef.current = today;
                fechaFinRef.current = today;

                await fetchCotizaciones(today, today);
            }
        };

        cargarFecha();
    }, []);

    // ============================================================
    // 🔵 OBTENER COTIZACIONES
    // ============================================================
    const fetchCotizaciones = async (
        start = "",
        end = "",
        estado = "",
        q = ""
    ) => {
        setLoading(true);
        const token = localStorage.getItem("token");
        const params = new URLSearchParams();

        if (start) params.append("fecha_inicio", start);
        if (end) params.append("fecha_fin", end);
        if (estado) params.append("estado", estado);
        if (q) params.append("q", q);

        if (esComodin && vendedorSeleccionado)
            params.append("idvendedor", vendedorSeleccionado);

        try {
            const { data } = await axios.get(`/api/cotizaciones?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setCotizaciones(data);
        } catch {
            alertify.error("Error al obtener cotizaciones");
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // 🔵 BÚSQUEDA + DEBOUNCE
    // ============================================================
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setFiltro(value);

        if (searchDebounceRef.current)
            clearTimeout(searchDebounceRef.current);

        searchDebounceRef.current = setTimeout(() => {
            fetchCotizaciones(
                value ? "" : fechaInicioRef.current,
                value ? "" : fechaFinRef.current,
                estadoFiltro,
                value.trim()
            );
        }, 400);
    };

    return {
        cotizaciones,
        loading,

        fechaActual,
        fechaInicio,
        fechaFin,
        setFechaInicio,
        setFechaFin,

        estadoFiltro,
        setEstadoFiltro,

        filtro,
        setFiltro,
        handleSearchChange,

        fetchCotizaciones,

        esComodin,
        setEsComodin,

        vendedores,
        setVendedores,

        vendedorSeleccionado,
        setVendedorSeleccionado,

        fechaInicioRef,
        fechaFinRef,
    };
};
