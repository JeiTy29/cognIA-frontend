import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../Plataforma.css';
import './EvaluacionesCompartidas.css';
import {
    AreaChart,
    DashboardSection,
    DonutChart,
    HorizontalBarChart,
    HistogramChart,
} from '../../../components/DashboardCharts';
import { Modal } from '../../../components/Modal/Modal';
import { QuestionnaireReportDetailModal } from '../../../components/questionnaires/QuestionnaireReportDetailModal';
import { QuestionnaireResponseGroups } from '../../../components/questionnaires/QuestionnaireResponseGroups';
import { useAuth } from '../../../hooks/auth/useAuth';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import {
    createQuestionnaireProfessionalReviewV2,
    downloadQuestionnaireHistoryPdfV2,
    generateQuestionnaireHistoryPdfV2,
    getAllQuestionnaireSessionQuestionsV2,
    getQuestionnaireHistoryDetailV2,
    getQuestionnaireHistoryResponsesV2,
    getQuestionnaireProfessionalReviewsV2,
    getQuestionnaireReportPreviewV2,
    getPsychologistQuestionnaireDashboardV2,
    updateQuestionnaireProfessionalReviewV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    PsychologistDashboardDTO,
    PsychologistDashboardItemDTO,
    QuestionnaireDashboardChartSourceDTO,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireHistoryResponsesV2Response,
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
import { getChartItems } from '../../../utils/questionnaires/chartContract';
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
        const fromLabel = dateFrom ? formatDateTime(dateFrom).split(',')[0] ?? 'Sin fecha registrada' : 'Sin fecha registrada';
        const toLabel = dateTo ? formatDateTime(dateTo).split(',')[0] ?? 'Sin fecha registrada' : 'Sin fecha registrada';
        return `Del ${fromLabel} al ${toLabel}`;
    }
    return `Últimos ${period} meses`;
}

function resolveEvaluationCaseLabel(item: PsychologistDashboardItemDTO | null | undefined) {
    if (!item) return 'Caso sin código público';
    const record = item as Record<string, unknown>;
    const displayLabel = normalizeBackendText(record.case_display_label ?? record.display_label ?? record.private_label, '');
    const publicId = normalizeBackendText(item.case_public_id, '');
    if (displayLabel && publicId && displayLabel !== publicId) return `${displayLabel} - ${publicId}`;
    if (displayLabel) return displayLabel;
    if (publicId) return `Caso ${publicId}`;
    return 'Caso sin código público';
}

function chartValue(record: Record<string, unknown>) {
    const parsed = Number(record.value ?? record.count ?? record.total ?? record.sessions);
    return Number.isFinite(parsed) ? parsed : 0;
}

function chartLabel(record: Record<string, unknown>, type: 'domain' | 'alert' | 'review' | 'time' | 'case' | 'age') {
    const raw = record.label ?? record.name ?? record.domain ?? record.alert_level ?? record.review_status ?? record.case_public_id ?? record.month ?? record.date ?? record.key;
    if (type === 'domain') return normalizeDomainLabel(raw);
    if (type === 'alert') return normalizeAlertLevel(raw);
    if (type === 'review') return normalizeReviewStatus(raw);
    return normalizeBackendText(raw, 'Sin clasificar');
}

function chartItemsFromUnknown(points: QuestionnaireDashboardChartSourceDTO | unknown, type: 'domain' | 'alert' | 'review' | 'time' | 'case' | 'age') {
    return getChartItems(points as QuestionnaireDashboardChartSourceDTO | null | undefined)
        .map((point) => (point && typeof point === 'object' ? point as Record<string, unknown> : null))
        .filter((point): point is Record<string, unknown> => Boolean(point))
        .map((point) => ({ label: chartLabel(point, type), value: chartValue(point) }))
        .filter((item) => Number.isFinite(item.value) && item.value > 0);
}
export default function EvaluacionesCompartidas() {
    const location = useLocation();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const currentUserId = profile?.id ?? null;
    const defaultDateRange = useMemo(() => buildInitialReportDates(3), []);
    const [query, setQuery] = useState('');
    const [casePublicId, setCasePublicId] = useState('');
    const [dateFrom, setDateFrom] = useState(defaultDateRange.dateFrom);
    const [dateTo, setDateTo] = useState(defaultDateRange.dateTo);
    const [domain, setDomain] = useState('');
    const [alertLevel, setAlertLevel] = useState('');
    const [reviewStatus, setReviewStatus] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [dashboard, setDashboard] = useState<PsychologistDashboardDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSession, setActiveSession] = useState<PsychologistDashboardItemDTO | null>(null);
    const [normalizedDetailSessionId, setNormalizedDetailSessionId] = useState<string | null>(null);
    const [preview, setPreview] = useState<QuestionnaireReportPreviewDTO | null>(null);
    const [reviews, setReviews] = useState<QuestionnaireProfessionalReviewDTO[]>([]);
    const [detailSession, setDetailSession] = useState<QuestionnaireHistoryDetailV2DTO | null>(null);
    const [detailResponses, setDetailResponses] = useState<QuestionnaireHistoryResponsesV2Response | null>(null);
    const [detailQuestions, setDetailQuestions] = useState<QuestionnaireQuestionV2DTO[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailArtifactsLoading, setDetailArtifactsLoading] = useState(false);
    const detailRequestRef = useRef(0);
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
    const debouncedQuery = useDebouncedValue(query, 350);
    const debouncedCasePublicId = useDebouncedValue(casePublicId, 350);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getPsychologistQuestionnaireDashboardV2({
                q: debouncedQuery.trim() || undefined,
                case_public_id: debouncedCasePublicId.trim() || undefined,
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
    }, [alertLevel, dateFrom, dateTo, debouncedCasePublicId, debouncedQuery, domain, reviewStatus]);

    useEffect(() => {
        loadDashboard().catch(() => undefined);
    }, [loadDashboard]);

    const loadDetail = useCallback(async (item: PsychologistDashboardItemDTO | null) => {
        if (!item?.session_id) return;
        const requestId = detailRequestRef.current + 1;
        detailRequestRef.current = requestId;
        setActiveSession(item);
        setDetailLoading(false);
        setDetailArtifactsLoading(true);
        setDetailError(null);
        setReviewError(null);
        setReviewNotice(null);
        setPreview(null);
        setReviews([]);
        setDetailSession(null);
        setDetailResponses(null);
        setDetailQuestions([]);
        setReviewStatusValue((item.review_status as QuestionnaireReviewStatus | undefined) ?? 'pending');
        setInitialConcept('');
        setRecommendation('');
        setVisibleToGuardian(true);

        let loadedAnything = false;
        const markLoaded = () => { loadedAnything = true; };
        const secondaryTasks: Promise<unknown>[] = [
            getQuestionnaireReportPreviewV2(item.session_id)
                .then((nextPreview) => {
                    if (detailRequestRef.current !== requestId) return;
                    markLoaded();
                    setPreview(nextPreview);
                    if (nextPreview.professional_reviews?.length) {
                        setReviews(nextPreview.professional_reviews);
                    }
                })
                .catch(() => undefined),
            getQuestionnaireProfessionalReviewsV2(item.session_id)
                .then((nextReviews) => {
                    if (detailRequestRef.current !== requestId) return;
                    markLoaded();
                    setReviews(nextReviews);
                    const review = currentUserId
                        ? nextReviews.find((itemReview: { psychologist_user_id?: string | null }) => itemReview.psychologist_user_id === currentUserId)
                        : null;
                    setReviewStatusValue((review?.review_status as QuestionnaireReviewStatus | undefined) ?? (item.review_status as QuestionnaireReviewStatus | undefined) ?? 'pending');
                    setInitialConcept(review?.initial_concept ?? '');
                    setRecommendation(review?.recommendation ?? '');
                    setVisibleToGuardian(review?.visible_to_guardian ?? true);
                })
                .catch(() => undefined),
            getQuestionnaireHistoryDetailV2(item.session_id)
                .then((nextDetail) => {
                    if (detailRequestRef.current !== requestId) return;
                    markLoaded();
                    setDetailSession(nextDetail);
                })
                .catch(() => undefined),
            getQuestionnaireHistoryResponsesV2(item.session_id)
                .then((nextResponses) => {
                    if (detailRequestRef.current !== requestId) return;
                    markLoaded();
                    setDetailResponses(nextResponses);
                })
                .catch(() => {
                    if (detailRequestRef.current === requestId) setDetailResponses({ items: [], warnings: [] });
                }),
            getAllQuestionnaireSessionQuestionsV2(item.session_id)
                .then((nextQuestions) => {
                    if (detailRequestRef.current !== requestId) return;
                    markLoaded();
                    setDetailQuestions(Array.isArray(nextQuestions) ? nextQuestions : []);
                })
                .catch(() => undefined)
        ];

        Promise.allSettled(secondaryTasks).finally(() => {
            if (detailRequestRef.current !== requestId) return;
            setDetailArtifactsLoading(false);
            if (!loadedAnything) {
                setDetailError('No fue posible cargar el detalle de esta evaluación. Intenta nuevamente.');
            }
        });
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
        detailRequestRef.current += 1;
        setActiveSession(null);
        setPreview(null);
        setReviews([]);
        setDetailSession(null);
        setDetailResponses(null);
        setDetailQuestions([]);
        setDetailLoading(false);
        setDetailArtifactsLoading(false);
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
            await generateQuestionnaireHistoryPdfV2(item.session_id);
            const { blob, filename } = await downloadQuestionnaireHistoryPdfV2(item.session_id);
            downloadPdfBlob(blob, filename || `Reporte CognIA - ${item.case_public_id ?? item.session_id}.pdf`);
        } catch {
            setError('No fue posible descargar el PDF de apoyo profesional.');
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
        const reportPageSize = 50;

        const firstPage = await getPsychologistQuestionnaireDashboardV2({
            ...baseParams,
            page: 1,
            page_size: reportPageSize
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
                    page_size: reportPageSize
                })
            )
        );

        return {
            ...firstPage,
            items: [firstPage, ...otherPages].flatMap((page) => page.items ?? []),
            pagination: {
                ...firstPage.pagination,
                page: 1,
                page_size: reportPageSize,
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
    const items = useMemo(() => dashboard?.items ?? [], [dashboard?.items]);
    const emptyState = !loading && items.length === 0;
    const activeFilterCount = [
        query.trim(),
        casePublicId.trim(),
        domain,
        alertLevel,
        reviewStatus,
        dateFrom !== defaultDateRange.dateFrom ? dateFrom : '',
        dateTo !== defaultDateRange.dateTo ? dateTo : ''
    ].filter(Boolean).length;
    const filterSummary = activeFilterCount > 0 ? `${activeFilterCount} filtros activos` : 'Últimos 3 meses, todos los dominios y alertas';
    const clearFilters = () => {
        setQuery('');
        setCasePublicId('');
        setDateFrom(defaultDateRange.dateFrom);
        setDateTo(defaultDateRange.dateTo);
        setDomain('');
        setAlertLevel('');
        setReviewStatus('');
    };
    const backendCharts = (dashboard as { charts?: Record<string, unknown> | null } | null)?.charts ?? null;
    const alertChartItems = useMemo(
        () => chartItemsFromUnknown(dashboard?.aggregates?.by_alert_level ?? backendCharts?.by_alert_level ?? backendCharts?.alerts_by_level, 'alert'),
        [backendCharts, dashboard?.aggregates?.by_alert_level]
    );
    const domainChartItems = useMemo(
        () => chartItemsFromUnknown(dashboard?.aggregates?.by_domain ?? backendCharts?.by_domain ?? backendCharts?.alerts_by_domain, 'domain'),
        [backendCharts, dashboard?.aggregates?.by_domain]
    );
    const reviewChartItems = useMemo(
        () => chartItemsFromUnknown(dashboard?.aggregates?.by_review_status ?? backendCharts?.by_review_status ?? backendCharts?.reviews_by_status, 'review'),
        [backendCharts, dashboard?.aggregates?.by_review_status]
    );
    const pendingAgingItems = useMemo(
        () => chartItemsFromUnknown(backendCharts?.pending_age, 'age'),
        [backendCharts]
    );
    const caseTreemapItems = useMemo(
        () => chartItemsFromUnknown(backendCharts?.by_case ?? backendCharts?.cases_by_alert, 'case'),
        [backendCharts]
    );
    const evaluationTimelineItems = useMemo(
        () => chartItemsFromUnknown(backendCharts?.over_time ?? backendCharts?.by_date ?? backendCharts?.alerts_by_date, 'time'),
        [backendCharts]
    );
    const topCaseLabel = caseTreemapItems[0]?.label ?? 'Sin agregado por caso';
    const topDomainLabel = domainChartItems[0]?.label ?? 'Sin dominio dominante';
    const highestAlertLabel = normalizeAlertLevel(summary?.highest_alert_level);
    const executiveCopy = `Hay ${summary?.total_shared_sessions ?? 0} evaluaciones aceptadas y ${summary?.pending_reviews ?? 0} pendientes de revisión. El dominio más frecuente es ${topDomainLabel} y la mayor alerta agregada es ${highestAlertLabel}.`;
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

                <section className="evaluaciones-insight" aria-label="Resumen ejecutivo de evaluaciones">
                    <div>
                        <span>Lectura rápida</span>
                        <h2>{`${summary?.total_shared_sessions ?? items.length} evaluaciones · ${summary?.pending_reviews ?? 0} por revisar`}</h2>
                        <p>{executiveCopy}</p>
                    </div>
                    <strong>{topCaseLabel}</strong>
                </section>

                <section className={`evaluaciones-filter-panel ${filtersOpen ? 'is-open' : 'is-collapsed'}`} aria-label="Filtros de evaluaciones">
                    <div className="evaluaciones-filter-summary">
                        <div>
                            <strong>Filtros dinámicos</strong>
                            <span>{filterSummary}</span>
                        </div>
                        <div className="evaluaciones-filter-actions">
                            <button type="button" className="evaluaciones-refresh" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>
                                {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
                            </button>
                            <button type="button" className="evaluaciones-refresh" onClick={clearFilters}>
                                Limpiar
                            </button>
                        </div>
                    </div>
                    {filtersOpen ? (
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
                    ) : null}
                </section>

                {error ? <div className="evaluaciones-alert error">{error}</div> : null}

                {loading ? <div className="evaluaciones-empty">Cargando evaluaciones...</div> : null}

                {!loading && summary ? (
                    <div className="evaluaciones-summary-grid">
                        <article><strong>Evaluaciones compartidas</strong><span>{summary.total_shared_sessions ?? 0}</span></article>
                        <article><strong>Casos</strong><span>{summary.total_cases ?? 0}</span></article>
                        <article><strong>Revisiones pendientes</strong><span>{summary.pending_reviews ?? 0}</span></article>
                        <article><strong>Casos revisados</strong><span>{summary.reviewed_cases ?? 0}</span></article>
                        <article><strong>Mayor alerta</strong><span>{normalizeAlertLevel(summary.highest_alert_level)}</span></article>
                    </div>
                ) : null}

                {!loading ? (
                    <div className="evaluaciones-dashboard-grid">
                        <DashboardSection
                            title="Distribución por nivel de alerta"
                            description="Permite priorizar las evaluaciones aceptadas según su nivel de alerta."
                        >
                            <DonutChart
                                data={alertChartItems}
                                ariaLabel="Distribución de evaluaciones aceptadas por nivel de alerta"
                                emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                            />
                        </DashboardSection>
                        <DashboardSection
                            title="Dominio predominante por evaluación"
                            description="Identifica el dominio con mayor probabilidad en cada evaluación aceptada."
                        >
                            <HorizontalBarChart
                                data={domainChartItems}
                                ariaLabel="Distribución del dominio predominante por evaluación aceptada"
                                emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                            />
                        </DashboardSection>
                        <DashboardSection
                            className="evaluaciones-dashboard-wide evaluaciones-dashboard-large"
                            title="Evaluaciones por rango de fechas"
                            description="Muestra la actividad aceptada por mes dentro del periodo consultado."
                        >
                            <AreaChart
                                data={evaluationTimelineItems}
                                ariaLabel="Evaluaciones aceptadas por fecha"
                                emptyMessage="No hay evaluaciones fechadas suficientes para construir la evolución temporal."
                            />
                        </DashboardSection>
                        <DashboardSection
                            title="Estado de revisión profesional"
                            description="Resume el avance del proceso de revisión profesional."
                        >
                            <DonutChart
                                data={reviewChartItems}
                                ariaLabel="Distribución por estado de revisión profesional"
                                emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                            />
                        </DashboardSection>

                        <DashboardSection
                            className="evaluaciones-dashboard-large"
                            title="Antigüedad de evaluaciones pendientes de revisión"
                            description="Identifica evaluaciones aceptadas que llevan más tiempo sin cierre de revisión."
                        >
                            <HistogramChart
                                data={pendingAgingItems}
                                ariaLabel="Antigüedad de evaluaciones pendientes o en revisión"
                                emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                            />
                        </DashboardSection>
                        <DashboardSection
                            className="evaluaciones-dashboard-large"
                            title="Mapa de carga por caso"
                            description="Muestra qué casos concentran mayor cantidad de evaluaciones aceptadas."
                        >
                            <HorizontalBarChart
                                data={caseTreemapItems}
                                ariaLabel="Distribución de evaluaciones aceptadas por caso"
                                emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                            />
                        </DashboardSection>
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
                                        <h2>{resolveEvaluationCaseLabel(item)}</h2>
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
                                    <button type="button" onClick={() => setNormalizedDetailSessionId(item.session_id)}>
                                        Ver detalle normalizado
                                    </button>
                                    <button type="button" onClick={() => setNormalizedDetailSessionId(item.session_id)}>
                                        Ver respuestas del cuestionario
                                    </button>
                                    {item.can_review ? (
                                        <button type="button" onClick={() => loadDetail(item).catch(() => undefined)}>
                                            Agregar o editar revisión
                                        </button>
                                    ) : null}
                                    {item.can_download_pdf ? (
                                        <button type="button" onClick={() => { handleDownloadPdf(item).catch(() => undefined); }}>
                                            {pdfSessionId === item.session_id ? 'Preparando PDF...' : 'Descargar PDF'}
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
                    <div className="evaluaciones-detail-hero">
                        <div>
                            <span>Evaluación compartida</span>
                            <h2>Detalle del cuestionario</h2>
                            <p>
                                {[
                                    resolveEvaluationCaseLabel(activeSession),
                                    formatDateTime(activeSession?.processed_at ?? preview?.session?.updated_at),
                                    normalizeSessionStatus(preview?.session?.status ?? activeSession?.status)
                                ].filter(Boolean).join(' - ')}
                            </p>
                        </div>
                        <strong>{normalizeReviewStatus(activeSession?.review_status)}</strong>
                    </div>
                    <p className="evaluaciones-detail-copy">
                        Este reporte resume la información registrada por el acudiente y los resultados orientativos del sistema para apoyar la revisión profesional. La información debe interpretarse junto con entrevista clínica, contexto familiar o escolar y criterio profesional.
                    </p>

                    {detailLoading ? <div className="evaluaciones-empty">Cargando detalle...</div> : null}
                    {detailError ? <div className="evaluaciones-alert error">{detailError}</div> : null}

                    {!detailLoading && activeSession ? (
                        <>
                            <div className="evaluaciones-detail-grid">
                                <div><strong>Caso</strong><span>{resolveEvaluationCaseLabel(activeSession)}</span></div>
                                <div><strong>Estado</strong><span>{normalizeSessionStatus(preview?.session?.status ?? activeSession?.status)}</span></div>
                                <div><strong>Procesado</strong><span>{formatDateTime(activeSession?.processed_at ?? preview?.session?.updated_at)}</span></div>
                                <div><strong>PDF servidor</strong><span>{preview?.pdf?.available ? 'Disponible' : 'No disponible'}</span></div>
                            </div>

                            <div className="evaluaciones-detail-section">
                                <h3>Resultados por dominio</h3>
                                {detailArtifactsLoading && !preview ? (
                                    <p>Cargando resultados normalizados...</p>
                                ) : (preview?.domains ?? []).length > 0 ? (
                                    <div className="evaluaciones-detail-domains">
                                        {(preview?.domains ?? []).map((domainItem, index) => (
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
                                {detailArtifactsLoading && !detailResponses && answeredQuestionRows.length === 0 ? (
                                    <p>Cargando respuestas registradas...</p>
                                ) : (
                                    <QuestionnaireResponseGroups
                                        responses={detailResponses}
                                        fallbackRows={answeredQuestionRows}
                                        emptyText="Sin respuestas estructuradas disponibles para esta evaluación."
                                    />
                                )}
                            </div>

                            <div className="evaluaciones-detail-section">
                                <h3>Revisiones profesionales</h3>
                                {detailArtifactsLoading && reviews.length === 0 ? (
                                    <p>Cargando revisiones profesionales...</p>
                                ) : reviews.length > 0 ? (
                                    <div className="evaluaciones-review-list">
                                        {reviews.map((review) => (
                                            <article key={review.review_id} className="evaluaciones-review-card">
                                                <strong>{normalizeReviewStatus(review.review_status)}</strong>
                                                <p><span>Concepto inicial:</span> {normalizeBackendText(review.initial_concept, 'Sin concepto registrado')}</p>
                                                <p><span>Recomendación profesional:</span> {normalizeBackendText(review.recommendation, 'Sin recomendación registrada')}</p>
                                                <small>{review.visible_to_guardian ? 'Compartida con padre/tutor' : 'Solo visible para revisión profesional'} - {normalizeReviewStatus(review.review_status)}</small>
                                                <small>
                                                    Actualizada: {formatDateTime(review.updated_at)} - {review.is_diagnostic === false ? 'Orientación profesional, no diagnóstico definitivo' : 'Documento profesional'}
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

            <QuestionnaireReportDetailModal
                isOpen={normalizedDetailSessionId !== null}
                sessionId={normalizedDetailSessionId}
                role="psicologo"
                onClose={() => setNormalizedDetailSessionId(null)}
                onDataChanged={() => loadDashboard().catch(() => undefined)}
            />

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
                            <span>Incluir agregados y distribuciónes</span>
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
