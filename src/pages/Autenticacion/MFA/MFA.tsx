import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
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
};

export default function MFA() {
    const [codigo, setCodigo] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [useRecovery, setUseRecovery] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
    const { mode: modeParam } = useParams();
    const location = useLocation();
    const { setSession } = useAuth();
    const state = location.state as MFANavigationState | null;
    const mode: MFAMode = useMemo(() => {
        if (state?.mode) return state.mode;
        return modeParam === 'setup' ? 'setup' : 'challenge';
    }, [modeParam, state]);
    const challengeId = state?.challengeId;
    const enrollmentToken = state?.enrollmentToken;
    const navigate = useNavigate();

    useEffect(() => {
        if (mode === 'challenge' && !challengeId) {
            navigate('/inicio-sesion', { replace: true, state: { reason: 'unauthenticated' } });
        }
        if (mode === 'setup' && !enrollmentToken) {
            navigate('/inicio-sesion', { replace: true, state: { reason: 'unauthenticated' } });
        }
    }, [mode, challengeId, enrollmentToken, navigate]);

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
                setSubmitError('Ingresa el c?digo de recuperaci?n.');
                setSubmitting(false);
                return;
            }
        } else if (codigo.length !== 6) {
            setSubmitError('Ingresa un c?digo de 6 d?gitos.');
            setSubmitting(false);
            return;
        }
        try {
            const payload = useRecovery
                ? { challenge_id: challengeId, recovery_code: recoveryCode }
                : { challenge_id: challengeId, code: codigo };
            const response = await loginMfa(payload);
            setSession(response.access_token, response.expires_in);
            const jwtPayload = decodeJwtPayload(response.access_token);
            navigate(getDefaultRouteForRoles(jwtPayload?.roles), { replace: true });
        } catch (error) {
            if (error instanceof ApiError && error.status === 403) {
                setSubmitError('Debes configurar MFA antes de verificar. Inicia sesi?n nuevamente.');
            } else {
                setSubmitError('El c?digo ingresado no es v?lido. Intenta nuevamente.');
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
                        {mode === 'setup' ? 'Configurar verificaci?n en dos pasos' : 'Verificaci?n requerida'}
                    </h1>

                    {mode === 'setup' ? (
                        <MfaSetupView
                            mode="enrollment"
                            enrollmentToken={enrollmentToken}
                            onComplete={() => {
                                navigate('/inicio-sesion', { replace: true, state: { mfaConfigured: true } });
                            }}
                        />
                    ) : (
                        <>
                            <p className="auth-subtitle">
                                Ingresa el c?digo de 6 d?gitos de tu aplicaci?n de autenticaci?n.
                            </p>
                            <form className="auth-form" onSubmit={handleVerify}>
                                {submitError ? <div className="validation-error">{submitError}</div> : null}
                                {submitSuccess ? <div className="validation-success">{submitSuccess}</div> : null}
                                <div className="form-group">
                                    <input
                                        type="text"
                                        className="form-input auth-code-input"
                                        placeholder="C?digo de 6 d?gitos"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={codigo}
                                        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                                        required={!useRecovery}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="mfa-recovery-toggle">
                                        <input
                                            type="checkbox"
                                            checked={useRecovery}
                                            onChange={(e) => setUseRecovery(e.target.checked)}
                                        />
                                        Usar c?digo de recuperaci?n
                                    </label>
                                    {useRecovery ? (
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="C?digo de recuperaci?n"
                                            value={recoveryCode}
                                            onChange={(e) => setRecoveryCode(e.target.value.trim())}
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
                            Si no puedes escanear el QR, utiliza la app para ingresar manualmente el c?digo.
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
