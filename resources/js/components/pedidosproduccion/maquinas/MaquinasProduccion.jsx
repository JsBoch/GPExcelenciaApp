import React, { useEffect, useState } from "react";
import alertify from "alertifyjs";

import Header from "../../Header";

import MaquinaFormModal from "./MaquinaFormModal";

import { pedidoProduccionService } from "../services/pedidoProduccionService";

export default function MaquinasProduccion() {

    const [maquinas, setMaquinas] = useState([]);

    const [showModal, setShowModal] = useState(false);

    const [maquinaEditar, setMaquinaEditar] = useState(null);

    useEffect(() => {
        cargar();
    }, []);

    const cargar = async () => {

        try {

            const res =
                await pedidoProduccionService
                    .getMaquinasProduccion();

            setMaquinas(res.data);

        } catch (error) {

            console.error(error);

            alertify.error(
                "Error al cargar máquinas"
            );
        }
    };

    const abrirNuevo = () => {

        setMaquinaEditar(null);

        setShowModal(true);
    };

    const abrirEditar = (maquina) => {

        setMaquinaEditar(maquina);

        setShowModal(true);
    };

    const guardar = async (data) => {

        try {

            if (maquinaEditar) {

                await pedidoProduccionService
                    .actualizarMaquina(
                        maquinaEditar.idmaquina,
                        data
                    );

                alertify.success(
                    "Máquina actualizada"
                );

            } else {

                await pedidoProduccionService
                    .crearMaquina(data);

                alertify.success(
                    "Máquina creada"
                );
            }

            setShowModal(false);

            cargar();

        } catch (error) {

            console.error(error);

            alertify.error(
                error?.response?.data?.message
                || "Error al guardar"
            );
        }
    };

    const eliminar = async (id) => {

        alertify.confirm(
            "Confirmar",
            "¿Eliminar máquina?",
            async () => {

                try {

                    await pedidoProduccionService
                        .eliminarMaquina(id);

                    alertify.success(
                        "Máquina eliminada"
                    );

                    cargar();

                } catch (error) {

                    console.error(error);

                    alertify.error(
                        error?.response?.data?.message
                        || "Error al eliminar"
                    );
                }
            },
            () => {}
        );
    };

    return (
        <div className="container mt-4">

            <Header title="Máquinas Producción" />

            <div className="card">

                <div className="card-body">

                    <div className="mb-3">

                        <button
                            className="btn btn-primary"
                            onClick={abrirNuevo}
                        >
                            Nueva Máquina
                        </button>
                    </div>

                    <div className="table-responsive">

                        <table className="table table-bordered">

                            <thead>

                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Código</th>
                                    <th>Descripción</th>
                                    <th width="150">
                                        Acción
                                    </th>
                                </tr>

                            </thead>

                            <tbody>

                                {maquinas.map((m) => (

                                    <tr key={m.idmaquina}>

                                        <td>{m.idmaquina}</td>

                                        <td>{m.nombre}</td>

                                        <td>{m.codigo}</td>

                                        <td>{m.descripcion}</td>

                                        <td>

                                            <div className="d-flex gap-2">

                                                <button
                                                    className="btn btn-warning btn-sm"
                                                    onClick={() =>
                                                        abrirEditar(m)
                                                    }
                                                >
                                                    Editar
                                                </button>

                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() =>
                                                        eliminar(m.idmaquina)
                                                    }
                                                >
                                                    Eliminar
                                                </button>

                                            </div>

                                        </td>
                                    </tr>
                                ))}

                            </tbody>

                        </table>
                    </div>
                </div>
            </div>

            <MaquinaFormModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onSave={guardar}
                maquina={maquinaEditar}
            />
        </div>
    );
}