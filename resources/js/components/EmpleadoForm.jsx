/*
 * Importa React de la bibliotecha React import React from 'react';
 * React: es el punto de entrada principal para usar React en tu aplicación. Porporciona las funcionalidad
 * básicas para crear componentes, elementos y gestionar el ciclo de vida de los componentes.
 * 
 * Es necesario importar React en cualquier archivo que contenga código JSX.
 * JSX: es la sintaxis que permite escribir HTML dentro de JavaScript
 *
 *  Hook: "gancho", es una función especial que permite enganchar el estado y el ciclo de vida de React en componentes
 * funcionales Esto significa que puedes usar características de React que antes solo estaban disponibles en componentes de clase, como el estado local y los efectos secundarios, en componentes que son simplemente funciones de JavaScript.
 * useState:
 * Es un hook que permite agregar "estado" a componentes funcionales.
 * El "estado" es una forma de almacenar y gestionar datos que pueden cambiar con el tiempo y que afectan la forma en que se renderiza el componente.
 * useState devuelve un array con dos elementos: el valor actual del estado y una función para actualizar ese valor.
 * useEffect:
 * Es un hook que permite realizar "efectos secundarios" en componentes funcionales.
 * Los "efectos secundarios" son acciones que se realizan fuera del flujo normal de renderizado de un componente, como:
 * Realizar llamadas a APIs para obtener datos.
 * Suscribirse a eventos.
 * Actualizar el DOM directamente.
 * useEffect se ejecuta después de que el componente se renderiza.
 */
import React, { useState, useEffect } from 'react';
//Axios es un cliente HTTP basado en promesas que facilita la realización de solicitudes HTTP desde el navegador o Node.js.
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap 
import { Link, useParams, useNavigate } from 'react-router-dom'; // Importa Link

function EmpleadoForm() {
    //maneja el estado, en este caso un objeto con varios campos.
    //este objeto representa los datos de un empleado y cada campo es una propiedad del empleado.
    const [empleado, setEmpleado] = useState({
        codigo: '',
        nombre: '',
        id_identificacion: '',
        numero_identificacion: '',
        telefono_casa: '',
        movil: '',
        otro_telefono: '',
        correo_personal: '',
        correo_empresa: '',
        salud: '',
        contacto_emergencia: '',
        telefono_emergencia: '',
        id_departamento: '',
        id_puesto: '',
        fecha_nacimiento: '',
        fecha_ingreso: '',
        observaciones: '',
        estado: '',
        nit: '',
        genero: '',
        direccion: '',
        id_departamentopais: '',
        usuario_registro: ''
        // ... otros campos
    });
    const [identificaciones, setIdentificaciones] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [puestos, setPuestos] = useState([]);
    const [departamentosPais, setDepartamentosPais] = useState([]);
    const [departamentoId, setDepartamentoId] = useState(''); // Estado para el id del departamento seleccionado

    //20250324 19:25 edit
    const { id } = useParams(); // Obtiene el id de la URL
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Cargar datos del empleado para editar (si id está presente)
    //     if (id) {
    //         axios.get(`/api/empleados/${id}`, { headers })
    //             .then(res => {
    //                 const data = res.data;
    //                 setEmpleado({
    //                     codigo: data.codigo || '',
    //                     nombre: data.nombre || '',
    //                     id_identificacion: data.id_identificacion || '',
    //                     numero_identificacion: data.numero_identificacion || '',
    //                     telefono_casa: data.telefono_casa || '',
    //                     movil: data.movil || '',
    //                     otro_telefono: data.otro_telefono || '',
    //                     correo_personal: data.correo_personal || '',
    //                     correo_empresa: data.correo_empresa || '',
    //                     salud: data.salud || '',
    //                     contacto_emergencia: data.contacto_emergencia || '',
    //                     telefono_emergencia: data.telefono_emergencia || '',
    //                     id_departamento: data.id_departamento || '',
    //                     id_puesto: data.id_puesto || '',
    //                     fecha_nacimiento: data.fecha_nacimiento || '',
    //                     fecha_ingreso: data.fecha_ingreso || '',
    //                     observaciones: data.Observaciones || '',
    //                     estado: data.estado || '',
    //                     nit: data.nit || '',
    //                     genero: data.genero || '',
    //                     direccion: data.direccion || '',
    //                     id_departamentopais: data.id_departamentopais || '',
    //                     usuario_registro: data.usuario_registro || ''
    //                 });
    //             })
    //             .catch(error => console.error('Error al cargar empleado:', error));
    //     } else {
    //         // Cargar listas desplegables solo si NO estamos editando
    //         axios.get('/api/identificaciones', { headers }).then(res => setIdentificaciones(res.data));
    //         axios.get('/api/departamentos', { headers }).then(res => setDepartamentos(res.data));
    //         axios.get('/api/departamentos-pais', { headers }).then(res => setDepartamentosPais(res.data));
    //         if (departamentoId) {
    //             axios.get(`/api/puestos?id_departamento=${departamentoId}`, { headers }).then(res => setPuestos(res.data));
    //         } else {
    //             setPuestos([]);
    //         }
    //     }
    // }, [id, departamentoId]); // Dependencias: id y departamentoId

    if (id) {
        // Cargar datos del empleado para editar
        axios.get(`/api/empleados/${id}`, { headers })
            .then(res => {
                const data = res.data;
                setEmpleado({
                    codigo: data.codigo || '',
                    nombre: data.nombre || '',
                    id_identificacion: data.id_identificacion || '',
                    numero_identificacion: data.numero_identificacion || '',
                    telefono_casa: data.telefono_casa || '',
                    movil: data.movil || '',
                    otro_telefono: data.otro_telefono || '',
                    correo_personal: data.correo_personal || '',
                    correo_empresa: data.correo_empresa || '',
                    salud: data.salud || '',
                    contacto_emergencia: data.contacto_emergencia || '',
                    telefono_emergencia: data.telefono_emergencia || '',
                    id_departamento: data.id_departamento || '',
                    id_puesto: data.id_puesto || '',
                    fecha_nacimiento: data.fecha_nacimiento || '',
                    fecha_ingreso: data.fecha_ingreso || '',
                    observaciones: data.Observaciones || '',
                    estado: data.estado || '',
                    nit: data.nit || '',
                    genero: data.genero || '',
                    direccion: data.direccion || '',
                    id_departamentopais: data.id_departamentopais || '',
                    usuario_registro: data.usuario_registro || ''
                });

                // Cargar listas desplegables después de cargar los datos del empleado
                axios.get('/api/identificaciones', { headers }).then(res => setIdentificaciones(res.data));
                axios.get('/api/departamentos', { headers }).then(res => setDepartamentos(res.data));
                axios.get('/api/departamentos-pais', { headers }).then(res => setDepartamentosPais(res.data));
                if (data.id_departamento) {
                    axios.get(`/api/puestos?id_departamento=${data.id_departamento}`, { headers }).then(res => setPuestos(res.data));
                } else {
                    setPuestos([]);
                }
            })
            .catch(error => console.error('Error al cargar empleado:', error));
    } else {
        // Cargar listas desplegables para crear un nuevo empleado
        axios.get('/api/identificaciones', { headers }).then(res => setIdentificaciones(res.data));
        axios.get('/api/departamentos', { headers }).then(res => setDepartamentos(res.data));
        axios.get('/api/departamentos-pais', { headers }).then(res => setDepartamentosPais(res.data));
        if (departamentoId) {
            axios.get(`/api/puestos?id_departamento=${departamentoId}`, { headers }).then(res => setPuestos(res.data));
        } else {
            setPuestos([]);
        }
    }
}, [id, departamentoId]);

    const handleDepartamentoChange = (e) => {
        setDepartamentoId(e.target.value); // Actualizar el estado con el id del departamento seleccionado
        setEmpleado({ ...empleado, id_departamento: e.target.value, id_puesto: '' }); // Actualizar el estado del empleado
    };
    //maneja los cambios en los campos del formulario
    //...empleado, utiliza el operador de propagación para hacer una copia del objeto empleado
    //y luego actualiza el valor del campo correspondiente
    //e.target.name obtiene el valor del atributo name del elemento del formulario que ha desencadenado el evento
    //e.target.value obtiene el valor del elemento del formulario que ha desencadenado el evento
    const handleChange = (e) => {
        setEmpleado({ ...empleado, [e.target.name]: e.target.value });
    };

    //maneja el envío del formulario
    //e.preventDefault() evita que el formulario se envíe de forma predeterminada
    //axios.post('/api/empleados', empleado) envía una solicitud POST a la ruta /api/empleados con los datos del empleado
    //res.data contiene la respuesta del servidor
    //console.log('Empleado creado:', res.data) muestra la respuesta en la consola del navegador
    //limpiar el formulario o mostrar un mensaje de éxito    
    const handleSubmit = (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        if (id) {
            // Editar empleado existente (solicitud PUT)
            axios.put(`/api/empleados/${id}`, empleado, { headers })
                .then(res => {
                    console.log('Empleado actualizado:', res.data);
                    navigate('/empleados/lista'); // Redirige a la lista
                })
                .catch(error => console.error('Error al actualizar empleado:', error));
        } else {
            // Crear nuevo empleado (solicitud POST)
            axios.post('/api/empleados', empleado, { headers })
                .then(res => {
                    console.log('Empleado creado:', res.data);
                    navigate('/empleados/lista'); // Redirige a la lista
                })
                .catch(error => console.error('Error al crear empleado:', error));
        }
    };

    //return JSX que representa el formulario, se utiliza para devolver elementos HTML o mejor dicho elementos de React desde un componente funcional
    return (
        <form onSubmit={handleSubmit} className='container'>
            <div className='row'>
                <div className='col-2 mb-3'>
                    <label className="form-label">Código</label>
                    <input type="text" name="codigo" value={empleado.codigo} onChange={handleChange} placeholder="Código" className='form-control' />
                </div>
                <div className='col-6 mb-3'>
                    <label className="form-label">Nombre</label>
                    <input type="text" name="nombre" value={empleado.nombre} onChange={handleChange} placeholder="Nombre" className='form-control' />
                </div>
                <div className='col-4 mb-3'>
                    <label className='form-label'>NIT</label>
                    <input type="text" name="nit" value={empleado.nit} onChange={handleChange} placeholder="Nit" className='form-control' />
                </div>
            </div>
            <div className='row'>
                <div className='col-4 mb-3'>
                    <label className='form-label'>Tipo Identificación</label>'
                    <select name="id_identificacion" value={empleado.id_identificacion} onChange={handleChange} className='form-control'>
                        <option value="">Seleccionar Identificación</option>
                        {identificaciones.map(identificacion => (
                            <option key={identificacion.id_identificacion} value={identificacion.id_identificacion}>
                                {identificacion.nombre}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='col-4 mb-3'>
                    <label className='form-label'>Número de identificación</label>
                    <input type="text" name="numero_identificacion" value={empleado.numero_identificacion} onChange={handleChange} placeholder="Número de identificación" className='form-control' />
                </div>
            </div>
            <div className='row'>
                <div className='col-4 mb-3'>
                    <label className='form-label'>Teléfono casa</label>
                    <input type='text' name="telefono_casa" value={empleado.telefono_casa} onChange={handleChange} placeholder="Teléfono casa" className='form-control' />
                </div>
                <div className='col-4 mb-3'>
                    <label className='form-label'>Celular</label>
                    <input type='text' name="movil" value={empleado.movil} onChange={handleChange} placeholder="Celular" className='form-control' />
                </div>
                <div className='col-4 mb-3'>
                    <label className='form-label'>Otro teléfono</label>
                    <input type='text' name="otro_telefono" value={empleado.otro_telefono} onChange={handleChange} placeholder="Otro teléfono" className='form-control' />
                </div>
            </div>
            <div className='row'>
                <div className='col-5 mb-3'>
                    <label className='form-label'>Correo personal</label>
                    <input type='email' name='correo_personal' value={empleado.correo_personal} onChange={handleChange} placeholder="Correo personal" className='form-control' />
                </div>
                <div className='col-5 mb-3'>
                    <label className='form-label'>Correo empresa</label>
                    <input type='email' name='correo_empresa' value={empleado.correo_empresa} onChange={handleChange} placeholder="Correo empresa" className='form-control' />
                </div>
            </div>
            <div className='row'>
                <div className='col-4 mb-3'>
                    <label className='form-label'>Problemas de salud</label>
                    <input type='text' name="salud" value={empleado.salud} onChange={handleChange} placeholder="Problemas de salud" className='form-control' />
                </div>
                <div className='col-4 mb-3'>
                    <label className='form-label'>Contacto emergencia</label>
                    <input type='text' name="contacto_emergencia" value={empleado.contacto_emergencia} onChange={handleChange} placeholder="Contacto emergencia" className='form-control' />
                </div>
                <div className='col-4 mb-3'>
                    <label className='form-label'>Teléfono emergencia</label>
                    <input type='text' name="telefono_emergencia" value={empleado.telefono_emergencia} onChange={handleChange} placeholder="Teléfono emergencia" className='form-control' />
                </div>
            </div>
            <div className='row'>
                <div className='col-6 mb-3'>
                    <label className='form-label'>Área</label>
                    <select name="id_departamento" value={empleado.id_departamento} onChange={handleDepartamentoChange} className='form-control'>
                        <option value="">Seleccionar Área</option>
                        {departamentos.map(departamento => (
                            <option key={departamento.id_departamento} value={departamento.id_departamento}>
                                {departamento.nombre}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='col-6 mb-3'>
                    <label className='form-label'>Puesto</label>
                    <select name="id_puesto" value={empleado.id_puesto} onChange={handleChange} className='form-control'>
                        <option value="">Seleccionar Puesto</option>
                        {puestos.map(puesto => (
                            <option key={puesto.id_puesto} value={puesto.id_puesto}>
                                {puesto.nombre}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className='row'>
                <div className='col-2 mb-3'>
                    <label className='form-label'>Fecha nacimiento</label>
                    <input type="date" name="fecha_nacimiento" value={empleado.fecha_nacimiento} onChange={handleChange} placeholder="Fecha nacimiento" className='form-control' />
                </div>
                <div className='col-2 mb-3'>
                    <label className='form-label'>Fecha ingreso</label>
                    <input type="date" name="fecha_ingreso" value={empleado.fecha_ingreso} onChange={handleChange} placeholder="Fecha ingreso" className='form-control' />
                </div>
                <div className='col-2 mb-3'>
                    <label className='form-label'>Género</label>
                    <input type="text" name="genero" value={empleado.genero} onChange={handleChange} placeholder="Género" className='form-control' />
                </div>
                <div className='col-6 mb-3'>
                    <label className='form-label'>Dirección</label>
                    <input type="text" name="direccion" value={empleado.direccion} onChange={handleChange} placeholder="Dirección" className='form-control' />
                </div>
            </div>
            <div className='row'>
                <div className='col-4 mb-3'>
                    <label className='form-label'>Departamento</label>
                    <select name="id_departamentopais" value={empleado.id_departamentopais} onChange={handleChange} className='form-control'>
                        <option value="">Seleccionar Departamento</option>
                        {departamentosPais.map(departamentoPais => (
                            <option key={departamentoPais.iddepartamentopais} value={departamentoPais.iddepartamentopais}>
                                {departamentoPais.nombre}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='col-8 mb-3'>
                    <label className='form-label'>Observaciones</label>
                    <input type="text" name="observaciones" value={empleado.observaciones} onChange={handleChange} placeholder="Observaciones" className='form-control' />
                </div>
            </div>

            {/* ... otros campos y listas desplegables */}
            <div className='row'>
                <div className='col-2 mb-3'>
                    <button type="submit" className='btn btn-primary'>Guardar</button>
                </div>
                <div className='col-2 mb-3'>
                    <Link to="/empleados/lista" className="btn btn-secondary ms-2">Consulta</Link>
                    <Link to="/Home" className="btn btn-secondary ms-2">Volver a Inicio</Link>
                </div>
            </div>

        </form>
    );
}

export default EmpleadoForm;