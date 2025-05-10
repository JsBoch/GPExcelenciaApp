import React, { useState, useEffect } from 'react';
//Axios es un cliente HTTP basado en promesas que facilita la realización de solicitudes HTTP desde el navegador o Node.js.
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap 
import { Link, useParams, useNavigate } from 'react-router-dom'; //
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.min.css';
import 'alertifyjs/build/css/themes/default.min.css';
import { FaSave, FaSearch, FaHome, FaBroom, FaPlusCircle } from "react-icons/fa";
import Header from './Header';
import '../../css/generalesForm.css';
import ContactoClienteForm from './ContactoClienteForm'; // 1. Importa el formulario de contacto
import '../../css/modalStyles.css'; // 2. Crea y enlaza un CSS para el modal (ver abajo)

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
    // 3. Estado para controlar la visibilidad del modal de contacto
    const [isContactoModalOpen, setIsContactoModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(!!id); // true si hay id

    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        if (id) {
            setModoEdicion(true);
            // Cargar datos del empleado para editar
            axios.get(`/api/clientes/${id}`, { headers })
                .then(res => {
                    const data = res.data;
                    setCliente({
                        idcliente: data.idcliente || id, // Guardar el id del cliente
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
                        id_municipio: data.id_municipio || '',
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
            setModoEdicion(false);
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

        // Validación de campos obligatorios
        const camposObligatorios = [
            { campo: clienteData.nit, nombre: 'Nit' },
            { campo: clienteData.nombre, nombre: 'Nombre' },
            { campo: clienteData.razonsocial, nombre: 'Razón Social' },
            { campo: clienteData.direccion, nombre: 'Dirección' },
            { campo: clienteData.monto_credito, nombre: 'Monto crédito' },
            { campo: clienteData.dias_credito, nombre: 'Días crédito' },
        ];

        const camposFaltantes = camposObligatorios.filter(c => !c.campo || c.campo.trim() === '');
        if (camposFaltantes.length > 0) {
            const nombres = camposFaltantes.map(c => c.nombre).join(', ');
            alertify.alert('DATOS OBLIGATORIOS', `Por favor, complete los siguientes campos obligatorios: ${nombres}`);
            return;
        }

        if (id) {
            // Editar cliente existente (solicitud PUT)
            axios.put(`/api/clientes/${id}`, clienteData, { headers })
                .then(res => {
                    // console.log('Cliente actualizado:', res.data);
                    // navigate('/clientes/lista'); // Redirige a la lista
                    alertify.success('Cliente actualizado correctamente');
                    limpiarCampos(); // Llama a la función para limpiar los campos
                })
                .catch(error => console.error('Error al actualizar el cliente:', error));
        } else {
            // Crear nuevo cliente (solicitud POST)            
            axios.post('/api/clientes', clienteData, { headers })
                .then(res => {
                    // console.log('Cliente creado:', res.data);
                    // navigate('/clientes/lista'); // Redirige a la lista
                    alertify.success('Cliente creado correctamente');
                    // Si la API devuelve el cliente creado con su ID:
                    if (res.data && res.data.idcliente) {
                        setCliente(prevCliente => ({ ...prevCliente, idcliente: res.data.idcliente }));
                        // Ahora podrías, por ejemplo, abrir el modal de contactos automáticamente
                        // o simplemente el botón "Agregar Contacto" ya funcionará con este ID.
                        // O redirigir a la edición de este nuevo cliente:
                        // navigate(`/clientes/editar/${res.data.idcliente}`);
                    }
                    limpiarCampos(); // Llama a la función para limpiar los campos
                })
                .catch(error => console.error('Error al crear el cliente:', error));
        }
    };

    const limpiarCampos = () => {
        setCliente({
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
            fecha_modificacion: ''
        });
        setModoEdicion(false); // Oculta el botón Agregar Contacto
    }

    // 4. Funciones para manejar el modal de contacto
    const handleOpenContactoModal = () => {
        if (!cliente.idcliente && !id) { // Si es un cliente nuevo sin ID y no estamos en modo edición de un cliente existente
            alertify.warning('Por favor, primero guarde el cliente para poder agregarle contactos.');
            return;
        }
        setIsContactoModalOpen(true);
    };

    const handleCloseContactoModal = () => {
        setIsContactoModalOpen(false);
    };

    const handleContactCreated = () => {
        alertify.success('Contacto asociado al cliente creado exitosamente.');
        // Podrías querer recargar una lista de contactos si la muestras aquí, o simplemente cerrar.
        // handleCloseContactoModal(); // ContactoClienteForm ya llama a onClose, que es esta función.
    };

    return (
        <div className='mt-4'>
            <Header title={id ? 'Actualizar registro de cliente' : 'Crear registro de cliente'} />
            <div className="card shadow p-4">
                {/* <div className="card-header bg-primary text-white">
                    <h4 className="mb-0">Registro de Cliente</h4>
                </div> */}
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className='row g-2'>
                            {/* <div className='col-md-2'>
                                <label className='form-label'>Código</label>
                                <input type="text" name="codigo" value={cliente.codigo} onChange={handleChange} placeholder="Código" className='form-control form-control-sm' />
                            </div> */}
                            <div className='col-md-4'>
                                <label className="form-label">NIT</label>
                                <input type="text" name="nit" value={cliente.nit} onChange={handleChange} placeholder="NIT" className='form-control form-control-sm campo-obligatorio-fondo' />
                            </div>
                            <div className='col-md-4'>
                                <label className="form-label">CUI</label>
                                <input type="text" name="cui" value={cliente.cui} onChange={handleChange} placeholder="CUI" className='form-control form-control-sm' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-6'>
                                <label className="form-label">Nombre</label>
                                <input type="text" name="nombre" value={cliente.nombre} onChange={handleChange} placeholder="Nombre" className='form-control form-control-sm campo-obligatorio-fondo' />
                            </div>
                            <div className='col-md-6'>
                                <label className="form-label">Razón Social</label>
                                <input type="text" name="razonsocial" value={cliente.razonsocial} onChange={handleChange} placeholder="Razón social" className='form-control form-control-sm campo-obligatorio-fondo' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-8'>
                                <label className="form-label">Dirección</label>
                                <input type="text" name="direccion" value={cliente.direccion} onChange={handleChange} placeholder="Dirección" className='form-control form-control-sm campo-obligatorio-fondo' />
                            </div>
                            <div className='col-md-4'>
                                <label className="form-label">Correo</label>
                                <input type="text" name="email" value={cliente.email} onChange={handleChange} placeholder="Correo" className='form-control form-control-sm' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-4'>
                                <label className="form-label">Telefono uno</label>
                                <input type="text" name="telefono_uno" value={cliente.telefono_uno} onChange={handleChange} placeholder="Teléfono" className='form-control form-control-sm' />
                            </div>
                            <div className='col-md-4'>
                                <label className="form-label">Telefono dos</label>
                                <input type="text" name="telefono_dos" value={cliente.telefono_dos} onChange={handleChange} placeholder="Teléfono" className='form-control form-control-sm' />
                            </div>
                            <div className='col-md-4'>
                                <label className="form-label">Telefono tres</label>
                                <input type="text" name="telefono_tres" value={cliente.telefono_tres} onChange={handleChange} placeholder="Teléfono" className='form-control form-control-sm' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-4'>
                                <label className='form-label'>Departamento</label>
                                <select name="iddepartamento" value={cliente.iddepartamento} onChange={handleChange} className='form-control form-control-sm'>
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
                                <input type="text" name="monto_credito" value={cliente.monto_credito} onChange={handleChange} placeholder="Monto crédito" className='form-control form-control-sm campo-obligatorio-fondo' />
                            </div>
                            <div className='col-md-4'>
                                <label className="form-label">Días crédito</label>
                                <input type="text" name="dias_credito" value={cliente.dias_credito} onChange={handleChange} placeholder="Días crédito" className='form-control form-control-sm campo-obligatorio-fondo' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-6'>
                                <label className='form-label'>Vendedor asociado</label>
                                <select name="id_empleado" value={cliente.id_empleado} onChange={handleChange} className='form-control form-control-sm'>
                                    <option value="">Seleccionar vendedor</option>
                                    {vendedores.map(vendedor => (
                                        <option key={vendedor.id_empleado} value={vendedor.id_empleado}>
                                            {vendedor.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
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
                                {/* 5. Botón para abrir el modal de contacto */}
                                {/* Mostrar solo si estamos editando un cliente (id existe) o si el cliente nuevo ya tiene idcliente */}
                                {modoEdicion && (
                                    <button
                                        type="button"
                                        className="btn btn-info d-flex align-items-center justify-content-center gap-2"
                                        style={{ minWidth: "180px" }}
                                        onClick={handleOpenContactoModal}
                                    >
                                        <FaPlusCircle /> Agregar Contacto
                                    </button>
                                )}
                                <button
                                    type="button" // Importante: no es un botón de submit
                                    className="btn btn-light d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px", color: "#000", border: "1px solid #ccc" }}
                                    onClick={limpiarCampos} // Asocia la función al evento onClick
                                >
                                    <FaBroom /> {/* Puedes usar otro icono como FaBroom */} Limpiar
                                </button>
                                <Link
                                    to="/clientes/lista"
                                    className="btn btn-success d-flex align-items-center justify-content-center gap-2 flex-fill"
                                    style={{ minWidth: "150px" }}
                                >
                                    <FaSearch /> Consultar
                                </Link>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            {/* 6. Renderizado condicional del modal de contacto */}
            {isContactoModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-wrapper"
                        style={{
                            width: '90%',
                            maxWidth: '1000px',
                            margin: '10vh auto',
                            backgroundColor: '#fff',
                            padding: '20px',
                            borderRadius: '8px',
                            boxShadow: '0 0 15px rgba(0,0,0,0.3)',
                        }}>
                        <ContactoClienteForm
                            clienteId={id || cliente.idcliente} // Pasa el ID del cliente actual
                            onClose={handleCloseContactoModal}
                            onContactCreated={handleContactCreated}
                        />
                        {/* Podrías añadir un botón "Cerrar" explícito aquí también si ContactoClienteForm no lo tiene visible */}
                        {/* <button onClick={handleCloseContactoModal} className="btn btn-sm btn-danger mt-2">Cerrar Modal</button> */}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClienteRegistro; 