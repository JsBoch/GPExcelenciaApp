import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ListaEmpleados() {    
    const [empleados, setEmpleados] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {            
            axios.get('/api/empleados', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(response => {
                    setEmpleados(response.data);
                })
                .catch(error => {
                    console.error('Error al obtener empleados:', error);
                });
        } else {
            console.error('Token de autenticación no encontrado');
        }
    }, []);

    return (
        <div>
            <h2>Lista de Empleados</h2>
            {empleados.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Correo Empresa</th>
                            <th>Dirección</th>
                            {/* Agrega más encabezados según los campos que quieras mostrar */}
                        </tr>
                    </thead>
                    <tbody>
                        {empleados.map(empleado => (
                            <tr key={empleado.id_empleado}>
                                <td>{empleado.id_empleado}</td>
                                <td>{empleado.codigo}</td>
                                <td>{empleado.nombre}</td>
                                <td>{empleado.correo_empresa}</td>
                                <td>{empleado.direccion}</td>
                                {/* Agrega más celdas según los campos que quieras mostrar */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No se encontraron empleados.</p>
            )}
        </div>
    );
}

export default ListaEmpleados;