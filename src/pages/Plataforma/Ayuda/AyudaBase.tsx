import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Modal } from '../../../components/Modal/Modal';
import { TermsContent } from '../../Inicio/Terms/Terms';
import { PrivacyContent } from '../../Inicio/Privacy/Privacy';
import '../Plataforma.css';
import './Ayuda.css';

type HelpRole = 'padre' | 'psicologo';

const WHATSAPP_NUMBER = '0000000000';
const SUPPORT_EMAIL = 'soporte@cognia.com';

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

export default function AyudaBase() {
    const location = useLocation();
    const role: HelpRole = location.pathname.includes('/psicologo') ? 'psicologo' : 'padre';

    const [openFaqId, setOpenFaqId] = useState<string | null>(null);
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportSent, setReportSent] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    const [issueType, setIssueType] = useState('');
    const [description, setDescription] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);

    const faqs = role === 'psicologo' ? faqsPsicologo : faqsPadre;
    const roleLabel = role === 'psicologo' ? 'Psicólogo' : 'Padre/Tutor';

    const whatsappMessage = `Hola, necesito ayuda con CognIA. Mi tipo de cuenta es: ${roleLabel}.`;
    const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

    const mailSubject = 'Soporte CognIA';
    const mailBody = `Hola, necesito ayuda con CognIA.
Tipo de cuenta: ${roleLabel}.
Módulo: Ayuda.
Descripción: `;
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_EMAIL)}&su=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    const outlookLink = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(SUPPORT_EMAIL)}&subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;

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
        setAttachment(null);
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
                                    <span className="ayuda-faq-icon">{openFaqId === item.id ? '–' : '+'}</span>
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
                            <span className="ayuda-toggle-icon">{showReportForm ? '–' : '+'}</span>
                        </button>
                        <div className={`ayuda-report ${showReportForm ? 'is-open' : ''}`}>
                            <form className="ayuda-report-form" onSubmit={handleReportSubmit}>
                                <label className="ayuda-input-group">
                                    <span className="ayuda-label">Tipo de problema</span>
                                    <select
                                        className="ayuda-input"
                                        value={issueType}
                                        onChange={(event) => setIssueType(event.target.value)}
                                    >
                                        <option value="">Selecciona una opción</option>
                                        <option value="Acceso">Acceso</option>
                                        <option value="Cuestionario">Cuestionario</option>
                                        <option value="Resultados">Resultados</option>
                                        <option value="Interfaz">Interfaz</option>
                                        <option value="Otro">Otro</option>
                                    </select>
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
                                    <input
                                        className="ayuda-input"
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) => setAttachment(event.target.files?.[0] || null)}
                                    />
                                    {attachment && (
                                        <span className="ayuda-attachment">Archivo: {attachment.name}</span>
                                    )}
                                </label>

                                {reportSent && (
                                    <div className="ayuda-success">Reporte enviado correctamente.</div>
                                )}

                                <div className="ayuda-actions">
                                    <button type="button" className="ayuda-btn ghost" onClick={handleReportCancel}>
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
