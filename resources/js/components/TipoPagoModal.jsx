import React, { useState } from "react";
import {
    Modal,
    ModalBody,
    ModalHeader,
    ModalFooter,
    Button,
    Input,
    FormGroup,
    Label,
    FormFeedback,
} from "reactstrap";
import axios from "axios";
import alertify from "alertifyjs";
import { FaSave, FaTimes } from "react-icons/fa";

function TipoPagoModal({
    isOpen,
    toggle,
    onTipoPagoCreado,
    tiposExistentes = [],
}) {
    const [tipoPago, setTipoPago] = useState({ tipo: "" });
    const [error, setError] = useState(false);

    const handleChange = (e) => {
        const { value } = e.target;
        setTipoPago({ tipo: value.toUpperCase() });
        setError(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        if (!tipoPago.tipo.trim()) {
            setError(true);
            alertify.error("El tipo de pago no puede estar vacío.");
            return;
        }

        // ✅ Validar si ya existe
        const nombre = tipoPago.tipo.trim().toUpperCase();
        const yaExiste = tiposExistentes.some(
            (t) => t.tipo.trim().toUpperCase() === nombre
        );

        if (yaExiste) {
            setError(true);
            alertify.alert(
                "Duplicado",
                `Ya existe el tipo de pago "${nombre}".`
            );
            return;
        }

        try {
            const res = await axios.post("/api/tipopago", tipoPago, {
                headers,
            });
            alertify.success("Tipo de pago guardado correctamente");

            if (onTipoPagoCreado) {
                onTipoPagoCreado(res.data); // Enviar al padre el nuevo tipo
            }

            // Reset y cerrar
            setTipoPago({ tipo: "" });
            setError(false);
            toggle();
        } catch (err) {
            console.error("Error al guardar tipo de pago:", err);
            alertify.error("Error al guardar tipo de pago");
        }
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} centered>
            <ModalHeader toggle={toggle}>
                <FaSave className="me-2" />
                Nuevo tipo de pago
            </ModalHeader>
            <form onSubmit={handleSubmit}>
                <ModalBody>
                    <FormGroup>
                        <Label for="tipo">Ingrese el tipo</Label>
                        <Input
                            id="tipo"
                            name="tipo"
                            value={tipoPago.tipo}
                            onChange={handleChange}
                            invalid={error}
                            placeholder="Ej. CONTADO, CRÉDITO"
                            style={{ textTransform: "uppercase" }}
                        />
                        <FormFeedback>Este campo es obligatorio</FormFeedback>
                    </FormGroup>
                </ModalBody>
                <ModalFooter>
                    <Button type="submit" color="primary">
                        <FaSave className="me-1" /> Guardar
                    </Button>
                    <Button type="button" color="secondary" onClick={toggle}>
                        <FaTimes className="me-1" /> Cancelar
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

export default TipoPagoModal;
