import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireProfessionalReviewDTO,
    QuestionnaireQuestionV2DTO,
    QuestionnaireReportPreviewDTO,
    QuestionnaireReviewStatus
} from '../../../services/questionnaires/questionnaires.types';
import {
    formatDateTime,
    formatPercent,
    normalizeAlertLevel,
    normalizeBackendText,
    normalizeBooleanLabel,
    normalizeDomainLabel,
    normalizeReviewStatus,
    normalizeSessionStatus
} from '../../../utils/questionnaires/presentation';
import { resolveAnsweredQuestionRows } from '../../../utils/questionnaires/answeredQuestions';
import { buildQuestionnaireAlertPdf, buildQuestionnaireAlertPdfFileName } from '../../../utils/reports/questionnaireAlertPdf';
import { downloadPsychologistFollowUpReportPdf } from '../../../utils/reports/psychologistFollowUpPdf';
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

const reportPeriodOptions = [
    { value: '3', label: '3 meses' },
    { value: '6', label: '6 meses' },
    { value: '12', label: '12 meses' },
    { value: 'custom', label: 'Personalizado' }
] as const;

type ReportPeriodValue = (typeof reportPeriodOptions)[number]['value'];

function buildAggregateLine(label: string, count: unknown, extra?: string) {
    const countText = Number.isFinite(Number(count)) ? String(count) : '0';
    return extra ? `${label}: ${countText} · ${extra}` : `${label}: ${countText}`;
}

function buildInitialReportDates(monthsBack: number) {
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - monthsBack);
    return {
        dateFrom: start.toISOString().slice(0, 10),
        dateTo: end.toISOString().slice(0, 10)
    };
}

function buildPsychologistReportPeriodLabel(period: ReportPeriodValue, dateFrom: string, dateTo: string) {
    if (period === 'custom') {
        const fromLabel = dateFrom ? formatDateTime(dateFrom).split(',')[0] ?? 'Fecha no disponible' : 'Fecha no disponible';
        const toLabel = dateTo ? formatDateTime(dateTo).split(',')[0] ?? 'Fecha no disponible' : 'Fecha no disponible';
        return `Del ${fromLabel} al ${toLabel}`;
    }
    return `Últimos ${period} meses`;
}

export default function EvaluacionesCompartidas() {
    const location = useLocation();
    const navigate = useNavigate();
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
    const [detailSession, setDetailSession] = useState<QuestionnaireHistoryDetailV2DTO | null>(null);
    const [detailQuestions, setDetailQuestions] = useState<QuestionnaireQuestionV2DTO[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [reviewWorking, setReviewWorking] = useState(false);
    const [pdfSessionId, setPdfSessionId] = useState<string | null>(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportWorking, setReportWorking] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportPeriod, setReportPeriod] = useState<ReportPeriodValue>('3');
    const [reportDateFrom, setReportDateFrom] = useState('');
    const [reportDateTo, setReportDateTo] = useState('');
    const [reportCasePublicId, setReportCasePublicId] = useState('');
    const [reportDomain, setReportDomain] = useState('');
    const [reportAlertLevel, setReportAlertLevel] = useState('');
    const [reportReviewStatus, setReportReviewStatus] = useState('');
    const [reportIncludeAggregates, setReportIncludeAggregates] = useState(true);
    const [reportIncludeEvaluations, setReportIncludeEvaluations] = useState(true);
    const [reportIncludeCharts, setReportIncludeCharts] = useState(true);
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [reviewNotice, setReviewNotice] = useState<string | null>(null);
    const [reviewStatusValue, setReviewStatusValue] = useState<QuestionnaireReviewStatus>('pending');
    const [initialConcept, setInitialConcept] = useState('');
    const [recommendation, setRecommendation] = useState('');
    const [visibleToGuardian, setVisibleToGuardian] = useState(true);
    const locationState = (location.state ?? {}) as { openEvaluationSessionId?: string } | null;

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
            const [previewResponse, reviewsResponse, detailResponse, questionsResponse] = await Promise.allSettled([
                getQuestionnaireReportPreviewV2(item.session_id),
                getQuestionnaireProfessionalReviewsV2(item.session_id),
                getQuestionnaireHistoryDetailV2(item.session_id),
                getAllQuestionnaireSessionQuestionsV2(item.session_id)
            ]);
            const nextPreview = previewResponse.status === 'fulfilled' ? previewResponse.value : null;
            const nextReviews = reviewsResponse.status === 'fulfilled'
                ? reviewsResponse.value
                : (nextPreview?.professional_reviews ?? []);
            const nextDetail = detailResponse.status === 'fulfilled' ? detailResponse.value : null;
            const nextQuestions = questionsResponse.status === 'fulfilled' ? questionsResponse.value : [];
            if (!nextPreview) {
                throw new Error('preview_unavailable');
            }
            setPreview(nextPreview);
            setReviews(nextReviews);
            setDetailSession(nextDetail);
            setDetailQuestions(Array.isArray(nextQuestions) ? nextQuestions : []);
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
            setDetailSession(null);
            setDetailQuestions([]);
            setDetailError('No fue posible cargar el detalle de esta evaluación. Intenta nuevamente.');
        } finally {
            setDetailLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        if (!locationState?.openEvaluationSessionId || !dashboard?.items?.length) return;
        const matchingItem = dashboard.items.find((item) => item.session_id === locationState.openEvaluationSessionId) ?? null;
        if (matchingItem) {
            loadDetail(matchingItem).catch(() => undefined);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [dashboard?.items, loadDetail, location.pathname, locationState?.openEvaluationSessionId, navigate]);

    const closeDetail = () => {
        setActiveSession(null);
        setPreview(null);
        setReviews([]);
        setDetailSession(null);
        setDetailQuestions([]);
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
    const answeredQuestionRows = useMemo(
        () =>
            resolveAnsweredQuestionRows({
                reportPreview: preview,
                sessionQuestions: detailQuestions,
                sessionDetail: detailSession
            }),
        [detailQuestions, detailSession, preview]
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

    const openReportModal = () => {
        const currentPeriodDefaults = buildInitialReportDates(3);
        setReportPeriod(dateFrom || dateTo ? 'custom' : '3');
        setReportDateFrom(dateFrom || currentPeriodDefaults.dateFrom);
        setReportDateTo(dateTo || currentPeriodDefaults.dateTo);
        setReportCasePublicId(casePublicId);
        setReportDomain(domain);
        setReportAlertLevel(alertLevel);
        setReportReviewStatus(reviewStatus);
        setReportIncludeAggregates(true);
        setReportIncludeEvaluations(true);
        setReportIncludeCharts(true);
        setReportError(null);
        setReportModalOpen(true);
    };

    const closeReportModal = () => {
        if (reportWorking) return;
        setReportModalOpen(false);
        setReportError(null);
    };

    const loadDashboardForReport = useCallback(async () => {
        const resolvedDates =
            reportPeriod === 'custom'
                ? {
                    from: reportDateFrom || undefined,
                    to: reportDateTo || undefined
                }
                : (() => {
                    const defaults = buildInitialReportDates(Number(reportPeriod));
                    return {
                        from: defaults.dateFrom,
                        to: defaults.dateTo
                    };
                })();

        const baseParams = {
            q: query || undefined,
            case_public_id: reportCasePublicId || undefined,
            date_from: resolvedDates.from,
            date_to: resolvedDates.to,
            domain: reportDomain || undefined,
            alert_level: reportAlertLevel || undefined,
            review_status: reportReviewStatus || undefined
        };

        const firstPage = await getPsychologistQuestionnaireDashboardV2({
            ...baseParams,
            page: 1,
            page_size: 100
        });

        const totalPages = Math.max(1, Number(firstPage.pagination?.pages ?? 1));
        if (totalPages === 1) {
            return firstPage;
        }

        const otherPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
                getPsychologistQuestionnaireDashboardV2({
                    ...baseParams,
                    page: index + 2,
                    page_size: 100
                })
            )
        );

        return {
            ...firstPage,
            items: [firstPage, ...otherPages].flatMap((page) => page.items ?? []),
            pagination: {
                ...firstPage.pagination,
                page: 1,
                page_size: 100,
                pages: totalPages
            }
        };
    }, [
        query,
        reportAlertLevel,
        reportCasePublicId,
        reportDateFrom,
        reportDateTo,
        reportDomain,
        reportPeriod,
        reportReviewStatus,
    ]);

    const handleGenerateProfessionalReport = async () => {
        if (reportPeriod === 'custom' && (!reportDateFrom || !reportDateTo)) {
            setReportError('Selecciona un rango de fechas para el periodo personalizado.');
            return;
        }

        setReportWorking(true);
        setReportError(null);
        try {
            const reportDashboard = await loadDashboardForReport();
            downloadPsychologistFollowUpReportPdf({
                dashboard: reportDashboard,
                options: {
                    periodLabel: buildPsychologistReportPeriodLabel(reportPeriod, reportDateFrom, reportDateTo),
                    casePublicId: reportCasePublicId || null,
                    domain: reportDomain || null,
                    alertLevel: reportAlertLevel || null,
                    reviewStatus: reportReviewStatus || null,
                    includeAggregates: reportIncludeAggregates,
                    includeEvaluations: reportIncludeEvaluations,
                    includeCharts: reportIncludeCharts
                }
            });
            setReportModalOpen(false);
            setError(null);
        } catch {
            setReportError('No fue posible generar el reporte de seguimiento profesional. Intenta nuevamente.');
        } finally {
            setReportWorking(false);
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
                    <div className="evaluaciones-header-actions">
                        <button type="button" className="evaluaciones-refresh" onClick={openReportModal}>
                            Descargar reporte de seguimiento
                        </button>
                        <button type="button" className="evaluaciones-refresh" onClick={() => loadDashboard().catch(() => undefined)}>
                            Actualizar
                        </button>
                    </div>
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
                        <p>Cuando aceptes solicitudes de revisión, aparecerán aquí para tu revisión profesional.</p>
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
                                        <span>{normalizeBooleanLabel(item.needs_professional_review)}</span>
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
                                {answeredQuestionRows.length > 0 ? (
                                    <div className="evaluaciones-answer-list">
                                        {answeredQuestionRows.map((answer) => (
                                            <div key={answer.key} className="evaluaciones-answer-row">
                                                <strong>{answer.questionText}</strong>
                                                <span>{answer.answerLabel}</span>
                                                <small>{answer.domainLabel} · {answer.sectionLabel}</small>
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
                                                <small>
                                                    Visible para padre/tutor: {normalizeBooleanLabel(review.visible_to_guardian)} · Estado de revisión: {normalizeReviewStatus(review.review_status)}
                                                </small>
                                                <small>
                                                    Actualizada: {formatDateTime(review.updated_at)} · {review.is_diagnostic === false ? 'No diagnóstico' : 'Documento profesional'}
                                                </small>
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

            <Modal isOpen={reportModalOpen} onClose={closeReportModal}>
                <div className="evaluaciones-detail-modal">
                    <h2>Generar reporte profesional</h2>
                    <p className="evaluaciones-detail-copy">
                        Configura el alcance del reporte. El documento se generará desde las evaluaciones aceptadas visibles en tu dashboard, sin mezclar solicitudes pendientes como evaluaciones activas.
                    </p>

                    <div className="evaluaciones-report-form">
                        <label className="evaluaciones-field">
                            <span>Periodo</span>
                            <select value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value as ReportPeriodValue)}>
                                {reportPeriodOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {reportPeriod === 'custom' ? (
                            <>
                                <label className="evaluaciones-field">
                                    <span>Fecha inicial</span>
                                    <input type="date" value={reportDateFrom} onChange={(event) => setReportDateFrom(event.target.value)} />
                                </label>
                                <label className="evaluaciones-field">
                                    <span>Fecha final</span>
                                    <input type="date" value={reportDateTo} onChange={(event) => setReportDateTo(event.target.value)} />
                                </label>
                            </>
                        ) : null}

                        <label className="evaluaciones-field">
                            <span>Caso público</span>
                            <input
                                type="text"
                                value={reportCasePublicId}
                                placeholder="Todos los casos"
                                onChange={(event) => setReportCasePublicId(event.target.value)}
                            />
                        </label>

                        <label className="evaluaciones-field">
                            <span>Dominio</span>
                            <select value={reportDomain} onChange={(event) => setReportDomain(event.target.value)}>
                                {filterDomainOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="evaluaciones-field">
                            <span>Nivel de alerta</span>
                            <select value={reportAlertLevel} onChange={(event) => setReportAlertLevel(event.target.value)}>
                                {filterAlertOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="evaluaciones-field">
                            <span>Estado de revisión</span>
                            <select value={reportReviewStatus} onChange={(event) => setReportReviewStatus(event.target.value)}>
                                {filterReviewStatusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="evaluaciones-report-toggles">
                        <label className="evaluaciones-checkbox">
                            <input type="checkbox" checked={reportIncludeAggregates} onChange={(event) => setReportIncludeAggregates(event.target.checked)} />
                            <span>Incluir agregados y distribuciones</span>
                        </label>
                        <label className="evaluaciones-checkbox">
                            <input type="checkbox" checked={reportIncludeEvaluations} onChange={(event) => setReportIncludeEvaluations(event.target.checked)} />
                            <span>Incluir listado de evaluaciones</span>
                        </label>
                        <label className="evaluaciones-checkbox">
                            <input type="checkbox" checked={reportIncludeCharts} onChange={(event) => setReportIncludeCharts(event.target.checked)} />
                            <span>Incluir gráficas</span>
                        </label>
                    </div>

                    {reportError ? <div className="evaluaciones-alert error">{reportError}</div> : null}

                    <div className="evaluaciones-detail-actions">
                        <button type="button" onClick={closeReportModal} disabled={reportWorking}>
                            Cancelar
                        </button>
                        <button type="button" onClick={() => { handleGenerateProfessionalReport().catch(() => undefined); }} disabled={reportWorking}>
                            {reportWorking ? 'Generando...' : 'Descargar reporte'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
