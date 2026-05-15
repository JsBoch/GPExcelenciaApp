import React from "react";
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from "reactstrap";
import ContactoClienteForm from "../ContactoClienteForm";

export default function ContactoClienteModal({
    isOpen,
    toggle,
    clienteId,
    onContactCreated,
}) {
    return (
        <Modal isOpen={isOpen} toggle={toggle} centered size="xl">
            <ModalHeader toggle={toggle}>
                Crear Nuevo Contacto
            </ModalHeader>

            <ModalBody>
                <ContactoClienteForm
                    clienteId={clienteId}
                    onClose={toggle}
                    onContactCreated={onContactCreated}
                />
            </ModalBody>

            <ModalFooter>
                <Button color="secondary" onClick={toggle}>
                    Cerrar
                </Button>
            </ModalFooter>
        </Modal>
    );
}