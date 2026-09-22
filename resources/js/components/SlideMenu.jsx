import React, { useEffect, useMemo, useState } from "react";

import { slide as Menu } from "react-burger-menu";

import {
    Link,
    useLocation,
} from "react-router-dom";

import {
    FiChevronDown,
    FiChevronRight,
    FiHome,
    FiLogOut,
    FiX,
} from "react-icons/fi";

import "../../css/SlideMenu.css";


function SlideMenu({
    logout,
    sections = [],
    userName = "Usuario",
    onClose,
    ...props
}) {

    const location = useLocation();

    const [openMenus, setOpenMenus] =
        useState({});


    /* =====================================================
       RUTA ACTUAL
    ===================================================== */

    const currentPath = location.pathname;


    /* =====================================================
       DETECTAR GRUPO ACTIVO
    ===================================================== */

    const activeMenuKey = useMemo(() => {

        let foundKey = null;


        sections.forEach(
            (section, sectionIndex) => {

                section.items.forEach(
                    (item, itemIndex) => {

                        const hasActiveRoute =
                            item.submenus.some(
                                (subLink) =>
                                    currentPath ===
                                        subLink.to ||
                                    currentPath.startsWith(
                                        `${subLink.to}/`
                                    )
                            );


                        if (hasActiveRoute) {

                            foundKey =
                                `${sectionIndex}-${itemIndex}`;

                        }

                    }
                );

            }
        );


        return foundKey;

    }, [
        sections,
        currentPath,
    ]);


    /* =====================================================
       ABRIR AUTOMÁTICAMENTE GRUPO ACTIVO
    ===================================================== */

    useEffect(() => {

        if (!activeMenuKey) {
            return;
        }


        setOpenMenus((prev) => ({

            ...prev,

            [activeMenuKey]: true,

        }));

    }, [activeMenuKey]);


    /* =====================================================
       ABRIR / CERRAR GRUPO
    ===================================================== */

    const toggleSubmenu = (key) => {

        setOpenMenus((prev) => ({

            ...prev,

            [key]: !prev[key],

        }));

    };


    /* =====================================================
       CERRAR AL NAVEGAR
    ===================================================== */

    const handleNavigation = () => {

        if (onClose) {

            onClose();

        }

    };


    /* =====================================================
       VERIFICAR SI SUBMENÚ ESTÁ ACTIVO
    ===================================================== */

    const isRouteActive = (route) => {

        return (
            currentPath === route ||
            currentPath.startsWith(
                `${route}/`
            )
        );

    };


    return (

        <Menu
            {...props}
            customBurgerIcon={false}
            customCrossIcon={false}
            width={310}
            className="gp-sidebar-menu"
        >

            <div className="gp-sidebar">


                {/* ========================
                    CABECERA
                ======================== */}

                <div className="gp-sidebar-header">

                    <div className="gp-sidebar-brand">

                        <div className="gp-sidebar-logo">

                            <img
                                src="/images/LogoGPv3.jpg"
                                alt="GP Excelencia"
                            />

                        </div>


                        <div className="gp-sidebar-brand-text">

                            <strong>
                                GP Excelencia
                            </strong>

                            <span>
                                Sistema de Operaciones
                            </span>

                        </div>

                    </div>


                    <button
                        type="button"
                        className="gp-sidebar-close"
                        onClick={onClose}
                        aria-label="Cerrar menú"
                    >

                        <FiX />

                    </button>

                </div>


                {/* ========================
                    CONTENIDO SCROLL
                ======================== */}

                <div className="gp-sidebar-scroll">


                    {/* INICIO */}

                    <div className="gp-sidebar-home-wrapper">

                        <Link
                            to="/home"
                            className={
                                `gp-sidebar-home ${
                                    currentPath === "/home"
                                        ? "active"
                                        : ""
                                }`
                            }
                            onClick={
                                handleNavigation
                            }
                        >

                            <FiHome />

                            <span>
                                Inicio
                            </span>

                        </Link>

                    </div>


                    {/* ========================
                        SECCIONES
                    ======================== */}

                    {sections.map(
                        (
                            section,
                            sectionIndex
                        ) => (

                            <div
                                className="gp-menu-section"
                                key={
                                    section.title
                                }
                            >

                                <div className="gp-menu-section-title">

                                    {
                                        section.title
                                    }

                                </div>


                                {section.items.map(
                                    (
                                        item,
                                        itemIndex
                                    ) => {

                                        const menuKey =
                                            `${sectionIndex}-${itemIndex}`;

                                        const isOpen =
                                            !!openMenus[
                                                menuKey
                                            ];

                                        const groupActive =
                                            item.submenus.some(
                                                (
                                                    subLink
                                                ) =>
                                                    isRouteActive(
                                                        subLink.to
                                                    )
                                            );


                                        return (

                                            <div
                                                className="gp-menu-group"
                                                key={
                                                    menuKey
                                                }
                                            >

                                                <button
                                                    type="button"
                                                    className={
                                                        `gp-menu-parent ${
                                                            isOpen
                                                                ? "open"
                                                                : ""
                                                        } ${
                                                            groupActive
                                                                ? "active"
                                                                : ""
                                                        }`
                                                    }
                                                    onClick={() =>
                                                        toggleSubmenu(
                                                            menuKey
                                                        )
                                                    }
                                                >

                                                    <span className="gp-menu-parent-left">

                                                        <span className="gp-menu-icon">

                                                            {
                                                                item.icon
                                                            }

                                                        </span>

                                                        <span>
                                                            {
                                                                item.text
                                                            }
                                                        </span>

                                                    </span>


                                                    <span className="gp-menu-chevron">

                                                        {
                                                            isOpen
                                                                ? (
                                                                    <FiChevronDown />
                                                                )
                                                                : (
                                                                    <FiChevronRight />
                                                                )
                                                        }

                                                    </span>

                                                </button>


                                                <div
                                                    className={
                                                        `gp-submenu ${
                                                            isOpen
                                                                ? "open"
                                                                : ""
                                                        }`
                                                    }
                                                >

                                                    {
                                                        item.submenus.map(
                                                            (
                                                                subLink
                                                            ) => {

                                                                const active =
                                                                    isRouteActive(
                                                                        subLink.to
                                                                    );


                                                                return (

                                                                    <Link
                                                                        key={
                                                                            subLink.to
                                                                        }
                                                                        to={
                                                                            subLink.to
                                                                        }
                                                                        className={
                                                                            `gp-submenu-item ${
                                                                                active
                                                                                    ? "active"
                                                                                    : ""
                                                                            }`
                                                                        }
                                                                        onClick={
                                                                            handleNavigation
                                                                        }
                                                                    >

                                                                        <span className="gp-submenu-icon">

                                                                            {
                                                                                subLink.icon
                                                                            }

                                                                        </span>

                                                                        <span>

                                                                            {
                                                                                subLink.text
                                                                            }

                                                                        </span>

                                                                    </Link>

                                                                );

                                                            }
                                                        )
                                                    }

                                                </div>

                                            </div>

                                        );

                                    }
                                )}

                            </div>

                        )
                    )}

                </div>


                {/* ========================
                    USUARIO
                ======================== */}

                <div className="gp-sidebar-footer">

                    <div className="gp-sidebar-user">

                        <div className="gp-sidebar-avatar">

                            {
                                userName
                                    .charAt(0)
                                    .toUpperCase()
                            }

                        </div>


                        <div className="gp-sidebar-user-info">

                            <span>
                                Sesión iniciada
                            </span>

                            <strong>
                                {userName}
                            </strong>

                        </div>

                    </div>


                    <button
                        type="button"
                        className="gp-sidebar-logout"
                        onClick={logout}
                    >

                        <FiLogOut />

                        <span>
                            Cerrar sesión
                        </span>

                    </button>


                    <div className="gp-sidebar-brand-stripe">

                        <span></span>
                        <span></span>
                        <span></span>

                    </div>

                </div>

            </div>

        </Menu>

    );

}


export default SlideMenu;