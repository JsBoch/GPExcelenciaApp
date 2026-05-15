import React, { useEffect, useState } from "react";

export default function MaquinaFormModal({
    show,
    onClose,
    onSave,
    maquina,
}) {

    const [form, setForm] = useState({
        nombre: "",
        codigo: "",
        descripcion: "",
    });

    useEffect(() => {

        if (maquina) {

            setForm({
                nombre: maquina.nombre || "",
                codigo: maquina.codigo || "",
                descripcion: maquina.descripcion || "",
            });

        } else {

            setForm({
                nombre: "",
                codigo: "",
                descripcion: "",
            });
        }

    }, [maquina]);

    if (!show) return null;

    const handleChange = (e) => {

        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = () => {
        onSave(form);
    };

    return (
        <div className="modal d-block" tabIndex="-1">
            <div className="modal-dialog">
                <div className="modal-content">

                    <div className="modal-header">
                        <h5 className="modal-title">
                            {maquina
                                ? "Editar Máquina"
                                : "Nueva Máquina"}
                        </h5>

                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                        />
                    </div>

                    <div className="modal-body">

                        <div className="mb-3">
                            <label>Nombre</label>

                            <input
                                type="text"
                                className="form-control"
                                name="nombre"
                                value={form.nombre}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="mb-3">
                            <label>Código</label>

                            <input
                                type="text"
                                className="form-control"
                                name="codigo"
                                value={form.codigo}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="mb-3">
                            <label>Descripción</label>

                            <textarea
                                className="form-control"
                                name="descripcion"
                                value={form.descripcion}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">

                        <button
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>

                        <button
                            className="btn btn-primary"
                            onClick={handleSubmit}
                        >
                            Guardar
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
}