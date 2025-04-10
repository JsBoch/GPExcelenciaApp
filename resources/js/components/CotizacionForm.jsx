import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link, useParams, useNavigate } from 'react-router-dom';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.min.css';
import 'alertifyjs/build/css/themes/default.min.css';
import Select from 'react-select'; //react-select para autocompletar
//Para abrir el formulario de contactos de forma modal
import ContactoClienteForm from './ContactoClienteForm'; // Importa el formulario
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from 'reactstrap'; // Importa componentes de Reactstrap para el modal
import 'bootstrap/dist/css/bootstrap.min.css';

DataTable.use(DT);

function CotizacionForm() {
    const fechaActual = new Date().toISOString().split("T")[0];
    const { id } = useParams();
    const navigate = useNavigate();
    const [tiposPago, setTiposPago] = useState([]);
    const [unidadesMedida, setUnidadesMedida] = useState([]);
    const [contactos, setContactos] = useState([]);
    const [clienteId, setClienteId] = useState(''); // Estado para el id del departamento seleccionado
    const [detalles, setDetalles] = useState([]); // Estado para almacenar los datos del datatable
    const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
    const [clienteOptions, setClienteOptions] = useState([]); // Nuevo estado para opciones de react-select  
    //Para abrir los contactos de forma modal
    const [modalIsOpen, setModalIsOpen] = useState(false); // Estado para controlar la visibilidad del modal
    const toggleModal = () => setModalIsOpen(!modalIsOpen); // Función para abrir/cerrar el modal  


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
    });

    const loadContactos = () => {  // Función para cargar los contactos
        if (clienteId) {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            axios.get(`/api/lista_contactos?idcliente=${clienteId}`, { headers })
                .then(res => setContactos(res.data))
                .catch(error => console.error('Error al cargar contactos:', error));
        } else {
            setContactos([]);
        }
    };

    const handleContactCreated = (newContact) => {  // Función llamada desde el modal
        loadContactos();  // Recarga la lista
    };

    //Se utiliza para cargar los datos de la cotización y el detalle si es una edición, y se cargan las listas desplegables si es un nuevo empleado
    //Si no es una edición, solo carga las listas de los select.
    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        if (id) {
            axios.get(`/api/cotizaciones/${id}`, { headers })
                .then(res => {
                    const data = res.data;
                    let formattedDate = '';
                    if (data.fecha_cotizacion) {
                        formattedDate = data.fecha_cotizacion.split(' ')[0]; // Obtiene solo la parte de la fecha
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

                    // Cargar listas desplegables después de cargar los datos del empleado
                    // axios.get('/api/lista_clientes', { headers }).then(res => setClientes(res.data));
                    axios.get('/api/lista_tipospago', { headers }).then(res => setTiposPago(res.data));
                    axios.get('/api/lista_unidadesmedida', { headers }).then(res => setUnidadesMedida(res.data));
                    if (data.idcliente) {
                        // Setea el clienteId también para que el segundo useEffect se dispare correctamente al editar
                        setClienteId(data.idcliente);
                        axios.get(`/api/lista_contactos?idcliente=${data.idcliente}`, { headers }).then(res => setContactos(res.data));
                    } else {
                        setContactos([]);
                    }

                    // Cargar detalles de la cotización
                    if (data.detalles) {
                        setDetalles(data.detalles);
                    }
                })
                .catch(error => console.error('Error al cargar las cotizaciones:', error));
        } else {
            // Cargar listas desplegables para crear un nuevo empleado            
            axios.get('/api/lista_tipospago', { headers }).then(res => setTiposPago(res.data));
            axios.get('/api/lista_unidadesmedida', { headers }).then(res => setUnidadesMedida(res.data));
            // No cargamos contactos aquí inicialmente, esperamos a que se seleccione un cliente
            setContactos([]); // Asegurarse que contactos esté vacío al crear
        }
    }, [id]); //solo depende de Id para la carga inicial

    useEffect(() => {
        loadContactos(); // Carga la lista inicialmente y cuando cambia clienteId
    }, [clienteId]);

    // useEffect para cargar contactos cuando cambia clienteId
    useEffect(() => {
        if (clienteId) {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            axios.get(`/api/lista_contactos?idcliente=${clienteId}`, { headers })
                .then(res => setContactos(res.data))
                .catch(error => console.error('Error al cargar contactos:', error));
        } else {
            setContactos([]); // Limpia contactos si no hay cliente seleccionado
        }
    }, [clienteId]); // Se ejecuta solo cuando cambia clienteId

    //Calcular el total del detalle ---
    useEffect(() => {
        const cantidadNum = parseFloat(detalle.cantidad) || 0; // Convierte a número, si es inválido o vacío, usa 0
        const precioNum = parseFloat(detalle.precio) || 0;

        const totalCalculado = (cantidadNum * precioNum).toFixed(2); //2 decimales 

        // Actualiza el estado 'detalle' solo con el nuevo total
        // Usamos el callback para asegurar que no perdemos otros datos del detalle
        setDetalle(prevDetalle => ({
            ...prevDetalle,
            total: totalCalculado
        }));

    }, [detalle.cantidad, detalle.precio]); // Se ejecuta cada vez que cantidad o precio cambien
    // --------------------------------------------------------

    // --- Calcula los m2 del detalle ---
    useEffect(() => {
        const anchoNum = parseFloat(detalle.ancho) || 0;
        const altoNum = parseFloat(detalle.alto) || 0;

        const m2Calculado = (anchoNum * altoNum).toFixed(2);

        setDetalle(prevDetalle => ({
            ...prevDetalle,
            m2: m2Calculado
        }));
    }, [detalle.ancho, detalle.alto]); // Se ejecuta cuando ancho o alto cambian
    // ----------------------------------------------------

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
            .catch(error => console.error('Error al cargar clientes:', error));
    }, []);

    const handleClienteChange = (selectedOption) => {
        setClienteId(selectedOption.value);
        setCotizacion({ ...cotizacion, idcliente: selectedOption.value, idcontacto: '' });
        //cambio para el model de contactos
        // Comprueba si el cliente tiene contactos y abre el modal si no tiene
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        axios.get(`/api/lista_contactos?idcliente=${selectedOption.value}`, { headers })
            .then(res => {
                setContactos(res.data);
                if (res.data.length === 0) {
                    setModalIsOpen(true); // Abre el modal si no hay contactos
                }
            })
            .catch(error => {
                console.error('Error al cargar contactos:', error)
                alertify.error("Error al cargar contactos");
            });
    };

    //Actualiza el estado de la cotización con el valor de cada campo cuando estos cambian
    const handleChange = (e) => {
        setCotizacion({ ...cotizacion, [e.target.name]: e.target.value });
    };

    //Envía los datos al back-end para registrar, en el método store.
    const handleSubmit = (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Determine 'costear' based on detalles
        let shouldCostear = 'N';
        for (const item of detalles) {
            if (parseFloat(item.total) === 0) {
                shouldCostear = 'S';
                break;
            }
        }

        const dataToSend = {
            ...cotizacion,
            detalles: detalles, // Incluye los detalles aquí
            costear: shouldCostear,
        };

        if (id) {
            // Editar cliente existente (solicitud PUT) cotizacion
            axios.put(`/api/cotizaciones/${id}`, dataToSend, { headers })
                .then(res => {
                    //console.log('Cotización actualizada:', res.data);
                    alertify.success("Cotización actualizada correctamente");
                    navigate('/cotizaciones/lista'); // Redirige a la lista
                })
                .catch(error => {
                    console.error('Error al actualizar la cotización:', error)
                    alertify.error("Error al actualizar la cotización");
                });
        } else {
            // Crear nuevo empleado (solicitud POST)cotizacion
            axios.post('/api/cotizaciones', dataToSend, { headers })
                .then(res => {
                    //console.log('Cotización creada:', res.data);
                    alertify.success("Cotización creada correctamente");
                    navigate('/cotizaciones/lista'); // Redirige a la lista
                })
                .catch(error => {
                    console.error('Error al crear empleado:', error)
                    alertify.error("Error al crear la cotización");
                });
        }
    };

    //Para cargar el detalle de la cotización
    const handleDetalleChange = (e) => {
        setDetalle({ ...detalle, [e.target.name]: e.target.value });
    };

    //Agregar los datos del detalle al DataTable
    const handleAddDetalle = () => {
        if (detalleSeleccionado) {
            const index = detalles.findIndex((d) => d === detalleSeleccionado);
            if (index !== -1) {
                const nuevosDetalles = [...detalles];
                nuevosDetalles[index] = detalle;
                setDetalles(nuevosDetalles);
            }
            setDetalleSeleccionado(null);
        } else {
            setDetalles([...detalles, detalle]);
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
        });
    };

    //Quitar el detalle seleccionado del DataTable
    const handleQuitarDetalle = () => {
        if (!detalleSeleccionado) {
            alertify.error("Por favor, selecciona un detalle para quitar.");
            return;
        }

        alertify.confirm("¿Estás seguro de que deseas quitar este detalle?",
            () => { // Función para "Aceptar"
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
                });
                alertify.success("Detalle eliminado.");
            },
            () => { // Función para "Cancelar"
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

    //Carla los valores de la fila seleccionada en el DataTable a los inputs correspondientes del detalle.
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
        });
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
    ];
    /************************************************** */
    return (
        <div className='container mt-4'>
            <div className="card shadow p-4">
                <div className="card-header bg-primary text-white">
                    {/* Cambia el título según si editas o creas */}
                    <h4 className="mb-0">{id ? 'Editar Cotización' : 'Crear Nueva Cotización'}</h4>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit} encType="multipart/form-data">
                        {/* --- Sección Cliente/Contacto/Pago --- */}
                        <div className='row g-2 mb-3'> {/* Añadido mb-3 para separar secciones */}
                            <div className='col-md-6'>
                                <label className='form-label fw-bold'>Cliente</label>
                                <Select
                                    value={clienteOptions.find(option => option.value === cotizacion.idcliente)}
                                    onChange={handleClienteChange}
                                    options={clienteOptions}
                                    isSearchable={true} // Habilita la búsqueda
                                    placeholder="Seleccionar Cliente"
                                />
                                <button type="button" className="btn btn-link btn-sm" onClick={toggleModal}>
                                    Agregar Contacto
                                </button>
                            </div>
                            <div className='col-md-6'>
                                <label className='form-label fw-bold'>Contacto</label>
                                <select name="idcontacto" value={cotizacion.idcontacto} onChange={handleChange} className='form-select form-select-sm' disabled={!clienteId}> {/* Deshabilitado si no hay cliente */}
                                    <option value="">Seleccionar Contacto</option>
                                    {contactos.map(contacto => (
                                        <option key={contacto.id_contactocliente} value={contacto.id_contactocliente}>
                                            {contacto.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className='row g-2 mb-3'>
                            <div className='col-md-4'>
                                <label className='form-label fw-bold'>Forma pago</label>
                                <select name="idtipopago" value={cotizacion.idtipopago} onChange={handleChange} className='form-select form-select-sm'>
                                    <option value="">Seleccionar forma de pago</option>
                                    {tiposPago.map(tipoPago => (
                                        <option key={tipoPago.idtipopago} value={tipoPago.idtipopago}>
                                            {tipoPago.tipo}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='col-md-3'> {/* Ajustado tamaño */}
                                <label className='form-label fw-bold'>Fecha cotizacion</label>
                                <input type="date" name="fecha_cotizacion" value={cotizacion.fecha_cotizacion} onChange={handleChange} placeholder="Fecha cotización" className='form-control form-control-sm' required />
                            </div>
                            <div className='col-md-5'> {/* Ajustado tamaño */}
                                <label className='form-label fw-bold'>Trabajo</label>
                                <input type="text" name="trabajo" value={cotizacion.trabajo} onChange={handleChange} placeholder="Nombre del trabajo o proyecto" className='form-control form-control-sm' />
                            </div>
                        </div>
                        <div className='row g-2 mb-4'> {/* Añadido mb-4 para separar de la sección detalle */}
                            <div className='col-md-12'> {/* Ocupa todo el ancho */}
                                <label className='form-label fw-bold'>Dirección entrega</label>
                                <input type="text" name="direccion_entrega" value={cotizacion.direccion_entrega} onChange={handleChange} placeholder="Dirección de entrega" className='form-control form-control-sm' />
                            </div>
                        </div>

                        {/* --- Sección Detalle de Cotización --- */}
                        <h5 className="mt-4 mb-3 border-bottom pb-2">Agregar Detalle</h5> {/* Título para la sección */}

                        {/* Fila 1: Unidad Medida, Cantidad, Descripción */}
                        <div className='row g-2 mb-2'>
                            <div className='col-md-2'>
                                <label className='form-label fw-bold'>Unidad Medida</label>
                                {/* Ejemplo usando un select si tienes la lista unidadesMedida */}
                                <select name="unidad_medida" value={detalle.unidad_medida} onChange={handleDetalleChange} className='form-select form-select-sm'>
                                    <option value="">Seleccionar</option>
                                    {unidadesMedida.map(um => (
                                        <option key={um.idunidadmedida} value={um.unidad}> {/* Asumiendo que quieres guardar la descripción */}
                                            {um.unidad}
                                        </option>
                                    ))}
                                </select>
                                {/* O si prefieres input de texto:
                                <input type="text" name="unidad_medida" value={detalle.unidad_medida} onChange={handleDetalleChange} className='form-control form-control-sm' />
                                */}
                            </div>
                            <div className='col-md-1'>
                                <label className='form-label fw-bold'>Cantidad</label>
                                <input
                                    type="number"
                                    name="cantidad"
                                    value={detalle.cantidad}
                                    onChange={handleDetalleChange}
                                    className='form-control form-control-sm'
                                    step="any" // Permite decimales si es necesario
                                    min="0"    // Evita cantidades negativas
                                />
                            </div>
                            <div className='col-md-9'> {/* Ajusta el tamaño según necesites */}
                                <label className='form-label fw-bold'>Descripción</label>
                                {/* Usar textarea para descripciones más largas */}
                                <textarea rows="1" name="descripcion" value={detalle.descripcion} onChange={handleDetalleChange} className='form-control form-control-sm'></textarea>
                            </div>
                        </div>

                        {/* Fila 2: Medidas, Precio, Total y Botón Agregar */}
                        <div className='row g-2 align-items-end mb-3'> {/* align-items-end para alinear el botón */}
                            <div className='col'>
                                <label className='form-label fw-bold'>Ancho</label>
                                <input type="number" name="ancho" value={detalle.ancho} onChange={handleDetalleChange} className='form-control form-control-sm' step="any" min="0" />
                            </div>
                            <div className='col'>
                                <label className='form-label fw-bold'>Alto</label>
                                <input type="number" name="alto" value={detalle.alto} onChange={handleDetalleChange} className='form-control form-control-sm' step="any" min="0" />
                            </div>
                            <div className='col'>
                                <label className='form-label fw-bold'>M2</label>
                                <input type="number" name="m2" value={detalle.m2} onChange={handleDetalleChange} className='form-control form-control-sm' step="any" min="0" />
                            </div>
                            <div className='col'>
                                <label className='form-label fw-bold'>Prof.</label> {/* Abreviado */}
                                <input type="number" name="profundidad" value={detalle.profundidad} onChange={handleDetalleChange} className='form-control form-control-sm' step="any" min="0" />
                            </div>
                            <div className='col'>
                                <label className='form-label fw-bold'>Precio</label>
                                <input
                                    type="number"
                                    name="precio"
                                    value={detalle.precio}
                                    onChange={handleDetalleChange}
                                    className='form-control form-control-sm'
                                    step="0.01" // Para precios con centavos
                                    min="0"
                                />
                            </div>
                            <div className='col'>
                                <label className='form-label fw-bold'>Total</label>
                                <input
                                    type="number"
                                    name="total"
                                    value={detalle.total} // Muestra el total calculado
                                    // onChange={handleDetalleChange} // Quita el onChange si es de solo lectura
                                    className='form-control form-control-sm'
                                    readOnly // Hace el campo no editable por el usuario
                                    step="0.01"
                                />
                            </div>
                            <div className='col-auto'> {/* col-auto para que ocupe solo el espacio necesario */}
                                <button type="button" onClick={handleAddDetalle} className={detalleSeleccionado ? 'btn btn-primary btn-sm' : 'btn btn-success btn-sm'}>{detalleSeleccionado ? 'Actualizar Detalle' : 'Agregar Detalle'}</button>
                                <button type="button" onClick={handleQuitarDetalle} className='btn btn-danger btn-sm ms-2'>Quitar</button>
                            </div>
                        </div>


                        {/* --- Tabla de Detalles Agregados --- */}
                        <h5 className="mt-4 mb-3 border-bottom pb-2">Detalles Agregados</h5>
                        <div className="table-responsive mb-4"> {/* Añadido mb-4 */}
                            <DataTable
                                data={detalles}
                                columns={columns}
                                options={{
                                    paging: false,
                                    searching: false,
                                    info: false, // Oculta "Showing 1 to X of Y entries"
                                    ordering: true, // Deshabilita el ordenamiento si no lo necesitas
                                }}
                                slots={slots}
                                className="table table-striped table-bordered table-hover table-sm" // Añadido table-hover y table-sm
                                id="tabla-detalles" // Añade un id por si necesitas referenciarla
                            >
                                {/* No es necesario definir thead aquí si usas 'columns' */}
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

                        {/* --- Sección Observaciones --- */}
                        <div className='row g-2 mb-3'>
                            <div className='col-md-6'>
                                <label className='form-label fw-bold'>Observaciones cliente</label>
                                <textarea rows="3" name="observaciones_cliente" value={cotizacion.observaciones_cliente} onChange={handleChange} placeholder="Observaciones para cliente" className='form-control form-control-sm'></textarea>
                            </div>
                            <div className='col-md-6'>
                                <label className='form-label fw-bold'>Observaciones costeo (Internas)</label>
                                <textarea rows="3" name="observaciones_costeo" value={cotizacion.observaciones_costeo} onChange={handleChange} placeholder="Observaciones internas para costeo" className='form-control form-control-sm'></textarea>
                            </div>
                        </div>

                        {/* --- Botones de Acción --- */}
                        <div className='d-flex justify-content-between mt-4'>
                            <button type="submit" className='btn btn-primary btn-sm w-25'>
                                {id ? 'Actualizar Cotización' : 'Guardar Cotización'}
                            </button>
                            <div style={{ display: 'flex', width: '25%', gap: '10px' }}>
                                <div style={{ width: '50%' }}>
                                    <Link to="/cotizaciones/lista" className="btn btn-success btn-sm" style={{ width: '100%' }}>CONSULTA</Link>
                                </div>
                                <div style={{ width: '50%' }}>
                                    <Link to="/Home" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>INICIO</Link> {/* Estilo diferente para volver */}
                                </div>
                            </div>
                        </div>

                        {/* Modal para ContactoClienteForm */}
                        <Modal isOpen={modalIsOpen} toggle={toggleModal} centered>
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
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CotizacionForm;