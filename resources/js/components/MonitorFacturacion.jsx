// 👇 Refactor del componente MonitorFacturacion con mejoras similares a ListaCotizaciones
import React, { useState, useEffect } from "react";
import axios from "axios";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import alertify from "alertifyjs";
import { format } from "date-fns";
import {
    FaSearch,
    FaFilePdf,
    FaFileInvoice,
    FaFileInvoiceDollar,
    FaUndo,
} from "react-icons/fa";
import CotizacionPDF from "./CotizacionPDF";
import { PDFViewer } from "@react-pdf/renderer";
import Header from "./Header";
import "../../css/tableFormat.css";
import "../../css/monitor_cotizaciones.css";

import "bootstrap/dist/js/bootstrap.bundle.min.js";
import * as bootstrap from "bootstrap";
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from "reactstrap";

DataTable.use(DT);

function MonitorFacturacion() {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null);
    const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
    const [filtro, setFiltro] = useState("");
    const [pdfData, setPdfData] = useState(null);
    const navigate = useNavigate();
    const today = new Date().toISOString().split("T")[0]; // formato YYYY-MM-DD
    const [fechaInicio, setFechaInicio] = useState(today);
    const [fechaFinal, setFechaFinal] = useState(today);
    const [mostrarModalErrores, setMostrarModalErrores] = useState(false);
    const [cliente, setCliente] = useState(null);
    const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
    const [estadoFiltro, setEstadoFiltro] = useState("");

    useEffect(() => {
        fetch("/i18n/Spanish.json")
            .then((response) => response.json())
            .then((data) => setSpanishTranslation(data))
            .catch((error) =>
                console.error("Error al cargar la traducción:", error)
            );
    }, []);

    const fetchCotizaciones = () => {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
            alertify.error("Token de autenticación no encontrado");
            setCotizaciones([]);
            setLoading(false);
            return;
        }

        const params = {};
        if (fechaInicio) params.fechaInicio = fechaInicio;
        if (fechaFinal) params.fechaFinal = fechaFinal;
        if (estadoFiltro) params.estado = estadoFiltro;

        axios
            .get("/api/monitorfacturacion", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params, // envia las fechas como query params
            })
            .then((response) => {
                setCotizaciones(response.data);
                setLoading(false);
            })
            .catch(() => {
                alertify.error("Error al obtener las cotizaciones.");
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchCotizaciones();
    }, []);

    const cotizacionesFiltradas = cotizaciones.filter((cot) => {
        const texto = filtro.toLowerCase();
        return (
            cot.nocotizacion?.toLowerCase().includes(texto) ||
            cot.cliente?.toLowerCase().includes(texto) ||
            cot.total_general?.toString().includes(texto) ||
            cot.observaciones_costeo?.toLowerCase().includes(texto)
        );
    });

    const handleDesactivar = (id) => {
        const token = localStorage.getItem("token");
        if (token) {
            axios
                .put(
                    `/api/monitorfacturacion/desactivar/${id}`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )
                .then(() => {
                    setCotizaciones((prev) =>
                        prev.filter((c) => c.idcotizacion !== Number(id))
                    );
                    alertify.success("Cotización regresada a ventas.");
                })
                .catch(() => {
                    alertify.error("Error al volver la cotización a ventas.");
                });
        }
    };

    const generarPDF = async (id) => {
        const token = localStorage.getItem("token");
        if (!token)
            return alertify.error("Token no encontrado para generar PDF.");
        try {
            const response = await fetch(`/api/monitorfacturacion/${id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setPdfData(data);
        } catch {
            alertify.error("Error al generar el PDF.");
        }
    };

    const generarFactura = async (id) => {
        const token = localStorage.getItem("token");
        if (!token)
            return alertify.error("Token no encontrado para generar XML.");
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/facturar/${id}`,
                {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include",
                }
            );

            const data = await response.json();
            console.log(data);

            if (!response.ok) {
                if (data.errores) {
                    setErroresCertificacion(data.errores);
                    setMostrarModalErrores(true);
                } else {
                    alertify.error("Error al certificar.");
                }
                return;
            }

            alertify.success(`Factura generada. UUID: ${data.uuid}`);
            fetchCotizaciones(); // Opcional: refrescar datos
        } catch (error) {
            alertify.error("Error al generar el XML.");
        }
    };

    const abrirFacturaPDF = async (id) => {
        const token = localStorage.getItem("token");
        if (!token)
            return alertify.error("Token no encontrado para abrir PDF.");
        try {
            const response = await fetch(
                `${
                    import.meta.env.VITE_API_URL
                }/monitorfacturacion/${id}/facturapdf`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            URL.revokeObjectURL(url);
        } catch {
            alertify.error("Error al abrir el PDF.");
        }
    };

    useEffect(() => {
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.forEach((el) => {
            new bootstrap.Tooltip(el);
        });
    }, []);

    const limpiarFiltro = () => setFiltro("");

    const handleAnularFactura = () => {
        alertify.prompt(
            "Anulación de factura",
            "Ingrese el motivo de la anulación:",
            "",
            async function (evt, motivo) {
                if (!motivo || motivo.trim() === "") {
                    alertify.error("Debe ingresar un motivo.");
                    return;
                }

                try {
                    const token = localStorage.getItem("token");
                    const response = await axios.put(
                        `/api/facturar/${registroSeleccionado.idcotizacion}/anular`,
                        { motivo },
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    alertify.success("Factura anulada con éxito.");
                    fetchCotizaciones(); // recargar datos
                } catch (error) {
                    console.error(error);
                    alertify.error("Error al anular la factura.");
                }
            },
            function () {
                alertify.error("Anulación cancelada.");
            }
        );
    };

    const generarNotaCredito = async (id) => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/notacredito/${id}`,
                {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include",
                }
            );

            const data = await response.json();

            if (!response.ok || !data.resultado) {
                alertify.error("No certificado: " + (data.errores || "Error"));
                return;
            }

            alertify.success(`Nota de crédito certificada. UUID: ${data.uuid}`);
            fetchCotizaciones(); // refresca tabla
        } catch (error) {
            alertify.error("Error al generar nota de crédito.");
        }
    };

    const generarNotaDebito = async (id) => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/notadebito/${id}`,
                {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include",
                }
            );

            const data = await response.json();

            if (!response.ok || !data.resultado) {
                alertify.error("No certificado: " + (data.errores || "Error"));
                return;
            }

            alertify.success(`Nota de débito certificada. UUID: ${data.uuid}`);
            fetchCotizaciones();
        } catch (error) {
            alertify.error("Error al generar nota de débito.");
        }
    };

    const handleEditarCliente = async (idcliente) => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const { data } = await axios.get(`/api/clientes/${idcliente}`, {
                headers,
            });
            console.log(data);
            setCliente(data);
            setMostrarModalCliente(true);
        } catch (error) {
            console.log(error);
            alertify.error("Error al obtener datos del cliente");
        }
    };

    const handleGuardarCliente = async () => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");
        const headers = { Authorization: `Bearer ${token}` };
        try {
            await axios.put(`/api/clientes/${cliente.idcliente}`, cliente, {
                headers,
            });
            alertify.success("Cliente actualizado");
            setMostrarModalCliente(false);
        } catch (error) {
            alertify.error("Error al actualizar cliente");
        }
    };

    const columns = [
        { data: "idcotizacion", title: "ID", visible: false },
        { data: "nocotizacion", title: "No.Cotizacion" },
        {
            data: "fecha_cotizacion",
            title: "Fecha",
            render: (data) => {
                if (data) {
                    try {
                        const date = new Date(data);
                        return format(date, "dd-MM-yyyy"); // Formatea la fecha al formato AAAA-MM-DD
                        // Otros formatos que podrías usar:
                        // return format(date, 'dd/MM/yyyy'); // Día/Mes/Año
                        // return format(date, 'MM/dd/yyyy'); // Mes/Día/Año
                    } catch (error) {
                        console.error("Error al formatear la fecha:", error);
                        return ""; // Devuelve una cadena vacía o algún otro valor en caso de error
                    }
                }
                return ""; // O algún otro valor por defecto si la fecha es nula
            },
        },
        { data: "tipo_pago", title: "Forma Pago" },
        {
            data: "total_general",
            title: "Total",
            render: (data) => {
                if (data !== null && data !== undefined) {
                    try {
                        // Formatea el número como moneda (Quetzales en Guatemala)
                        return Number(data).toLocaleString("es-GT", {
                            style: "currency",
                            currency: "GTQ",
                            minimumFractionDigits: 2, // Asegura que se muestren dos decimales
                            maximumFractionDigits: 2,
                        });
                        // Para otro país o moneda, cambia 'es-GT' y 'GTQ'
                        // Ejemplo para dólares estadounidenses:
                        // return Number(data).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                    } catch (error) {
                        console.error("Error al formatear la moneda:", error);
                        return data; // Muestra el valor sin formato en caso de error
                    }
                }
                return ""; // O algún otro valor por defecto si el total es nulo o undefined
            },
        },
        { data: "costear", title: "Costear", visible: false },
        { data: "cliente", title: "Cliente" },
        { data: "contacto", title: "Contacto" },
        {
            data: "direccion_entrega",
            title: "Dirección entrega",
            visible: false,
        },
        { data: "observaciones_costeo", title: "Obsv.Costeo", visible: false },
        {
            data: "observaciones_cliente",
            title: "Obsv.Cliente",
        },
        {
            data: "costeo_observaciones",
            title: "Obsv.Vendedor",
            visible: false,
        },
        {
            data: "idcotizacionoriginal",
            title: "ID CotizacionOriginal",
            visible: false,
        },
        { data: "idcliente", title: "ID Cliente", visible: false },
        { data: "idcontacto", title: "ID Contacto", visible: false },
        { data: "trabajo", title: "Trabajo", visible: false },
        { data: "version", title: "Version", visible: false },
        { data: "estado", title: "Estado", visible: false },
        {
            data: "uuid",
            title: "Autorización",
            render: function (data, type, row) {
                if (
                    row.resultado === "N" &&
                    Array.isArray(row.errores) &&
                    row.errores.length > 0
                ) {
                    return `<span class="text-danger fw-bold">
                <i class="bi bi-exclamation-circle me-1"></i> Error
            </span>`;
                }

                return data ? `<span class="text-success">${data}</span>` : "";
            },
        },
        { data: "errores", title: "ERRORES", visible: false },
        { data: "resultado", title: "RESULTADO", visible: false },
        {
            data: "estado_texto",
            title: "Estado",
            render: function (data, type, row) {
                let color = "secondary";
                let icon = "bi-question-circle"; // ícono por defecto

                if (
                    row.resultado === "N" &&
                    Array.isArray(row.errores) &&
                    row.errores.length > 0
                ) {
                    color = "danger";
                    icon = "bi-exclamation-triangle-fill";
                    data = "Con errores";
                } else {
                    switch (row.estado) {
                        case 4:
                            color = "warning";
                            icon = "bi-hourglass-split";
                            break;
                        case 5:
                            color = "danger";
                            icon = "bi-x-circle";
                            break;
                        case 6:
                            color = "success";
                            icon = "bi-check-circle";
                            break;
                    }
                }

                return `<span class="badge bg-${color}">
                    <i class="bi ${icon} me-1"></i> ${data}
                </span>`;
            },
        },
    ];

    const options = {
        language: spanishTranslation, // Agrega la traducción aquí
        rowCallback: (row, data) => {
            row.classList.remove(
                "estado-1",
                "estado-2",
                "estado-3",
                "estado-4",
                "estado-5",
                "estado-6"
            );

            if (data.estado) {
                row.classList.add(`estado-${data.estado}`);
            }

            // Manejo de selección de fila
            row.onclick = () => {
                const filas = row.parentNode.querySelectorAll("tr");
                filas.forEach((r) => r.classList.remove("selected"));
                row.classList.add("selected");
                setRegistroSeleccionado(data);
            };
        },
    };

    const estado = Number(registroSeleccionado?.estado);

    const puedeRegresarVenta = estado === 4;
    const puedeEliminar = estado === 1;
    const puedePreFacturar = estado === 1 || estado === 3;
    const puedeFacturar = estado === 5;
    const puedeGenerarPDFFactura = estado === 6;

    return (
        <div className="container-fluid mt-4">
            {pdfData && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                    style={{
                        backgroundColor: "rgba(0,0,0,0.7)",
                        zIndex: 1050,
                    }}
                >
                    <div
                        className="bg-white rounded shadow"
                        style={{
                            width: "80%",
                            height: "80%",
                            position: "relative",
                        }}
                    >
                        <PDFViewer width="100%" height="100%">
                            <CotizacionPDF
                                cotizacion={pdfData.cotizacion}
                                totalEnLetras={pdfData.totalEnLetras}
                                logoSrc="/images/LogoGP.jpg"
                            />
                        </PDFViewer>

                        <button
                            className="btn btn-danger position-absolute top-0 start-0 m-2"
                            onClick={() => setPdfData(null)}
                        >
                            Cerrar PDF
                        </button>
                    </div>
                </div>
            )}

            <div className="card">
                <Header title="Lista de Cotizaciones para facturar" />
                <div className="row mb-3">
                    <div className="col-md-3">
                        <label className="form-label fw-bold">Estado:</label>
                        <select
                            className="form-select"
                            value={estadoFiltro}
                            onChange={(e) => setEstadoFiltro(e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="4">PRE-FACTURACIÓN</option>
                            <option value="5">PARA FACTURAR</option>
                            <option value="6">FACTURADA</option>
                            <option value="7">ANULADA</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label fw-bold">
                            📅 Fecha inicio:
                        </label>
                        <input
                            type="date"
                            className="form-control"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                        />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label fw-bold">
                            📅 Fecha final:
                        </label>
                        <input
                            type="date"
                            className="form-control"
                            value={fechaFinal}
                            onChange={(e) => setFechaFinal(e.target.value)}
                        />
                    </div>
                    <div className="col-md-3 d-flex align-items-end">
                        <button
                            className="btn btn-primary w-100"
                            onClick={fetchCotizaciones}
                        >
                            Consultar
                        </button>
                    </div>
                </div>
                {/* Buscador personalizado */}
                <div className="mb-3">
                    <label htmlFor="buscador" className="form-label fw-bold">
                        🔍 Buscar cotización:
                    </label>
                    <div className="input-group">
                        <input
                            type="text"
                            id="buscador"
                            className="form-control form-control-lg"
                            placeholder="Buscar por número, cliente, total, observación..."
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                        {filtro && (
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => setFiltro("")}
                            >
                                ✖
                            </button>
                        )}
                    </div>
                </div>

                {/* Barra de acciones */}
                <div className="mb-3 d-flex flex-wrap gap-2">
                    <button
                        className="btn btn-danger btn-sm"
                        disabled={!puedeRegresarVenta}
                        onClick={() =>
                            handleDesactivar(registroSeleccionado?.idcotizacion)
                        }
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="Regresar la cotización a ventas"
                    >
                        <FaUndo /> Regresar a Venta
                    </button>

                    <button
                        className="btn btn-success btn-sm"
                        disabled={!registroSeleccionado}
                        onClick={() =>
                            generarPDF(registroSeleccionado?.idcotizacion)
                        }
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="Generar el PDF del registro seleccionado"
                    >
                        <FaFilePdf /> PDF Cotización
                    </button>

                    <button
                        className="btn btn-warning btn-sm"
                        disabled={!puedeFacturar}
                        onClick={() =>
                            generarFactura(registroSeleccionado?.idcotizacion)
                        }
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="Enviar el registro seleccionado a certificación"
                    >
                        <FaFileInvoiceDollar /> Certificar
                    </button>

                    <button
                        className="btn btn-primary btn-sm"
                        disabled={!puedeGenerarPDFFactura}
                        onClick={() =>
                            abrirFacturaPDF(registroSeleccionado?.idcotizacion)
                        }
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="Generar el PDF de la factura certificada"
                    >
                        <FaFileInvoice /> PDF Factura
                    </button>
                    <button
                        className="btn btn-danger btn-sm"
                        disabled={
                            !registroSeleccionado ||
                            registroSeleccionado.resultado !== "N" ||
                            !registroSeleccionado.errores ||
                            registroSeleccionado.errores.length === 0
                        }
                        onClick={() => setMostrarModalErrores(true)}
                        data-bs-toggle="tooltip"
                        title="Ver errores de certificación"
                    >
                        <i className="bi bi-exclamation-circle me-1"></i> ❗Ver
                        errores
                    </button>

                    <button
                        className="btn btn-danger btn-sm me-2"
                        disabled={
                            !registroSeleccionado ||
                            !registroSeleccionado.resultado === "S" ||
                            !registroSeleccionado.uuid
                        }
                        onClick={handleAnularFactura}
                    >
                        <i className="bi bi-x-circle me-1"></i>
                        Anular Factura
                    </button>
                    <button
                        className="btn btn-info btn-sm"
                        disabled={
                            !registroSeleccionado ||
                            registroSeleccionado.estado !== 6
                        }
                        onClick={() =>
                            generarNotaCredito(
                                registroSeleccionado?.idcotizacion
                            )
                        }
                        data-bs-toggle="tooltip"
                        title="Certificar una Nota de Crédito para esta factura"
                    >
                        🧾 Nota Crédito
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        disabled={
                            !registroSeleccionado ||
                            registroSeleccionado.estado !== 6
                        }
                        onClick={() =>
                            generarNotaDebito(
                                registroSeleccionado?.idcotizacion
                            )
                        }
                        data-bs-toggle="tooltip"
                        title="Certificar una Nota de Débito para esta factura"
                    >
                        🧾 Nota Débito
                    </button>
                    <Button
                        variant="warning"
                        onClick={() =>
                            handleEditarCliente(registroSeleccionado.idcliente)
                        }
                        disabled={!registroSeleccionado}
                    >
                        Información del cliente
                    </Button>
                </div>

                <div className="card-body">
                    {loading || !spanishTranslation ? (
                        <p className="text-center">Cargando cotizaciones...</p>
                    ) : cotizacionesFiltradas.length === 0 ? (
                        <div className="alert alert-warning text-center">
                            No se encontraron cotizaciones que coincidan con la
                            búsqueda.
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <DataTable
                                data={cotizacionesFiltradas}
                                columns={columns}
                                options={{
                                    ...options,
                                    searching: false,
                                    paging: true,
                                    pageLength: 10,
                                    lengthChange: false,
                                }}
                                className="table table-hover table-bordered"
                                onRowClick={(rowData, rowMeta) => {
                                    setRegistroSeleccionado(rowData);
                                }}
                                rowCallback={(row, data, index) => {
                                    if (
                                        registroSeleccionado?.idcotizacion ===
                                        data.idcotizacion
                                    ) {
                                        row.classList.add("table-primary");
                                    } else {
                                        row.classList.remove("table-primary");
                                    }
                                }}
                                initComplete={() => {
                                    const tooltipTriggerList = [].slice.call(
                                        document.querySelectorAll(
                                            '[data-bs-toggle="tooltip"]'
                                        )
                                    );
                                    tooltipTriggerList.forEach(
                                        (el) => new bootstrap.Tooltip(el)
                                    );
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
            {mostrarModalErrores && (
                <div
                    className="modal fade show"
                    style={{
                        display: "block",
                        backgroundColor: "rgba(0,0,0,0.5)",
                    }}
                    tabIndex="-1"
                    role="dialog"
                >
                    <div className="modal-dialog modal-lg" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Errores de Certificación - Cotización{" "}
                                    {registroSeleccionado?.nocotizacion}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() =>
                                        setMostrarModalErrores(false)
                                    }
                                ></button>
                            </div>
                            <div className="modal-body">
                                {registroSeleccionado?.errores?.length > 0 ? (
                                    <table className="table table-bordered table-sm">
                                        <thead className="table-light">
                                            <tr>
                                                <th>#</th>
                                                <th>Categoría</th>
                                                <th>Numeral</th>
                                                <th>Validación</th>
                                                <th>Mensaje</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.isArray(
                                                registroSeleccionado?.errores
                                            ) &&
                                            registroSeleccionado.errores
                                                .length > 0 ? (
                                                registroSeleccionado.errores.map(
                                                    (err, idx) => (
                                                        <tr key={idx}>
                                                            <td>{idx + 1}</td>
                                                            <td>
                                                                {err.categoria}
                                                            </td>
                                                            <td>
                                                                {err.numeral}
                                                            </td>
                                                            <td>
                                                                {err.validacion}
                                                            </td>
                                                            <td>
                                                                {
                                                                    err.mensaje_error
                                                                }
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            ) : (
                                                <p>
                                                    No se encontraron errores
                                                    detallados.
                                                </p>
                                            )}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p>No se encontraron errores detallados.</p>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() =>
                                        setMostrarModalErrores(false)
                                    }
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal para mostrar los datos del cliente del registro seleccionado*/}
            <Modal
                isOpen={mostrarModalCliente}
                toggle={() => setMostrarModalCliente(false)}
                size="lg" // más ancho
                centered // centrado verticalmente
            >
                <ModalHeader toggle={() => setMostrarModalCliente(false)}>
                    <span className="fs-5">Editar Cliente</span>
                </ModalHeader>
                <ModalBody>
                    {cliente && (
                        <form>
                            <div className="row">
                                <div className="col-md-6 mb-2">
                                    <label className="form-label small mb-1">
                                        NIT
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={cliente.nit}
                                        onChange={(e) =>
                                            setCliente({
                                                ...cliente,
                                                nit: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="col-md-6 mb-2">
                                    <label className="form-label small mb-1">
                                        CUI
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={cliente.cui}
                                        onChange={(e) =>
                                            setCliente({
                                                ...cliente,
                                                cui: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="col-md-12 mb-2">
                                    <label className="form-label small mb-1">
                                        Nombre
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={cliente.nombre}
                                        onChange={(e) =>
                                            setCliente({
                                                ...cliente,
                                                nombre: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="col-md-12 mb-2">
                                    <label className="form-label small mb-1">
                                        Dirección
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={cliente.direccion}
                                        onChange={(e) =>
                                            setCliente({
                                                ...cliente,
                                                direccion: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="col-md-6 mb-2">
                                    <label className="form-label small mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        className="form-control form-control-sm"
                                        value={cliente.email}
                                        onChange={(e) =>
                                            setCliente({
                                                ...cliente,
                                                email: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="col-md-6 mb-2">
                                    <label className="form-label small mb-1">
                                        Tipo de cliente
                                    </label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={cliente.extranjero}
                                        onChange={(e) =>
                                            setCliente({
                                                ...cliente,
                                                extranjero: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="N">Nacional</option>
                                        <option value="E">Extranjero</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        size="sm"
                        onClick={() => setMostrarModalCliente(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        color="primary"
                        size="sm"
                        onClick={handleGuardarCliente}
                    >
                        Guardar Cambios
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

export default MonitorFacturacion;
