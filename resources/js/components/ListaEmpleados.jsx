import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap 5
import { Link } from 'react-router-dom';

DataTable.use(DT);

function ListaEmpleados() {
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null); // Estado para la traducción

    useEffect(() => {
        // Carga la traducción desde public/i18n/Spanish.json
        fetch('/i18n/Spanish.json')
            .then(response => response.json())
            .then(data => setSpanishTranslation(data))
            .catch(error => console.error('Error al cargar la traducción:', error));

        // ... (tu código existente para cargar datos)
    }, []);

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
                    setLoading(false);
                })
                .catch(error => {
                    console.error('Error al obtener empleados:', error);
                    setLoading(false);
                });
        } else {
            console.error('Token de autenticación no encontrado');
            setLoading(false);
        }
    }, []);

    if (loading) {
        return <p>Cargando empleados...</p>;
    }

    const columns = [
        { data: 'id_empleado', title: 'ID' },
        { data: 'codigo', title: 'Código' },
        { data: 'nombre', title: 'Nombre' },
        { data: 'correo_empresa', title: 'Correo' },
        { data: 'direccion', title: 'Dirección' },
      ];

      const options = {
        language: spanishTranslation, // Agrega la traducción aquí
    };
    return (
        <div class= "container">
        
        <DataTable 
        data={empleados} 
        columns={columns} 
        options={options} 
        className="table table-striped table-bordered" // Aplicar clases de Bootstrap 5
        >
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Dirección</th>
                </tr>
            </thead>
        </DataTable>
        <Link to="/empleados/crear" className="btn btn-secondary ms-2">Registro</Link>
        <Link to="/Home" className="btn btn-secondary mt-3">Volver a Inicio</Link>
        </div>
    );
}

export default ListaEmpleados;