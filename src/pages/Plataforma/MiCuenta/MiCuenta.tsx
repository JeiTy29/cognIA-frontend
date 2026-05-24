import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { validatePassword } from '../../../utils/passwordValidation';
import { PASSWORD_RULES } from '../../../utils/passwordRules';
import './MiCuenta.css';
import '../../../styles/password-ui.css';
import { changePassword, mfaDisable } from '../../../services/auth/auth.api';
import { updateMyProfile } from '../../../services/auth/auth.api';
import { useAuth } from '../../../hooks/auth/useAuth';
import { getAccountTypeLabel, isAdminProfile, isGuardianProfile, isPsychologistProfile } from '../../../utils/auth/profileMapper';
import { Modal } from '../../../components/Modal/Modal';
import { MfaSetupView } from '../../../components/MFA/MfaSetupView';
import { ApiError } from '../../../services/api/httpClient';
import { ColombiaLocationSelect } from '../../../components/Location/ColombiaLocationSelect';
import '../../../components/Location/ColombiaLocationSelect.css';

const passwordRules = PASSWORD_RULES;

function buildMfaDisablePayload(disableMode: 'totp' | 'recovery', disablePassword: string, disableCode: string) {
    if (disableMode === 'totp') {
        return { password: disablePassword, code: disableCode };
    }
    return { password: disablePassword, recovery_code: disableCode };
}

type PasswordSubmitFailure =
    | { type: 'highlight'; message: string }
    | { type: 'redirect' }
    | { type: 'message'; message: string };

function resolvePasswordSubmitFailure(error: unknown): PasswordSubmitFailure {
    if (error instanceof ApiError && error.status === 400) {
        return {
            type: 'highlight',
            message: 'Datos inválidos. Verifica la contraseña actual y la nueva contraseña.'
        };
    }
    if (error instanceof ApiError && error.status === 401) {
        return { type: 'redirect' };
    }
    if (error instanceof ApiError && error.status === 403) {
        return { type: 'message', message: 'No tienes permisos para realizar esta acción.' };
    }
    if (error instanceof ApiError && error.status === 429) {
        return { type: 'message', message: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.' };
    }
    return { type: 'message', message: 'Ocurrió un error inesperado. Intenta más tarde.' };
}

type MfaSectionContentProps = Readonly<{
    mfaMandatoryProfile: boolean;
    mfaEnabled: boolean;
    canDisableMfa: boolean;
    onEnableMfa: () => void;
    onDisableMfa: () => void;
}>;

function MfaSectionContent({
    mfaMandatoryProfile,
    mfaEnabled,
    canDisableMfa,
    onEnableMfa,
    onDisableMfa
}: MfaSectionContentProps) {
    if (mfaMandatoryProfile) {
        return (
            <div className="mi-cuenta-mfa-required">
                <span className="mi-cuenta-badge-required">Obligatorio</span>
                <p className="mi-cuenta-section-note">
                    Para este perfil, la verificación en dos pasos debe permanecer activa.
                </p>
                {mfaEnabled ? (
                    <p className="mi-cuenta-section-note">MFA activo para tu cuenta.</p>
                ) : (
                    <>
                        <p className="mi-cuenta-section-note">Configura MFA para continuar con la protección obligatoria.</p>
                        <button
                            type="button"
                            className="mi-cuenta-btn primary"
                            onClick={onEnableMfa}
                        >
                            Activar MFA
                        </button>
                    </>
                )}
            </div>
        );
    }

    if (mfaEnabled) {
        return (
            <>
                <p className="mi-cuenta-section-note">MFA activo para tu cuenta.</p>
                {canDisableMfa ? (
                    <button
                        type="button"
                        className="mi-cuenta-btn primary"
                        onClick={onDisableMfa}
                    >
                        Desactivar MFA
                    </button>
                ) : null}
            </>
        );
    }

    return (
        <>
            <p className="mi-cuenta-section-note">Activa la verificación en dos pasos para proteger tu cuenta.</p>
            <button
                type="button"
                className="mi-cuenta-btn primary"
                onClick={onEnableMfa}
            >
                Activar MFA
            </button>
        </>
    );
}

type RunDisableMfaFlowArgs = Readonly<{
    accessToken: string | null;
    disableMode: 'totp' | 'recovery';
    disablePassword: string;
    disableCode: string;
    logoutSessionAsync: (reason: 'manual' | 'expired') => Promise<void>;
    navigate: ReturnType<typeof useNavigate>;
    setDisableLoading: (value: boolean) => void;
    setDisableError: (value: string | null) => void;
    setDisableSuccess: (value: string | null) => void;
    setShowMfaDisable: (value: boolean) => void;
}>;

async function runDisableMfaFlow({
    accessToken,
    disableMode,
    disablePassword,
    disableCode,
    logoutSessionAsync,
    navigate,
    setDisableLoading,
    setDisableError,
    setDisableSuccess,
    setShowMfaDisable
}: RunDisableMfaFlowArgs) {
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
        const payload = buildMfaDisablePayload(disableMode, disablePassword, disableCode);
        await mfaDisable(accessToken, payload);
        setDisableSuccess('MFA desactivado. Para evitar confusiones, elimina la entrada correspondiente en tu app de autenticación.');
        globalThis.setTimeout(() => {
            setShowMfaDisable(false);
            void logoutSessionAsync('manual').finally(() => {
                navigate('/inicio-sesion', { replace: true, state: { reason: 'unauthenticated' } });
            });
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
}

type PasswordVisibilityInputFieldProps = Readonly<{
    label: string;
    value: string;
    isVisible: boolean;
    disabled: boolean;
    inputClassName?: string;
    ariaLabelWhenVisible: string;
    ariaLabelWhenHidden: string;
    errorMessage?: string;
    secondaryErrorMessage?: string;
    onChange: (value: string) => void;
    onToggleVisibility: () => void;
}>;

function PasswordVisibilityInputField({
    label,
    value,
    isVisible,
    disabled,
    inputClassName = 'mi-cuenta-input',
    ariaLabelWhenVisible,
    ariaLabelWhenHidden,
    errorMessage,
    secondaryErrorMessage,
    onChange,
    onToggleVisibility
}: PasswordVisibilityInputFieldProps) {
    return (
        <label className="mi-cuenta-input-group">
            <span className="mi-cuenta-input-label">{label}</span>
            <div className="mi-cuenta-input-wrapper">
                <input
                    className={inputClassName}
                    type={isVisible ? 'text' : 'password'}
                    value={value}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.value)}
                />
                <button
                    type="button"
                    className="mi-cuenta-toggle-visibility"
                    disabled={disabled}
                    onClick={onToggleVisibility}
                    aria-label={isVisible ? ariaLabelWhenVisible : ariaLabelWhenHidden}
                >
                    <VisibilityIcon isVisible={isVisible} />
                </button>
            </div>
            {errorMessage ? <span className="mi-cuenta-error">{errorMessage}</span> : null}
            {secondaryErrorMessage ? <span className="mi-cuenta-error">{secondaryErrorMessage}</span> : null}
        </label>
    );
}

export default function MiCuenta() {
    const navigate = useNavigate();
    const { logout: logoutSession, logoutAsync, profile, profileStatus, profileErrorStatus, devAuthActive, devLogout, accessToken, reloadProfile, isAuthenticated } = useAuth();
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
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
    const [profileSaveNotice, setProfileSaveNotice] = useState<string | null>(null);
    const [profileForm, setProfileForm] = useState({
        fullName: '',
        username: '',
        email: '',
        department: '',
        city: ''
    });
    const passwordChecks = useMemo(() => (
        passwordRules.map(rule => ({
            id: rule.id,
            label: rule.label,
            valid: rule.test(nuevaContrasena)
        }))
    ), [nuevaContrasena]);

    const isPsychologist = isPsychologistProfile(profile);
    const isGuardian = isGuardianProfile(profile);
    const isAdmin = isAdminProfile(profile);
    const mfaMandatoryProfile = isAdmin || isPsychologist;
    const canDisableMfa = isGuardian && !mfaMandatoryProfile;
    const tipoCuenta = getAccountTypeLabel(profile);
    const correo = profile?.email ?? '—';
    const username = profile?.username ?? '—';
    const nombreCompleto = profile?.full_name ?? '—';
    const tarjetaProfesional = profile?.professional_card_number ?? '—';
    const departamento = profile?.department ?? profile?.professional_department ?? '—';
    const ciudad = profile?.city ?? profile?.professional_city ?? profile?.professional_location ?? '—';
    const mfaEnabled = profile?.mfa_enabled ?? false;
    const openMfaDisableModal = () => {
        setDisableError(null);
        setDisableSuccess(null);
        setShowMfaDisable(true);
    };

    useEffect(() => {
        if (profileStatus === 'error' && profileErrorStatus === 401) {
            logoutSession('manual');
            navigate('/inicio-sesion', { replace: true, state: { reason: 'unauthenticated' } });
        }
    }, [profileStatus, profileErrorStatus, logoutSession, navigate]);

    useEffect(() => {
        if (isEditingProfile) return;
        setProfileForm({
            fullName: profile?.full_name ?? '',
            username: profile?.username ?? '',
            email: profile?.email ?? '',
            department: profile?.department ?? profile?.professional_department ?? '',
            city: profile?.city ?? profile?.professional_city ?? ''
        });
    }, [isEditingProfile, profile]);

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

    useEffect(() => {
        if (mfaMandatoryProfile && showMfaDisable) {
            setShowMfaDisable(false);
        }
    }, [mfaMandatoryProfile, showMfaDisable]);

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

    const handlePasswordSubmit = async (event: FormEvent) => {
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
        try {
            await changePassword({
                currentPassword: contrasenaActual,
                newPassword: nuevaContrasena,
                confirmNewPassword: confirmarNueva
            });
            setPasswordSaved(true);
            setContrasenaActual('');
            setNuevaContrasena('');
            setConfirmarNueva('');
            setPasswordSubmitAttempted(false);
            setMostrarActual(false);
            setMostrarNueva(false);
            setMostrarConfirmar(false);
        } catch (error) {
            const submitFailure = resolvePasswordSubmitFailure(error);
            if (submitFailure.type === 'redirect') {
                logoutSession('expired');
                navigate('/inicio-sesion', {
                    replace: true,
                    state: { message: 'Sesión expirada o no autenticado. Inicia sesión nuevamente.' }
                });
                return;
            }

            if (submitFailure.type === 'highlight') {
                setHighlightCurrentPassword(true);
            }
            setPasswordGeneralError(submitFailure.message);
        } finally {
            setPasswordSubmitting(false);
        }
    };

    const handleLogout = async () => {
        setLogoutLoading(true);
        setLogoutMessage(null);
        setLogoutError(false);
        try {
            await logoutAsync('manual');
            setLogoutMessage('Sesión cerrada.');
        } catch {
            setLogoutMessage('No fue posible cerrar sesión. Inicia sesión de nuevo.');
            setLogoutError(true);
        } finally {
            setLogoutLoading(false);
            navigate('/inicio-sesion', { replace: true, state: { reason: 'unauthenticated' } });
        }
    };

    const handleDevLogout = () => {
        devLogout();
        navigate('/inicio-sesion', { replace: true });
    };

    const handleDisableMfaConfirm = () => {
        runDisableMfaFlow({
            accessToken,
            disableMode,
            disablePassword,
            disableCode,
            logoutSessionAsync: logoutAsync,
            navigate,
            setDisableLoading,
            setDisableError,
            setDisableSuccess,
            setShowMfaDisable
        }).catch(() => undefined);
    };

    const handleProfileSave = async (event: FormEvent) => {
        event.preventDefault();
        const fullName = profileForm.fullName.trim();
        const nextUsername = profileForm.username.trim();
        const nextEmail = profileForm.email.trim();
        const nextDepartment = profileForm.department.trim();
        const nextCity = profileForm.city.trim();

        if (!fullName || !nextUsername || !nextEmail) {
            setProfileSaveError('Completa nombre, usuario y correo para continuar.');
            return;
        }
        if (!nextDepartment) {
            setProfileSaveError('Selecciona un departamento.');
            return;
        }
        if (!nextCity) {
            setProfileSaveError('Selecciona una ciudad.');
            return;
        }

        setProfileSaving(true);
        setProfileSaveError(null);
        setProfileSaveNotice(null);
        try {
            await updateMyProfile({
                full_name: fullName,
                username: nextUsername,
                email: nextEmail,
                department: nextDepartment,
                city: nextCity
            });
            await reloadProfile();
            setIsEditingProfile(false);
            setProfileSaveNotice('Tu perfil se actualizó correctamente.');
        } catch (error) {
            if (error instanceof ApiError) {
                const payload = typeof error.payload === 'object' && error.payload ? error.payload as Record<string, unknown> : null;
                const errorCode = typeof payload?.error === 'string' ? payload.error : '';
                const message = typeof payload?.msg === 'string' ? payload.msg : '';
                if (errorCode === 'profile_update_validation_error') {
                    setProfileSaveError('Revisa los datos ingresados.');
                } else if (errorCode === 'profile_update_failed') {
                    setProfileSaveError('No fue posible actualizar tu perfil.');
                } else if (/username|usuario/i.test(message)) {
                    setProfileSaveError('Este nombre de usuario ya está en uso.');
                } else if (/email|correo/i.test(message)) {
                    setProfileSaveError('Este correo ya está registrado.');
                } else if (error.status === 409) {
                    setProfileSaveError('El nombre de usuario o correo ya está registrado.');
                } else {
                    setProfileSaveError('No fue posible actualizar tu perfil.');
                }
            } else {
                setProfileSaveError('No fue posible actualizar tu perfil.');
            }
        } finally {
            setProfileSaving(false);
        }
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
                        <span className="mi-cuenta-label">Nombre completo</span>
                        <span className="mi-cuenta-value">{nombreCompleto}</span>
                    </div>
                    <div className="mi-cuenta-field">
                        <span className="mi-cuenta-label">Tipo de cuenta</span>
                        <span className="mi-cuenta-value">{tipoCuenta}</span>
                    </div>
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
                    <div className="mi-cuenta-field">
                        <span className="mi-cuenta-label">Departamento</span>
                        <span className="mi-cuenta-value">{departamento}</span>
                    </div>
                    <div className="mi-cuenta-field">
                        <span className="mi-cuenta-label">Ciudad</span>
                        <span className="mi-cuenta-value">{ciudad}</span>
                    </div>
                    {profileSaveNotice ? <div className="mi-cuenta-success">{profileSaveNotice}</div> : null}
                    <div className="mi-cuenta-actions mi-cuenta-profile-actions">
                        <button
                            type="button"
                            className="mi-cuenta-btn ghost"
                            onClick={() => {
                                setProfileSaveError(null);
                                setProfileSaveNotice(null);
                                setIsEditingProfile((prev) => !prev);
                            }}
                        >
                            {isEditingProfile ? 'Cerrar edición' : 'Editar perfil'}
                        </button>
                    </div>
                    {isEditingProfile ? (
                        <form className="mi-cuenta-form mi-cuenta-profile-form" onSubmit={handleProfileSave}>
                            <label className="mi-cuenta-input-group">
                                <span className="mi-cuenta-input-label">Nombre completo</span>
                                <input
                                    className="mi-cuenta-input"
                                    value={profileForm.fullName}
                                    disabled={profileSaving}
                                    onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                                />
                            </label>
                            <label className="mi-cuenta-input-group">
                                <span className="mi-cuenta-input-label">Nombre de usuario</span>
                                <input
                                    className="mi-cuenta-input"
                                    value={profileForm.username}
                                    disabled={profileSaving}
                                    onChange={(event) => setProfileForm((prev) => ({ ...prev, username: event.target.value }))}
                                />
                            </label>
                            <label className="mi-cuenta-input-group">
                                <span className="mi-cuenta-input-label">Correo</span>
                                <input
                                    className="mi-cuenta-input"
                                    type="email"
                                    value={profileForm.email}
                                    disabled={profileSaving}
                                    onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                                />
                            </label>
                            <ColombiaLocationSelect
                                value={{ department: profileForm.department, city: profileForm.city }}
                                onChange={(nextValue) => setProfileForm((prev) => ({
                                    ...prev,
                                    department: nextValue.department,
                                    city: nextValue.city
                                }))}
                                disabled={profileSaving}
                                required
                            />
                            {profileSaveError ? <div className="mi-cuenta-error">{profileSaveError}</div> : null}
                            <div className="mi-cuenta-actions">
                                <button
                                    type="button"
                                    className="mi-cuenta-btn ghost"
                                    disabled={profileSaving}
                                    onClick={() => {
                                        setIsEditingProfile(false);
                                        setProfileSaveError(null);
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="mi-cuenta-btn primary" disabled={profileSaving}>
                                    {profileSaving ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </div>
                        </form>
                    ) : null}
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
                                <PasswordVisibilityInputField
                                    label="Contraseña actual"
                                    value={contrasenaActual}
                                    isVisible={mostrarActual}
                                    disabled={passwordSubmitting}
                                    inputClassName={`mi-cuenta-input ${highlightCurrentPassword ? 'is-invalid' : ''}`}
                                    ariaLabelWhenVisible="Ocultar contraseña actual"
                                    ariaLabelWhenHidden="Mostrar contraseña actual"
                                    errorMessage={contrasenaActualError}
                                    secondaryErrorMessage={highlightCurrentPassword ? 'Revisa la contraseña actual antes de intentar nuevamente.' : ''}
                                    onChange={(value) => {
                                        setContrasenaActual(value);
                                        setPasswordSaved(false);
                                        setPasswordGeneralError('');
                                        setHighlightCurrentPassword(false);
                                    }}
                                    onToggleVisibility={() => setMostrarActual((prev) => !prev)}
                                />
                                <PasswordVisibilityInputField
                                    label="Nueva contraseña"
                                    value={nuevaContrasena}
                                    isVisible={mostrarNueva}
                                    disabled={passwordSubmitting}
                                    ariaLabelWhenVisible="Ocultar nueva contraseña"
                                    ariaLabelWhenHidden="Mostrar nueva contraseña"
                                    errorMessage={nuevaContrasenaError}
                                    onChange={(value) => {
                                        setNuevaContrasena(value);
                                        setPasswordSaved(false);
                                        setPasswordGeneralError('');
                                    }}
                                    onToggleVisibility={() => setMostrarNueva((prev) => !prev)}
                                />
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
                                <PasswordVisibilityInputField
                                    label="Confirmar nueva contraseña"
                                    value={confirmarNueva}
                                    isVisible={mostrarConfirmar}
                                    disabled={passwordSubmitting}
                                    ariaLabelWhenVisible="Ocultar confirmación de contraseña"
                                    ariaLabelWhenHidden="Mostrar confirmación de contraseña"
                                    errorMessage={confirmarContrasenaError}
                                    onChange={(value) => {
                                        setConfirmarNueva(value);
                                        setPasswordSaved(false);
                                        setPasswordGeneralError('');
                                    }}
                                    onToggleVisibility={() => setMostrarConfirmar((prev) => !prev)}
                                />

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

                {(isGuardian || isPsychologist || isAdmin) && (
                    <section className="info-card mi-cuenta-section mi-cuenta-mfa">
                        <h2 className="mi-cuenta-section-title">Verificación en dos pasos (MFA)</h2>
                        <MfaSectionContent
                            mfaMandatoryProfile={mfaMandatoryProfile}
                            mfaEnabled={mfaEnabled}
                            canDisableMfa={canDisableMfa}
                            onEnableMfa={() => setShowMfaSetup(true)}
                            onDisableMfa={openMfaDisableModal}
                        />
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
                <div className="mi-cuenta-modal" aria-labelledby="mfa-setup-title">
                    <MfaSetupView
                        mode="setup"
                        accessToken={accessToken}
                        username={profile?.username}
                        onComplete={() => {
                            setShowMfaSetup(false);
                            reloadProfile().catch(() => undefined);
                        }}
                    />
                </div>
            </Modal>

            <Modal isOpen={showMfaDisable} onClose={() => setShowMfaDisable(false)}>
                <div
                    className="mi-cuenta-modal"
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
                            onClick={handleDisableMfaConfirm}
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

function VisibilityIcon({ isVisible }: Readonly<VisibilityIconProps>) {
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
