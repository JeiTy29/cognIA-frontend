import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { validatePassword } from '../../../utils/passwordValidation';
import './MiCuenta.css';
import { changePassword, logout, mfaDisable } from '../../../services/auth/auth.api';
import { useAuth } from '../../../hooks/auth/useAuth';
import { getAccountTypeLabel, isGuardianProfile, isPsychologistProfile } from '../../../utils/auth/profileMapper';
import { Modal } from '../../../components/Modal/Modal';
import { MfaSetupView } from '../../../components/MFA/MfaSetupView';
import { ApiError } from '../../../services/api/httpClient';

const passwordRules = [
    { id: 'length', label: 'Mínimo 8 caracteres', test: (value: string) => value.length >= 8 },
    { id: 'upper', label: 'Al menos una mayúscula', test: (value: string) => /[A-Z]/.test(value) },
    { id: 'lower', label: 'Al menos una minúscula', test: (value: string) => /[a-z]/.test(value) },
    { id: 'number', label: 'Al menos un número', test: (value: string) => /[0-9]/.test(value) },
    {
        id: 'special',
        label: 'Al menos un carácter especial (!@#$...)',
        test: (value: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)
    }
];

export default function MiCuenta() {
    const navigate = useNavigate();
    const { logout: clearSession, profile, profileStatus, profileErrorStatus, devAuthActive, devLogout, accessToken, reloadProfile, isAuthenticated } = useAuth();
    const [openPanel, setOpenPanel] = useState<'contrasena' | null>(null);

    const [contrasenaActual, setContrasenaActual] = useState('');
    const [nuevaContrasena, setNuevaContrasena] = useState('');
    const [confirmarNueva, setConfirmarNueva] = useState('');
    const [mostrarActual, setMostrarActual] = useState(false);
    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [passwordSubmitAttempted, setPasswordSubmitAttempted] = useState(false);
    const [passwordGeneralError, setPasswordGeneralError] = useState('');
    const [highlightCurrentPassword, setHighlightCurrentPassword] = useState(false);
    const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
    const [logoutError, setLogoutError] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [showMfaDisable, setShowMfaDisable] = useState(false);
    const [disablePassword, setDisablePassword] = useState('');
    const [disableCode, setDisableCode] = useState('');
    const [disableMode, setDisableMode] = useState<'totp' | 'recovery'>('totp');
    const [disableLoading, setDisableLoading] = useState(false);
    const [disableError, setDisableError] = useState<string | null>(null);
    const [disableSuccess, setDisableSuccess] = useState<string | null>(null);
    const passwordChecks = useMemo(() => (
        passwordRules.map(rule => ({
            id: rule.id,
            label: rule.label,
            valid: rule.test(nuevaContrasena)
        }))
    ), [nuevaContrasena]);

    const isPsychologist = isPsychologistProfile(profile);
    const isGuardian = isGuardianProfile(profile);
    const tipoCuenta = getAccountTypeLabel(profile);
    const correo = profile?.email ?? '—';
    const username = profile?.username ?? '—';
    const nombreCompleto = profile?.full_name ?? '—';
    const tarjetaProfesional = profile?.professional_card_number ?? '—';
    const mfaEnabled = profile?.mfa_enabled ?? false;

    useEffect(() => {
        if (profileStatus === 'error' && profileErrorStatus === 401) {
            clearSession('manual');
            navigate('/inicio-sesion', { replace: true, state: { reason: 'unauthenticated' } });
        }
    }, [profileStatus, profileErrorStatus, clearSession, navigate]);

    const profileMessage = useMemo(() => {
        if (profileStatus !== 'error') return null;
        if (profileErrorStatus === 403) return 'No tienes permisos para ver tu perfil.';
        if (profileErrorStatus === 404) return 'No se encontró tu perfil.';
        return 'No fue posible cargar tu información. Intenta más tarde.';
    }, [profileStatus, profileErrorStatus]);
    useEffect(() => {
        if (openPanel !== 'contrasena') {
            setPasswordSaved(false);
            setPasswordSubmitAttempted(false);
            setPasswordGeneralError('');
            setHighlightCurrentPassword(false);
        }
    }, [openPanel]);

    const nuevaContrasenaError = useMemo(() => {
        if (!nuevaContrasena) {
            return passwordSubmitAttempted ? 'Ingresa una nueva contraseña.' : '';
        }
        const validationError = validatePassword(nuevaContrasena);
        if (validationError) return validationError;
        if (contrasenaActual && nuevaContrasena === contrasenaActual) {
            return 'La nueva contraseña debe ser diferente de la actual.';
        }
        return '';
    }, [nuevaContrasena, contrasenaActual, passwordSubmitAttempted]);

    const confirmarContrasenaError = useMemo(() => {
        if (!confirmarNueva) {
            return passwordSubmitAttempted ? 'Confirma la nueva contraseña.' : '';
        }
        return nuevaContrasena === confirmarNueva ? '' : 'Las contraseñas no coinciden.';
    }, [nuevaContrasena, confirmarNueva, passwordSubmitAttempted]);

    const contrasenaActualError = useMemo(() => {
        if (!contrasenaActual) {
            return passwordSubmitAttempted ? 'Ingresa tu contraseña actual.' : '';
        }
        return '';
    }, [contrasenaActual, passwordSubmitAttempted]);

    const canSavePassword =
        isAuthenticated &&
        !passwordSubmitting &&
        !!contrasenaActual &&
        !!nuevaContrasena &&
        !!confirmarNueva &&
        !contrasenaActualError &&
        !nuevaContrasenaError &&
        !confirmarContrasenaError &&
        nuevaContrasena === confirmarNueva;

    const togglePanel = (panel: 'contrasena') => {
        setOpenPanel((prev) => (prev === panel ? null : panel));
    };

    const handlePasswordSubmit = (event: FormEvent) => {
        event.preventDefault();
        setPasswordSubmitAttempted(true);
        setPasswordSaved(false);
        setPasswordGeneralError('');
        setHighlightCurrentPassword(false);

        if (!isAuthenticated) {
            setPasswordGeneralError('Debes iniciar sesión.');
            return;
        }

        if (!canSavePassword) return;

        setPasswordSubmitting(true);
        void changePassword({
            currentPassword: contrasenaActual,
            newPassword: nuevaContrasena,
            confirmNewPassword: confirmarNueva
        })
            .then(() => {
                setPasswordSaved(true);
                setContrasenaActual('');
                setNuevaContrasena('');
                setConfirmarNueva('');
                setPasswordSubmitAttempted(false);
                setMostrarActual(false);
                setMostrarNueva(false);
                setMostrarConfirmar(false);
            })
            .catch((error: unknown) => {
                if (error instanceof ApiError) {
                    if (error.status === 400) {
                        setHighlightCurrentPassword(true);
                        setPasswordGeneralError('Datos inválidos. Verifica la contraseña actual y la nueva contraseña.');
                        return;
                    }
                    if (error.status === 401) {
                        clearSession('expired');
                        navigate('/inicio-sesion', {
                            replace: true,
                            state: { message: 'Sesión expirada o no autenticado. Inicia sesión nuevamente.' }
                        });
                        return;
                    }
                    if (error.status === 403) {
                        setPasswordGeneralError('No tienes permisos para realizar esta acción.');
                        return;
                    }
                    if (error.status === 429) {
                        setPasswordGeneralError('Demasiados intentos. Espera un momento e inténtalo de nuevo.');
                        return;
                    }
                }
                setPasswordGeneralError('Ocurrió un error inesperado. Intenta más tarde.');
            })
            .finally(() => {
                setPasswordSubmitting(false);
            });
    };

    const handleLogout = async () => {
        setLogoutLoading(true);
        setLogoutMessage(null);
        setLogoutError(false);
        try {
            const response = await logout();
            if ('error' in response) {
                setLogoutMessage('No fue posible cerrar sesión. Inicia sesión de nuevo.');
                setLogoutError(true);
            } else {
                setLogoutMessage('Sesión cerrada.');
            }
        } catch {
            setLogoutMessage('No fue posible cerrar sesión. Inicia sesión de nuevo.');
            setLogoutError(true);
        } finally {
            clearSession('manual');
            setLogoutLoading(false);
            window.setTimeout(() => {
                navigate('/inicio-sesion', { replace: true });
            }, 500);
        }
    };

    const handleDevLogout = () => {
        devLogout();
        navigate('/inicio-sesion', { replace: true });
    };

    return (
        <div className="mi-cuenta-container">
            <h1 className="mi-cuenta-title">Mi cuenta</h1>

            <div className="mi-cuenta-grid">
                <section className="info-card mi-cuenta-section">
                    <h2 className="mi-cuenta-section-title">Información de la cuenta</h2>
                    {profileStatus === 'loading' && (
                        <div className="mi-cuenta-success">Cargando perfil...</div>
                    )}
                    {profileMessage && (
                        <div className="mi-cuenta-error">{profileMessage}</div>
                    )}
                    <div className="mi-cuenta-field">
                        <span className="mi-cuenta-label">Usuario</span>
                        <span className="mi-cuenta-value">{username}</span>
                    </div>
                    <div className="mi-cuenta-field">
                        <span className="mi-cuenta-label">Tipo de cuenta</span>
                        <span className="mi-cuenta-value">{tipoCuenta}</span>
                    </div>
                    {isPsychologist && (
                        <div className="mi-cuenta-field">
                            <span className="mi-cuenta-label">Nombre completo</span>
                            <span className="mi-cuenta-value">{nombreCompleto}</span>
                        </div>
                    )}
                    {isPsychologist && (
                        <div className="mi-cuenta-field">
                            <span className="mi-cuenta-label">Tarjeta profesional</span>
                            <span className="mi-cuenta-value">{tarjetaProfesional}</span>
                        </div>
                    )}
                    <div className="mi-cuenta-field">
                        <span className="mi-cuenta-label">Correo</span>
                        <span className="mi-cuenta-value">{correo}</span>
                    </div>
                </section>

                <section className="info-card mi-cuenta-section">
                    <h2 className="mi-cuenta-section-title">Seguridad</h2>
                    <p className="mi-cuenta-section-note">Actualiza tu contraseña de acceso.</p>

                    <button
                        type="button"
                        className={`mi-cuenta-toggle ${openPanel === 'contrasena' ? 'is-open' : ''}`}
                        onClick={() => togglePanel('contrasena')}
                        aria-expanded={openPanel === 'contrasena'}
                        aria-controls="panel-contrasena"
                    >
                        <span>Cambiar contraseña</span>
                        <span className="mi-cuenta-toggle-icon" aria-hidden="true">
                            {openPanel === 'contrasena' ? <ChevronIcon /> : <EditIcon />}
                        </span>
                    </button>
                    <div
                        id="panel-contrasena"
                        className={`mi-cuenta-panel ${openPanel === 'contrasena' ? 'is-open' : ''}`}
                    >
                        <div className="mi-cuenta-panel-inner">
                            <form className="mi-cuenta-form" onSubmit={handlePasswordSubmit}>
                                {!isAuthenticated && (
                                    <div className="mi-cuenta-error">Debes iniciar sesión.</div>
                                )}
                                {passwordGeneralError && (
                                    <div className="mi-cuenta-error">{passwordGeneralError}</div>
                                )}
                                <label className="mi-cuenta-input-group">
                                    <span className="mi-cuenta-input-label">Contraseña actual</span>
                                    <div className="mi-cuenta-input-wrapper">
                                        <input
                                            className={`mi-cuenta-input ${highlightCurrentPassword ? 'is-invalid' : ''}`}
                                            type={mostrarActual ? 'text' : 'password'}
                                            value={contrasenaActual}
                                            disabled={passwordSubmitting}
                                            onChange={(event) => {
                                                setContrasenaActual(event.target.value);
                                                setPasswordSaved(false);
                                                setPasswordGeneralError('');
                                                setHighlightCurrentPassword(false);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="mi-cuenta-toggle-visibility"
                                            disabled={passwordSubmitting}
                                            onClick={() => setMostrarActual((prev) => !prev)}
                                            aria-label={mostrarActual ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
                                        >
                                            <VisibilityIcon isVisible={mostrarActual} />
                                        </button>
                                    </div>
                                    {contrasenaActualError && <span className="mi-cuenta-error">{contrasenaActualError}</span>}
                                    {highlightCurrentPassword && (
                                        <span className="mi-cuenta-error">Revisa la contraseña actual antes de intentar nuevamente.</span>
                                    )}
                                </label>
                                <label className="mi-cuenta-input-group">
                                    <span className="mi-cuenta-input-label">Nueva contraseña</span>
                                    <div className="mi-cuenta-input-wrapper">
                                        <input
                                            className="mi-cuenta-input"
                                            type={mostrarNueva ? 'text' : 'password'}
                                            value={nuevaContrasena}
                                            disabled={passwordSubmitting}
                                            onChange={(event) => {
                                                setNuevaContrasena(event.target.value);
                                                setPasswordSaved(false);
                                                setPasswordGeneralError('');
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="mi-cuenta-toggle-visibility"
                                            disabled={passwordSubmitting}
                                            onClick={() => setMostrarNueva((prev) => !prev)}
                                            aria-label={mostrarNueva ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                                        >
                                            <VisibilityIcon isVisible={mostrarNueva} />
                                        </button>
                                    </div>
                                    {nuevaContrasenaError && <span className="mi-cuenta-error">{nuevaContrasenaError}</span>}
                                </label>
                                <div className="password-checklist">
                                    <span className="password-checklist-title">Requisitos de contraseña</span>
                                    <div className="password-checklist-grid">
                                        {passwordChecks.map((check) => (
                                            <div
                                                key={check.id}
                                                className={`password-check ${check.valid ? 'is-valid' : 'is-invalid'}`}
                                            >
                                                <span className="password-check-indicator" aria-hidden="true">
                                                    {check.valid ? '✓' : '•'}
                                                </span>
                                                <span>{check.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <label className="mi-cuenta-input-group">
                                    <span className="mi-cuenta-input-label">Confirmar nueva contraseña</span>
                                    <div className="mi-cuenta-input-wrapper">
                                        <input
                                            className="mi-cuenta-input"
                                            type={mostrarConfirmar ? 'text' : 'password'}
                                            value={confirmarNueva}
                                            disabled={passwordSubmitting}
                                            onChange={(event) => {
                                                setConfirmarNueva(event.target.value);
                                                setPasswordSaved(false);
                                                setPasswordGeneralError('');
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="mi-cuenta-toggle-visibility"
                                            disabled={passwordSubmitting}
                                            onClick={() => setMostrarConfirmar((prev) => !prev)}
                                            aria-label={mostrarConfirmar ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                                        >
                                            <VisibilityIcon isVisible={mostrarConfirmar} />
                                        </button>
                                    </div>
                                    {confirmarContrasenaError && <span className="mi-cuenta-error">{confirmarContrasenaError}</span>}
                                </label>

                                {passwordSaved && (
                                    <div className="mi-cuenta-success">Contraseña actualizada.</div>
                                )}

                                <div className="mi-cuenta-actions">
                                    <button
                                        type="button"
                                        className="mi-cuenta-btn ghost"
                                        disabled={passwordSubmitting}
                                        onClick={() => setOpenPanel(null)}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="mi-cuenta-btn primary"
                                        disabled={!canSavePassword}
                                    >
                                        {passwordSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </section>

                {isGuardian && (
                    <section className="info-card mi-cuenta-section mi-cuenta-mfa">
                        <h2 className="mi-cuenta-section-title">Verificación en dos pasos (MFA)</h2>
                        {mfaEnabled ? (
                            <>
                                <p className="mi-cuenta-section-note">MFA activo para tu cuenta.</p>
                                <button
                                    type="button"
                                    className="mi-cuenta-btn primary"
                                    onClick={() => {
                                        setDisableError(null);
                                        setDisableSuccess(null);
                                        setShowMfaDisable(true);
                                    }}
                                >
                                    Desactivar MFA
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="mi-cuenta-section-note">Activa la verificación en dos pasos para proteger tu cuenta.</p>
                                <button
                                    type="button"
                                    className="mi-cuenta-btn primary"
                                    onClick={() => setShowMfaSetup(true)}
                                >
                                    Activar MFA
                                </button>
                            </>
                        )}
                    </section>
                )}


            </div>

            <div className="mi-cuenta-logout">
                <span>{devAuthActive ? 'Modo desarrollo activo.' : '¿Quieres salir de tu cuenta?'}</span>
                {devAuthActive ? (
                    <button type="button" className="mi-cuenta-btn ghost" onClick={handleDevLogout}>
                        Salir del modo desarrollo
                    </button>
                ) : (
                    <button type="button" className="mi-cuenta-btn ghost" onClick={handleLogout} disabled={logoutLoading}>
                        {logoutLoading ? 'Cerrando...' : 'Cerrar sesión'}
                    </button>
                )}
            </div>
            {!devAuthActive && logoutMessage ? (
                <div className={logoutError ? 'mi-cuenta-error' : 'mi-cuenta-success'}>
                    {logoutMessage}
                </div>
            ) : null}

            <Modal isOpen={showMfaSetup} onClose={() => setShowMfaSetup(false)}>
                <div className="mi-cuenta-modal" role="dialog" aria-modal="true" aria-labelledby="mfa-setup-title">
                    <MfaSetupView
                        mode="setup"
                        accessToken={accessToken}
                        username={profile?.username}
                        onComplete={() => {
                            setShowMfaSetup(false);
                            void reloadProfile();
                        }}
                    />
                </div>
            </Modal>

            <Modal isOpen={showMfaDisable} onClose={() => setShowMfaDisable(false)}>
                <div
                    className="mi-cuenta-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mfa-disable-title"
                    aria-describedby="mfa-disable-desc"
                >
                    <h2 className="mi-cuenta-section-title" id="mfa-disable-title">Desactivar MFA</h2>
                    <p className="mi-cuenta-section-note mi-cuenta-modal-note" id="mfa-disable-desc">
                        Esta acción cerrará tu sesión actual. Necesitarás iniciar sesión nuevamente.
                    </p>
                    <p className="mi-cuenta-section-note mi-cuenta-modal-note">
                        Al desactivar MFA, elimina la entrada correspondiente en tu app de autenticación.
                    </p>
                    {disableError ? <div className="mi-cuenta-error">{disableError}</div> : null}
                    {disableSuccess ? <div className="mi-cuenta-success">{disableSuccess}</div> : null}
                    <label className="mi-cuenta-input-group">
                        <span className="mi-cuenta-input-label">Contraseña</span>
                        <input
                            type="password"
                            className="mi-cuenta-input"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                        />
                    </label>

                    <div className="mi-cuenta-segmented">
                        <button
                            type="button"
                            className={`mi-cuenta-segment ${disableMode === 'totp' ? 'is-active' : ''}`}
                            onClick={() => setDisableMode('totp')}
                        >
                            Código TOTP
                        </button>
                        <button
                            type="button"
                            className={`mi-cuenta-segment ${disableMode === 'recovery' ? 'is-active' : ''}`}
                            onClick={() => setDisableMode('recovery')}
                        >
                            Recovery code
                        </button>
                    </div>

                    <label className="mi-cuenta-input-group">
                        <span className="mi-cuenta-input-label">{disableMode === 'totp' ? 'Código TOTP' : 'Recovery code'}</span>
                        <input
                            type="text"
                            className="mi-cuenta-input"
                            value={disableCode}
                            onChange={(e) => setDisableCode(e.target.value)}
                        />
                    </label>

                    <div className="mi-cuenta-actions">
                        <button type="button" className="mi-cuenta-btn ghost" onClick={() => setShowMfaDisable(false)}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="mi-cuenta-btn primary"
                            disabled={disableLoading}
                            onClick={async () => {
                                if (!accessToken) {
                                    setDisableError('Inicia sesión para continuar.');
                                    return;
                                }
                                if (!disablePassword.trim() || !disableCode.trim()) {
                                    setDisableError('Completa los datos requeridos.');
                                    return;
                                }
                                setDisableLoading(true);
                                setDisableError(null);
                                try {
                                    const payload = disableMode === 'totp'
                                        ? { password: disablePassword, code: disableCode }
                                        : { password: disablePassword, recovery_code: disableCode };
                                    await mfaDisable(accessToken, payload);
                                    setDisableSuccess('MFA desactivado. Para evitar confusiones, elimina la entrada correspondiente en tu app de autenticación.');
                                    window.setTimeout(() => {
                                        setShowMfaDisable(false);
                                        clearSession('manual');
                                        navigate('/inicio-sesion', { replace: true, state: { reason: 'unauthenticated' } });
                                    }, 600);
                                } catch (error) {
                                    if (error instanceof ApiError) {
                                        setDisableError('No fue posible desactivar MFA. Verifica los datos.');
                                    } else {
                                        setDisableError('No fue posible desactivar MFA. Intenta nuevamente.');
                                    }
                                } finally {
                                    setDisableLoading(false);
                                }
                            }}
                        >
                            {disableLoading ? 'Procesando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
}

interface VisibilityIconProps {
    isVisible: boolean;
}

function VisibilityIcon({ isVisible }: VisibilityIconProps) {
    return isVisible ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5c4.97 0 9.27 3.03 11 7-1.73 3.97-6.03 7-11 7S2.73 15.97 1 12c1.73-3.97 6.03-7 11-7Zm0 2C8.14 7 4.83 9.46 3.2 12c1.63 2.54 4.94 5 8.8 5s7.17-2.46 8.8-5c-1.63-2.54-4.94-5-8.8-5Zm0 2.5a2.5 2.5 0 1 1-2.5 2.5A2.5 2.5 0 0 1 12 9.5Z" />
        </svg>
    ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4.27 3 16.73 16.73-1.27 1.27-3.06-3.06A11.85 11.85 0 0 1 12 19C7.03 19 2.73 15.97 1 12a12.7 12.7 0 0 1 4.16-4.95L3 4.27 4.27 3Zm7.73 4A5 5 0 0 1 17 12a5 5 0 0 1-.59 2.4l-1.51-1.51A3 3 0 0 0 12 9c-.27 0-.54.04-.79.1L9.68 7.57A4.98 4.98 0 0 1 12 7Zm-7 5a10.46 10.46 0 0 0 2.97 3.2A9.77 9.77 0 0 0 12 17a9.7 9.7 0 0 0 3.32-.6l-1.6-1.6a5 5 0 0 1-5.92-5.92L5 12Z" />
        </svg>
    );
}

function EditIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25Zm14.71-9.04a1 1 0 0 0 0-1.41l-1.5-1.5a1 1 0 0 0-1.41 0l-1.17 1.17 2.75 2.75 1.33-1.01Z" />
        </svg>
    );
}

function ChevronIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7.41 14.59 4.59-4.59 4.59 4.59L18 13.17l-6-6-6 6z" />
        </svg>
    );
}
