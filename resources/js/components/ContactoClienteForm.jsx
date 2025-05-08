import React, { useState, useEffect } from 'react';
//Axios es un cliente HTTP basado en promesas que facilita la realización de solicitudes HTTP desde el navegador o Node.js.
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap 
import { Link, useParams, useNavigate } from 'react-router-dom';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.min.css';
import 'alertifyjs/build/css/themes/default.min.css';
import { FaSave, FaSearch, FaHome, FaBroom } from "react-icons/fa";
import Header from './Header';
import '../../css/generalesForm.css';

function ContactoClienteForm({ clienteId, onClose, onContactCreated }) {  // Recibe clienteId como prop
    const { id } = useParams(); // Obtiene el id de la URL
    const navigate = useNavigate();
    const [clientes, setClientes] = useState([]);
    //const fechaActual = new Date().toISOString().split("T")[0];
    //maneja el estado, en este caso un objeto con varios campos.
    //este objeto representa los datos de un empleado y cada campo es una propiedad del empleado.
    const [contactoCliente, setContactoCliente] = useState({
        idcliente: 0,
        nombre: '',
        telefono: '',
        correo: '',
        puesto: '',
        observaciones: '',
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        if (id) {
            // Cargar datos del contacto para editar
            axios.get(`/api/contacto_cliente/${id}`, { headers })
                .then(res => {
                    const data = res.data;
                    setContactoCliente({
                        idcliente: data.idcliente || 0,
                        nombre: data.nombre || '',
                        telefono: data.telefono || '',
                        correo: data.correo || '',
                        puesto: data.puesto || '',
                        observaciones: data.observaciones || '',
                    });

                    // Cargar listas desplegables después de cargar los datos del empleado
                    axios.get('/api/lista_clientes', { headers }).then(res => setClientes(res.data));
                })
                .catch(error => console.error('Error al cargar el contacto:', error));
        } else {
            // Cargar listas desplegables para crear un nuevo empleado
            axios.get('/api/lista_clientes', { headers }).then(res => setClientes(res.data));
        }
    }, [id]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        if (clienteId) {
            setContactoCliente(prev => ({ ...prev, idcliente: clienteId })); //Actualiza idcliente con el clienteId
        }

        axios.get('/api/lista_clientes', { headers }).then(res => setClientes(res.data));
    }, [clienteId]);

    const handleChange = (e) => {
        setContactoCliente({ ...contactoCliente, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Detiene la propagación del evento submit
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Validación de campos obligatorios
        const camposObligatorios = [
            { campo: contactoCliente.idcliente, nombre: 'Cliente' },
            { campo: contactoCliente.nombre, nombre: 'Nombre' },
            { campo: contactoCliente.telefono, nombre: 'Teléfono' },
            { campo: contactoCliente.puesto, nombre: 'Puesto' },
        ];

        const camposFaltantes = camposObligatorios.filter(c => !c.campo || c.campo.trim() === '');
        if (camposFaltantes.length > 0) {
            const nombres = camposFaltantes.map(c => c.nombre).join(', ');
            alertify.alert('DATOS OBLIGATORIOS', `Por favor, complete los siguientes campos obligatorios: ${nombres}`);
            return;
        }

        if (id) {
            // Editar empleado existente (solicitud PUT)
            axios.put(`/api/contacto_cliente/${id}`, contactoCliente, { headers })
                .then(res => {
                    //console.log('Contacto actualizado:', res.data);
                    //navigate('/contacto_cliente/lista'); // Redirige a la lista
                    alertify.success("Contacto actualizado correctamente");
                    limpiarCampos(); // Limpia los campos después de actualizar
                })
                .catch(error => console.error('Error al actualizar el contacto:', error));
        } else {
            // Crear nuevo empleado (solicitud POST)
            axios.post('/api/contacto_cliente', contactoCliente, { headers })
                .then(res => {
                    //console.log('Contacto creado:', res.data);
                    alertify.success("Contacto creado correctamente");
                    onContactCreated();

                    //navigate('/contacto_cliente/lista'); // Redirige a la lista
                    onClose(); //Cierra el modal
                })
                .catch(error => {
                    console.error('Error al crear el contacto:', error)
                    alertify.error("Error al crear el contacto");
                });
        }
    };

    const limpiarCampos = () => {
        setContactoCliente({
            idcliente: 0,
            nombre: '',
            telefono: '',
            correo: '',
            puesto: '',
            observaciones: '',
        });
    }

    return (
        <div className='mt-4'>
            <Header title="Registro de contactos (Cliente)" />
            <div className="card shadow p-4">
                {/* <div className="card-header bg-primary text-white">
                    <h4 className="mb-0">Registro de contactos</h4>
                </div> */}
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className='row g-2'>
                            <div className='col-md-4'>
                                <label className='form-label'>Cliente</label>
                                <select name="idcliente" value={contactoCliente.idcliente} onChange={handleChange} className='form-control form-control-sm campo-obligatorio-fondo'>
                                    <option value="">Seleccionar Cliente</option>
                                    {clientes.map(cliente => (
                                        <option key={cliente.idcliente} value={cliente.idcliente}>
                                            {cliente.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-4'>
                                <label className='form-label'>Nombre</label>
                                <input type="text" name="nombre" value={contactoCliente.nombre} onChange={handleChange} placeholder="Nombre" className='form-control form-control-sm campo-obligatorio-fondo' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-4'>
                                <label className='form-label'>Teléfono</label>
                                <input type='text' name="telefono" value={contactoCliente.telefono} onChange={handleChange} placeholder="Teléfono" className='form-control form-control-sm campo-obligatorio-fondo' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-4'>
                                <label className='form-label'>Correo</label>
                                <input type='text' name='correo' value={contactoCliente.correo} onChange={handleChange} placeholder="Correo" className='form-control form-control-sm' />
                            </div>
                            <div className='col-md-4'>
                                <label className='form-label'>Puesto</label>
                                <input type='text' name='puesto' value={contactoCliente.puesto} onChange={handleChange} placeholder="Puesto" className='form-control form-control-sm campo-obligatorio-fondo' />
                            </div>
                        </div>
                        <div className='row g-2'>
                            <div className='col-md-10'>
                                <label className='form-label'>Observaciones</label>
                                <input type='text' name="observaciones" value={contactoCliente.observaciones} onChange={handleChange} placeholder="Observaciones" className='form-control form-contorl-lg' />
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
                                    <FaSave /> Guardar
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
                                    to="/contacto_cliente/lista"
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
        </div>
    );
}

export default ContactoClienteForm; 