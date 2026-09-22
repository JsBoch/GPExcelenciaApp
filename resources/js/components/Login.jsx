import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import {
    FiUser,
    FiLock,
    FiEye,
    FiEyeOff,
    FiArrowRight,
    FiFileText,
    FiUsers,
    FiBox,
    FiTruck,
    FiBarChart2,
} from "react-icons/fi";

import "../../css/login.css";

function Login() {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState(null);

    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError(null);
        setLoading(true);

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/login`,
                {
                    name,
                    password,
                },
            );

            localStorage.setItem("token", response.data.token);

            navigate("/home");
        } catch (error) {
            console.error(error);

            setError("Usuario o contraseña incorrectos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="gp-login-page">
            {/* =========================
                PANEL IZQUIERDO
            ========================== */}

            <section className="gp-login-brand">
                <div className="gp-brand-glow gp-brand-glow-1"></div>
                <div className="gp-brand-glow gp-brand-glow-2"></div>

                <div className="gp-brand-content">
                    {/* LOGO */}

                    <div className="gp-brand-logo-area">
                        <div className="gp-brand-logo-glow">
                            <img
                                src="/images/LogoGPv3.jpg"
                                alt="GP Excelencia"
                                className="gp-brand-logo"
                            />
                        </div>
                    </div>

                    {/* MENSAJE */}

                    <div className="gp-brand-main">
                        {/* <span className="gp-brand-badge">GP EXCELENCIA</span> */}

                        <h1>
                            Creatividad en movimiento.
                            <span>Operaciones bajo control.</span>
                        </h1>

                        {/* <p className="gp-brand-description">
                            Una plataforma creada para la operación diaria de GP
                            Excelencia.
                        </p> */}
                    </div>

                    <div className="gp-brand-footer ">
                        <strong>GP Excelencia</strong>

                        <span>Sistema integral de operaciones</span>
                    </div>
                    <div className="gp-brand-signature">
                        <span></span>                       
                    </div>
                </div>
            </section>

            {/* =========================
                PANEL DERECHO
            ========================== */}

            <section className="gp-login-access">
                <div className="gp-login-card">
                    <div className="gp-login-card-header">
                        <div className="gp-mobile-logo">
                            <img
                                src="/images/LogoGPv3.jpg"
                                alt="GP Excelencia"
                            />
                        </div>

                        <span className="gp-login-eyebrow">GP EXCELENCIA</span>

                        <h2>Bienvenido</h2>

                        <p>Ingresa tus credenciales para acceder al sistema.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* ERROR */}

                        {error && <div className="gp-login-error">{error}</div>}

                        {/* USUARIO */}

                        <div className="gp-form-group">
                            <label htmlFor="usuario">Usuario</label>

                            <div className="gp-input-wrapper">
                                <FiUser className="gp-input-icon" />

                                <input
                                    id="usuario"
                                    type="text"
                                    placeholder="Ingresa tu usuario"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoComplete="username"
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>

                        {/* CONTRASEÑA */}

                        <div className="gp-form-group">
                            <label htmlFor="password">Contraseña</label>

                            <div className="gp-input-wrapper">
                                <FiLock className="gp-input-icon" />

                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Ingresa tu contraseña"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    autoComplete="current-password"
                                    required
                                />

                                <button
                                    type="button"
                                    className="gp-password-toggle"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Ocultar contraseña"
                                            : "Mostrar contraseña"
                                    }
                                >
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        {/* BOTÓN */}

                        <button
                            type="submit"
                            className="gp-login-button"
                            disabled={loading}
                        >
                            <span>
                                {loading
                                    ? "Ingresando..."
                                    : "Ingresar al sistema"}
                            </span>

                            {!loading && <FiArrowRight />}
                        </button>
                    </form>

                    <div className="gp-login-security">
                        Acceso exclusivo para usuarios autorizados
                    </div>
                </div>

                <div className="gp-login-copyright">
                    © {new Date().getFullYear()} GP Excelencia
                </div>
            </section>
        </div>
    );
}

export default Login;
