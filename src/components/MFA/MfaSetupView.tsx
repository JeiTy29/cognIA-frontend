import { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';
import './MfaSetupView.css';
import { mfaConfirm, mfaSetup } from '../../services/auth/auth.api';
import { ApiError } from '../../services/api/httpClient';

type MfaSetupMode = 'enrollment' | 'setup';

interface MfaSetupViewProps {
    mode: MfaSetupMode;
    enrollmentToken?: string | null;
    accessToken?: string | null;
    onComplete?: () => void;
}

type MfaErrorStatus = 400 | 401 | 404 | 409 | 500;

function getSetupErrorMessage(status?: MfaErrorStatus) {
    switch (status) {
        case 400:
            return 'El código es inválido o ha expirado.';
        case 401:
            return 'Tu sesión no es válida. Inicia sesión nuevamente.';
        case 404:
            return 'No se encontró la configuración de MFA.';
        case 409:
            return 'Ya existe un enrolamiento activo. Intenta nuevamente.';
        default:
            return 'No se pudo completar la configuración de MFA.';
    }
}

export function MfaSetupView({ mode, enrollmentToken, accessToken, onComplete }: MfaSetupViewProps) {
    const [codigo, setCodigo] = useState('');
    const [loadingQr, setLoadingQr] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
    const [showManual, setShowManual] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    const token = mode === 'enrollment' ? enrollmentToken : accessToken;
    const isTokenMissing = !token;
    const codeValid = useMemo(() => /^\d{6}$/.test(codigo), [codigo]);

    useEffect(() => {
        if (!token) {
            setQrDataUrl(null);
            setOtpauthUri(null);
            return;
        }
        const loadQr = async () => {
            setLoadingQr(true);
            setSubmitError(null);
            try {
                const response = await mfaSetup(token);
                setOtpauthUri(response.otpauth_uri);
                const dataUrl = await QRCode.toDataURL(response.otpauth_uri);
                setQrDataUrl(dataUrl);
            } catch (error) {
                if (error instanceof ApiError) {
                    setSubmitError(getSetupErrorMessage(error.status as MfaErrorStatus));
                } else {
                    setSubmitError('No se pudo generar el QR. Intenta nuevamente.');
                }
            } finally {
                setLoadingQr(false);
            }
        };
        void loadQr();
    }, [token]);

    const handleConfirm = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!token) return;
        setSubmitError(null);
        setSubmitting(true);
        try {
            const response = await mfaConfirm(token, { code: codigo });
            if (response.recovery_codes && response.recovery_codes.length > 0) {
                setRecoveryCodes(response.recovery_codes);
                return;
            }
            onComplete?.();
        } catch (error) {
            if (error instanceof ApiError) {
                setSubmitError(getSetupErrorMessage(error.status as MfaErrorStatus));
            } else {
                setSubmitError('El código ingresado no es válido. Intenta nuevamente.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopyCodes = async () => {
        if (!recoveryCodes) return;
        try {
            await navigator.clipboard.writeText(recoveryCodes.join('\n'));
            setCopySuccess(true);
        } catch {
            setCopySuccess(false);
        }
    };

    const handleRecoveryClose = () => {
        setRecoveryCodes(null);
        setCodigo('');
        setCopySuccess(false);
        onComplete?.();
    };

    return (
        <div className="mfa-setup">
            <h2 className="mfa-setup-title">Configurar verificación en dos pasos</h2>
            <p className="mfa-setup-subtitle">
                Escanea el código QR con tu aplicación de autenticación y escribe el código de 6 dígitos.
            </p>

            {isTokenMissing ? (
                <div className="mfa-setup-error">Inicia sesión para continuar con la configuración de MFA.</div>
            ) : (
                <>
                    <div className="mfa-qr-card">
                        {loadingQr ? (
                            <div className="mfa-qr-placeholder">Cargando…</div>
                        ) : qrDataUrl ? (
                            <img src={qrDataUrl} alt="QR para MFA" className="mfa-qr-image" />
                        ) : (
                            <div className="mfa-qr-placeholder">QR</div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="mfa-manual-toggle"
                        onClick={() => setShowManual(prev => !prev)}
                    >
                        {showManual ? 'Ocultar código manual' : 'Mostrar código manual'}
                    </button>
                    {showManual && otpauthUri ? (
                        <div className="mfa-manual-code">
                            <code>{otpauthUri}</code>
                        </div>
                    ) : null}

                    <form className="mfa-form" onSubmit={handleConfirm}>
                        {submitError ? <div className="mfa-setup-error">{submitError}</div> : null}
                        <div className="mfa-input-group">
                            <label className="mfa-input-label">Código de 6 dígitos</label>
                            <input
                                type="text"
                                className="mfa-input"
                                inputMode="numeric"
                                maxLength={6}
                                value={codigo}
                                onChange={(event) => setCodigo(event.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                disabled={submitting}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={!codeValid || submitting}
                        >
                            {submitting ? 'Confirmando...' : 'Confirmar'}
                        </button>
                    </form>
                </>
            )}

            {recoveryCodes ? (
                <div className="mfa-recovery-overlay">
                    <div className="mfa-recovery-modal">
                        <h3>Guarda estos códigos de recuperación</h3>
                        <p>
                            Guárdalos en un lugar seguro. Se mostrarán solo una vez.
                        </p>
                        <div className="mfa-recovery-list">
                            {recoveryCodes.map(code => (
                                <span key={code} className="mfa-recovery-code">{code}</span>
                            ))}
                        </div>
                        {copySuccess ? (
                            <div className="mfa-recovery-success">Códigos copiados.</div>
                        ) : null}
                        <div className="mfa-recovery-actions">
                            <button type="button" className="btn-secondary" onClick={handleCopyCodes}>
                                Copiar
                            </button>
                            <button type="button" className="btn-primary" onClick={handleRecoveryClose}>
                                He guardado los códigos
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
