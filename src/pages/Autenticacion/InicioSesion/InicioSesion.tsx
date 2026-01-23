import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './InicioSesion.css';

export default function InicioSesion() {
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate('/autenticacion');
    };

    return (
        <div className="auth-container">
            <div className="auth-left-panel"></div>

            <div className="auth-right-panel">
                <div className="auth-content">
                    <div className="header-brand">
                        <Link to="/" className="brand-link">
                            <div className="brand-icon">c</div>
                            <span className="brand-text">cognIA</span>
                        </Link>
                    </div>

                    <h1 className="auth-title">Iniciar sesión</h1>

                    <p className="auth-subtitle">
                        ¿Aún no tienes una cuenta?{' '}
                        <Link to="/registro" className="link-highlight">Regístrate</Link>
                    </p>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <input
                                type="email"
                                className="form-input"
                                placeholder="Correo electrónico"
                                required
                            />
                        </div>

                        <div className="form-group password-group">
                            <input
                                type={mostrarContrasena ? "text" : "password"}
                                className="form-input"
                                placeholder="Contraseña"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                                {mostrarContrasena ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>

                        <button type="submit" className="btn-primary">
                            Ingresar
                        </button>

                        <Link to="/recuperar-contrasena" className="forgot-password-link">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </form>

                    <div className="version-footer">
                        cognIA v1.0.0
                    </div>
                </div>
            </div>
        </div>
    );
}
