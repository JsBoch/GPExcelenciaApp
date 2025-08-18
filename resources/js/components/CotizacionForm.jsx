import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link, useParams, useNavigate } from "react-router-dom";
import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";
import Select from "react-select";
import ContactoClienteForm from "./ContactoClienteForm";
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from "reactstrap";
import ProductoPredefinidoModal from "./ProductoPredefinidoModal";
import {
    FaSave,
    FaSearch,
    FaProductHunt,
    FaBroom,
    FaCheckSquare,
    FaWindowClose,
    FaPlus,
} from "react-icons/fa";
import Header from "./Header";
import FormSection from "./FormSection";
import TipoPagoModal from "./TipoPagoModal";

DataTable.use(DT);

function CotizacionForm() {
    // const fechaActual = new Date().toISOString().split("T")[0];
    //const fechaActual = new Date().toLocaleDateString("en-CA");
    const [fechaActual, setFechaActual] = useState("");
    const { id } = useParams();
    const navigate = useNavigate();
    const [tiposPago, setTiposPago] = useState([]);
    const [unidadesMedida, setUnidadesMedida] = useState([]);
    const [contactos, setContactos] = useState([]);
    const [clienteId, setClienteId] = useState("");
    const [detalles, setDetalles] = useState([]);
    const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
    const [clienteOptions, setClienteOptions] = useState([]);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const toggleModal = () => setModalIsOpen(!modalIsOpen);
    const [productoPredefinidoModalIsOpen, setProductoPredefinidoModalIsOpen] =
        useState(false);
    const toggleProductoPredefinidoModal = () =>
        setProductoPredefinidoModalIsOpen(!productoPredefinidoModalIsOpen);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    const toggleImageModal = () => setIsImageModalOpen(!isImageModalOpen);
    const [tipoPagoModalOpen, setTipoPagoModalOpen] = useState(false);
    const toggleTipoPagoModal = () => setTipoPagoModalOpen(!tipoPagoModalOpen);

    // Cargar la fecha desde el servidor
    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, { headers })
            .then((res) => {
                setFechaActual(res.data.fecha);
            })
            .catch(() => {
                const localDate = new Date().toISOString().split("T")[0];
                setFechaActual(localDate); // fallback
            });
    }, []);

    //Estado de la cotización principal
    const [cotizacion, setCotizacion] = useState({
        idcotizacion: 0,
        idcotizacionoriginal: 0,
        idcliente: "",
        cliente: "",
        idcontacto: 0,
        contacto: "",
        fecha_cotizacion: fechaActual,
        trabajo: "",
        observaciones_costeo: "",
        observaciones_cliente: "",
        total_general: 0,
        costeo_observaciones: "",
        nocotizacion: "",
        version: 1,
        idtipopago: "",
        direccion_entrega: "",
        costear: "N",
    });

    //Estado del detalle de la cotización
    const [detalle, setDetalle] = useState({
        unidad_medida: "UNIDAD",
        descripcion: "",
        cantidad: 0,
        ancho: 0,
        alto: 0,
        m2: 0,
        profundidad: 0,
        precio: 0,
        total: 0,
        imagen: null, //nuevo estado para el archivo de imagen
        imagen_preview: null, //para mostrar una vista previa de la imágen
        imagen_ruta: null, //para almacenar la ruta de la imagen
    });

    useEffect(() => {
    if (!id && fechaActual) {
        setCotizacion((prev) => ({
            ...prev,
            fecha_cotizacion: fechaActual,
        }));
    }
}, [fechaActual]);

    //CAMBIO: Estados para almacenar precios y cantidades del modal
    const [productoPredefinido, setProductoPredefinido] = useState(null);

    // const [cantidadDetalle, setCantidadDetalle] = useState(0); //No se usa directamente

    const loadContactos = () => {
        if (clienteId) {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            axios
                .get(`/api/lista_contactos?idcliente=${clienteId}`, { headers })
                .then((res) => setContactos(res.data))
                .catch((error) => {
                    //console.error('Error al cargar contactos:', error);
                    alertify.error("Error al cargar contactos");
                });
        } else {
            setContactos([]);
        }
    };

    const handleContactCreated = (newContact) => {
        loadContactos();
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const fetchData = async () => {
            try {
                let requests = [
                    axios
                        .get("/api/lista_tipospago", { headers })
                        .then((res) => setTiposPago(res.data)),
                    axios
                        .get("/api/lista_unidadesmedida", { headers })
                        .then((res) => setUnidadesMedida(res.data)),
                ];

                if (id) {
                    requests.push(
                        axios
                            .get(`/api/cotizaciones/${id}`, { headers })
                            .then((res) => {
                                const data = res.data;
                                let formattedDate = "";
                                if (data.fecha_cotizacion) {
                                    formattedDate =
                                        data.fecha_cotizacion.split(" ")[0];
                                }
                                setCotizacion({
                                    idcotizacionoriginal:
                                        data.idcotizacionoriginal || 0,
                                    idcotizacion: data.idcotizacion || 0,
                                    idcliente: data.idcliente || 0,
                                    cliente: data.cliente || "",
                                    idcontacto: data.idcontacto || 0,
                                    contacto: data.contacto || "",
                                    fecha_cotizacion:
                                        formattedDate || fechaActual,
                                    trabajo: data.trabajo || "",
                                    observaciones_costeo:
                                        data.observaciones_costeo || "",
                                    observaciones_cliente:
                                        data.observaciones_cliente || "",
                                    total_general: data.total_general || 0,
                                    costeo_observaciones:
                                        data.costeo_observaciones || "",
                                    nocotizacion: data.nocotizacion || "",
                                    version: data.version || 1,
                                    idtipopago: data.idtipopago || "",
                                    direccion_entrega:
                                        data.direccion_entrega || "",
                                    costear: data.costear || "N",
                                });

                                if (data.idcliente) {
                                    setClienteId(data.idcliente);
                                    axios
                                        .get(
                                            `/api/lista_contactos?idcliente=${data.idcliente}`,
                                            { headers }
                                        )
                                        .then((res) => setContactos(res.data));
                                } else {
                                    setContactos([]);
                                }

                                if (data.detalles) {
                                    setDetalles(data.detalles);
                                }
                            })
                    );
                }

                await Promise.all(requests); // Wait for all requests to finish
            } catch (error) {
                //console.error('Error al cargar datos:', error);
                alertify.error("Error al cargar datos");
            }
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        loadContactos();
    }, [clienteId]);

    useEffect(() => {
        if (clienteId) {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            axios
                .get(`/api/lista_contactos?idcliente=${clienteId}`, { headers })
                .then((res) => setContactos(res.data))
                .catch((error) => {
                    //console.error('Error al cargar contactos:', error);
                    alertify.error("Error al cargar contactos");
                });
        } else {
            setContactos([]);
        }
    }, [clienteId]);

    //Calcular el total del detalle ---
    useEffect(() => {
        const cantidadNum = parseFloat(detalle.cantidad) || 0;
        const precioNum = parseFloat(detalle.precio) || 0;
        const totalCalculado = (cantidadNum * precioNum).toFixed(2);
        setDetalle((prevDetalle) => ({
            ...prevDetalle,
            total: totalCalculado,
        }));
    }, [detalle.cantidad, detalle.precio]);

    // --- Calcula los m2 del detalle ---
    useEffect(() => {
        const anchoNum = parseFloat(detalle.ancho) || 0;
        const altoNum = parseFloat(detalle.alto) || 0;
        const m2Calculado = (anchoNum * altoNum).toFixed(2);
        setDetalle((prevDetalle) => ({
            ...prevDetalle,
            m2: m2Calculado,
        }));
    }, [detalle.ancho, detalle.alto]);

    //-- función para calcular el total general de la cotización ---
    const calcularTotalGeneral = () => {
        let total = 0;
        detalles.forEach((detalle) => {
            total += parseFloat(detalle.total) || 0;
        });
        setCotizacion({ ...cotizacion, total_general: total.toFixed(2) });
    };

    useEffect(() => {
        calcularTotalGeneral();
    }, [detalles]);

    //Carga el listado de clientes
    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        axios
            .get("/api/lista_clientes", { headers })
            .then((res) => {
                const options = res.data.map((cliente) => ({
                    value: cliente.idcliente,
                    label: cliente.nombre,
                }));
                setClienteOptions(options);
            })
            .catch((error) => {
                //console.error('Error al cargar clientes:', error);
                alertify.error("Error al cargar clientes");
            });
    }, []);

    const handleClienteChange = (selectedOption) => {
        setClienteId(selectedOption.value);
        setCotizacion({
            ...cotizacion,
            idcliente: selectedOption.value,
            idcontacto: "",
        });
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        axios
            .get(`/api/lista_contactos?idcliente=${selectedOption.value}`, {
                headers,
            })
            .then((res) => {
                setContactos(res.data);
                // if (res.data.length === 0) {
                //     setModalIsOpen(true);
                // }
            })
            .catch((error) => {
                //console.error('Error al cargar contactos:', error);
                alertify.error("Error al cargar contactos");
            });
    };

    //Actualiza el estado de la cotización con el valor de cada campo cuando estos cambian
    const handleChange = (e) => {
        setCotizacion({ ...cotizacion, [e.target.name]: e.target.value });
    };

    //Envía los datos al back-end para registrar, en el método store.
    const handleSubmit = async (e) => {
        // Make handleSubmit async
        e.preventDefault();
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const formData = new FormData();

        // Validaciones
        if (!cotizacion.idcliente || cotizacion.idcliente === "") {
            alertify.alert("CAMPO OBLIGATORIO", "Debe seleccionar un cliente.");
            return;
        }

        if (!cotizacion.idcontacto || cotizacion.idcontacto === "") {
            cotizacion.idcontacto = 0; // Si no hay contacto, asignamos 0
        }

        if (!cotizacion.idtipopago || cotizacion.idtipopago === "") {
            alertify.alert(
                "CAMPO OBLIGATORIO",
                "Debe seleccionar una forma de pago."
            );
            return;
        }

        if (!detalles || detalles.length === 0) {
            alertify.alert(
                "CAMPO OBLIGATORIO",
                "Debe asignar registros en el detalle de la cotización."
            );
            return;
        }

        if (
            !cotizacion.direccion_entrega ||
            cotizacion.direccion_entrega.trim() === ""
        ) {
            alertify.alert(
                "CAMPO OBLIGATORIO",
                "Debe ingresar la dirección de entrega."
            );
            return;
        }

        // --- VALIDACIÓN DEL DETALLE PARA COSTEAR ---
        const tieneTotalCero = detalles.some(
            (detalle) => parseFloat(detalle.total) === 0
        );
        const costearValue = tieneTotalCero ? "S" : "N"; // Guardamos el valor en una constante
        setCotizacion((prevState) => ({
            ...prevState,
            costear: costearValue,
        }));

        formData.append("idcliente", cotizacion.idcliente);
        formData.append("idcontacto", cotizacion.idcontacto);
        formData.append("idtipopago", cotizacion.idtipopago);
        formData.append("fecha_cotizacion", cotizacion.fecha_cotizacion);
        formData.append("trabajo", cotizacion.trabajo);
        formData.append(
            "observaciones_costeo",
            cotizacion.observaciones_costeo
        );
        formData.append(
            "observaciones_cliente",
            cotizacion.observaciones_cliente
        );
        formData.append("direccion_entrega", cotizacion.direccion_entrega);
        formData.append("costear", "N");
        // if(costearValue === "S"){
        //     formData.append("estado","2");
        // }else{
        //     formData.append("estado","1");
        // }

        formData.append("estado", "1");
        formData.append(
            "idcotizacionoriginal",
            cotizacion.idcotizacionoriginal
        );
        formData.append("version", cotizacion.version);
        formData.append("total_general", cotizacion.total_general);

        detalles.forEach((detalle, index) => {
            formData.append(
                `detalles[${index}][unidad_medida]`,
                detalle.unidad_medida
            );
            formData.append(
                `detalles[${index}][descripcion]`,
                detalle.descripcion
            );
            formData.append(
                `detalles[${index}][cantidad]`,
                detalle.cantidad || 0
            );
            formData.append(`detalles[${index}][ancho]`, detalle.ancho || 0);
            formData.append(`detalles[${index}][alto]`, detalle.alto || 0);
            formData.append(`detalles[${index}][m2]`, detalle.m2 || 0);
            formData.append(
                `detalles[${index}][profundidad]`,
                detalle.profundidad || 0
            );
            formData.append(`detalles[${index}][precio]`, detalle.precio);
            formData.append(`detalles[${index}][total]`, detalle.total);
            // --- Manejo de IMAGEN al enviar FormData ---
            if (detalle.imagen) {
                // Caso 1: Se seleccionó un NUEVO archivo
                formData.append(`detalles[${index}][imagen]`, detalle.imagen);
                //console.log(`Frontend: Adjuntando nuevo archivo para índice ${index}`); // Log para verificar
            } else if (detalle.imagen_ruta) {
                // Caso 2: NO se seleccionó un archivo nuevo, pero existe una ruta vieja
                // Enviamos la ruta vieja para que el backend sepa que debe mantenerla
                formData.append(
                    `detalles[${index}][imagen_ruta]`,
                    detalle.imagen_ruta
                );
                //console.log(`Frontend: Adjuntando ruta existente para índice ${index}: ${detalle.imagen_ruta}`); // Log para verificar
            }
            // Caso 3: No hay imagen (ni nueva ni vieja) -> No se adjunta nada relacionado con imagen

            // Opcional: Si tus detalles tienen un ID (iddetallecotizacion) al editar, envíalo también
            // Esto es necesario si quieres que el backend actualice detalles existentes en lugar de eliminarlos y recrearlos
            // if (detalle.iddetallecotizacion) {
            //     formData.append(`detalles[${index}][iddetallecotizacion]`, detalle.iddetallecotizacion);
            // }
        });

        try {
            let res;
            if (id) {
                formData.append("_method", "PUT"); // Para indicar que es una actualización
                //console.log('Detalles a enviar:', detalles);
                res = await axios.post(`/api/cotizaciones/${id}`, formData, {
                    headers,
                });
                alertify.success("Cotización actualizada correctamente");
            } else {
                res = await axios.post("/api/cotizaciones", formData, {
                    headers,
                });
                alertify.success("Cotización creada correctamente");
            }
            navigate("/cotizaciones/lista");
        } catch (error) {
            console.error("Error al guardar la cotización:", error);
            alertify.error("Error al guardar la cotización", error);
        }
    };

    //Para cargar el detalle de la cotización
    const handleDetalleChange = (e) => {
        setDetalle({ ...detalle, [e.target.name]: e.target.value });
    };

    //Para gestionar la imagen del detalle
    const handleImagenChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setDetalle({
                ...detalle,
                imagen: e.target.files[0],
                imagen_preview: URL.createObjectURL(e.target.files[0]),
            });
        } else {
            setDetalle({ ...detalle, imagen: null, imagen_preview: null });
        }
    };

    //Agregar los datos del detalle al DataTable
    const handleAddDetalle = () => {
        const nuevoDetalle = { ...detalle };

        if (detalleSeleccionado) {
            const index = detalles.findIndex((d) => d === detalleSeleccionado);
            if (index !== -1) {
                const originalItem = detalleSeleccionado; // El objeto original del array (viene de backend o agregado antes)
                const formState = detalle; // El estado actual de los inputs del formulario de detalle

                // Logs para depuración intensiva (puedes removerlos después)
                // console.log('[handleAddDetalle - Editando] originalItem:', JSON.parse(JSON.stringify(originalItem)));
                // console.log('[handleAddDetalle - Editando] formState (detalle actual del form):', JSON.parse(JSON.stringify(formState)));
                // console.log('[handleAddDetalle - Editando] formState.imagen es File?', formState.imagen instanceof File);
                // console.log('[handleAddDetalle - Editando] formState.imagen (valor):', formState.imagen);

                // Construir el objeto actualizado para poner de vuelta en el array `detalles`
                const updatedItem = {
                    ...originalItem, // Mantener todas las propiedades originales (incluyendo iddetallecotizacion si existe, y la original imagen_ruta)

                    // Sobrescribir/Actualizar campos con los valores del formulario
                    unidad_medida: formState.unidad_medida,
                    descripcion: formState.descripcion,
                    cantidad: formState.cantidad,
                    ancho: formState.ancho,
                    alto: formState.alto,
                    m2: formState.m2, // Asegúrate que m2 se calcula y está en formState si no es readOnly
                    profundidad: formState.profundidad,
                    precio: formState.precio,
                    total: formState.total, // Asegúrate que total se calcula y está en formState si no es readOnly
                    // MANEJO EXPLÍCITO DE IMAGEN:
                    imagen:
                        formState.imagen instanceof File
                            ? formState.imagen
                            : null, // Si hay un File nuevo, úsalo, sino, explícitamente null.
                    imagen_preview: formState.imagen_preview, // La preview del formulario (puede ser blob de nueva imagen o URL de la vieja)

                    imagen_ruta:
                        formState.imagen instanceof File
                            ? null // Si hay un archivo nuevo, la ruta vieja se anula (backend generará una nueva)
                            : formState.imagen_ruta ||
                              originalItem.imagen_ruta ||
                              null, // Mantener la ruta existente si no hay archivo nuevo
                };

                //console.log('[handleAddDetalle - Editando] updatedItem FINAL:', JSON.parse(JSON.stringify(updatedItem)));

                const nuevosDetalles = [...detalles];
                nuevosDetalles[index] = updatedItem; // Reemplazar el objeto original en el array
                setDetalles(nuevosDetalles); // Actualizar el estado principal de detalles
            }
            setDetalleSeleccionado(null);
        } else {
            // const newItem = {
            //     ...formState, // Copia el estado del formulario
            //     imagen_ruta: null, // Una nueva imagen aún no tiene ruta de BD
            //     // incluye_foto se basa en si formState.imagen tiene un File
            //     incluye_foto: formState.imagen ? 'S' : 'N',
            //     // iddetallecotizacion: genera un ID temporal si lo necesitas en frontend
            // };
            // console.log('handleAddDetalle (Add New): Objeto final para el array =', newItem); // Log para verificar
            // setDetalles([...detalles, newItem]);
            // // Llama a calcularPrecioDetalle solo cuando se agrega un nuevo detalle
            // calcularPrecioDetalle(newItem.cantidad);
            // Lógica para AGREGAR un NUEVO detalle (esta parte parecía funcionar bien)
            const formState = detalle; // Usar formState para claridad aquí también
            const newItem = {
                // NO uses ...originalItem aquí porque no existe.
                // Genera un ID temporal si lo necesitas para el key en la lista, o deja que el backend lo asigne.
                // iddetallecotizacion: Date.now(), // Ejemplo de ID temporal para el frontend
                unidad_medida: formState.unidad_medida,
                descripcion: formState.descripcion,
                cantidad: formState.cantidad,
                ancho: formState.ancho,
                alto: formState.alto,
                m2: formState.m2,
                profundidad: formState.profundidad,
                precio: formState.precio,
                total: formState.total,
                imagen:
                    formState.imagen instanceof File ? formState.imagen : null,
                imagen_preview: formState.imagen_preview,
                imagen_ruta: null, // Un nuevo ítem no tiene ruta de BD aún
                // otros campos que necesites para un nuevo detalle, como incluye_foto, etc.
                incluye_foto: formState.imagen instanceof File ? "S" : "N",
            };
            //console.log('[handleAddDetalle - Agregando Nuevo] newItem FINAL:', JSON.parse(JSON.stringify(newItem)));
            setDetalles([...detalles, newItem]);
        }

        setDetalle({
            unidad_medida: "UNIDAD",
            descripcion: "",
            cantidad: 0,
            ancho: 0,
            alto: 0,
            m2: 0,
            profundidad: 0,
            precio: 0,
            total: 0,
            imagen: null,
            imagen_preview: null,
            imagen_ruta: null,
        });
    };

    const handleAgregarContacto = () => {
        if (!cotizacion.idcliente || cotizacion.idcliente === "") {
            alertify.error(
                "Debe seleccionar un cliente antes de agregar un contacto."
            );
            return;
        }
        toggleModal();
    };

    //Quitar el detalle seleccionado del DataTable
    const handleQuitarDetalle = () => {
        if (!detalleSeleccionado) {
            alertify.error("Por favor, selecciona un detalle para quitar.");
            return;
        }

        alertify.confirm(
            "¿Estás seguro de que deseas quitar este detalle?",
            () => {
                setDetalles(
                    detalles.filter(
                        (detalle) => detalle !== detalleSeleccionado
                    )
                );
                setDetalleSeleccionado(null);
                setDetalle({
                    unidad_medida: "UNIDAD",
                    descripcion: "",
                    cantidad: 0,
                    ancho: 0,
                    alto: 0,
                    m2: 0,
                    profundidad: 0,
                    precio: 0,
                    total: 0,
                    imagen: null,
                    imagen_preview: null,
                });
                alertify.success("Detalle eliminado.");
            },
            () => {
                alertify.error("Cancelado");
            }
        );
    };

    //Ejecutan la función handleRowClick cuando se hace clic en una fila del DataTable
    const slots = {
        0: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        1: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        2: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        3: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        4: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        5: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        6: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        7: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
        8: (data, row) => (
            <div
                onClick={() => handleRowClick(row)}
                style={{ cursor: "pointer" }}
            >
                {data}
            </div>
        ),
    };

    //Carga los valores de la fila seleccionada en el DataTable a los inputs correspondientes del detalle.
    const handleRowClick = (rowData) => {
        //console.log('rowData:', rowData);
        setDetalleSeleccionado(rowData);

        const previewUrl = rowData.imagen_ruta
            ? `/images_cotizaciones/${rowData.imagen_ruta}`
            : rowData.imagen_preview || null;

        setDetalle({
            unidad_medida: rowData.unidad_medida,
            descripcion: rowData.descripcion,
            cantidad: rowData.cantidad,
            ancho: rowData.ancho,
            alto: rowData.alto,
            m2: rowData.m2,
            profundidad: rowData.profundidad,
            precio: rowData.precio,
            total: rowData.total,
            imagen: null, // Cuando se edita, la imagen ya está guardada, no se "carga" aquí
            imagen_preview: previewUrl,
            imagen_ruta: rowData.imagen_ruta || null, // ¡CRUCIAL! Conservar la ruta de la imagen existente en el estado del formulario.
        });

        // Lógica del modal de imagen (parece estar bien, pero asegúrate que usa la previewUrl correcta)
        if (previewUrl) {
            // Usa la previewUrl que acabamos de definir
            setSelectedImageUrl(previewUrl);
            //console.log('Detalle Form State After Click:', detalle);
            setIsImageModalOpen(true);
        } else {
            // alertify.error("Este detalle no tiene una imagen asociada."); // Comentado si quieres evitar alerta si no hay imagen
            setSelectedImageUrl(null);
            //console.log('Detalle else Form State After Click:', detalle);
            setIsImageModalOpen(false);
        }
    };

    //Se establecen las columnas que se mostrarán en el DataTable
    const columns = [
        { title: "Unidad Medida", data: "unidad_medida" },
        { title: "Descripción", data: "descripcion" },
        { title: "Cantidad", data: "cantidad" },
        { title: "Ancho", data: "ancho" },
        { title: "Alto", data: "alto" },
        { title: "M2", data: "m2" },
        { title: "Profundidad", data: "profundidad" },
        {
            title: "Precio",
            data: "precio",
            render: (data) =>
                parseFloat(data).toLocaleString("es-GT", {
                    style: "currency",
                    currency: "GTQ",
                }),
        },
        {
            title: "Total",
            data: "total",
            render: (data) =>
                parseFloat(data).toLocaleString("es-GT", {
                    style: "currency",
                    currency: "GTQ",
                }),
        },
        {
            title: "Imagen",
            data: "imagen_ruta", // Mantenemos 'imagen_ruta' como data key principal si viene del backend
            render: (data, type, row) => {
                // 'data' es imagen_ruta, 'row' es el objeto completo del detalle
                // Verifica si hay imagen_ruta (desde backend) O si hay imagen (File object) O si hay imagen_preview (URL temporal)
                const hasImage =
                    row.imagen_ruta ||
                    (row.imagen && row.imagen instanceof File) ||
                    row.imagen_preview;

                if (hasImage) {
                    // Muestra un texto o ícono indicando que hay una imagen
                    return "Con imagen"; // O podrías usar '<i class="fas fa-image"></i>' si tienes Font Awesome
                } else {
                    return "Sin imagen";
                }
            },
        },
    ];

    const handleProductoPredefinidoSeleccionado = (producto) => {
        setProductoPredefinido(producto);
        // Prepara el detalle con los datos del producto
        const nuevoDetalleInicial = {
            unidad_medida: producto.unidad_medida,
            descripcion: producto.titulo,
            ancho: producto.ancho,
            alto: producto.alto,
            profundidad: producto.profundidad,
            cantidad: 0, // Cantidad inicial es 0 al seleccionar el producto
            precio: 0, // El precio se calculará a continuación
            total: 0, // El total también se calculará
            imagen: null,
            imagen_preview: null, // El producto predefinido no trae imagen de detalle aquí
        };

        // Actualiza el estado del detalle
        setDetalle((prevDetalle) => ({
            ...prevDetalle,
            ...nuevoDetalleInicial, // Aplica los campos del nuevo producto
        }));

        calcularPrecioDetalle(0, producto); // Calcular el precio inicial al seleccionar el producto
        toggleProductoPredefinidoModal();
    };

    const handleCantidadDetalleChange = (e) => {
        const value = parseInt(e.target.value, 10) || 0;
        // setCantidadDetalle(value); // This is unnecessary in this setup!
        // if (!productoPredefinido) {
        //     alertify.error(
        //         "Selecciona un producto antes de ingresar una cantidad."
        //     );
        //     return;
        // }

        setDetalle((prevDetalle) => ({
            //const updatedDetalle = {
            ...prevDetalle,
            cantidad: value,
            //};

            // Vuelve a calcular el precio y total con la *nueva cantidad* y el *producto predefinido actual*
            // Es importante usar el 'productoPredefinido' del estado aquí, ya que este handler
            // se llama DESPUÉS de que un producto ya ha sido seleccionado y su estado ha sido actualizado.
            //calcularPrecioDetalle(value, productoPredefinido); // Usa el valor de la cantidad recién ingresado y el producto del estado

            // Retorna el estado actualizado del detalle
            //return updatedDetalle;
        }));
    };

    // Este efecto se ejecuta cuando la cantidad o el producto cambian
    useEffect(() => {
        if (!productoPredefinido || !detalle || !detalle.cantidad) return;
        if (!productoPredefinido || !detalle.cantidad) return;

        const calcularPrecioDetalle = (cantidad, productData) => {
            const {
                variacion,
                precio,
                cantidad_uno,
                cantidad_dos,
                cantidad_tres,
                cantidad_cuatro,
                precio_uno,
                precio_dos,
                precio_tres,
                precio_cuatro,
            } = productData;

            let nuevoPrecio = 0;

            if (variacion === "S") {
                const c = parseFloat(cantidad);
                const cu = parseFloat(cantidad_uno || 0);
                const cd = parseFloat(cantidad_dos || 0);
                const ct = parseFloat(cantidad_tres || 0);
                const cc = parseFloat(cantidad_cuatro || 0);

                if (c <= cu) {
                    nuevoPrecio = parseFloat(precio_uno || 0);
                } else if (c >= cu && c <= cd) {
                    nuevoPrecio = parseFloat(precio_dos || 0);
                } else if (c >= cd && c <= ct) {
                    nuevoPrecio = parseFloat(precio_tres || 0);
                } else if (c > ct) {
                    nuevoPrecio = parseFloat(precio_cuatro || 0);
                }
            } else {
                nuevoPrecio = parseFloat(precio || 0);
            }

            setDetalle((prevDetalle) => ({
                ...prevDetalle,
                precio: nuevoPrecio,
            }));
        };

        calcularPrecioDetalle(detalle.cantidad, productoPredefinido);
    }, [detalle.cantidad, productoPredefinido]);

    // Modificar calcularPrecioDetalle para aceptar el producto como argumento
    const calcularPrecioDetalle = (cantidad, productData) => {
        let nuevoPrecio = 0;

        // Usa los datos del producto pasados como argumento. Si por alguna razón no se pasan,
        // usa el estado 'productoPredefinido' (aunque con la corrección siempre se pasarán).
        const currentProductData = productData || productoPredefinido;

        // Asegúrate de que tenemos datos del producto para calcular
        if (!currentProductData) {
            //console.warn("calcularPrecioDetalle llamado sin datos de producto.");
            // Establece precio a 0 si no hay datos para evitar errores
            setDetalle((prevDetalle) => ({
                ...prevDetalle,
                precio: 0,
                total: 0,
            }));
            return;
        }

        //console.log('Calculando precio para:', currentProductData.titulo, ', Cantidad:', cantidad, ', Variación:', currentProductData.variacion); // Log para depuración

        // Lógica de cálculo basada en la VARIACIÓN (usar solo 'N' o 'S')
        // Asegúrate de que los valores del backend son exactamente 'N' y 'S'
        if (currentProductData.variacion === "N") {
            //console.log('Variación N: Usando precio base.');
            nuevoPrecio = parseFloat(currentProductData.precio) || 0;
        } else if (currentProductData.variacion === "S") {
            //console.log('Variación S: Aplicando reglas de cantidad.');
            // Lógica de rangos de cantidad
            if (
                cantidad > 0 &&
                cantidad <= parseFloat(currentProductData.cantidad_uno || 0)
            ) {
                nuevoPrecio = parseFloat(currentProductData.precio_uno) || 0;
            } else if (
                parseFloat(currentProductData.cantidad_dos || 0) > 0 &&
                cantidad > parseFloat(currentProductData.cantidad_uno || 0) &&
                cantidad <= parseFloat(currentProductData.cantidad_dos || 0)
            ) {
                nuevoPrecio = parseFloat(currentProductData.precio_dos) || 0;
            } else if (
                parseFloat(currentProductData.cantidad_tres || 0) > 0 &&
                cantidad > parseFloat(currentProductData.cantidad_dos || 0) &&
                cantidad <= parseFloat(currentProductData.cantidad_tres || 0)
            ) {
                nuevoPrecio = parseFloat(currentProductData.precio_tres) || 0;
            } else if (
                parseFloat(currentProductData.cantidad_cuatro || 0) > 0 &&
                cantidad > parseFloat(currentProductData.cantidad_tres || 0)
            ) {
                nuevoPrecio = parseFloat(currentProductData.precio_cuatro) || 0;
            } else {
                // Qué hacer si la cantidad no cae en ningún rango para variación 'S'?
                // Tu lógica actual calculaba cantidad * precio base, lo cual puede no ser correcto.
                // Considera establecer el precio a 0, mostrar un mensaje, o usar otra lógica de negocio.
                //console.warn('Cantidad', cantidad, 'fuera de rangos definidos para variación S. Estableciendo precio a 0.');
                nuevoPrecio = 0; // O define una lógica de fallback adecuada
            }
        } else {
            // Manejar casos inesperados de variación
            //console.warn('Variación desconocida:', currentProductData.variacion, '. Estableciendo precio a 0.');
            nuevoPrecio = 0;
        }

        // Asegura que el precio calculado sea un número válido
        if (isNaN(nuevoPrecio)) {
            //console.error("Precio calculado es NaN. Estableciendo a 0.");
            alertify.error("Error al calcular el precio. Estableciendo a 0.");
            nuevoPrecio = 0;
        }

        // Calcula el total basado en la cantidad y el nuevo precio
        const totalCalculado = (cantidad * nuevoPrecio).toFixed(2);

        // Actualiza el estado del detalle con el nuevo precio y total
        setDetalle((prevDetalle) => ({
            ...prevDetalle,
            precio: parseFloat(nuevoPrecio.toFixed(2)), // Asegura 2 decimales y tipo number
            total: totalCalculado, // El total ya está como string con 2 decimales
        }));
    };

    const limpiarCampos = () => {
        setCotizacion({
            idcotizacion: 0,
            idcotizacionoriginal: 0,
            idcliente: "",
            cliente: "",
            idcontacto: 0,
            contacto: "",
            fecha_cotizacion: fechaActual,
            trabajo: "",
            observaciones_costeo: "",
            observaciones_cliente: "",
            total_general: 0,
            costeo_observaciones: "",
            nocotizacion: "",
            version: 1,
            idtipopago: "",
            direccion_entrega: "",
        });
        setDetalles([]);
        setDetalle({
            unidad_medida: "UNIDAD",
            descripcion: "",
            cantidad: 0,
            ancho: 0,
            alto: 0,
            m2: 0,
            profundidad: 0,
            precio: 0,
            total: 0,
        });
    };

    return (
        <div className="mt-4 mb-4">
            <Header
                title={id ? "Editar Cotización" : "Crear Cotización"}
            />
            <div className="card shadow p-4">
                {/* <div className="card-header bg-primary text-white">
                    <h4 className="mb-0">{id ? 'Editar Cotización' : 'Crear Nueva Cotización'}</h4>
                </div> */}
                <div className="card-body card-form">
                    <form onSubmit={handleSubmit} encType="multipart/form-data">
                        {/* --- Sección Cliente/Contacto/Pago --- */}
                        <FormSection title="Datos generales">
                            <div className="row g-2 mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">
                                        Cliente
                                    </label>
                                    <Select
                                        value={clienteOptions.find(
                                            (option) =>
                                                option.value ===
                                                cotizacion.idcliente
                                        )}
                                        onChange={handleClienteChange}
                                        options={clienteOptions}
                                        isSearchable={true}
                                        placeholder="Seleccionar Cliente"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">
                                        Contacto
                                    </label>
                                    <select
                                        name="idcontacto"
                                        value={cotizacion.idcontacto}
                                        onChange={handleChange}
                                        className="form-select form-select-sm campo-obligatorio-fondo"
                                        disabled={!clienteId}
                                    >
                                        <option value="">
                                            Seleccionar Contacto
                                        </option>
                                        {contactos.map((contacto) => (
                                            <option
                                                key={
                                                    contacto.id_contactocliente
                                                }
                                                value={
                                                    contacto.id_contactocliente
                                                }
                                            >
                                                {contacto.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className="btn btn-link btn-sm"
                                        onClick={handleAgregarContacto}
                                        style={{
                                            textDecoration: "none",
                                            color: "#007bff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Agregar Contacto
                                    </button>
                                </div>
                            </div>
                            <div className="row g-2 mb-3">
                                <div className="col-md-3">
                                    <label className="form-label">
                                        Forma pago
                                    </label>
                                    <select
                                        name="idtipopago"
                                        value={cotizacion.idtipopago}
                                        onChange={handleChange}
                                        className="form-select form-select-sm campo-obligatorio-fondo"
                                    >
                                        <option value="">
                                            Seleccionar forma de pago
                                        </option>
                                        {tiposPago.map((tipoPago) => (
                                            <option
                                                key={tipoPago.idtipopago}
                                                value={tipoPago.idtipopago}
                                            >
                                                {tipoPago.tipo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-1 d-flex align-items-end">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm w-100 d-flex justify-content-center align-items-center"
                                        onClick={toggleTipoPagoModal}
                                        title="Agregar nueva forma de pago"
                                        style={{
                                            fontSize: "0.9rem",
                                            fontWeight: "bold",
                                            padding: "4px",
                                            color: "#0d6efd", // azul de Bootstrap
                                            borderColor: "#0d6efd",
                                            backgroundColor: "#ffffff", // fondo blanco para mejor contraste
                                        }}
                                    >
                                        <FaPlus />
                                    </button>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">
                                        Fecha cotizacion
                                    </label>
                                    <input
                                        type="date"
                                        name="fecha_cotizacion"
                                        value={cotizacion.fecha_cotizacion}
                                        onChange={handleChange}
                                        placeholder="Fecha cotización"
                                        className="form-control form-control-sm"
                                        required
                                    />
                                </div>
                                <div className="col-md-5">
                                    <label className="form-label">
                                        Trabajo
                                    </label>
                                    <input
                                        type="text"
                                        name="trabajo"
                                        value={cotizacion.trabajo}
                                        onChange={handleChange}
                                        placeholder="Nombre del trabajo o proyecto"
                                        className="form-control form-control-sm"
                                    />
                                </div>
                            </div>
                            <div className="row g-2 mb-4">
                                <div className="col-md-12">
                                    <label className="form-label">
                                        Dirección entrega
                                    </label>
                                    <input
                                        type="text"
                                        name="direccion_entrega"
                                        value={cotizacion.direccion_entrega}
                                        onChange={handleChange}
                                        placeholder="Dirección de entrega"
                                        className="form-control form-control-sm campo-obligatorio-fondo"
                                    />
                                </div>
                            </div>
                        </FormSection>
                        <FormSection title="Detalle de Cotización">
                            <div className="row g-1 mb-2">
                                <div className="col-md-4">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-producto-predefinido"
                                        onClick={toggleProductoPredefinidoModal}
                                    >
                                        <FaProductHunt /> Seleccionar Producto
                                        Predefinido
                                    </button>
                                </div>
                            </div>
                            <div className="row g-3 mb-2">
                                {/* Este bloque va aquí, después del botón */}
                                <div className="col-md-2">
                                    <label className="form-label">
                                        Unidad Medida
                                    </label>
                                    <select
                                        name="unidad_medida"
                                        value={detalle.unidad_medida}
                                        onChange={handleDetalleChange}
                                        className="form-select form-select-sm"
                                    >
                                        {/* <option value="">Seleccionar</option> */}
                                        {unidadesMedida.map((um) => (
                                            <option
                                                key={um.idunidadmedida}
                                                value={um.unidad}
                                            >
                                                {um.unidad}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-1">
                                    <label className="form-label">
                                        Cantidad
                                    </label>
                                    <input
                                        type="number"
                                        name="cantidad"
                                        value={detalle.cantidad}
                                        onChange={handleCantidadDetalleChange} // <-- Use this!!!
                                        className="form-control form-control-sm"
                                        step="1"
                                        min="0"
                                    />
                                </div>
                                <div className="col-md-9">
                                    <label className="form-label">
                                        Descripción
                                    </label>
                                    <textarea
                                        rows="1"
                                        name="descripcion"
                                        value={detalle.descripcion}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                    ></textarea>
                                </div>
                            </div>

                            {/* Fila 2: Medidas, Precio, Total y Botón Agregar */}
                            <div className="row g-2 align-items-end mb-3">
                                <div className="col">
                                    <label className="form-label">Ancho</label>
                                    <input
                                        type="number"
                                        name="ancho"
                                        value={detalle.ancho}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                        step="any"
                                        min="0"
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Alto</label>
                                    <input
                                        type="number"
                                        name="alto"
                                        value={detalle.alto}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                        step="any"
                                        min="0"
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">M2</label>
                                    <input
                                        type="number"
                                        name="m2"
                                        value={detalle.m2}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                        step="any"
                                        min="0"
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Prof.</label>
                                    <input
                                        type="number"
                                        name="profundidad"
                                        value={detalle.profundidad}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                        step="any"
                                        min="0"
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Precio</label>
                                    <input
                                        type="number"
                                        name="precio"
                                        value={detalle.precio}
                                        onChange={handleDetalleChange}
                                        className="form-control form-control-sm"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                                <div className="col">
                                    <label className="form-label">Total</label>
                                    <input
                                        type="number"
                                        name="total"
                                        value={detalle.total}
                                        className="form-control form-control-sm"
                                        readOnly
                                        step="0.01"
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label fw-bold">
                                        Imagen (Opcional)
                                    </label>
                                    <input
                                        type="file"
                                        name="imagen"
                                        className="form-control form-control-sm"
                                        onChange={handleImagenChange}
                                    />
                                    {detalle.imagen_preview && (
                                        <img
                                            src={detalle.imagen_preview}
                                            alt="Vista previa"
                                            style={{
                                                maxWidth: "50px",
                                                marginTop: "5px",
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="col-auto">
                                    <button
                                        type="button"
                                        onClick={handleAddDetalle}
                                        className={
                                            detalleSeleccionado
                                                ? "btn btn-sm btn-agregar"
                                                : "btn btn-sm btn-agregar"
                                        }
                                    >
                                        <FaCheckSquare />
                                        {detalleSeleccionado
                                            ? " Actualizar"
                                            : " Agregar"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleQuitarDetalle}
                                        className="btn btn-danger btn-sm ms-2"
                                    >
                                        <FaWindowClose /> Quitar
                                    </button>
                                </div>
                            </div>

                            {/* --- Tabla de Detalles Agregados --- */}
                            <h5 className="mt-4 mb-3 border-bottom pb-2">
                                Detalles Agregados
                            </h5>
                            <div className="table-responsive mb-4">
                                <DataTable
                                    data={detalles}
                                    columns={columns}
                                    options={{
                                        paging: false,
                                        searching: false,
                                        info: false,
                                        ordering: true,
                                    }}
                                    slots={slots}
                                    className="table table-striped table-bordered table-hover table-sm"
                                    //style={{fontWeight: "#ddd" }}
                                    id="tabla-detalles"
                                >
                                    <thead>
                                        <tr>
                                            <th>Unidad Medida</th>
                                            <th>Descripción</th>
                                            <th>Cantidad</th>
                                            <th>Ancho</th>
                                            <th>Alto</th>
                                            <th>M2</th>
                                            <th>Profundidad</th>
                                            <th>Precio</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                </DataTable>
                            </div>
                            {/* Input del total general */}
                            <div className="mb-3 d-flex justify-content-end">
                                <label
                                    className="form-label fw-bold me-2"
                                    style={{ alignSelf: "center" }}
                                >
                                    Total General:
                                </label>
                                <input
                                    type="text"
                                    name="total_general"
                                    value={parseFloat(
                                        cotizacion.total_general || 0
                                    ).toLocaleString("es-GT", {
                                        style: "currency",
                                        currency: "GTQ",
                                    })}
                                    readOnly
                                    className="form-control"
                                    style={{
                                        maxWidth: "150px",
                                        textAlign: "right",
                                        fontWeight: "bold",
                                        fontSize: "1.1em",
                                    }}
                                />
                            </div>
                            {/* --- Sección Observaciones --- */}
                            <div className="row g-2 mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">
                                        Observaciones cliente
                                    </label>
                                    <textarea
                                        rows="3"
                                        name="observaciones_cliente"
                                        value={cotizacion.observaciones_cliente}
                                        onChange={handleChange}
                                        placeholder="Observaciones para cliente"
                                        className="form-control form-control-sm"
                                    ></textarea>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">
                                        Observaciones costeo (Internas)
                                    </label>
                                    <textarea
                                        rows="3"
                                        name="observaciones_costeo"
                                        value={cotizacion.observaciones_costeo}
                                        onChange={handleChange}
                                        placeholder="Observaciones internas para costeo"
                                        className="form-control form-control-sm"
                                    ></textarea>
                                </div>
                            </div>
                        </FormSection>

                        <div
                            className="mt-4 p-3 border rounded shadow-sm bg-light"
                            style={{ borderColor: "#ddd" }}
                        >
                            <div className="d-flex flex-wrap gap-2 justify-content-between">
                                <button
                                    type="submit"
                                    className="btn btn-sm btn-guardar d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px" }}
                                >
                                    <FaSave /> {id ? "ACTUALIZAR" : "GUARDAR"}
                                </button>
                                <button
                                    type="button" // Importante: no es un botón de submit
                                    className="btn btn-sm btn-limpiar d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{
                                        minWidth: "150px",
                                        color: "#000",
                                        border: "1px solid #ccc",
                                    }}
                                    onClick={limpiarCampos} // Asocia la función al evento onClick
                                >
                                    <FaBroom />{" "}
                                    {/* Puedes usar otro icono como FaBroom */}{" "}
                                    LIMPIAR
                                </button>
                                <Link
                                    to="/cotizaciones/lista"
                                    className="btn btn-sm btn-consultar d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px" }}
                                >
                                    <FaSearch /> CONSULTAR
                                </Link>
                            </div>
                        </div>
                        {/* Modal para ContactoClienteForm */}
                        <Modal
                            isOpen={modalIsOpen}
                            toggle={toggleModal}
                            centered
                            size="xl"
                        >
                            <ModalHeader toggle={toggleModal}>
                                Crear Nuevo Contacto
                            </ModalHeader>
                            <ModalBody>
                                <ContactoClienteForm
                                    clienteId={clienteId}
                                    onClose={toggleModal}
                                    onContactCreated={handleContactCreated}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button color="secondary" onClick={toggleModal}>
                                    Cerrar
                                </Button>
                            </ModalFooter>
                        </Modal>
                        {/* Modal para ProductoPredefinidoForm */}
                        <ProductoPredefinidoModal
                            isOpen={productoPredefinidoModalIsOpen}
                            onClose={toggleProductoPredefinidoModal}
                            onProductoSeleccionado={
                                handleProductoPredefinidoSeleccionado
                            }
                        />
                        {/* Modal para mostrar la imagen del detalle */}
                        <Modal
                            isOpen={isImageModalOpen}
                            toggle={toggleImageModal}
                            centered
                            size="lg"
                        >
                            <ModalHeader toggle={toggleImageModal}>
                                Imagen del Detalle
                            </ModalHeader>
                            <ModalBody>
                                {selectedImageUrl ? (
                                    <img
                                        src={selectedImageUrl}
                                        alt="Imagen del Detalle"
                                        style={{
                                            maxWidth: "100%",
                                            height: "auto",
                                        }}
                                    />
                                ) : (
                                    <p>
                                        Este detalle no tiene una imagen
                                        asociada.
                                    </p>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    color="secondary"
                                    onClick={toggleImageModal}
                                >
                                    Cerrar
                                </Button>
                            </ModalFooter>
                        </Modal>
                    </form>
                    <TipoPagoModal
                        isOpen={tipoPagoModalOpen}
                        toggle={toggleTipoPagoModal}
                        onTipoPagoCreado={(nuevoTipo) => {
                            setTiposPago((prevTipos) => {
                                const nuevaLista = [...prevTipos, nuevoTipo];

                                // Ordenar por el campo 'tipo' alfabéticamente
                                nuevaLista.sort((a, b) =>
                                    a.tipo.localeCompare(b.tipo, "es", {
                                        sensitivity: "base",
                                    })
                                );

                                return nuevaLista;
                            });

                            // Asignar el nuevo tipo al select automáticamente
                            setCotizacion((prev) => ({
                                ...prev,
                                idtipopago: nuevoTipo.idtipopago,
                            }));
                        }}
                        tiposExistentes={tiposPago} // ✅ aquí pasamos la lista existente
                    />
                </div>
            </div>
        </div>
    );
}

export default CotizacionForm;
