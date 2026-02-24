import axios from "axios";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
};

export async function getTablero(fecha, estado) {
  const res = await axios.get(`/api/planificacion/tablero/${fecha}?estado=${estado}`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function moverItem(payload) {
  const res = await axios.put(`/api/planificacion/mover`, payload, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function reordenarColumna(payload) {
  const res = await axios.put(`/api/planificacion/reordenar`, payload, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function cambiarEstado(payload) {
  const res = await axios.put(`/api/planificacion/cambiar-estado`, payload, {
    headers: authHeaders(),
  });
  return res.data;
}