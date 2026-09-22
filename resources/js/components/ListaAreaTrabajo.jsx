import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Box,
    IconButton,
    Tooltip,
} from "@mui/material";

import { MaterialReactTable } from "material-react-table";

import {
    Edit3,
    Plus,
    Search,
    Settings2,
    Trash2,
    X,
} from "lucide-react";

import axios from "axios";
import alertify from "alertifyjs";

import { useNavigate } from "react-router-dom";

import "../../css/lista-area-trabajo.css";


function ListaAreaTrabajo() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    const navigate = useNavigate();


    /* =========================================================
       CARGAR DATOS
       ========================================================= */

    useEffect(() => {
        fetchData();
    }, []);


    const fetchData = async () => {
        try {
            setLoading(true);

            const token =
                localStorage.getItem("token");

            const res = await axios.get(
                "/api/area_trabajo",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                },
            );

            setRows(
                res.data || [],
            );
        } catch (error) {
            console.error(
                "Error cargando áreas:",
                error,
            );

            alertify.error(
                "Error cargando áreas",
            );
        } finally {
            setLoading(false);
        }
    };


    /* =========================================================
       DESACTIVAR
       ========================================================= */

    const handleDesactivar = (
        id,
    ) => {
        alertify.confirm(
            "Confirmación",
            "¿Está seguro de desactivar esta área?",
            async () => {
                try {
                    const token =
                        localStorage.getItem(
                            "token",
                        );

                    await axios.put(
                        `/api/area_trabajo/desactivar/${id}`,
                        {},
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        },
                    );

                    setRows((prev) =>
                        prev.filter(
                            (item) =>
                                Number(
                                    item.id_areatrabajo,
                                ) !==
                                Number(id),
                        ),
                    );

                    alertify.success(
                        "Área desactivada correctamente",
                    );
                } catch (error) {
                    console.error(
                        "Error desactivando área:",
                        error,
                    );

                    alertify.error(
                        "Error desactivando el área",
                    );
                }
            },
            () => {},
        );
    };


    /* =========================================================
       COLUMNAS
       ========================================================= */

    const columns = useMemo(
        () => [
            {
                accessorKey:
                    "id_areatrabajo",
                header: "ID",
                size: 70,
            },

            {
                accessorKey:
                    "nombre",
                header: "Nombre",
                size: 220,
            },

            {
                accessorKey:
                    "descripcion",
                header: "Descripción",
                size: 320,

                Cell: ({ cell }) => {
                    const value =
                        cell.getValue();

                    return (
                        <span>
                            {value ||
                                "Sin descripción"}
                        </span>
                    );
                },
            },

            {
                accessorKey:
                    "usuario_registro",
                header: "Usuario",
                size: 150,
            },

            {
                accessorKey:
                    "fecha_registro",
                header: "Fecha",
                size: 160,
            },

            {
                id: "acciones",
                header: "Acciones",
                size: 105,

                enableSorting: false,
                enableColumnFilter: false,

                Cell: ({ row }) => (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems:
                                "center",
                            gap: "4px",
                        }}
                    >
                        <Tooltip title="Editar área">
                            <IconButton
                                size="small"
                                className="gp-area-table-edit"
                                onClick={() =>
                                    navigate(
                                        `/area_trabajo/editar/${row.original.id_areatrabajo}`,
                                    )
                                }
                            >
                                <Edit3
                                    size={
                                        16
                                    }
                                />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Desactivar área">
                            <IconButton
                                size="small"
                                className="gp-area-table-delete"
                                onClick={() =>
                                    handleDesactivar(
                                        row
                                            .original
                                            .id_areatrabajo,
                                    )
                                }
                            >
                                <Trash2
                                    size={
                                        16
                                    }
                                />
                            </IconButton>
                        </Tooltip>
                    </Box>
                ),
            },
        ],
        [navigate],
    );


    /* =========================================================
       FILTRO GENERAL
       ========================================================= */

    const dataFiltrada =
        useMemo(() => {
            const texto =
                busqueda
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(
                        /[\u0300-\u036f]/g,
                        "",
                    )
                    .trim();

            if (!texto) {
                return rows;
            }

            return rows.filter(
                (row) => {
                    const nombre =
                        (
                            row.nombre ??
                            ""
                        )
                            .toLowerCase()
                            .normalize(
                                "NFD",
                            )
                            .replace(
                                /[\u0300-\u036f]/g,
                                "",
                            );

                    const descripcion =
                        (
                            row.descripcion ??
                            ""
                        )
                            .toLowerCase()
                            .normalize(
                                "NFD",
                            )
                            .replace(
                                /[\u0300-\u036f]/g,
                                "",
                            );

                    return (
                        nombre.includes(
                            texto,
                        ) ||
                        descripcion.includes(
                            texto,
                        )
                    );
                },
            );
        }, [rows, busqueda]);


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-area-list-page">
            <div className="gp-module-card gp-area-list-card">

                {/* HEADER */}

                <div className="gp-area-list-header">

                    <div className="gp-area-list-heading">
                        <div className="gp-area-list-heading-icon">
                            <Settings2
                                size={21}
                            />
                        </div>

                        <div>
                            <div className="gp-module-meta">
                                CATÁLOGOS · PRODUCCIÓN
                            </div>

                            <h1>
                                Áreas de trabajo
                            </h1>

                            <p>
                                Administra las áreas
                                disponibles para asignar
                                trabajos dentro del
                                proceso de producción.
                            </p>
                        </div>
                    </div>


                    <button
                        type="button"
                        className="gp-area-list-new"
                        onClick={() =>
                            navigate(
                                "/area_trabajo/crear",
                            )
                        }
                    >
                        <Plus
                            size={16}
                        />

                        Nueva área
                    </button>
                </div>


                {/* BUSCADOR */}

                <div className="gp-area-list-search-section">

                    <div className="gp-area-list-search-heading">
                        <div>
                            <strong>
                                Buscar áreas
                            </strong>

                            <span>
                                Filtra por nombre o
                                descripción.
                            </span>
                        </div>

                        <div className="gp-area-list-count">
                            {
                                dataFiltrada.length
                            }{" "}
                            {dataFiltrada.length ===
                            1
                                ? "registro"
                                : "registros"}
                        </div>
                    </div>


                    <div className="gp-area-list-search">
                        <Search
                            size={16}
                        />

                        <input
                            type="text"
                            value={
                                busqueda
                            }
                            placeholder="Ej. CARPINTERÍA, IMPRESIÓN..."
                            onChange={(e) =>
                                setBusqueda(
                                    e.target
                                        .value,
                                )
                            }
                        />

                        {busqueda && (
                            <button
                                type="button"
                                onClick={() =>
                                    setBusqueda(
                                        "",
                                    )
                                }
                                title="Limpiar búsqueda"
                            >
                                <X
                                    size={
                                        15
                                    }
                                />
                            </button>
                        )}
                    </div>
                </div>


                {/* TABLA */}

                <div className="gp-area-list-body">

                    <div className="gp-area-list-table-header">
                        <div>
                            <h2>
                                Listado de áreas
                            </h2>

                            <p>
                                Puedes ordenar, filtrar,
                                editar o desactivar cada
                                registro.
                            </p>
                        </div>
                    </div>


                    {loading ? (
                        <div className="gp-area-list-loading">
                            Cargando áreas de trabajo...
                        </div>
                    ) : dataFiltrada.length ===
                      0 ? (
                        <div className="gp-area-list-empty">
                            <Settings2
                                size={28}
                            />

                            <strong>
                                No se encontraron áreas
                            </strong>

                            <span>
                                Intenta con otro término
                                de búsqueda.
                            </span>
                        </div>
                    ) : (
                        <div className="gp-area-list-table-wrapper">
                            <MaterialReactTable
                                columns={
                                    columns
                                }
                                data={
                                    dataFiltrada
                                }

                                enableColumnFilters={
                                    true
                                }

                                enablePagination={
                                    true
                                }

                                enableSorting={
                                    true
                                }

                                enableDensityToggle={
                                    false
                                }

                                enableFullScreenToggle={
                                    false
                                }

                                enableHiding={
                                    false
                                }

                                enableGlobalFilter={
                                    false
                                }

                                enableTopToolbar={
                                    false
                                }

                                enableBottomToolbar={
                                    true
                                }

                                muiTablePaperProps={{
                                    elevation: 0,

                                    sx: {
                                        border:
                                            "none",
                                        boxShadow:
                                            "none",
                                    },
                                }}

                                muiTableContainerProps={{
                                    sx: {
                                        maxHeight:
                                            "560px",
                                    },
                                }}

                                muiTableHeadCellProps={{
                                    sx: {
                                        fontSize:
                                            "10px",

                                        fontWeight:
                                            700,

                                        color:
                                            "#475569",

                                        backgroundColor:
                                            "#f3f6f9",

                                        borderBottom:
                                            "1px solid #dfe6ec",

                                        padding:
                                            "8px 10px",
                                    },
                                }}

                                muiTableBodyCellProps={{
                                    sx: {
                                        fontSize:
                                            "10px",

                                        color:
                                            "#334155",

                                        borderBottom:
                                            "1px solid #edf1f4",

                                        padding:
                                            "7px 10px",
                                    },
                                }}

                                muiTableBodyRowProps={{
                                    sx: {
                                        "&:hover td":
                                            {
                                                backgroundColor:
                                                    "#f5f9fb",
                                            },
                                    },
                                }}

                                muiBottomToolbarProps={{
                                    sx: {
                                        minHeight:
                                            "48px",

                                        backgroundColor:
                                            "#fafbfc",

                                        borderTop:
                                            "1px solid #e4e9ed",
                                    },
                                }}

                                muiPaginationProps={{
                                    rowsPerPageOptions:
                                        [
                                            10,
                                            20,
                                            50,
                                        ],

                                    shape: "rounded",

                                    size: "small",
                                }}

                                initialState={{
                                    density:
                                        "compact",

                                    pagination:
                                        {
                                            pageIndex:
                                                0,

                                            pageSize:
                                                10,
                                        },
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ListaAreaTrabajo;