import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";

import {
    Box,
    Button,
    IconButton,
    Radio,
    Tooltip,
} from "@mui/material";

import {
    MaterialReactTable,
    useMaterialReactTable,
} from "material-react-table";

import {
    Plus,
    Trash2,
    Save,
    Search,
    X,
    Mail,
    MapPin,
    UserRound,
} from "lucide-react";

import "../../css/ClienteContactosMRT.css";

const uid = () =>
    `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const API =
    import.meta.env.VITE_API_URL || "/api";

const getAuthHeaders = () => {
    const token =
        localStorage.getItem("token");

    return {
        Authorization: `Bearer ${token}`,
    };
};

export default function ClienteContactosForm({
    idclienteInicial = null,
    bloquearSeleccion = false,
    onClose,
    onSaved,
} = {}) {
    const [clientes, setClientes] =
        useState([]);

    const [clienteId, setClienteId] =
        useState(
            idclienteInicial
                ? Number(idclienteInicial)
                : ""
        );

    const [clienteSearch, setClienteSearch] =
        useState("");

    const [
        mostrarResultadosCliente,
        setMostrarResultadosCliente,
    ] = useState(false);

    const [emails, setEmails] =
        useState([]);

    const [
        direcciones,
        setDirecciones,
    ] = useState([]);

    const [
        eliminarEmails,
        setEliminarEmails,
    ] = useState([]);

    const [
        eliminarDirecciones,
        setEliminarDirecciones,
    ] = useState([]);

    const [
        departamentos,
        setDepartamentos,
    ] = useState([]);

    const [loading, setLoading] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    /*
     * =========================================================
     * DEPARTAMENTOS
     * =========================================================
     */

    const deptoById = useMemo(() => {
        const map = new Map();

        departamentos.forEach((d) =>
            map.set(
                Number(d.id),
                d.nombre
            )
        );

        return map;
    }, [departamentos]);

    /*
     * =========================================================
     * CLIENTE SELECCIONADO
     * =========================================================
     */

    const clienteSeleccionado =
        useMemo(() => {
            return (
                clientes.find(
                    (cliente) =>
                        Number(cliente.id) ===
                        Number(clienteId)
                ) || null
            );
        }, [clientes, clienteId]);

    useEffect(() => {
        if (clienteSeleccionado) {
            setClienteSearch(
                clienteSeleccionado.nombre
            );
        }
    }, [clienteSeleccionado]);

    /*
     * =========================================================
     * BUSCADOR DE CLIENTE
     * =========================================================
     */

    const normalizar = (texto = "") =>
        String(texto)
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .trim();

    const clientesFiltrados =
        useMemo(() => {
            if (
                !clienteSearch.trim()
            ) {
                return [];
            }

            const search =
                normalizar(clienteSearch);

            return clientes
                .filter((cliente) =>
                    normalizar(
                        cliente.nombre
                    ).includes(search)
                )
                .slice(0, 12);
        }, [
            clientes,
            clienteSearch,
        ]);

    const seleccionarCliente = (
        cliente
    ) => {
        setClienteId(cliente.id);

        setClienteSearch(
            cliente.nombre
        );

        setMostrarResultadosCliente(
            false
        );
    };

    const limpiarCliente = () => {
        if (bloquearSeleccion) {
            return;
        }

        setClienteId("");
        setClienteSearch("");
        setEmails([]);
        setDirecciones([]);
        setEliminarEmails([]);
        setEliminarDirecciones([]);
        setMostrarResultadosCliente(
            false
        );
    };

    /*
     * =========================================================
     * CARGA DE CATÁLOGOS
     * =========================================================
     */

    useEffect(() => {
        if (
            idclienteInicial != null
        ) {
            setClienteId(
                Number(
                    idclienteInicial
                )
            );
        }

        const loadClientes =
            async () => {
                try {
                    const res =
                        await axios.get(
                            `${API}/lista_clientes`,
                            {
                                headers:
                                    getAuthHeaders(),
                            }
                        );

                    const mapped =
                        res.data.map(
                            (c) => ({
                                id:
                                    c.id ??
                                    c.idcliente,
                                nombre:
                                    c.nombre,
                            })
                        );

                    setClientes(mapped);
                } catch (err) {
                    try {
                        const res2 =
                            await axios.get(
                                `${API}/clientes-contacto/options`,
                                {
                                    headers:
                                        getAuthHeaders(),
                                }
                            );

                        setClientes(
                            res2.data
                        );
                    } catch (err2) {
                        alertify.error(
                            "Error al cargar clientes"
                        );
                    }
                }
            };

        const loadDepartamentos =
            async () => {
                try {
                    const res =
                        await axios.get(
                            `${API}/departamentos/options`,
                            {
                                headers:
                                    getAuthHeaders(),
                            }
                        );

                    setDepartamentos(
                        res.data || []
                    );
                } catch (err) {
                    try {
                        const res2 =
                            await axios.get(
                                `${API}/lista_departamentos`,
                                {
                                    headers:
                                        getAuthHeaders(),
                                }
                            );

                        const mapped = (
                            res2.data || []
                        ).map((d) => ({
                            id:
                                d.id ??
                                d.iddepartamento,

                            nombre:
                                d.nombre ??
                                d.departamento ??
                                d.descripcion,
                        }));

                        setDepartamentos(
                            mapped
                        );
                    } catch (err2) {
                        alertify.error(
                            "Error al cargar departamentos"
                        );
                    }
                }
            };

        loadClientes();
        loadDepartamentos();
    }, [idclienteInicial]);

    /*
     * =========================================================
     * CONTACTOS DEL CLIENTE
     * =========================================================
     */

    useEffect(() => {
        const loadContactos =
            async () => {
                if (!clienteId) {
                    return;
                }

                try {
                    setLoading(true);

                    const res =
                        await axios.get(
                            `${API}/clientes-contacto/${clienteId}/contactos`,
                            {
                                headers:
                                    getAuthHeaders(),
                            }
                        );

                    setEmails(
                        (
                            res.data
                                .emails || []
                        ).map((e) => ({
                            ...e,

                            tmpId:
                                e.id ??
                                uid(),
                        }))
                    );

                    setDirecciones(
                        (
                            res.data
                                .direcciones ||
                            []
                        ).map((d) => ({
                            ...d,

                            referencia:
                                d.referencia ==
                                null
                                    ? ""
                                    : String(
                                          d.referencia
                                      ),

                            ciudad:
                                d.ciudad ==
                                null
                                    ? ""
                                    : String(
                                          d.ciudad
                                      ),

                            pais:
                                d.pais ==
                                null
                                    ? "Guatemala"
                                    : String(
                                          d.pais
                                      ),

                            tmpId:
                                d.id ??
                                uid(),
                        }))
                    );

                    setEliminarEmails(
                        []
                    );

                    setEliminarDirecciones(
                        []
                    );
                } catch (err) {
                    alertify.error(
                        "Error al cargar contactos del cliente"
                    );

                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };

        loadContactos();
    }, [clienteId]);

    /*
     * =========================================================
     * PRINCIPALES
     * =========================================================
     */

    const setEmailPrincipal = (
        rowIndex
    ) => {
        setEmails((prev) =>
            prev.map((row, index) => ({
                ...row,

                es_principal:
                    index ===
                    rowIndex,
            }))
        );
    };

    const setDireccionPrincipal = (
        rowIndex
    ) => {
        setDirecciones((prev) =>
            prev.map((row, index) => ({
                ...row,

                es_principal:
                    index ===
                    rowIndex,
            }))
        );
    };

    /*
     * =========================================================
     * COLUMNAS EMAIL
     * =========================================================
     */

    const emailColumns =
        useMemo(
            () => [
                {
                    header:
                        "Correo electrónico",

                    accessorKey:
                        "email",

                    size: 280,

                    muiEditTextFieldProps:
                        {
                            required:
                                true,

                            type: "email",

                            inputProps: {
                                maxLength:
                                    190,
                            },

                            placeholder:
                                "correo@empresa.com",
                        },

                    Cell: ({
                        row,
                    }) =>
                        row.original
                            .email || "",
                },

                {
                    header: "Tipo",

                    accessorKey:
                        "tipo",

                    size: 160,

                    muiEditTextFieldProps:
                        {
                            placeholder:
                                "Facturación, trabajo...",
                        },
                },

                {
                    header:
                        "Principal",

                    accessorKey:
                        "es_principal",

                    enableEditing:
                        false,

                    size: 90,

                    Cell: ({
                        row,
                    }) => (
                        <Tooltip
                            title="Establecer como correo principal"
                            arrow
                        >
                            <Radio
                                size="small"
                                checked={
                                    !!row
                                        .original
                                        .es_principal
                                }
                                onChange={() =>
                                    setEmailPrincipal(
                                        row.index
                                    )
                                }
                            />
                        </Tooltip>
                    ),
                },
            ],
            []
        );

    /*
     * =========================================================
     * COLUMNAS DIRECCIONES
     * =========================================================
     */

    const dirColumns =
        useMemo(
            () => [
                {
                    header:
                        "Dirección",

                    accessorKey:
                        "direccion",

                    size: 270,

                    muiEditTextFieldProps:
                        {
                            required:
                                true,

                            inputProps: {
                                maxLength:
                                    255,
                            },
                        },

                    Cell: ({
                        row,
                    }) =>
                        row.original
                            .direccion ||
                        "",
                },

                {
                    header:
                        "Referencia",

                    accessorKey:
                        "referencia",

                    size: 220,

                    muiEditTextFieldProps:
                        {
                            inputProps: {
                                maxLength:
                                    255,
                            },
                        },
                },

                {
                    header:
                        "Ciudad",

                    accessorKey:
                        "ciudad",

                    size: 150,

                    muiEditTextFieldProps:
                        {
                            inputProps: {
                                maxLength:
                                    80,
                            },
                        },
                },

                {
                    header:
                        "Departamento",

                    accessorKey:
                        "iddepartamento",

                    size: 210,

                    editVariant:
                        "select",

                    editSelectOptions:
                        [
                            {
                                value: "",
                                label:
                                    "— Sin departamento —",
                            },

                            ...departamentos.map(
                                (d) => ({
                                    value:
                                        String(
                                            d.id
                                        ),

                                    label:
                                        d.nombre,
                                })
                            ),
                        ],

                    Cell: ({
                        row,
                    }) => {
                        const id =
                            row.original
                                .iddepartamento;

                        if (
                            id == null ||
                            id === ""
                        ) {
                            return "—";
                        }

                        return (
                            deptoById.get(
                                Number(id)
                            ) ?? `#${id}`
                        );
                    },
                },

                {
                    header: "País",

                    accessorKey:
                        "pais",

                    size: 130,

                    muiEditTextFieldProps:
                        {
                            inputProps: {
                                maxLength:
                                    80,
                            },
                        },
                },

                {
                    header: "Lat",

                    accessorKey:
                        "lat",

                    size: 100,

                    muiEditTextFieldProps:
                        {
                            type: "number",

                            step: "any",

                            placeholder:
                                "Opcional",
                        },
                },

                {
                    header: "Lng",

                    accessorKey:
                        "lng",

                    size: 100,

                    muiEditTextFieldProps:
                        {
                            type: "number",

                            step: "any",

                            placeholder:
                                "Opcional",
                        },
                },

                {
                    header:
                        "Principal",

                    accessorKey:
                        "es_principal",

                    enableEditing:
                        false,

                    size: 90,

                    Cell: ({
                        row,
                    }) => (
                        <Tooltip
                            title="Establecer como dirección principal"
                            arrow
                        >
                            <Radio
                                size="small"
                                checked={
                                    !!row
                                        .original
                                        .es_principal
                                }
                                onChange={() =>
                                    setDireccionPrincipal(
                                        row.index
                                    )
                                }
                            />
                        </Tooltip>
                    ),
                },
            ],
            [
                departamentos,
                deptoById,
            ]
        );

    /*
     * =========================================================
     * TABLA EMAILS
     * =========================================================
     */

    const tableEmails =
        useMaterialReactTable({
            columns: emailColumns,

            data: emails,

            getRowId: (row) =>
                String(
                    row.id ??
                        row.tmpId
                ),

            enableEditing: true,

            editDisplayMode: "row",

            createDisplayMode:
                "row",

            positionActionsColumn:
                "last",

            enableRowActions: true,

            enableGlobalFilter: false,

            enableColumnFilters:
                false,

            enableDensityToggle:
                false,

            initialState: {
                density: "compact",
            },

            onCreatingRowSave:
                async ({
                    values,
                    table,
                }) => {
                    const newRow = {
                        id: null,

                        tmpId: uid(),

                        email:
                            values.email?.trim() ||
                            "",

                        tipo:
                            values.tipo?.trim() ||
                            "",

                        es_principal:
                            emails.length ===
                            0
                                ? true
                                : !!values.es_principal,

                        estado: 1,
                    };

                    setEmails(
                        (prev) => {
                            const list = [
                                ...prev,
                                newRow,
                            ];

                            if (
                                newRow.es_principal
                            ) {
                                return list.map(
                                    (
                                        row,
                                        index
                                    ) => ({
                                        ...row,

                                        es_principal:
                                            index ===
                                            list.length -
                                                1,
                                    })
                                );
                            }

                            return list;
                        }
                    );

                    table.setCreatingRow(
                        null
                    );
                },

            onEditingRowSave:
                async ({
                    values,
                    row,
                    table,
                }) => {
                    setEmails(
                        (prev) => {
                            const list =
                                prev.map(
                                    (
                                        item,
                                        index
                                    ) =>
                                        index ===
                                        row.index
                                            ? {
                                                  ...item,

                                                  email:
                                                      values.email?.trim() ||
                                                      "",

                                                  tipo:
                                                      values.tipo?.trim() ||
                                                      "",
                                              }
                                            : item
                                );

                            if (
                                values.es_principal
                            ) {
                                return list.map(
                                    (
                                        item,
                                        index
                                    ) => ({
                                        ...item,

                                        es_principal:
                                            index ===
                                            row.index,
                                    })
                                );
                            }

                            return list;
                        }
                    );

                    table.setEditingRow(
                        null
                    );
                },

            renderTopToolbarCustomActions:
                ({ table }) => (
                    <button
                        type="button"
                        className="contact-data-add-button"
                        onClick={() =>
                            table.setCreatingRow(
                                true
                            )
                        }
                    >
                        <Plus
                            size={17}
                        />

                        Agregar correo
                    </button>
                ),

            renderRowActions: ({
                row,
            }) => (
                <Tooltip
                    title="Eliminar correo"
                    arrow
                >
                    <IconButton
                        size="small"
                        className="contact-data-delete-button"
                        onClick={() => {
                            const item =
                                emails[
                                    row.index
                                ];

                            if (
                                item?.id
                            ) {
                                setEliminarEmails(
                                    (
                                        prev
                                    ) => [
                                        ...prev,
                                        item.id,
                                    ]
                                );
                            }

                            setEmails(
                                (
                                    prev
                                ) =>
                                    prev.filter(
                                        (
                                            _,
                                            index
                                        ) =>
                                            index !==
                                            row.index
                                    )
                            );
                        }}
                    >
                        <Trash2
                            size={17}
                        />
                    </IconButton>
                </Tooltip>
            ),

            muiTablePaperProps: {
                elevation: 0,

                sx: {
                    borderRadius:
                        "10px",

                    overflow:
                        "hidden",
                },
            },

            muiTableHeadCellProps:
                {
                    sx: {
                        backgroundColor:
                            "#f8fafc",

                        color:
                            "#334155",

                        fontWeight:
                            700,

                        fontSize:
                            "0.77rem",

                        borderBottom:
                            "1px solid #e2e8f0",
                    },
                },

            muiTableBodyCellProps:
                {
                    sx: {
                        fontSize:
                            "0.8rem",

                        color:
                            "#334155",
                    },
                },

            muiTableBodyRowProps:
                {
                    hover: true,
                },
        });

    /*
     * =========================================================
     * TABLA DIRECCIONES
     * =========================================================
     */

    const tableDirecciones =
        useMaterialReactTable({
            columns: dirColumns,

            data: direcciones,

            getRowId: (row) =>
                String(
                    row.id ??
                        row.tmpId
                ),

            enableEditing: true,

            editDisplayMode: "row",

            createDisplayMode:
                "row",

            positionActionsColumn:
                "last",

            enableRowActions: true,

            enableGlobalFilter: false,

            enableColumnFilters:
                false,

            enableDensityToggle:
                false,

            initialState: {
                density: "compact",
            },

            onCreatingRowSave:
                async ({
                    values,
                    table,
                }) => {
                    const iddep =
                        values.iddepartamento ===
                            "" ||
                        values.iddepartamento ==
                            null
                            ? null
                            : Number(
                                  values.iddepartamento
                              );

                    const newRow = {
                        id: null,

                        tmpId: uid(),

                        direccion:
                            values.direccion?.trim() ||
                            "",

                        referencia:
                            (
                                values.referencia ??
                                ""
                            )
                                .toString()
                                .trim(),

                        ciudad:
                            values.ciudad?.trim() ||
                            "",

                        iddepartamento:
                            iddep,

                        pais:
                            values.pais?.trim() ||
                            "Guatemala",

                        lat:
                            values.lat ===
                                "" ||
                            values.lat ==
                                null
                                ? null
                                : Number(
                                      values.lat
                                  ),

                        lng:
                            values.lng ===
                                "" ||
                            values.lng ==
                                null
                                ? null
                                : Number(
                                      values.lng
                                  ),

                        es_principal:
                            direcciones.length ===
                            0
                                ? true
                                : !!values.es_principal,

                        estado: 1,
                    };

                    setDirecciones(
                        (prev) => {
                            const list = [
                                ...prev,
                                newRow,
                            ];

                            if (
                                newRow.es_principal
                            ) {
                                return list.map(
                                    (
                                        row,
                                        index
                                    ) => ({
                                        ...row,

                                        es_principal:
                                            index ===
                                            list.length -
                                                1,
                                    })
                                );
                            }

                            return list;
                        }
                    );

                    table.setCreatingRow(
                        null
                    );
                },

            onEditingRowSave:
                async ({
                    values,
                    row,
                    table,
                }) => {
                    const iddep =
                        values.iddepartamento ===
                            "" ||
                        values.iddepartamento ==
                            null
                            ? null
                            : Number(
                                  values.iddepartamento
                              );

                    setDirecciones(
                        (prev) => {
                            const list =
                                prev.map(
                                    (
                                        item,
                                        index
                                    ) =>
                                        index ===
                                        row.index
                                            ? {
                                                  ...item,

                                                  direccion:
                                                      values.direccion?.trim() ||
                                                      "",

                                                  referencia:
                                                      (
                                                          values.referencia ??
                                                          ""
                                                      )
                                                          .toString()
                                                          .trim(),

                                                  ciudad:
                                                      values.ciudad?.trim() ||
                                                      "",

                                                  iddepartamento:
                                                      iddep,

                                                  pais:
                                                      values.pais?.trim() ||
                                                      "Guatemala",

                                                  lat:
                                                      values.lat ===
                                                          "" ||
                                                      values.lat ==
                                                          null
                                                          ? null
                                                          : Number(
                                                                values.lat
                                                            ),

                                                  lng:
                                                      values.lng ===
                                                          "" ||
                                                      values.lng ==
                                                          null
                                                          ? null
                                                          : Number(
                                                                values.lng
                                                            ),
                                              }
                                            : item
                                );

                            if (
                                values.es_principal
                            ) {
                                return list.map(
                                    (
                                        item,
                                        index
                                    ) => ({
                                        ...item,

                                        es_principal:
                                            index ===
                                            row.index,
                                    })
                                );
                            }

                            return list;
                        }
                    );

                    table.setEditingRow(
                        null
                    );
                },

            renderTopToolbarCustomActions:
                ({ table }) => (
                    <button
                        type="button"
                        className="contact-data-add-button"
                        onClick={() =>
                            table.setCreatingRow(
                                true
                            )
                        }
                    >
                        <Plus
                            size={17}
                        />

                        Agregar dirección
                    </button>
                ),

            renderRowActions: ({
                row,
            }) => (
                <Tooltip
                    title="Eliminar dirección"
                    arrow
                >
                    <IconButton
                        size="small"
                        className="contact-data-delete-button"
                        onClick={() => {
                            const item =
                                direcciones[
                                    row.index
                                ];

                            if (
                                item?.id
                            ) {
                                setEliminarDirecciones(
                                    (
                                        prev
                                    ) => [
                                        ...prev,
                                        item.id,
                                    ]
                                );
                            }

                            setDirecciones(
                                (
                                    prev
                                ) =>
                                    prev.filter(
                                        (
                                            _,
                                            index
                                        ) =>
                                            index !==
                                            row.index
                                    )
                            );
                        }}
                    >
                        <Trash2
                            size={17}
                        />
                    </IconButton>
                </Tooltip>
            ),

            muiTablePaperProps: {
                elevation: 0,

                sx: {
                    borderRadius:
                        "10px",

                    overflow:
                        "hidden",
                },
            },

            muiTableHeadCellProps:
                {
                    sx: {
                        backgroundColor:
                            "#f8fafc",

                        color:
                            "#334155",

                        fontWeight:
                            700,

                        fontSize:
                            "0.77rem",

                        borderBottom:
                            "1px solid #e2e8f0",
                    },
                },

            muiTableBodyCellProps:
                {
                    sx: {
                        fontSize:
                            "0.8rem",

                        color:
                            "#334155",
                    },
                },

            muiTableBodyRowProps:
                {
                    hover: true,
                },
        });

    /*
     * =========================================================
     * GUARDAR
     * =========================================================
     */

    const handleSubmit =
        async () => {
            if (!clienteId) {
                return alertify.warning(
                    "Selecciona un cliente."
                );
            }

            const badEmail =
                emails.some(
                    (email) =>
                        !email.email ||
                        !/^\S+@\S+\.\S+$/.test(
                            email.email
                        )
                );

            if (badEmail) {
                return alertify.error(
                    "Hay correos con formato inválido."
                );
            }

            const badDir =
                direcciones.some(
                    (direccion) =>
                        !direccion.direccion
                );

            if (badDir) {
                return alertify.error(
                    "Toda dirección debe tener el campo 'Dirección'."
                );
            }

            const payload = {
                emails: emails.map(
                    (email) => ({
                        id:
                            email.id ??
                            null,

                        email:
                            email.email,

                        tipo:
                            email.tipo ||
                            "",

                        es_principal:
                            !!email.es_principal,

                        estado:
                            email.estado ??
                            1,
                    })
                ),

                direcciones:
                    direcciones.map(
                        (direccion) => ({
                            id:
                                direccion.id ??
                                null,

                            direccion:
                                direccion.direccion,

                            referencia:
                                typeof direccion.referencia ===
                                "string"
                                    ? direccion.referencia
                                    : "",

                            ciudad:
                                direccion.ciudad ||
                                "",

                            iddepartamento:
                                direccion.iddepartamento ??
                                null,

                            pais:
                                direccion.pais ||
                                "Guatemala",

                            lat:
                                direccion.lat ??
                                null,

                            lng:
                                direccion.lng ??
                                null,

                            es_principal:
                                !!direccion.es_principal,

                            estado:
                                direccion.estado ??
                                1,
                        })
                    ),

                eliminarEmails,

                eliminarDirecciones,
            };

            try {
                setSaving(true);

                const { data } =
                    await axios.post(
                        `${API}/clientes-contacto/${clienteId}/contactos`,
                        payload,
                        {
                            headers:
                                getAuthHeaders(),
                        }
                    );

                setEmails(
                    (
                        data.emails || []
                    ).map((email) => ({
                        ...email,

                        tmpId:
                            email.id ??
                            uid(),
                    }))
                );

                setDirecciones(
                    (
                        data.direcciones ||
                        []
                    ).map(
                        (direccion) => ({
                            ...direccion,

                            referencia:
                                direccion.referencia ==
                                null
                                    ? ""
                                    : String(
                                          direccion.referencia
                                      ),

                            ciudad:
                                direccion.ciudad ==
                                null
                                    ? ""
                                    : String(
                                          direccion.ciudad
                                      ),

                            pais:
                                direccion.pais ==
                                null
                                    ? "Guatemala"
                                    : String(
                                          direccion.pais
                                      ),

                            tmpId:
                                direccion.id ??
                                uid(),
                        })
                    )
                );

                setEliminarEmails(
                    []
                );

                setEliminarDirecciones(
                    []
                );

                alertify.success(
                    "Guardado correctamente."
                );

                onSaved?.();
            } catch (err) {
                if (err.response) {
                    const {
                        status,
                        data,
                    } = err.response;

                    if (
                        status === 422
                    ) {
                        if (
                            data.errors
                        ) {
                            Object.values(
                                data.errors
                            )
                                .flat()
                                .forEach(
                                    (
                                        message
                                    ) => {
                                        alertify.error(
                                            message
                                        );
                                    }
                                );
                        } else if (
                            data.message
                        ) {
                            alertify.error(
                                data.message
                            );
                        } else {
                            alertify.error(
                                "Error de validación en el servidor."
                            );
                        }
                    } else if (
                        data.message
                    ) {
                        alertify.error(
                            data.message
                        );
                    } else {
                        alertify.error(
                            "Ocurrió un error en el servidor."
                        );
                    }
                } else {
                    alertify.error(
                        "No se pudo conectar con el servidor."
                    );
                }

                console.error(err);
            } finally {
                setSaving(false);
            }
        };

    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (
        <div className="gp-module-page cliente-contact-data-page">
            <div className="gp-module-card">
                <div className="cliente-contact-data-body">

                    {/* CABECERA */}

                    <div className="erp-meta-header cliente-contact-data-header">
                        <div>
                            <span className="erp-badge">
                                Módulo · Clientes
                            </span>

                            <h2 className="cliente-contact-data-title">
                                Correos y direcciones
                            </h2>

                            <span className="text-muted small d-block">
                                Administre los correos electrónicos y direcciones asociadas a cada cliente.
                            </span>
                        </div>

                        {clienteSeleccionado && (
                            <div className="cliente-contact-data-count">
                                <UserRound
                                    size={15}
                                />

                                Cliente seleccionado
                            </div>
                        )}
                    </div>

                    {/* SELECTOR CLIENTE */}

                    <div className="cliente-contact-select-panel">
                        <div className="cliente-contact-select-label">
                            <UserRound
                                size={18}
                            />

                            <div>
                                <strong>
                                    Cliente
                                </strong>

                                <span>
                                    Seleccione el cliente que desea administrar
                                </span>
                            </div>
                        </div>

                        <div className="cliente-contact-select-row">
                            <div className="cliente-contact-search-wrapper">
                                <div
                                    className={`cliente-contact-search-box ${
                                        clienteSeleccionado
                                            ? "selected"
                                            : ""
                                    }`}
                                >
                                    <Search
                                        size={18}
                                        className="cliente-contact-search-icon"
                                    />

                                    <input
                                        type="text"
                                        value={
                                            clienteSearch
                                        }
                                        disabled={
                                            bloquearSeleccion
                                        }
                                        onFocus={() => {
                                            if (
                                                !bloquearSeleccion
                                            ) {
                                                setMostrarResultadosCliente(
                                                    true
                                                );
                                            }
                                        }}
                                        onChange={(
                                            e
                                        ) => {
                                            if (
                                                bloquearSeleccion
                                            ) {
                                                return;
                                            }

                                            setClienteSearch(
                                                e
                                                    .target
                                                    .value
                                            );

                                            setClienteId(
                                                ""
                                            );

                                            setEmails(
                                                []
                                            );

                                            setDirecciones(
                                                []
                                            );

                                            setMostrarResultadosCliente(
                                                true
                                            );
                                        }}
                                        placeholder="Buscar cliente por nombre..."
                                        className="cliente-contact-search-input"
                                    />

                                    {!bloquearSeleccion &&
                                        clienteSearch && (
                                            <button
                                                type="button"
                                                className="cliente-contact-search-clear"
                                                onClick={
                                                    limpiarCliente
                                                }
                                            >
                                                <X
                                                    size={
                                                        17
                                                    }
                                                />
                                            </button>
                                        )}
                                </div>

                                {mostrarResultadosCliente &&
                                    clienteSearch.trim() &&
                                    !bloquearSeleccion &&
                                    !clienteId && (
                                        <div className="cliente-contact-results">
                                            {clientesFiltrados.length >
                                            0 ? (
                                                clientesFiltrados.map(
                                                    (
                                                        cliente
                                                    ) => (
                                                        <button
                                                            type="button"
                                                            key={
                                                                cliente.id
                                                            }
                                                            className="cliente-contact-result"
                                                            onClick={() =>
                                                                seleccionarCliente(
                                                                    cliente
                                                                )
                                                            }
                                                        >
                                                            <div className="cliente-contact-result-icon">
                                                                <UserRound
                                                                    size={
                                                                        16
                                                                    }
                                                                />
                                                            </div>

                                                            <strong>
                                                                {
                                                                    cliente.nombre
                                                                }
                                                            </strong>
                                                        </button>
                                                    )
                                                )
                                            ) : (
                                                <div className="cliente-contact-no-results">
                                                    No se encontraron clientes
                                                </div>
                                            )}
                                        </div>
                                    )}
                            </div>

                            <button
                                type="button"
                                className="gp-action-button gp-action-save cliente-contact-save"
                                onClick={
                                    handleSubmit
                                }
                                disabled={
                                    !clienteId ||
                                    saving
                                }
                            >
                                <Save
                                    size={17}
                                />

                                {saving
                                    ? "Guardando..."
                                    : "Guardar cambios"}
                            </button>
                        </div>
                    </div>

                    {/* CLIENTE VACÍO */}

                    {!clienteId && (
                        <div className="cliente-contact-empty">
                            <div className="cliente-contact-empty-icon">
                                <UserRound
                                    size={28}
                                />
                            </div>

                            <h3>
                                Seleccione un cliente
                            </h3>

                            <p>
                                Busque un cliente para consultar y administrar sus correos electrónicos y direcciones.
                            </p>
                        </div>
                    )}

                    {/* CONTENIDO */}

                    {clienteId && (
                        <>
                            {/* CORREOS */}

                            <section className="cliente-contact-section">
                                <div className="cliente-contact-section-heading">
                                    <div className="cliente-contact-section-icon email">
                                        <Mail
                                            size={18}
                                        />
                                    </div>

                                    <div>
                                        <h3>
                                            Correos electrónicos
                                        </h3>

                                        <p>
                                            {emails.length} correo
                                            {emails.length ===
                                            1
                                                ? ""
                                                : "s"}{" "}
                                            registrado
                                            {emails.length ===
                                            1
                                                ? ""
                                                : "s"}
                                        </p>
                                    </div>
                                </div>

                                <div className="cliente-contact-table-card">
                                    <MaterialReactTable
                                        table={
                                            tableEmails
                                        }
                                    />
                                </div>
                            </section>

                            {/* DIRECCIONES */}

                            <section className="cliente-contact-section">
                                <div className="cliente-contact-section-heading">
                                    <div className="cliente-contact-section-icon address">
                                        <MapPin
                                            size={18}
                                        />
                                    </div>

                                    <div>
                                        <h3>
                                            Direcciones de establecimientos
                                        </h3>

                                        <p>
                                            {direcciones.length} dirección
                                            {direcciones.length ===
                                            1
                                                ? ""
                                                : "es"}{" "}
                                            registrada
                                            {direcciones.length ===
                                            1
                                                ? ""
                                                : "s"}
                                        </p>
                                    </div>
                                </div>

                                <div className="cliente-contact-table-card">
                                    <MaterialReactTable
                                        table={
                                            tableDirecciones
                                        }
                                    />
                                </div>
                            </section>

                            {/* FOOTER */}

                            <div className="gp-action-footer cliente-contact-footer">
                                {typeof onClose ===
                                    "function" && (
                                    <button
                                        type="button"
                                        className="gp-action-button cliente-contact-cancel"
                                        onClick={
                                            onClose
                                        }
                                    >
                                        <X
                                            size={
                                                17
                                            }
                                        />

                                        Cerrar
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="gp-action-button gp-action-save"
                                    onClick={
                                        handleSubmit
                                    }
                                    disabled={
                                        saving
                                    }
                                >
                                    <Save
                                        size={
                                            17
                                        }
                                    />

                                    {saving
                                        ? "Guardando..."
                                        : "Guardar cambios"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}