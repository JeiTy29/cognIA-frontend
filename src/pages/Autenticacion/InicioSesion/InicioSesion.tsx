import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './InicioSesion.css';
import { login } from '../../../services/auth/auth.api';
import { consumeAuthNotice } from '../../../context/authNotice';
import { useAuth } from '../../../hooks/auth/useAuth';
import { getDefaultRouteForRoles } from '../../../utils/auth/roles';
import { decodeJwtPayload } from '../../../utils/auth/jwt';
import { Modal } from '../../../components/Modal/Modal';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InicioSesion() {
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotError, setForgotError] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, roles, setSession, devAuthActive } = useAuth();
    const usernamePattern = /^[A-Za-z0-9._-]{3,32}$/;

    useEffect(() => {
        const storedNotice = consumeAuthNotice();
        if (storedNotice === 'expired') {
            setInfoMessage('Tu sesión ha expirado. Inicia sesión nuevamente.');
        }
        const state = location.state as { reason?: string; mfaConfigured?: boolean; message?: string } | null;
        if (state?.reason === 'unauthenticated') {
            setInfoMessage('Debes iniciar sesión para acceder a la plataforma.');
        }
        if (state?.message) {
            setInfoMessage(state.message);
        }
        if (state?.reason === 'expired') {
            setInfoMessage('Tu sesión ha expirado. Inicia sesión nuevamente.');
        }
        if (state?.mfaConfigured) {
            setInfoMessage('MFA configurado. Inicia sesión para continuar.');
        }
    }, [location.state]);

    if (isAuthenticated && !devAuthActive) {
        return <Navigate to={getDefaultRouteForRoles(roles)} replace />;
    }

    const resetForgotState = () => {
        setForgotEmail('');
        setForgotError('');
        setForgotSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setInfoMessage(null);
        setLoading(true);
        try {
            if (!usernamePattern.test(username)) {
                setErrorMessage('Revisa el nombre de usuario. Debe tener entre 3 y 32 caracteres válidos.');
                return;
            }
            const response = await login({ username, password });
            if ('access_token' in response) {
                setSession(response.access_token, response.expires_in);
                const payload = decodeJwtPayload(response.access_token);
                navigate(getDefaultRouteForRoles(payload?.roles), { replace: true });
                return;
            }
            if ('mfa_required' in response && response.mfa_required) {
                navigate('/mfa', {
                    state: {
                        mode: 'challenge',
                        challengeId: response.challenge_id,
                        expiresIn: response.expires_in,
                        username
                    },
                });
                return;
            }
            if ('mfa_enrollment_required' in response && response.mfa_enrollment_required) {
                navigate('/mfa', {
                    state: {
                        mode: 'setup',
                        enrollmentToken: response.enrollment_token,
                        expiresIn: response.expires_in,
                        username
                    },
                });
                return;
            }
            if ('error' in response) {
                if (response.error === 'invalid_credentials') {
                    setErrorMessage('Usuario o contraseña incorrectos.');
                } else {
                    setErrorMessage('Ocurrió un error al iniciar sesión. Intenta nuevamente.');
                }
                return;
            }
            setErrorMessage('No se pudo iniciar sesión. Intenta nuevamente.');
        } catch {
            setErrorMessage('Ocurrió un error al iniciar sesión. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotSubmit = () => {
        setForgotError('');
        if (!emailPattern.test(forgotEmail)) {
            setForgotError('Ingresa un correo válido.');
            return;
        }
        setForgotSuccess(true);
    };

    const handleForgotClose = () => {
        setShowForgotModal(false);
        resetForgotState();
    };

    const handleForgotConfirm = () => {
        setShowForgotModal(false);
        resetForgotState();
        navigate('/restablecer-contrasena');
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

                    {devAuthActive ? (
                        <div className="validation-success">Modo desarrollo activo. Puedes iniciar sesión normalmente.</div>
                    ) : null}

                    <form
                        className="auth-form"
                        onSubmit={handleSubmit}
                    >
                        {infoMessage ? <div className="validation-success">{infoMessage}</div> : null}
                        {errorMessage ? <div className="validation-error">{errorMessage}</div> : null}
                        <div className="form-group">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Nombre de usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                title="Debe tener entre 3 y 32 caracteres. Solo letras, números, punto, guion y guion bajo."
                                autoCapitalize="none"
                                autoCorrect="off"
                                required
                            />
                        </div>

                        <div className="form-group password-group">
                            <input
                                type={mostrarContrasena ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>

                        <button
                            type="button"
                            className="forgot-password-link"
                            onClick={() => {
                                resetForgotState();
                                setShowForgotModal(true);
                            }}
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </form>

                    <div className="version-footer">
                        cognIA v1.0.0
                    </div>
                </div>
            </div>

            <Modal isOpen={showForgotModal} onClose={handleForgotClose}>
                <div className="auth-modal">
                    <h2 className="auth-modal-title">Recuperar contraseña</h2>
                    {forgotSuccess ? (
                        <>
                            <p className="auth-modal-text">
                                Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.
                            </p>
                            <button type="button" className="btn-primary" onClick={handleForgotConfirm}>
                                Entendido
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="auth-modal-text">
                                Ingresa el correo con el que te registraste y te enviaremos un enlace para restablecerla.
                            </p>
                            <div className="form-group">
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="correo@ejemplo.com"
                                    value={forgotEmail}
                                    onChange={(event) => {
                                        setForgotEmail(event.target.value);
                                        setForgotError('');
                                    }}
                                />
                                {forgotError ? <div className="validation-error">{forgotError}</div> : null}
                            </div>
                            <div className="auth-modal-actions">
                                <button type="button" className="btn-secondary" onClick={handleForgotClose}>
                                    Cancelar
                                </button>
                                <button type="button" className="btn-primary" onClick={handleForgotSubmit}>
                                    Enviar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
