import React from "react";
import alertify from "alertifyjs";

export default function AdjuntarArchivosModal({
    isOpen,
    toggle,
    titulo = "Adjuntar archivos",
    descripcion = "Puede adjuntar archivos PDF o imágenes.",
    adjuntos,
    setAdjuntos,
    eliminados,
    setEliminados,
}) {
    if (!isOpen) return null;

    const extensionesPermitidas = ["pdf", "jpg", "jpeg", "png", "webp"];

    const handleFiles = (e) => {
        const files = Array.from(e.target.files || []);
        const nuevos = [];

        for (const file of files) {
            const extension = file.name.split(".").pop().toLowerCase();

            if (!extensionesPermitidas.includes(extension)) {
                alertify.error(`Archivo no permitido: ${file.name}`);
                continue;
            }

            if (file.size > 10 * 1024 * 1024) {
                alertify.error(`El archivo supera 10 MB: ${file.name}`);
                continue;
            }

            nuevos.push({
                idarchivo: null,
                nombre_original: file.name,
                ruta_archivo: "",
                file,
                preview: file.type.startsWith("image/")
                    ? URL.createObjectURL(file)
                    : null,
            });
        }

        setAdjuntos((prev) => [...prev, ...nuevos]);
        e.target.value = "";
    };

    const eliminarAdjunto = (index) => {
        const adjunto = adjuntos[index];

        if (adjunto.idarchivo) {
            setEliminados((prev) => [...prev, adjunto.idarchivo]);
        }

        setAdjuntos((prev) => prev.filter((_, i) => i !== index));
    };

    const verArchivo = (adjunto) => {
        if (adjunto.preview) {
            window.open(adjunto.preview, "_blank");
            return;
        }

        if (adjunto.url) {
            window.open(adjunto.url, "_blank");
            return;
        }

        alertify.warning("El archivo aún no está disponible para visualizar.");
    };

    return (
        <div
            className="modal d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{titulo}</h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={toggle}
                        />
                    </div>

                    <div className="modal-body">
                        <div className="alert alert-info">
                            {descripcion} Formatos permitidos: PDF, JPG, JPEG,
                            PNG y WEBP. Tamaño máximo: 10 MB por archivo.
                        </div>

                        <input
                            type="file"
                            className="form-control mb-3"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={handleFiles}
                        />

                        {adjuntos.length === 0 ? (
                            <div className="text-muted text-center py-4">
                                No hay archivos adjuntos.
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-bordered table-sm align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Archivo</th>
                                            <th style={{ width: "120px" }}>
                                                Tipo
                                            </th>
                                            <th style={{ width: "180px" }}>
                                                Acción
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adjuntos.map((adjunto, index) => {
                                            const extension =
                                                adjunto.nombre_original
                                                    ?.split(".")
                                                    .pop()
                                                    .toUpperCase();

                                            return (
                                                <tr key={index}>
                                                    <td>
                                                        {
                                                            adjunto.nombre_original
                                                        }
                                                    </td>
                                                    <td>{extension}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-primary me-2"
                                                            onClick={() =>
                                                                verArchivo(
                                                                    adjunto,
                                                                )
                                                            }
                                                        >
                                                            Ver
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() =>
                                                                eliminarAdjunto(
                                                                    index,
                                                                )
                                                            }
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={toggle}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}