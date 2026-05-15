import React from "react";
import Select from "react-select";
import { FaSearch } from "react-icons/fa";
import FormSection from "../FormSection";
import DetalleGrid from "./DetalleGrid";

export default function PedidoProduccionForm({
    pedidoProduccion,
    clienteOptions,
    contactos,
    clienteId,
    detalles,
    setDetalles,
    unidadesMedida,
    maquinasProduccion,
    handleClienteChange,
    handleChange,
    handleAgregarContacto,
    toggleCotizacionModal,
    handleVerDetalleCotizacion,
    handleBuscarCotizacionPorNumero,
    handleCotizacionKeyDown,
}) {
    return (
        <>
            <FormSection title="Datos generales">
                <div className="row g-3 align-items-end mb-4">
                    <div className="col-md-3">
                        <label className="form-label pp-label">
                            No. Cotización
                        </label>
                        <input
                            type="number"
                            name="nocotizacion"
                            value={pedidoProduccion.nocotizacion || ""}
                            onChange={handleChange}
                            onKeyDown={handleCotizacionKeyDown}
                            className="form-control form-control-sm pp-input"
                            placeholder="Ingrese número"
                        />
                    </div>

                    <div className="col-md-2 d-flex align-items-end">
                        <button
                            type="button"
                            className="btn btn-sm w-100 pp-btn-cotizacion"
                            onClick={toggleCotizacionModal}
                        >
                            <FaSearch /> Buscar Cotizacion
                        </button>
                    </div>

                    <div className="col-md-5">
                        <label className="form-label pp-label">Cliente</label>
                        <Select
                            value={clienteOptions.find(
                                (option) =>
                                    Number(option.value) ===
                                    Number(pedidoProduccion.idcliente),
                            )}
                            onChange={handleClienteChange}
                            options={clienteOptions}
                            isSearchable
                            placeholder="Seleccionar Cliente"
                            className="form-control form-control-sm campo-obligatorio-fondo"
                        />
                    </div>

                    <div className="col-md-5">
                        <label className="form-label pp-label">Contacto</label>

                        <div className="d-flex gap-2 align-items-center">
                            <select
                                name="idcontacto"
                                value={pedidoProduccion.idcontacto}
                                onChange={handleChange}
                                className="form-select form-select-sm pp-select"
                                disabled={!clienteId}
                            >
                                <option value="">Seleccionar Contacto</option>

                                {contactos.map((contacto) => (
                                    <option
                                        key={contacto.id_contactocliente}
                                        value={contacto.id_contactocliente}
                                    >
                                        {contacto.nombre}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                className="pp-btn-add-contact"
                                onClick={handleAgregarContacto}
                                title="Agregar contacto"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                <div className="row g-3 mb-3">
                    <div className="col-md-3">
                        <label className="form-label pp-label">
                            Fecha Pedido
                        </label>
                        <input
                            type="date"
                            name="fecha_pedido"
                            value={pedidoProduccion.fecha_pedido}
                            onChange={handleChange}
                            className="form-control form-control-sm pp-input"
                            required
                        />
                    </div>

                    <div className="col-md-3">
                        <label className="form-label pp-label">
                            Fecha Entrega
                        </label>
                        <input
                            type="date"
                            name="fecha_entrega"
                            value={pedidoProduccion.fecha_entrega}
                            onChange={handleChange}
                            className="form-control form-control-sm pp-input"
                            required
                        />
                    </div>

                    <div className="col-md-6">
                        <label className="form-label pp-label">Trabajo</label>
                        <input
                            type="text"
                            name="trabajo"
                            value={pedidoProduccion.trabajo}
                            onChange={handleChange}
                            placeholder="Nombre del trabajo o proyecto"
                            className="form-control form-control-sm pp-input"
                        />
                    </div>
                </div>

                <div className="row g-2 mb-4">
                    <div className="col-md-12">
                        <label className="form-label pp-label">
                            Dirección entrega
                        </label>
                        <input
                            type="text"
                            name="direccion_entrega"
                            value={pedidoProduccion.direccion_entrega}
                            onChange={handleChange}
                            placeholder="Dirección de entrega"
                            className="form-control form-control-sm campo-obligatorio-fondo"
                        />
                    </div>
                </div>
            </FormSection>

            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="pp-section-title">Detalle de Cotización</div>

                <button
                    type="button"
                    className="btn btn-sm pp-btn-cotizacion"
                    onClick={handleVerDetalleCotizacion}
                >
                    Ver detalle cotización
                </button>
            </div>
            <FormSection title="Tareas del Pedido (tipo Excel)">
                <DetalleGrid
                    detalles={detalles}
                    setDetalles={setDetalles}
                    unidadesMedida={unidadesMedida}
                    maquinasProduccion={maquinasProduccion}
                />
            </FormSection>
        </>
    );
}
