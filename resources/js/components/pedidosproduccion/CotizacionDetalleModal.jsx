import React from "react";
import {
    Modal,
    ModalBody,
    ModalHeader,
    ModalFooter,
    Button,
} from "reactstrap";

import { FaImage } from "react-icons/fa";

export default function CotizacionDetalleModal({
    isOpen,
    toggle,
    detalles,
    onVerImagen,
}) {
    return (
        <Modal
            isOpen={isOpen}
            toggle={toggle}
            centered
            size="xl"
        >
            <ModalHeader toggle={toggle}>
                Detalle de Cotización
            </ModalHeader>

            <ModalBody>

                <div className="table-responsive pp-table-wrapper">
                    <table className="table table-hover table-bordered align-middle">
                        <thead>
                            <tr>
                                <th>Descripción</th>
                                <th>UM</th>
                                <th>Cantidad</th>
                                <th>Ancho</th>
                                <th>Alto</th>
                                <th>Prof.</th>
                                <th>M2</th>
                                <th>Foto</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>

                            {detalles.length > 0 ? (
                                detalles.map((d) => (
                                    <tr key={d.iddetallecotizacion}>
                                        <td>{d.descripcion}</td>
                                        <td>{d.unidad_medida}</td>
                                        <td>{d.cantidad}</td>
                                        <td>{d.ancho}</td>
                                        <td>{d.alto}</td>
                                        <td>{d.profundidad}</td>
                                        <td>{d.m2}</td>

                                        <td>
                                            {d.incluye_foto == 1
                                                ? "SI"
                                                : "NO"}
                                        </td>

                                        <td>
                                            {d.imagen ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() =>
                                                        onVerImagen(d.imagen)
                                                    }
                                                >
                                                    <FaImage /> Ver Imagen
                                                </button>
                                            ) : (
                                                <span className="text-muted">
                                                    Sin imagen
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan="9"
                                        className="text-center"
                                    >
                                        Sin detalles
                                    </td>
                                </tr>
                            )}

                        </tbody>
                    </table>
                </div>

            </ModalBody>

            <ModalFooter>
                <Button color="secondary" onClick={toggle}>
                    Cerrar
                </Button>
            </ModalFooter>
        </Modal>
    );
}