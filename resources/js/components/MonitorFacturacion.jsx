// 👇 Refactor del componente MonitorFacturacion con mejoras similares a ListaCotizaciones
import React, { useState, useEffect, useRef } from "react";
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
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import Header from "./Header";
import "../../css/tableFormat.css";
import "../../css/monitor_cotizaciones.css";

import "bootstrap/dist/js/bootstrap.bundle.min.js";
import * as bootstrap from "bootstrap";
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from "reactstrap";
import ClienteContactosForm from "./ClienteContactosForm";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.vfs; // registra las fuentes embebidas (Roboto)
import FacturaPDF from "./FacturaPDF";

DataTable.use(DT);

function MonitorFacturacion() {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [spanishTranslation, setSpanishTranslation] = useState(null);
    const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
    const [filtro, setFiltro] = useState("");
    const [pdfData, setPdfData] = useState(null);
    const navigate = useNavigate();
    //const today = new Date().toISOString().split("T")[0]; // formato YYYY-MM-DD
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFinal, setFechaFinal] = useState("");
    const [mostrarModalErrores, setMostrarModalErrores] = useState(false);
    const [cliente, setCliente] = useState(null);
    const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
    const [estadoFiltro, setEstadoFiltro] = useState("");

    /**
     * ESTADOS PARA EL MODAL DE INFORMACIÓN DEL CLIENTE
     */
    const [showCertModal, setShowCertModal] = useState(false);
    const [certLoading, setCertLoading] = useState(false);
    const [opcionesFact, setOpcionesFact] = useState({
        direcciones: [],
        emails: [],
        cliente: null,
    });

    const [certForm, setCertForm] = useState({
        documento_tipo: "NIT", // NIT | CUI | PASAPORTE | CF
        documento_valor: "", // valor del doc según tipo
        nombre: "",
        direccion: "",
        email: "",
    });

    /** fin del modal para estados de información del cliente */

    /**
     * Estado y handler para abrir en modal el componente que permite asociar
     * correos y direcciones al cliente seleccionado
     */
    const [showClienteForm, setShowClienteForm] = useState(false);
    const [idClienteActual, setIdClienteActual] = useState(null);

    const abrirClienteForm = () => {
        if (!registroSeleccionado?.idcliente) return;
        setIdClienteActual(registroSeleccionado.idcliente);
        setShowClienteForm(true);
    };

    /*************************************************************** */

    /**
     * Estados para el modal NC y ND
     */
    const [showNotaModal, setShowNotaModal] = useState(false);
    const [notaTipo, setNotaTipo] = useState("NCRE"); // NCRE | NDEB
    const [notaLoading, setNotaLoading] = useState(false);
    const [notaForm, setNotaForm] = useState({ motivo: "", monto: "" });
    /*************************************************************** */

    // ====== Estado para listado de notas FEL ======
    const [showNotasModal, setShowNotasModal] = useState(false);
    const [notas, setNotas] = useState([]); // array de notas devueltas por el backend
    const [notasLoading, setNotasLoading] = useState(false);
    const [notaFiltroTipo, setNotaFiltroTipo] = useState(""); // '', 'NCRE', 'NDEB'

    // helper
    const toYMD = (d) => d.toISOString().slice(0, 10);
    const fetchingRef = useRef(false);

    const [facturaDoc, setFacturaDoc] = useState(null); // { cotizacion, detalles, images }
    const [showFacturaViewer, setShowFacturaViewer] = useState(false);

    // util
    const abs = (p) => new URL(p, window.location.origin).href;

    useEffect(() => {
        fetch("/i18n/Spanish.json")
            .then((response) => response.json())
            .then((data) => setSpanishTranslation(data))
            .catch((error) =>
                console.error("Error al cargar la traducción:", error)
            );
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setFechaInicio(res.data.fecha);
                setFechaFinal(res.data.fecha);
                // 🚀 disparamos la consulta del primer load SOLO con la fecha actual
                fetchCotizaciones(res.data.fecha, res.data.fecha, estadoFiltro);
            })
            .catch(() => {
                // fallback por si falla
                const today = new Date().toISOString().split("T")[0];
                setFechaInicio(today);
                setFechaFinal(today);
                // 🚀 también consultamos con HOY si falló el endpoint
                fetchCotizaciones(today, today, estadoFiltro);
            });
    }, []);

    const fetchCotizaciones = async (
        fi = fechaInicio,
        ff = fechaFinal,
        est = estadoFiltro
    ) => {
        if (fetchingRef.current) return; // evita dobles clics
        fetchingRef.current = true;
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alertify.error("Token de autenticación no encontrado");
                setCotizaciones([]);
                return; // ← salgo, el finally apaga el candado
            }

            const hoy = new Date().toISOString().slice(0, 10);
            const params = { fechaInicio: fi || hoy, fechaFinal: ff || hoy };
            if (est) params.estado = est;

            const { data } = await axios.get("/api/monitorfacturacion", {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });

            setCotizaciones(data);
        } catch (e) {
            alertify.error("Error al obtener las cotizaciones.");
        } finally {
            setLoading(false);
            fetchingRef.current = false; // ← SIEMPRE lo apago
        }
    };

    // useEffect(() => {
    //     fetchCotizaciones();
    // }, []);

    const cotizacionesFiltradas = cotizaciones.filter((cot) => {
        const texto = filtro.toLowerCase();
        return (
            cot.nocotizacion?.toLowerCase().includes(texto) ||
            cot.cliente?.toLowerCase().includes(texto) ||
            cot.total_general?.toString().includes(texto) ||
            cot.observaciones_costeo?.toLowerCase().includes(texto)
        );
    });

    const handleDesactivar = (id, estado) => {
        const token = localStorage.getItem("token");
        if (token) {
            axios
                .put(
                    `/api/monitorfacturacion/desactivar/${id}`,
                    { estado: estado },
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

    // const generarPDF = async (id) => {
    //     const token = localStorage.getItem("token");
    //     if (!token)
    //         return alertify.error("Token no encontrado para generar PDF.");
    //     try {
    //         const response = await fetch(`/api/monitorfacturacion/${id}/pdf`, {
    //             headers: { Authorization: `Bearer ${token}` },
    //         });
    //         const data = await response.json();
    //         setPdfData(data);
    //     } catch(err) {
    //         console.error("Error al generar el PDF:", err);
    //         alertify.error("Error al generar el PDF.");
    //     }
    // };
    const generarPDF = async (id) => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        const res = await fetch(`/api/monitorfacturacion/${id}/pdf`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(`HTTP ${res.status}`, text);
            return alertify.error("No se pudo generar el PDF.");
        }

        const data = await res.json(); // { cotizacion, totalEnLetras }
        setPdfData(data);
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
                    //console.log(data);
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

    // const abrirFacturaPDF = async (id) => {
    //     const token = localStorage.getItem("token");
    //     if (!token)
    //         return alertify.error("Token no encontrado para abrir PDF.");
    //     try {
    //         const response = await fetch(
    //             `${
    //                 import.meta.env.VITE_API_URL
    //             }/monitorfacturacion/${id}/facturapdf`,
    //             {
    //                 headers: { Authorization: `Bearer ${token}` },
    //             }
    //         );
    //         const blob = await response.blob();
    //         const url = URL.createObjectURL(blob);
    //         window.open(url, "_blank");
    //         URL.revokeObjectURL(url);
    //     } catch {
    //         alertify.error("Error al abrir el PDF.");
    //     }
    // };
    // const abrirFacturaPDF = async (id) => {
    //     const token = localStorage.getItem("token");
    //     if (!token)
    //         return alertify.error("Token no encontrado para abrir PDF.");

    //     try {
    //         const response = await fetch(
    //             `${
    //                 import.meta.env.VITE_API_URL
    //             }/monitorfacturacion/${id}/facturapdf`,
    //             { headers: { Authorization: `Bearer ${token}` } }
    //         );

    //         if (!response.ok) {
    //             return alertify.error("No se pudo generar el PDF.");
    //         }

    //         // Opcional: verificar content-type
    //         const ct = response.headers.get("content-type") || "";
    //         if (!ct.includes("application/pdf")) {
    //             return alertify.error("El servidor no devolvió un PDF.");
    //         }

    //         const blob = await response.blob();
    //         const url = URL.createObjectURL(blob);
    //         window.open(url, "_blank");

    //         // No lo revoques inmediatamente; espera un poco
    //         setTimeout(() => URL.revokeObjectURL(url), 60000);
    //     } catch (e) {
    //         alertify.error("Error al abrir el PDF.");
    //     }
    // };
    // monitorFactura.jsx
    const abrirFactura = async (id) => {
        const token = localStorage.getItem("token");
        if (!token)
            return alertify.error("Token no encontrado para abrir PDF.");

        try {
            const url = `${
                import.meta.env.VITE_API_URL
            }/monitorfacturacion/${id}/facturapdf`;

            const res = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/pdf",
                },
                // si también usas cookies/sanctum además del token:
                // credentials: "include",
            });

            if (!res.ok) {
                return alertify.error("No se pudo generar/descargar el PDF.");
            }

            const blob = await res.blob();
            const fileURL = URL.createObjectURL(blob);

            const win = window.open(fileURL, "_blank", "noopener");
            // if (!win) {
            //     // fallback: crea un link “descargar”
            //     const a = document.createElement("a");
            //     a.href = fileURL;
            //     a.download = `factura-${id}.pdf`;
            //     document.body.appendChild(a);
            //     a.click();
            //     a.remove();
            // }

            // Limpieza del objeto en memoria (dale unos segundos si lo abres en nueva pestaña)
            setTimeout(() => URL.revokeObjectURL(fileURL), 60_000);
        } catch (err) {
            console.error(err);
            alertify.error("Error al abrir el PDF.");
        }
    };
    
    // ✅ Reemplazo completo
const abrirFacturaPDF = async (id) => {
  const token = localStorage.getItem("token");
  if (!token) return alertify.error("Token no encontrado para abrir PDF.");

  // Helpers
  const abs  = (p) => new URL(p, window.location.origin).href;
  const fixMime = (dataUrl, ext = "jpg") => {
    if (!dataUrl) return null;
    if (dataUrl.startsWith("data:application/octet-stream")) {
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      return dataUrl.replace("data:application/octet-stream", `data:${mime}`);
    }
    // Algunos servers devuelven Blob.type vacío → "data:;base64"
    if (dataUrl.startsWith("data:;base64")) {
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      return dataUrl.replace("data:;base64", `data:${mime};base64`);
    }
    return dataUrl;
  };
  // Carga URL → DataURL (base64)
  const toDataURLSafe = async (url) => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return null;
      const blob = await r.blob();
      return await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onloadend = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  try {
    // 1) Datos
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/monitorfacturacion/${id}/factura-data`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const txt = await res.text();
      console.error("HTTP", res.status, txt);
      return alertify.error("No se pudo obtener los datos de la factura.");
    }
    const { cotizacion, detalles } = await res.json();

    // 2) Cargar imágenes → DataURL y normalizar mime
    const [logoRaw, wmRaw] = await Promise.all([
      toDataURLSafe(abs("/images/LogoGP.jpg?v=1")),
      toDataURLSafe(abs("/images/marca_agua_gp.png?v=1")),
    ]);

    // footer con fallback .jpg → .png
    let footerRaw = await toDataURLSafe(abs("/images/footer_gp.jpg?v=1"));
    let footerExt = "jpg";
    if (!footerRaw) {
      footerRaw = await toDataURLSafe(abs("/images/footer_gp.png?v=1"));
      footerExt = "png";
    }

    const logoSrc      = fixMime(logoRaw, "jpg");
    const watermarkSrc = fixMime(wmRaw, "png");
    const footerSrc    = fixMime(footerRaw, footerExt);

    if (!footerSrc) {
      console.warn("Footer no disponible en /images/footer_gp.(jpg|png)");
    }

    // 3) Mandar al visor React-PDF
    setFacturaDoc({
      cotizacion,
      detalles,
      images: { logoSrc, watermarkSrc, footerSrc },
    });
    setShowFacturaViewer(true);
  } catch (e) {
    console.error(e);
    alertify.error("Error al preparar el PDF.");
  }
};


    // (Opcional) helper para cargar imagen como base64 (onda, logos externos)
    async function toDataURL(url) {
        try {
            const r = await fetch(url, { cache: "no-store" });
            if (!r.ok) return null;
            const blob = await r.blob();
            return await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onloadend = () => res(reader.result); // "data:image/...;base64,...."
                reader.onerror = rej;
                reader.readAsDataURL(blob);
            });
        } catch {
            return null;
        }
    }

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
        console.log("ID Cliente:", idcliente);
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

    /**
     * FUNCIÓN para abrir el modal de información del cliente
     */
    const abrirModalCertificar = async () => {
        if (!registroSeleccionado)
            return alertify.error("Seleccione un registro.");
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        try {
            const { data } = await axios.get(
                `/api/clientes/${registroSeleccionado.idcliente}/facturacion-opciones`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setOpcionesFact(data);

            // Prefill: por defecto usa NIT si hay; si no, CUI; si no, PASAPORTE; si ninguno, CF
            let tipo = "CF",
                valor = "";
            if (data.cliente?.nit) {
                tipo = "NIT";
                valor = data.cliente.nit;
            } else if (data.cliente?.cui) {
                tipo = "CUI";
                valor = data.cliente.cui;
            } else if (data.cliente?.pasaporte) {
                tipo = "PASAPORTE";
                valor = data.cliente.pasaporte;
            }

            setCertForm({
                documento_tipo: tipo,
                documento_valor: valor,
                nombre: data.cliente?.nombre || "",
                direccion: data.direcciones?.[0] || "",
                email: data.emails?.[0] || "",
            });

            setShowCertModal(true);
        } catch (e) {
            console.error(e);
            alertify.error("No se pudieron cargar opciones del cliente.");
        }
    };

    /***************************************************************** */

    /**
     * FUNCIÓN para enviar a certificar usando los datos del modal
     */
    const confirmarCertificacion = async () => {
        if (!registroSeleccionado) return;

        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");
        setCertLoading(true);

        try {
            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL}/facturar/${
                    registroSeleccionado.idcotizacion
                }`,
                certForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (data?.resultado) {
                alertify.success(`Factura generada. UUID: ${data.uuid}`);
                setShowCertModal(false);
                fetchCotizaciones();
            } else {
                alertify.error(data?.errores || "No certificado");
            }
        } catch (e) {
            // errores de validación 422
            if (e.response?.status === 422 && e.response?.data?.errors) {
                const errs = e.response.data.errors;
                const primero =
                    Object.values(errs)[0]?.[0] || "Error de validación";
                alertify.error(primero);
            } else {
                console.log(e);
                alertify.error("Error al certificar.");
            }
        } finally {
            setCertLoading(false);
        }
    };
    /************************************************** */

    const abrirNota = (tipo) => {
        if (!registroSeleccionado)
            return alertify.error("Seleccione un registro");
        setNotaTipo(tipo);
        // prefija el monto con el total de la factura (puedes dejarlo vacío si prefieres)
        setNotaForm({
            motivo: "",
            monto: Number(registroSeleccionado.total_general || 0).toFixed(2),
        });
        setShowNotaModal(true);
    };

    const confirmarNota = async () => {
        if (!registroSeleccionado) return;
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        const monto = parseFloat(notaForm.monto);
        if (!notaForm.motivo?.trim())
            return alertify.error("Ingresa el motivo.");
        if (isNaN(monto) || monto <= 0)
            return alertify.error("Monto inválido.");
        // opcional: no permitir mayor al total
        // if (monto > Number(registroSeleccionado.total_general)) return alertify.error("El monto supera el total de la factura.");

        setNotaLoading(true);
        try {
            const url =
                notaTipo === "NCRE"
                    ? `${import.meta.env.VITE_API_URL}/notacredito/${
                          registroSeleccionado.idcotizacion
                      }`
                    : `${import.meta.env.VITE_API_URL}/notadebito/${
                          registroSeleccionado.idcotizacion
                      }`;

            const { data } = await axios.post(
                url,
                { motivo: notaForm.motivo, monto },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (data?.resultado) {
                alertify.success(
                    `${
                        notaTipo === "NCRE"
                            ? "Nota de crédito"
                            : "Nota de débito"
                    } certificada. UUID: ${data.uuid}`
                );
                setShowNotaModal(false);
                fetchCotizaciones();
            } else {
                alertify.error(data?.errores || "No certificado");
            }
        } catch (e) {
            const msg =
                e.response?.data?.errores ||
                e.response?.data?.message ||
                "Error al certificar la nota.";
            alertify.error(msg);
        } finally {
            setNotaLoading(false);
        }
    };

    const estado = Number(registroSeleccionado?.estado);

    const puedeRegresarVenta = estado === 4;
    const puedeRegresarPreFacturacion = estado === 5;
    const puedeEliminar = estado === 1;
    const puedePreFacturar = estado === 1 || estado === 3;
    const puedeFacturar = estado === 5;
    const puedeGenerarPDFFactura = estado === 6;

    const abrirPdfNota = async (tipo /* 'NCRE' | 'NDEB' */) => {
        if (!registroSeleccionado)
            return alertify.error("Seleccione un registro");
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        try {
            // 1) Traer la última nota del tipo solicitado
            const resList = await fetch(
                `/api/cotizaciones/${registroSeleccionado.idcotizacion}/notasfel?tipo=${tipo}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const notas = await resList.json();

            if (!Array.isArray(notas) || notas.length === 0) {
                return alertify.error(
                    `No hay notas ${tipo} para esta factura.`
                );
            }

            const idnota = notas[0].idnota; // la más reciente (ordenada desc en el backend)

            // 2) Pedir el PDF de esa nota
            const resPdf = await fetch(`/api/notasfel/${idnota}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!resPdf.ok) {
                return alertify.error("No se pudo generar el PDF de la nota.");
            }

            const ct = resPdf.headers.get("content-type") || "";
            if (!ct.includes("application/pdf")) {
                return alertify.error("El servidor no devolvió un PDF.");
            }

            const blob = await resPdf.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e) {
            console.error(e);
            alertify.error("Error al abrir el PDF de la nota.");
        }
    };

    // abre modal y carga notas (por tipo si hay filtro)
    const abrirNotasModal = async () => {
        if (!registroSeleccionado)
            return alertify.error("Seleccione un registro");
        setShowNotasModal(true);
        await cargarNotasFel(notaFiltroTipo);
    };

    const cerrarNotasModal = () => {
        setShowNotasModal(false);
        setNotas([]);
    };

    // carga desde backend
    const cargarNotasFel = async (tipo = "") => {
        if (!registroSeleccionado) return;
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        setNotasLoading(true);
        try {
            const qs = tipo ? `?tipo=${tipo}` : "";
            const res = await fetch(
                `/api/cotizaciones/${registroSeleccionado.idcotizacion}/notasfel${qs}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const txt = await res.text();
                console.error("HTTP error", res.status, txt);
                alertify.error("No se pudieron cargar las notas.");
                setNotas([]);
                return;
            }
            const data = await res.json();
            setNotas(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            alertify.error("Error al cargar notas.");
            setNotas([]);
        } finally {
            setNotasLoading(false);
        }
    };

    // refetch cuando cambie el filtro de tipo mientras el modal esté abierto
    useEffect(() => {
        if (showNotasModal) cargarNotasFel(notaFiltroTipo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notaFiltroTipo, showNotasModal]);

    // imprimir una nota concreta
    const imprimirNota = async (idnota) => {
        const token = localStorage.getItem("token");
        if (!token) return alertify.error("Token no encontrado.");

        try {
            const res = await fetch(`/api/notasfel/${idnota}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                return alertify.error("No se pudo generar el PDF de la nota.");
            }
            const ct = res.headers.get("content-type") || "";
            if (!ct.includes("application/pdf")) {
                return alertify.error("El servidor no devolvió un PDF.");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e) {
            console.error(e);
            alertify.error("Error al abrir el PDF de la nota.");
        }
    };

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
                            disabled={loading || fetchingRef.current}
                            onClick={() =>
                                fetchCotizaciones(
                                    fechaInicio,
                                    fechaFinal,
                                    estadoFiltro
                                )
                            }
                        >
                            {loading ? "Consultando…" : "Consultar"}
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
                            handleDesactivar(
                                registroSeleccionado?.idcotizacion,
                                1
                            )
                        }
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="Regresar la cotización a ventas"
                    >
                        <FaUndo /> Regresar a Venta
                    </button>
                    <button
                        className="btn btn-danger btn-sm"
                        disabled={!puedeRegresarPreFacturacion}
                        onClick={() =>
                            handleDesactivar(
                                registroSeleccionado?.idcotizacion,
                                4
                            )
                        }
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="Regresar a Pre-Facturación"
                    >
                        <FaUndo /> Regresar a Pre-facturación
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
                            //generarFactura(registroSeleccionado?.idcotizacion)
                            abrirModalCertificar()
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
                            // abrirFacturaPDF(registroSeleccionado?.idcotizacion)
                            abrirFactura(registroSeleccionado?.idcotizacion)
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
                            (registroSeleccionado?.resultado ?? "").toUpperCase() !== "S" ||
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
                        // onClick={() =>
                        //     generarNotaCredito(
                        //         registroSeleccionado?.idcotizacion
                        //     )
                        // }
                        onClick={() => abrirNota("NCRE")}
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
                        // onClick={() =>
                        //     generarNotaDebito(
                        //         registroSeleccionado?.idcotizacion
                        //     )
                        // }
                        onClick={() => abrirNota("NDEB")}
                        data-bs-toggle="tooltip"
                        title="Certificar una Nota de Débito para esta factura"
                    >
                        🧾 Nota Débito
                    </button>
                    <button
                        className="btn btn-outline-info btn-sm"
                        disabled={
                            !registroSeleccionado ||
                            registroSeleccionado.estado !== 6
                        }
                        onClick={() => abrirPdfNota("NCRE")}
                        data-bs-toggle="tooltip"
                        title="Imprimir la última Nota de Crédito certificada"
                    >
                        PDF NCRE
                    </button>

                    <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled={
                            !registroSeleccionado ||
                            registroSeleccionado.estado !== 6
                        }
                        onClick={() => abrirPdfNota("NDEB")}
                        data-bs-toggle="tooltip"
                        title="Imprimir la última Nota de Débito certificada"
                    >
                        PDF NDEB
                    </button>
                    <button
                        className="btn btn-outline-dark btn-sm"
                        disabled={
                            !registroSeleccionado ||
                            registroSeleccionado.estado !== 6
                        }
                        onClick={() => abrirNotasModal()}
                        data-bs-toggle="tooltip"
                        title="Ver e imprimir las notas (NC/ND) emitidas para esta factura"
                    >
                        🧾 Notas FEL…
                    </button>

                    <Button
                        color="warning"
                        onClick={() => {
                            if (!registroSeleccionado?.idcliente)
                                return alertify.error("Seleccione un registro");
                            setIdClienteActual(registroSeleccionado.idcliente);
                            setShowClienteForm(true);
                        }}
                        disabled={!registroSeleccionado}
                    >
                        Información del cliente
                    </Button>
                </div>

                <div className="card-body">
                    {loading ? (
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
                                    order: [], // 👈 no ordenar en el cliente (usa el orden del backend)
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
            {/* <Modal
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
            </Modal> */}
            <Modal
                isOpen={showCertModal}
                toggle={() => setShowCertModal(false)}
                centered
                size="lg"
            >
                <ModalHeader toggle={() => setShowCertModal(false)}>
                    Datos para certificación
                </ModalHeader>
                <ModalBody>
                    <div className="mb-2">
                        <label className="form-label">Tipo de documento</label>
                        <select
                            className="form-select"
                            value={certForm.documento_tipo}
                            onChange={(e) => {
                                const tipo = e.target.value;
                                // Cambia el valor del input según el tipo escogido (desde base)
                                let valor = "";
                                const c = opcionesFact.cliente || {};
                                if (tipo === "NIT") valor = c.nit || "";
                                if (tipo === "CUI") valor = c.cui || "";
                                if (tipo === "PASAPORTE")
                                    valor = c.pasaporte || "";
                                if (tipo === "CF") valor = "";
                                setCertForm({
                                    ...certForm,
                                    documento_tipo: tipo,
                                    documento_valor: valor,
                                });
                            }}
                        >
                            <option value="NIT">NIT</option>
                            <option value="CUI">DPI/CUI</option>
                            <option value="PASAPORTE">PASAPORTE</option>
                            <option value="CF">CONSUMIDOR FINAL</option>
                        </select>
                    </div>

                    {/* Input del documento */}
                    {certForm.documento_tipo !== "CF" && (
                        <div className="mb-2">
                            <label className="form-label">Número</label>
                            <input
                                className="form-control"
                                value={certForm.documento_valor}
                                onChange={(e) =>
                                    setCertForm({
                                        ...certForm,
                                        documento_valor: e.target.value,
                                    })
                                }
                                placeholder={
                                    certForm.documento_tipo === "NIT"
                                        ? "NIT"
                                        : certForm.documento_tipo === "CUI"
                                        ? "DPI/CUI (12-13 dígitos)"
                                        : "Pasaporte"
                                }
                            />
                        </div>
                    )}

                    <div className="mb-2">
                        <label className="form-label">Nombre del cliente</label>
                        <input
                            className="form-control"
                            value={certForm.nombre}
                            onChange={(e) =>
                                setCertForm({
                                    ...certForm,
                                    nombre: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label">Dirección</label>
                        <select
                            className="form-select"
                            value={certForm.direccion}
                            onChange={(e) =>
                                setCertForm({
                                    ...certForm,
                                    direccion: e.target.value,
                                })
                            }
                        >
                            {(opcionesFact.direcciones || []).map((d, i) => (
                                <option key={i} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-2">
                        <label className="form-label">Correo</label>
                        <select
                            className="form-select"
                            value={certForm.email}
                            onChange={(e) =>
                                setCertForm({
                                    ...certForm,
                                    email: e.target.value,
                                })
                            }
                        >
                            {(opcionesFact.emails || []).map((em, i) => (
                                <option key={i} value={em}>
                                    {em}
                                </option>
                            ))}
                            <option value="">(sin correo)</option>
                        </select>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => setShowCertModal(false)}
                        disabled={certLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        color="warning"
                        onClick={confirmarCertificacion}
                        disabled={certLoading}
                    >
                        {certLoading ? "Enviando…" : "Certificar"}
                    </Button>
                </ModalFooter>
            </Modal>
            {/* Modal para editar la información del cliente */}
            <Modal
                isOpen={showClienteForm}
                toggle={() => setShowClienteForm(false)}
                centered
                // size="xl"
                className="modal-xxl"
            >
                <ModalHeader toggle={() => setShowClienteForm(false)}>
                    Información del cliente
                </ModalHeader>
                <ModalBody>
                    {idClienteActual != null && (
                        <ClienteContactosForm
                            idclienteInicial={idClienteActual} // ← precarga el cliente
                            bloquearSeleccion={false} // ← pon true si NO quieres que cambie
                            onClose={() => setShowClienteForm(false)}
                            onSaved={() => {
                                setShowClienteForm(false);
                                fetchCotizaciones();
                            }}
                        />
                    )}
                </ModalBody>
            </Modal>
            {/* Modal para colocar los datos de la nota de crédito y débito */}
            <Modal
                isOpen={showNotaModal}
                toggle={() => setShowNotaModal(false)}
                centered
                size="lg"
            >
                <ModalHeader toggle={() => setShowNotaModal(false)}>
                    {notaTipo === "NCRE" ? "Nota de Crédito" : "Nota de Débito"}{" "}
                    – Ajuste
                </ModalHeader>
                <ModalBody>
                    {registroSeleccionado && (
                        <>
                            <div className="mb-3">
                                <div className="small text-muted">Cliente</div>
                                <div className="fw-semibold">
                                    {registroSeleccionado.cliente}
                                </div>
                            </div>

                            <div className="row g-3 mb-3">
                                <div className="col-md-6">
                                    <div className="small text-muted">FEL</div>
                                    <div className="fw-semibold">
                                        {registroSeleccionado.serie || "-"}-
                                        {registroSeleccionado.numero || "-"}
                                    </div>
                                    <div
                                        className="text-muted"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        {registroSeleccionado.uuid}
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="small text-muted">
                                        Total Factura
                                    </div>
                                    <div className="fw-semibold">
                                        {Number(
                                            registroSeleccionado.total_general ||
                                                0
                                        ).toLocaleString("es-GT", {
                                            style: "currency",
                                            currency: "GTQ",
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="mb-3">
                        <label className="form-label">Motivo del ajuste</label>
                        <input
                            type="text"
                            className="form-control"
                            maxLength={200}
                            value={notaForm.motivo}
                            onChange={(e) =>
                                setNotaForm({
                                    ...notaForm,
                                    motivo: e.target.value,
                                })
                            }
                            placeholder="Ej. Descuento por devolución parcial"
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label">
                            Monto a ajustar (GTQ)
                        </label>
                        <input
                            type="number"
                            className="form-control"
                            step="0.01"
                            min="0.01"
                            value={notaForm.monto}
                            onChange={(e) =>
                                setNotaForm({
                                    ...notaForm,
                                    monto: e.target.value,
                                })
                            }
                        />
                        <div className="form-text">
                            Se emitirá la {notaTipo === "NCRE" ? "NC" : "ND"}{" "}
                            con <strong>una sola línea</strong> por este monto.
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => setShowNotaModal(false)}
                        disabled={notaLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        color={notaTipo === "NCRE" ? "info" : "secondary"}
                        onClick={confirmarNota}
                        disabled={notaLoading}
                    >
                        {notaLoading
                            ? "Enviando…"
                            : notaTipo === "NCRE"
                            ? "Certificar NC"
                            : "Certificar ND"}
                    </Button>
                </ModalFooter>
            </Modal>
            {/* PDF Viewer para mostrar la cotización*/}
            {pdfData && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 2000 }}
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
                                logoSrc="/images/LogoGP.png"
                            />
                        </PDFViewer>

                        <div className="position-absolute top-0 end-0 m-2 d-flex gap-2">
                            <PDFDownloadLink
                                document={
                                    <CotizacionPDF
                                        cotizacion={pdfData.cotizacion}
                                        totalEnLetras={pdfData.totalEnLetras}
                                        logoSrc="/images/LogoGP.png"
                                    />
                                }
                                fileName={`COTIZACION-${pdfData.cotizacion.nocotizacion}.pdf`}
                                className="btn btn-primary btn-sm"
                            >
                                {({ loading }) =>
                                    loading ? "Preparando…" : "Descargar PDF"
                                }
                            </PDFDownloadLink>

                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => setPdfData(null)}
                            >
                                Cerrar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                isOpen={showNotasModal}
                toggle={cerrarNotasModal}
                centered
                size="lg"
            >
                <ModalHeader toggle={cerrarNotasModal}>
                    Notas FEL de la factura&nbsp;
                    <span className="fw-semibold">
                        {registroSeleccionado?.serie || "-"}-
                        {registroSeleccionado?.numero || "-"}
                    </span>
                </ModalHeader>

                <ModalBody>
                    {/* Filtros de tipo */}
                    <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                        <span className="small text-muted">Filtrar:</span>
                        <div
                            className="btn-group"
                            role="group"
                            aria-label="Filtro tipo nota"
                        >
                            <button
                                type="button"
                                className={`btn btn-sm ${
                                    notaFiltroTipo === ""
                                        ? "btn-primary"
                                        : "btn-outline-primary"
                                }`}
                                onClick={() => setNotaFiltroTipo("")}
                            >
                                Todas
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm ${
                                    notaFiltroTipo === "NCRE"
                                        ? "btn-info"
                                        : "btn-outline-info"
                                }`}
                                onClick={() => setNotaFiltroTipo("NCRE")}
                            >
                                NCRE
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm ${
                                    notaFiltroTipo === "NDEB"
                                        ? "btn-secondary"
                                        : "btn-outline-secondary"
                                }`}
                                onClick={() => setNotaFiltroTipo("NDEB")}
                            >
                                NDEB
                            </button>
                        </div>

                        {/* Accesos rápidos para crear nuevas (reutiliza tu modal existente) */}
                        <div className="ms-auto d-flex gap-2">
                            <button
                                className="btn btn-outline-info btn-sm"
                                onClick={() => {
                                    setShowNotasModal(false);
                                    abrirNota("NCRE");
                                }}
                            >
                                + Nueva NC
                            </button>
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => {
                                    setShowNotasModal(false);
                                    abrirNota("NDEB");
                                }}
                            >
                                + Nueva ND
                            </button>
                        </div>
                    </div>

                    {/* Tabla de notas */}
                    {notasLoading ? (
                        <div className="text-center py-4">Cargando notas…</div>
                    ) : notas.length === 0 ? (
                        <div className="alert alert-warning">
                            No hay notas para mostrar.
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-sm table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Serie/No.</th>
                                        <th>Fecha</th>
                                        <th>Motivo</th>
                                        <th className="text-end">Monto</th>
                                        <th>UUID</th>
                                        <th style={{ width: 110 }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notas.map((n) => (
                                        <tr key={n.idnota}>
                                            <td>
                                                <span
                                                    className={`badge ${
                                                        n.tipo === "NCRE"
                                                            ? "bg-info"
                                                            : "bg-secondary"
                                                    }`}
                                                >
                                                    {n.tipo}
                                                </span>
                                            </td>
                                            <td>
                                                {(n.serie_nota || "SN") +
                                                    "-" +
                                                    (n.numero_nota || "0")}
                                            </td>
                                            <td>{n.fecha_nota || ""}</td>
                                            <td
                                                className="text-truncate"
                                                style={{ maxWidth: 260 }}
                                                title={n.motivo || ""}
                                            >
                                                {n.motivo || ""}
                                            </td>
                                            <td className="text-end">
                                                {Number(
                                                    n.monto || 0
                                                ).toLocaleString("es-GT", {
                                                    style: "currency",
                                                    currency: "GTQ",
                                                })}
                                            </td>
                                            <td
                                                className="small text-wrap"
                                                style={{ maxWidth: 220 }}
                                            >
                                                {n.uuid_nota || "-"}
                                            </td>
                                            <td>
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        className="btn btn-outline-primary"
                                                        onClick={() =>
                                                            imprimirNota(
                                                                n.idnota
                                                            )
                                                        }
                                                    >
                                                        PDF
                                                    </button>
                                                    {/* Si quisieras más acciones futuras, déjalas aquí */}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ModalBody>

                <ModalFooter>
                    <button
                        className="btn btn-secondary"
                        onClick={cerrarNotasModal}
                    >
                        Cerrar
                    </button>
                </ModalFooter>
            </Modal>

            {showFacturaViewer && facturaDoc && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 2100 }}
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
                            <FacturaPDF
                                cotizacion={facturaDoc.cotizacion}
                                detalles={facturaDoc.detalles}
                                images={facturaDoc.images}
                            />
                        </PDFViewer>

                        <div className="position-absolute top-0 end-0 m-2 d-flex gap-2">
                            <PDFDownloadLink
                                document={
                                    <FacturaPDF
                                        cotizacion={facturaDoc.cotizacion}
                                        detalles={facturaDoc.detalles}
                                        images={facturaDoc.images}
                                    />
                                }
                                fileName={`FACTURA-${
                                    facturaDoc.cotizacion.serie || "S"
                                }-${facturaDoc.cotizacion.numero || "0"}.pdf`}
                                className="btn btn-primary btn-sm"
                            >
                                {({ loading }) =>
                                    loading ? "Preparando…" : "Descargar PDF"
                                }
                            </PDFDownloadLink>

                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    setShowFacturaViewer(false);
                                    setFacturaDoc(null);
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MonitorFacturacion;
