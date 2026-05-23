import { useCallback, useEffect, useMemo, useState } from 'react';
import '../Plataforma.css';
import './EvaluacionesCompartidas.css';
import { Modal } from '../../../components/Modal/Modal';
import { useAuth } from '../../../hooks/auth/useAuth';
import {
    createQuestionnaireProfessionalReviewV2,
    downloadQuestionnaireHistoryPdfV2,
    generateQuestionnaireHistoryPdfV2,
    getAllQuestionnaireSessionQuestionsV2,
    getQuestionnaireClinicalSummaryV2,
    getQuestionnaireHistoryDetailV2,
    getQuestionnaireHistoryResultsV2,
    getQuestionnaireProfessionalReviewsV2,
    getQuestionnaireReportPreviewV2,
    getQuestionnaireSessionV2,
    getPsychologistQuestionnaireDashboardV2,
    updateQuestionnaireProfessionalReviewV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    PsychologistDashboardDTO,
    PsychologistDashboardItemDTO,
    QuestionnaireProfessionalReviewDTO,
    QuestionnaireReportPreviewDTO,
    QuestionnaireReviewStatus
} from '../../../services/questionnaires/questionnaires.types';
import {
    formatDateTime,
    formatPercent,
    normalizeAlertLevel,
    normalizeBackendText,
    normalizeDomainLabel,
    normalizeReviewStatus,
    normalizeSessionStatus
} from '../../../utils/questionnaires/presentation';
import { buildQuestionnaireAlertPdf, buildQuestionnaireAlertPdfFileName } from '../../../utils/reports/questionnaireAlertPdf';
import { downloadPdfBlob } from '../../../utils/presentation/reportPdf';

const reviewStatusOptions: Array<{ value: QuestionnaireReviewStatus; label: string }> = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_review', label: 'En revisión' },
    { value: 'reviewed', label: 'Revisado' },
    { value: 'orientation_recommended', label: 'Orientación recomendada' },
    { value: 'closed', label: 'Cerrado' }
];

const filterReviewStatusOptions = [{ value: '', label: 'Todos' }, ...reviewStatusOptions];
const filterAlertOptions = [
    { value: '', label: 'Todos' },
    { value: 'low', label: 'Bajo' },
    { value: 'moderate', label: 'Moderado' },
    { value: 'elevated', label: 'Elevado' },
    { value: 'high', label: 'Alto' },
    { value: 'critical_review', label: 'Revisión prioritaria' }
];

const filterDomainOptions = [
    { value: '', label: 'Todos' },
    { value: 'adhd', label: 'TDAH' },
    { value: 'conduct', label: 'Conducta' },
    { value: 'elimination', label: 'Eliminación' },
    { value: 'anxiety', label: 'Ansiedad' },
    { value: 'depression', label: 'Depresión' }
];

function buildAggregateLine(label: string, count: unknown, extra?: string) {
    const countText = Number.isFinite(Number(count)) ? String(count) : '0';
    return extra ? `${label}: ${countText} · ${extra}` : `${label}: ${countText}`;
}

export default function EvaluacionesCompartidas() {
    const { profile } = useAuth();
    const currentUserId = profile?.id ?? null;
    const [query, setQuery] = useState('');
    const [casePublicId, setCasePublicId] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [domain, setDomain] = useState('');
    const [alertLevel, setAlertLevel] = useState('');
    const [reviewStatus, setReviewStatus] = useState('');
    const [dashboard, setDashboard] = useState<PsychologistDashboardDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSession, setActiveSession] = useState<PsychologistDashboardItemDTO | null>(null);
    const [preview, setPreview] = useState<QuestionnaireReportPreviewDTO | null>(null);
    const [reviews, setReviews] = useState<QuestionnaireProfessionalReviewDTO[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [reviewWorking, setReviewWorking] = useState(false);
    const [pdfSessionId, setPdfSessionId] = useState<string | null>(null);
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [reviewNotice, setReviewNotice] = useState<string | null>(null);
    const [reviewStatusValue, setReviewStatusValue] = useState<QuestionnaireReviewStatus>('pending');
    const [initialConcept, setInitialConcept] = useState('');
    const [recommendation, setRecommendation] = useState('');
    const [visibleToGuardian, setVisibleToGuardian] = useState(true);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getPsychologistQuestionnaireDashboardV2({
                q: query || undefined,
                case_public_id: casePublicId || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                domain: domain || undefined,
                alert_level: alertLevel || undefined,
                review_status: reviewStatus || undefined,
                page: 1,
                page_size: 20
            });
            setDashboard(response);
        } catch (requestError) {
            const status = typeof requestError === 'object' && requestError && 'status' in requestError
                ? Number((requestError as { status?: unknown }).status)
                : null;
            setDashboard(null);
            setError(
                status === 403
                    ? 'Esta vista solo está disponible para psicólogos con evaluaciones compartidas.'
                    : 'No fue posible cargar las evaluaciones compartidas. Intenta nuevamente.'
            );
        } finally {
            setLoading(false);
        }
    }, [alertLevel, casePublicId, dateFrom, dateTo, domain, query, reviewStatus]);

    useEffect(() => {
        loadDashboard().catch(() => undefined);
    }, [loadDashboard]);

    const loadDetail = useCallback(async (item: PsychologistDashboardItemDTO | null) => {
        if (!item?.session_id) return;
        setActiveSession(item);
        setDetailLoading(true);
        setDetailError(null);
        setReviewError(null);
        setReviewNotice(null);
        try {
            const [previewResponse, reviewsResponse] = await Promise.allSettled([
                getQuestionnaireReportPreviewV2(item.session_id),
                getQuestionnaireProfessionalReviewsV2(item.session_id)
            ]);
            const nextPreview = previewResponse.status === 'fulfilled' ? previewResponse.value : null;
            const nextReviews = reviewsResponse.status === 'fulfilled'
                ? reviewsResponse.value
                : (nextPreview?.professional_reviews ?? []);
            if (!nextPreview) {
                throw new Error('preview_unavailable');
            }
            setPreview(nextPreview);
            setReviews(nextReviews);
            const ownReview = currentUserId
                ? nextReviews.find((review) => review.psychologist_user_id === currentUserId)
                : null;
            setReviewStatusValue((ownReview?.review_status as QuestionnaireReviewStatus | undefined) ?? (item.review_status as QuestionnaireReviewStatus | undefined) ?? 'pending');
            setInitialConcept(ownReview?.initial_concept ?? '');
            setRecommendation(ownReview?.recommendation ?? '');
            setVisibleToGuardian(ownReview?.visible_to_guardian ?? true);
        } catch {
            setPreview(null);
            setReviews([]);
            setDetailError('No fue posible cargar el detalle de esta evaluación. Intenta nuevamente.');
        } finally {
            setDetailLoading(false);
        }
    }, [currentUserId]);

    const closeDetail = () => {
        setActiveSession(null);
        setPreview(null);
        setReviews([]);
        setDetailLoading(false);
        setDetailError(null);
        setReviewError(null);
        setReviewNotice(null);
        setInitialConcept('');
        setRecommendation('');
        setVisibleToGuardian(true);
        setReviewStatusValue('pending');
    };

    const ownReview = useMemo(
        () => (currentUserId ? reviews.find((review) => review.psychologist_user_id === currentUserId) ?? null : null),
        [currentUserId, reviews]
    );

    const canSaveReview = useMemo(() => {
        const trimmedConcept = initialConcept.trim();
        const trimmedRecommendation = recommendation.trim();
        const currentStatus = ownReview?.review_status ?? activeSession?.review_status ?? 'pending';
        const hasMeaningfulText = trimmedConcept.length > 0 || trimmedRecommendation.length > 0;
        const changed =
            reviewStatusValue !== currentStatus ||
            trimmedConcept !== (ownReview?.initial_concept ?? '').trim() ||
            trimmedRecommendation !== (ownReview?.recommendation ?? '').trim() ||
            visibleToGuardian !== (ownReview?.visible_to_guardian ?? true);

        return changed && (hasMeaningfulText || reviewStatusValue === 'in_review' || reviewStatusValue === 'pending');
    }, [activeSession?.review_status, initialConcept, ownReview, recommendation, reviewStatusValue, visibleToGuardian]);

    const handleSaveReview = async () => {
        if (!activeSession?.session_id || !activeSession.can_review || !canSaveReview) return;
        setReviewWorking(true);
        setReviewError(null);
        setReviewNotice(null);
        try {
            const payload = {
                review_status: reviewStatusValue,
                initial_concept: initialConcept.trim(),
                recommendation: recommendation.trim(),
                visible_to_guardian: visibleToGuardian
            };
            if (ownReview?.review_id) {
                await updateQuestionnaireProfessionalReviewV2(activeSession.session_id, ownReview.review_id, payload);
                setReviewNotice('La observación profesional se actualizó correctamente.');
            } else {
                await createQuestionnaireProfessionalReviewV2(activeSession.session_id, payload);
                setReviewNotice('La observación profesional se guardó correctamente.');
            }
            const updatedReviews = await getQuestionnaireProfessionalReviewsV2(activeSession.session_id);
            setReviews(updatedReviews);
        } catch {
            setReviewError('No fue posible guardar la observación profesional. Intenta nuevamente.');
        } finally {
            setReviewWorking(false);
        }
    };

    const handleDownloadPdf = async (item: PsychologistDashboardItemDTO) => {
        if (!item.session_id || !item.can_download_pdf) return;
        setPdfSessionId(item.session_id);
        try {
            const [previewResponse, reviewsResponse, detailResponse, resultsResponse, summaryResponse, snapshotResponse, questionsResponse] = await Promise.allSettled([
                getQuestionnaireReportPreviewV2(item.session_id),
                getQuestionnaireProfessionalReviewsV2(item.session_id),
                getQuestionnaireHistoryDetailV2(item.session_id),
                getQuestionnaireHistoryResultsV2(item.session_id),
                getQuestionnaireClinicalSummaryV2(item.session_id),
                getQuestionnaireSessionV2(item.session_id),
                getAllQuestionnaireSessionQuestionsV2(item.session_id)
            ]);

            const previewPayload = previewResponse.status === 'fulfilled' ? previewResponse.value : null;
            const professionalReviews = reviewsResponse.status === 'fulfilled' ? reviewsResponse.value : [];
            const detailPayload = detailResponse.status === 'fulfilled' ? detailResponse.value : null;
            const resultsPayload = resultsResponse.status === 'fulfilled' ? resultsResponse.value : null;
            const summaryPayload = summaryResponse.status === 'fulfilled' ? summaryResponse.value : null;
            const sessionSnapshot = snapshotResponse.status === 'fulfilled' ? snapshotResponse.value : null;
            const sessionQuestions = questionsResponse.status === 'fulfilled' ? questionsResponse.value : [];

            const blob = await buildQuestionnaireAlertPdf({
                sessionId: item.session_id,
                results: resultsPayload,
                clinicalSummary: summaryPayload,
                sessionDetail: detailPayload,
                sessionSnapshot,
                sessionQuestions,
                reportPreview: previewPayload,
                professionalReviews,
                audience: 'psychologist'
            });

            downloadPdfBlob(blob, buildQuestionnaireAlertPdfFileName(sessionSnapshot ?? detailPayload ?? { role: 'psychologist' }));
        } catch {
            try {
                await generateQuestionnaireHistoryPdfV2(item.session_id);
                const { blob, filename } = await downloadQuestionnaireHistoryPdfV2(item.session_id);
                downloadPdfBlob(blob, filename);
            } catch {
                setError('No fue posible descargar el PDF de apoyo profesional.');
            }
        } finally {
            setPdfSessionId(null);
        }
    };

    const summary = dashboard?.summary ?? null;
    const items = dashboard?.items ?? [];
    const emptyState = !loading && items.length === 0;

    return (
        <div className="plataforma-view">
            <section className="evaluaciones-compartidas" aria-label="Evaluaciones compartidas conmigo">
                <div className="evaluaciones-header">
                    <div>
                        <h1>Evaluaciones recibidas</h1>
                        <p>
                            Revisa evaluaciones compartidas contigo y registra observaciones profesionales orientativas sin convertirlas en diagnóstico.
                        </p>
                    </div>
                    <button type="button" className="evaluaciones-refresh" onClick={() => loadDashboard().catch(() => undefined)}>
                        Actualizar
                    </button>
                </div>

                <div className="evaluaciones-filters">
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o correo" />
                    <input value={casePublicId} onChange={(event) => setCasePublicId(event.target.value)} placeholder="Caso público" />
                    <select value={domain} onChange={(event) => setDomain(event.target.value)}>
                        {filterDomainOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <select value={alertLevel} onChange={(event) => setAlertLevel(event.target.value)}>
                        {filterAlertOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)}>
                        {filterReviewStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                    <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                </div>

                {error ? <div className="evaluaciones-alert error">{error}</div> : null}

                {loading ? <div className="evaluaciones-empty">Cargando evaluaciones...</div> : null}

                {!loading && summary ? (
                    <div className="evaluaciones-summary-grid">
                        <article><strong>Sesiones compartidas</strong><span>{summary.total_shared_sessions ?? 0}</span></article>
                        <article><strong>Casos</strong><span>{summary.total_cases ?? 0}</span></article>
                        <article><strong>Revisiones pendientes</strong><span>{summary.pending_reviews ?? 0}</span></article>
                        <article><strong>Casos revisados</strong><span>{summary.reviewed_cases ?? 0}</span></article>
                        <article><strong>Mayor alerta</strong><span>{normalizeAlertLevel(summary.highest_alert_level)}</span></article>
                    </div>
                ) : null}

                {!loading && dashboard?.aggregates ? (
                    <div className="evaluaciones-aggregates">
                        <section>
                            <h2>Por dominio</h2>
                            <ul>
                                {(dashboard.aggregates.by_domain ?? []).map((item, index) => (
                                    <li key={`domain-${index}`}>{buildAggregateLine(normalizeDomainLabel(item.domain), item.count, item.max_probability !== null && item.max_probability !== undefined ? formatPercent(item.max_probability) : undefined)}</li>
                                ))}
                            </ul>
                        </section>
                        <section>
                            <h2>Por alerta</h2>
                            <ul>
                                {(dashboard.aggregates.by_alert_level ?? []).map((item, index) => (
                                    <li key={`alert-${index}`}>{buildAggregateLine(normalizeAlertLevel(item.alert_level), item.count)}</li>
                                ))}
                            </ul>
                        </section>
                        <section>
                            <h2>Por revisión</h2>
                            <ul>
                                {(dashboard.aggregates.by_review_status ?? []).map((item, index) => (
                                    <li key={`review-${index}`}>{buildAggregateLine(normalizeReviewStatus(item.review_status), item.count)}</li>
                                ))}
                            </ul>
                        </section>
                    </div>
                ) : null}

                {emptyState ? (
                    <div className="evaluaciones-empty-card">
                        <h2>No tienes evaluaciones compartidas.</h2>
                        <p>Cuando un padre o tutor comparta una evaluación contigo, aparecerá aquí para revisión profesional.</p>
                    </div>
                ) : null}

                {!loading && items.length > 0 ? (
                    <div className="evaluaciones-list">
                        {items.map((item) => (
                            <article key={item.session_id} className="evaluaciones-card">
                                <div className="evaluaciones-card-top">
                                    <div>
                                        <h2>{item.case_public_id ?? 'Caso sin código público'}</h2>
                                        <p>{normalizeBackendText(item.guardian?.display_name, 'Acudiente no disponible')}</p>
                                    </div>
                                    <span className="evaluaciones-badge">{normalizeReviewStatus(item.review_status)}</span>
                                </div>

                                <div className="evaluaciones-card-meta">
                                    <div>
                                        <strong>Estado</strong>
                                        <span>{normalizeSessionStatus(item.status)}</span>
                                    </div>
                                    <div>
                                        <strong>Procesado</strong>
                                        <span>{formatDateTime(item.processed_at)}</span>
                                    </div>
                                    <div>
                                        <strong>Revisión profesional</strong>
                                        <span>{item.needs_professional_review ? 'Sí' : 'No'}</span>
                                    </div>
                                </div>

                                <div className="evaluaciones-card-domains">
                                    {(item.domains ?? []).map((domainItem) => (
                                        <div key={`${item.session_id}-${domainItem.domain}`} className="evaluaciones-domain-pill">
                                            <strong>{normalizeDomainLabel(domainItem.domain)}</strong>
                                            <span>{formatPercent(domainItem.probability)}</span>
                                            <small>{normalizeAlertLevel(domainItem.alert_level)}</small>
                                        </div>
                                    ))}
                                </div>

                                <div className="evaluaciones-card-actions">
                                    <button type="button" onClick={() => loadDetail(item).catch(() => undefined)}>
                                        Ver detalle
                                    </button>
                                    {item.can_review ? (
                                        <button type="button" onClick={() => loadDetail(item).catch(() => undefined)}>
                                            Agregar o editar revisión
                                        </button>
                                    ) : null}
                                    {item.can_download_pdf ? (
                                        <button type="button" onClick={() => { handleDownloadPdf(item).catch(() => undefined); }}>
                                            {pdfSessionId === item.session_id ? 'Generando PDF...' : 'Descargar PDF'}
                                        </button>
                                    ) : null}
                                </div>
                            </article>
                        ))}
                    </div>
                ) : null}
            </section>

            <Modal isOpen={activeSession !== null} onClose={closeDetail}>
                <div className="evaluaciones-detail-modal">
                    <h2>Detalle de evaluación</h2>
                    <p className="evaluaciones-detail-copy">
                        Este reporte resume la información registrada por el acudiente y los resultados orientativos del sistema para apoyar la revisión profesional. La información debe interpretarse junto con entrevista clínica, contexto familiar o escolar y criterio profesional.
                    </p>

                    {detailLoading ? <div className="evaluaciones-empty">Cargando detalle...</div> : null}
                    {detailError ? <div className="evaluaciones-alert error">{detailError}</div> : null}

                    {!detailLoading && preview ? (
                        <>
                            <div className="evaluaciones-detail-grid">
                                <div><strong>Caso</strong><span>{activeSession?.case_public_id ?? '--'}</span></div>
                                <div><strong>Estado</strong><span>{normalizeSessionStatus(preview.session?.status ?? activeSession?.status)}</span></div>
                                <div><strong>Procesado</strong><span>{formatDateTime(activeSession?.processed_at ?? preview.session?.updated_at)}</span></div>
                                <div><strong>PDF servidor</strong><span>{preview.pdf?.available ? 'Disponible' : 'No disponible'}</span></div>
                            </div>

                            <div className="evaluaciones-detail-section">
                                <h3>Resultados por dominio</h3>
                                {(preview.domains ?? []).length > 0 ? (
                                    <div className="evaluaciones-detail-domains">
                                        {preview.domains.map((domainItem, index) => (
                                            <div key={`${domainItem.domain}-${index}`} className="evaluaciones-domain-pill">
                                                <strong>{normalizeDomainLabel(domainItem.domain)}</strong>
                                                <span>{formatPercent(domainItem.probability)}</span>
                                                <small>{normalizeAlertLevel(domainItem.alert_level)}</small>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p>Sin resultados de dominio disponibles.</p>
                                )}
                            </div>

                            <div className="evaluaciones-detail-section">
                                <h3>Respuestas registradas</h3>
                                {(preview.answers ?? []).length > 0 ? (
                                    <div className="evaluaciones-answer-list">
                                        {preview.answers.map((answer, index) => (
                                            <div key={`${answer.question_id ?? answer.question_code ?? index}`} className="evaluaciones-answer-row">
                                                <strong>{normalizeBackendText(answer.prompt, 'Pregunta no disponible')}</strong>
                                                <span>{normalizeBackendText(answer.normalized_answer ?? answer.raw_answer_display, '--')}</span>
                                                <small>{normalizeDomainLabel(answer.domain)} · {normalizeBackendText(answer.section_title, 'General')}</small>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p>Sin respuestas estructuradas disponibles para esta evaluación.</p>
                                )}
                            </div>

                            <div className="evaluaciones-detail-section">
                                <h3>Revisiones profesionales</h3>
                                {reviews.length > 0 ? (
                                    <div className="evaluaciones-review-list">
                                        {reviews.map((review) => (
                                            <article key={review.review_id} className="evaluaciones-review-card">
                                                <strong>{normalizeReviewStatus(review.review_status)}</strong>
                                                <p><span>Concepto inicial:</span> {normalizeBackendText(review.initial_concept, 'Sin concepto registrado')}</p>
                                                <p><span>Recomendación profesional:</span> {normalizeBackendText(review.recommendation, 'Sin recomendación registrada')}</p>
                                                <small>{review.visible_to_guardian ? 'Visible para padre/tutor' : 'Solo visible para profesional'}</small>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <p>Sin revisiones profesionales.</p>
                                )}
                            </div>

                            {activeSession?.can_review ? (
                                <div className="evaluaciones-detail-section">
                                    <h3>Observación profesional</h3>
                                    <p className="evaluaciones-helper">
                                        Describe una orientación inicial basada en la información disponible. No debe formularse como diagnóstico.
                                    </p>
                                    <label className="evaluaciones-field">
                                        <span>Estado de revisión</span>
                                        <select value={reviewStatusValue} onChange={(event) => setReviewStatusValue(event.target.value as QuestionnaireReviewStatus)}>
                                            {reviewStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                        </select>
                                    </label>
                                    <label className="evaluaciones-field">
                                        <span>Concepto inicial</span>
                                        <textarea value={initialConcept} maxLength={2000} onChange={(event) => setInitialConcept(event.target.value)} />
                                    </label>
                                    <label className="evaluaciones-field">
                                        <span>Recomendación profesional</span>
                                        <textarea value={recommendation} maxLength={2000} onChange={(event) => setRecommendation(event.target.value)} />
                                    </label>
                                    <label className="evaluaciones-checkbox">
                                        <input type="checkbox" checked={visibleToGuardian} onChange={(event) => setVisibleToGuardian(event.target.checked)} />
                                        <span>Si está activo, el padre o tutor podrá ver este concepto en su reporte o detalle.</span>
                                    </label>
                                    {reviewError ? <div className="evaluaciones-alert error">{reviewError}</div> : null}
                                    {reviewNotice ? <div className="evaluaciones-alert success">{reviewNotice}</div> : null}
                                    <div className="evaluaciones-detail-actions">
                                        <button type="button" onClick={() => { handleSaveReview().catch(() => undefined); }} disabled={!canSaveReview || reviewWorking}>
                                            {reviewWorking ? 'Guardando...' : 'Guardar observación'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="evaluaciones-alert">Esta evaluación no permite registrar revisión profesional desde tu cuenta.</div>
                            )}
                        </>
                    ) : null}
                </div>
            </Modal>
        </div>
    );
}
