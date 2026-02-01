import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './InicioSesion.css';
import { login } from '../../../services/auth/auth.api';
import { ApiError } from '../../../services/api/httpClient';
import { consumeAuthNotice } from '../../../context/AuthContext';
import { useAuth } from '../../../hooks/auth/useAuth';
import { getDefaultRouteForRoles } from '../../../utils/auth/roles';
import { decodeJwtPayload } from '../../../utils/auth/jwt';

export default function InicioSesion() {
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, roles, setSession } = useAuth();

    useEffect(() => {
        const storedNotice = consumeAuthNotice();
        if (storedNotice === 'expired') {
            setInfoMessage('Tu sesión ha expirado. Inicia sesión nuevamente.');
        }
        const state = location.state as { reason?: string; mfaConfigured?: boolean } | null;
        if (state?.reason === 'unauthenticated') {
            setInfoMessage('Debes iniciar sesión para acceder a la plataforma.');
        }
        if (state?.reason === 'expired') {
            setInfoMessage('Tu sesión ha expirado. Inicia sesión nuevamente.');
        }
        if (state?.mfaConfigured) {
            setInfoMessage('MFA configurado. Inicia sesión para continuar.');
        }
    }, [location.state]);

    if (isAuthenticated) {
        return <Navigate to={getDefaultRouteForRoles(roles)} replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setInfoMessage(null);
        setLoading(true);
        try {
            const response = await login({ username, password });
            if ('error' in response && response.error === 'invalid_credentials') {
                setErrorMessage('Usuario o contraseña incorrectos.');
                return;
            }
            if ('access_token' in response) {
                setSession(response.access_token, response.expires_in);
                const payload = decodeJwtPayload(response.access_token);
                navigate(getDefaultRouteForRoles(payload?.roles), { replace: true });
                return;
            }
            if ('mfa_required' in response) {
                navigate('/mfa/challenge', { state: { mode: 'challenge', challengeId: response.challenge_id } });
                return;
            }
            if ('mfa_enrollment_required' in response) {
                navigate('/mfa/setup', { state: { mode: 'setup', enrollmentToken: response.enrollment_token } });
                return;
            }
            setErrorMessage('No se pudo iniciar sesión. Intenta nuevamente.');
        } catch (error) {
            if (error instanceof ApiError) {
                if (error.status === 400 || error.status === 401) {
                    setErrorMessage('Usuario o contraseña incorrectos.');
                } else {
                    setErrorMessage('Ocurrió un error al iniciar sesión. Intenta nuevamente.');
                }
            } else {
                setErrorMessage('Ocurrió un error al iniciar sesión. Intenta nuevamente.');
            }
        } finally {
            setLoading(false);
        }
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
                                pattern="^[-A-Za-z0-9._]{3,32}$"
                                title="Debe tener entre 3 y 32 caracteres. Solo letras, números, punto, guion y guion bajo."
                                autoCapitalize="none"
                                autoCorrect="off"
                                required
                            />
                        </div>

                        <div className="form-group password-group">
                            <input
                                type={mostrarContrasena ? "text" : "password"}
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

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Ingresando...' : 'Ingresar'}
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
