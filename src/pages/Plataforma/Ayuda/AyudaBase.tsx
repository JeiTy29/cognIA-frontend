import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { TermsContent } from '../../../components/Legal/TermsContent';
import { PrivacyContent } from '../../../components/Legal/PrivacyContent';
import { ApiError } from '../../../services/api/httpClient';
import { createProblemReport } from '../../../services/problemReports/problemReports.api';
import {
    PROBLEM_REPORT_ALLOWED_ATTACHMENT_MIMES,
    PROBLEM_REPORT_ATTACHMENTS_MAX_SIZE_BYTES,
    PROBLEM_REPORT_ISSUE_TYPES,
    PROBLEM_REPORT_STATUSES,
    getProblemReportIssueTypeLabel,
    getProblemReportStatusLabel,
    type ProblemReportIssueType,
    type ProblemReportItem
} from '../../../services/problemReports/problemReports.types';
import { useMyProblemReports } from '../../../hooks/useMyProblemReports';
import '../Plataforma.css';
import './Ayuda.css';

type HelpRole = 'padre' | 'psicologo';
type AyudaBaseProps = { role?: HelpRole };
type IssueOption = { label: string; value: string };

const WHATSAPP_NUMBER = '0000000000';
const SUPPORT_EMAIL = 'soportecognia@gmail.com';

const issueOptions: IssueOption[] = PROBLEM_REPORT_ISSUE_TYPES.map((value) => ({
    value,
    label: getProblemReportIssueTypeLabel(value)
}));

const reportStatusOptions = [
    { value: '', label: 'Todos' },
    ...PROBLEM_REPORT_STATUSES.map((status) => ({
        value: status,
        label: getProblemReportStatusLabel(status)
    }))
];

const reportIssueOptions = [
    { value: '', label: 'Todos' },
    ...PROBLEM_REPORT_ISSUE_TYPES.map((issueType) => ({
        value: issueType,
        label: getProblemReportIssueTypeLabel(issueType)
    }))
];

const reportOrderOptions = [
    { value: 'created_at:desc', label: 'Recientes' },
    { value: 'created_at:asc', label: 'Antiguos' },
    { value: 'updated_at:desc', label: 'Actualizados' }
];

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' }
];

function extractPayloadField(payload: unknown, keys: string[]) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const record = payload as Record<string, unknown>;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    }
    return null;
}

function mapCreateProblemReportError(error: unknown) {
    if (!(error instanceof ApiError)) return 'No fue posible enviar el reporte.';
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
    if (status >= 500) return 'No fue posible consultar reportes en este momento. Intenta nuevamente más tarde.';
    return 'No fue posible enviar el reporte.';
}

function formatDateTime(value: string | null) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return `${date.toLocaleDateString('es-CO')} ${date.toLocaleTimeString('es-CO')}`;
}

function formatAttachmentSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusTone(value: string) {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'resolved') return 'resolved';
    if (normalized === 'triaged' || normalized === 'in_progress') return 'progress';
    if (normalized === 'rejected') return 'rejected';
    return 'open';
}

const faqsPadre = [
    { id: 'padre-1', question: '¿Qué significa la alerta que muestra el sistema?', answer: 'La alerta indica un posible trastorno según el cuestionario. No es un diagnóstico clínico.' },
    { id: 'padre-2', question: '¿Cómo diligencio el cuestionario correctamente?', answer: 'Responde con honestidad y completa todas las preguntas para obtener un resultado confiable.' },
    { id: 'padre-3', question: '¿Dónde veo el historial de mis cuestionarios?', answer: 'En la sección Historial puedes consultar los cuestionarios realizados por tu cuenta.' },
    { id: 'padre-4', question: '¿Qué datos se guardan sobre mi hijo?', answer: 'Solo se registran respuestas de comportamiento sin datos personales identificables.' }
];

const faqsPsicologo = [
    { id: 'psicologo-1', question: '¿Cómo interpreto los resultados detallados?', answer: 'Los resultados muestran la alerta y el razonamiento del modelo para apoyar tu análisis profesional.' },
    { id: 'psicologo-2', question: '¿Puedo ver múltiples evaluaciones de un mismo caso?', answer: 'Sí, si el tutor otorgó permisos, puedes acceder al historial completo de cuestionarios.' },
    { id: 'psicologo-3', question: '¿Qué hacer si necesito reportes adicionales?', answer: 'Puedes usar la sección de reporte de problemas o contactarnos para solicitar soporte.' },
    { id: 'psicologo-4', question: '¿Cómo se muestran las sugerencias del sistema?', answer: 'Las sugerencias se presentan como apoyo y no reemplazan la evaluación clínica.' }
];

export default function AyudaBase({ role }: AyudaBaseProps) {
    const location = useLocation();
    const resolvedRole: HelpRole = role ? role : location.pathname.includes('/psicologo') ? 'psicologo' : 'padre';

    const [openFaqId, setOpenFaqId] = useState<string | null>(null);
    const [showReportForm, setShowReportForm] = useState(false);
    const [showMyReports, setShowMyReports] = useState(false);
    const [selectedReport, setSelectedReport] = useState<ProblemReportItem | null>(null);
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

    const {
        items,
        page,
        pageSize,
        total,
        pages,
        statusFilter,
        issueTypeFilter,
        sort,
        order,
        loading: reportsLoading,
        error: reportsError,
        setPage,
        setStatusFilter,
        setIssueTypeFilter,
        setOrdering,
        changePageSize,
        reloadReports
    } = useMyProblemReports({ enabled: showMyReports });

    const faqs = resolvedRole === 'psicologo' ? faqsPsicologo : faqsPadre;
    const roleLabel = resolvedRole === 'psicologo' ? 'Psicólogo' : 'Padre/Tutor';
    const selectedIssueOption = issueOptions.find((option) => option.value === issueType) ?? null;
    const orderValue = useMemo(() => `${sort}:${order}`, [sort, order]);
    const currentPage = Math.min(page, Math.max(1, pages));
    const displayFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const displayTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

    const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, necesito ayuda con CognIA. Mi tipo de cuenta es: ${roleLabel}.`)}`;
    const mailSubject = 'Soporte CognIA';
    const mailBody = `Hola, necesito ayuda con CognIA.\nTipo de cuenta: ${roleLabel}.\nMódulo: Ayuda.\nDescripción: `;
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_EMAIL)}&su=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    const outlookLink = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(SUPPORT_EMAIL)}&subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            if (!selectRef.current) return;
            if (!selectRef.current.contains(event.target as Node)) setSelectOpen(false);
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    const handleFaqToggle = (id: string) => setOpenFaqId((prev) => (prev === id ? null : id));
    const handleReportsToggle = () => setShowMyReports((prev) => !prev);
    const handleReportToggle = () => {
        setShowReportForm((prev) => !prev);
        setReportError(null);
        setReportSuccess(null);
    };

    const handleFileClear = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const resetReportForm = () => {
        setIssueType('');
        setDescription('');
        setReportError(null);
        handleFileClear();
    };

    const handleReportCancel = () => {
        setShowReportForm(false);
        resetReportForm();
        setReportSuccess(null);
    };

    const handleReportSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setReportError(null);
        setReportSuccess(null);
        if (!issueType) return setReportError('Selecciona el tipo de problema.');
        const trimmedDescription = description.trim();
        if (trimmedDescription.length < 10) return setReportError('La descripción debe tener al menos 10 caracteres.');
        if (trimmedDescription.length > 4000) return setReportError('La descripción no puede superar los 4000 caracteres.');

        setSubmittingReport(true);
        try {
            const response = await createProblemReport({
                issue_type: issueType as ProblemReportIssueType,
                description: trimmedDescription,
                source_module: 'ayuda',
                source_path: location.pathname,
                attachment: selectedFile
            });
            resetReportForm();
            setShowReportForm(false);
            setReportSuccess(response.report.report_code ? `Reporte enviado correctamente. Código: ${response.report.report_code}.` : 'Reporte enviado correctamente.');
            if (showMyReports) await reloadReports();
            else setShowMyReports(true);
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
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (!file) {
            setSelectedFile(null);
            setPreviewUrl(null);
            return;
        }
        if (!PROBLEM_REPORT_ALLOWED_ATTACHMENT_MIMES.includes(file.type as (typeof PROBLEM_REPORT_ALLOWED_ATTACHMENT_MIMES)[number])) {
            setSelectedFile(null);
            setPreviewUrl(null);
            setReportError('Solo se permiten archivos PNG, JPG o WEBP.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        if (file.size > PROBLEM_REPORT_ATTACHMENTS_MAX_SIZE_BYTES) {
            setSelectedFile(null);
            setPreviewUrl(null);
            setReportError('El archivo adjunto supera el máximo de 5 MB.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setReportError(null);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleSelectToggle = () => setSelectOpen((prev) => !prev);
    const handleSelectOption = (value: string) => {
        setIssueType(value);
        setReportError(null);
        setSelectOpen(false);
    };

    return (
        <>
            <div className="plataforma-view ayuda-view">
                <div className="ayuda-container">
                    <header className="ayuda-header">
                        <h1 className="ayuda-title">Ayuda</h1>
                    </header>

                    <section className="ayuda-section ayuda-faq">
                        <h2 className="ayuda-section-title">Preguntas frecuentes</h2>
                        <div className="ayuda-faq-list">
                            {faqs.map((item) => (
                                <div key={item.id} className="ayuda-faq-item">
                                    <button type="button" className="ayuda-faq-question" onClick={() => handleFaqToggle(item.id)} aria-expanded={openFaqId === item.id}>
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

                    <section className="ayuda-section ayuda-report-section">
                        <button type="button" className="ayuda-toggle" onClick={handleReportToggle}>
                            <span>Reportar un problema</span>
                            <span className={`ayuda-toggle-icon ${showReportForm ? 'open' : ''}`}><ChevronIcon /></span>
                        </button>
                        <div className={`ayuda-report ${showReportForm ? 'is-open' : ''}`}>
                            <form className="ayuda-report-form" onSubmit={handleReportSubmit}>
                                <label className="ayuda-input-group">
                                    <span className="ayuda-label">Tipo de problema</span>
                                    <div className="ayuda-select" ref={selectRef}>
                                        <button type="button" className="ayuda-select-trigger" onClick={handleSelectToggle} aria-expanded={selectOpen}>
                                            <span>{selectedIssueOption?.label ?? 'Selecciona una opción'}</span>
                                            <span className={`ayuda-select-icon ${selectOpen ? 'open' : ''}`}><ChevronIcon /></span>
                                        </button>
                                        <div className={`ayuda-select-menu ${selectOpen ? 'is-open' : ''}`}>
                                            {issueOptions.map((option) => (
                                                <button key={option.value} type="button" className="ayuda-select-option" onClick={() => handleSelectOption(option.value)}>
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
                                        <label htmlFor="ayuda-file" className="ayuda-upload-btn">Seleccionar imagen</label>
                                        {previewUrl ? (
                                            <div className="ayuda-preview-wrap">
                                                <img className="ayuda-preview" src={previewUrl} alt="Vista previa de la captura" />
                                                <button type="button" className="ayuda-btn discard" onClick={handleFileClear}>Descartar imagen</button>
                                            </div>
                                        ) : null}
                                    </div>
                                </label>
                                {reportError ? <div className="ayuda-error">{reportError}</div> : null}
                                {reportSuccess ? <div className="ayuda-success">{reportSuccess}</div> : null}
                                <div className="ayuda-actions inline">
                                    <button type="button" className="ayuda-btn cancel" onClick={handleReportCancel}>Cancelar</button>
                                    <button type="submit" className="ayuda-btn primary" disabled={!issueType || description.trim().length < 10 || submittingReport}>
                                        {submittingReport ? 'Enviando...' : 'Enviar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>

                    <section className="ayuda-section ayuda-my-reports-section">
                        <button type="button" className="ayuda-toggle" onClick={handleReportsToggle}>
                            <span>Mis reportes</span>
                            <span className={`ayuda-toggle-icon ${showMyReports ? 'open' : ''}`}><ChevronIcon /></span>
                        </button>
                        <div className={`ayuda-report ayuda-my-reports-body ${showMyReports ? 'is-open' : ''}`}>
                            <div className="ayuda-reports-controls">
                                <div className="ayuda-reports-filters">
                                    <label>
                                        <span>Estado</span>
                                        <CustomSelect ariaLabel="Filtrar reportes por estado" value={statusFilter} options={reportStatusOptions} onChange={setStatusFilter} />
                                    </label>
                                    <label>
                                        <span>Tipo</span>
                                        <CustomSelect ariaLabel="Filtrar reportes por tipo" value={issueTypeFilter} options={reportIssueOptions} onChange={setIssueTypeFilter} />
                                    </label>
                                    <label>
                                        <span>Orden</span>
                                        <CustomSelect
                                            ariaLabel="Ordenar mis reportes"
                                            value={orderValue}
                                            options={reportOrderOptions}
                                            onChange={(value) => {
                                                const [nextSort, nextOrder] = value.split(':');
                                                setOrdering(nextSort, nextOrder === 'asc' ? 'asc' : 'desc');
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                            {reportsError ? <div className="ayuda-error">{reportsError}</div> : null}
                            {reportsLoading ? <div className="ayuda-report-status">Cargando reportes...</div> : null}
                            {!reportsLoading && items.length === 0 ? (
                                <div className="ayuda-report-empty">
                                    <h3>Sin reportes</h3>
                                    <p>No tienes reportes para los filtros actuales.</p>
                                </div>
                            ) : null}
                            {!reportsLoading && items.length > 0 ? (
                                <>
                                    <div className="ayuda-report-list">
                                        {items.map((item) => (
                                            <article key={item.id} className="ayuda-report-item">
                                                <div className="ayuda-report-item-head">
                                                    <strong>{item.report_code}</strong>
                                                    <span className={`ayuda-report-badge ${getStatusTone(item.status)}`}>{getProblemReportStatusLabel(item.status)}</span>
                                                </div>
                                                <div className="ayuda-report-item-meta">
                                                    <span>{getProblemReportIssueTypeLabel(item.issue_type)}</span>
                                                    <span>{formatDateTime(item.created_at)}</span>
                                                    <span>{item.attachment_count} adjunto(s)</span>
                                                </div>
                                                <div className="ayuda-report-item-actions">
                                                    <button type="button" className="ayuda-btn ghost" onClick={() => setSelectedReport(item)}>Ver detalle</button>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                    <footer className="ayuda-report-pagination">
                                        <div>Mostrando {displayFrom}-{displayTo} de {total}</div>
                                        <div className="ayuda-report-pagination-controls">
                                            <button type="button" className="ayuda-page-btn" aria-label="Página anterior" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
                                                <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
                                            </button>
                                            <span className="ayuda-page-current">Página {currentPage}</span>
                                            <button type="button" className="ayuda-page-btn" aria-label="Página siguiente" onClick={() => setPage(Math.min(pages, currentPage + 1))} disabled={currentPage >= pages}>
                                                <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
                                            </button>
                                        </div>
                                        <div className="ayuda-page-size">
                                            <label>
                                                <span>Tamaño</span>
                                                <CustomSelect ariaLabel="Tamaño de página" value={String(pageSize)} options={pageSizeOptions} onChange={(value) => changePageSize(Number(value))} />
                                            </label>
                                        </div>
                                    </footer>
                                </>
                            ) : null}
                        </div>
                    </section>

                    <section className="ayuda-section ayuda-contact-grid">
                        <div className="ayuda-block">
                            <h2 className="ayuda-section-title">Contacto</h2>
                            <div className="ayuda-actions">
                                <a className="ayuda-btn whatsapp" href={whatsappLink} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>
                                <a className="ayuda-btn gmail" href={gmailLink} target="_blank" rel="noreferrer">Escribir por Gmail</a>
                                <a className="ayuda-btn outlook" href={outlookLink} target="_blank" rel="noreferrer">Escribir por Outlook</a>
                                <button type="button" className="ayuda-btn copy" onClick={handleCopyEmail}>Copiar correo</button>
                                {copied ? <span className="ayuda-copy">Correo copiado.</span> : null}
                            </div>
                        </div>
                        <div className="ayuda-block ayuda-legal-block">
                            <h2 className="ayuda-section-title">Legal</h2>
                            <div className="ayuda-legal">
                                <button type="button" className="ayuda-link" onClick={() => setShowPrivacy(true)}>Política de privacidad</button>
                                <button type="button" className="ayuda-link" onClick={() => setShowTerms(true)}>Términos de uso</button>
                            </div>
                        </div>
                    </section>
                </div>

                <Modal isOpen={selectedReport !== null} onClose={() => setSelectedReport(null)}>
                    <div className="ayuda-detail-modal">
                        <h2>Detalle del reporte</h2>
                        {selectedReport ? (
                            <>
                                <div className="ayuda-detail-grid">
                                    <div><strong>Código</strong><span>{selectedReport.report_code}</span></div>
                                    <div><strong>Tipo</strong><span>{getProblemReportIssueTypeLabel(selectedReport.issue_type)}</span></div>
                                    <div><strong>Estado</strong><span>{getProblemReportStatusLabel(selectedReport.status)}</span></div>
                                    <div><strong>Creado</strong><span>{formatDateTime(selectedReport.created_at)}</span></div>
                                    <div><strong>Actualizado</strong><span>{formatDateTime(selectedReport.updated_at)}</span></div>
                                    <div><strong>Módulo</strong><span>{selectedReport.source_module ?? '--'}</span></div>
                                    <div><strong>Ruta</strong><span>{selectedReport.source_path ?? '--'}</span></div>
                                    <div><strong>Adjuntos</strong><span>{selectedReport.attachment_count}</span></div>
                                </div>
                                <div className="ayuda-detail-block">
                                    <strong>Descripción</strong>
                                    <p>{selectedReport.description}</p>
                                </div>
                                {selectedReport.attachments.length > 0 ? (
                                    <div className="ayuda-detail-block">
                                        <strong>Adjuntos</strong>
                                        <div className="ayuda-attachment-list">
                                            {selectedReport.attachments.map((attachment) => (
                                                <div key={attachment.attachment_id} className="ayuda-attachment-row">
                                                    <span>{attachment.original_filename}</span>
                                                    <span>{attachment.mime_type}</span>
                                                    <span>{formatAttachmentSize(attachment.size_bytes)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                                {selectedReport.admin_notes ? (
                                    <div className="ayuda-detail-block">
                                        <strong>Notas</strong>
                                        <p>{selectedReport.admin_notes}</p>
                                    </div>
                                ) : null}
                            </>
                        ) : null}
                        <div className="ayuda-detail-actions">
                            <button type="button" className="ayuda-btn ghost" onClick={() => setSelectedReport(null)}>Cerrar</button>
                        </div>
                    </div>
                </Modal>
            </div>
            <Modal isOpen={showTerms} onClose={() => setShowTerms(false)}><TermsContent /></Modal>
            <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)}><PrivacyContent /></Modal>
        </>
    );
}

function ChevronIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 10 5 5 5-5" />
        </svg>
    );
}
