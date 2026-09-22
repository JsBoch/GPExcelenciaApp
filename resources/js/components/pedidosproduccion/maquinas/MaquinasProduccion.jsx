import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import alertify from "alertifyjs";

import {
    Edit3,
    Factory,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";

import MaquinaFormModal from "./MaquinaFormModal";

import { pedidoProduccionService } from "../services/pedidoProduccionService";

import "../../../../css/maquinas-produccion.css";


export default function MaquinasProduccion() {
    const [maquinas, setMaquinas] = useState([]);

    const [showModal, setShowModal] = useState(false);

    const [maquinaEditar, setMaquinaEditar] = useState(null);

    const [loading, setLoading] = useState(true);

    const [busqueda, setBusqueda] = useState("");


    /* =========================================================
       CARGAR
       ========================================================= */

    useEffect(() => {
        cargar();
    }, []);


    const cargar = async () => {
        try {
            setLoading(true);

            const res =
                await pedidoProduccionService
                    .getMaquinasProduccion();

            setMaquinas(
                res.data || [],
            );
        } catch (error) {
            console.error(error);

            alertify.error(
                "Error al cargar máquinas",
            );
        } finally {
            setLoading(false);
        }
    };


    /* =========================================================
       NUEVO
       ========================================================= */

    const abrirNuevo = () => {
        setMaquinaEditar(null);

        setShowModal(true);
    };


    /* =========================================================
       EDITAR
       ========================================================= */

    const abrirEditar = (
        maquina,
    ) => {
        setMaquinaEditar(
            maquina,
        );

        setShowModal(true);
    };


    /* =========================================================
       GUARDAR
       ========================================================= */

    const guardar = async (
        data,
    ) => {
        try {
            if (maquinaEditar) {
                await pedidoProduccionService
                    .actualizarMaquina(
                        maquinaEditar.idmaquina,
                        data,
                    );

                alertify.success(
                    "Máquina actualizada",
                );
            } else {
                await pedidoProduccionService
                    .crearMaquina(
                        data,
                    );

                alertify.success(
                    "Máquina creada",
                );
            }

            setShowModal(false);

            await cargar();
        } catch (error) {
            console.error(error);

            alertify.error(
                error?.response?.data
                    ?.message ||
                    "Error al guardar",
            );
        }
    };


    /* =========================================================
       ELIMINAR
       ========================================================= */

    const eliminar = (
        id,
    ) => {
        alertify.confirm(
            "Confirmar",
            "¿Eliminar máquina?",
            async () => {
                try {
                    await pedidoProduccionService
                        .eliminarMaquina(
                            id,
                        );

                    alertify.success(
                        "Máquina eliminada",
                    );

                    await cargar();
                } catch (error) {
                    console.error(error);

                    alertify.error(
                        error?.response
                            ?.data
                            ?.message ||
                            "Error al eliminar",
                    );
                }
            },
            () => {},
        );
    };


    /* =========================================================
       FILTRO
       ========================================================= */

    const maquinasFiltradas =
        useMemo(() => {
            const texto =
                busqueda
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(
                        /[\u0300-\u036f]/g,
                        "",
                    )
                    .trim();

            if (!texto) {
                return maquinas;
            }

            return maquinas.filter(
                (maquina) => {
                    const nombre =
                        String(
                            maquina.nombre ??
                                "",
                        )
                            .toLowerCase()
                            .normalize(
                                "NFD",
                            )
                            .replace(
                                /[\u0300-\u036f]/g,
                                "",
                            );

                    const codigo =
                        String(
                            maquina.codigo ??
                                "",
                        )
                            .toLowerCase()
                            .normalize(
                                "NFD",
                            )
                            .replace(
                                /[\u0300-\u036f]/g,
                                "",
                            );

                    const descripcion =
                        String(
                            maquina.descripcion ??
                                "",
                        )
                            .toLowerCase()
                            .normalize(
                                "NFD",
                            )
                            .replace(
                                /[\u0300-\u036f]/g,
                                "",
                            );

                    return (
                        nombre.includes(
                            texto,
                        ) ||
                        codigo.includes(
                            texto,
                        ) ||
                        descripcion.includes(
                            texto,
                        )
                    );
                },
            );
        }, [
            maquinas,
            busqueda,
        ]);


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-machines-page">
            <div className="gp-module-card gp-machines-card">

                {/* HEADER */}

                <div className="gp-machines-header">
                    <div className="gp-machines-heading">
                        <div className="gp-machines-heading-icon">
                            <Factory
                                size={21}
                            />
                        </div>

                        <div>
                            <div className="gp-module-meta">
                                CATÁLOGOS · PRODUCCIÓN
                            </div>

                            <h1>
                                Máquinas de producción
                            </h1>

                            <p>
                                Administra las máquinas
                                disponibles para los
                                procesos de producción.
                            </p>
                        </div>
                    </div>


                    <button
                        type="button"
                        className="gp-machines-new"
                        onClick={
                            abrirNuevo
                        }
                    >
                        <Plus
                            size={16}
                        />

                        Nueva máquina
                    </button>
                </div>


                {/* BUSCADOR */}

                <div className="gp-machines-search-section">
                    <div className="gp-machines-search-heading">
                        <div>
                            <strong>
                                Buscar máquina
                            </strong>

                            <span>
                                Filtra por nombre,
                                código o descripción.
                            </span>
                        </div>

                        <span className="gp-machines-count">
                            {
                                maquinasFiltradas.length
                            }{" "}
                            {maquinasFiltradas.length ===
                            1
                                ? "registro"
                                : "registros"}
                        </span>
                    </div>


                    <div className="gp-machines-search">
                        <Search
                            size={16}
                        />

                        <input
                            type="text"
                            value={
                                busqueda
                            }
                            placeholder="Ej. IMPRESORA, CNC, CORTE..."
                            onChange={(e) =>
                                setBusqueda(
                                    e.target
                                        .value,
                                )
                            }
                        />

                        {busqueda && (
                            <button
                                type="button"
                                onClick={() =>
                                    setBusqueda(
                                        "",
                                    )
                                }
                                title="Limpiar búsqueda"
                            >
                                <X
                                    size={15}
                                />
                            </button>
                        )}
                    </div>
                </div>


                {/* TABLA */}

                <div className="gp-machines-body">
                    <div className="gp-machines-table-header">
                        <div>
                            <h2>
                                Listado de máquinas
                            </h2>

                            <p>
                                Edita o elimina las
                                máquinas registradas.
                            </p>
                        </div>
                    </div>


                    {loading ? (
                        <div className="gp-machines-loading">
                            Cargando máquinas...
                        </div>
                    ) : maquinasFiltradas.length ===
                      0 ? (
                        <div className="gp-machines-empty">
                            <Factory
                                size={28}
                            />

                            <strong>
                                No se encontraron máquinas
                            </strong>

                            <span>
                                No existen registros o
                                ningún resultado coincide
                                con la búsqueda.
                            </span>
                        </div>
                    ) : (
                        <div className="gp-machines-table-wrapper">
                            <table className="gp-machines-table">
                                <thead>
                                    <tr>
                                        <th className="gp-machines-col-id">
                                            ID
                                        </th>

                                        <th>
                                            Nombre
                                        </th>

                                        <th>
                                            Código
                                        </th>

                                        <th>
                                            Descripción
                                        </th>

                                        <th className="gp-machines-col-actions">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {maquinasFiltradas.map(
                                        (
                                            maquina,
                                        ) => (
                                            <tr
                                                key={
                                                    maquina.idmaquina
                                                }
                                            >
                                                <td>
                                                    <span className="gp-machines-id">
                                                        {
                                                            maquina.idmaquina
                                                        }
                                                    </span>
                                                </td>

                                                <td>
                                                    <strong className="gp-machines-name">
                                                        {
                                                            maquina.nombre
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {maquina.codigo ? (
                                                        <span className="gp-machines-code">
                                                            {
                                                                maquina.codigo
                                                            }
                                                        </span>
                                                    ) : (
                                                        <span className="gp-machines-muted">
                                                            —
                                                        </span>
                                                    )}
                                                </td>

                                                <td>
                                                    <span className="gp-machines-description">
                                                        {maquina.descripcion ||
                                                            "Sin descripción"}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="gp-machines-actions">

                                                        <button
                                                            type="button"
                                                            className="gp-machines-action gp-machines-edit"
                                                            title="Editar máquina"
                                                            onClick={() =>
                                                                abrirEditar(
                                                                    maquina,
                                                                )
                                                            }
                                                        >
                                                            <Edit3
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                        </button>


                                                        <button
                                                            type="button"
                                                            className="gp-machines-action gp-machines-delete"
                                                            title="Eliminar máquina"
                                                            onClick={() =>
                                                                eliminar(
                                                                    maquina.idmaquina,
                                                                )
                                                            }
                                                        >
                                                            <Trash2
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>


            {/* MODAL */}

            <MaquinaFormModal
                show={
                    showModal
                }
                onClose={() =>
                    setShowModal(
                        false,
                    )
                }
                onSave={
                    guardar
                }
                maquina={
                    maquinaEditar
                }
            />
        </div>
    );
}