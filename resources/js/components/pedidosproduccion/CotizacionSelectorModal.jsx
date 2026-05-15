import React from "react";
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from "reactstrap";
import { FaCheckSquare } from "react-icons/fa";

export default function CotizacionSelectorModal({
    isOpen,
    toggle,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    estadoCotizacion,
    setEstadoCotizacion,
    cotizaciones,
    onBuscar,
    onSeleccionar,
}) {
    return (
        <Modal isOpen={isOpen} toggle={toggle} centered size="xl">
            <ModalHeader toggle={toggle}>
                Seleccionar Cotización
            </ModalHeader>

            <ModalBody>
                <div className="row mb-3">
                    <div className="col-md-3">
                        <label>Fecha Inicio</label>
                        <input
                            type="date"
                            className="form-control form-control-sm"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                        />
                    </div>

                    <div className="col-md-3">
                        <label>Fecha Fin</label>
                        <input
                            type="date"
                            className="form-control form-control-sm"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                        />
                    </div>

                    <div className="col-md-2">
                        <label>Estado</label>
                        <select
                            className="form-select form-select-sm"
                            value={estadoCotizacion}
                            onChange={(e) => setEstadoCotizacion(e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="1">Registro</option>
                            <option value="3">Costeada</option>
                            <option value="4">Pre-facturación</option>
                        </select>
                    </div>

                    <div className="col-md-4 d-flex align-items-end">
                        <button
                            type="button"
                            className="btn btn-sm btn-primary w-100"
                            onClick={onBuscar}
                        >
                            Consultar
                        </button>
                    </div>
                </div>

                <div
                    className="table-responsive"
                    style={{ maxHeight: "400px", overflowY: "auto" }}
                >
                    <table className="table table-bordered table-hover table-sm">
                        <thead className="table-light">
                            <tr>
                                <th>Número</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Contacto</th>
                                <th>Trabajo</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {cotizaciones.length > 0 ? (
                                cotizaciones.map((cot) => (
                                    <tr key={cot.idcotizacion}>
                                        <td>{cot.nocotizacion}</td>
                                        <td>{cot.fecha_cotizacion?.split(" ")[0]}</td>
                                        <td>{cot.cliente}</td>
                                        <td>{cot.contacto}</td>
                                        <td>{cot.trabajo}</td>
                                        <td>{cot.total}</td>
                                        <td>{cot.estado_texto}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-success"
                                                onClick={() => onSeleccionar(cot)}
                                            >
                                                <FaCheckSquare />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center">
                                        Sin resultados
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