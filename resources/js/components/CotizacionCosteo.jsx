import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import 'bootstrap/dist/css/bootstrap.min.css';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.min.css';
import 'alertifyjs/build/css/themes/default.min.css';
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from 'reactstrap'; // Importa los componentes de reactstrap

DataTable.use(DT);

function CotizacionCosteo() {
    const fechaActual = new Date().toISOString().split("T")[0];
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); // Obtiene la información de la ruta actual     
    const [detalles, setDetalles] = useState([]); // Estado para almacenar los datos del datatable
    const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);

    // Obtén los valores de location.state ANTES de declarar el estado
    const initialObservacionesCliente = location.state?.observaciones_cliente || '';
    const initialObservacionesCosteo = location.state?.observaciones_costeo || '';

    const [archivoExcel, setArchivoExcel] = useState(null);

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
        observaciones_costeo: initialObservacionesCosteo,
        observaciones_cliente: initialObservacionesCliente,
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

    // Estados para controlar el modal de la imagen
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);

    const toggleImageModal = () => setIsImageModalOpen(!isImageModalOpen);
    //Actualiza el estado de la cotización con el valor de cada campo cuando estos cambian
    const handleChange = (e) => {
        setCotizacion({ ...cotizacion, [e.target.name]: e.target.value });
    };

    //Envía los datos al back-end para registrar, en el método store.
    const handleSubmit = (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const formData = new FormData();

        // const dataToSend = {
        //     ...cotizacion,
        //     detalles: detalles, // Incluye los detalles aquí            
        // };
        // Agrega los datos de la cotización al FormData
    for (const key in cotizacion) {
        formData.append(key, cotizacion[key]);
    }

    // Agrega los detalles como un string JSON
    formData.append('detalles', JSON.stringify(detalles));

    // Agrega el archivo Excel si existe
    if (archivoExcel) {
        formData.append('archivo_costeo', archivoExcel);
    }

    if (id) {
        // Editar cotización (usando FormData para enviar archivos)
        axios.post(`/api/costeocotizaciones/${id}?_method=PUT`, formData, { headers, 'Content-Type': 'multipart/form-data' })
            .then(res => {
                alertify.success("Cotización actualizada correctamente");
                navigate('/costeocotizaciones/lista');
            })
            .catch(error => {
                console.error('Error al actualizar la cotización:', error);
                alertify.error("Error al actualizar la cotización");
            });
    } else {
        // Crear nueva cotización (usando FormData para enviar archivos)
        axios.post('/api/cotizaciones', formData, { headers, 'Content-Type': 'multipart/form-data' })
            .then(res => {
                alertify.success("Cotización creada correctamente");
                navigate('/cotizaciones/lista');
            })
            .catch(error => {
                console.error('Error al crear la cotización:', error);
                alertify.error("Error al crear la cotización");
            });
    }        
    };

    //Para cargar el detalle de la cotización
    const handleDetalleChange = (e) => {
        setDetalle({ ...detalle, [e.target.name]: e.target.value });
    };

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

    }, [detalle.precio]); // Se ejecuta cada vez que cantidad o precio cambien
    // --------------------------------------------------------
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

    //agregado 20250406
    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        if (id) {
            axios.get(`/api/costeocotizaciones/${id}`, { headers })
                .then(res => {
                    const cotizacionData = res.data;
                    setCotizacion({
                        ...cotizacionData,
                        observaciones_cliente: cotizacionData.observaciones_cliente || '',
                        observaciones_costeo: cotizacionData.observaciones_costeo || '',
                        costeo_observaciones: cotizacionData.costeo_observaciones || '',
                    });
                    //Carga detalles desde la cotización existente
                    setDetalles(cotizacionData.detalles);
                    //console.log('Datos de detalles:', cotizacionData.detalles); // <--- Aquí
                })
                .catch(error => {
                    console.error('Error al obtener la cotización:', error);
                    alertify.error("Error al obtener la cotización");
                });
        }
    }, [id]);

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
            unidad_medida: rowData.unidad_medida || '', // Usar cadena vacía si es null
            descripcion: rowData.descripcion || '',
            cantidad: rowData.cantidad || 0, // Usar 0 si es null (si aplica)
            ancho: rowData.ancho || 0,
            alto: rowData.alto || 0,
            m2: rowData.m2 || 0,
            profundidad: rowData.profundidad || 0,
            precio: rowData.precio || 0,
            total: rowData.total || 0,
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

    // Función para abrir el modal y mostrar la imagen
    // const handleVerImagen = (detalle) => {
    //     console.log('Detalle en handleVerImagen:', detalle); // <--- Aquí
    //     if (detalle.imagen_ruta) {
    //         setSelectedImageUrl(`/images_cotizaciones/${detalle.imagen_ruta}`);
    //         setIsImageModalOpen(true);
    //     } else {
    //         setSelectedImageUrl(null);
    //         setIsImageModalOpen(false);
    //         alertify.warning('Este detalle no tiene una imagen asociada.');
    //     }
    // };

    /************************************************** */
    return (
        <div className='container mt-4'>
            <div className="card shadow p-4">
                <div className="card-header bg-primary text-white">
                    {/* Cambia el título según si editas o creas */}
                    <h4 className="mb-0">Costeo de Cotización</h4>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit} encType="multipart/form-data">
                        {/* --- Sección Detalle de Cotización --- */}
                        <h5 className="mt-4 mb-3 border-bottom pb-2">Agregar Detalle</h5> {/* Título para la sección */}
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
                        {/* Fila 2: Medidas, Precio, Total y Botón Agregar */}
                        <div className='row g-2 align-items-end mb-3'> {/* align-items-end para alinear el botón */}
                            <div className='col'>
                                <label className='form-label fw-bold'>precio</label>
                                <input
                                    type="number"
                                    name="precio"
                                    value={detalle.precio} // Muestra el total calculado
                                    onChange={handleDetalleChange} // Quita el onChange si es de solo lectura
                                    className='form-control form-control-sm'
                                    step="0.01"
                                />
                            </div>
                            <div className='col-auto'> {/* col-auto para que ocupe solo el espacio necesario */}
                                <button type="button" onClick={handleAddDetalle} className={detalleSeleccionado ? 'btn btn-primary btn-sm' : 'btn btn-success btn-sm'}>{detalleSeleccionado ? 'Asignar Precio' : 'Asignar Precio'}</button>
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
                                        <th>Imagen</th>
                                    </tr>
                                </thead>

                            </DataTable>
                        </div>

                        <div className='mb-3'>
                            <label htmlFor="archivo_excel" className='form-label fw-bold'>Subir Archivo de Costeo (Excel)</label>
                            <input
                                className="form-control form-control-sm"
                                type="file"
                                id="archivo_excel"
                                accept=".xlsx, .xls" // Acepta solo archivos Excel
                                onChange={(e) => setArchivoExcel(e.target.files[0])}
                            />
                        </div>
                        {/* --- Sección Observaciones --- */}
                        <div className='row g-2 mb-3'>
                            <div className='col-md-6'>
                                <label className='form-label fw-bold'>Observaciones vendedor</label>
                                <textarea rows="3" name="costeo_observaciones" value={cotizacion.costeo_observaciones} onChange={handleChange} placeholder="Observaciones para vendedor" className='form-control form-control-sm'></textarea>
                            </div>
                        </div>

                        {/* --- Botones de Acción --- */}
                        <div className='d-flex justify-content-between mt-4 pt-3 border-top'> {/* Separador visual */}
                            <button type="submit" className='btn btn-primary btn-sm'>
                                GUARDAR
                            </button>
                            <div>
                                <Link to="/costeocotizaciones/lista" className="btn btn-secondary btn-sm me-2">CONSULTA</Link>
                                <Link to="/Home" className="btn btn-outline-secondary btn-sm">INICIO</Link> {/* Estilo diferente para volver */}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            {/* Modal para mostrar la imagen */}
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
        </div>
    );
}

export default CotizacionCosteo;