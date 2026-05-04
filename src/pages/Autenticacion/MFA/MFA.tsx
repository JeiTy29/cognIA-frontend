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

type InputRefList = { current: Array<HTMLInputElement | null> };
type InputRef = { current: HTMLInputElement | null };

function resolveMfaMode(state: MFANavigationState | null): MFAMode {
    return state?.mode ?? 'challenge';
}

const MFA_CODE_LENGTH = 6;
const MFA_DIGIT_KEYS = Array.from({ length: MFA_CODE_LENGTH }, (_, index) => `mfa-digit-${index + 1}`);

function requiresLoginRedirect(
    state: MFANavigationState | null,
    mode: MFAMode,
    challengeId: string | undefined,
    enrollmentToken: string | undefined
) {
    if (!state?.mode) return true;
    if (mode === 'challenge') return !challengeId;
    return !enrollmentToken;
}

function resolveMfaVerificationError(status: number | null) {
    if (status === 403) {
        return 'Debes configurar MFA antes de verificar. Inicia sesion nuevamente.';
    }
    return 'El codigo ingresado no es valido. Intenta nuevamente.';
}

function validateMfaSubmitInput(
    challengeId: string | undefined,
    useRecovery: boolean,
    recoveryCode: string,
    code: string
) {
    if (!challengeId) return '';
    if (useRecovery && !recoveryCode.trim()) {
        return 'Ingresa el codigo de recuperacion.';
    }
    if (!useRecovery && code.length !== MFA_CODE_LENGTH) {
        return 'Ingresa un codigo de 6 digitos.';
    }
    return null;
}

function buildMfaPayload(
    challengeId: string,
    useRecovery: boolean,
    recoveryCode: string,
    code: string
) {
    if (useRecovery) {
        return { challenge_id: challengeId, recovery_code: recoveryCode };
    }
    return { challenge_id: challengeId, code };
}

function focusMfaInputField(
    mode: MFAMode,
    useRecovery: boolean,
    codeDigits: string[],
    digitRefs: InputRefList,
    recoveryInputRef: InputRef
) {
    if (mode !== 'challenge') return;
    if (useRecovery) {
        recoveryInputRef.current?.focus();
        return;
    }
    const firstEmpty = codeDigits.findIndex((digit) => digit.length === 0);
    const focusIndex = firstEmpty >= 0 ? firstEmpty : MFA_CODE_LENGTH - 1;
    digitRefs.current[focusIndex]?.focus();
}

function handleMfaDigitKeyNavigation(
    index: number,
    key: string,
    codeDigits: string[],
    digitRefs: InputRefList,
    setDigit: (targetIndex: number, value: string) => void,
    preventDefault: () => void
) {
    if (key === 'Backspace') {
        if (codeDigits[index]) {
            setDigit(index, '');
            return;
        }
        if (index > 0) {
            preventDefault();
            digitRefs.current[index - 1]?.focus();
            setDigit(index - 1, '');
        }
        return;
    }

    if (key === 'ArrowLeft' && index > 0) {
        preventDefault();
        digitRefs.current[index - 1]?.focus();
        return;
    }

    if (key === 'ArrowRight' && index < MFA_CODE_LENGTH - 1) {
        preventDefault();
        digitRefs.current[index + 1]?.focus();
    }
}

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
    const mode: MFAMode = useMemo(() => resolveMfaMode(state), [state]);
    const challengeId = state?.challengeId;
    const enrollmentToken = state?.enrollmentToken;
    const username = state?.username;
    const navigate = useNavigate();
    const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
    const recoveryInputRef = useRef<HTMLInputElement | null>(null);
    const code = useMemo(() => codeDigits.join(''), [codeDigits]);
    const isRecoveryMode = useMemo(() => useRecovery, [useRecovery]);
    const isTotpMode = useMemo(() => !useRecovery, [useRecovery]);

    useEffect(() => {
        if (requiresLoginRedirect(state, mode, challengeId, enrollmentToken)) {
            navigate('/inicio-sesion', { replace: true, state: { reason: 'unauthenticated' } });
        }
    }, [mode, challengeId, enrollmentToken, navigate, state]);

    useEffect(() => {
        focusMfaInputField(mode, useRecovery, codeDigits, digitRefs, recoveryInputRef);
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
        handleMfaDigitKeyNavigation(
            index,
            event.key,
            codeDigits,
            digitRefs,
            setDigit,
            () => event.preventDefault()
        );
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

        const validationError = validateMfaSubmitInput(challengeId, useRecovery, recoveryCode, code);
        if (validationError !== null) {
            if (validationError) setSubmitError(validationError);
            setSubmitting(false);
            return;
        }

        const safeChallengeId = challengeId;
        if (!safeChallengeId) {
            setSubmitting(false);
            return;
        }

        try {
            const payload = buildMfaPayload(safeChallengeId, useRecovery, recoveryCode, code);
            const response = await loginMfa(payload);
            setSession(response.access_token, response.expires_in);
            const jwtPayload = decodeJwtPayload(response.access_token);
            navigate(getDefaultRouteForRoles(jwtPayload?.roles), { replace: true });
        } catch (error) {
            const status = error instanceof ApiError ? error.status : null;
            setSubmitError(resolveMfaVerificationError(status));
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

                                {isTotpMode ? (
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
                                            aria-selected={isTotpMode}
                                            className={`mfa-mode-toggle-btn ${isTotpMode ? 'is-active' : ''}`}
                                            onClick={() => setUseRecovery(false)}
                                        >
                                            Codigo TOTP
                                        </button>
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={isRecoveryMode}
                                            className={`mfa-mode-toggle-btn ${isRecoveryMode ? 'is-active' : ''}`}
                                            onClick={() => setUseRecovery(true)}
                                        >
                                            Codigo de recuperacion
                                        </button>
                                    </div>
                                    {isRecoveryMode ? (
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
