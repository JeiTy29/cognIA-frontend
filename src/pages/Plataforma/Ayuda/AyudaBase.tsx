import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Modal } from '../../../components/Modal/Modal';
import { TermsContent } from '../../../components/Legal/TermsContent';
import { PrivacyContent } from '../../../components/Legal/PrivacyContent';
import { ApiError } from '../../../services/api/httpClient';
import { createProblemReport } from '../../../services/problemReports/problemReports.api';
import {
    PROBLEM_REPORT_ALLOWED_ATTACHMENT_MIMES,
    PROBLEM_REPORT_ATTACHMENTS_MAX_SIZE_BYTES,
    PROBLEM_REPORT_ISSUE_TYPES,
    getProblemReportIssueTypeLabel,
    type ProblemReportIssueType
} from '../../../services/problemReports/problemReports.types';
import '../Plataforma.css';
import './Ayuda.css';

type HelpRole = 'padre' | 'psicologo';

interface AyudaBaseProps {
    role?: HelpRole;
}

type IssueOption = {
    label: string;
    value: string;
};

const WHATSAPP_NUMBER = '0000000000';
const SUPPORT_EMAIL = 'soportecognia@gmail.com';

const issueOptions: IssueOption[] = [
    ...PROBLEM_REPORT_ISSUE_TYPES.map((value) => ({
        value,
        label: getProblemReportIssueTypeLabel(value)
    }))
];

function extractPayloadField(payload: unknown, keys: string[]) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return null;
    }

    const record = payload as Record<string, unknown>;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return null;
}

function mapCreateProblemReportError(error: unknown) {
    if (!(error instanceof ApiError)) {
        return 'No fue posible enviar el reporte.';
    }

    const status = error.status;
    const candidates = [
        extractPayloadField(error.payload, ['error', 'code', 'type']),
        extractPayloadField(error.payload, ['msg', 'message', 'detail'])
    ].filter((value): value is string => Boolean(value));

    const normalized = candidates.map((value) => value.toLowerCase()).join(' ');

    if (normalized.includes('invalid_user') || status === 401) return 'Tu sesión no es válida. Inicia sesión nuevamente.';
    if (normalized.includes('inactive_account') || status === 403) return 'Tu cuenta está inactiva.';
    if (normalized.includes('attachment_missing')) return 'No se pudo procesar el archivo adjunto.';
    if (normalized.includes('attachment_filename_missing')) return 'El archivo adjunto debe conservar un nombre válido.';
    if (normalized.includes('attachment_mime_not_allowed')) return 'Solo se permiten archivos PNG, JPG o WEBP.';
    if (normalized.includes('attachment_empty')) return 'El archivo adjunto está vacío.';
    if (normalized.includes('attachment_too_large')) return 'El archivo adjunto supera el máximo de 5 MB.';
    if (normalized.includes('attachment_content_mismatch')) return 'El contenido del archivo no coincide con el tipo permitido.';
    if (normalized.includes('problem_report_create_failed')) return 'No fue posible crear el reporte. Intenta nuevamente.';
    if (normalized.includes('validation_error') || status === 400) return 'Revisa los datos del reporte e intenta de nuevo.';
    if (status >= 500) return 'Error del servidor. Intenta más tarde.';
    return 'No fue posible enviar el reporte.';
}

const faqsPadre = [
    {
        id: 'padre-1',
        question: '¿Qué significa la alerta que muestra el sistema?',
        answer: 'La alerta indica un posible trastorno según el cuestionario. No es un diagnóstico clínico.'
    },
    {
        id: 'padre-2',
        question: '¿Cómo diligencio el cuestionario correctamente?',
        answer: 'Responde con honestidad y completa todas las preguntas para obtener un resultado confiable.'
    },
    {
        id: 'padre-3',
        question: '¿Dónde veo el historial de mis cuestionarios?',
        answer: 'En la sección Historial puedes consultar los cuestionarios realizados por tu cuenta.'
    },
    {
        id: 'padre-4',
        question: '¿Qué datos se guardan sobre mi hijo?',
        answer: 'Solo se registran respuestas de comportamiento sin datos personales identificables.'
    }
];

const faqsPsicologo = [
    {
        id: 'psicologo-1',
        question: '¿Cómo interpreto los resultados detallados?',
        answer: 'Los resultados muestran la alerta y el razonamiento del modelo para apoyar tu análisis profesional.'
    },
    {
        id: 'psicologo-2',
        question: '¿Puedo ver múltiples evaluaciones de un mismo caso?',
        answer: 'Sí, si el tutor otorgó permisos, puedes acceder al historial completo de cuestionarios.'
    },
    {
        id: 'psicologo-3',
        question: '¿Qué hacer si necesito reportes adicionales?',
        answer: 'Puedes usar la sección de reporte de problemas o contactarnos para solicitar soporte.'
    },
    {
        id: 'psicologo-4',
        question: '¿Cómo se muestran las sugerencias del sistema?',
        answer: 'Las sugerencias se presentan como apoyo y no reemplazan la evaluación clínica.'
    }
];

export default function AyudaBase({ role }: AyudaBaseProps) {
    const location = useLocation();
    const resolvedRole: HelpRole = role
        ? role
        : location.pathname.includes('/psicologo')
            ? 'psicologo'
            : 'padre';

    const [openFaqId, setOpenFaqId] = useState<string | null>(null);
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportSuccess, setReportSuccess] = useState<string | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    const [issueType, setIssueType] = useState('');
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectOpen, setSelectOpen] = useState(false);

    const selectRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const faqs = resolvedRole === 'psicologo' ? faqsPsicologo : faqsPadre;
    const roleLabel = resolvedRole === 'psicologo' ? 'Psicólogo' : 'Padre/Tutor';
    const selectedIssueOption = issueOptions.find((option) => option.value === issueType) ?? null;

    const whatsappMessage = `Hola, necesito ayuda con CognIA. Mi tipo de cuenta es: ${roleLabel}.`;
    const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

    const mailSubject = 'Soporte CognIA';
    const mailBody = `Hola, necesito ayuda con CognIA.\nTipo de cuenta: ${roleLabel}.\nMódulo: Ayuda.\nDescripción: `;
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_EMAIL)}&su=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    const outlookLink = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(SUPPORT_EMAIL)}&subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            if (!selectRef.current) return;
            if (!selectRef.current.contains(event.target as Node)) {
                setSelectOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFaqToggle = (id: string) => {
        setOpenFaqId((prev) => (prev === id ? null : id));
    };

    const resetReportForm = () => {
        setIssueType('');
        setDescription('');
        setReportError(null);
        setReportSuccess(null);
        handleFileClear();
    };

    const handleReportToggle = () => {
        setShowReportForm((prev) => !prev);
        setReportError(null);
        setReportSuccess(null);
    };

    const handleReportCancel = () => {
        setShowReportForm(false);
        resetReportForm();
    };

    const handleReportSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setReportError(null);
        setReportSuccess(null);

        if (!issueType) {
            setReportError('Selecciona el tipo de problema.');
            return;
        }

        const trimmedDescription = description.trim();
        if (trimmedDescription.length < 10) {
            setReportError('La descripción debe tener al menos 10 caracteres.');
            return;
        }

        if (trimmedDescription.length > 4000) {
            setReportError('La descripción no puede superar los 4000 caracteres.');
            return;
        }

        setSubmittingReport(true);
        try {
            const response = await createProblemReport({
                issue_type: issueType as ProblemReportIssueType,
                description: trimmedDescription,
                source_path: location.pathname,
                attachment: selectedFile
            });
            const reportCode = response.report.report_code;
            resetReportForm();
            setReportSuccess(reportCode
                ? `Reporte enviado correctamente. Código: ${reportCode}.`
                : 'Reporte enviado correctamente.');
        } catch (submitError) {
            setReportError(mapCreateProblemReportError(submitError));
        } finally {
            setSubmittingReport(false);
        }
    };

    const handleCopyEmail = async () => {
        try {
            await navigator.clipboard.writeText(SUPPORT_EMAIL);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    const handleFileChange = (file: File | null) => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        if (!file) {
            setSelectedFile(null);
            setPreviewUrl(null);
            return;
        }

        if (!PROBLEM_REPORT_ALLOWED_ATTACHMENT_MIMES.includes(file.type as (typeof PROBLEM_REPORT_ALLOWED_ATTACHMENT_MIMES)[number])) {
            setSelectedFile(null);
            setPreviewUrl(null);
            setReportError('Solo se permiten archivos PNG, JPG o WEBP.');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        if (file.size > PROBLEM_REPORT_ATTACHMENTS_MAX_SIZE_BYTES) {
            setSelectedFile(null);
            setPreviewUrl(null);
            setReportError('El archivo adjunto supera el máximo de 5 MB.');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setReportError(null);
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const handleFileClear = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSelectToggle = () => {
        setSelectOpen((prev) => !prev);
    };

    const handleSelectOption = (value: string) => {
        setIssueType(value);
        setReportError(null);
        setSelectOpen(false);
    };

    return (
        <div className="plataforma-view ayuda-view">
            <div className="ayuda-container">
                <header className="ayuda-header">
                    <h1 className="ayuda-title">Ayuda</h1>
                    <p className="ayuda-subtitle">Encuentra respuestas rápidas o contáctanos si necesitas ayuda.</p>
                </header>

                <section className="info-card ayuda-panel ayuda-faq">
                    <h2 className="ayuda-section-title">Centro de ayuda</h2>
                    <div className="ayuda-faq-list">
                        {faqs.map((item) => (
                            <div key={item.id} className="ayuda-faq-item">
                                <button
                                    type="button"
                                    className="ayuda-faq-question"
                                    onClick={() => handleFaqToggle(item.id)}
                                    aria-expanded={openFaqId === item.id}
                                >
                                    <span>{item.question}</span>
                                    <span className="ayuda-faq-icon">{openFaqId === item.id ? '-' : '+'}</span>
                                </button>
                                <div className={`ayuda-faq-answer ${openFaqId === item.id ? 'is-open' : ''}`}>
                                    <p>{item.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="ayuda-lower">
                    <section className="info-card ayuda-panel ayuda-report-panel">
                        <button type="button" className="ayuda-toggle" onClick={handleReportToggle}>
                            <span>Reportar un problema</span>
                            <span className={`ayuda-toggle-icon ${showReportForm ? 'open' : ''}`}><ChevronIcon /></span>
                        </button>
                        <div className={`ayuda-report ${showReportForm ? 'is-open' : ''}`}>
                            <form className="ayuda-report-form" onSubmit={handleReportSubmit}>
                                <label className="ayuda-input-group">
                                    <span className="ayuda-label">Tipo de problema</span>
                                    <div className="ayuda-select" ref={selectRef}>
                                        <button
                                            type="button"
                                            className="ayuda-select-trigger"
                                            onClick={handleSelectToggle}
                                            aria-expanded={selectOpen}
                                        >
                                            <span>{selectedIssueOption?.label ?? 'Selecciona una opción'}</span>
                                            <span className={`ayuda-select-icon ${selectOpen ? 'open' : ''}`}><ChevronIcon /></span>
                                        </button>
                                        <div className={`ayuda-select-menu ${selectOpen ? 'is-open' : ''}`}>
                                            {issueOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    className="ayuda-select-option"
                                                    onClick={() => handleSelectOption(option.value)}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </label>
                                <label className="ayuda-input-group">
                                    <span className="ayuda-label">Descripción</span>
                                    <textarea
                                        className="ayuda-input ayuda-textarea"
                                        placeholder="Describe el problema de forma breve."
                                        value={description}
                                        onChange={(event) => {
                                            setDescription(event.target.value);
                                            setReportError(null);
                                        }}
                                    />
                                </label>
                                <label className="ayuda-input-group">
                                    <span className="ayuda-label">Adjuntar captura</span>
                                    <div className="ayuda-upload">
                                        <input
                                            ref={fileInputRef}
                                            className="ayuda-input ayuda-file-input"
                                            type="file"
                                            id="ayuda-file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                                        />
                                        <label htmlFor="ayuda-file" className="ayuda-upload-btn">
                                            Seleccionar imagen
                                        </label>
                                        {previewUrl && (
                                            <div className="ayuda-preview-wrap">
                                                <img
                                                    className="ayuda-preview"
                                                    src={previewUrl}
                                                    alt="Vista previa de la captura"
                                                />
                                                <button type="button" className="ayuda-btn discard" onClick={handleFileClear}>
                                                    Descartar imagen
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </label>

                                {reportError ? <div className="ayuda-error">{reportError}</div> : null}
                                {reportSuccess ? <div className="ayuda-success">{reportSuccess}</div> : null}

                                <div className="ayuda-actions inline">
                                    <button type="button" className="ayuda-btn cancel" onClick={handleReportCancel}>
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="ayuda-btn primary"
                                        disabled={!issueType || description.trim().length < 10 || submittingReport}
                                    >
                                        {submittingReport ? 'Enviando...' : 'Enviar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>

                    <section className="info-card ayuda-panel ayuda-contact">
                        <div className="ayuda-block">
                            <h2 className="ayuda-section-title">Contacto</h2>
                            <div className="ayuda-actions">
                                <a className="ayuda-btn whatsapp" href={whatsappLink} target="_blank" rel="noreferrer">
                                    Escribir por WhatsApp
                                </a>
                                <a className="ayuda-btn gmail" href={gmailLink} target="_blank" rel="noreferrer">
                                    Escribir por Gmail
                                </a>
                                <a className="ayuda-btn outlook" href={outlookLink} target="_blank" rel="noreferrer">
                                    Escribir por Outlook
                                </a>
                                <button type="button" className="ayuda-btn copy" onClick={handleCopyEmail}>
                                    Copiar correo
                                </button>
                                {copied && <span className="ayuda-copy">Correo copiado.</span>}
                            </div>
                        </div>

                        <div className="ayuda-divider" />

                        <div className="ayuda-block">
                            <h2 className="ayuda-section-title">Legal</h2>
                            <div className="ayuda-legal">
                                <button type="button" className="ayuda-link" onClick={() => setShowPrivacy(true)}>
                                    Política de privacidad
                                </button>
                                <button type="button" className="ayuda-link" onClick={() => setShowTerms(true)}>
                                    Términos de uso
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <Modal isOpen={showTerms} onClose={() => setShowTerms(false)}>
                <TermsContent />
            </Modal>
            <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)}>
                <PrivacyContent />
            </Modal>
        </div>
    );
}

function ChevronIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 10 5 5 5-5" />
        </svg>
    );
}
