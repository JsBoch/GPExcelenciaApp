import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import axios from "axios";

import {
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import alertify from "alertifyjs";

import {
    FiMenu,
    FiBox,
} from "react-icons/fi";

import SlideMenu from "./SlideMenu";

import {
    OPTION_CONFIG,
    GROUP_ICONS,
    MENU_ORDER,
} from "../config/navigationConfig";

import "../../css/Layout.css";


/* =========================================================
   TÍTULOS SEGÚN RUTA
========================================================= */

const ROUTE_TITLES = [

    ["/home", "Inicio"],

    ["/empleados/crear", "Crear empleado"],
    ["/empleados/lista", "Empleados"],
    ["/empleados/editar", "Editar empleado"],

    ["/clientes/crear", "Crear cliente"],
    ["/clientes/lista", "Clientes"],
    ["/clientes/editar", "Editar cliente"],
    ["/clientes/datos", "Contactos de clientes"],

    ["/contacto_cliente/crear", "Crear contacto"],
    ["/contacto_cliente/lista", "Contactos"],

    ["/cotizaciones/crear", "Nueva cotización"],
    ["/cotizaciones/lista", "Cotizaciones"],
    ["/cotizaciones/editar", "Editar cotización"],

    ["/costeocotizaciones/lista", "Cotizaciones para costeo"],
    ["/cotizacionescosteo/lista", "Cotizaciones en costeo"],
    ["/cotizacionesprefacturacion/lista", "Pre-Facturación"],

    ["/productospredefinidos/crear", "Crear producto"],
    ["/productospredefinidos/lista", "Productos predefinidos"],

    ["/monitorfacturacion/lista", "Facturación"],

    ["/pedidosproduccion/crear", "Nuevo pedido de producción"],
    ["/pedidosproduccion/lista", "Pedidos de producción"],
    ["/pedidosproduccion/editar", "Editar pedido"],

    ["/monitor_produccion", "Monitor de producción"],
    ["/maquinas_produccion", "Máquinas de producción"],

    ["/area_trabajo/nuevo", "Crear área"],
    ["/area_trabajo/lista", "Áreas de trabajo"],

    ["/autorizacion_logistica/lista", "Autorización de pedidos"],
    ["/logistica_produccion/monitor", "Monitor de logística"],

    ["/recibos/crear", "Registrar recibo"],
    ["/recibos/lista", "Recibos"],

    ["/cuentas-por-cobrar/lista", "Estado de cuenta"],

    ["/reportes/contabilidad", "Reportes contables"],
];


function Layout() {

    const [menuOpen, setMenuOpen] =
        useState(false);

    const [user, setUser] =
        useState(null);

    const [loading, setLoading] =
        useState(true);


    const navigate = useNavigate();

    const location = useLocation();


    /* =====================================================
       USUARIO
    ===================================================== */

    useEffect(() => {

        const fetchUser = async () => {

            try {

                const res = await axios.get(
                    "/api/user",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${localStorage.getItem(
                                    "token"
                                )}`,
                        },
                    }
                );

                setUser(res.data);

            } catch (error) {

                console.error(error);

                localStorage.removeItem(
                    "token"
                );

                alertify.error(
                    "No fue posible validar la sesión."
                );

                navigate("/");

            } finally {

                setLoading(false);

            }

        };


        fetchUser();

    }, []);


    /* =====================================================
       BODY
    ===================================================== */

    useEffect(() => {

        const previous =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";


        return () => {

            document.body.style.overflow =
                previous;

        };

    }, []);


    /* =====================================================
       LOGOUT
    ===================================================== */

    const logout = async () => {

        try {

            await axios.post(
                "/api/logout",
                {},
                {
                    headers: {
                        Authorization:
                            `Bearer ${localStorage.getItem(
                                "token"
                            )}`,
                    },
                }
            );

        } catch (error) {

            console.error(error);

        } finally {

            localStorage.removeItem(
                "token"
            );

            navigate("/");

        }

    };


    /* =====================================================
       OPCIONES AUTORIZADAS
    ===================================================== */

    const authorizedOptions =
        useMemo(() => {

            if (!user?.perfiles) {

                return [];

            }


            const result = [];

            const uniqueRoutes =
                new Set();


            user.perfiles.forEach(
                (perfil) => {

                    perfil.opciones?.forEach(
                        (opcion) => {

                            const config =
                                OPTION_CONFIG[
                                    opcion.nombre
                                ];


                            if (
                                config &&
                                !uniqueRoutes.has(
                                    config.to
                                )
                            ) {

                                uniqueRoutes.add(
                                    config.to
                                );

                                result.push({
                                    ...config,
                                    originalName:
                                        opcion.nombre,
                                });

                            }

                        }
                    );

                }
            );


            return result;

        }, [user]);


    /* =====================================================
       MENÚ
    ===================================================== */

    const menuSections =
        useMemo(() => {

            const sections = {};


            authorizedOptions.forEach(
                (option) => {

                    if (
                        !sections[
                            option.section
                        ]
                    ) {

                        sections[
                            option.section
                        ] = {};

                    }


                    if (
                        !sections[
                            option.section
                        ][option.group]
                    ) {

                        sections[
                            option.section
                        ][option.group] = {

                            text:
                                option.group,

                            icon:
                                GROUP_ICONS[
                                    option.group
                                ] ||
                                <FiBox />,

                            submenus: [],

                        };

                    }


                    sections[
                        option.section
                    ][
                        option.group
                    ].submenus.push({

                        to: option.to,

                        text:
                            option.text,

                        icon:
                            option.icon,

                    });

                }
            );


            return MENU_ORDER
                .filter(
                    (section) =>
                        sections[section]
                )
                .map(
                    (section) => ({

                        title:
                            section,

                        items:
                            Object.values(
                                sections[
                                    section
                                ]
                            ),

                    })
                );

        }, [authorizedOptions]);


    /* =====================================================
       NOMBRE
    ===================================================== */

    const displayName =
        user?.name ||
        user?.nombre ||
        "Usuario";


    /* =====================================================
       TÍTULO ACTUAL
    ===================================================== */

    const currentTitle =
        useMemo(() => {

            const match =
                ROUTE_TITLES.find(
                    ([route]) =>

                        location.pathname ===
                            route ||

                        location.pathname.startsWith(
                            `${route}/`
                        )
                );


            return match
                ? match[1]
                : "GP Excelencia";

        }, [location.pathname]);


    /* =====================================================
       LOADING
    ===================================================== */

    if (loading) {

        return (

            <div className="gp-layout-loading">

                <img
                    src="/images/LogoGPv3.jpg"
                    alt="GP Excelencia"
                />

                <div className="gp-layout-spinner"></div>

                <span>
                    Cargando sistema...
                </span>

            </div>

        );

    }


    /* =====================================================
       UI
    ===================================================== */

    return (

        <div className="gp-layout-page">

            <SlideMenu
                isOpen={menuOpen}
                onStateChange={(state) =>
                    setMenuOpen(
                        state.isOpen
                    )
                }
                onClose={() =>
                    setMenuOpen(false)
                }
                logout={logout}
                sections={menuSections}
                userName={displayName}
            />


            <div className="gp-layout-shell">


                {/* TOPBAR */}

                <header className="gp-layout-topbar">


                    <div className="gp-layout-topbar-left">

                        <button
                            type="button"
                            className="gp-layout-menu-button"
                            onClick={() =>
                                setMenuOpen(true)
                            }
                            aria-label="Abrir menú"
                        >

                            <FiMenu />

                        </button>


                        <div className="gp-layout-title">

                            <span>
                                Sistema de Operaciones
                            </span>

                            <strong>
                                {currentTitle}
                            </strong>

                        </div>

                    </div>


                    <div className="gp-layout-user">

                        <div className="gp-layout-avatar">

                            {displayName
                                .charAt(0)
                                .toUpperCase()}

                        </div>


                        <div className="gp-layout-user-info">

                            <span>
                                Usuario
                            </span>

                            <strong>
                                {displayName}
                            </strong>

                        </div>

                    </div>

                </header>


                {/* CONTENIDO DE CADA MÓDULO */}

                <main className="gp-layout-content">

                    <Outlet
                        context={{
                            user,
                            displayName,
                            authorizedOptions,
                        }}
                    />

                </main>

            </div>

        </div>

    );

}


export default Layout;