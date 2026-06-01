import axios from "axios";

const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        Authorization: `Bearer ${token}`,
    };
};

export const pedidoProduccionService = {
    getFechaServidor() {
        return axios.get(`${import.meta.env.VITE_API_URL}/fecha-servidor`, {
            headers: getHeaders(),
        });
    },

    getUnidadesMedida() {
        return axios.get("/api/lista_unidadesmedida", {
            headers: getHeaders(),
        });
    },

    getClientes() {
        return axios.get("/api/lista_clientes", {
            headers: getHeaders(),
        });
    },

    getContactos(idcliente) {
        return axios.get(`/api/lista_contactos?idcliente=${idcliente}`, {
            headers: getHeaders(),
        });
    },

    getPedido(id) {
        return axios.get(`/api/pedidosproduccion/${id}`, {
            headers: getHeaders(),
        });
    },

    buscarCotizaciones(params) {
        return axios.get(
            "/api/pedidosproduccion/cotizaciones_pedido_produccion",
            {
                headers: getHeaders(),
                params,
            }
        );
    },

    buscarCotizacionPorNumero(numero) {
    return axios.get(
        `/api/pedidosproduccion/cotizacion/${numero}`,
        {
            headers: getHeaders(),
        }
    );
},

    crearPedido(formData) {
        return axios.post("/api/pedidosproduccion", formData, {
            headers: getHeaders(),
        });
    },

    actualizarPedido(id, formData) {
        formData.append("_method", "PUT");

        return axios.post(`/api/pedidosproduccion/${id}`, formData, {
            headers: getHeaders(),
        });
    },

    getDetalleCotizacion(idcotizacion) {
    return axios.get(
        `/api/pedidosproduccion/detalle-cotizacion/${idcotizacion}`,
        {
            headers: getHeaders(),
        }
    );
},

getMaquinasProduccion() {
    return axios.get("/api/maquinasproduccion", {
        headers: getHeaders(),
    });
},

crearMaquina(data) {
    return axios.post("/api/maquinasproduccion", data, {
        headers: getHeaders(),
    });
},

actualizarMaquina(id, data) {
    return axios.put(`/api/maquinasproduccion/${id}`, data, {
        headers: getHeaders(),
    });
},

eliminarMaquina(id) {
    return axios.delete(`/api/maquinasproduccion/${id}`, {
        headers: getHeaders(),
    });
},

getAreasTrabajo() {
    return axios.get("/api/areas",{headers: getHeaders()});
},

getResumenEnvios(idCotizacion) {
    return axios.get(`/api/cotizaciones/${idCotizacion}/nota-envio/resumen`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });
},

reimprimirNotaEnvio(idCotizacion, noEnvio) {
    return axios.post(
        `/api/cotizaciones/${idCotizacion}/nota-envio/reimprimir`,
        { no_envio: Number(noEnvio) },
        {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        },
    );
},

};