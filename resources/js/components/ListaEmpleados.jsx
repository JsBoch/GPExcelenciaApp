import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import axios from "axios";

import DataTable from "datatables.net-react";
import DT from "datatables.net-bs5";

import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import {
    Link,
    useNavigate,
} from "react-router-dom";

import alertify from "alertifyjs";

import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

import {
    Plus,
    Search,
    UserRound,
    UsersRound,
    X,
} from "lucide-react";

import "../../css/tableFormat.css";
import "../../css/lista-empleados.css";

DataTable.use(DT);


function ListaEmpleados() {
    const [
        empleados,
        setEmpleados,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        spanishTranslation,
        setSpanishTranslation,
    ] = useState(null);

    const [
        busqueda,
        setBusqueda,
    ] = useState("");

    const navigate =
        useNavigate();


    /* =========================================================
       TRADUCCIÓN
       ========================================================= */

    useEffect(() => {
        fetch(
            "/i18n/Spanish.json",
        )
            .then((response) =>
                response.json(),
            )
            .then((data) =>
                setSpanishTranslation(
                    data,
                ),
            )
            .catch((error) =>
                console.error(
                    "Error al cargar la traducción:",
                    error,
                ),
            );
    }, []);


    /* =========================================================
       CARGAR EMPLEADOS
       ========================================================= */

    useEffect(() => {
        const token =
            localStorage.getItem(
                "token",
            );

        if (!token) {
            console.error(
                "Token de autenticación no encontrado",
            );

            setLoading(false);

            return;
        }

        axios
            .get(
                "/api/empleados",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                },
            )
            .then((response) => {
                setEmpleados(
                    response.data || [],
                );
            })
            .catch((error) => {
                console.error(
                    "Error al obtener empleados:",
                    error,
                );

                alertify.error(
                    "Error al cargar empleados",
                );
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);


    /* =========================================================
       DESACTIVAR
       ========================================================= */

    const handleDesactivar = (
        id,
    ) => {
        const token =
            localStorage.getItem(
                "token",
            );

        if (!token) {
            alertify.error(
                "Token de autenticación no encontrado",
            );

            return;
        }

        axios
            .put(
                `/api/empleados/desactivar/${id}`,
                {},
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                },
            )
            .then(() => {
                setEmpleados(
                    (
                        prevEmpleados,
                    ) =>
                        prevEmpleados.filter(
                            (
                                empleado,
                            ) =>
                                Number(
                                    empleado.id_empleado,
                                ) !==
                                Number(
                                    id,
                                ),
                        ),
                );

                alertify.success(
                    "Empleado desactivado correctamente",
                );
            })
            .catch((error) => {
                console.error(
                    "Error al desactivar empleado:",
                    error,
                );

                alertify.error(
                    "Error al desactivar empleado",
                );
            });
    };


    /* =========================================================
       CLICS BOTONES DATATABLE
       ========================================================= */

    useEffect(() => {
        const handleButtonClick =
            (event) => {
                const button =
                    event.target.closest(
                        "button",
                    );

                if (!button) {
                    return;
                }

                const id =
                    button.getAttribute(
                        "data-id",
                    );

                if (
                    button.classList.contains(
                        "editar-btn",
                    )
                ) {
                    navigate(
                        `/empleados/editar/${id}`,
                    );

                    return;
                }

                if (
                    button.classList.contains(
                        "desactivar-btn",
                    )
                ) {
                    alertify
                        .confirm(
                            "Confirmación",
                            "¿Está seguro de que desea eliminar el registro seleccionado?",
                            () => {
                                handleDesactivar(
                                    id,
                                );
                            },
                            () => {
                                alertify.message(
                                    "Acción cancelada",
                                );
                            },
                        )
                        .set(
                            "labels",
                            {
                                ok: "Sí",
                                cancel:
                                    "No",
                            },
                        );
                }
            };

        document.addEventListener(
            "click",
            handleButtonClick,
        );

        return () => {
            document.removeEventListener(
                "click",
                handleButtonClick,
            );
        };
    }, [navigate]);


    /* =========================================================
       COLUMNAS
       ========================================================= */

    const columns =
        useMemo(
            () => [
                {
                    data: "id_empleado",
                    title: "ID",
                    visible: false,
                },

                {
                    data: "codigo",
                    title: "Código",
                },

                {
                    data: "nombre",
                    title: "Nombre",
                },

                {
                    data: "nit",
                    title: "NIT",
                },

                {
                    data: "identificacion_nombre",
                    title:
                        "Tipo Identificación",
                    visible: false,
                },

                {
                    data: "numero_identificacion",
                    title:
                        "No. Identificación",
                },

                {
                    data: "telefono_casa",
                    title:
                        "Tel. Casa",
                    visible: false,
                },

                {
                    data: "movil",
                    title: "Celular",
                },

                {
                    data: "otro_telefono",
                    title:
                        "Tel. Adicional",
                    visible: false,
                },

                {
                    data: "correo_personal",
                    title:
                        "Correo Personal",
                },

                {
                    data: "correo_empresa",
                    title:
                        "Correo Empresa",
                    visible: false,
                },

                {
                    data: "salud",
                    title:
                        "Problemas de salud",
                    visible: false,
                },

                {
                    data: "contacto_emergencia",
                    title:
                        "Contacto emergencia",
                    visible: false,
                },

                {
                    data: "telefono_emergencia",
                    title:
                        "Tel. emergencia",
                    visible: false,
                },

                {
                    data: "departamento_nombre",
                    title: "Área",
                    visible: false,
                },

                {
                    data: "puesto_nombre",
                    title: "Puesto",
                },

                {
                    data: "fecha_nacimiento",
                    title:
                        "Fecha nacimiento",
                    visible: false,
                },

                {
                    data: "fecha_ingreso",
                    title:
                        "Fecha ingreso",
                    visible: false,
                },

                {
                    data: "genero",
                    title: "Género",
                    visible: false,
                },

                {
                    data: "direccion",
                    title: "Dirección",
                    visible: false,
                },

                {
                    data: "departamentopais_nombre",
                    title:
                        "Departamento",
                    visible: false,
                },

                {
                    data: "Observaciones",
                    title:
                        "Observaciones",
                },

                {
                    data: "id_empleado",
                    title: "Acciones",

                    width: "90px",

                    orderable:
                        false,

                    render: (
                        data,
                    ) => `
                        <div class="gp-employee-table-actions">

                            <button
                                type="button"
                                class="gp-employee-row-action gp-employee-row-edit editar-btn"
                                data-id="${data}"
                                title="Editar empleado"
                            >
                                <i class="fas fa-edit"></i>
                            </button>

                            <button
                                type="button"
                                class="gp-employee-row-action gp-employee-row-delete desactivar-btn"
                                data-id="${data}"
                                title="Desactivar empleado"
                            >
                                <i class="fas fa-trash"></i>
                            </button>

                        </div>
                    `,
                },
            ],
            [],
        );


    /* =========================================================
       FILTRO
       ========================================================= */

    const empleadosFiltrados =
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
                return empleados;
            }

            return empleados.filter(
                (empleado) => {
                    const valores = [
                        empleado.codigo,
                        empleado.nombre,
                        empleado.nit,
                        empleado.numero_identificacion,
                        empleado.movil,
                        empleado.correo_personal,
                        empleado.puesto_nombre,
                        empleado.Observaciones,
                    ];

                    return valores.some(
                        (valor) =>
                            String(
                                valor ?? "",
                            )
                                .toLowerCase()
                                .normalize(
                                    "NFD",
                                )
                                .replace(
                                    /[\u0300-\u036f]/g,
                                    "",
                                )
                                .includes(
                                    texto,
                                ),
                    );
                },
            );
        }, [
            empleados,
            busqueda,
        ]);


    /* =========================================================
       OPCIONES DATATABLE
       ========================================================= */

    const options = {
        language:
            spanishTranslation,

        searching: false,

        autoWidth: false,

        order: [
            [2, "asc"],
        ],

        pageLength: 10,
    };


    /* =========================================================
       RENDER
       ========================================================= */

    return (
        <div className="gp-module-page gp-employees-list-page">
            <div className="gp-module-card gp-employees-list-card">

                {/* HEADER */}

                <div className="gp-employees-list-header">

                    <div className="gp-employees-list-heading">
                        <div className="gp-employees-list-heading-icon">
                            <UsersRound
                                size={22}
                            />
                        </div>

                        <div>
                            <div className="gp-module-meta">
                                ADMINISTRACIÓN · PERSONAL
                            </div>

                            <h1>
                                Empleados
                            </h1>

                            <p>
                                Consulta y administra los
                                colaboradores registrados
                                en el sistema.
                            </p>
                        </div>
                    </div>


                    <Link
                        to="/empleados/crear"
                        className="gp-employees-new"
                    >
                        <Plus
                            size={16}
                        />

                        Nuevo empleado
                    </Link>
                </div>


                {/* BUSCADOR */}

                <div className="gp-employees-search-section">

                    <div className="gp-employees-search-heading">
                        <div>
                            <strong>
                                Buscar empleado
                            </strong>

                            <span>
                                Puedes buscar por nombre,
                                código, NIT, teléfono,
                                correo o puesto.
                            </span>
                        </div>

                        <div className="gp-employees-count">
                            {
                                empleadosFiltrados.length
                            }{" "}
                            {empleadosFiltrados.length ===
                            1
                                ? "registro"
                                : "registros"}
                        </div>
                    </div>


                    <div className="gp-employees-search">
                        <Search
                            size={16}
                        />

                        <input
                            type="text"
                            value={
                                busqueda
                            }
                            placeholder="Buscar empleado..."
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
                                title="Limpiar búsqueda"
                                onClick={() =>
                                    setBusqueda(
                                        "",
                                    )
                                }
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

                <div className="gp-employees-list-body">

                    <div className="gp-employees-table-heading">
                        <div>
                            <h2>
                                Listado de empleados
                            </h2>

                            <p>
                                Usa las acciones de cada
                                registro para editar o
                                desactivar.
                            </p>
                        </div>
                    </div>


                    {loading ||
                    !spanishTranslation ? (
                        <div className="gp-employees-loading">
                            Cargando empleados...
                        </div>
                    ) : empleadosFiltrados.length ===
                      0 ? (
                        <div className="gp-employees-empty">
                            <UserRound
                                size={28}
                            />

                            <strong>
                                No se encontraron empleados
                            </strong>

                            <span>
                                No hay registros que
                                coincidan con la búsqueda.
                            </span>
                        </div>
                    ) : (
                        <div className="gp-employees-table-wrapper">

                            <DataTable
                                data={
                                    empleadosFiltrados
                                }
                                columns={
                                    columns
                                }
                                options={{
                                    ...options,

                                    language:
                                        spanishTranslation,
                                }}
                                className="table table-hover table-sm"
                            />

                        </div>
                    )}
                </div>


                {/* FOOTER */}

                <div className="gp-employees-footer">
                    <div>
                        <strong>
                            Gestión de personal
                        </strong>

                        <span>
                            Registra nuevos empleados o
                            actualiza la información existente.
                        </span>
                    </div>

                    <Link
                        to="/empleados/crear"
                        className="gp-employees-footer-new"
                    >
                        <Plus
                            size={15}
                        />

                        Registrar empleado
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ListaEmpleados;