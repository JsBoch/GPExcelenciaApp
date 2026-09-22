import React, {
    useMemo,
} from "react";

import {
    Link,
    useOutletContext,
} from "react-router-dom";

import {
    FiHome,
    FiArrowRight,
} from "react-icons/fi";

import {
    PREFERRED_QUICK_ACTIONS,
} from "../config/navigationConfig";

import "./Home.css";


function Home() {

    const {
        displayName,
        authorizedOptions,
    } = useOutletContext();


    const quickActions =
        useMemo(() => {

            const ordered = [];


            PREFERRED_QUICK_ACTIONS.forEach(
                (route) => {

                    const option =
                        authorizedOptions.find(
                            (item) =>
                                item.to === route
                        );


                    if (option) {

                        ordered.push(
                            option
                        );

                    }

                }
            );


            if (
                ordered.length < 6
            ) {

                authorizedOptions.forEach(
                    (option) => {

                        if (
                            ordered.length < 6 &&
                            !ordered.some(
                                (item) =>
                                    item.to ===
                                    option.to
                            )
                        ) {

                            ordered.push(
                                option
                            );

                        }

                    }
                );

            }


            return ordered.slice(
                0,
                6
            );

        }, [authorizedOptions]);


    return (

        <div className="gp-home-content">


            {/* HERO */}

            <section className="gp-home-hero">

                <div className="gp-hero-decoration gp-hero-decoration-one"></div>

                <div className="gp-hero-decoration gp-hero-decoration-two"></div>


                <div className="gp-hero-content">

                    <span className="gp-hero-label">
                        GP EXCELENCIA
                    </span>


                    <h1>
                        Bienvenido,
                        <span>
                            {" "}
                            {displayName}
                        </span>
                    </h1>


                    <p>
                        Tu espacio central para gestionar las operaciones de GP Excelencia.
                    </p>


                    <div className="gp-hero-brand-line">

                        <span></span>
                        <span></span>
                        <span></span>

                    </div>

                </div>


                <div className="gp-hero-logo">

                    <img
                        src="/images/LogoGPv3.jpg"
                        alt="GP Excelencia"
                    />

                </div>

            </section>


            {/* ACCESOS */}

            <section className="gp-home-section">

                <div className="gp-section-heading">

                    <div>

                        <span>
                            ACCESOS RÁPIDOS
                        </span>

                        <h2>
                            ¿Qué deseas hacer?
                        </h2>

                    </div>


                    <p>
                        Las opciones se muestran según tus permisos.
                    </p>

                </div>


                {
                    quickActions.length > 0
                        ? (

                            <div className="gp-quick-grid">

                                {quickActions.map(
                                    (action) => (

                                        <Link
                                            key={
                                                action.to
                                            }
                                            to={
                                                action.to
                                            }
                                            className="gp-quick-card"
                                        >

                                            <div className="gp-quick-icon">

                                                {
                                                    action.icon
                                                }

                                            </div>


                                            <div className="gp-quick-content">

                                                <span>
                                                    {
                                                        action.group
                                                    }
                                                </span>

                                                <h3>
                                                    {
                                                        action.text
                                                    }
                                                </h3>

                                            </div>


                                            <div className="gp-quick-arrow">

                                                <FiArrowRight />

                                            </div>

                                        </Link>

                                    )
                                )}

                            </div>

                        )
                        : (

                            <div className="gp-empty-state">

                                <FiHome />

                                <h3>
                                    Bienvenido a GP Excelencia
                                </h3>

                                <p>
                                    Actualmente no tienes accesos configurados.
                                </p>

                            </div>

                        )
                }

            </section>


            <footer className="gp-home-footer">

                <span>
                    GP Excelencia
                </span>

                <div></div>

                <span>
                    Sistema integral de operaciones
                </span>

            </footer>

        </div>

    );

}


export default Home;