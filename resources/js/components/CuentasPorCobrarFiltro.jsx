import React, { useState, useEffect } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import axios from "axios";
import alertify from "alertifyjs";
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from "reactstrap";
import { get } from "jquery";
import Header from "./Header";

const CuentasPorCobrarFiltro = () => {
    // const getTodayFormatted = () => {
    //     const today = new Date();
    //     const yyyy = today.getFullYear();
    //     const mm = String(today.getMonth() + 1).padStart(2, "0");
    //     const dd = String(today.getDate()).padStart(2, "0");
    //     return `${yyyy}-${mm}-${dd}`; // formato para input[type=date]
    // };

    const [clientes, setClientes] = useState([]);
    const [idCliente, setIdCliente] = useState("");
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [pdfUrl, setPdfUrl] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        axios
            .get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setFechaInicio(res.data.fecha);
                setFechaFin(res.data.fecha);                
            })
            .catch(() => {
                // fallback por si falla
                const today = new Date().toISOString().split("T")[0];
                setFechaInicio(today);
                setFechaFin(today);                
            });
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        axios
            .get("/api/clientes", {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setClientes(res.data))
            .catch(() => alertify.error("Error al cargar clientes"));
    }, []);

    const handleGenerar = async () => {
        if (!idCliente || !fechaInicio || !fechaFin) {
            return alertify.error("Todos los campos son obligatorios");
        }

        const token = localStorage.getItem("token");

        try {
            // const response = await fetch(
            //     `/api/cuentas-por-cobrar/estado-cuenta/pdf?idcliente=${idCliente}&fecha_inicio=${fechaInicio}&fecha_final=${fechaFin}`,
            //     {
            //         headers: {
            //             Authorization: `Bearer ${token}`,
            //         },
            //     }
            // );
            const response = await fetch(
                `/api/cuentas-por-cobrar/estado-cuenta-con-recibos/pdf?idcliente=${idCliente}&fecha_inicio=${fechaInicio}&fecha_final=${fechaFin}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (error) {
            alertify.error("Error al generar PDF");
        }
    };

    const handleSaldos = async () => {
        if (!idCliente || !fechaInicio || !fechaFin) {
            return alertify.error("Todos los campos son obligatorios");
        }

        const token = localStorage.getItem("token");

        try {            
            const response = await fetch(
                `/api/cuentas-por-cobrar/saldos/pdf?idcliente=${idCliente}&fecha_inicio=${fechaInicio}&fecha_final=${fechaFin}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (error) {
            alertify.error("Error al generar PDF");
        }
    };

    return (
        <div className="container mt-4">
            <Header title={"Estado de Cuenta"} />

            <div className="row g-2 mb-3 mt-3">
                <div className="col-md-4">
                    <label className="form-label">Cliente</label>
                    <select
                        className="form-select"
                        value={idCliente}
                        onChange={(e) => setIdCliente(e.target.value)}
                    >
                        <option value="">Seleccione</option>
                        {clientes.map((c) => (
                            <option key={c.idcliente} value={c.idcliente}>
                                {c.nombre}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-md-3">
                    <label className="form-label">Fecha Inicio</label>
                    <input
                        type="date"
                        className="form-control"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                    />
                </div>
                <div className="col-md-3">
                    <label className="form-label">Fecha Final</label>
                    <input
                        type="date"
                        className="form-control"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                    />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                    <button
                        className="btn btn-primary w-100"
                        onClick={handleGenerar}
                    >
                        Generar PDF
                    </button>
                </div>
                <div className="col-md-2 d-flex align-items-end">
                    <button
                        className="btn btn-primary w-100"
                        onClick={handleSaldos}
                    >
                        Saldos
                    </button>
                </div>
            </div>

            <Modal
                isOpen={!!pdfUrl}
                toggle={() => setPdfUrl(null)}
                size="xl"
                centered
                backdrop="static"
            >
                <ModalHeader toggle={() => setPdfUrl(null)}>
                    Estado de Cuenta
                </ModalHeader>
                <ModalBody style={{ height: "80vh" }}>
                    <iframe
                        src={pdfUrl}
                        width="100%"
                        height="100%"
                        style={{ border: "none" }}
                        title="PDF Viewer"
                    />
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setPdfUrl(null)}>
                        Cerrar
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default CuentasPorCobrarFiltro;
