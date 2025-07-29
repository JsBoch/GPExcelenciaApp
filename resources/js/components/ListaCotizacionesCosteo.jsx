import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import "bootstrap/dist/css/bootstrap.min.css"; // Importa los estilos de Bootstrap 5
import { Link, useNavigate } from "react-router-dom";
import "../../css/ListaEmpleados.css";
//Funcionalidad para React PDF
import CotizacionPDF from "./CotizacionPDF"; // Importa el componente CotizacionPDF
import { PDFViewer } from "@react-pdf/renderer"; // Importa PDFViewer
import alertify from "alertifyjs";
import { format } from "date-fns";
import "../../css/tableFormat.css";
import { FaRegFileAlt, FaSearch } from "react-icons/fa";
import Header from "./Header";

DataTable.use(DT);

function ListaCotizacionesCosteo() {
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null);
    const navigate = useNavigate(); // Hook para la navegación
    const [pdfData, setPdfData] = useState(null); // Estado para almacenar los datos del PDF
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const dtRef = useRef(null); // Referencia al componente DataTable

    useEffect(() => {
        fetch("/i18n/Spanish.json")
            .then((response) => response.json())
            .then((data) => setSpanishTranslation(data))
            .catch((error) =>
                console.error("Error al cargar la traducción:", error)
            );

        // const hoy = new Date();
        // const año = hoy.getFullYear();
        // const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        // const dia = String(hoy.getDate()).padStart(2, '0');
        // const fechaActual = `${año}-${mes}-${dia}`;
        // setFechaInicio(fechaActual);
        // setFechaFin(fechaActual);
        // fetchCotizaciones(fechaActual, fechaActual); // Realizar la consulta inicial con la fecha de hoy
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setFechaInicio(res.data.fecha);
                setFechaFin(res.data.fecha);
                fetchCotizaciones(fechaInicio, fechaFin); // Realizar la consulta inicial con la fecha del servidor
            })
            .catch(() => {
                // fallback por si falla
                const today = new Date().toISOString().split("T")[0];
                setFechaInicio(today);
                setFechaFin(today);
                fetchCotizaciones(fechaInicio, fechaFin); // Realizar la consulta inicial con la fecha actual
            });
    }, []);
    //20250407 Código para enviar los parámetros de fecha

    const fetchCotizaciones = (startDate = "", endDate = "") => {
        setLoading(true);
        const token = localStorage.getItem("token");
        const params = new URLSearchParams();
        if (startDate) {
            params.append("fecha_inicio", startDate);
        }
        if (endDate) {
            params.append("fecha_fin", endDate);
        }

        if (token && startDate && endDate) {
            axios
                .get(`/api/cotizacionescosteo?${params.toString()}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                .then((response) => {
                    setCotizaciones(response.data);
                    setLoading(false);
                })
                .catch((error) => {
                    alertify.error("Error al obtener las cotizaciones.");
                    setLoading(false);
                });
        } else {
            setCotizaciones([]); // Limpiar las cotizaciones si no hay fechas
            setLoading(false);
            if (!token) {
                alertify.error("Token de autenticación no encontrado");
            } else {
                // Opcional: Mostrar un mensaje indicando que se deben seleccionar las fechas
                // alertify.warning('Por favor, seleccione un rango de fechas.');
            }
        }
    };

    const handleFiltrar = () => {
        fetchCotizaciones(fechaInicio, fechaFin);
    };

    const columns = [
        {
            data: "idcotizacion",
            title: "Acciones",
            render: (data) => {
                // return `<button class="btn btn-primary editar-btn btn-fixed-width" data-id="${data}">Editar</button>
                //     <button class="btn btn-danger desactivar-btn btn-fixed-width" data-id="${data}">Desactivar</button>`;
                return `        
                <div class="d-flex gap-1 justify-content-center align-items-center">                
            <button class="btn btn-success btn-sm pdf-btn" data-id="${data}" title="Generar PDF">
             <i class="fas fa-file-pdf"></i>
            </button>
            </div>`;
            },
        },
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
        { data: "tipo_pago", title: "Forma Pago", visible: false },
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
        { data: "costear", title: "Costear" },
        { data: "cliente", title: "Cliente" },
        { data: "contacto", title: "Contacto", visible: false },
        {
            data: "direccion_entrega",
            title: "Dirección entrega",
            visible: false,
        },
        { data: "observaciones_costeo", title: "Obsv.Costeo" },
        {
            data: "observaciones_cliente",
            title: "Obsv.Cliente",
            visible: false,
        },
        { data: "costeo_observaciones", title: "Obsv.Vendedor" },
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
            data: "archivo_costeo",
            title: "Archivo Costeo",
            render: (data) => {
                // Verificar si data NO es null, NO es undefined, es una cadena,
                // NO es una cadena vacía (o solo espacios),
                // Y NO es la cadena "null" (ignorando mayúsculas/minúsculas)
                const hasFile =
                    data != null && // data no es null ni undefined
                    typeof data === "string" && // data es una cadena
                    data.trim() !== "" && // data no es una cadena vacía o solo espacios
                    data.toLowerCase() !== "null"; // data no es la cadena "null"

                if (hasFile) {
                    // Si hay un valor de archivo válido, crea el link.
                    // Asumo que 'data' contiene la ruta relativa o completa correcta.
                    // Si 'data' ya es una URL completa, podrías usar solo href={data}
                    return `<a href="/${data}" target="_blank" rel="noopener noreferrer">Ver/Descargar</a>`;
                } else {
                    // Si no hay un valor de archivo válido (es null, undefined, "", o "null"),
                    // muestra el texto.
                    return "No hay archivo";
                }
            },
        },
    ];

    useEffect(() => {
        const handleButtonClick = async (event) => {
            const button = event.target.closest("button");
            if (!button) return; // Salir si no se hizo clic en un botón

            const id = button.getAttribute("data-id");
            const token = localStorage.getItem("token"); // Recupera el token del localStorage

            if (button.classList.contains("pdf-btn")) {
                if (token) {
                    try {
                        const response = await fetch(
                            `/api/cotizacionescosteo/${id}/pdf`,
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            }
                        );
                        const data = await response.json(); // Obtener datos como JSON
                        //console.log("Datos de la API para el PDF:", data);
                        setPdfData(data); // Establecer los datos del PDF en el estado
                    } catch (error) {
                        //console.error('Error al generar el PDF:', error);
                        alertify.error("Error al generar el PDF.");
                    }
                } else {
                    //console.error('Token no encontrado para generar PDF.');
                    alertify.error("Token no encontrado para generar PDF.");
                }
            }
        };

        // Agregar el evento al documento
        document.addEventListener("click", handleButtonClick);

        // Limpiar el evento cuando el componente se desmonte
        return () => {
            document.removeEventListener("click", handleButtonClick);
        };
    }, [navigate]); // Dependencia 'navigate' para evitar problemas con la navegación

    const options = {
        autoWidth: false, // Desactiva el autoajuste
        language: spanishTranslation, // Agrega la traducción aquí
        //order: [[1, 'desc']], // Ordena por la segunda columna (índice 1, 'nocotizacion') de forma descendente
        rowCallback: (row, data) => {
            if (data.estado === 1 && data.costear === "S") {
                row.style.backgroundColor = "#d5d8dc";
            } else if (data.estado === 3) {
                row.style.backgroundColor = "#fcf3cf";
            }
        },
    };

    useEffect(() => {
        // Este useEffect se ejecutará después de que el estado cotizacion cambie.
        //console.log('Estado cotización actualizado:', cotizaciones);
    }, [cotizaciones]);

    return (
        <div className="mt-4 px-3 px-md-4">
            {pdfData && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                    }}
                >
                    <div style={{ width: "80%", height: "80%" }}>
                        <PDFViewer width="100%" height="100%">
                            <CotizacionPDF
                                cotizacion={pdfData.cotizacion}
                                totalEnLetras={pdfData.totalEnLetras}
                                logoSrc="/images/LogoGP.jpg"
                            />
                        </PDFViewer>
                        <button
                            className="btn btn-danger mt-3"
                            onClick={() => setPdfData(null)}
                        >
                            Cerrar PDF
                        </button>
                    </div>
                </div>
            )}
            <div className="card">
                {/* <div className="card-header bg-primary text-white">
                    <h2 className="text-center mb-0">Lista de Cotizaciones</h2>
                </div> */}
                <Header title="Lista de Cotizaciones" />
                <div className="card-body">
                    <div className="mb-3">
                        <div className="row g-3 align-items-center">
                            <div className="col-auto">
                                <label
                                    htmlFor="fechaInicio"
                                    className="form-label"
                                >
                                    Fecha Inicio:
                                </label>
                            </div>
                            <div className="col-md-3">
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    id="fechaInicio"
                                    value={fechaInicio}
                                    onChange={(e) =>
                                        setFechaInicio(e.target.value)
                                    }
                                />
                            </div>
                            <div className="col-auto">
                                <label
                                    htmlFor="fechaFin"
                                    className="form-label"
                                >
                                    Fecha Fin:
                                </label>
                            </div>
                            <div className="col-md-3">
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    id="fechaFin"
                                    value={fechaFin}
                                    onChange={(e) =>
                                        setFechaFin(e.target.value)
                                    }
                                />
                            </div>
                            <div className="col-auto">
                                <button
                                    className="btn btn-success d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    onClick={handleFiltrar}
                                    style={{ width: "150px" }}
                                >
                                    <FaSearch /> Consultar
                                </button>
                            </div>
                        </div>
                    </div>
                    {loading || !spanishTranslation ? (
                        <p className="text-center">Cargando cotizaciones...</p>
                    ) : (
                        <div className="table-responsive">
                            <DataTable
                                data={cotizaciones}
                                columns={columns}
                                options={{
                                    ...options,
                                    language: spanishTranslation,
                                }}
                                className="table table-striped table-bordered table-hover table-sm"
                                ref={dtRef} // Asigna la referencia al componente DataTable
                            >
                                <thead>
                                    <tr>
                                        <th>No. Cotización</th>
                                        <th>Fecha</th>
                                        <th>Forma Pago</th>
                                        <th>Total</th>
                                        <th>Costear</th>
                                        <th>Cliente</th>
                                        <th>Contacto</th>
                                        <th>Dirección Entrega</th>
                                        <th>Obsv. Costeo</th>
                                        <th>Obsv. Cliente</th>
                                        <th>Obsv. Vendedor</th>
                                        <th>Trabajo</th>
                                        <th>Versión</th>
                                        <th>Estado</th>
                                        <th>Archivo Costeo</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                            </DataTable>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ListaCotizacionesCosteo;
