import React, { useState, useEffect } from 'react';
//Axios es un cliente HTTP basado en promesas que facilita la realización de solicitudes HTTP desde el navegador o Node.js.
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap 
import { Link, useParams, useNavigate } from 'react-router-dom'; //

function ClienteRegistro() {
    const [cliente, setCliente] = useState({
        idcliente: '',
        nit: '',
        nombre: '',
        direccion: '',
        email: '',
        comentario: '',
        fecharegistro: '',
        estado: '',
        codigo: '',
        iddepartamento: '',
        razonsocial: '',
        monto_credito: '',
        id_empleado: '',
        dias_credito: '',
        id_municipio: '',
        idtipocliente: '',
        codigo_postal: '',
        cui: '',
        usuario_registro: '',
        usuario_modifica: '',
        telefono_uno: '',
        telefono_dos: '',
        telefono_tres: '',
        fecha_modificacion: '',
    });

    const [departamentosPais, setDepartamentosPais] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    //20250324 19:25 edit
    const { id } = useParams(); // Obtiene el id de la URL
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        if (id) {
            // Cargar datos del empleado para editar
            axios.get(`/api/clientes/${id}`, { headers })
                .then(res => {
                    const data = res.data;
                    setCliente({
                        codigo: data.codigo || '',
                        nit: data.nit || '',
                        cui: data.cui || '',
                        nombre: data.nombre || '',
                        razonsocial: data.razonsocial || '',
                        direccion: data.direccion || '',
                        email: data.email || '',
                        telefono_uno: data.telefono_uno || '',
                        telefono_dos: data.telefono_dos || '',
                        telefono_tres: data.telefono_tres || '',
                        iddepartamento: data.iddepartamento || '',
                        monto_credito: data.monto_credito || '',
                        dias_credito: data.dias_credito || '',
                        id_empleado: data.id_empleado || '',
                        comentario: data.comentario || '',
                        idtipocliente: data.idtipocliente || '',
                        id_municipio: data.id_municipio || '0',
                        codigo_postal: data.codigo_postal || '',
                        usuario_registro: data.usuario_registro || '',
                        usuario_modifica: data.usuario_modifica || '',
                        fecharegistro: data.fecharegistro || '',
                        fecha_modificacion: data.fecha_modificacion || '',
                        estado: data.estado || '',
                    });

                    // Cargar listas desplegables después de cargar los datos del empleado                    
                    axios.get('/api/departamentos-pais', { headers }).then(res => setDepartamentosPais(res.data));
                    axios.get('/api/vendedores', { headers }).then(res => setVendedores(res.data));
                })
                .catch(error => console.error('Error al cargar el cliente:', error));
        } else {
            // Cargar listas desplegables para crear un nuevo empleado            
            axios.get('/api/departamentos-pais', { headers }).then(res => setDepartamentosPais(res.data));
            axios.get('/api/vendedores', { headers }).then(res => setVendedores(res.data));
        }
    }, [id]);

    //Maneja los cambios en el formulario
    const handleChange = (e) => {
        setCliente({ ...cliente, [e.target.name]: e.target.value });
    };

    //maneja el envío del formulario
    const handleSubmit = (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const clienteData = { ...cliente };

    // Verifica si el campo 'cui' está presente
    if (!clienteData.cui) {
        clienteData.cui = '0'; // O clienteData.cui = 'valor_predeterminado';
    }

        if (id) {
            // Editar cliente existente (solicitud PUT)
            axios.put(`/api/clientes/${id}`, clienteData, { headers })
                .then(res => {
                    console.log('Cliente actualizado:', res.data);
                    navigate('/clientes/lista'); // Redirige a la lista
                })
                .catch(error => console.error('Error al actualizar el cliente:', error));
        } else {
            // Crear nuevo empleado (solicitud POST)            
            axios.post('/api/clientes', clienteData, { headers })
                .then(res => {
                    console.log('Cliente creado:', res.data);
                    navigate('/clientes/lista'); // Redirige a la lista
                })
                .catch(error => console.error('Error al crear el cliente:', error));
        }
    };

    return (
        <div className='container mt-4'>
            <div className="card formulario-container">
                <div className="card-header bg-primary text-white">
                    <h4 className="mb-0">Registro de Cliente</h4>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className='row g-2'>
                            <div className='col-md-2'>
                                <label className='form-label'>Código</label>
                                <input type="text" name="codigo" value={cliente.codigo} onChange={handleChange} placeholder="Código" className='form-control form-control-lg' />
                            </div>
                            <div className='col-md-4'>
                                <label className="form-label">NIT</label>
                                <input type="text" name="nit" value={cliente.nit} onChange={handleChange} placeholder="NIT" className='form-control form-control-lg' />
                            </div>
                            <div className='col-md-4'>
                                <label className="form-label">CUI</label>
                                <input type="text" name="cui" value={cliente.cui} onChange={handleChange} placeholder="CUI" className='form-control form-control-lg' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-6'>
                                <label className="form-label">Nombre</label>
                                <input type="text" name="nombre" value={cliente.nombre} onChange={handleChange} placeholder="Nombre" className='form-control form-control-lg' />
                            </div>
                            <div className='col-md-6'>
                                <label className="form-label">Razón Social</label>
                                <input type="text" name="razonsocial" value={cliente.razonsocial} onChange={handleChange} placeholder="Razón social" className='form-control form-control-lg' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-8'>
                                <label className="form-label">Dirección</label>
                                <input type="text" name="direccion" value={cliente.direccion} onChange={handleChange} placeholder="Dirección" className='form-control form-control-lg' />
                            </div>
                            <div className='col-md-4'>
                                <label className="form-label">Correo</label>
                                <input type="text" name="email" value={cliente.email} onChange={handleChange} placeholder="Correo" className='form-control form-control-lg' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-4'>
                                <label className="form-label">Telefono uno</label>
                                <input type="text" name="telefono_uno" value={cliente.telefono_uno} onChange={handleChange} placeholder="Teléfono" className='form-control form-control-lg' />
                            </div>
                            <div className='col-md-4'>
                                <label className="form-label">Telefono dos</label>
                                <input type="text" name="telefono_dos" value={cliente.telefono_dos} onChange={handleChange} placeholder="Teléfono" className='form-control form-control-lg' />
                            </div>
                            <div className='col-md-4'>
                                <label className="form-label">Telefono tres</label>
                                <input type="text" name="telefono_tres" value={cliente.telefono_tres} onChange={handleChange} placeholder="Teléfono" className='form-control form-control-lg' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-4'>
                                <label className='form-label'>Departamento</label>
                                <select name="iddepartamento" value={cliente.iddepartamento} onChange={handleChange} className='form-control form-control-lg'>
                                    <option value="">Seleccionar Departamento</option>
                                    {departamentosPais.map(departamentoPais => (
                                        <option key={departamentoPais.iddepartamentopais} value={departamentoPais.iddepartamentopais}>
                                            {departamentoPais.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-4'>
                                <label className="form-label">Monto crédito</label>
                                <input type="text" name="monto_credito" value={cliente.monto_credito} onChange={handleChange} placeholder="Monto crédito" className='form-control form-control-lg' />
                            </div>
                            <div className='col-md-4'>
                                <label className="form-label">Días crédito</label>
                                <input type="text" name="dias_credito" value={cliente.dias_credito} onChange={handleChange} placeholder="Días crédito" className='form-control form-control-lg' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-6'>
                                <label className='form-label'>Vendedor asociado</label>
                                <select name="id_empleado" value={cliente.id_empleado} onChange={handleChange} className='form-control form-control-lg'>
                                    <option value="">Seleccionar vendedor</option>
                                    {vendedores.map(vendedor => (
                                        <option key={vendedor.id_empleado} value={vendedor.id_empleado}>
                                            {vendedor.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-8'>
                                <label className="form-label">Observaciones</label>
                                <input type="text" name="comentario" value={cliente.comentario} onChange={handleChange} placeholder="Observaciones" className='form-control form-control-lg' />
                            </div>
                        </div>
                        <div className='d-flex justify-content-between mt-4'>
                            <button type="submit" className='btn btn-primary btn-lg'>Guardar</button>
                            <div>
                                <Link to="/clientes/lista" className="btn btn-secondary btn-lg me-2">Consulta</Link>
                                <Link to="/Home" className="btn btn-secondary btn-lg">Volver a Inicio</Link>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ClienteRegistro; 