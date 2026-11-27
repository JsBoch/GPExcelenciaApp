import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import axios from "axios";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Pagination,
    Paper,
    Select,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    CheckCircle2,
    ClipboardList,
    FileSearch,
    Plus,
    RefreshCw,
    ShieldCheck,
    XCircle,
    Printer,
} from "lucide-react";

// Ajusta esta constante solo si tus rutas Laravel tienen otro prefijo.
const API = "/api/ajustes-ventas";
// Acepta el numero comercial con o sin el prefijo CT; nunca interpreta el ID interno.
const numeroCotizacion = (valor) => {
    const texto = String(valor ?? "")
        .trim()
        .toUpperCase();
    const coincidencia = /^(?:CT\s*)?([1-9]\d*)$/.exec(texto);
    return coincidencia ? coincidencia[1] : null;
};
// Cliente aislado: no altera los interceptores de los demás módulos.
const ajustesApi = axios.create({ headers: { Accept: "application/json" } });
ajustesApi.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
    return config;
});
const ESTADOS = ["TODOS", "SOLICITADO", "APROBADO", "RECHAZADO"];
const COLORS = { blue: "#0B477A", green: "#2EAF3E", yellow: "#F5BC19" };

const hoy = () => {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
};
const inicioMes = () => `${hoy().slice(0, 7)}-01`;
const dinero = (valor) => {
    const n = Number(valor ?? 0);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("es-GT", {
        style: "currency",
        currency: "GTQ",
    }).format(n);
};
const fecha = (valor) =>
    valor ? String(valor).slice(0, 10).split("-").reverse().join("/") : "—";
const errorApi = (e) => {
    const data = e?.response?.data;
    if (data?.errors) {
        const msg = Object.values(data.errors).flat().join(" ");
        if (msg) return msg;
    }
    if (e?.response?.status === 403)
        return "No tienes permiso para realizar esta operación.";
    if (e?.response?.status === 401)
        return "Sesión no autenticada. Inicia sesión nuevamente.";
    return data?.message || "No fue posible completar la operación.";
};
const chipEstado = (estado) => {
    const color =
        { APROBADO: "success", RECHAZADO: "error", SOLICITADO: "warning" }[
            estado
        ] || "default";
    return (
        <Chip
            label={estado || "—"}
            size="small"
            color={color}
            variant="outlined"
        />
    );
};
const compararDecimal = (a, b) =>
    Math.round(Number(a) * 100) - Math.round(Number(b) * 100);

function ResumenCard({ titulo, valor, color = COLORS.blue }) {
    return (
        <Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
            <CardContent sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    {titulo}
                </Typography>
                <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ color, mt: 0.5 }}
                >
                    {valor}
                </Typography>
            </CardContent>
        </Card>
    );
}

export default function AjustesVentas() {
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("md"));
    const [tab, setTab] = useState(0);
    const [permisos, setPermisos] = useState(null);
    const [cargandoPermisos, setCargandoPermisos] = useState(true);
    const [notice, setNotice] = useState(null);
    const notify = useCallback(
        (message, severity = "success") => setNotice({ message, severity }),
        [],
    );
    useEffect(() => {
        let mounted = true;
        ajustesApi
            .get(`${API}/permisos`)
            .then(({ data }) => {
                if (mounted) setPermisos(data);
            })
            .catch((e) => {
                if (mounted) notify(errorApi(e), "error");
            })
            .finally(() => {
                if (mounted) setCargandoPermisos(false);
            });
        return () => {
            mounted = false;
        };
    }, [notify]);
    const puede = (clave) => permisos?.[clave] === true;
    useEffect(() => {
        if (!permisos) return;
        if (permisos.consultar) setTab(0);
        else if (permisos.registrar) setTab(1);
        else if (permisos.reportes) setTab(2);
    }, [permisos]);

    const [filtro, setFiltro] = useState({ estado: "TODOS", nocotizacion: "" });
    const [lista, setLista] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loadingLista, setLoadingLista] = useState(false);
    const [resumen, setResumen] = useState(null);
    const [periodo, setPeriodo] = useState({
        fecha_inicio: inicioMes(),
        fecha_fin: hoy(),
    });
    const [loadingResumen, setLoadingResumen] = useState(false);

    const [idBusqueda, setIdBusqueda] = useState("");
    const [contexto, setContexto] = useState(null);
    const [loadingContexto, setLoadingContexto] = useState(false);
    const [tipo, setTipo] = useState("REDUCCION");
    const [motivo, setMotivo] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [pedidoId, setPedidoId] = useState("");
    const [lineas, setLineas] = useState([]);
    const [saving, setSaving] = useState(false);
    // Se conserva el UUID en reintentos; solo se reemplaza tras una creación exitosa.
    const uuidRef = useRef(null);
    const uuidNuevo = () => {
        if (
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
        ) {
            return crypto.randomUUID();
        }
        throw new Error(
            "El navegador debe admitir crypto.randomUUID (HTTPS o localhost).",
        );
    };

    const [detalle, setDetalle] = useState(null);
    const [loadingDetalle, setLoadingDetalle] = useState(false);
    const [resolviendo, setResolviendo] = useState(false);
    const [accion, setAccion] = useState(null); // { tipo: 'aprobar'|'rechazar', id }
    const [comentario, setComentario] = useState("");

    const cargarLista = useCallback(
        async (numero = 1) => {
            setLoadingLista(true);
            try {
                const params = { page: numero, per_page: 25 };
                if (filtro.estado !== "TODOS") params.estado = filtro.estado;
                if (filtro.nocotizacion.trim()) {
                    const numero = numeroCotizacion(filtro.nocotizacion);
                    if (!numero) {
                        notify(
                            "Ingresa un número de cotización válido (ejemplo: CT8236).",
                            "warning",
                        );
                        return;
                    }
                    params.nocotizacion = numero;
                }
                const { data } = await ajustesApi.get(API, { params });
                setLista(data.data || []);
                setPage(Number(data.current_page || 1));
                setLastPage(Number(data.last_page || 1));
            } catch (e) {
                notify(errorApi(e), "error");
            } finally {
                setLoadingLista(false);
            }
        },
        [filtro.estado, filtro.nocotizacion, notify],
    );

    const cargarResumen = useCallback(async () => {
        if (periodo.fecha_fin < periodo.fecha_inicio) {
            notify(
                "La fecha final debe ser posterior o igual a la inicial.",
                "warning",
            );
            return;
        }
        setLoadingResumen(true);
        try {
            const { data } = await ajustesApi.get(`${API}/resumen`, {
                params: periodo,
            });
            setResumen(data);
        } catch (e) {
            notify(errorApi(e), "error");
        } finally {
            setLoadingResumen(false);
        }
    }, [periodo, notify]);

    useEffect(() => {
        if (puede("consultar")) cargarLista(1);
    }, [cargarLista, permisos]);
    useEffect(() => {
        if (tab === 2 && puede("reportes")) cargarResumen();
    }, [tab, cargarResumen, permisos]);

    const buscarCotizacion = async () => {
        const numero = numeroCotizacion(idBusqueda);
        if (!numero) {
            notify(
                "Ingresa un número de cotización válido (ejemplo: CT8236).",
                "warning",
            );
            return;
        }
        if (!puede("registrar"))
            return notify("No tienes permiso para registrar ajustes.", "error");
        setLoadingContexto(true);
        setContexto(null);
        try {
            const { data } = await ajustesApi.get(
                `${API}/buscar-numero/${numero}`,
            );
            setContexto(data);
            setPedidoId("");
            setTipo("REDUCCION");
            setMotivo("");
            setObservaciones("");
            setLineas(
                (data.detalles || []).map((d) => ({
                    iddetallecotizacion: d.iddetallecotizacion,
                    descripcion:
                        d.descripcion ||
                        d.producto ||
                        d.titulo ||
                        "Sin descripción",
                    cantidad_vigente: Number(
                        d.cantidad_vigente ?? d.cantidad ?? 0,
                    ),
                    total_vigente: Number(d.total_vigente ?? d.total ?? 0),
                    cantidad_nueva: String(
                        d.cantidad_vigente ?? d.cantidad ?? 0,
                    ),
                    total_nuevo: String(d.total_vigente ?? d.total ?? 0),
                    editar: false,
                })),
            );
            uuidRef.current = null;
        } catch (e) {
            notify(errorApi(e), "error");
        } finally {
            setLoadingContexto(false);
        }
    };

    const cambiarLinea = (id, cambio) =>
        setLineas((prev) =>
            prev.map((l) =>
                l.iddetallecotizacion === id ? { ...l, ...cambio } : l,
            ),
        );

    const seleccionados = useMemo(
        () => lineas.filter((l) => l.editar),
        [lineas],
    );
    const diferenciaPropuesta = seleccionados.reduce(
        (acc, l) => acc + Number(l.total_nuevo || 0) - l.total_vigente,
        0,
    );

    const registrar = async () => {
        if (!puede("registrar"))
            return notify("No tienes permiso para registrar ajustes.", "error");
        if (!contexto) return;
        if (seleccionados.length === 0)
            return notify(
                "Selecciona al menos un renglón para modificar.",
                "warning",
            );
        if (!motivo.trim())
            return notify("Indica el motivo del ajuste.", "warning");
        for (const l of seleccionados) {
            if (
                !/^\d+$/.test(String(l.cantidad_nueva)) ||
                Number(l.cantidad_nueva) < 0
            ) {
                return notify(
                    "Las cantidades nuevas deben ser enteros no negativos.",
                    "warning",
                );
            }
            if (!/^\d+(\.\d{1,2})?$/.test(String(l.total_nuevo))) {
                return notify(
                    "Los importes nuevos deben tener como máximo dos decimales.",
                    "warning",
                );
            }
            const delta = compararDecimal(l.total_nuevo, l.total_vigente);
            const cambioCantidad =
                Number(l.cantidad_nueva) - l.cantidad_vigente;

            if (delta === 0) {
                return notify(
                    "El importe nuevo debe ser diferente del importe vigente.",
                    "warning",
                );
            }

            if (tipo === "REDUCCION" && (delta >= 0 || cambioCantidad > 0)) {
                return notify(
                    "En una reducción debe disminuir el importe, sin aumentar la cantidad.",
                    "warning",
                );
            }

            if (tipo === "AUMENTO" && (delta <= 0 || cambioCantidad < 0)) {
                return notify(
                    "En un aumento debe incrementar el importe, sin disminuir la cantidad.",
                    "warning",
                );
            }           
        }
        setSaving(true);
        try {
            if (!uuidRef.current) uuidRef.current = uuidNuevo();
            const body = {
                uuid_operacion: uuidRef.current,
                idcotizacion: contexto.cotizacion.idcotizacion,
                tipo_ajuste: tipo,
                motivo: motivo.trim(),
                observaciones: observaciones.trim() || null,
                idpedidoproduccion: pedidoId ? Number(pedidoId) : null,
                detalles: seleccionados.map((l) => ({
                    iddetallecotizacion: l.iddetallecotizacion,
                    tipo_cambio: tipo,
                    cantidad_nueva: Number(l.cantidad_nueva),
                    total_nuevo: Number(l.total_nuevo).toFixed(2),
                })),
            };
            const { data } = await ajustesApi.post(API, body);
            uuidRef.current = null;
            notify(`Ajuste #${data.idajuste} registrado: ${data.estado}.`);
            setContexto(null);
            setLineas([]);
            setIdBusqueda("");
            setTab(0);
            cargarLista(1);
        } catch (e) {
            notify(errorApi(e), "error");
        } finally {
            setSaving(false);
        }
    };

    const abrirDetalle = async (id) => {
        if (!puede("consultar"))
            return notify(
                "No tienes permiso para consultar el historial.",
                "error",
            );
        setLoadingDetalle(true);
        setDetalle(null);
        try {
            const { data } = await ajustesApi.get(`${API}/${id}`);
            setDetalle(data);
        } catch (e) {
            notify(errorApi(e), "error");
        } finally {
            setLoadingDetalle(false);
        }
    };

    // El PDF se solicita con Bearer, igual que el resto del módulo.
    // Se abre la pestaña dentro del clic para evitar bloqueos del navegador.
    const imprimirAjuste = async (id) => {
        if (!puede("consultar")) {
            notify("No tienes permiso para imprimir ajustes.", "error");
            return;
        }
        const ventana = window.open("", "_blank");
        try {
            const { data } = await ajustesApi.get(`${API}/${id}/imprimir`, {
                responseType: "blob",
            });
            const pdf = new Blob([data], { type: "application/pdf" });
            const url = URL.createObjectURL(pdf);
            if (ventana && !ventana.closed) {
                ventana.location.href = url;
            } else {
                const enlace = document.createElement("a");
                enlace.href = url;
                enlace.download = `AJ-${String(id).padStart(5, "0")}.pdf`;
                document.body.appendChild(enlace);
                enlace.click();
                enlace.remove();
            }
            // Evitar revocar inmediatamente mientras el visor abre el archivo.
            window.setTimeout(() => URL.revokeObjectURL(url), 120000);
        } catch (e) {
            if (ventana && !ventana.closed) ventana.close();
            // En peticiones blob el mensaje JSON no queda en response.data como objeto.
            let mensaje = errorApi(e);
            if (e?.response?.data instanceof Blob) {
                try {
                    const json = JSON.parse(await e.response.data.text());
                    mensaje = json.message || mensaje;
                } catch (_) {
                    /* usar mensaje genérico */
                }
            }
            notify(mensaje, "error");
        }
    };

    const resolver = async () => {
        if (!accion) return;
        if (!puede("aprobar"))
            return notify("No tienes permiso para autorizar ajustes.", "error");
        if (accion.tipo === "rechazar" && comentario.trim().length < 10) {
            notify(
                "El motivo de rechazo requiere al menos 10 caracteres.",
                "warning",
            );
            return;
        }
        setResolviendo(true);
        try {
            const body =
                accion.tipo === "aprobar"
                    ? { observacion: comentario.trim() || null }
                    : { motivo: comentario.trim() };
            const { data } = await ajustesApi.post(
                `${API}/${accion.id}/${accion.tipo}`,
                body,
            );
            notify(`Ajuste #${data.idajuste} ${data.estado.toLowerCase()}.`);
            setAccion(null);
            setComentario("");
            setDetalle(null);
            await cargarLista(page);
            if (tab === 2) await cargarResumen();
        } catch (e) {
            notify(errorApi(e), "error");
        } finally {
            setResolviendo(false);
        }
    };

    if (cargandoPermisos)
        return (
            <Box sx={{ p: 4, textAlign: "center" }}>
                <CircularProgress />
                <Typography mt={2}>Verificando permisos…</Typography>
            </Box>
        );
    if (
        !permisos ||
        !["consultar", "registrar", "aprobar", "reportes"].some(
            (clave) => permisos[clave] === true,
        )
    )
        return (
            <Alert severity="error">
                No tienes acceso al módulo de Ajustes de Ventas.
            </Alert>
        );

    return (
        <Box sx={{ px: { xs: 1.5, md: 3 }, py: 3, maxWidth: 1500, mx: "auto" }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={2}
                mb={3}
            >
                <Box>
                    <Typography
                        variant="h5"
                        fontWeight={800}
                        sx={{ color: COLORS.blue }}
                    >
                        Ajustes de Ventas
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Solicitudes, autorizaciones e historial comercial
                    </Typography>
                </Box>
                {puede("registrar") && (
                    <Button
                        variant="contained"
                        startIcon={<Plus size={18} />}
                        onClick={() => setTab(1)}
                        sx={{
                            bgcolor: COLORS.blue,
                            "&:hover": { bgcolor: "#08365D" },
                        }}
                    >
                        Nueva solicitud
                    </Button>
                )}
            </Stack>

            <Paper variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
                <Tabs
                    value={tab}
                    onChange={(_e, v) => setTab(v)}
                    variant={mobile ? "scrollable" : "standard"}
                    scrollButtons="auto"
                    sx={{
                        px: 1,
                        "& .Mui-selected": {
                            color: `${COLORS.blue} !important`,
                        },
                        "& .MuiTabs-indicator": { bgcolor: COLORS.green },
                    }}
                >
                    <Tab
                        label="Solicitudes e historial"
                        disabled={!puede("consultar")}
                        icon={<ClipboardList size={18} />}
                        iconPosition="start"
                    />
                    <Tab
                        label="Registrar ajuste"
                        disabled={!puede("registrar")}
                        icon={<Plus size={18} />}
                        iconPosition="start"
                    />
                    <Tab
                        label="Resumen mensual"
                        disabled={!puede("reportes")}
                        icon={<FileSearch size={18} />}
                        iconPosition="start"
                    />
                </Tabs>
            </Paper>

            {tab === 0 && puede("consultar") && (
                <Paper
                    variant="outlined"
                    sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}
                >
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                        mb={2}
                        alignItems={{ md: "center" }}
                    >
                        <TextField
                            label="No. de cotización"
                            value={filtro.nocotizacion}
                            size="small"
                            placeholder="CT8236"
                            onChange={(e) =>
                                setFiltro((prev) => ({
                                    ...prev,
                                    nocotizacion: e.target.value,
                                }))
                            }
                            sx={{ minWidth: 210 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel>Estado</InputLabel>
                            <Select
                                label="Estado"
                                value={filtro.estado}
                                onChange={(e) =>
                                    setFiltro((prev) => ({
                                        ...prev,
                                        estado: e.target.value,
                                    }))
                                }
                            >
                                {ESTADOS.map((x) => (
                                    <MenuItem value={x} key={x}>
                                        {x === "TODOS" ? "Todos" : x}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="outlined"
                            onClick={() => cargarLista(1)}
                            startIcon={<RefreshCw size={16} />}
                        >
                            Actualizar
                        </Button>
                    </Stack>
                    {loadingLista ? (
                        <Box p={5} textAlign="center">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <TableContainer sx={{ overflowX: "auto" }}>
                                <Table size="small" sx={{ minWidth: 850 }}>
                                    <TableHead sx={{ bgcolor: "#EDF3F8" }}>
                                        <TableRow>
                                            {[
                                                "Ajuste",
                                                "Cotización / cliente",
                                                "Tipo",
                                                "Solicitante",
                                                "Fecha",
                                                "Diferencia",
                                                "Estado",
                                                "Acciones",
                                            ].map((x) => (
                                                <TableCell
                                                    key={x}
                                                    sx={{ fontWeight: 700 }}
                                                >
                                                    {x}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {lista.map((a) => (
                                            <TableRow hover key={a.idajuste}>
                                                <TableCell>
                                                    #{a.idajuste}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        fontWeight={600}
                                                        variant="body2"
                                                    >
                                                        CT{a.nocotizacion}
                                                    </Typography>
                                                    <Typography variant="caption">
                                                        {a.cliente || "—"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {a.tipo_ajuste}
                                                </TableCell>
                                                <TableCell>
                                                    {a.solicitante || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {fecha(a.fecha_solicitud)}
                                                </TableCell>
                                                <TableCell
                                                    sx={{
                                                        fontWeight: 700,
                                                        color:
                                                            Number(
                                                                a.diferencia,
                                                            ) < 0
                                                                ? "error.main"
                                                                : "success.main",
                                                    }}
                                                >
                                                    {dinero(a.diferencia)}
                                                </TableCell>
                                                <TableCell>
                                                    {chipEstado(a.estado)}
                                                </TableCell>
                                                <TableCell>
                                                    <Stack
                                                        direction="row"
                                                        spacing={1}
                                                    >
                                                        <Button
                                                            size="small"
                                                            onClick={() =>
                                                                abrirDetalle(
                                                                    a.idajuste,
                                                                )
                                                            }
                                                        >
                                                            Ver
                                                        </Button>
                                                        {a.estado ===
                                                            "APROBADO" &&
                                                            puede(
                                                                "consultar",
                                                            ) && (
                                                                <Button
                                                                    size="small"
                                                                    startIcon={
                                                                        <Printer
                                                                            size={
                                                                                15
                                                                            }
                                                                        />
                                                                    }
                                                                    onClick={() =>
                                                                        imprimirAjuste(
                                                                            a.idajuste,
                                                                        )
                                                                    }
                                                                >
                                                                    Imprimir
                                                                </Button>
                                                            )}
                                                        {puede("aprobar") &&
                                                            a.estado ===
                                                                "SOLICITADO" &&
                                                            Number(
                                                                a.idusuario_solicita,
                                                            ) !==
                                                                Number(
                                                                    permisos?.usuario_id,
                                                                ) && (
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="success"
                                                                    onClick={() => {
                                                                        setAccion(
                                                                            {
                                                                                id: a.idajuste,
                                                                                tipo: "aprobar",
                                                                            },
                                                                        );
                                                                        setComentario(
                                                                            "",
                                                                        );
                                                                    }}
                                                                >
                                                                    Aprobar
                                                                </Button>
                                                            )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {!lista.length && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={8}
                                                    align="center"
                                                >
                                                    No hay ajustes para los
                                                    filtros seleccionados.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            {lastPage > 1 && (
                                <Stack mt={2} alignItems="center">
                                    <Pagination
                                        page={page}
                                        count={lastPage}
                                        onChange={(_e, p) => cargarLista(p)}
                                    />
                                </Stack>
                            )}
                        </>
                    )}
                </Paper>
            )}

            {tab === 1 && puede("registrar") && (
                <Stack spacing={2}>
                    <Paper
                        variant="outlined"
                        sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}
                    >
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                            Buscar venta
                        </Typography>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                        >
                            <TextField
                                label="Número de cotización"
                                value={idBusqueda}
                                onChange={(e) => setIdBusqueda(e.target.value)}
                                size="small"
                                placeholder="Ejemplo: CT8236"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") buscarCotizacion();
                                }}
                            />
                            <Button
                                variant="contained"
                                disabled={loadingContexto}
                                onClick={buscarCotizacion}
                                sx={{ bgcolor: COLORS.blue }}
                            >
                                {loadingContexto ? (
                                    <CircularProgress
                                        size={20}
                                        color="inherit"
                                    />
                                ) : (
                                    "Consultar"
                                )}
                            </Button>
                        </Stack>
                        <Alert severity="info" sx={{ mt: 2 }}>
                            La solicitud no cambia facturas FEL, cuentas por
                            cobrar ni órdenes de producción. Los importes
                            ingresados son propuestas comerciales sujetas a
                            autorización.
                        </Alert>
                    </Paper>
                    {contexto && (
                        <>
                            <Paper
                                variant="outlined"
                                sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}
                            >
                                <Typography variant="h6" fontWeight={700}>
                                    CT{contexto.cotizacion.nocotizacion} ·{" "}
                                    {contexto.cotizacion.cliente}
                                </Typography>
                                <Typography
                                    color="text.secondary"
                                    variant="body2"
                                    mb={2}
                                >
                                    Total original:{" "}
                                    {dinero(contexto.cotizacion.total)} ·
                                    Ajustes anteriores:{" "}
                                    {contexto.ajustes?.length || 0}
                                </Typography>
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: {
                                            xs: "1fr",
                                            md: "minmax(230px, 1fr) minmax(240px, 1fr) minmax(280px, 2fr)",
                                        },
                                        gap: 2,
                                    }}
                                >
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Tipo de ajuste</InputLabel>
                                        <Select
                                            label="Tipo de ajuste"
                                            value={tipo}
                                            onChange={(e) => {
                                                setTipo(e.target.value);
                                                uuidRef.current = null;
                                            }}
                                        >
                                            <MenuItem value="REDUCCION">
                                                Reducción
                                            </MenuItem>
                                            <MenuItem value="AUMENTO">
                                                Aumento
                                            </MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>
                                            Pedido de producción (opcional)
                                        </InputLabel>
                                        <Select
                                            label="Pedido de producción (opcional)"
                                            value={pedidoId}
                                            onChange={(e) =>
                                                setPedidoId(e.target.value)
                                            }
                                        >
                                            <MenuItem value="">
                                                Sin pedido asociado
                                            </MenuItem>
                                            {(contexto.pedidos || []).map(
                                                (p) => (
                                                    <MenuItem
                                                        value={String(
                                                            p.idpedidoproduccion,
                                                        )}
                                                        key={
                                                            p.idpedidoproduccion
                                                        }
                                                    >
                                                        P-
                                                        {p.nopedido ??
                                                            p.idpedidoproduccion}
                                                    </MenuItem>
                                                ),
                                            )}
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        label="Motivo del ajuste"
                                        required
                                        fullWidth
                                        size="small"
                                        value={motivo}
                                        onChange={(e) => {
                                            setMotivo(e.target.value);
                                            uuidRef.current = null;
                                        }}
                                        inputProps={{ maxLength: 500 }}
                                    />
                                    <Box sx={{ gridColumn: "1 / -1" }}>
                                        <TextField
                                            label="Observaciones adicionales"
                                            fullWidth
                                            multiline
                                            minRows={2}
                                            value={observaciones}
                                            onChange={(e) => {
                                                setObservaciones(
                                                    e.target.value,
                                                );
                                                uuidRef.current = null;
                                            }}
                                        />
                                    </Box>
                                </Box>
                            </Paper>
                            <Paper
                                variant="outlined"
                                sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}
                            >
                                <Typography
                                    variant="h6"
                                    fontWeight={700}
                                    gutterBottom
                                >
                                    Renglones a modificar
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    mb={2}
                                >
                                    Marca los renglones afectados y captura la
                                    cantidad y el importe comercial total
                                    propuestos. El sistema validará nuevamente
                                    los valores al registrar y aprobar.
                                </Typography>
                                <Stack spacing={2}>
                                    {lineas.map((l) => (
                                        <Paper
                                            key={l.iddetallecotizacion}
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
                                                borderLeft: l.editar
                                                    ? `4px solid ${COLORS.green}`
                                                    : undefined,
                                            }}
                                        >
                                            <Stack
                                                direction={{
                                                    xs: "column",
                                                    md: "row",
                                                }}
                                                gap={2}
                                                alignItems={{ md: "center" }}
                                            >
                                                <FormControl
                                                    sx={{ minWidth: 150 }}
                                                >
                                                    <Button
                                                        variant={
                                                            l.editar
                                                                ? "contained"
                                                                : "outlined"
                                                        }
                                                        color={
                                                            l.editar
                                                                ? "success"
                                                                : "inherit"
                                                        }
                                                        onClick={() => {
                                                            cambiarLinea(
                                                                l.iddetallecotizacion,
                                                                {
                                                                    editar: !l.editar,
                                                                },
                                                            );
                                                            uuidRef.current =
                                                                null;
                                                        }}
                                                    >
                                                        {l.editar
                                                            ? "Seleccionado"
                                                            : "Modificar"}
                                                    </Button>
                                                </FormControl>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography
                                                        fontWeight={600}
                                                        variant="body2"
                                                    >
                                                        Renglón #
                                                        {l.iddetallecotizacion}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            overflowWrap:
                                                                "anywhere",
                                                        }}
                                                    >
                                                        {l.descripcion}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Vigente:{" "}
                                                        {l.cantidad_vigente}{" "}
                                                        unidades ·{" "}
                                                        {dinero(
                                                            l.total_vigente,
                                                        )}
                                                    </Typography>
                                                </Box>
                                                {l.editar && (
                                                    <Stack
                                                        direction={{
                                                            xs: "column",
                                                            sm: "row",
                                                        }}
                                                        gap={1}
                                                    >
                                                        <TextField
                                                            label="Cantidad nueva"
                                                            size="small"
                                                            type="number"
                                                            value={
                                                                l.cantidad_nueva
                                                            }
                                                            sx={{
                                                                width: {
                                                                    xs: "100%",
                                                                    sm: 150,
                                                                },
                                                            }}
                                                            onChange={(e) => {
                                                                cambiarLinea(
                                                                    l.iddetallecotizacion,
                                                                    {
                                                                        cantidad_nueva:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    },
                                                                );
                                                                uuidRef.current =
                                                                    null;
                                                            }}
                                                            inputProps={{
                                                                min: 0,
                                                                step: 1,
                                                            }}
                                                        />
                                                        <TextField
                                                            label="Total nuevo (Q)"
                                                            size="small"
                                                            value={
                                                                l.total_nuevo
                                                            }
                                                            sx={{
                                                                width: {
                                                                    xs: "100%",
                                                                    sm: 160,
                                                                },
                                                            }}
                                                            onChange={(e) => {
                                                                cambiarLinea(
                                                                    l.iddetallecotizacion,
                                                                    {
                                                                        total_nuevo:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    },
                                                                );
                                                                uuidRef.current =
                                                                    null;
                                                            }}
                                                        />
                                                    </Stack>
                                                )}
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                                {seleccionados.length > 0 && (
                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        justifyContent="space-between"
                                        alignItems={{ sm: "center" }}
                                        mt={3}
                                        spacing={2}
                                    >
                                        <Typography fontWeight={700}>
                                            Diferencia comercial propuesta:{" "}
                                            {dinero(diferenciaPropuesta)}
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            disabled={saving}
                                            onClick={registrar}
                                            sx={{ bgcolor: COLORS.blue }}
                                        >
                                            {saving ? (
                                                <CircularProgress
                                                    size={20}
                                                    color="inherit"
                                                />
                                            ) : (
                                                "Registrar solicitud"
                                            )}
                                        </Button>
                                    </Stack>
                                )}
                            </Paper>
                        </>
                    )}
                </Stack>
            )}

            {tab === 2 && puede("reportes") && (
                <Paper
                    variant="outlined"
                    sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}
                >
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        Resumen comercial de ajustes
                    </Typography>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        mb={3}
                    >
                        <TextField
                            size="small"
                            label="Desde"
                            type="date"
                            value={periodo.fecha_inicio}
                            InputLabelProps={{ shrink: true }}
                            onChange={(e) =>
                                setPeriodo((p) => ({
                                    ...p,
                                    fecha_inicio: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            size="small"
                            label="Hasta"
                            type="date"
                            value={periodo.fecha_fin}
                            InputLabelProps={{ shrink: true }}
                            onChange={(e) =>
                                setPeriodo((p) => ({
                                    ...p,
                                    fecha_fin: e.target.value,
                                }))
                            }
                        />
                        <Button
                            variant="outlined"
                            onClick={cargarResumen}
                            disabled={loadingResumen}
                        >
                            Actualizar
                        </Button>
                    </Stack>
                    {loadingResumen && <CircularProgress size={24} />}
                    {resumen && (
                        <>
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "repeat(2, minmax(0, 1fr))",
                                        md: "repeat(4, minmax(0, 1fr))",
                                    },
                                    gap: 2,
                                }}
                            >
                                <ResumenCard
                                    titulo="Aprobados"
                                    valor={
                                        resumen.indicadores.ajustes_aprobados
                                    }
                                />
                                <ResumenCard
                                    titulo="Pendientes del período"
                                    valor={
                                        resumen.indicadores
                                            .ajustes_pendientes_solicitados_en_periodo
                                    }
                                />
                                <ResumenCard
                                    titulo="Ajustes positivos"
                                    valor={dinero(
                                        resumen.indicadores.ajustes_positivos,
                                    )}
                                    color={COLORS.green}
                                />
                                <ResumenCard
                                    titulo="Ajustes negativos"
                                    valor={dinero(
                                        resumen.indicadores.ajustes_negativos,
                                    )}
                                    color="#C0392B"
                                />
                                <Box sx={{ gridColumn: "1 / -1" }}>
                                    <ResumenCard
                                        titulo="Ajuste neto del período"
                                        valor={dinero(
                                            resumen.indicadores.ajuste_neto,
                                        )}
                                    />
                                </Box>
                            </Box>
                            <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                mt={3}
                            >
                                Movimiento por día
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>
                                                Fecha efectiva
                                            </TableCell>
                                            <TableCell>Cantidad</TableCell>
                                            <TableCell align="right">
                                                Ajuste neto
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(resumen.por_dia || []).map((x) => (
                                            <TableRow key={x.fecha}>
                                                <TableCell>
                                                    {fecha(x.fecha)}
                                                </TableCell>
                                                <TableCell>
                                                    {x.cantidad}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {dinero(x.neto)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {!resumen.por_dia?.length && (
                                            <TableRow>
                                                <TableCell colSpan={3}>
                                                    Sin ajustes aprobados en el
                                                    período.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </Paper>
            )}

            <Dialog
                open={Boolean(detalle) || loadingDetalle}
                onClose={() => setDetalle(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700, color: COLORS.blue }}>
                    Detalle del ajuste
                </DialogTitle>
                <DialogContent dividers>
                    {loadingDetalle ? (
                        <CircularProgress size={24} />
                    ) : (
                        detalle && (
                            <Stack spacing={2}>
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <Typography variant="h6">
                                        Ajuste #{detalle.ajuste.idajuste} · CT
                                        {detalle.ajuste.nocotizacion}
                                    </Typography>
                                    {chipEstado(detalle.ajuste.estado)}
                                </Stack>
                                <Typography>
                                    {detalle.ajuste.cliente}
                                </Typography>
                                <Typography variant="body2">
                                    <b>Motivo:</b> {detalle.ajuste.motivo}
                                </Typography>
                                <Typography variant="body2">
                                    <b>Solicitante:</b>{" "}
                                    {detalle.ajuste.solicitante} ·{" "}
                                    <b>Aprobador:</b>{" "}
                                    {detalle.ajuste.aprobador || "Pendiente"}
                                </Typography>
                                <Typography fontWeight={700}>
                                    Diferencia:{" "}
                                    {dinero(detalle.ajuste.diferencia)}
                                </Typography>
                                <Divider />
                                <Typography fontWeight={700}>
                                    Renglones
                                </Typography>
                                {(detalle.detalles || []).map((d) => (
                                    <Box key={d.iddetalleajuste}>
                                        <Typography variant="body2">
                                            #{d.iddetallecotizacion} ·{" "}
                                            {d.descripcion}
                                        </Typography>
                                        <Typography variant="caption">
                                            Cantidad: {d.cantidad_anterior} →{" "}
                                            {d.cantidad_nueva} · Total:{" "}
                                            {dinero(d.total_anterior)} →{" "}
                                            {dinero(d.total_nuevo)}
                                        </Typography>
                                    </Box>
                                ))}
                                <Divider />
                                <Typography fontWeight={700}>
                                    Auditoría
                                </Typography>
                                {(detalle.eventos || []).map((e) => (
                                    <Box key={e.idevento}>
                                        <Typography variant="body2">
                                            <b>{e.accion}</b> ·{" "}
                                            {e.usuario || e.idusuario} ·{" "}
                                            {e.fecha_evento}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {e.descripcion}
                                        </Typography>
                                    </Box>
                                ))}
                                <Alert severity="info">
                                    Producción:{" "}
                                    {detalle.ajuste.estado_produccion} · FEL:{" "}
                                    {detalle.ajuste.estado_fel} · CxC:{" "}
                                    {detalle.ajuste.estado_cxc}
                                </Alert>
                            </Stack>
                        )
                    )}
                </DialogContent>
                <DialogActions>
                    {detalle?.ajuste?.estado === "APROBADO" &&
                        puede("consultar") && (
                            <Button
                                startIcon={<Printer size={16} />}
                                onClick={() =>
                                    imprimirAjuste(detalle.ajuste.idajuste)
                                }
                            >
                                Imprimir ajuste
                            </Button>
                        )}
                    {puede("aprobar") &&
                        detalle?.ajuste?.estado === "SOLICITADO" &&
                        Number(detalle.ajuste.idusuario_solicita) !==
                            Number(permisos?.usuario_id) && (
                            <>
                                <Button
                                    color="error"
                                    startIcon={<XCircle size={16} />}
                                    onClick={() => {
                                        setAccion({
                                            tipo: "rechazar",
                                            id: detalle.ajuste.idajuste,
                                        });
                                        setDetalle(null);
                                        setComentario("");
                                    }}
                                >
                                    Rechazar
                                </Button>
                                <Button
                                    color="success"
                                    startIcon={<CheckCircle2 size={16} />}
                                    onClick={() => {
                                        setAccion({
                                            tipo: "aprobar",
                                            id: detalle.ajuste.idajuste,
                                        });
                                        setDetalle(null);
                                        setComentario("");
                                    }}
                                >
                                    Aprobar
                                </Button>
                            </>
                        )}
                    <Button onClick={() => setDetalle(null)}>Cerrar</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={Boolean(accion)}
                onClose={() => !resolviendo && setAccion(null)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                    <ShieldCheck size={20} />{" "}
                    {accion?.tipo === "aprobar"
                        ? "Autorizar ajuste"
                        : "Rechazar ajuste"}{" "}
                    #{accion?.id}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Esta operación registra una decisión comercial. No
                        modifica FEL ni CxC.
                    </Alert>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label={
                            accion?.tipo === "rechazar"
                                ? "Motivo del rechazo (obligatorio)"
                                : "Observación (opcional)"
                        }
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        inputProps={{ maxLength: 2000 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setAccion(null)}
                        disabled={resolviendo}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color={accion?.tipo === "aprobar" ? "success" : "error"}
                        onClick={resolver}
                        disabled={resolviendo}
                    >
                        {resolviendo ? "Procesando..." : "Confirmar"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={Boolean(notice)}
                autoHideDuration={6000}
                onClose={() => setNotice(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    severity={notice?.severity || "info"}
                    onClose={() => setNotice(null)}
                    variant="filled"
                >
                    {notice?.message || ""}
                </Alert>
            </Snackbar>
        </Box>
    );
}
