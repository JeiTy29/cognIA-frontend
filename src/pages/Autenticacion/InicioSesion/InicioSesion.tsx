import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './InicioSesion.css';
import '../../../styles/password-ui.css';
import { login, requestPasswordReset } from '../../../services/auth/auth.api';
import { consumeAuthNotice } from '../../../context/authNotice';
import { useAuth } from '../../../hooks/auth/useAuth';
import { getDefaultRouteForRoles } from '../../../utils/auth/roles';
import { decodeJwtPayload } from '../../../utils/auth/jwt';
import { Modal } from '../../../components/Modal/Modal';
import { ApiError } from '../../../services/api/httpClient';
import type { LoginErrorResponse, LoginResponse } from '../../../services/auth/auth.types';
import cogniaLogo from '../../../assets/branding/cognia-logo-light.png';

function isValidEmail(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 5 || trimmed.length > 254) return false;
    if (trimmed.includes(' ')) return false;

    const atIndex = trimmed.indexOf('@');
    if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@') || atIndex >= trimmed.length - 1) {
        return false;
    }

    const localPart = trimmed.slice(0, atIndex);
    const domainPart = trimmed.slice(atIndex + 1);
    if (!localPart || !domainPart) return false;
    if (domainPart.startsWith('.') || domainPart.endsWith('.')) return false;

    const dotIndex = domainPart.lastIndexOf('.');
    if (dotIndex <= 0 || dotIndex >= domainPart.length - 1) return false;

    return true;
}

type InicioSesionLocationState = {
    reason?: string;
    mfaConfigured?: boolean;
    message?: string;
    openForgot?: boolean;
    forgotEmail?: string;
};

type SuccessfulLoginResponse = {
    accessToken: string;
    expiresIn: number;
};

type MfaChallengeLoginResponse = {
    challengeId: string | null;
    expiresIn: number | null;
};

type MfaEnrollmentLoginResponse = {
    enrollmentToken: string | null;
    expiresIn: number | null;
};

function resolveInfoMessage(
    locationState: InicioSesionLocationState | null,
    search: string,
    storedNotice: string | null
) {
    if (storedNotice === 'expired') {
        return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    }

    if (locationState?.reason === 'unauthenticated') {
        return 'Debes iniciar sesión para acceder a la plataforma.';
    }

    if (locationState?.message) {
        return locationState.message;
    }

    if (locationState?.reason === 'expired') {
        return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    }

    if (locationState?.mfaConfigured) {
        return 'MFA configurado. Inicia sesión para continuar.';
    }

    const resetStatus = new URLSearchParams(search).get('reset');
    if (resetStatus === 'missing') {
        return 'Acceso inválido: falta el token de restablecimiento.';
    }

    if (resetStatus === 'invalid' || resetStatus === 'expired') {
        return 'El enlace de restablecimiento es inválido o ha expirado.';
    }

    return null;
}

function isLoginErrorResponse(response: LoginResponse | LoginErrorResponse): response is LoginErrorResponse {
    const candidate = response as Partial<LoginErrorResponse>;

    return (
        typeof candidate.status === 'number' &&
        (candidate.error === 'invalid_credentials' || candidate.error === 'request_failed')
    );
}

function resolveLoginErrorMessage(errorCode: LoginErrorResponse['error']) {
    if (errorCode === 'invalid_credentials') {
        return 'Usuario o contraseña incorrectos.';
    }
    return 'Ocurrió un error al iniciar sesión. Intenta nuevamente.';
}

function readStringProperty(source: unknown, ...keys: string[]) {
    if (!source || typeof source !== 'object') return null;

    const record = source as Record<string, unknown>;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    }

    return null;
}

function readNumberProperty(source: unknown, ...keys: string[]) {
    if (!source || typeof source !== 'object') return null;

    const record = source as Record<string, unknown>;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
    }

    return null;
}

function hasTrueFlag(source: unknown, ...keys: string[]) {
    if (!source || typeof source !== 'object') return false;

    const record = source as Record<string, unknown>;
    return keys.some((key) => record[key] === true);
}

function normalizeDirectLoginResponse(response: LoginResponse): SuccessfulLoginResponse | null {
    const accessToken = readStringProperty(response, 'access_token', 'accessToken');
    const expiresIn = readNumberProperty(response, 'expires_in', 'expiresIn');

    if (!accessToken || expiresIn === null) return null;

    return { accessToken, expiresIn };
}

function normalizeMfaChallengeResponse(response: LoginResponse): MfaChallengeLoginResponse | null {
    if (!hasTrueFlag(response, 'mfa_required', 'mfaRequired')) return null;

    return {
        challengeId: readStringProperty(response, 'challenge_id', 'challengeId'),
        expiresIn: readNumberProperty(response, 'expires_in', 'expiresIn')
    };
}

function normalizeMfaEnrollmentResponse(response: LoginResponse): MfaEnrollmentLoginResponse | null {
    if (!hasTrueFlag(response, 'mfa_enrollment_required', 'mfaEnrollmentRequired')) return null;

    return {
        enrollmentToken: readStringProperty(response, 'enrollment_token', 'enrollmentToken'),
        expiresIn: readNumberProperty(response, 'expires_in', 'expiresIn')
    };
}

type LoginHandleResult = {
    handled: boolean;
    errorMessage?: string;
};

function handleSuccessfulLoginResponse(
    response: LoginResponse,
    username: string,
    setSession: (token: string, expiresIn: number) => void,
    navigate: ReturnType<typeof useNavigate>
) : LoginHandleResult {
    const directLogin = normalizeDirectLoginResponse(response);
    if (directLogin) {
        setSession(directLogin.accessToken, directLogin.expiresIn);
        const payload = decodeJwtPayload(directLogin.accessToken);
        navigate(getDefaultRouteForRoles(payload?.roles), { replace: true });
        return { handled: true };
    }

    const challengeLogin = normalizeMfaChallengeResponse(response);
    if (challengeLogin) {
        if (!challengeLogin.challengeId) {
            return {
                handled: true,
                errorMessage: 'No se pudo iniciar el challenge MFA. Intenta iniciar sesión nuevamente.'
            };
        }

        navigate('/mfa', {
            state: {
                mode: 'challenge',
                challengeId: challengeLogin.challengeId,
                expiresIn: challengeLogin.expiresIn,
                username
            }
        });
        return { handled: true };
    }

    const enrollmentLogin = normalizeMfaEnrollmentResponse(response);
    if (enrollmentLogin) {
        if (!enrollmentLogin.enrollmentToken) {
            return {
                handled: true,
                errorMessage: 'No se pudo iniciar la configuración de MFA. Intenta iniciar sesión nuevamente.'
            };
        }

        navigate('/mfa', {
            state: {
                mode: 'setup',
                enrollmentToken: enrollmentLogin.enrollmentToken,
                expiresIn: enrollmentLogin.expiresIn,
                username
            }
        });
        return { handled: true };
    }

    return { handled: false };
}

function shouldRedirectToDefaultRoute(isAuthenticated: boolean, devAuthActive: boolean) {
    return isAuthenticated && !devAuthActive;
}

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
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotGeneralError, setForgotGeneralError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, roles, setSession, devAuthActive } = useAuth();
    const usernamePattern = /^[A-Za-z0-9._-]{3,32}$/;

    useEffect(() => {
        const storedNotice = consumeAuthNotice();
        const state = location.state as InicioSesionLocationState | null;
        const resolvedMessage = resolveInfoMessage(state, location.search, storedNotice);
        if (resolvedMessage) {
            setInfoMessage(resolvedMessage);
        }

        if (state?.openForgot) {
            setShowForgotModal(true);
            setForgotSuccess(false);
            setForgotError('');
            setForgotGeneralError('');
            setForgotEmail(state.forgotEmail ?? '');
        }
    }, [location.search, location.state]);

    if (shouldRedirectToDefaultRoute(isAuthenticated, devAuthActive)) {
        return <Navigate to={getDefaultRouteForRoles(roles)} replace />;
    }

    const resetForgotState = () => {
        setForgotEmail('');
        setForgotError('');
        setForgotSuccess(false);
        setForgotLoading(false);
        setForgotGeneralError('');
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

            if (isLoginErrorResponse(response)) {
                setErrorMessage(resolveLoginErrorMessage(response.error));
                return;
            }

            const loginResult = handleSuccessfulLoginResponse(response, username, setSession, navigate);
            if (loginResult.handled) {
                if (loginResult.errorMessage) {
                    setErrorMessage(loginResult.errorMessage);
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

    const handleForgotSubmit = async () => {
        setForgotError('');
        setForgotGeneralError('');
        if (!isValidEmail(forgotEmail)) {
            setForgotError('Ingresa un correo válido.');
            return;
        }
        setForgotLoading(true);
        try {
            await requestPasswordReset(forgotEmail.trim());
            setForgotSuccess(true);
        } catch (error) {
            if (error instanceof ApiError && error.status === 429) {
                setForgotGeneralError('Demasiados intentos. Espera un momento e inténtalo de nuevo.');
            } else {
                setForgotGeneralError('No se pudo procesar la solicitud. Intenta más tarde.');
            }
        } finally {
            setForgotLoading(false);
        }
    };

    const handleForgotClose = () => {
        setShowForgotModal(false);
        resetForgotState();
    };

    const handleForgotConfirm = () => {
        setShowForgotModal(false);
        resetForgotState();
    };

    return (
        <div className="auth-container">
            <div className="auth-left-panel"></div>

            <div className="auth-right-panel">
                <div className="auth-content">
                    <div className="header-brand">
                        <Link to="/" className="brand-link">
                            <img className="auth-brand-logo" src={cogniaLogo} alt="CognIA" />
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
                                Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.
                            </p>
                            <button type="button" className="btn-primary" onClick={handleForgotConfirm}>
                                Volver a iniciar sesión
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
                                    disabled={forgotLoading}
                                    onChange={(event) => {
                                        setForgotEmail(event.target.value);
                                        setForgotError('');
                                        setForgotGeneralError('');
                                    }}
                                />
                                {forgotError ? <div className="validation-error">{forgotError}</div> : null}
                                {forgotGeneralError ? <div className="validation-error">{forgotGeneralError}</div> : null}
                            </div>
                            <div className="auth-modal-actions">
                                <button type="button" className="btn-secondary" onClick={handleForgotClose} disabled={forgotLoading}>
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => {
                                        handleForgotSubmit().catch(() => undefined);
                                    }}
                                    disabled={forgotLoading}
                                >
                                    {forgotLoading ? 'Enviando...' : 'Enviar'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
