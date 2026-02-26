import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './RestablecerContraseña.css';
import { resetPassword, verifyResetToken } from '../../../services/auth/auth.api';
import { ApiError } from '../../../services/api/httpClient';

const passwordRules = [
    {
        id: 'length',
        label: 'Minimo 8 caracteres',
        test: (value: string) => value.length >= 8
    },
    {
        id: 'upper',
        label: 'Al menos una mayuscula',
        test: (value: string) => /[A-Z]/.test(value)
    },
    {
        id: 'lower',
        label: 'Al menos una minuscula',
        test: (value: string) => /[a-z]/.test(value)
    },
    {
        id: 'number',
        label: 'Al menos un numero',
        test: (value: string) => /[0-9]/.test(value)
    },
    {
        id: 'special',
        label: 'Al menos un caracter especial (!@#$...)',
        test: (value: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)
    }
];

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
        if (!password) return 'Ingresa una nueva contrasena.';
        if (allValid) return '';
        return 'La nueva contrasena no cumple los requisitos.';
    }, [allValid, password, submitAttempted]);

    const confirmPasswordError = useMemo(() => {
        if (!submitAttempted && !confirmPassword) return '';
        if (!confirmPassword) return 'Confirma la nueva contrasena.';
        if (password !== confirmPassword) return 'Las contrasenas no coinciden.';
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
                state: { message: 'Acceso invalido: falta el token de restablecimiento.' }
            });
            return;
        }

        let cancelled = false;

        const runVerify = async () => {
            setIsVerifyingToken(true);
            setTokenVerifyError('');
            try {
                const response = await verifyResetToken(token);
                if (cancelled) return;
                if (response.valid) {
                    setIsTokenValid(true);
                    return;
                }
                navigate('/inicio-sesion', {
                    replace: true,
                    state: { message: 'El enlace de restablecimiento es invalido o ha expirado.' }
                });
            } catch (error) {
                if (cancelled) return;
                if (error instanceof ApiError && error.status === 400) {
                    navigate('/inicio-sesion', {
                        replace: true,
                        state: { message: 'El enlace de restablecimiento es invalido o ha expirado.' }
                    });
                    return;
                }
                setTokenVerifyError('No se pudo verificar el enlace de restablecimiento.');
            } finally {
                if (!cancelled) {
                    setIsVerifyingToken(false);
                }
            }
        };

        void runVerify();

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
            setSubmitError('Acceso invalido: falta el token de restablecimiento.');
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
            if (error instanceof ApiError) {
                setSubmitErrorStatus(error.status);
                if (error.status === 400) {
                    setSubmitError('No se pudo actualizar la contrasena. Verifica el enlace e intentalo de nuevo.');
                } else if (error.status === 429) {
                    setSubmitError('Demasiados intentos. Espera un momento e intentalo de nuevo.');
                } else {
                    setSubmitError('Ocurrio un error inesperado. Intenta mas tarde.');
                }
            } else {
                setSubmitError('Ocurrio un error inesperado. Intenta mas tarde.');
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <div className="auth-container restablecer-container">
            <div className="auth-left-panel"></div>

            <div className="auth-right-panel">
                <div className="auth-content">
                    <h1 className="auth-title">Restablecer contrasena</h1>
                    <p className="auth-subtitle">Crea una nueva contrasena para volver a ingresar.</p>

                    {isVerifyingToken ? (
                        <div className="validation-success">Verificando enlace de restablecimiento...</div>
                    ) : null}

                    {tokenVerifyError ? (
                        <div className="validation-error">
                            {tokenVerifyError}
                        </div>
                    ) : null}

                    <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
                        {submitError ? <div className="validation-error">{submitError}</div> : null}

                        <div className="form-group password-group">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Nueva contrasena"
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
                                aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                            >
                                {showPassword ? (
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
                            {newPasswordError ? <div className="validation-error">{newPasswordError}</div> : null}
                        </div>

                        <div className="password-checklist">
                            <span className="password-checklist-title">Requisitos de contrasena</span>
                            <div className="password-checklist-grid">
                                {checks.map((check) => (
                                    <div key={check.id} className={`password-check ${check.valid ? 'is-valid' : 'is-invalid'}`}>
                                        <span className="password-check-indicator" aria-hidden="true">
                                            {check.valid ? '✓' : '•'}
                                        </span>
                                        <span>{check.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-group password-group">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Confirmar nueva contrasena"
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
                                aria-label={showConfirm ? 'Ocultar confirmacion' : 'Mostrar confirmacion'}
                            >
                                {showConfirm ? (
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
                            {confirmPassword.length > 0 ? (
                                <div className={passwordsMatch ? 'validation-success' : 'validation-error'}>
                                    {passwordsMatch ? 'Las contrasenas coinciden.' : 'Las contrasenas no coinciden.'}
                                </div>
                            ) : null}
                            {confirmPasswordError ? <div className="validation-error">{confirmPasswordError}</div> : null}
                        </div>

                        <button type="submit" className="btn-primary" disabled={!canSubmit}>
                            {submitLoading ? 'Actualizando...' : 'Actualizar contrasena'}
                        </button>

                        {submitErrorStatus === 400 ? (
                            <button
                                type="button"
                                className="btn-secondary reset-request-link"
                                onClick={() => {
                                    navigate('/inicio-sesion', {
                                        replace: true,
                                        state: {
                                            message: 'Solicita un nuevo enlace para restablecer tu contrasena.',
                                            openForgot: true
                                        }
                                    });
                                }}
                            >
                                Solicitar nuevo enlace
                            </button>
                        ) : null}

                        <Link to="/inicio-sesion" className="forgot-password-link">
                            Volver a inicio de sesion
                        </Link>
                    </form>
                </div>
            </div>

            {showSuccess ? (
                <div className="reset-modal-overlay" role="dialog" aria-modal="true">
                    <div className="reset-modal-content">
                        <p className="reset-modal-text">Contrasena actualizada.</p>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={() => navigate('/inicio-sesion')}
                        >
                            Iniciar sesion
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
