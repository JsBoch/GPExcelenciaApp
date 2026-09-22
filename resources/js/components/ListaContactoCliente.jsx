import React, { useEffect, useMemo, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { MaterialReactTable } from "material-react-table";
import {
    Edit,
    Trash2,
    Search,
    X,
    Users,
    UserRound,
} from "lucide-react";
import axios from "axios";
import alertify from "alertifyjs";
import { useNavigate } from "react-router-dom";

import "../../css/ListaContactoCliente.css";

function ListaContactoCliente() {
    const [clientes, setClientes] = useState([]);
    const [contactos, setContactos] = useState([]);

    const [loadingClientes, setLoadingClientes] = useState(true);
    const [loadingContactos, setLoadingContactos] = useState(false);

    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

    const [busquedaCliente, setBusquedaCliente] = useState("");
    const [mostrarResultadosCliente, setMostrarResultadosCliente] =
        useState(false);

    const [busquedaContacto, setBusquedaContacto] = useState("");

    const [selectedContactoId, setSelectedContactoId] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchClientes();
    }, []);

    const normalizarTexto = (texto = "") =>
        String(texto)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

    const fetchClientes = async () => {
        try {
            setLoadingClientes(true);

            const token = localStorage.getItem("token");

            const res = await axios.get("/api/lista_clientes", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setClientes(res.data);
        } catch (error) {
            console.error("Error cargando clientes", error);
            alertify.error("No fue posible cargar los clientes");
        } finally {
            setLoadingClientes(false);
        }
    };

    const fetchContactos = async (idcliente) => {
        try {
            setLoadingContactos(true);
            setSelectedContactoId(null);
            setBusquedaContacto("");

            const token = localStorage.getItem("token");

            const res = await axios.get(
                `/api/contacto_cliente/cliente/${idcliente}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setContactos(res.data);
        } catch (error) {
            console.error("Error cargando contactos", error);

            setContactos([]);

            alertify.error(
                "No fue posible cargar los contactos del cliente"
            );
        } finally {
            setLoadingContactos(false);
        }
    };

    const seleccionarCliente = (cliente) => {
        setClienteSeleccionado(cliente);

        setBusquedaCliente(
            `${cliente.nombre}${
                cliente.nit ? ` — NIT: ${cliente.nit}` : ""
            }`
        );

        setMostrarResultadosCliente(false);

        fetchContactos(cliente.idcliente);
    };

    const limpiarCliente = () => {
        setClienteSeleccionado(null);
        setBusquedaCliente("");
        setBusquedaContacto("");
        setContactos([]);
        setSelectedContactoId(null);
        setMostrarResultadosCliente(false);
    };

    const clientesFiltrados = useMemo(() => {
        if (!busquedaCliente.trim()) {
            return [];
        }

        const texto = normalizarTexto(busquedaCliente);

        return clientes
            .filter((cliente) => {
                const nombre = normalizarTexto(cliente.nombre);
                const nit = normalizarTexto(cliente.nit);

                return (
                    nombre.includes(texto) ||
                    nit.includes(texto)
                );
            })
            .slice(0, 12);
    }, [clientes, busquedaCliente]);

    const contactosFiltrados = useMemo(() => {
        if (!busquedaContacto.trim()) {
            return contactos;
        }

        const texto = normalizarTexto(busquedaContacto);

        return contactos.filter((contacto) => {
            const contenido = [
                contacto.id_contactocliente,
                contacto.nombre,
                contacto.telefono,
                contacto.correo,
                contacto.puesto,
                contacto.observaciones,
            ]
                .map((valor) => normalizarTexto(valor))
                .join(" ");

            return contenido.includes(texto);
        });
    }, [contactos, busquedaContacto]);

    const handleDesactivar = async (id) => {
        alertify.confirm(
            "Confirmación",
            "¿Está seguro de eliminar este contacto?",
            async () => {
                try {
                    const token = localStorage.getItem("token");

                    await axios.put(
                        `/api/contacto_cliente/desactivar/${id}`,
                        {},
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );

                    setContactos((prev) =>
                        prev.filter(
                            (contacto) =>
                                Number(contacto.id_contactocliente) !==
                                Number(id)
                        )
                    );

                    if (
                        Number(selectedContactoId) === Number(id)
                    ) {
                        setSelectedContactoId(null);
                    }

                    alertify.success("Contacto eliminado");
                } catch (error) {
                    console.error(
                        "Error eliminando contacto",
                        error
                    );

                    alertify.error("Error eliminando contacto");
                }
            },
            () => {}
        );
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: "id_contactocliente",
                header: "ID",
                size: 75,
            },
            {
                accessorKey: "nombre",
                header: "Nombre",
                size: 210,
            },
            {
                accessorKey: "telefono",
                header: "Teléfono",
                size: 125,
            },
            {
                accessorKey: "correo",
                header: "Correo",
                size: 220,
            },
            {
                accessorKey: "puesto",
                header: "Puesto",
                size: 160,
            },
            {
                accessorKey: "observaciones",
                header: "Observaciones",
                size: 260,
            },
            {
                id: "acciones",
                header: "Acciones",
                size: 105,
                enableSorting: false,
                enableColumnActions: false,

                Cell: ({ row }) => (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                        }}
                    >
                        <Tooltip title="Editar contacto" arrow>
                            <IconButton
                                size="small"
                                className="gp-table-action gp-table-action-edit"
                                onClick={(e) => {
                                    e.stopPropagation();

                                    navigate(
                                        `/contacto_cliente/editar/${row.original.id_contactocliente}`
                                    );
                                }}
                            >
                                <Edit size={17} />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Eliminar contacto" arrow>
                            <IconButton
                                size="small"
                                className="gp-table-action gp-table-action-delete"
                                onClick={(e) => {
                                    e.stopPropagation();

                                    handleDesactivar(
                                        row.original.id_contactocliente
                                    );
                                }}
                            >
                                <Trash2 size={17} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                ),
            },
        ],
        [navigate, selectedContactoId]
    );

    return (
        <div className="gp-module-page contactos-lista-page">
            <div className="gp-module-card">
                <div className="contactos-lista-body">

                    {/* ENCABEZADO INTERNO */}
                    <div className="erp-meta-header contactos-meta-header">
                        <div>
                            <span className="erp-badge">
                                Módulo · Clientes
                            </span>

                            <span className="text-muted small d-block mt-1">
                                Consulta y administración de contactos
                                registrados por cliente
                            </span>
                        </div>

                        <div className="contactos-total-badge">
                            <Users size={16} />

                            <span>
                                {clienteSeleccionado
                                    ? `${contactos.length} contacto${
                                          contactos.length === 1
                                              ? ""
                                              : "s"
                                      }`
                                    : "Contactos"}
                            </span>
                        </div>
                    </div>

                    {/* SELECCIÓN DE CLIENTE */}
                    <div className="contactos-cliente-panel">
                        <div className="contactos-panel-title">
                            <UserRound size={18} />

                            <div>
                                <strong>Cliente</strong>

                                <span>
                                    Seleccione el cliente cuyos contactos
                                    desea consultar
                                </span>
                            </div>
                        </div>

                        <div className="contactos-client-search-wrapper">
                            <div
                                className={`contactos-search-box ${
                                    clienteSeleccionado
                                        ? "cliente-seleccionado"
                                        : ""
                                }`}
                            >
                                <Search
                                    className="contactos-search-icon"
                                    size={19}
                                />

                                <input
                                    type="text"
                                    value={busquedaCliente}
                                    placeholder="Buscar cliente por nombre o NIT..."
                                    className="contactos-search-input"
                                    autoComplete="off"
                                    disabled={loadingClientes}
                                    onFocus={() => {
                                        if (!clienteSeleccionado) {
                                            setMostrarResultadosCliente(
                                                true
                                            );
                                        }
                                    }}
                                    onChange={(e) => {
                                        setBusquedaCliente(
                                            e.target.value
                                        );

                                        if (clienteSeleccionado) {
                                            setClienteSeleccionado(null);
                                            setContactos([]);
                                            setBusquedaContacto("");
                                            setSelectedContactoId(null);
                                        }

                                        setMostrarResultadosCliente(true);
                                    }}
                                />

                                {busquedaCliente && (
                                    <button
                                        type="button"
                                        className="contactos-search-clear"
                                        onClick={limpiarCliente}
                                        title="Limpiar"
                                    >
                                        <X size={17} />
                                    </button>
                                )}
                            </div>

                            {mostrarResultadosCliente &&
                                busquedaCliente.trim() &&
                                !clienteSeleccionado && (
                                    <div className="contactos-client-results">
                                        {clientesFiltrados.length > 0 ? (
                                            clientesFiltrados.map(
                                                (cliente) => (
                                                    <button
                                                        type="button"
                                                        key={
                                                            cliente.idcliente
                                                        }
                                                        className="contactos-client-result"
                                                        onClick={() =>
                                                            seleccionarCliente(
                                                                cliente
                                                            )
                                                        }
                                                    >
                                                        <div className="contactos-client-result-icon">
                                                            <UserRound
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </div>

                                                        <div>
                                                            <strong>
                                                                {
                                                                    cliente.nombre
                                                                }
                                                            </strong>

                                                            <span>
                                                                NIT:{" "}
                                                                {cliente.nit ||
                                                                    "Sin NIT"}
                                                            </span>
                                                        </div>
                                                    </button>
                                                )
                                            )
                                        ) : (
                                            <div className="contactos-no-results">
                                                No se encontraron clientes
                                            </div>
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* INFORMACIÓN DEL CLIENTE SELECCIONADO */}
                    {clienteSeleccionado && (
                        <div className="contactos-selected-client">
                            <div>
                                <span className="contactos-selected-label">
                                    Cliente seleccionado
                                </span>

                                <strong>
                                    {clienteSeleccionado.nombre}
                                </strong>
                            </div>

                            <div>
                                <span className="contactos-selected-label">
                                    NIT
                                </span>

                                <strong>
                                    {clienteSeleccionado.nit ||
                                        "No registrado"}
                                </strong>
                            </div>

                            <div>
                                <span className="contactos-selected-label">
                                    Contactos registrados
                                </span>

                                <strong>{contactos.length}</strong>
                            </div>
                        </div>
                    )}

                    {/* TABLA */}
                    {clienteSeleccionado ? (
                        <div className="contactos-table-section">
                            <div className="contactos-table-heading">
                                <div>
                                    <h3>Contactos registrados</h3>

                                    <p>
                                        {contactos.length} registro
                                        {contactos.length === 1
                                            ? ""
                                            : "s"}{" "}
                                        disponible
                                        {contactos.length === 1
                                            ? ""
                                            : "s"}
                                    </p>
                                </div>
                            </div>

                            {/* BUSCADOR PROPIO DE CONTACTOS */}
                            <div className="contactos-table-search-area">
                                <div className="contactos-search-box">
                                    <Search
                                        className="contactos-search-icon"
                                        size={18}
                                    />

                                    <input
                                        type="text"
                                        value={busquedaContacto}
                                        onChange={(e) =>
                                            setBusquedaContacto(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Buscar por nombre, teléfono, correo, puesto u observaciones..."
                                        className="contactos-search-input"
                                    />

                                    {busquedaContacto && (
                                        <button
                                            type="button"
                                            className="contactos-search-clear"
                                            onClick={() =>
                                                setBusquedaContacto("")
                                            }
                                        >
                                            <X size={17} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="contactos-table-container">
                                <MaterialReactTable
                                    columns={columns}
                                    data={contactosFiltrados}

                                    enableGlobalFilter={false}
                                    enableColumnFilters={false}

                                    enablePagination={true}
                                    enableSorting={true}
                                    enableColumnResizing={true}
                                    enableStickyHeader={true}

                                    enableDensityToggle={false}
                                    enableFullScreenToggle={true}
                                    enableHiding={true}

                                    state={{
                                        isLoading: loadingContactos,
                                    }}

                                    initialState={{
                                        density: "compact",
                                        pagination: {
                                            pageIndex: 0,
                                            pageSize: 10,
                                        },
                                    }}

                                    muiTablePaperProps={{
                                        elevation: 0,
                                        sx: {
                                            borderRadius: "12px",
                                            overflow: "hidden",
                                        },
                                    }}

                                    muiTableContainerProps={{
                                        sx: {
                                            maxHeight: "560px",
                                        },
                                    }}

                                    muiTableHeadCellProps={{
                                        sx: {
                                            fontWeight: 700,
                                            fontSize: "0.78rem",
                                            color: "#334155",
                                            backgroundColor: "#f8fafc",
                                            borderBottom:
                                                "1px solid #e2e8f0",
                                        },
                                    }}

                                    muiTableBodyCellProps={{
                                        sx: {
                                            fontSize: "0.82rem",
                                            color: "#334155",
                                            borderBottom:
                                                "1px solid #edf2f7",
                                        },
                                    }}

                                    muiTableBodyRowProps={({ row }) => {
                                        const id =
                                            row.original
                                                .id_contactocliente;

                                        const selected =
                                            Number(
                                                selectedContactoId
                                            ) === Number(id);

                                        return {
                                            onClick: () =>
                                                setSelectedContactoId(
                                                    id
                                                ),

                                            sx: {
                                                cursor: "pointer",

                                                backgroundColor:
                                                    selected
                                                        ? "#c9e2f3"
                                                        : "#ffffff",

                                                borderLeft: selected
                                                    ? "5px solid #0e4f84"
                                                    : "5px solid transparent",

                                                transition:
                                                    "background-color .15s ease",

                                                "&:hover": {
                                                    backgroundColor:
                                                        selected
                                                            ? "#bddbef"
                                                            : "#f6f9fc",
                                                },

                                                "& td:first-of-type": {
                                                    paddingLeft:
                                                        selected
                                                            ? "11px"
                                                            : "16px",
                                                },
                                            },
                                        };
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="contactos-empty-state">
                            <div className="contactos-empty-icon">
                                <Users size={30} />
                            </div>

                            <h3>Seleccione un cliente</h3>

                            <p>
                                Busque un cliente por nombre o NIT para
                                consultar los contactos que tiene
                                registrados.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ListaContactoCliente;