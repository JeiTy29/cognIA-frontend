import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Modal } from '../../../components/Modal/Modal';
import { TermsContent } from '../../../components/Legal/TermsContent';
import { PrivacyContent } from '../../../components/Legal/PrivacyContent';
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
const SUPPORT_EMAIL = 'soporte@cognia.com';

const issueOptions: IssueOption[] = [
    { value: 'Acceso', label: 'Acceso' },
    { value: 'Cuestionario', label: 'Cuestionario' },
    { value: 'Resultados', label: 'Resultados' },
    { value: 'Interfaz', label: 'Interfaz' },
    { value: 'Otro', label: 'Otro' }
];

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
    const [reportSent, setReportSent] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    const [issueType, setIssueType] = useState('');
    const [description, setDescription] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectOpen, setSelectOpen] = useState(false);

    const selectRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const faqs = resolvedRole === 'psicologo' ? faqsPsicologo : faqsPadre;
    const roleLabel = resolvedRole === 'psicologo' ? 'Psicólogo' : 'Padre/Tutor';

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

    const handleReportToggle = () => {
        setShowReportForm((prev) => !prev);
        setReportSent(false);
    };

    const handleReportCancel = () => {
        setShowReportForm(false);
        setReportSent(false);
        setIssueType('');
        setDescription('');
        handleFileClear();
    };

    const handleReportSubmit = (event: FormEvent) => {
        event.preventDefault();
        setReportSent(true);
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
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const handleFileClear = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
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
                                            <span>{issueType || 'Selecciona una opción'}</span>
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
                                        onChange={(event) => setDescription(event.target.value)}
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
                                            accept="image/*"
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

                                {reportSent && (
                                    <div className="ayuda-success">Reporte enviado correctamente.</div>
                                )}

                                <div className="ayuda-actions inline">
                                    <button type="button" className="ayuda-btn cancel" onClick={handleReportCancel}>
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="ayuda-btn primary"
                                        disabled={!issueType || !description.trim()}
                                    >
                                        Enviar
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
