import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link, useParams, useNavigate } from 'react-router-dom';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.min.css';
import 'alertifyjs/build/css/themes/default.min.css';
import Select from 'react-select';
import ContactoClienteForm from './ContactoClienteForm';
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from 'reactstrap';
import ProductoPredefinidoModal from './ProductoPredefinidoModal';
import { FaSave, FaSearch, FaHome, FaBroom } from "react-icons/fa";
import Header from './Header';
import '../../css/generalesForm.css';

DataTable.use(DT);

function CotizacionForm() {
    const fechaActual = new Date().toISOString().split("T")[0];
    const { id } = useParams();
    const navigate = useNavigate();
    const [tiposPago, setTiposPago] = useState([]);
    const [unidadesMedida, setUnidadesMedida] = useState([]);
    const [contactos, setContactos] = useState([]);
    const [clienteId, setClienteId] = useState('');
    const [detalles, setDetalles] = useState([]);
    const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
    const [clienteOptions, setClienteOptions] = useState([]);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const toggleModal = () => setModalIsOpen(!modalIsOpen);
    const [productoPredefinidoModalIsOpen, setProductoPredefinidoModalIsOpen] = useState(false);
    const toggleProductoPredefinidoModal = () => setProductoPredefinidoModalIsOpen(!productoPredefinidoModalIsOpen);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    const toggleImageModal = () => setIsImageModalOpen(!isImageModalOpen);
    //Estado de la cotización principal
    const [cotizacion, setCotizacion] = useState({
        idcotizacion: 0,
        idcotizacionoriginal: 0,
        idcliente: '',
        cliente: '',
        idcontacto: 0,
        contacto: '',
        fecha_cotizacion: fechaActual,
        trabajo: '',
        observaciones_costeo: '',
        observaciones_cliente: '',
        total_general: 0,
        costeo_observaciones: '',
        nocotizacion: '',
        version: 1,
        idtipopago: '',
        direccion_entrega: '',
        costear: 'N',
    });

    //Estado del detalle de la cotización
    const [detalle, setDetalle] = useState({
        unidad_medida: '',
        descripcion: '',
        cantidad: 0,
        ancho: 0,
        alto: 0,
        m2: 0,
        profundidad: 0,
        precio: 0,
        total: 0,
        imagen: null, //nuevo estado para el archivo de imagen
        imagen_preview: null, //para mostrar una vista previa de la imágen
    });

    //CAMBIO: Estados para almacenar precios y cantidades del modal
    const [productoPredefinido, setProductoPredefinido] = useState({
        variacion: '0',
        precio: 0,
        cantidad_uno: 0,
        precio_uno: 0,
        cantidad_dos: 0,
        precio_dos: 0,
        cantidad_tres: 0,
        precio_tres: 0,
        cantidad_cuatro: 0,
        precio_cuatro: 0,
    });

    // const [cantidadDetalle, setCantidadDetalle] = useState(0); //No se usa directamente

    const loadContactos = () => {
        if (clienteId) {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            axios.get(`/api/lista_contactos?idcliente=${clienteId}`, { headers })
                .then(res => setContactos(res.data))
                .catch(error => {
                    //console.error('Error al cargar contactos:', error);
                    alertify.error('Error al cargar contactos');
                });
        } else {
            setContactos([]);
        }
    };

    const handleContactCreated = (newContact) => {
        loadContactos();
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const fetchData = async () => {
            try {
                let requests = [
                    axios.get('/api/lista_tipospago', { headers }).then(res => setTiposPago(res.data)),
                    axios.get('/api/lista_unidadesmedida', { headers }).then(res => setUnidadesMedida(res.data))
                ];

                if (id) {
                    requests.push(axios.get(`/api/cotizaciones/${id}`, { headers })
                        .then(res => {
                            const data = res.data;
                            let formattedDate = '';
                            if (data.fecha_cotizacion) {
                                formattedDate = data.fecha_cotizacion.split(' ')[0];
                            }
                            setCotizacion({
                                idcotizacionoriginal: data.idcotizacionoriginal || 0,
                                idcotizacion: data.idcotizacion || 0,
                                idcliente: data.idcliente || 0,
                                cliente: data.cliente || '',
                                idcontacto: data.idcontacto || 0,
                                contacto: data.contacto || '',
                                fecha_cotizacion: formattedDate || fechaActual,
                                trabajo: data.trabajo || '',
                                observaciones_costeo: data.observaciones_costeo || '',
                                observaciones_cliente: data.observaciones_cliente || '',
                                total_general: data.total_general || 0,
                                costeo_observaciones: data.costeo_observaciones || '',
                                nocotizacion: data.nocotizacion || '',
                                version: data.version || 1,
                                idtipopago: data.idtipopago || '',
                                direccion_entrega: data.direccion_entrega || '',
                                costear: data.costear || 'N',
                            });

                            if (data.idcliente) {
                                setClienteId(data.idcliente);
                                axios.get(`/api/lista_contactos?idcliente=${data.idcliente}`, { headers }).then(res => setContactos(res.data));
                            } else {
                                setContactos([]);
                            }

                            if (data.detalles) {
                                setDetalles(data.detalles);
                            }
                        }));
                }

                await Promise.all(requests); // Wait for all requests to finish

            } catch (error) {
                //console.error('Error al cargar datos:', error);
                alertify.error('Error al cargar datos');
            }
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        loadContactos();
    }, [clienteId]);

    useEffect(() => {
        if (clienteId) {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            axios.get(`/api/lista_contactos?idcliente=${clienteId}`, { headers })
                .then(res => setContactos(res.data))
                .catch(error => {
                    //console.error('Error al cargar contactos:', error);
                    alertify.error('Error al cargar contactos');
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
        setDetalle(prevDetalle => ({
            ...prevDetalle,
            total: totalCalculado
        }));
    }, [detalle.cantidad, detalle.precio]);

    // --- Calcula los m2 del detalle ---
    useEffect(() => {
        const anchoNum = parseFloat(detalle.ancho) || 0;
        const altoNum = parseFloat(detalle.alto) || 0;
        const m2Calculado = (anchoNum * altoNum).toFixed(2);
        setDetalle(prevDetalle => ({
            ...prevDetalle,
            m2: m2Calculado
        }));
    }, [detalle.ancho, detalle.alto]);

    //-- función para calcular el total general de la cotización ---
    const calcularTotalGeneral = () => {
        let total = 0;
        detalles.forEach(detalle => {
            total += parseFloat(detalle.total) || 0;
        });
        setCotizacion({ ...cotizacion, total_general: total.toFixed(2) });
    };

    useEffect(() => {
        calcularTotalGeneral();
    }, [detalles]);

    //Carga el listado de clientes
    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        axios.get('/api/lista_clientes', { headers })
            .then(res => {
                const options = res.data.map(cliente => ({
                    value: cliente.idcliente,
                    label: cliente.nombre,
                }));
                setClienteOptions(options);
            })
            .catch(error => {
                //console.error('Error al cargar clientes:', error);
                alertify.error('Error al cargar clientes');
            });
    }, []);

    const handleClienteChange = (selectedOption) => {
        setClienteId(selectedOption.value);
        setCotizacion({ ...cotizacion, idcliente: selectedOption.value, idcontacto: '' });
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        axios.get(`/api/lista_contactos?idcliente=${selectedOption.value}`, { headers })
            .then(res => {
                setContactos(res.data);
                if (res.data.length === 0) {
                    setModalIsOpen(true);
                }
            })
            .catch(error => {
                //console.error('Error al cargar contactos:', error);
                alertify.error("Error al cargar contactos");
            });
    };

    //Actualiza el estado de la cotización con el valor de cada campo cuando estos cambian
    const handleChange = (e) => {
        setCotizacion({ ...cotizacion, [e.target.name]: e.target.value });
    };

    //Envía los datos al back-end para registrar, en el método store.
    const handleSubmit = async (e) => { // Make handleSubmit async
        e.preventDefault();
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const formData = new FormData();

        // Validaciones
        if (!cotizacion.idcliente || cotizacion.idcliente === '') {
            alertify.alert("CAMPO OBLIGATORIO","Debe seleccionar un cliente.");
            return;
        }

        if (!cotizacion.idcontacto || cotizacion.idcontacto === '') {
            alertify.alert("CAMPO OBLIGATORIO","Debe seleccionar un contacto.");
            return;
        }

        if (!cotizacion.idtipopago || cotizacion.idtipopago === '') {
            alertify.alert("CAMPO OBLIGATORIO","Debe seleccionar una forma de pago.");
            return;
        }

        if (!detalles || detalles.length === 0) {
            alertify.alert("CAMPO OBLIGATORIO","Debe asignar registros en el detalle de la cotización.");
            return;
        }

        if (!cotizacion.direccion_entrega || cotizacion.direccion_entrega.trim() === '') {
            alertify.alert("CAMPO OBLIGATORIO","Debe ingresar la dirección de entrega.");
            return;
        }

        // --- VALIDACIÓN DEL DETALLE PARA COSTEAR ---
        const tieneTotalCero = detalles.some(detalle => parseFloat(detalle.total) === 0);
        const costearValue = tieneTotalCero ? 'S' : 'N'; // Guardamos el valor en una constante
        setCotizacion(prevState => ({
            ...prevState,
            costear: costearValue,
        }));

        formData.append('idcliente', cotizacion.idcliente);
        formData.append('idcontacto', cotizacion.idcontacto);
        formData.append('idtipopago', cotizacion.idtipopago);
        formData.append('fecha_cotizacion', cotizacion.fecha_cotizacion);
        formData.append('trabajo', cotizacion.trabajo);
        formData.append('observaciones_costeo', cotizacion.observaciones_costeo);
        formData.append('observaciones_cliente', cotizacion.observaciones_cliente);
        formData.append('direccion_entrega', cotizacion.direccion_entrega);
        formData.append('costear', costearValue);
        formData.append('idcotizacionoriginal', cotizacion.idcotizacionoriginal);
        formData.append('version', cotizacion.version);
        formData.append('total_general', cotizacion.total_general);


        detalles.forEach((detalle, index) => {
            formData.append(`detalles[${index}][unidad_medida]`, detalle.unidad_medida);
            formData.append(`detalles[${index}][descripcion]`, detalle.descripcion);
            formData.append(`detalles[${index}][cantidad]`, detalle.cantidad);
            formData.append(`detalles[${index}][ancho]`, detalle.ancho);
            formData.append(`detalles[${index}][alto]`, detalle.alto);
            formData.append(`detalles[${index}][m2]`, detalle.m2);
            formData.append(`detalles[${index}][profundidad]`, detalle.profundidad);
            formData.append(`detalles[${index}][precio]`, detalle.precio);
            formData.append(`detalles[${index}][total]`, detalle.total);
            if (detalle.imagen) {
                formData.append(`detalles[${index}][imagen]`, detalle.imagen);
            }
        });

        try {
            let res;
            if (id) {
                formData.append('_method', 'PUT'); // Para indicar que es una actualización
                res = await axios.post(`/api/cotizaciones/${id}`, formData, { headers });
                alertify.success("Cotización actualizada correctamente");
            } else {
                res = await axios.post('/api/cotizaciones', formData, { headers });
                alertify.success("Cotización creada correctamente");
            }
            navigate('/cotizaciones/lista');
        } catch (error) {
            //console.error('Error al guardar la cotización:', error);
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
                const nuevosDetalles = [...detalles];
                nuevosDetalles[index] = nuevoDetalle; //detalle;
                setDetalles(nuevosDetalles);
            }
            setDetalleSeleccionado(null);
        } else {
            setDetalles([...detalles, nuevoDetalle]);
            // Llama a calcularPrecioDetalle solo cuando se agrega un nuevo detalle
            calcularPrecioDetalle(nuevoDetalle.cantidad);
        }

        setDetalle({
            unidad_medida: '',
            descripcion: '',
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
    };

    const handleAgregarContacto = () => {
        if (!cotizacion.idcliente || cotizacion.idcliente === '') {
            alertify.error("Debe seleccionar un cliente antes de agregar un contacto.");
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

        alertify.confirm("¿Estás seguro de que deseas quitar este detalle?",
            () => {
                setDetalles(detalles.filter(detalle => detalle !== detalleSeleccionado));
                setDetalleSeleccionado(null);
                setDetalle({
                    unidad_medida: '',
                    descripcion: '',
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
            <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>
                {data}
            </div>
        ),
        1: (data, row) => (
            <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>
                {data}
            </div>
        ),
        2: (data, row) => (
            <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>
                {data}
            </div>
        ),
        3: (data, row) => (
            <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>
                {data}
            </div>
        ),
        4: (data, row) => (
            <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>
                {data}
            </div>
        ),
        5: (data, row) => (
            <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>
                {data}
            </div>
        ),
        6: (data, row) => (
            <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>
                {data}
            </div>
        ),
        7: (data, row) => (
            <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>
                {data}
            </div>
        ),
        8: (data, row) => (
            <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>
                {data}
            </div>
        ),
    };

    //Carga los valores de la fila seleccionada en el DataTable a los inputs correspondientes del detalle.
    const handleRowClick = (rowData) => {
        setDetalleSeleccionado(rowData);
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
            imagen_preview: rowData.imagen_ruta ? `/images_cotizaciones/${rowData.imagen_ruta}` : null,
        });

        if (rowData.imagen_ruta) {
            setSelectedImageUrl(`/images_cotizaciones/${rowData.imagen_ruta}`);
            setIsImageModalOpen(true);
        } else {
            alertify.error("No hay imagen para mostrar");
            setSelectedImageUrl(null);
            setIsImageModalOpen(false); // Asegurarse de que el modal esté cerrado si no hay imagen
        }
    };

    //Se establecen las columnas que se mostrarán en el DataTable
    const columns = [
        { title: 'Unidad Medida', data: 'unidad_medida' },
        { title: 'Descripción', data: 'descripcion' },
        { title: 'Cantidad', data: 'cantidad' },
        { title: 'Ancho', data: 'ancho' },
        { title: 'Alto', data: 'alto' },
        { title: 'M2', data: 'm2' },
        { title: 'Profundidad', data: 'profundidad' },
        { title: 'Precio', data: 'precio' },
        { title: 'Total', data: 'total' },
        {
            title: 'Imagen',
            data: 'imagen_ruta',
            render: (imagen_ruta) => (
                imagen_ruta ? <img src={`/images_cotizaciones/${imagen_ruta}`} alt="Imagen Detalle" style={{ maxWidth: '50px' }} /> : 'Sin imagen'
            ),
        },
    ];

    const handleProductoPredefinidoSeleccionado = (producto) => {
        setProductoPredefinido(producto);
        setDetalle(prevDetalle => ({ // Update precio here too, use callback
            ...prevDetalle,
            unidad_medida: producto.unidad_medida,
            descripcion: producto.titulo,
            ancho: producto.ancho,
            alto: producto.alto,
            profundidad: producto.profundidad,
            precio: producto.precio || 0, // Ensure a numeric fallback
            cantidad: 0
        }));
        calcularPrecioDetalle(0); // Calcular el precio inicial al seleccionar el producto
        toggleProductoPredefinidoModal();
    };

    const handleCantidadDetalleChange = (e) => {
        const value = parseInt(e.target.value, 10) || 0;
        // setCantidadDetalle(value); // This is unnecessary in this setup!
        setDetalle(prevDetalle => ({
            ...prevDetalle,
            cantidad: value,
        }));
        //calcularPrecioDetalle(value); // This calls calcularPrecioDetalle with new quantity
    };

    const calcularPrecioDetalle = (cantidad) => {
        let nuevoPrecio = 0;

        if (!productoPredefinido) {
            return; // Prevent errors if productoPredefinido is not yet loaded
        }

        if (productoPredefinido.variacion === '0' || productoPredefinido.variacion === false) { // Handle string '0' or boolean
            nuevoPrecio = parseFloat(productoPredefinido.precio) || 0;
        } else if (productoPredefinido.variacion === '1' || productoPredefinido.variacion === true) { // Handle string '1' or boolean
            if (cantidad > 0 && cantidad <= productoPredefinido.cantidad_uno) {
                nuevoPrecio = parseFloat(productoPredefinido.precio_uno) || 0;
            } else if (productoPredefinido.cantidad_dos > 0 && cantidad > productoPredefinido.cantidad_uno && cantidad <= productoPredefinido.cantidad_dos) {
                nuevoPrecio = parseFloat(productoPredefinido.precio_dos) || 0;
            } else if (productoPredefinido.cantidad_tres > 0 && cantidad > productoPredefinido.cantidad_dos && cantidad <= productoPredefinido.cantidad_tres) {
                nuevoPrecio = parseFloat(productoPredefinido.precio_tres) || 0;
            } else if (productoPredefinido.cantidad_cuatro > 0 && cantidad > productoPredefinido.cantidad_tres) {
                nuevoPrecio = parseFloat(productoPredefinido.precio_cuatro) || 0;
            } else {
                nuevoPrecio = cantidad * parseFloat(productoPredefinido.precio) || 0;  // Default price when no range matches 
            }
        }

        // Check if the calculated price is valid, else fallback to a default (0)
        if (isNaN(nuevoPrecio)) {
            nuevoPrecio = 0;
        }

        setDetalle(prevDetalle => ({
            ...prevDetalle,
            precio: parseFloat(nuevoPrecio.toFixed(2)) || 0, // Ensure valid number
        }));
    };

    const limpiarCampos = () => {
        setCotizacion({
            idcotizacion: 0,
            idcotizacionoriginal: 0,
            idcliente: '',
            cliente: '',
            idcontacto: 0,
            contacto: '',
            fecha_cotizacion: fechaActual,
            trabajo: '',
            observaciones_costeo: '',
            observaciones_cliente: '',
            total_general: 0,
            costeo_observaciones: '',
            nocotizacion: '',
            version: 1,
            idtipopago: '',
            direccion_entrega: '',
        });
        setDetalles([]);
        setDetalle({
            unidad_medida: '',
            descripcion: '',
            cantidad: 0,
            ancho: 0,
            alto: 0,
            m2: 0,
            profundidad: 0,
            precio: 0,
            total: 0,
        });
    }

    return (
        <div className='mt-4 mb-4'>
            <Header title={id ? 'Editar Cotización' : 'Crear Nueva Cotización'} />
            <div className="card shadow p-4">
                {/* <div className="card-header bg-primary text-white">
                    <h4 className="mb-0">{id ? 'Editar Cotización' : 'Crear Nueva Cotización'}</h4>
                </div> */}
                <div className="card-body">
                    <form onSubmit={handleSubmit} encType="multipart/form-data">
                        {/* --- Sección Cliente/Contacto/Pago --- */}
                        <div className='row g-2 mb-3'>
                            <div className='col-md-6'>
                                <label className='form-label'>Cliente</label>
                                <Select
                                    value={clienteOptions.find(option => option.value === cotizacion.idcliente)}
                                    onChange={handleClienteChange}
                                    options={clienteOptions}
                                    isSearchable={true}
                                    placeholder="Seleccionar Cliente"
                                    className='form-select form-select-sm campo-obligatorio-fondo'
                                />
                            </div>
                            <div className='col-md-6'>
                                <label className='form-label'>Contacto</label>
                                <select name="idcontacto" value={cotizacion.idcontacto} onChange={handleChange} className='form-select form-select-sm campo-obligatorio-fondo' disabled={!clienteId}>
                                    <option value="">Seleccionar Contacto</option>
                                    {contactos.map(contacto => (
                                        <option key={contacto.id_contactocliente} value={contacto.id_contactocliente}>
                                            {contacto.nombre}
                                        </option>
                                    ))}
                                </select>
                                <button type="button" className="btn btn-link btn-sm" onClick={handleAgregarContacto}
                                    style={{
                                        textDecoration: 'none',
                                        color: '#007bff',
                                        cursor: 'pointer',
                                    }}>
                                    Agregar Contacto
                                </button>
                            </div>
                        </div>
                        <div className='row g-2 mb-3'>
                            <div className='col-md-4'>
                                <label className='form-label'>Forma pago</label>
                                <select name="idtipopago" value={cotizacion.idtipopago} onChange={handleChange} className='form-select form-select-sm campo-obligatorio-fondo'>
                                    <option value="">Seleccionar forma de pago</option>
                                    {tiposPago.map(tipoPago => (
                                        <option key={tipoPago.idtipopago} value={tipoPago.idtipopago}>
                                            {tipoPago.tipo}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='col-md-3'>
                                <label className='form-label'>Fecha cotizacion</label>
                                <input type="date" name="fecha_cotizacion" value={cotizacion.fecha_cotizacion} onChange={handleChange} placeholder="Fecha cotización" className='form-control form-control-sm' required />
                            </div>
                            <div className='col-md-5'>
                                <label className='form-label'>Trabajo</label>
                                <input type="text" name="trabajo" value={cotizacion.trabajo} onChange={handleChange} placeholder="Nombre del trabajo o proyecto" className='form-control form-control-sm' />
                            </div>
                        </div>
                        <div className='row g-2 mb-4'>
                            <div className='col-md-12'>
                                <label className='form-label'>Dirección entrega</label>
                                <input type="text" name="direccion_entrega" value={cotizacion.direccion_entrega} onChange={handleChange} placeholder="Dirección de entrega" className='form-control form-control-sm campo-obligatorio-fondo' />
                            </div>
                        </div>

                        {/* --- Sección Detalle de Cotización --- */}
                        <h5 className="mt-4 mb-3 border-bottom pb-2 campo-obligatorio-fondo">Agregar Detalle</h5>

                        <div className='row g-1 mb-2'>
                            <div className='col-md-4'>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={toggleProductoPredefinidoModal}>
                                    Seleccionar Producto Predefinido
                                </button>
                            </div>
                        </div>
                        <div className='row g-3 mb-2'>
                            {/* Este bloque va aquí, después del botón */}
                            <div className='col-md-2'>
                                <label className='form-label'>Unidad Medida</label>
                                <select name="unidad_medida" value={detalle.unidad_medida} onChange={handleDetalleChange} className='form-select form-select-sm'>
                                    <option value="">Seleccionar</option>
                                    {unidadesMedida.map(um => (
                                        <option key={um.idunidadmedida} value={um.unidad}>
                                            {um.unidad}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className='col-md-1'>
                                <label className='form-label'>Cantidad</label>
                                <input
                                    type="number"
                                    name="cantidad"
                                    value={detalle.cantidad}
                                    onChange={handleCantidadDetalleChange} // <-- Use this!!!
                                    className='form-control form-control-sm'
                                    step="1"
                                    min="0"
                                />
                            </div>
                            <div className='col-md-9'>
                                <label className='form-label'>Descripción</label>
                                <textarea rows="1" name="descripcion" value={detalle.descripcion} onChange={handleDetalleChange} className='form-control form-control-sm'></textarea>
                            </div>
                        </div>

                        {/* Fila 2: Medidas, Precio, Total y Botón Agregar */}
                        <div className='row g-2 align-items-end mb-3'>
                            <div className='col'>
                                <label className='form-label'>Ancho</label>
                                <input type="number" name="ancho" value={detalle.ancho} onChange={handleDetalleChange} className='form-control form-control-sm' step="any" min="0" />
                            </div>
                            <div className='col'>
                                <label className='form-label'>Alto</label>
                                <input type="number" name="alto" value={detalle.alto} onChange={handleDetalleChange} className='form-control form-control-sm' step="any" min="0" />
                            </div>
                            <div className='col'>
                                <label className='form-label'>M2</label>
                                <input type="number" name="m2" value={detalle.m2} onChange={handleDetalleChange} className='form-control form-control-sm' step="any" min="0" />
                            </div>
                            <div className='col'>
                                <label className='form-label'>Prof.</label>
                                <input type="number" name="profundidad" value={detalle.profundidad} onChange={handleDetalleChange} className='form-control form-control-sm' step="any" min="0" />
                            </div>
                            <div className='col'>
                                <label className='form-label'>Precio</label>
                                <input
                                    type="number"
                                    name="precio"
                                    value={detalle.precio}
                                    onChange={handleDetalleChange}
                                    className='form-control form-control-sm'
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            <div className='col'>
                                <label className='form-label'>Total</label>
                                <input
                                    type="number"
                                    name="total"
                                    value={detalle.total}
                                    className='form-control form-control-sm'
                                    readOnly
                                    step="0.01"
                                />
                            </div>
                            <div className='col-md-3'>
                                <label className='form-label fw-bold'>Imagen (Opcional)</label>
                                <input type="file" name="imagen" className='form-control form-control-sm' onChange={handleImagenChange} />
                                {detalle.imagen_preview && (
                                    <img src={detalle.imagen_preview} alt="Vista previa" style={{ maxWidth: '50px', marginTop: '5px' }} />
                                )}
                            </div>
                            <div className='col-auto'>
                                <button type="button" onClick={handleAddDetalle} className={detalleSeleccionado ? 'btn btn-primary btn-sm' : 'btn btn-success btn-sm'}>
                                    {detalleSeleccionado ? 'Actualizar Detalle' : 'Agregar Detalle'}
                                </button>
                                <button type="button" onClick={handleQuitarDetalle} className='btn btn-danger btn-sm ms-2'>Quitar</button>
                            </div>
                        </div>

                        {/* --- Tabla de Detalles Agregados --- */}
                        <h5 className="mt-4 mb-3 border-bottom pb-2">Detalles Agregados</h5>
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
                            <label className="form-label fw-bold me-2" style={{ alignSelf: 'center' }}>Total General:</label>
                            <input
                                type="number"
                                name="total_general"
                                value={cotizacion.total_general}
                                readOnly
                                className="form-control"
                                style={{
                                    maxWidth: '150px',
                                    textAlign: 'right',
                                    fontWeight: 'bold',
                                    fontSize: '1.1em',
                                }}
                            />
                        </div>
                        {/* --- Sección Observaciones --- */}
                        <div className='row g-2 mb-3'>
                            <div className='col-md-6'>
                                <label className='form-label'>Observaciones cliente</label>
                                <textarea rows="3" name="observaciones_cliente" value={cotizacion.observaciones_cliente} onChange={handleChange} placeholder="Observaciones para cliente" className='form-control form-control-sm'></textarea>
                            </div>
                            <div className='col-md-6'>
                                <label className='form-label'>Observaciones costeo (Internas)</label>
                                <textarea rows="3" name="observaciones_costeo" value={cotizacion.observaciones_costeo} onChange={handleChange} placeholder="Observaciones internas para costeo" className='form-control form-control-sm'></textarea>
                            </div>
                        </div>

                        {/* --- Botones de Acción --- */}
                        {/* <div className='d-flex justify-content-between mt-4 flex-wrap'>
                            <button type="submit" className='btn btn-primary btn-sm w-auto me-2 mb-2'>
                                {id ? 'ACTUALIZAR' : 'GUARDAR'}
                            </button>
                            <div className='d-flex gap-2'>
                                <div>
                                    <Link to="/cotizaciones/lista" className="btn btn-success btn-sm w-100 mb-2">CONSULTA</Link>
                                </div>
                                <div>
                                    <Link to="/Home" className="btn btn-secondary btn-sm w-100 mb-2">INICIO</Link>
                                </div>
                            </div>
                        </div> */}

                        <div
                            className="mt-4 p-3 border rounded shadow-sm bg-light"
                            style={{ borderColor: "#ddd" }}
                        >
                            <div className="d-flex flex-wrap gap-2 justify-content-between">
                                <button
                                    type="submit"
                                    className="btn btn-primary d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px" }}
                                >
                                    <FaSave /> {id ? 'ACTUALIZAR' : 'GUARDAR'}
                                </button>
                                <button
                                    type="button" // Importante: no es un botón de submit
                                    className="btn btn-light d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px", color: "#000", border: "1px solid #ccc" }}
                                    onClick={limpiarCampos} // Asocia la función al evento onClick
                                >
                                    <FaBroom /> {/* Puedes usar otro icono como FaBroom */} Limpiar
                                </button>
                                <Link
                                    to="/cotizaciones/lista"
                                    className="btn btn-success d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px" }}
                                >
                                    <FaSearch /> Consultar
                                </Link>
                            </div>
                        </div>
                        {/* Modal para ContactoClienteForm */}
                        <Modal isOpen={modalIsOpen} toggle={toggleModal} centered size='xl'>
                            <ModalHeader toggle={toggleModal}>
                                Crear Nuevo Contacto
                            </ModalHeader>
                            <ModalBody>
                                <ContactoClienteForm clienteId={clienteId} onClose={toggleModal} onContactCreated={handleContactCreated} />
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
                            onProductoSeleccionado={handleProductoPredefinidoSeleccionado}
                        />
                        {/* Modal para mostrar la imagen del detalle */}
                        <Modal isOpen={isImageModalOpen} toggle={toggleImageModal} centered size="lg">
                            <ModalHeader toggle={toggleImageModal}>
                                Imagen del Detalle
                            </ModalHeader>
                            <ModalBody>
                                {selectedImageUrl ? (
                                    <img src={selectedImageUrl} alt="Imagen del Detalle" style={{ maxWidth: '100%', height: 'auto' }} />
                                ) : (
                                    <p>Este detalle no tiene una imagen asociada.</p>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <Button color="secondary" onClick={toggleImageModal}>Cerrar</Button>
                            </ModalFooter>
                        </Modal>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CotizacionForm;