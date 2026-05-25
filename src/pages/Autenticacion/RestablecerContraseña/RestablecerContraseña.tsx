import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './RestablecerContraseña.css';
import '../../../styles/password-ui.css';
import {
    PasswordChecklist as SharedPasswordChecklist,
    PasswordVisibilityIcon as SharedPasswordVisibilityIcon
} from '../../../components/Auth/PasswordControls';
import { resetPassword, verifyResetToken } from '../../../services/auth/auth.api';
import { ApiError } from '../../../services/api/httpClient';
import { PASSWORD_RULES } from '../../../utils/passwordRules';
import cogniaLogo from '../../../assets/branding/cognia-logo-light.png';

const passwordRules = PASSWORD_RULES;

function redirectToInvalidResetToken(navigate: ReturnType<typeof useNavigate>) {
    navigate('/inicio-sesion', {
        replace: true,
        state: { message: 'El enlace de restablecimiento es inválido o ha expirado.' }
    });
}

function resolveResetSubmitErrorMessage(error: unknown) {
    if (error instanceof ApiError && error.status === 400) {
        return {
            status: 400,
            message: 'No se pudo actualizar la contraseña. Verifica el enlace e inténtalo de nuevo.'
        };
    }
    if (error instanceof ApiError && error.status === 429) {
        return {
            status: 429,
            message: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
        };
    }
    if (error instanceof ApiError) {
        return {
            status: error.status,
            message: 'Ocurrió un error inesperado. Intenta más tarde.'
        };
    }

    return {
        status: null,
        message: 'Ocurrió un error inesperado. Intenta más tarde.'
    };
}

export default function RestablecerContraseña() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token')?.trim() ?? '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitErrorStatus, setSubmitErrorStatus] = useState<number | null>(null);

    const [isVerifyingToken, setIsVerifyingToken] = useState(true);
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [tokenVerifyError, setTokenVerifyError] = useState('');

    const checks = useMemo(() => (
        passwordRules.map(rule => ({
            id: rule.id,
            label: rule.label,
            valid: rule.test(password)
        }))
    ), [password]);

    const allValid = checks.every(check => check.valid);
    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

    const newPasswordError = useMemo(() => {
        if (!submitAttempted && !password) return '';
        if (!password) return 'Ingresa una nueva contraseña.';
        if (allValid) return '';
        return 'La nueva contraseña no cumple los requisitos.';
    }, [allValid, password, submitAttempted]);

    const confirmPasswordError = useMemo(() => {
        if (!submitAttempted && !confirmPassword) return '';
        if (!confirmPassword) return 'Confirma la nueva contraseña.';
        if (password !== confirmPassword) return 'Las contraseñas no coinciden.';
        return '';
    }, [confirmPassword, password, submitAttempted]);

    const canSubmit =
        isTokenValid &&
        !isVerifyingToken &&
        !submitLoading &&
        !!password &&
        !!confirmPassword &&
        allValid &&
        password === confirmPassword;

    useEffect(() => {
        if (!token) {
            navigate('/inicio-sesion', {
                replace: true,
                state: { message: 'Acceso inválido: falta el token de restablecimiento.' }
            });
            return;
        }

        let cancelled = false;

        const runVerify = async () => {
            if (import.meta.env.DEV) {
                console.debug('[auth] reset-password:verify-token:start');
            }
            setIsVerifyingToken(true);
            setTokenVerifyError('');
            try {
                const response = await verifyResetToken(token);
                if (cancelled) return;
                if (response.valid) {
                    if (import.meta.env.DEV) {
                        console.debug('[auth] reset-password:verify-token:ok');
                    }
                    setIsTokenValid(true);
                    return;
                }
                redirectToInvalidResetToken(navigate);
            } catch (error) {
                if (import.meta.env.DEV) {
                    const status = error instanceof ApiError ? error.status : undefined;
                    console.debug('[auth] reset-password:verify-token:error', { status });
                }
                if (cancelled) return;
                if (error instanceof ApiError && error.status === 400) {
                    redirectToInvalidResetToken(navigate);
                    return;
                }
                setTokenVerifyError('No se pudo verificar el enlace de restablecimiento.');
            } finally {
                if (!cancelled) {
                    setIsVerifyingToken(false);
                }
            }
        };

        runVerify().catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [navigate, token]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitAttempted(true);
        setSubmitError('');
        setSubmitErrorStatus(null);

        if (!token) {
            setSubmitError('Acceso inválido: falta el token de restablecimiento.');
            return;
        }

        if (!canSubmit) return;

        setSubmitLoading(true);
        try {
            await resetPassword({
                token,
                newPassword: password,
                confirmNewPassword: confirmPassword
            });
            setShowSuccess(true);
            setPassword('');
            setConfirmPassword('');
            setSubmitAttempted(false);
            setSubmitError('');
            setSubmitErrorStatus(null);
        } catch (error) {
            const submitFailure = resolveResetSubmitErrorMessage(error);
            setSubmitErrorStatus(submitFailure.status);
            setSubmitError(submitFailure.message);
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <div className="auth-container restablecer-container">
            <div className="auth-left-panel"></div>

            <div className="auth-right-panel">
                <div className="auth-content">
                    <div className="header-brand">
                        <Link to="/" className="brand-link">
                            <img className="auth-brand-logo" src={cogniaLogo} alt="CognIA" />
                            <span className="brand-text">cognIA</span>
                        </Link>
                    </div>

                    <h1 className="auth-title">Restablecer contraseña</h1>
                    <p className="auth-subtitle">Crea una nueva contraseña para volver a ingresar.</p>

                    {isVerifyingToken ? (
                        <div className="validation-success">Verificando enlace de restablecimiento...</div>
                    ) : null}

                    {tokenVerifyError ? (
                        <div className="validation-error">
                            {tokenVerifyError}
                        </div>
                    ) : null}

                    <form className="auth-form" onSubmit={(event) => { handleSubmit(event).catch(() => undefined); }}>
                        {submitError ? <div className="validation-error">{submitError}</div> : null}

                        <div className="form-group password-group">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Nueva contraseña"
                                value={password}
                                disabled={submitLoading || isVerifyingToken || !isTokenValid}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    setSubmitError('');
                                    setSubmitErrorStatus(null);
                                }}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword((prev) => !prev)}
                                disabled={submitLoading || isVerifyingToken || !isTokenValid}
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                <SharedPasswordVisibilityIcon visible={showPassword} />
                            </button>
                            {newPasswordError ? <div className="validation-error">{newPasswordError}</div> : null}
                        </div>

                        <SharedPasswordChecklist checks={checks} title="Requisitos de contraseña" />

                        <div className="form-group password-group">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Confirmar nueva contraseña"
                                value={confirmPassword}
                                disabled={submitLoading || isVerifyingToken || !isTokenValid}
                                onChange={(event) => {
                                    setConfirmPassword(event.target.value);
                                    setSubmitError('');
                                    setSubmitErrorStatus(null);
                                }}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirm((prev) => !prev)}
                                disabled={submitLoading || isVerifyingToken || !isTokenValid}
                                aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                            >
                                <SharedPasswordVisibilityIcon visible={showConfirm} />
                            </button>
                            {confirmPassword.length > 0 ? (
                                <div className={passwordsMatch ? 'validation-success' : 'validation-error'}>
                                    {passwordsMatch ? 'Las contraseñas coinciden.' : 'Las contraseñas no coinciden.'}
                                </div>
                            ) : null}
                            {confirmPasswordError ? <div className="validation-error">{confirmPasswordError}</div> : null}
                        </div>

                        <button type="submit" className="btn-primary" disabled={!canSubmit}>
                            {submitLoading ? 'Actualizando...' : 'Actualizar contraseña'}
                        </button>

                        {submitErrorStatus === 400 ? (
                            <button
                                type="button"
                                className="btn-secondary reset-request-link"
                                onClick={() => {
                                    navigate('/inicio-sesion', {
                                        replace: true,
                                        state: {
                                            message: 'Solicita un nuevo enlace para restablecer tu contraseña.',
                                            openForgot: true
                                        }
                                    });
                                }}
                            >
                                Solicitar nuevo enlace
                            </button>
                        ) : null}

                        <Link to="/inicio-sesion" className="forgot-password-link">
                            Volver a inicio de sesión
                        </Link>
                    </form>
                </div>
            </div>

            {showSuccess ? (
                <dialog className="reset-modal-overlay" open aria-modal="true">
                    <div className="reset-modal-content">
                        <p className="reset-modal-text">Contraseña actualizada.</p>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={() => navigate('/inicio-sesion')}
                        >
                            Iniciar sesión
                        </button>
                    </div>
                </dialog>
            ) : null}
        </div>
    );
}
