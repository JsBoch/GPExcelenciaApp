import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';

DataTable.use(DT);

const renderVariacion = (data) => data === 'S' ? 'SI' : 'NO';

function ListaProductosPredefinidos({ isOpen, onClose, onProductoSeleccionado }) {
    const [productosPredefinidos, setProductosPredefinidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [spanishTranslation, setSpanishTranslation] = useState(null);

    useEffect(() => {
        fetch('/i18n/Spanish.json')
            .then(response => response.json())
            .then(data => setSpanishTranslation(data))
            .catch(error => console.error('Error al cargar la traducción:', error));
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.get('/api/productopredefinido', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(response => {
                    setProductosPredefinidos(response.data);
                    setLoading(false);
                })
                .catch(error => {
                    console.error('Error al obtener los productos predefinidos:', error);
                    setLoading(false);
                });
        } else {
            console.error('Token de autenticación no encontrado');
            setLoading(false);
        }
    }, []);

    const columns = [
        { data: 'titulo', title: 'Título' },
        { data: 'descripcion', title: 'Descripción',visible:false },
        { data: 'ancho', title: 'Ancho' },
        { data: 'alto', title: 'Alto' },
        { data: 'profundidad', title: 'Profundidad' },
        { data: 'cantidad', title: 'Cantidad' },
        { data: 'precio', title: 'Precio' },
        { data: 'cantidad_uno', title: 'Cantidad Uno' },
        { data: 'precio_uno', title: 'Precio Uno' },
        { data: 'cantidad_dos', title: 'Cantidad Dos' },
        { data: 'precio_dos', title: 'Precio Dos' },
        { data: 'cantidad_tres', title: 'Cantidad Tres' },
        { data: 'precio_tres', title: 'Precio Tres' },
        { data: 'cantidad_cuatro', title: 'Cantidad Cuatro' },
        { data: 'precio_cuatro', title: 'Precio Cuatro' },
        { data: 'unidad_medida', title: 'Unidad Medida' },
        { data: 'variacion', title: 'Variación', render: renderVariacion },
        { data: 'observaciones', title: 'Observaciones',visible:false },
    ];

    const options = {
        language: spanishTranslation,
    };

    const handleRowClick = (producto) => {
        onProductoSeleccionado(producto);
    };

    const slots = {
        0: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        1: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        2: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        3: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        4: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        5: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        6: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        7: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        8: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        9: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        10: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        11: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        12: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        13: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        14: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        15: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        16: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
        17: (data, row) => <div onClick={() => handleRowClick(row)} style={{ cursor: 'pointer' }}>{data}</div>,
    };

    return (
        <Modal isOpen={isOpen} toggle={onClose} centered size="lg">
            <ModalHeader toggle={onClose}>Seleccionar Producto Predefinido</ModalHeader>
            <ModalBody>
                {loading ? (
                    <p className="text-center">Cargando productos...</p>
                ) : (
                    <div className="table-responsive">
                        <DataTable
                            data={productosPredefinidos}
                            columns={columns}
                            options={options}
                            slots={slots}
                            className="table table-striped table-bordered table-hover table-sm"
                        >
                            <thead>
                                <tr>
                                    <th>Título</th>
                                    <th>Descripción</th>
                                    <th>Ancho</th>
                                    <th>Alto</th>
                                    <th>Profundidad</th>
                                    <th>Cantidad</th>
                                    <th>Precio</th>
                                    <th>Cantidad Uno</th>
                                    <th>Precio Uno</th>
                                    <th>Cantidad Dos</th>
                                    <th>Precio Dos</th>
                                    <th>Cantidad Tres</th>
                                    <th>Precio Tres</th>
                                    <th>Cantidad Cuatro</th>
                                    <th>Precio Cuatro</th>
                                    <th>Unidad Medida</th>
                                    <th>Variación</th>
                                    <th>Observaciones</th>
                                </tr>
                            </thead>
                        </DataTable>
                    </div>
                )}
            </ModalBody>
        </Modal>
    );
}

export default ListaProductosPredefinidos;