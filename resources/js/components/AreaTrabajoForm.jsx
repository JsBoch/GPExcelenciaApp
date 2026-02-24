import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link, useParams, useNavigate } from "react-router-dom";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";
import { FaSave, FaSearch, FaBroom } from "react-icons/fa";
import Header from "./Header";
import FormSection from "./FormSection";

function AreaTrabajoForm({ onClose }) {
    const { id } = useParams(); // /area_trabajo/editar/:id
    const navigate = useNavigate();

    const [isEditMode, setIsEditMode] = useState(false);

    const [area, setArea] = useState({
        nombre: "",
        descripcion: "",
    });

    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        if (id) {
            setIsEditMode(true);
            axios
                .get(`/api/area_trabajo/${id}`, { headers })
                .then((res) => {
                    const data = res.data || {};
                    setArea({
                        nombre: data.nombre || "",
                        descripcion: data.descripcion || "",
                    });
                })
                .catch(() => {
                    alertify.error("Error cargando el área");
                });
        } else {
            setIsEditMode(false);
            limpiarCampos();
        }
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setArea((prev) => ({
            ...prev,
            [name]: name === "nombre" ? value.toUpperCase() : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Validación obligatoria
        const faltantes = [];
        if (!area.nombre || area.nombre.trim() === "") faltantes.push("Nombre");

        if (faltantes.length > 0) {
            alertify.alert(
                "DATOS OBLIGATORIOS",
                `Por favor complete: ${faltantes.join(", ")}`
            );
            return;
        }

        if (isEditMode && id) {
            axios
                .put(`/api/area_trabajo/${id}`, area, { headers })
                .then(() => {
                    alertify.success("Área actualizada correctamente");
                    if (typeof onClose === "function") onClose();
                })
                .catch((error) => {
                    const msg =
                        error?.response?.data?.message ||
                        "Error actualizando el área";
                    alertify.alert("ERROR", msg);
                });
        } else {
            axios
                .post(`/api/area_trabajo`, area, { headers })
                .then(() => {
                    alertify.success("Área creada correctamente");
                    limpiarCampos();
                    if (typeof onClose === "function") onClose();
                })
                .catch((error) => {
                    const msg =
                        error?.response?.data?.message ||
                        "Error creando el área";
                    alertify.alert("ERROR", msg);
                });
        }
    };

    const limpiarCampos = () => {
        setArea({
            nombre: "",
            descripcion: "",
        });
    };

    return (
        <div className="mt-4">
            <Header title={isEditMode ? "Editar Área de Trabajo" : "Registrar Área de Trabajo"} />

            <div className="card shadow p-4">
                <div className="card shadow p-3">
                    <div className="card-body card-form">
                        <form onSubmit={handleSubmit}>
                            <FormSection title="Datos del área">
                                <div className="row g-2">
                                    <div className="col-md-5">
                                        <label className="form-label">Nombre</label>
                                        <input
                                            type="text"
                                            name="nombre"
                                            value={area.nombre}
                                            onChange={handleChange}
                                            placeholder="CARPINTERIA"
                                            className="form-control form-control-sm campo-obligatorio-fondo"
                                        />
                                    </div>

                                    <div className="col-md-7">
                                        <label className="form-label">Descripción</label>
                                        <input
                                            type="text"
                                            name="descripcion"
                                            value={area.descripcion}
                                            onChange={handleChange}
                                            placeholder="Opcional"
                                            className="form-control form-control-sm"
                                        />
                                    </div>
                                </div>
                            </FormSection>

                            <div className="mt-4 p-3 border rounded shadow-sm bg-light" style={{ borderColor: "#ddd" }}>
                                <div className="d-flex flex-wrap gap-2 justify-content-between">
                                    <button
                                        type="submit"
                                        className="btn btn-sm btn-guardar d-flex align-items-center justify-content-center gap-2 flex-fill"
                                        style={{ minWidth: "150px" }}
                                    >
                                        <FaSave />
                                        {isEditMode ? "ACTUALIZAR" : "GUARDAR"}
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-limpiar d-flex align-items-center justify-content-center gap-2 flex-fill"
                                        style={{ minWidth: "150px", color: "#000", border: "1px solid #ccc" }}
                                        onClick={limpiarCampos}
                                    >
                                        <FaBroom /> LIMPIAR
                                    </button>

                                    {typeof onClose === "function" && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm d-flex align-items-center justify-content-center gap-2"
                                            onClick={onClose}
                                        >
                                            CANCELAR
                                        </button>
                                    )}

                                    <Link
                                        to="/area_trabajo/lista"
                                        className="btn btn-sm btn-consultar d-flex align-items-center justify-content-center gap-2 flex-fill"
                                        style={{ minWidth: "150px" }}
                                    >
                                        <FaSearch /> CONSULTAR
                                    </Link>
                                </div>
                            </div>
                        </form>

                        {!onClose && (
                            <div className="mt-3">
                                <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(-1)}>
                                    Volver
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AreaTrabajoForm;