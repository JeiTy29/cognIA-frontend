import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './MFA.css';
import { loginMfa } from '../../../services/auth/auth.api';
import { ApiError } from '../../../services/api/httpClient';
import { useAuth } from '../../../hooks/auth/useAuth';
import { decodeJwtPayload } from '../../../utils/auth/jwt';
import { getDefaultRouteForRoles } from '../../../utils/auth/roles';
import { MfaSetupView } from '../../../components/MFA/MfaSetupView';

type MFAMode = 'setup' | 'challenge';

type MFANavigationState = {
    mode?: MFAMode;
    challengeId?: string;
    enrollmentToken?: string;
    username?: string;
    expiresIn?: number;
};

const MFA_CODE_LENGTH = 6;
const MFA_DIGIT_KEYS = Array.from({ length: MFA_CODE_LENGTH }, (_, index) => `mfa-digit-${index + 1}`);

export default function MFA() {
    const [codeDigits, setCodeDigits] = useState<string[]>(() => Array.from({ length: MFA_CODE_LENGTH }, () => ''));
    const [recoveryCode, setRecoveryCode] = useState('');
    const [useRecovery, setUseRecovery] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
    const location = useLocation();
    const { setSession } = useAuth();
    const state = location.state as MFANavigationState | null;
    const mode: MFAMode = useMemo(() => {
        if (state?.mode) return state.mode;
        return 'challenge';
    }, [state]);
    const challengeId = state?.challengeId;
    const enrollmentToken = state?.enrollmentToken;
    const username = state?.username;
    const navigate = useNavigate();
    const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
    const recoveryInputRef = useRef<HTMLInputElement | null>(null);
    const code = useMemo(() => codeDigits.join(''), [codeDigits]);

    useEffect(() => {
        if (!state?.mode) {
            navigate('/inicio-sesion', { replace: true, state: { reason: 'unauthenticated' } });
            return;
        }
        if (mode === 'challenge' && !challengeId) {
            navigate('/inicio-sesion', { replace: true, state: { reason: 'unauthenticated' } });
            return;
        }
        if (mode === 'setup' && !enrollmentToken) {
            navigate('/inicio-sesion', { replace: true, state: { reason: 'unauthenticated' } });
        }
    }, [mode, challengeId, enrollmentToken, navigate, state]);

    useEffect(() => {
        if (mode !== 'challenge') return;
        if (useRecovery) {
            recoveryInputRef.current?.focus();
            return;
        }
        const firstEmpty = codeDigits.findIndex((digit) => digit.length === 0);
        const focusIndex = firstEmpty >= 0 ? firstEmpty : MFA_CODE_LENGTH - 1;
        digitRefs.current[focusIndex]?.focus();
    }, [codeDigits, mode, useRecovery]);

    const setDigit = (index: number, value: string) => {
        setCodeDigits((previous) => {
            const next = [...previous];
            next[index] = value;
            return next;
        });
    };

    const applyPastedCode = (pastedValue: string) => {
        const onlyDigits = pastedValue.replaceAll(/\D/g, '').slice(0, MFA_CODE_LENGTH);
        if (!onlyDigits) return;
        const nextDigits = Array.from({ length: MFA_CODE_LENGTH }, (_, index) => onlyDigits[index] ?? '');
        setCodeDigits(nextDigits);
        digitRefs.current[Math.min(onlyDigits.length, MFA_CODE_LENGTH - 1)]?.focus();
    };

    const handleDigitChange = (index: number, value: string) => {
        const onlyDigits = value.replaceAll(/\D/g, '');
        if (!onlyDigits) {
            setDigit(index, '');
            return;
        }

        if (onlyDigits.length > 1) {
            applyPastedCode(onlyDigits);
            return;
        }

        setDigit(index, onlyDigits);
        if (index < MFA_CODE_LENGTH - 1) {
            digitRefs.current[index + 1]?.focus();
        }
    };

    const handleDigitKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace') {
            if (codeDigits[index]) {
                setDigit(index, '');
                return;
            }
            if (index > 0) {
                event.preventDefault();
                digitRefs.current[index - 1]?.focus();
                setDigit(index - 1, '');
            }
            return;
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            digitRefs.current[index - 1]?.focus();
            return;
        }

        if (event.key === 'ArrowRight' && index < MFA_CODE_LENGTH - 1) {
            event.preventDefault();
            digitRefs.current[index + 1]?.focus();
        }
    };

    const handleDigitPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        applyPastedCode(event.clipboardData.getData('text'));
    };

    const handleVerify = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(null);
        setSubmitting(true);

        if (!challengeId) {
            setSubmitting(false);
            return;
        }
        if (useRecovery) {
            if (!recoveryCode.trim()) {
                setSubmitError('Ingresa el codigo de recuperacion.');
                setSubmitting(false);
                return;
            }
        } else if (code.length !== MFA_CODE_LENGTH) {
            setSubmitError('Ingresa un codigo de 6 digitos.');
            setSubmitting(false);
            return;
        }

        try {
            const payload = useRecovery
                ? { challenge_id: challengeId, recovery_code: recoveryCode }
                : { challenge_id: challengeId, code };
            const response = await loginMfa(payload);
            setSession(response.access_token, response.expires_in);
            const jwtPayload = decodeJwtPayload(response.access_token);
            navigate(getDefaultRouteForRoles(jwtPayload?.roles), { replace: true });
        } catch (error) {
            if (error instanceof ApiError && error.status === 403) {
                setSubmitError('Debes configurar MFA antes de verificar. Inicia sesion nuevamente.');
            } else {
                setSubmitError('El codigo ingresado no es valido. Intenta nuevamente.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={`auth-container auth-2fa auth-mfa auth-mfa-${mode}`}>
            <div className="auth-left-panel"></div>

            <div className="auth-right-panel">
                <div className="auth-content">
                    <div className="header-brand">
                        <Link to="/" className="brand-link">
                            <div className="brand-icon">c</div>
                            <span className="brand-text">cognIA</span>
                        </Link>
                    </div>

                    <h1 className="auth-title">
                        {mode === 'setup' ? 'Configurar verificacion en dos pasos' : 'Verificacion requerida'}
                    </h1>

                    {mode === 'setup' ? (
                        <MfaSetupView
                            mode="enrollment"
                            enrollmentToken={enrollmentToken}
                            username={username}
                            onComplete={() => {
                                navigate('/inicio-sesion', { replace: true, state: { mfaConfigured: true } });
                            }}
                        />
                    ) : (
                        <>
                            <p className="auth-subtitle">
                                Abre tu aplicacion de autenticacion y escribe el codigo de 6 digitos que se muestra alli.
                            </p>
                            <form className="auth-form" onSubmit={handleVerify}>
                                {submitError ? <div className="validation-error">{submitError}</div> : null}
                                {submitSuccess ? <div className="validation-success">{submitSuccess}</div> : null}

                                {!useRecovery ? (
                                    <div className="form-group">
                                        <fieldset className="mfa-code-fieldset">
                                            <legend className="mfa-code-legend">Codigo MFA de 6 digitos</legend>
                                            <div className="mfa-code-grid">
                                                {codeDigits.map((digit, index) => (
                                                    <input
                                                        key={MFA_DIGIT_KEYS[index]}
                                                        ref={(element) => {
                                                            digitRefs.current[index] = element;
                                                        }}
                                                        type="text"
                                                        className="mfa-code-digit"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                                        maxLength={1}
                                                        value={digit}
                                                        onChange={(event) => handleDigitChange(index, event.target.value)}
                                                        onKeyDown={(event) => handleDigitKeyDown(index, event)}
                                                        onPaste={handleDigitPaste}
                                                        aria-label={`Digito ${index + 1} de 6`}
                                                        required
                                                    />
                                                ))}
                                            </div>
                                        </fieldset>
                                    </div>
                                ) : null}

                                <div className="form-group">
                                    <div className="mfa-mode-toggle" role="tablist" aria-label="Modo de verificacion MFA">
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={!useRecovery}
                                            className={`mfa-mode-toggle-btn ${!useRecovery ? 'is-active' : ''}`}
                                            onClick={() => setUseRecovery(false)}
                                        >
                                            Codigo TOTP
                                        </button>
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={useRecovery}
                                            className={`mfa-mode-toggle-btn ${useRecovery ? 'is-active' : ''}`}
                                            onClick={() => setUseRecovery(true)}
                                        >
                                            Codigo de recuperacion
                                        </button>
                                    </div>
                                    {useRecovery ? (
                                        <input
                                            ref={recoveryInputRef}
                                            type="text"
                                            className="form-input"
                                            placeholder="Codigo de recuperacion"
                                            value={recoveryCode}
                                            onChange={(event) => setRecoveryCode(event.target.value.trim())}
                                            required
                                        />
                                    ) : null}
                                </div>

                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? 'Verificando...' : 'Verificar'}
                                </button>
                            </form>
                        </>
                    )}

                    {mode === 'setup' ? (
                        <p className="auth-mfa-note">
                            Si no puedes escanear el QR, utiliza la app para ingresar manualmente el codigo.
                        </p>
                    ) : null}

                    <div className="version-footer">
                        cognIA v1.0.0
                    </div>
                </div>
            </div>
        </div>
    );
}
