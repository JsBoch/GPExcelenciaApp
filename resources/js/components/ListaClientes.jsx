import React, { useState, useEffect, useMemo } from "react";

import axios from "axios";

import { Box, IconButton, Tooltip } from "@mui/material";

import { MaterialReactTable } from "material-react-table";

import { Link, useNavigate } from "react-router-dom";

import {
    FiEdit2,
    FiTrash2,
    FiFileText,
    FiDownload,
    FiSearch,
    FiUsers,
    FiUserPlus,
    FiFile,
} from "react-icons/fi";

import alertify from "alertifyjs";

import * as XLSX from "xlsx";

import jsPDF from "jspdf";

import autoTable from "jspdf-autotable";

import "alertifyjs/build/css/alertify.min.css";

import "alertifyjs/build/css/themes/default.min.css";

import "../../css/ListaClientes.css";

function ListaClientes() {
    const navigate = useNavigate();

    const [clientes, setClientes] = useState([]);

    const [filteredClientes, setFilteredClientes] = useState([]);

    const [loading, setLoading] = useState(true);

    const [searchInput, setSearchInput] = useState("");

    const [selectedClienteId, setSelectedClienteId] = useState(null);

    /* =====================================================
       CARGAR CLIENTES
    ===================================================== */

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            console.error("Token de autenticación no encontrado");

            setLoading(false);

            return;
        }

        axios
            .get("/api/clientes", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((res) => {
                setClientes(res.data);

                setFilteredClientes(res.data);

                setLoading(false);
            })
            .catch((err) => {
                console.error("Error al obtener clientes:", err);

                setLoading(false);
            });
    }, []);

    /* =====================================================
       FILTRO
    ===================================================== */

    useEffect(() => {
        if (!searchInput) {
            setFilteredClientes(clientes);
        } else {
            const term = searchInput.toLowerCase();

            setFilteredClientes(
                clientes.filter(
                    (c) =>
                        c.nombre?.toLowerCase().includes(term) ||
                        c.nit?.toLowerCase().includes(term) ||
                        c.razonsocial?.toLowerCase().includes(term) ||
                        c.telefono_uno?.toLowerCase().includes(term) ||
                        c.telefono_dos?.toLowerCase().includes(term) ||
                        c.telefono_tres?.toLowerCase().includes(term) ||
                        c.email?.toLowerCase().includes(term),
                ),
            );
        }
    }, [searchInput, clientes]);

    /* =====================================================
       DESACTIVAR
    ===================================================== */

    const handleDesactivar = (id) => {
        const token = localStorage.getItem("token");

        if (!token) {
            return;
        }

        alertify
            .confirm(
                "Confirmación",

                "¿Está seguro de que desea eliminar el registro seleccionado?",

                function () {
                    axios
                        .put(
                            `/api/clientes/desactivar/${id}`,
                            {},
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            },
                        )
                        .then(() => {
                            setClientes((prev) =>
                                prev.filter(
                                    (c) => Number(c.idcliente) !== Number(id),
                                ),
                            );

                            alertify.success("Cliente eliminado correctamente");
                        })
                        .catch((err) =>
                            console.error("Error al eliminar cliente:", err),
                        );
                },

                function () {
                    alertify.error("Acción cancelada");
                },
            )
            .set("labels", {
                ok: "Sí",
                cancel: "No",
            });
    };

    /* =====================================================
       COLUMNAS
    ===================================================== */

    const columnas = useMemo(
        () => [
            {
                accessorKey: "codigo",

                header: "Código",

                size: 80,

                Cell: ({ cell }) => (
                    <span className="cliente-code">
                        {cell.getValue() || "—"}
                    </span>
                ),
            },

            {
                accessorKey: "nit",

                header: "NIT",

                size: 105,
            },

            {
                accessorKey: "nombre",

                header: "Cliente",

                size: 230,

                Cell: ({ row }) => (
                    <div className="cliente-name-cell">
                        <div className="cliente-table-avatar">
                            {row.original.nombre?.charAt(0)?.toUpperCase() ||
                                "C"}
                        </div>

                        <div>
                            <strong>{row.original.nombre}</strong>

                            <span>
                                {row.original.email || "Sin correo registrado"}
                            </span>
                        </div>
                    </div>
                ),
            },

            {
                accessorKey: "razonsocial",

                header: "Razón Social",

                size: 220,
            },

            {
                accessorKey: "direccion",

                header: "Dirección",

                size: 260,
            },

            {
                accessorKey: "telefono_uno",

                header: "Teléfono",

                size: 105,

                Cell: ({ row }) => (
                    <div className="cliente-phone-cell">
                        <strong>{row.original.telefono_uno || "—"}</strong>

                        {row.original.telefono_dos && (
                            <span>{row.original.telefono_dos}</span>
                        )}
                    </div>
                ),
            },

            {
                accessorKey: "fecha_ultima_compra",

                header: "Última compra",

                size: 115,

                Cell: ({ cell }) => {
                    const value = cell.getValue();

                    if (!value) {
                        return (
                            <span className="cliente-no-date">Sin compra</span>
                        );
                    }

                    return (
                        <span className="cliente-date">
                            {new Date(value).toLocaleDateString("es-GT", {
                                year: "numeric",

                                month: "2-digit",

                                day: "2-digit",
                            })}
                        </span>
                    );
                },
            },

            {
                header: "Acciones",

                accessorKey: "acciones",

                size: 95,

                enableSorting: false,

                enableColumnActions: false,

                Cell: ({ row }) => (
                    <div className="cliente-table-actions">
                        <Tooltip title="Editar cliente">
                            <IconButton
                                size="small"
                                className="cliente-action-edit"
                                onClick={(e) => {
                                    e.stopPropagation();

                                    navigate(
                                        `/clientes/editar/${row.original.idcliente}`,
                                    );
                                }}
                            >
                                <FiEdit2 />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Eliminar cliente">
                            <IconButton
                                size="small"
                                className="cliente-action-delete"
                                onClick={(e) => {
                                    e.stopPropagation();

                                    handleDesactivar(row.original.idcliente);
                                }}
                            >
                                <FiTrash2 />
                            </IconButton>
                        </Tooltip>
                    </div>
                ),
            },
        ],
        [navigate],
    );

    /* =====================================================
       EXCEL
    ===================================================== */

    const exportToExcel = () => {
        const data = filteredClientes.map((c) => ({
            Código: c.codigo,

            NIT: c.nit,

            Nombre: c.nombre,

            "Razón Social": c.razonsocial,

            Dirección: c.direccion,

            "Teléfono 1": c.telefono_uno,

            "Teléfono 2": c.telefono_dos,

            "Teléfono 3": c.telefono_tres,

            Correo: c.email,

            "Última Compra": c.fecha_ultima_compra
                ? new Date(c.fecha_ultima_compra).toLocaleDateString("es-GT")
                : "",
        }));

        const wb = XLSX.utils.book_new();

        const ws = XLSX.utils.json_to_sheet(data);

        XLSX.utils.book_append_sheet(wb, ws, "Clientes");

        XLSX.writeFile(
            wb,
            `Clientes_${new Date().toISOString().slice(0, 10)}.xlsx`,
        );
    };

    /* =====================================================
       PDF
    ===================================================== */

    const exportToPDF = () => {
        const doc = new jsPDF();

        const fecha = new Date().toLocaleString();

        doc.setFontSize(14);

        doc.text("Listado de Clientes", 14, 15);

        doc.setFontSize(10);

        doc.text(`Generado: ${fecha}`, 14, 22);

        const tableData = filteredClientes.map((c) => [
            c.codigo,

            c.nit,

            c.nombre,

            c.razonsocial,

            c.telefono_uno,

            c.email,

            c.fecha_ultima_compra
                ? new Date(c.fecha_ultima_compra).toLocaleDateString("es-GT", {
                      day: "2-digit",

                      month: "2-digit",

                      year: "2-digit",
                  })
                : "",
        ]);

        autoTable(doc, {
            head: [
                [
                    "Código",
                    "NIT",
                    "Nombre",
                    "Razón Social",
                    "Teléfono",
                    "Correo",
                    "Última Compra",
                ],
            ],

            body: tableData,

            startY: 28,

            styles: {
                fontSize: 8,
            },

            columnStyles: {
                6: {
                    cellWidth: 25,
                },
            },
        });

        doc.save(`Clientes_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    /* =====================================================
       LOADING
    ===================================================== */

    if (loading) {
        return (
            <div className="gp-module-page">
                <div className="clientes-loading-card">
                    <div className="clientes-loading-spinner"></div>

                    <span>Cargando clientes...</span>
                </div>
            </div>
        );
    }

    /* =====================================================
       UI
    ===================================================== */

    return (
        <div className="gp-module-page clientes-list-page">
            <div className="gp-module-card">
                <div className="card-body">
                    {/* =====================================
                        META HEADER
                    ====================================== */}

                    <div className="erp-meta-header d-flex justify-content-between align-items-center">
                        <div>
                            <span className="erp-badge">Módulo · Clientes</span>

                            <span className="text-muted small d-block">
                                Consulta y administración de clientes
                                registrados
                            </span>
                        </div>

                        <div className="clientes-header-count">
                            <FiUsers />

                            <div>
                                <span>CLIENTES</span>

                                <strong>{filteredClientes.length}</strong>
                            </div>
                        </div>
                    </div>

                    {/* =====================================
                        BUSCADOR / ACCIONES
                    ====================================== */}

                    <div className="clientes-toolbar">
                        <div className="clientes-search-area">
                            <div className="clientes-search-box">
                                <FiSearch className="clientes-search-input-icon" />

                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) =>
                                        setSearchInput(e.target.value)
                                    }
                                    placeholder="Buscar por nombre, NIT, teléfono, razón social o correo..."
                                    className="clientes-search-input"
                                />

                                {searchInput && (
                                    <button
                                        type="button"
                                        className="clientes-search-clear"
                                        onClick={() => setSearchInput("")}
                                        title="Limpiar búsqueda"
                                        aria-label="Limpiar búsqueda"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="clientes-export-actions">
                            <button
                                type="button"
                                className="clientes-export-button excel"
                                onClick={exportToExcel}
                            >
                                <FiDownload />
                                Excel
                            </button>

                            <button
                                type="button"
                                className="clientes-export-button pdf"
                                onClick={exportToPDF}
                            >
                                <FiFileText />
                                PDF
                            </button>

                            <Link
                                to="/clientes/crear"
                                className="clientes-new-button"
                            >
                                <FiUserPlus />
                                Nuevo cliente
                            </Link>
                        </div>
                    </div>

                    {/* =====================================
                        INFO RESULTADOS
                    ====================================== */}

                    <div className="clientes-table-heading">
                        <div>
                            <h3>Clientes registrados</h3>

                            <span>
                                {searchInput
                                    ? `${filteredClientes.length} resultado(s) encontrados`
                                    : `${clientes.length} registros disponibles`}
                            </span>
                        </div>
                    </div>

                    {/* =====================================
                        TABLA
                    ====================================== */}

                    <div className="clientes-table-wrapper">
                        <MaterialReactTable
                            columns={columnas}
                            data={filteredClientes}
                            enablePagination
                            enableSorting
                            enableColumnResizing
                            enableStickyHeader
                            enableColumnFilters={false}
                            enableGlobalFilter={false}
                            enableDensityToggle={false}
                            enableFullScreenToggle={true}
                            enableColumnActions={false}
                            enableHiding={true}
                            initialState={{
                                pagination: {
                                    pageSize: 15,
                                },
                                density: "compact",
                                columnPinning: {
                                    right: ["acciones"],
                                },
                            }}
                            muiTableContainerProps={{
                                sx: {
                                    maxHeight: "620px",
                                },
                            }}
                            muiTablePaperProps={{
                                elevation: 0,
                                sx: {
                                    borderRadius: "12px",
                                    overflow: "hidden",
                                },
                            }}
                            muiTableHeadCellProps={{
                                sx: {
                                    backgroundColor: "#eef3f7",
                                    color: "#334155",
                                    fontWeight: 700,
                                    fontSize: "0.68rem",
                                    textTransform: "uppercase",
                                    letterSpacing: ".03em",
                                    borderBottom: "1px solid #dce4eb",
                                },
                            }}
                            muiTableBodyCellProps={{
                                sx: {
                                    fontSize: "0.72rem",
                                    color: "#475569",
                                    borderBottom: "1px solid #eef2f5",
                                    paddingTop: "7px",
                                    paddingBottom: "7px",
                                },
                            }}
                            muiTableBodyRowProps={({ row }) => {
                                const isSelected =
                                    Number(selectedClienteId) ===
                                    Number(row.original.idcliente);

                                return {
                                    onClick: () => {
                                        setSelectedClienteId(
                                            row.original.idcliente,
                                        );
                                    },

                                    sx: {
                                        cursor: "pointer",

                                        "& td": {
                                            backgroundColor: isSelected
                                                ? "#c9e2f3 !important"
                                                : "#ffffff",

                                            borderBottom: "1px solid #e8edf2",

                                            transition:
                                                "background-color .15s ease",
                                        },

                                        "& td:first-of-type": {
                                            borderLeft: isSelected
                                                ? "5px solid #0e4f84"
                                                : "5px solid transparent",
                                        },

                                        "&:hover td": {
                                            backgroundColor: isSelected
                                                ? "#bddbef !important"
                                                : "#f4f8fb !important",
                                        },
                                    },
                                };
                            }}
                            renderTopToolbarCustomActions={() => (
                                <div className="clientes-table-toolbar">
                                    <FiFile />

                                    <span>Consulta general de clientes</span>
                                </div>
                            )}
                        />
                    </div>

                    {/* =====================================
                        PIE
                    ====================================== */}

                    <div className="clientes-list-footer">
                        <span>GP Excelencia</span>

                        <span></span>

                        <span>Gestión de Clientes</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ListaClientes;
