import React from "react";
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from "reactstrap";

export default function ImagenDetalleModal({
    isOpen,
    toggle,
    selectedImageUrl,
}) {
    return (
        <Modal isOpen={isOpen} toggle={toggle} centered size="lg">
            <ModalHeader toggle={toggle}>
                Imagen del Detalle
            </ModalHeader>

            <ModalBody>
                {selectedImageUrl ? (
                    <img
                        src={selectedImageUrl}
                        alt="Imagen del Detalle"
                        style={{ maxWidth: "100%", height: "auto" }}
                    />
                ) : (
                    <p>Este detalle no tiene una imagen asociada.</p>
                )}
            </ModalBody>

            <ModalFooter>
                <Button color="secondary" onClick={toggle}>
                    Cerrar
                </Button>
            </ModalFooter>
        </Modal>
    );
}