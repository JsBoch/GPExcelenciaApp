import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link, useParams, useNavigate } from 'react-router-dom';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.min.css';
import 'alertifyjs/build/css/themes/default.min.css';

function ProductoPredefinidoForm() {
    const { id } = useParams(); // Obtiene el id de la URL
    const navigate = useNavigate();
    const [unidadesMedida, setUnidadesMedida] = useState([]);
    const [productoPredefinido, setProductoPredefinido] = useState({
        titulo: '',
        descripcion: '',
        ancho: 0,
        alto: 0,
        profundidad: 0,
        precio: 0,
        observaciones: '',
        cantidad: 0,
        cantidad_uno: 0,
        cantidad_dos: 0,
        cantidad_tres: 0,
        cantidad_cuatro: 0,
        precio_uno: 0,
        precio_dos: 0,
        precio_tres: 0,
        precio_cuatro: 0,
        variacion: false,
        idunidadmedida: 0,
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Función para cargar las unidades de medida
        const loadUnidadesMedida = () => {
            axios.get('/api/lista_unidadesmedidapp', { headers })
                .then(res => {
                    setUnidadesMedida(res.data);
                })
                .catch(error => {
                    console.error('Error al cargar unidades de medida:', error);
                    alertify.error('Error al cargar unidades de medida'); // Opcional: mostrar error
                });
        };

        loadUnidadesMedida(); // Carga unidades de medida inicialmente

        if (id) {
            // Cargar datos del producto predefinido para editar
            axios.get(`/api/productopredefinido/${id}`, { headers })
                .then(res => {
                    const data = res.data;
                    setProductoPredefinido({
                        titulo: data.titulo || '',
                        descripcion: data.descripcion || '',
                        ancho: data.ancho || '',
                        alto: data.alto || '',
                        profundidad: data.profundidad || '',
                        precio: data.precio || '',
                        observaciones: data.observaciones || '',
                        cantidad: data.cantidad || '',
                        cantidad_uno: data.cantidad_uno || '',
                        cantidad_dos: data.cantidad_dos || '',
                        cantidad_tres: data.cantidad_tres || '',
                        cantidad_cuatro: data.cantidad_cuatro || '',
                        precio_uno: data.precio_uno || '',
                        precio_dos: data.precio_dos || '',
                        precio_tres: data.precio_tres || '',
                        precio_cuatro: data.precio_cuatro || '',
                        variacion: data.variacion === 1 || data.variacion === true,
                        idunidadmedida: data.idunidadmedida || '',
                    });

                    // Cargar listas desplegables después de cargar los datos del empleado
                    //axios.get('/api/lista_unidadesmedidapp', { headers }).then(res => setUnidadesMedida(res.data));
                })
                .catch(error => console.error('Error al cargar el producto predefinido:', error));
        } else {
            // Cargar listas desplegables para crear un nuevo producto predefinido
            //axios.get('/api/lista_unidadesmedidapp', { headers }).then(res => setUnidadesMedida(res.data));
        }
    }, [id]);

    //Maneja los cambios en los inputs, actualiza el estado del producto predefinido
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = name === 'titulo' ? value.toUpperCase() : value; // Modificado
        setProductoPredefinido(prevProducto => ({
            ...prevProducto,
            [name]: type === 'checkbox' ? checked : newValue,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Validaciones
        if (!productoPredefinido.titulo.trim()) {
            alertify.error("Debe ingresar el título.");
            return;
        }

        if (!productoPredefinido.idunidadmedida) {
            alertify.error("Seleccione la unidad de medida.");
            return;
        }

        const dataToSend = {
            ...productoPredefinido,
            variacion: productoPredefinido.variacion ? '1' : '0'
        };

        if (id) {
            // Editar producto predefinido existente (solicitud PUT)
            axios.put(`/api/productopredefinido/${id}`, dataToSend, { headers })
                .then(res => {
                    console.log('Producto predefinido actualizado:', res.data);
                    navigate('/productospredefinidos/lista'); // Redirige a la lista
                })
                .catch(error => console.error('Error al actualizar el producto predefinido:', error));
        } else {
            // Crear nuevo producto predefinido (solicitud POST)
            axios.post('/api/productopredefinido', dataToSend, { headers })
                .then(res => {
                    console.log('Producto predefinido creado:', res.data);
                    navigate('/productospredefinidos/lista'); // Redirige a la lista
                })
                .catch(error => console.error('Error al crear el producto predefinido:', error));
        }
    };

    return (
        <div className='container mt-4'>
            <div className="card shadow p-4">
                <div className="card-header bg-primary text-white">
                    <h4 className="mb-0">Registro de Producto Predefinido</h4>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className='row g-2'>
                            <div className='col-md-2'>
                                <label className="form-label">Titulo</label>
                                <input type="text" name="titulo" value={productoPredefinido.titulo} onChange={handleChange} placeholder="Titulo" className='form-control form-control-sm' style={{ textTransform: 'uppercase' }} />
                            </div>
                            <div className='col-md-6'>
                                <label className="form-label">Descripción</label>
                                <input type="text" name="descripcion" value={productoPredefinido.descripcion} onChange={handleChange} placeholder="Descripción" className='form-control form-control-sm' />
                            </div>
                        </div>
                        {/* Colocación del select de unidades de medida aquí */}
                        <div className='row g-2 mt-2'>
                            <div className='col-md-4'>
                                <label className='form-label'>Unidad medida</label>
                                <select name="idunidadmedida" value={productoPredefinido.idunidadmedida} onChange={handleChange} className='form-control form-control-sm'>
                                    <option value="">Seleccionar Unidad Medida</option>
                                    {unidadesMedida.map(unidadMedida => (
                                        <option key={unidadMedida.idunidadmedida} value={unidadMedida.idunidadmedida}>
                                            {unidadMedida.unidad}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className='row g-2 mt-2'>
                            <div className='col-md-2'>
                                <label className="form-label">Ancho</label>
                                <input type="text" name="ancho" value={productoPredefinido.ancho} onChange={handleChange} placeholder="Ancho" className='form-control form-control-sm' />
                            </div>
                            <div className='col-md-2'>
                                <label className="form-label">Alto</label>
                                <input type="text" name="alto" value={productoPredefinido.alto} onChange={handleChange} placeholder="Alto" className='form-control form-control-sm' />
                            </div>
                            <div className='col-md-2'>
                                <label className="form-label">Profundidad</label>
                                <input type="text" name="profundidad" value={productoPredefinido.profundidad} onChange={handleChange} placeholder="Profundidad" className='form-control form-control-sm' />
                            </div>
                        </div>
                        <div className='row g-2 mt-2 align-items-center'>
                            <div className="col-auto">
                                <label className="form-label me-2">Variación</label>
                            </div>
                            <div className="col-auto">
                                <input
                                    type="checkbox"
                                    name="variacion"
                                    checked={productoPredefinido.variacion}
                                    onChange={handleChange}
                                    className="form-check-input"
                                />
                            </div>
                        </div>

                        <div className='row g-2 mt-2'>
                            <div className='col-md-2'>
                                <label className="form-label">Cantidad</label>
                                <input
                                    type="number"
                                    name="cantidad"
                                    value={productoPredefinido.cantidad}
                                    onChange={handleChange}
                                    className='form-control form-control-sm'
                                    disabled={productoPredefinido.variacion}
                                />
                            </div>
                            <div className='col-md-2'>
                                <label className="form-label">Cantidad 1</label>
                                <input
                                    type="number"
                                    name="cantidad_uno"
                                    value={productoPredefinido.cantidad_uno}
                                    onChange={handleChange}
                                    className='form-control form-control-sm'
                                    disabled={!productoPredefinido.variacion}
                                />
                            </div>
                            <div className='col-md-2'>
                                <label className="form-label">Cantidad 2</label>
                                <input
                                    type="number"
                                    name="cantidad_dos"
                                    value={productoPredefinido.cantidad_dos}
                                    onChange={handleChange}
                                    className='form-control form-control-sm'
                                    disabled={!productoPredefinido.variacion}
                                />
                            </div>
                            <div className='col-md-2'>
                                <label className="form-label">Cantidad 3</label>
                                <input
                                    type="number"
                                    name="cantidad_tres"
                                    value={productoPredefinido.cantidad_tres}
                                    onChange={handleChange}
                                    className='form-control form-control-sm'
                                    disabled={!productoPredefinido.variacion}
                                />
                            </div>
                            <div className='col-md-2'>
                                <label className="form-label">Cantidad 4</label>
                                <input
                                    type="number"
                                    name="cantidad_cuatro"
                                    value={productoPredefinido.cantidad_cuatro}
                                    onChange={handleChange}
                                    className='form-control form-control-sm'
                                    disabled={!productoPredefinido.variacion}
                                />
                            </div>
                        </div>
                        <div className='row g-2 mt-2'>
                            <div className='col-md-2'>
                                <label className="form-label">Precio</label>
                                <input
                                    type="number"
                                    name="precio"
                                    value={productoPredefinido.precio}
                                    onChange={handleChange}
                                    className='form-control form-control-sm'
                                    step="0.01" // Para permitir decimales
                                    disabled={productoPredefinido.variacion} // Deshabilitado si variación está marcada
                                />
                            </div>
                            <div className='col-md-2'>
                                <label className="form-label">Precio 1</label>
                                <input
                                    type="number"
                                    name="precio_uno"
                                    value={productoPredefinido.precio_uno}
                                    onChange={handleChange}
                                    className='form-control form-control-sm'
                                    step="0.01"
                                    disabled={!productoPredefinido.variacion} // Deshabilitado si no está marcada
                                />
                            </div>
                            <div className='col-md-2'>
                                <label className="form-label">Precio 2</label>
                                <input
                                    type="number"
                                    name="precio_dos"
                                    value={productoPredefinido.precio_dos}
                                    onChange={handleChange}
                                    className='form-control form-control-sm'
                                    step="0.01"
                                    disabled={!productoPredefinido.variacion}
                                />
                            </div>
                            <div className='col-md-2'>
                                <label className="form-label">Precio 3</label>
                                <input
                                    type="number"
                                    name="precio_tres"
                                    value={productoPredefinido.precio_tres}
                                    onChange={handleChange}
                                    className='form-control form-control-sm'
                                    step="0.01"
                                    disabled={!productoPredefinido.variacion}
                                />
                            </div>
                            <div className='col-md-2'>
                                <label className="form-label">Precio 4</label>
                                <input
                                    type="number"
                                    name="precio_cuatro"
                                    value={productoPredefinido.precio_cuatro}
                                    onChange={handleChange}
                                    className='form-control form-control-sm'
                                    step="0.01"
                                    disabled={!productoPredefinido.variacion}
                                />
                            </div>
                        </div>
                        <div className='row g-2 mt-2'>
                            <div className='col-md-12'>
                                <label className="form-label">Observaciones</label>
                                <input type="text" name="observaciones" value={productoPredefinido.observaciones} onChange={handleChange} placeholder="Observaciones" className='form-control form-control-sm' />
                            </div>
                        </div>

                        <div className='d-flex justify-content-between mt-4'>
                            <button type="submit" className='btn btn-primary btn-sm w-25'>
                                {id ? 'ACTUALIZAR' : 'GUARDAR'}
                            </button>
                            <div style={{ display: 'flex', width: '25%', gap: '10px' }}>
                                <div style={{ width: '50%' }}>
                                    <Link to="/productospredefinidos/lista" className="btn btn-success btn-sm" style={{ width: '100%' }}>CONSULTA</Link>
                                </div>
                                <div style={{ width: '50%' }}>
                                    <Link to="/Home" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>INICIO</Link> {/* Estilo diferente para volver */}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ProductoPredefinidoForm;