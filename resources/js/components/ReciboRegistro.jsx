import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import axios from "axios";
import alertify from "alertifyjs";

import {
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from "@mui/material";

import {
    MaterialReactTable,
} from "material-react-table";

import {
    Eraser,
    FileText,
    Search,
    Save,
    WalletCards,
    X,
} from "lucide-react";

import {
    useParams,
} from "react-router-dom";

import {
    norm,
} from "../utils/text";

import "../../css/recibo-registro.css";


const ReciboRegistro = () => {
    const [
        clientes,
        setClientes,
    ] = useState([]);

    const [
        cuentas,
        setCuentas,
    ] = useState([]);

    const [
        modalOpen,
        setModalOpen,
    ] = useState(false);

    const {
        id,
    } = useParams();

    const [
        modoEdicion,
        setModoEdicion,
    ] = useState(
        !!id,
    );

    const [
        fechaActual,
        setFechaActual,
    ] = useState("");

    const [
        clienteInput,
        setClienteInput,
    ] = useState("");

    const [
        clienteSelObj,
        setClienteSelObj,
    ] = useState(null);

    const [
        selectedCuentas,
        setSelectedCuentas,
    ] = useState([]);

    const [
        rowSelection,
        setRowSelection,
    ] = useState({});


    /* =========================================================
       CLIENTES POR ID
       ========================================================= */

    const clientesById =
        useMemo(() => {
            const map =
                new Map();

            for (
                const cliente
                of clientes
            ) {
                const idCliente =
                    String(
                        cliente.idcliente,
                    ).trim();

                map.set(
                    idCliente,
                    cliente,
                );

                const numero =
                    Number(
                        idCliente,
                    );

                if (
                    !Number.isNaN(
                        numero,
                    )
                ) {
                    map.set(
                        String(
                            numero,
                        ),
                        cliente,
                    );
                }
            }

            return map;
        }, [
            clientes,
        ]);


    /* =========================================================
       FECHA SERVIDOR
       ========================================================= */

    useEffect(() => {
        const token =
            localStorage.getItem(
                "token",
            );

        const headers = {
            Authorization:
                `Bearer ${token}`,
        };

        axios
            .get(
                `${import.meta.env.VITE_API_URL}/fecha-servidor`,
                {
                    headers,
                },
            )
            .then((res) => {
                setFechaActual(
                    res.data.fecha,
                );
            })
            .catch(() => {
                const localDate =
                    new Date()
                        .toISOString()
                        .split("T")[0];

                setFechaActual(
                    localDate,
                );
            });
    }, []);


    /* =========================================================
       FORMULARIO
       ========================================================= */

    const [
        form,
        setForm,
    ] = useState({
        idcuentaporcobrar: "",
        idcliente: "",
        cliente_nombre: "",
        saldo_pendiente: 0,
        fecha_recibo: "",
        monto_recibido: "",
        metodo_pago:
            "Efectivo",
        referencia: "",
        observaciones: "",
        moneda: "GTQ",
        serie: "A",
        numero: "",
        tipo: "RECIBO",
    });


    /* =========================================================
       FECHA DEFAULT
       ========================================================= */

    useEffect(() => {
        if (
            !id &&
            fechaActual
        ) {
            setForm(
                (prev) => ({
                    ...prev,

                    fecha_recibo:
                        fechaActual,
                }),
            );
        }
    }, [
        fechaActual,
        id,
    ]);


    /* =========================================================
       CARGAR CLIENTES
       ========================================================= */

    useEffect(() => {
        const token =
            localStorage.getItem(
                "token",
            );

        if (!token) {
            return;
        }

        axios
            .get(
                "/api/lista_clientes",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                },
            )
            .then((res) => {
                const lista =
                    Array.isArray(
                        res.data,
                    )
                        ? res.data
                        : res.data?.data ??
                          [];


                const normalizados =
                    lista.map(
                        (
                            cliente,
                        ) => ({
                            ...cliente,

                            nombre:
                                cliente.nombre ??
                                cliente.cliente ??
                                cliente.nombre_comercial ??
                                cliente.razon_social ??
                                cliente.cuenta ??
                                "",
                        }),
                    );


                const map =
                    new Map();


                for (
                    const cliente
                    of normalizados
                ) {
                    const idCliente =
                        String(
                            cliente.idcliente,
                        ).trim();

                    if (
                        !map.has(
                            idCliente,
                        )
                    ) {
                        map.set(
                            idCliente,
                            cliente,
                        );
                    }
                }


                setClientes(
                    Array.from(
                        map.values(),
                    ),
                );
            })
            .catch(
                (err) => {
                    console.error(
                        "❌ Error al cargar clientes:",
                        err.response
                            ?.data ||
                            err.message,
                    );

                    alertify.error(
                        "No se pudo cargar la lista de clientes",
                    );
                },
            );
    }, []);


    /* =========================================================
       CARGAR RECIBO EN EDICIÓN
       ========================================================= */

    useEffect(() => {
        if (!id) {
            return;
        }

        setModoEdicion(
            true,
        );

        const token =
            localStorage.getItem(
                "token",
            );


        axios
            .get(
                `/api/recibos/${id}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                },
            )
            .then(
                ({
                    data,
                }) => {
                    const detalles =
                        data?.detalles ??
                        [];


                    const cuentasSeleccionadas =
                        detalles.map(
                            (
                                detalle,
                            ) => ({
                                idcuentaporcobrar:
                                    detalle.idcuentaporcobrar,

                                nofactura:
                                    detalle
                                        ?.cuenta
                                        ?.nofactura ??
                                    detalle
                                        ?.cuenta
                                        ?.factura
                                        ?.nofactura ??
                                    detalle
                                        ?.cuenta
                                        ?.adm_factura
                                        ?.nofactura ??
                                    detalle
                                        ?.cuenta
                                        ?.adm_facturas
                                        ?.nofactura ??
                                    detalle
                                        ?.cuenta
                                        ?.adm_facturas
                                        ?.no_factura ??
                                    "",

                                fecha_emision:
                                    detalle
                                        ?.cuenta
                                        ?.fecha_emision ??
                                    "",

                                monto_original:
                                    Number(
                                        detalle
                                            ?.cuenta
                                            ?.monto_original ??
                                            0,
                                    ),

                                saldo_pendiente:
                                    Number(
                                        detalle
                                            ?.cuenta
                                            ?.saldo_pendiente ??
                                            0,
                                    ) +
                                    Number(
                                        detalle?.monto ??
                                            0,
                                    ),

                                monto_a_pagar:
                                    Number(
                                        detalle?.monto ??
                                            0,
                                    ),

                                idcliente:
                                    data.idcliente,

                                cliente_nombre:
                                    data
                                        ?.cliente
                                        ?.nombre ??
                                    "",
                            }),
                        );


                    setSelectedCuentas(
                        cuentasSeleccionadas,
                    );


                    const total =
                        cuentasSeleccionadas.reduce(
                            (
                                acumulado,
                                cuenta,
                            ) =>
                                acumulado +
                                (Number(
                                    cuenta.monto_a_pagar,
                                ) ||
                                    0),
                            0,
                        );


                    setForm({
                        idcuentaporcobrar:
                            "",

                        idcliente:
                            String(
                                data.idcliente,
                            ),

                        cliente_nombre:
                            data
                                ?.cliente
                                ?.nombre ??
                            "",

                        saldo_pendiente:
                            0,

                        fecha_recibo:
                            data.fecha_recibo,

                        monto_recibido:
                            total,

                        metodo_pago:
                            data.metodo_pago,

                        referencia:
                            data.referencia,

                        observaciones:
                            data.observaciones,

                        moneda:
                            data.moneda ||
                            "GTQ",

                        serie:
                            data.serie ??
                            "A",

                        numero:
                            data.numero ??
                            "",

                        tipo:
                            data.tipo ||
                            "RECIBO",
                    });
                },
            )
            .catch(() => {
                alertify.error(
                    "No se pudo cargar el recibo",
                );
            });
    }, [
        id,
    ]);


    /* =========================================================
       SINCRONIZAR TOTAL
       ========================================================= */

    useEffect(() => {
        if (
            selectedCuentas.length >
            0
        ) {
            const total =
                selectedCuentas.reduce(
                    (
                        acumulado,
                        cuenta,
                    ) =>
                        acumulado +
                        (Number(
                            cuenta.monto_a_pagar,
                        ) ||
                            0),
                    0,
                );

            setForm(
                (prev) => ({
                    ...prev,

                    monto_recibido:
                        total,
                }),
            );
        }
    }, [
        selectedCuentas,
    ]);


    /* =========================================================
       BUSCAR CUENTAS
       ========================================================= */

    const handleBuscarCuentas =
        () => {
            const idCliente =
                clienteSelObj?.idcliente;

            const nombreCliente =
                clienteSelObj?.nombre ??
                "";


            if (!idCliente) {
                alertify.error(
                    "Selecciona un cliente de la lista",
                );

                return;
            }


            axios
                .get(
                    `/api/cuentas-por-cobrar/por-cliente?cliente=${idCliente}`,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${localStorage.getItem(
                                    "token",
                                )}`,
                        },
                    },
                )
                .then(
                    (res) => {
                        const data =
                            Array.isArray(
                                res.data,
                            )
                                ? res.data
                                : [];


                        const cuentasEnriquecidas =
                            data.map(
                                (
                                    cuenta,
                                ) => {
                                    const noInterno =
                                        cuenta.nofactura ??
                                        cuenta
                                            ?.factura
                                            ?.nofactura ??
                                        cuenta
                                            ?.adm_factura
                                            ?.nofactura ??
                                        cuenta
                                            ?.adm_facturas
                                            ?.nofactura ??
                                        cuenta
                                            ?.adm_facturas
                                            ?.no_factura ??
                                        "";


                                    return {
                                        ...cuenta,

                                        idcliente:
                                            cuenta.idcliente ??
                                            idCliente,

                                        cliente_nombre:
                                            cuenta.cliente_nombre ??
                                            cuenta.cliente ??
                                            nombreCliente,

                                        nofactura:
                                            noInterno,

                                        numero:
                                            cuenta.numero !==
                                                undefined &&
                                            cuenta.numero !==
                                                null
                                                ? String(
                                                      cuenta.numero,
                                                  )
                                                : "",
                                    };
                                },
                            );


                        setCuentas(
                            cuentasEnriquecidas,
                        );
                    },
                )
                .catch(
                    (err) => {
                        console.error(
                            "❌ Error al cargar cuentas:",
                            err.response
                                ?.data ||
                                err.message,
                        );

                        alertify.error(
                            "No se pudo cargar las cuentas del cliente",
                        );
                    },
                );
        };


    /* =========================================================
       CAMBIOS FORM
       ========================================================= */

    const handleChange =
        (e) => {
            const {
                name,
                value,
                type,
            } = e.target;


            if (
                name ===
                "numero"
            ) {
                const limpio =
                    value.replace(
                        /[^\d]/g,
                        "",
                    );

                setForm(
                    (prev) => ({
                        ...prev,

                        numero:
                            limpio,
                    }),
                );

                return;
            }


            if (
                name ===
                "serie"
            ) {
                setForm(
                    (prev) => ({
                        ...prev,

                        serie:
                            value.toUpperCase(),
                    }),
                );

                return;
            }


            setForm(
                (prev) => ({
                    ...prev,

                    [name]:
                        type ===
                        "number"
                            ? Number(
                                  value,
                              )
                            : value,
                }),
            );
        };


    /* =========================================================
       GUARDAR
       ========================================================= */

    const handleSubmit =
        async (e) => {
            e.preventDefault();


            if (
                !form.serie?.trim()
            ) {
                return alertify.error(
                    "La serie es obligatoria.",
                );
            }


            if (
                !form.numero ||
                isNaN(
                    Number(
                        form.numero,
                    ),
                ) ||
                Number(
                    form.numero,
                ) <= 0
            ) {
                return alertify.error(
                    "El número de recibo debe ser un entero positivo.",
                );
            }


            if (!form.tipo) {
                return alertify.error(
                    "Debe seleccionar el tipo.",
                );
            }


            if (
                !form.idcliente
            ) {
                return alertify.error(
                    "Debe seleccionar un cliente.",
                );
            }


            const token =
                localStorage.getItem(
                    "token",
                );

            const headers = {
                Authorization:
                    `Bearer ${token}`,
            };


            let detalle = [];


            if (
                selectedCuentas.length >
                0
            ) {
                detalle =
                    selectedCuentas
                        .filter(
                            (
                                cuenta,
                            ) =>
                                (Number(
                                    cuenta.monto_a_pagar,
                                ) ||
                                    0) >
                                0,
                        )
                        .map(
                            (
                                cuenta,
                            ) => ({
                                idcuentaporcobrar:
                                    cuenta.idcuentaporcobrar,

                                monto:
                                    Number(
                                        cuenta.monto_a_pagar,
                                    ) ||
                                    0,
                            }),
                        );
            } else {
                if (
                    !form.idcuentaporcobrar
                ) {
                    return alertify.error(
                        "Debe seleccionar una cuenta por cobrar.",
                    );
                }


                if (
                    parseFloat(
                        form.monto_recibido,
                    ) >
                    parseFloat(
                        form.saldo_pendiente,
                    )
                ) {
                    return alertify.error(
                        "El monto recibido no puede ser mayor al saldo pendiente.",
                    );
                }


                detalle = [
                    {
                        idcuentaporcobrar:
                            form.idcuentaporcobrar,

                        monto:
                            Number(
                                form.monto_recibido,
                            ) ||
                            0,
                    },
                ];
            }


            const totalDetalle =
                detalle.reduce(
                    (
                        acumulado,
                        item,
                    ) =>
                        acumulado +
                        (Number(
                            item.monto,
                        ) ||
                            0),
                    0,
                );


            if (
                totalDetalle <=
                0
            ) {
                return alertify.error(
                    "El total del recibo debe ser mayor a 0.",
                );
            }


            try {
                const payload = {
                    idcliente:
                        form.idcliente,

                    fecha_recibo:
                        form.fecha_recibo,

                    metodo_pago:
                        form.metodo_pago,

                    referencia:
                        form.referencia,

                    observaciones:
                        form.observaciones,

                    moneda:
                        form.moneda ||
                        "GTQ",

                    serie:
                        form.serie,

                    numero:
                        Number(
                            form.numero,
                        ),

                    tipo:
                        form.tipo,

                    monto_recibido:
                        totalDetalle,

                    detalle,
                };


                if (
                    modoEdicion &&
                    id
                ) {
                    await axios.put(
                        `/api/recibos/${id}`,
                        payload,
                        {
                            headers,
                        },
                    );

                    alertify.success(
                        "Recibo actualizado correctamente",
                    );
                } else {
                    await axios.post(
                        "/api/recibos",
                        payload,
                        {
                            headers,
                        },
                    );

                    alertify.success(
                        "Recibo registrado correctamente",
                    );
                }


                handleNuevoRecibo();
            } catch (err) {
                if (
                    err.response
                        ?.status ===
                    422
                ) {
                    const errs =
                        err.response
                            .data
                            ?.errors ||
                        {};


                    const msg =
                        Object.values(
                            errs,
                        )
                            .flat()
                            .join("\n") ||
                        "Datos inválidos.";


                    alertify.error(
                        msg,
                    );
                } else if (
                    err.response
                        ?.data
                        ?.error
                ) {
                    alertify.error(
                        err.response
                            .data
                            .error,
                    );
                } else {
                    alertify.error(
                        "Error al guardar el recibo",
                    );
                }
            }
        };


    /* =========================================================
       FORMATO
       ========================================================= */

    const fmt2 =
        new Intl.NumberFormat(
            "es-GT",
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2,
            },
        );


    /* =========================================================
       COLUMNAS MODAL
       ========================================================= */

    const columnas =
        useMemo(
            () => [
                {
                    accessorKey:
                        "idcuentaporcobrar",

                    header:
                        "ID CxC",

                    size:
                        90,
                },

                {
                    id:
                        "nofactura",

                    header:
                        "No. Interno",

                    size:
                        120,

                    accessorFn:
                        (row) =>
                            row.nofactura ??
                            row
                                ?.factura
                                ?.nofactura ??
                            row
                                ?.adm_factura
                                ?.nofactura ??
                            row
                                ?.adm_facturas
                                ?.nofactura ??
                            row
                                ?.adm_facturas
                                ?.no_factura ??
                            "",
                },

                {
                    id:
                        "numero",

                    header:
                        "Número FEL",

                    size:
                        120,

                    accessorFn:
                        (row) =>
                            row.numero ??
                            "",
                },

                {
                    accessorKey:
                        "fecha_emision",

                    header:
                        "Fecha Emisión",

                    size:
                        120,
                },

                {
                    id:
                        "monto_original",

                    header:
                        "Monto Original",

                    accessorFn:
                        (row) =>
                            Number.parseFloat(
                                row?.monto_original ??
                                    0,
                            ),

                    Cell:
                        ({
                            cell,
                        }) =>
                            fmt2.format(
                                cell.getValue() ??
                                    0,
                            ),

                    muiTableBodyCellProps:
                        {
                            align:
                                "right",
                        },

                    size:
                        120,
                },

                {
                    id:
                        "saldo_pendiente",

                    header:
                        "Saldo Pendiente",

                    accessorFn:
                        (row) =>
                            Number.parseFloat(
                                row?.saldo_pendiente ??
                                    0,
                            ),

                    Cell:
                        ({
                            cell,
                        }) =>
                            fmt2.format(
                                cell.getValue() ??
                                    0,
                            ),

                    muiTableBodyCellProps:
                        {
                            align:
                                "right",
                        },

                    size:
                        120,
                },

                {
                    accessorKey:
                        "monto_a_pagar",

                    header:
                        "Monto a pagar",

                    enableEditing:
                        true,

                    muiTableBodyCellEditTextFieldProps:
                        ({
                            row,
                        }) => ({
                            type:
                                "number",

                            inputProps:
                                {
                                    step:
                                        "any",

                                    min:
                                        0,

                                    max:
                                        Number(
                                            row
                                                .original
                                                .saldo_pendiente,
                                        ) ||
                                        0,
                                },
                        }),

                    Cell:
                        ({
                            row,
                        }) =>
                            fmt2.format(
                                Number(
                                    row
                                        .original
                                        .monto_a_pagar ??
                                        0,
                                ),
                            ),

                    muiTableBodyCellProps:
                        {
                            align:
                                "right",
                        },

                    size:
                        140,
                },
            ],
            [],
        );


    /* =========================================================
       NUEVO RECIBO
       ========================================================= */

    const handleNuevoRecibo =
        () => {
            const hoy =
                fechaActual ||
                new Date()
                    .toISOString()
                    .split("T")[0];


            setForm({
                idcuentaporcobrar:
                    "",

                idcliente:
                    "",

                cliente_nombre:
                    "",

                saldo_pendiente:
                    0,

                fecha_recibo:
                    hoy,

                monto_recibido:
                    "",

                metodo_pago:
                    "Efectivo",

                referencia:
                    "",

                observaciones:
                    "",

                moneda:
                    "GTQ",

                serie:
                    "A",

                numero:
                    "",

                tipo:
                    "RECIBO",
            });


            setClienteSelObj(
                null,
            );

            setClienteInput(
                "",
            );

            setCuentas(
                [],
            );

            setSelectedCuentas(
                [],
            );

            setRowSelection(
                {},
            );

            setModalOpen(
                false,
            );

            setModoEdicion(
                false,
            );


            window.history.replaceState(
                null,
                "",
                "/recibos/registro",
            );
        };


    /* =========================================================
       TOTAL
       ========================================================= */

    const totalSeleccionado =
        selectedCuentas.reduce(
            (
                acumulado,
                cuenta,
            ) =>
                acumulado +
                (Number(
                    cuenta.monto_a_pagar,
                ) ||
                    0),
            0,
        );


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-receipt-page">

            <div className="gp-module-card gp-receipt-card">

                {/* HEADER */}

                <div className="gp-receipt-header">

                    <div className="gp-receipt-heading">

                        <div className="gp-receipt-heading-icon">
                            <WalletCards
                                size={22}
                            />
                        </div>


                        <div>
                            <div className="gp-module-meta">
                                CUENTAS POR COBRAR · RECIBOS
                            </div>

                            <h1>
                                {modoEdicion
                                    ? "Editar recibo"
                                    : "Registro de recibo"}
                            </h1>

                            <p>
                                Registra pagos, retenciones
                                y aplicaciones a una o varias
                                cuentas por cobrar.
                            </p>
                        </div>
                    </div>


                    <div
                        className={
                            modoEdicion
                                ? "gp-receipt-mode gp-receipt-mode-edit"
                                : "gp-receipt-mode"
                        }
                    >
                        {modoEdicion
                            ? "Edición"
                            : "Nuevo"}
                    </div>
                </div>


                {/* BODY */}

                <div className="gp-receipt-body">

                    {/* =================================================
                        CUENTAS
                       ================================================= */}

                    <section className="gp-receipt-section">

                        <div className="gp-receipt-section-header">

                            <div>
                                <Search
                                    size={16}
                                />

                                <div>
                                    <strong>
                                        Cuentas por cobrar
                                    </strong>

                                    <span>
                                        Selecciona las cuentas
                                        que deseas aplicar al recibo.
                                    </span>
                                </div>
                            </div>


                            <button
                                type="button"
                                className="gp-receipt-search-cxc"
                                onClick={() =>
                                    setModalOpen(
                                        true,
                                    )
                                }
                            >
                                <Search
                                    size={14}
                                />

                                Buscar cuentas
                            </button>
                        </div>


                        {/* MULTI */}

                        {selectedCuentas.length >
                        0 ? (
                            <div className="gp-receipt-selected">

                                <div className="gp-receipt-selected-client">

                                    <div>
                                        <span>
                                            Cliente
                                        </span>

                                        <strong>
                                            {form.cliente_nombre ||
                                                "Sin nombre"}
                                        </strong>
                                    </div>


                                    <div>
                                        <span>
                                            Cuentas seleccionadas
                                        </span>

                                        <strong>
                                            {
                                                selectedCuentas.length
                                            }
                                        </strong>
                                    </div>


                                    <div className="gp-receipt-selected-total">
                                        <span>
                                            Total a recibir
                                        </span>

                                        <strong>
                                            Q{" "}
                                            {fmt2.format(
                                                totalSeleccionado,
                                            )}
                                        </strong>
                                    </div>
                                </div>


                                <div className="gp-receipt-table-wrapper">

                                    <table className="gp-receipt-table">

                                        <thead>
                                            <tr>
                                                <th>
                                                    ID CxC
                                                </th>

                                                <th>
                                                    No. Interno
                                                </th>

                                                <th>
                                                    Fecha
                                                </th>

                                                <th className="gp-receipt-money">
                                                    Saldo
                                                </th>

                                                <th className="gp-receipt-money">
                                                    Monto a pagar
                                                </th>
                                            </tr>
                                        </thead>


                                        <tbody>
                                            {selectedCuentas.map(
                                                (
                                                    cuenta,
                                                    index,
                                                ) => (
                                                    <tr
                                                        key={
                                                            cuenta.idcuentaporcobrar
                                                        }
                                                    >
                                                        <td>
                                                            <span className="gp-receipt-cxc-id">
                                                                {
                                                                    cuenta.idcuentaporcobrar
                                                                }
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {
                                                                cuenta.nofactura
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                cuenta.fecha_emision
                                                            }
                                                        </td>

                                                        <td className="gp-receipt-money">
                                                            Q{" "}
                                                            {fmt2.format(
                                                                Number(
                                                                    cuenta.saldo_pendiente,
                                                                ) ||
                                                                    0,
                                                            )}
                                                        </td>

                                                        <td className="gp-receipt-money">

                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                inputProps={{
                                                                    step:
                                                                        "any",

                                                                    min:
                                                                        0,

                                                                    max:
                                                                        Number(
                                                                            cuenta.saldo_pendiente,
                                                                        ) ||
                                                                        0,
                                                                }}
                                                                value={
                                                                    cuenta.monto_a_pagar
                                                                }
                                                                onChange={(e) => {
                                                                    const val =
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        );

                                                                    setSelectedCuentas(
                                                                        (
                                                                            prev,
                                                                        ) => {
                                                                            const copy =
                                                                                [
                                                                                    ...prev,
                                                                                ];

                                                                            const max =
                                                                                Number(
                                                                                    copy[
                                                                                        index
                                                                                    ]
                                                                                        .saldo_pendiente,
                                                                                ) ||
                                                                                0;

                                                                            copy[
                                                                                index
                                                                            ] =
                                                                                {
                                                                                    ...copy[
                                                                                        index
                                                                                    ],

                                                                                    monto_a_pagar:
                                                                                        isNaN(
                                                                                            val,
                                                                                        )
                                                                                            ? 0
                                                                                            : Math.min(
                                                                                                  Math.max(
                                                                                                      val,
                                                                                                      0,
                                                                                                  ),
                                                                                                  max,
                                                                                              ),
                                                                                };

                                                                            return copy;
                                                                        },
                                                                    );
                                                                }}
                                                                className="gp-receipt-amount-input"
                                                            />
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>


                                        <tfoot>
                                            <tr>
                                                <td
                                                    colSpan={
                                                        4
                                                    }
                                                    className="gp-receipt-total-label"
                                                >
                                                    Total a recibir
                                                </td>

                                                <td className="gp-receipt-total-value">
                                                    Q{" "}
                                                    {fmt2.format(
                                                        totalSeleccionado,
                                                    )}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>


                                <div className="gp-receipt-table-note">
                                    El total del recibo se
                                    calcula automáticamente
                                    con la suma de los montos
                                    a pagar.
                                </div>
                            </div>
                        ) : form.idcuentaporcobrar ? (
                            <div className="gp-receipt-simple-account">

                                <div>
                                    <span>
                                        Cliente
                                    </span>

                                    <strong>
                                        {form.cliente_nombre ||
                                            "Sin nombre"}
                                    </strong>
                                </div>


                                <div>
                                    <span>
                                        Saldo pendiente
                                    </span>

                                    <strong>
                                        Q{" "}
                                        {fmt2.format(
                                            Number(
                                                form.saldo_pendiente,
                                            ) ||
                                                0,
                                        )}
                                    </strong>
                                </div>
                            </div>
                        ) : (
                            <div className="gp-receipt-no-accounts">
                                <FileText
                                    size={24}
                                />

                                <div>
                                    <strong>
                                        Sin cuentas seleccionadas
                                    </strong>

                                    <span>
                                        Utiliza “Buscar cuentas”
                                        para seleccionar las CxC
                                        que se aplicarán al recibo.
                                    </span>
                                </div>
                            </div>
                        )}
                    </section>


                    {/* =================================================
                        FORMULARIO
                       ================================================= */}

                    <form
                        onSubmit={
                            handleSubmit
                        }
                    >

                        <section className="gp-receipt-section">

                            <div className="gp-receipt-section-header">

                                <div>
                                    <FileText
                                        size={16}
                                    />

                                    <div>
                                        <strong>
                                            Datos del recibo
                                        </strong>

                                        <span>
                                            Información general
                                            del documento.
                                        </span>
                                    </div>
                                </div>
                            </div>


                            <div className="gp-receipt-form-grid">

                                {/* SERIE */}

                                <div className="gp-receipt-field">
                                    <label>
                                        Serie
                                        <span>
                                            *
                                        </span>
                                    </label>

                                    <input
                                        name="serie"
                                        value={
                                            form.serie
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        maxLength={
                                            10
                                        }
                                        required
                                    />
                                </div>


                                {/* NUMERO */}

                                <div className="gp-receipt-field">
                                    <label>
                                        Número
                                        <span>
                                            *
                                        </span>
                                    </label>

                                    <input
                                        name="numero"
                                        value={
                                            form.numero
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        inputMode="numeric"
                                        placeholder="Solo números"
                                        required
                                    />
                                </div>


                                {/* TIPO */}

                                <div className="gp-receipt-field">
                                    <label>
                                        Tipo
                                        <span>
                                            *
                                        </span>
                                    </label>

                                    <select
                                        name="tipo"
                                        value={
                                            form.tipo
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                    >
                                        <option value="RECIBO">
                                            RECIBO
                                        </option>

                                        <option value="RETENCIÓN">
                                            RETENCIÓN
                                        </option>
                                    </select>
                                </div>


                                {/* FECHA */}

                                <div className="gp-receipt-field">
                                    <label>
                                        Fecha del recibo
                                        <span>
                                            *
                                        </span>
                                    </label>

                                    <input
                                        type="date"
                                        name="fecha_recibo"
                                        value={
                                            form.fecha_recibo ||
                                            ""
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                    />
                                </div>


                                {/* MONTO */}

                                <div className="gp-receipt-field gp-receipt-field-wide">
                                    <label>
                                        Monto recibido
                                        <span>
                                            *
                                        </span>
                                    </label>

                                    <input
                                        type="number"
                                        step="any"
                                        name="monto_recibido"
                                        value={
                                            form.monto_recibido
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                        className="gp-receipt-amount-main"
                                    />
                                </div>


                                {/* METODO */}

                                <div className="gp-receipt-field gp-receipt-field-wide">
                                    <label>
                                        Método de pago
                                    </label>

                                    <select
                                        name="metodo_pago"
                                        value={
                                            form.metodo_pago
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    >
                                        <option value="Efectivo">
                                            Efectivo
                                        </option>

                                        <option value="Transferencia">
                                            Transferencia
                                        </option>

                                        <option value="Cheque">
                                            Cheque
                                        </option>
                                    </select>
                                </div>


                                {/* REFERENCIA */}

                                <div className="gp-receipt-field gp-receipt-field-full">
                                    <label>
                                        Referencia
                                    </label>

                                    <input
                                        name="referencia"
                                        value={
                                            form.referencia
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Número de transferencia, cheque u otra referencia"
                                    />
                                </div>


                                {/* OBSERVACIONES */}

                                <div className="gp-receipt-field gp-receipt-field-full">
                                    <label>
                                        Observaciones
                                    </label>

                                    <textarea
                                        name="observaciones"
                                        value={
                                            form.observaciones
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        rows={
                                            3
                                        }
                                    />
                                </div>
                            </div>
                        </section>


                        {/* FOOTER */}

                        <div className="gp-receipt-footer">

                            <button
                                type="button"
                                className="gp-receipt-new-button"
                                onClick={
                                    handleNuevoRecibo
                                }
                            >
                                <Eraser
                                    size={15}
                                />

                                Nuevo recibo
                            </button>


                            <button
                                type="submit"
                                className="gp-receipt-save-button"
                            >
                                <Save
                                    size={15}
                                />

                                {modoEdicion
                                    ? "Actualizar recibo"
                                    : "Guardar recibo"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>


            {/* =================================================
                MODAL CUENTAS POR COBRAR
               ================================================= */}

            <Dialog
                open={
                    modalOpen
                }
                onClose={() =>
                    setModalOpen(
                        false,
                    )
                }
                fullWidth
                maxWidth="xl"
                className="gp-receipt-dialog"
            >

                <DialogTitle className="gp-receipt-dialog-title">

                    <div>
                        <WalletCards
                            size={18}
                        />

                        <div>
                            <span>
                                CUENTAS POR COBRAR
                            </span>

                            <strong>
                                Seleccionar cuentas
                            </strong>
                        </div>
                    </div>


                    <button
                        type="button"
                        onClick={() =>
                            setModalOpen(
                                false,
                            )
                        }
                    >
                        <X
                            size={17}
                        />
                    </button>
                </DialogTitle>


                <DialogContent className="gp-receipt-dialog-content">

                    {/* CLIENTE */}

                    <div className="gp-receipt-dialog-search">

                        <div className="gp-receipt-dialog-client">

                            <label>
                                Cliente
                            </label>

                            <Autocomplete
                                fullWidth
                                options={
                                    clientes
                                }
                                getOptionLabel={(
                                    option,
                                ) =>
                                    option?.nombre ??
                                    ""
                                }
                                isOptionEqualToValue={(
                                    option,
                                    value,
                                ) =>
                                    String(
                                        option.idcliente,
                                    ) ===
                                    String(
                                        value.idcliente,
                                    )
                                }
                                value={
                                    clienteSelObj
                                }
                                onChange={(
                                    _,
                                    value,
                                ) =>
                                    setClienteSelObj(
                                        value ??
                                            null,
                                    )
                                }
                                inputValue={
                                    clienteInput
                                }
                                onInputChange={(
                                    _,
                                    value,
                                ) =>
                                    setClienteInput(
                                        value,
                                    )
                                }
                                renderInput={(
                                    params,
                                ) => (
                                    <TextField
                                        {...params}
                                        placeholder="Escribe nombre..."
                                        size="small"
                                    />
                                )}
                                filterOptions={(
                                    options,
                                    state,
                                ) => {
                                    const q =
                                        norm(
                                            state.inputValue,
                                        );

                                    if (!q) {
                                        return options.slice(
                                            0,
                                            50,
                                        );
                                    }

                                    return options
                                        .filter(
                                            (
                                                option,
                                            ) =>
                                                norm(
                                                    option.nombre,
                                                ).includes(
                                                    q,
                                                ),
                                        )
                                        .slice(
                                            0,
                                            50,
                                        );
                                }}
                                renderOption={(
                                    props,
                                    option,
                                    {
                                        inputValue,
                                    },
                                ) => {
                                    const {
                                        key,
                                        ...rest
                                    } =
                                        props;

                                    const texto =
                                        option.nombre ??
                                        "";

                                    const q =
                                        norm(
                                            inputValue,
                                        );

                                    const index =
                                        norm(
                                            texto,
                                        ).indexOf(
                                            q,
                                        );


                                    return (
                                        <li
                                            key={String(
                                                option.idcliente,
                                            )}
                                            {...rest}
                                        >
                                            {q &&
                                            index >=
                                                0 ? (
                                                <>
                                                    {texto.slice(
                                                        0,
                                                        index,
                                                    )}

                                                    <strong>
                                                        {texto.slice(
                                                            index,
                                                            index +
                                                                inputValue.length,
                                                        )}
                                                    </strong>

                                                    {texto.slice(
                                                        index +
                                                            inputValue.length,
                                                    )}
                                                </>
                                            ) : (
                                                texto
                                            )}
                                        </li>
                                    );
                                }}
                                clearOnBlur={
                                    false
                                }
                                openOnFocus
                            />
                        </div>


                        <button
                            type="button"
                            className="gp-receipt-dialog-search-button"
                            onClick={
                                handleBuscarCuentas
                            }
                            disabled={
                                !clienteSelObj
                            }
                        >
                            <Search
                                size={14}
                            />

                            Buscar cuentas
                        </button>
                    </div>


                    {/* TABLE */}

                    <div className="gp-receipt-mrt">

                        <MaterialReactTable
                            columns={
                                columnas
                            }
                            data={cuentas.map(
                                (
                                    cuenta,
                                ) => ({
                                    ...cuenta,

                                    monto_a_pagar:
                                        selectedCuentas.find(
                                            (
                                                seleccionada,
                                            ) =>
                                                seleccionada.idcuentaporcobrar ===
                                                cuenta.idcuentaporcobrar,
                                        )
                                            ?.monto_a_pagar ??
                                        (Number(
                                            cuenta.saldo_pendiente,
                                        ) ||
                                            0),
                                }),
                            )}
                            getRowId={(
                                row,
                            ) =>
                                String(
                                    row.idcuentaporcobrar,
                                )
                            }
                            enableGlobalFilter
                            enablePagination
                            enableRowSelection
                            enableMultiRowSelection
                            enableEditing
                            editDisplayMode="cell"
                            onRowSelectionChange={
                                setRowSelection
                            }
                            state={{
                                rowSelection,
                            }}
                            muiTableContainerProps={{
                                sx: {
                                    maxHeight:
                                        430,
                                },
                            }}
                            muiTablePaperProps={{
                                elevation:
                                    0,

                                sx: {
                                    border:
                                        "1px solid #dfe6ec",

                                    borderRadius:
                                        "8px",

                                    overflow:
                                        "hidden",
                                },
                            }}
                            muiTableHeadCellProps={{
                                sx: {
                                    fontSize:
                                        "10px",

                                    fontWeight:
                                        700,

                                    backgroundColor:
                                        "#f3f6f9",

                                    color:
                                        "#475569",
                                },
                            }}
                            muiTableBodyCellProps={{
                                sx: {
                                    fontSize:
                                        "10px",
                                },
                            }}
                            muiSearchTextFieldProps={{
                                size:
                                    "small",

                                placeholder:
                                    "Buscar en cuentas...",
                            }}
                            onEditingCellSave={({
                                row,
                                value,
                                table,
                            }) => {
                                const max =
                                    Number(
                                        row
                                            .original
                                            .saldo_pendiente,
                                    ) ||
                                    0;

                                const val =
                                    Math.min(
                                        Math.max(
                                            Number(
                                                value,
                                            ) ||
                                                0,
                                            0,
                                        ),
                                        max,
                                    );


                                setSelectedCuentas(
                                    (
                                        prev,
                                    ) => {
                                        const copy =
                                            [
                                                ...prev,
                                            ];


                                        const index =
                                            copy.findIndex(
                                                (
                                                    item,
                                                ) =>
                                                    item.idcuentaporcobrar ===
                                                    row
                                                        .original
                                                        .idcuentaporcobrar,
                                            );


                                        if (
                                            index >=
                                            0
                                        ) {
                                            copy[
                                                index
                                            ] = {
                                                ...copy[
                                                    index
                                                ],

                                                monto_a_pagar:
                                                    val,
                                            };
                                        } else {
                                            copy.push({
                                                ...row.original,

                                                monto_a_pagar:
                                                    val,
                                            });
                                        }


                                        return copy;
                                    },
                                );


                                table.setEditingCell(
                                    null,
                                );
                            }}
                            renderTopToolbarCustomActions={({
                                table,
                            }) => {
                                const selectedRows =
                                    table.getSelectedRowModel()
                                        .rows ??
                                    [];


                                return (
                                    <div className="gp-receipt-mrt-actions">

                                        <span>
                                            Seleccionadas:{" "}
                                            <strong>
                                                {
                                                    selectedRows.length
                                                }
                                            </strong>
                                        </span>


                                        <button
                                            type="button"
                                            disabled={
                                                selectedRows.length ===
                                                0
                                            }
                                            onClick={() => {
                                                const base =
                                                    selectedRows.map(
                                                        (
                                                            row,
                                                        ) =>
                                                            row.original,
                                                    );


                                                const enriquecidas =
                                                    base.map(
                                                        (
                                                            item,
                                                        ) => {
                                                            const existente =
                                                                selectedCuentas.find(
                                                                    (
                                                                        seleccionada,
                                                                    ) =>
                                                                        seleccionada.idcuentaporcobrar ===
                                                                        item.idcuentaporcobrar,
                                                                );


                                                            return {
                                                                ...item,

                                                                monto_a_pagar:
                                                                    existente
                                                                        ? Number(
                                                                              existente.monto_a_pagar,
                                                                          ) ||
                                                                          0
                                                                        : Number(
                                                                              item.saldo_pendiente,
                                                                          ) ||
                                                                          0,
                                                            };
                                                        },
                                                    );


                                                setSelectedCuentas(
                                                    (
                                                        prev,
                                                    ) => {
                                                        const map =
                                                            new Map();


                                                        [
                                                            ...prev,
                                                            ...enriquecidas,
                                                        ].forEach(
                                                            (
                                                                item,
                                                            ) =>
                                                                map.set(
                                                                    item.idcuentaporcobrar,
                                                                    item,
                                                                ),
                                                        );


                                                        return Array.from(
                                                            map.values(),
                                                        );
                                                    },
                                                );


                                                const sample =
                                                    (enriquecidas[
                                                        0
                                                    ] ??
                                                        selectedCuentas[
                                                            0
                                                        ]) ||
                                                    null;


                                                if (
                                                    sample
                                                ) {
                                                    const idCliente =
                                                        sample?.idcliente ??
                                                        clienteSelObj?.idcliente ??
                                                        "";


                                                    const nombreCliente =
                                                        sample?.cliente_nombre ??
                                                        clienteSelObj?.nombre ??
                                                        clientesById.get(
                                                            String(
                                                                idCliente,
                                                            ).trim(),
                                                        )?.nombre ??
                                                        "";


                                                    setForm(
                                                        (
                                                            prev,
                                                        ) => ({
                                                            ...prev,

                                                            idcliente:
                                                                String(
                                                                    idCliente,
                                                                ),

                                                            cliente_nombre:
                                                                nombreCliente,

                                                            idcuentaporcobrar:
                                                                "",
                                                        }),
                                                    );
                                                }


                                                setModalOpen(
                                                    false,
                                                );
                                            }}
                                        >
                                            Usar seleccionadas
                                        </button>
                                    </div>
                                );
                            }}
                        />
                    </div>
                </DialogContent>


                <DialogActions className="gp-receipt-dialog-footer">

                    <button
                        type="button"
                        onClick={() =>
                            setModalOpen(
                                false,
                            )
                        }
                    >
                        Cerrar
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    );
};


export default ReciboRegistro;