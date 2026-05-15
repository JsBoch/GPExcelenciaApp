import React from "react";
import { Link } from "react-router-dom";
import { FaSave, FaBroom, FaSearch } from "react-icons/fa";

export default function PedidoProduccionActions({
    id,
    limpiarCampos,
    toggleAreasModal,
}) {
    return (
        <div className="mt-4 pp-actions-container">
            <div className="d-flex flex-wrap gap-2 justify-content-between">
                <button
                    type="button"
                    className="btn btn-info"
                    onClick={toggleAreasModal}
                >
                    Asignar Áreas
                </button>
                
                <button
                    type="submit"
                    className="btn pp-btn pp-btn-save d-flex align-items-center justify-content-center gap-2 flex-fill"
                    style={{ minWidth: "150px" }}
                >
                    <FaSave /> {id ? "ACTUALIZAR" : "GUARDAR"}
                </button>

                <button
                    type="button"
                    className="btn pp-btn pp-btn-clean d-flex align-items-center justify-content-center gap-2 flex-fill"
                    style={{
                        minWidth: "150px",
                        color: "#000",
                        border: "1px solid #ccc",
                    }}
                    onClick={limpiarCampos}
                >
                    <FaBroom /> LIMPIAR
                </button>

                <Link
                    to="/pedidosproduccion/lista"
                    className="btn pp-btn pp-btn-search d-flex align-items-center justify-content-center gap-2 flex-fill"
                    style={{ minWidth: "150px" }}
                >
                    <FaSearch /> CONSULTAR
                </Link>
            </div>
        </div>
    );
}
