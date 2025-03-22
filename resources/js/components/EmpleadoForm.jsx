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

function EmpleadoForm() {    
    //maneja el estado, en este caso un objeto con varios campos.
    //este objeto representa los datos de un empleado y cada campo es una propiedad del empleado.
    const [empleado, setEmpleado] = useState({
        codigo: '',
        nombre: '',
        id_identificacion: '',
        numero_identificacion: '',
        telefono_casa:'',
        movil:'',
        otro_telefono:'',
        correo_personal:'',
        correo_empresa:'',
        salud:'',
        contacto_emergencia:'',
        telefono_emergencia:'',
        id_departamento:'',
        id_puesto:'',
        fecha_nacimiento:'',
        fecha_registro:'',
        observaciones:'',
        estado:'',
        nit:'',
        genero:'',
        direccion:'',
        id_departamentopais:'',
        fecha_ingreso:'',
        usuario_registro:''
        // ... otros campos
    });
    const [identificaciones, setIdentificaciones] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [puestos, setPuestos] = useState([]);
    const [departamentosPais, setDepartamentosPais] = useState([]);

    const [departamentoId, setDepartamentoId] = useState(''); // Estado para el id del departamento seleccionado

    useEffect(() => {
        const token = localStorage.getItem('token'); // Obtén el token del almacenamiento local, para enviarlo a las rutas, ya que en las rutas se valida que el usuario esté autenticado
        const headers = {
            Authorization: `Bearer ${token}`
        };
        // Obtener datos para las listas desplegables
        axios.get('/api/identificaciones',{headers}).then(res => setIdentificaciones(res.data));
        axios.get('/api/departamentos',{headers}).then(res => setDepartamentos(res.data));        
        axios.get('/api/departamentos-pais',{headers}).then(res => setDepartamentosPais(res.data));
        // Obtener puestos basados en el departamento seleccionado
        if (departamentoId) {
            axios.get(`/api/puestos?id_departamento=${departamentoId}`,{headers}).then(res => setPuestos(res.data));
        } else {
            setPuestos([]); // Limpiar puestos si no hay departamento seleccionado
        }        
    }, [departamentoId]); // Dependencia en departamentoId para ejecutar el efecto cuando cambia

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
        const token = localStorage.getItem('token'); // Obtiene el token de localStorage
        axios.post('/api/empleados', empleado,{
            headers: {
                Authorization: `Bearer ${token}` // Incluye el token en el encabezado
            }
        }).then(res => {
            //Este console es importante para depurar la respuesta.
            console.log('Empleado creado:', res.data);
            // Limpiar el formulario o mostrar un mensaje de éxito
        });
    };

    //return JSX que representa el formulario, se utiliza para devolver elementos HTML o mejor dicho elementos de React desde un componente funcional
    return (
        <form onSubmit={handleSubmit}>
            <input type="text" name="codigo" value={empleado.codigo} onChange={handleChange} placeholder="Código" />
            <input type="text" name="nombre" value={empleado.nombre} onChange={handleChange} placeholder="Nombre" />
            <select name="id_identificacion" value={empleado.id_identificacion} onChange={handleChange}>
                <option value="">Seleccionar Identificación</option>
                {identificaciones.map(identificacion => (
                    <option key={identificacion.id_identificacion} value={identificacion.id_identificacion}>
                        {identificacion.nombre}
                    </option>
                ))}
            </select>
            <input type="text" name="numero_identificacion" value={empleado.numero_identificacion} onChange={handleChange} placeholder="Número de identificación" />
            <input type='text' name="telefono_casa" value={empleado.telefono_casa} onChange={handleChange} placeholder="Teléfono casa" />
            <input type='text' name="movil" value={empleado.movil} onChange={handleChange} placeholder="Celular" />
            <input type='text' name="otro_telefono" value={empleado.otro_telefono} onChange={handleChange} placeholder="Otro teléfono" />
            <input type='email' name='correo_personal' value={empleado.correo_personal} onChange={handleChange} placeholder="Correo personal" />
            <input type='email' name='correo_empresa' value={empleado.correo_empresa} onChange={handleChange} placeholder="Correo empresa" />
            <input type='text' name="salud" value={empleado.salud} onChange={handleChange} placeholder="Problemas de salud" />
            <input type='text' name="contacto_emergencia" value={empleado.contacto_emergencia} onChange={handleChange} placeholder="Contacto emergencia" />
            <input type='text' name="telefono_emergencia" value={empleado.telefono_emergencia} onChange={handleChange} placeholder="Teléfono emergencia" />
            <select name="id_departamento" value={empleado.id_departamento} onChange={handleDepartamentoChange}>
                <option value="">Seleccionar Área</option>
                {departamentos.map(departamento => (
                    <option key={departamento.id_departamento} value={departamento.id_departamento}>
                        {departamento.nombre}
                    </option>
                ))}
            </select>
            <select name="id_puesto" value={empleado.id_puesto} onChange={handleChange}>
                <option value="">Seleccionar Puesto</option>
                {puestos.map(puesto => (
                    <option key={puesto.id_puesto} value={puesto.id_puesto}>
                        {puesto.nombre}
                    </option>
                ))}
            </select>
            <input type="date" name="fecha_nacimiento" value={empleado.fecha_nacimiento} onChange={handleChange} placeholder="Fecha nacimiento" />
            <input type="date" name="fecha_registro" value={empleado.fecha_registro} onChange={handleChange} placeholder="Fecha registro" />            
            <input type="text" name="observaciones" value={empleado.observaciones} onChange={handleChange} placeholder="Observaciones" />
            <input type="text" name="nit" value={empleado.nit} onChange={handleChange} placeholder="Nit" />
            <input type="text" name="genero" value={empleado.genero} onChange={handleChange} placeholder="Género"/>
            <input type="text" name="direccion" value={empleado.direccion} onChange={handleChange} placeholder="Dirección"/>
            <select name="id_departamentopais" value={empleado.id_departamentopais} onChange={handleChange}>
                <option value="">Seleccionar Departamento</option>
                {departamentosPais.map(departamentoPais => (
                    <option key={departamentoPais.iddepartamentopais} value={departamentoPais.iddepartamentopais}>
                        {departamentoPais.nombre}
                    </option>
                ))}
            </select>
            {/* ... otros campos y listas desplegables */}
            <button type="submit">Guardar</button>
        </form>
    );
}

export default EmpleadoForm;