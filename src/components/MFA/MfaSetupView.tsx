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
    username?: string | null;
    initialDeviceLabel?: string | null;
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

function getConfirmErrorMessage(status?: MfaErrorStatus, payload?: unknown) {
    if (payload && typeof payload === 'object' && 'error' in payload) {
        const errorCode = (payload as { error?: string }).error;
        if (errorCode === 'invalid_mfa_code') {
            return 'El código ingresado no es válido. Intenta nuevamente.';
        }
    }
    if (status === 401) {
        return 'Tu sesión no es válida. Inicia sesión nuevamente.';
    }
    return 'El código ingresado no es válido. Intenta nuevamente.';
}

function detectDeviceLabel() {
    if (typeof navigator === 'undefined') return 'Dispositivo';
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'iPhone';
    return 'Dispositivo';
}

function formatDate(value?: Date | null) {
    if (!value) return '';
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
}

function buildOtpAuthUri(baseUri: string, label: string) {
    try {
        const url = new URL(baseUri);
        if (url.protocol !== 'otpauth:') return baseUri;
        const encodedLabel = encodeURIComponent(label);
        url.pathname = `/totp/${encodedLabel}`;
        if (!url.searchParams.get('issuer')) {
            url.searchParams.set('issuer', 'CogniaApp');
        }
        return url.toString();
    } catch {
        return baseUri;
    }
}

export function MfaSetupView({
    mode,
    enrollmentToken,
    accessToken,
    username,
    initialDeviceLabel,
    onComplete
}: MfaSetupViewProps) {
    const [codigo, setCodigo] = useState('');
    const [loadingQr, setLoadingQr] = useState(false);
    const [loadingSetup, setLoadingSetup] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
    const [setupDate, setSetupDate] = useState<Date | null>(null);
    const [showManual, setShowManual] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [deviceLabel, setDeviceLabel] = useState(initialDeviceLabel || detectDeviceLabel());
    const devicePreset = useMemo(() => (detectDeviceLabel() === 'Dispositivo' ? 'Dispositivo' : 'Detectado'), []);

    const token = mode === 'enrollment' ? enrollmentToken : accessToken;
    const isTokenMissing = !token;
    const codeValid = useMemo(() => /^\d{6}$/.test(codigo), [codigo]);
    const displayDate = useMemo(() => formatDate(setupDate ?? new Date()), [setupDate]);
    const effectiveUsername = useMemo(() => (username && username.trim() ? username.trim() : 'Usuario'), [username]);
    const displayLabel = useMemo(() => {
        const labelDevice = deviceLabel?.trim() ? deviceLabel.trim() : 'Dispositivo';
        return `CogniaApp: ${effectiveUsername} (${labelDevice} - ${displayDate})`;
    }, [effectiveUsername, deviceLabel, displayDate]);
    const computedOtpAuthUri = useMemo(() => {
        if (!otpauthUri) return null;
        return buildOtpAuthUri(otpauthUri, displayLabel);
    }, [otpauthUri, displayLabel]);

    useEffect(() => {
        if (!token) {
            setQrDataUrl(null);
            setOtpauthUri(null);
            setSetupDate(null);
            return;
        }
        const loadQr = async () => {
            setLoadingSetup(true);
            setSubmitError(null);
            try {
                const response = await mfaSetup(token);
                setOtpauthUri(response.otpauth_uri);
                if (response.created_at) {
                    const parsed = new Date(response.created_at);
                    setSetupDate(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
                } else {
                    setSetupDate(new Date());
                }
            } catch (error) {
                if (error instanceof ApiError) {
                    setSubmitError(getSetupErrorMessage(error.status as MfaErrorStatus));
                } else {
                    setSubmitError('No se pudo generar el QR. Intenta nuevamente.');
                }
            } finally {
                setLoadingSetup(false);
            }
        };
        void loadQr();
    }, [token]);

    useEffect(() => {
        if (!computedOtpAuthUri) {
            setQrDataUrl(null);
            return;
        }
        const generateQr = async () => {
            setLoadingQr(true);
            try {
                const dataUrl = await QRCode.toDataURL(computedOtpAuthUri);
                setQrDataUrl(dataUrl);
            } catch {
                setSubmitError('No se pudo generar el QR. Intenta nuevamente.');
            } finally {
                setLoadingQr(false);
            }
        };
        void generateQr();
    }, [computedOtpAuthUri]);

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
                setSubmitError(getConfirmErrorMessage(error.status as MfaErrorStatus, error.payload));
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
            const payload = recoveryCodes.join('\n');
            await navigator.clipboard.writeText(payload);
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
            <h2 className="mfa-setup-title" id="mfa-setup-title">Configurar verificación en dos pasos</h2>
            <p className="mfa-setup-subtitle">
                Escanea el código QR con tu aplicación de autenticación y escribe el código de 6 dígitos.
            </p>

            {isTokenMissing ? (
                <div className="mfa-setup-error">Inicia sesión para continuar con la configuración de MFA.</div>
            ) : (
                <>
                    <div className="mfa-qr-card">
                        {loadingSetup || loadingQr ? (
                            <div className="mfa-qr-placeholder">Cargando...</div>
                        ) : qrDataUrl ? (
                            <img src={qrDataUrl} alt="QR para MFA" className="mfa-qr-image" />
                        ) : (
                            <div className="mfa-qr-placeholder">QR</div>
                        )}
                    </div>

                    <div className="mfa-label-block">
                        <span className="mfa-label-title">Etiqueta que se verá en la app</span>
                        <span className="mfa-label-value">{displayLabel}</span>
                    </div>

                    <div className="mfa-device-input">
                        <label className="mfa-input-label" htmlFor="deviceLabel">Dispositivo</label>
                        <input
                            id="deviceLabel"
                            type="text"
                            className="mfa-input mfa-input-text"
                            value={deviceLabel}
                            onChange={(event) => setDeviceLabel(event.target.value)}
                            placeholder="Android, iPhone u otro"
                        />
                        {devicePreset === 'Dispositivo' ? (
                            <select
                                className="mfa-input mfa-input-text"
                                value={deviceLabel}
                                onChange={(event) => setDeviceLabel(event.target.value)}
                            >
                                <option value="Android">Android</option>
                                <option value="iPhone">iPhone</option>
                                <option value="Otro">Otro</option>
                                <option value="Dispositivo">Dispositivo</option>
                            </select>
                        ) : null}
                    </div>

                    <button
                        type="button"
                        className="mfa-manual-toggle"
                        onClick={() => setShowManual((prev) => !prev)}
                    >
                        {showManual ? 'Ocultar código manual' : 'Mostrar código manual'}
                    </button>
                    {showManual && otpauthUri ? (
                        <div className="mfa-manual-code">
                            <code>{otpauthUri}</code>
                        </div>
                    ) : null}

                    <div className="mfa-setup-note">
                        Se ha generado un nuevo código. Elimina cualquier entrada antigua y usa la entrada con la fecha {displayDate}.
                        Si ya tenías MFA activado, el código anterior ya no es válido.
                    </div>

                    <form className="mfa-form" onSubmit={handleConfirm}>
                        {submitError ? <div className="mfa-setup-error">{submitError}</div> : null}
                        <div className="mfa-input-group">
                            <label className="mfa-input-label">Código de 6 dígitos</label>
                            <input
                                type="text"
                                className="mfa-input mfa-input-code"
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
                <div className="mfa-recovery-overlay" role="dialog" aria-modal="true">
                    <div className="mfa-recovery-modal">
                        <h3>Guarda estos códigos de recuperación</h3>
                        <p>
                            Guárdalos en un lugar seguro. Se mostrarán solo una vez.
                        </p>
                        <div className="mfa-recovery-list">
                            {recoveryCodes.map((code) => (
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
