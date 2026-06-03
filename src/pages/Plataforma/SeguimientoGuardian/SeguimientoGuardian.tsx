import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Plataforma.css';
import './SeguimientoGuardian.css';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import {
    AreaChart,
    DashboardEmptyState,
    DivergingDeltaChart,
    DashboardMetricCard,
    DashboardSection,
    DonutChart,
    HorizontalBarChart,
    LineChart,
    TimelineChart
} from '../../../components/DashboardCharts';
import { Modal } from '../../../components/Modal/Modal';
import { QuestionnaireReportDetailModal } from '../../../components/questionnaires/QuestionnaireReportDetailModal';
import {
    createQuestionnaireCaseV2,
    getGuardianQuestionnaireDashboardV2,
    getQuestionnaireCaseDetailV2,
    getQuestionnaireCasesV2,
    updateQuestionnaireCaseV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    GuardianDashboardCaseDTO,
    GuardianDashboardDTO,
    QuestionnaireCaseDTO,
    QuestionnaireCaseDetailDTO,
    QuestionnaireSessionV2DTO
} from '../../../services/questionnaires/questionnaires.types';
import {
    buildGuardianCaseDashboardViewModel,
    formatGuardianTrendAxisLabel,
    formatGuardianTrendTooltipLabel
} from '../../../utils/dashboard/dashboardData';
import { formatChartPercent } from '../../../utils/dashboard/chartFormatters';
import { domainProbabilityToPercent } from '../../../utils/dashboard/chartScales';
import { getAlertLevelMeta } from '../../../utils/dashboard/alerts';
import {
    formatDateTime,
    findFirstVisibleProfessionalReview,
    normalizeAlertLevel,
    normalizeBackendText,
    normalizeBooleanLabel,
    normalizeCaseStatus,
    normalizeDomainLabel,
    normalizeQuestionnaireMode,
    normalizeReviewStatus,
    normalizeSessionStatus
} from '../../../utils/questionnaires/presentation';
import { resolveCaseCompositeLabel } from '../../../utils/questionnaires/dashboardLabels';
import { selectGuardianCaseDashboardCharts } from '../../../utils/questionnaires/guardianCaseCharts';
import { downloadGuardianFollowUpReportPdf } from '../../../utils/reports/guardianFollowUpPdf';

const periodOptions = [
    { value: '3', label: 'Últimos 3 meses' },
    { value: '6', label: 'Últimos 6 meses' },
    { value: '12', label: 'Últimos 12 meses' }
];

const caseStatusOptions = [
    { value: 'active', label: 'Activos' },
    { value: 'archived', label: 'Archivados' },
    { value: 'all', label: 'Todos' }
] as const;

const reportPeriodOptions = [
    { value: '3', label: '3 meses' },
    { value: '6', label: '6 meses' },
    { value: '12', label: '12 meses' },
    { value: 'custom', label: 'Personalizado' }
] as const;

type CaseStatusFilter = (typeof caseStatusOptions)[number]['value'];
type ReportPeriodValue = (typeof reportPeriodOptions)[number]['value'];

const CREATE_CASE_MAX_LENGTH = 120;
const guardianDomainSeries = [
    { key: 'TDAH', label: 'TDAH', color: '#0f5f9f' },
    { key: 'Ansiedad', label: 'Ansiedad', color: '#2f8f6b' },
    { key: 'Depresión', label: 'Depresión', color: '#e67e22' },
    { key: 'Conducta', label: 'Conducta', color: '#c0392b' },
    { key: 'Eliminación', label: 'Eliminación', color: '#7c3aed' }
] as const;

function getCaseOptionLabel(item: QuestionnaireCaseDTO) {
    return resolveCaseCompositeLabel(item);
}
function resolveCaseLabel(item: QuestionnaireCaseDTO | null | undefined) {
    return resolveCaseCompositeLabel(item ?? null);
}

function validateCaseLabel(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0) return 'Ingresa una etiqueta para el caso.';
    if (trimmed.length < 2) return 'La etiqueta del caso debe tener al menos 2 caracteres.';
    if (trimmed.length > CREATE_CASE_MAX_LENGTH) return `La etiqueta del caso no puede superar los ${CREATE_CASE_MAX_LENGTH} caracteres.`;
    return null;
}

function parseSortableDate(...candidates: Array<string | null | undefined>) {
    for (const candidate of candidates) {
        if (!candidate) continue;
        const parsed = Date.parse(candidate);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function formatActivityDate(...candidates: Array<string | null | undefined>) {
    const candidate = candidates.find((value) => {
        if (!value) return false;
        return Number.isFinite(Date.parse(value));
    });
    return candidate ? formatDateTime(candidate, 'Sin actividad registrada') : 'Sin actividad registrada';
}

function normalizeDominantDomain(value: unknown) {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const normalized = normalizeDomainLabel(value);
    if (!raw || raw === 'general' || raw === 'none' || raw === 'sin_dominio' || normalized === '--' || normalized === 'General') {
        return 'Sin dominio predominante';
    }
    return normalized;
}

function limitCaseChartItems(items: Array<{ label: string; value: number; tone?: string }>, limit = 5) {
    const useful = items
        .filter((item) => Number.isFinite(item.value) && item.value > 0)
        .sort((left, right) => right.value - left.value);
    const top = useful.slice(0, limit);
    const rest = useful.slice(limit);
    if (rest.length === 0) return top;
    return [
        ...top,
        {
            label: 'Otros casos',
            value: rest.reduce((total, item) => total + item.value, 0)
        }
    ];
}

function resolveOptionalSessionTimestamp(session: QuestionnaireSessionV2DTO, key: 'submitted_at') {
    const record = session as Record<string, unknown>;
    const value = record[key];
    return typeof value === 'string' ? value : null;
}

function resolveSessionKey(session: QuestionnaireSessionV2DTO) {
    return session.session_id ?? session.id ?? '';
}

function sortCaseSessions(sessions: QuestionnaireSessionV2DTO[]) {
    return [...sessions].sort(
        (left, right) =>
            parseSortableDate(right.processed_at, resolveOptionalSessionTimestamp(right, 'submitted_at'), right.updated_at, right.created_at) -
            parseSortableDate(left.processed_at, resolveOptionalSessionTimestamp(left, 'submitted_at'), left.updated_at, left.created_at)
    );
}

type GuardianVisualCharts = {
    monthlyAlerts: ReturnType<typeof selectGuardianCaseDashboardCharts>['monthlyAlerts'];
    domain: ReturnType<typeof selectGuardianCaseDashboardCharts>['domain'];
    level: ReturnType<typeof selectGuardianCaseDashboardCharts>['level'];
    caseActivity: ReturnType<typeof selectGuardianCaseDashboardCharts>['caseActivity'];
    priorityCases: Array<{
        caseItem: QuestionnaireCaseDTO;
        label: string;
        alertLabel: string;
        alertTone: ReturnType<typeof getAlertLevelMeta>['tone'];
        domainLabel: string;
        sessions: number;
        lastActivity: string | null;
        reason: string;
        score: number;
    }>;
};

function readDashboardCharts(dashboard: GuardianDashboardDTO | null) {
    const charts = (dashboard as { charts?: Record<string, unknown> } | null)?.charts;
    return charts ?? {};
}

function alertPriorityScore(value: string | null | undefined) {
    const tone = getAlertLevelMeta(value).tone;
    if (tone === 'critical_review') return 5;
    if (tone === 'high') return 4;
    if (tone === 'elevated') return 3;
    if (tone === 'moderate') return 2;
    if (tone === 'low') return 1;
    return 0;
}

function resolvePriorityReason(alertTone: string, sessions: number) {
    if (alertTone === 'critical_review') return 'Requiere revisión profesional prioritaria.';
    if (alertTone === 'high' || alertTone === 'elevated') return 'Caso destacado por mayor nivel de alerta.';
    if (sessions >= 4) return 'Caso destacado por acumulación de cuestionarios recientes.';
    return 'Caso destacado por actividad reciente.';
}

function buildGuardianVisualCharts(
    dashboard: GuardianDashboardDTO | null,
    labelCases: QuestionnaireCaseDTO[]
): GuardianVisualCharts {
    const chartConfigs = selectGuardianCaseDashboardCharts(readDashboardCharts(dashboard), labelCases);

    const prioritySource = Array.isArray((dashboard as { priority_cases?: GuardianDashboardCaseDTO[] } | null)?.priority_cases)
        ? ((dashboard as { priority_cases?: GuardianDashboardCaseDTO[] }).priority_cases ?? [])
        : dashboard?.cases ?? [];

    const priorityCases = prioritySource
        .flatMap((entry) => {
            const caseItem = entry.case;
            if (!caseItem) return [];
            const topDomain = [...(entry.domain_breakdown ?? [])].sort(
                (left, right) => (Number(right.max_probability ?? right.latest_probability ?? -1) || -1) - (Number(left.max_probability ?? left.latest_probability ?? -1) || -1)
            )[0];
            const latestSessionRecord = (entry.latest_session ?? null) as Record<string, unknown> | null;
            const alertLevel = caseItem.latest_alert_level ?? topDomain?.latest_alert_level ?? (typeof latestSessionRecord?.highest_alert_level === 'string' ? latestSessionRecord.highest_alert_level : null);
            const alertMeta = getAlertLevelMeta(alertLevel);
            const sessions = Number(entry.sessions_count ?? caseItem.sessions_count ?? (caseItem as { processed_sessions_count?: number | null }).processed_sessions_count ?? 0) || 0;
            const lastActivity = caseItem.latest_processed_at ?? entry.latest_session?.processed_at ?? caseItem.updated_at ?? caseItem.created_at ?? null;
            return [{
                caseItem,
                label: resolveCaseCompositeLabel(caseItem),
                alertLabel: alertMeta.label,
                alertTone: alertMeta.tone,
                domainLabel: normalizeDominantDomain(caseItem.latest_domain ?? topDomain?.domain),
                sessions,
                lastActivity,
                reason: resolvePriorityReason(alertMeta.tone, sessions),
                score: alertPriorityScore(alertLevel) * 100 + sessions
            }];
        })
        .sort((left, right) => right.score - left.score || parseSortableDate(right.lastActivity) - parseSortableDate(left.lastActivity))
        .slice(0, 3);

    return {
        monthlyAlerts: {
            ...chartConfigs.monthlyAlerts,
            data: chartConfigs.monthlyAlerts.data.slice(-12)
        },
        domain: chartConfigs.domain,
        level: chartConfigs.level,
        caseActivity: {
            ...chartConfigs.caseActivity,
            data: limitCaseChartItems(chartConfigs.caseActivity.data, 5)
        },
        priorityCases
    };
}

function resolveSessionAlert(session: QuestionnaireSessionV2DTO) {
    const domains = Array.isArray(session.domains)
        ? session.domains
        : Array.isArray(session.result?.domains)
            ? session.result.domains
            : [];
    if (domains.length === 0) return null;

    const topDomain = [...domains].sort(
        (left, right) => (Number(right.probability ?? -1) || -1) - (Number(left.probability ?? -1) || -1)
    )[0];

    if (!topDomain) return null;
    return {
        domainLabel: normalizeDomainLabel(topDomain.domain),
        alertLabel: normalizeAlertLevel(topDomain.alert_level),
        probabilityLabel: formatChartPercent(domainProbabilityToPercent(topDomain.probability))
    };
}

function isNormalizedProfessionalReview(value: unknown): value is { reviewStatus: string; initialConcept: string; recommendation: string } {
    return typeof value === 'object' && value !== null && 'reviewStatus' in value;
}

function resolveSessionReview(session: QuestionnaireSessionV2DTO) {
    const review = findFirstVisibleProfessionalReview(session);
    if (review) return review;

    const record = session as Record<string, unknown>;
    if (record.review_status || record.initial_concept || record.recommendation) {
        return record as Record<string, unknown>;
    }
    return null;
}

function isSessionProcessed(session: QuestionnaireSessionV2DTO) {
    return (session.status ?? '').trim().toLowerCase() === 'processed';
}

function getDashboardEntryMap(entries: GuardianDashboardCaseDTO[]) {
    return new Map(
        entries
            .map((entry) => [entry.case?.case_id ?? '', entry] as const)
            .filter(([nextCaseId]) => nextCaseId.length > 0)
    );
}

function buildInitialReportDates(months: number) {
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - months);
    return {
        dateFrom: start.toISOString().slice(0, 10),
        dateTo: end.toISOString().slice(0, 10)
    };
}

function readSummaryNumber(summary: Record<string, unknown> | null | undefined, keys: string[]) {
    if (!summary) return 0;
    for (const key of keys) {
        const value = Number(summary[key]);
        if (Number.isFinite(value)) return value;
    }
    return 0;
}

export default function SeguimientoGuardian() {
    const navigate = useNavigate();
    const [months, setMonths] = useState('6');
    const [caseId, setCaseId] = useState('');
    const [caseStatusFilter, setCaseStatusFilter] = useState<CaseStatusFilter>('all');
    const [dashboard, setDashboard] = useState<GuardianDashboardDTO | null>(null);
    const [cases, setCases] = useState<QuestionnaireCaseDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pageNotice, setPageNotice] = useState<string | null>(null);

    const [createCaseModalOpen, setCreateCaseModalOpen] = useState(false);
    const [createCaseLabel, setCreateCaseLabel] = useState('');
    const [createCaseWorking, setCreateCaseWorking] = useState(false);
    const [createCaseError, setCreateCaseError] = useState<string | null>(null);
    const [createdCaseFollowUp, setCreatedCaseFollowUp] = useState<QuestionnaireCaseDTO | null>(null);

    const [caseDetailsById, setCaseDetailsById] = useState<Record<string, QuestionnaireCaseDetailDTO>>({});
    const [caseLoadingById, setCaseLoadingById] = useState<Record<string, boolean>>({});
    const [caseErrorById, setCaseErrorById] = useState<Record<string, string | null>>({});
    const [loadedCaseDetailById, setLoadedCaseDetailById] = useState<Record<string, boolean>>({});
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [expandedSessionByCaseId, setExpandedSessionByCaseId] = useState<Record<string, string>>({});
    const [expandedDashboardByCaseId, setExpandedDashboardByCaseId] = useState<Record<string, boolean>>({});
    const [reportSessionId, setReportSessionId] = useState<string | null>(null);

    const [archiveTargetCase, setArchiveTargetCase] = useState<QuestionnaireCaseDTO | null>(null);
    const [caseStatusWorkingId, setCaseStatusWorkingId] = useState<string | null>(null);
    const [caseStatusActionError, setCaseStatusActionError] = useState<string | null>(null);

    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportWorking, setReportWorking] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportPeriod, setReportPeriod] = useState<ReportPeriodValue>('3');
    const [reportDateFrom, setReportDateFrom] = useState('');
    const [reportDateTo, setReportDateTo] = useState('');
    const [reportCaseId, setReportCaseId] = useState('');
    const [reportIncludeSessions, setReportIncludeSessions] = useState(true);
    const [reportIncludeDomains, setReportIncludeDomains] = useState(true);
    const [reportIncludeCharts, setReportIncludeCharts] = useState(true);

    const caseOptions = useMemo(
        () => [
            { value: '', label: 'Todos los casos' },
            ...cases.map((item) => ({ value: item.case_id, label: getCaseOptionLabel(item) }))
        ],
        [cases]
    );

    const dashboardEntryMap = useMemo(() => getDashboardEntryMap(dashboard?.cases ?? []), [dashboard?.cases]);

    const visibleCases = useMemo(() => {
        const filtered = caseId ? cases.filter((item) => item.case_id === caseId) : cases;
        return [...filtered].sort(
            (left, right) => parseSortableDate(right.updated_at, right.created_at) - parseSortableDate(left.updated_at, left.created_at)
        );
    }, [caseId, cases]);

    const loadDashboard = useCallback(async (options?: { preserveNotice?: boolean }) => {
        setLoading(true);
        setDashboardLoading(true);
        setError(null);
        if (!options?.preserveNotice) {
            setPageNotice(null);
        }
        const casesRequest = getQuestionnaireCasesV2({
            ...(caseStatusFilter === 'all' ? {} : { status: caseStatusFilter }),
            page: 1,
            page_size: 50
        });
        const dashboardRequest = getGuardianQuestionnaireDashboardV2({
            months: Number(months),
            ...(caseId ? { case_id: caseId } : {})
        });

        try {
            const casesResponse = await casesRequest;
            setCases(casesResponse.items);
        } catch {
            setError('No fue posible cargar los casos. Intenta nuevamente.');
            setCases([]);
        } finally {
            setLoading(false);
        }

        try {
            const dashboardResponse = await dashboardRequest;
            setDashboard(dashboardResponse);
        } catch {
            setDashboard(null);
        } finally {
            setDashboardLoading(false);
        }
    }, [caseId, caseStatusFilter, months]);

    const loadCaseDetail = useCallback(
        async (nextCaseId: string, force = false) => {
            if (!nextCaseId) return null;
            if (!force && (caseDetailsById[nextCaseId] || caseLoadingById[nextCaseId])) {
                return caseDetailsById[nextCaseId] ?? null;
            }

            setCaseLoadingById((prev) => ({ ...prev, [nextCaseId]: true }));
            setCaseErrorById((prev) => ({ ...prev, [nextCaseId]: null }));
            try {
                const detail = await getQuestionnaireCaseDetailV2(nextCaseId);
                const sortedSessions = sortCaseSessions((detail.sessions ?? []) as QuestionnaireSessionV2DTO[]);
                const normalizedDetail = { ...detail, sessions: sortedSessions };
                setCaseDetailsById((prev) => ({ ...prev, [nextCaseId]: normalizedDetail }));
                setLoadedCaseDetailById((prev) => ({ ...prev, [nextCaseId]: true }));
                setExpandedSessionByCaseId((prev) => {
                    if (prev[nextCaseId] || sortedSessions.length === 0) return prev;
                    return { ...prev, [nextCaseId]: resolveSessionKey(sortedSessions[0]) };
                });
                return normalizedDetail;
            } catch {
                setCaseErrorById((prev) => ({ ...prev, [nextCaseId]: 'No fue posible cargar los cuestionarios de este caso.' }));
                setLoadedCaseDetailById((prev) => ({ ...prev, [nextCaseId]: true }));
                return null;
            } finally {
                setCaseLoadingById((prev) => ({ ...prev, [nextCaseId]: false }));
            }
        },
        [caseDetailsById, caseLoadingById]
    );

    useEffect(() => {
        loadDashboard().catch(() => undefined);
    }, [loadDashboard]);

    useEffect(() => {
        if (caseId && !cases.some((item) => item.case_id === caseId)) {
            setCaseId('');
        }
    }, [caseId, cases]);

    useEffect(() => {
        if (selectedCaseId && !visibleCases.some((item) => item.case_id === selectedCaseId)) {
            setSelectedCaseId('');
        }
    }, [selectedCaseId, visibleCases]);

    useEffect(() => {
        if (!selectedCaseId) return;
        if (loadedCaseDetailById[selectedCaseId] || caseLoadingById[selectedCaseId]) return;
        loadCaseDetail(selectedCaseId).catch(() => undefined);
    }, [caseLoadingById, loadCaseDetail, loadedCaseDetailById, selectedCaseId]);

    const summary = dashboard?.summary ?? null;
    const hasCases = cases.length > 0;
    const createCaseLabelError = validateCaseLabel(createCaseLabel);
    const guardianVisuals = useMemo(() => buildGuardianVisualCharts(dashboard, cases), [dashboard, cases]);
    const topPriorityCase = guardianVisuals.priorityCases[0] ?? null;
    const topDomain = guardianVisuals.domain.data[0]?.label ?? 'Sin dominio predominante';
    const casesWithAlert = readSummaryNumber(summary, ['cases_with_alert', 'alert_cases', 'cases_alerted', 'cases_with_alerts']);
    const alertsTotal = readSummaryNumber(summary, ['total_alerts', 'alerts_count', 'visible_alerts', 'alerts_visible', 'alert_count']);
    const insightCopy = topPriorityCase
        ? `Durante el periodo seleccionado se registraron ${alertsTotal || casesWithAlert} alertas visibles en ${casesWithAlert} casos. El caso con mayor prioridad es "${topPriorityCase.label}" y el dominio más frecuente es ${topDomain}.`
        : 'Aún no hay suficientes alertas procesadas para priorizar casos. Cuando existan cuestionarios procesados, este panel mostrará evolución, dominios y casos que requieren atención.';

    const openCreateCaseModal = () => {
        setCreateCaseError(null);
        setCreateCaseLabel('');
        setCreateCaseModalOpen(true);
    };

    const closeCreateCaseModal = () => {
        if (createCaseWorking) return;
        setCreateCaseModalOpen(false);
        setCreateCaseError(null);
        setCreateCaseLabel('');
    };

    const handleOpenReport = (event: MouseEvent<HTMLButtonElement>, nextSessionId: string) => {
        event.preventDefault();
        event.stopPropagation();
        setReportSessionId(nextSessionId);
    };

    const selectCaseForDetail = (caseIdToOpen: string) => {
        setSelectedCaseId(caseIdToOpen);
        setExpandedDashboardByCaseId((previous) => ({ ...previous, [caseIdToOpen]: true }));
        if (!loadedCaseDetailById[caseIdToOpen] && !caseLoadingById[caseIdToOpen]) {
            loadCaseDetail(caseIdToOpen).catch(() => undefined);
        }
        window.setTimeout(() => {
            document.getElementById('seguimiento-case-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
    };

    const handleCreateCase = async () => {
        const validationError = validateCaseLabel(createCaseLabel);
        if (validationError) {
            setCreateCaseError(validationError);
            return;
        }

        setCreateCaseWorking(true);
        setCreateCaseError(null);
        setPageNotice(null);
        try {
            const createdCase = await createQuestionnaireCaseV2({
                private_label: createCaseLabel.trim(),
                metadata: {}
            });
            if (!createdCase) {
                throw new Error('case_creation_without_payload');
            }
            setCreateCaseModalOpen(false);
            setCreateCaseLabel('');
            setCreatedCaseFollowUp(createdCase);
            setSelectedCaseId(createdCase.case_id);
            setPageNotice(`Caso creado correctamente: "${resolveCaseLabel(createdCase)}". Los cuestionarios se relacionan al caso mediante asociación directa al iniciar o continuar el cuestionario. Las etiquetas son complementarias.`);
            await loadDashboard({ preserveNotice: true });
            loadCaseDetail(createdCase.case_id).catch(() => undefined);
        } catch {
            setCreateCaseError('No fue posible crear el caso. Intenta nuevamente.');
        } finally {
            setCreateCaseWorking(false);
        }
    };

    const openReportModal = () => {
        const nextMonths = Number(months || 3);
        const defaultDates = buildInitialReportDates(nextMonths);
        setReportPeriod((['3', '6', '12'] as string[]).includes(months) ? (months as ReportPeriodValue) : '3');
        setReportDateFrom(defaultDates.dateFrom);
        setReportDateTo(defaultDates.dateTo);
        setReportCaseId(caseId);
        setReportIncludeSessions(true);
        setReportIncludeDomains(true);
        setReportIncludeCharts(true);
        setReportError(null);
        setReportModalOpen(true);
    };

    const closeReportModal = () => {
        if (reportWorking) return;
        setReportModalOpen(false);
        setReportError(null);
    };

    const handleCaseStatusChange = async (nextCase: QuestionnaireCaseDTO, nextStatus: 'active' | 'archived') => {
        setCaseStatusWorkingId(nextCase.case_id);
        setCaseStatusActionError(null);
        setPageNotice(null);
        try {
            await updateQuestionnaireCaseV2(nextCase.case_id, { status: nextStatus });
            setArchiveTargetCase(null);
            setPageNotice(
                nextStatus === 'archived'
                    ? `El caso "${resolveCaseLabel(nextCase)}" fue archivado correctamente.`
                    : `El caso "${resolveCaseLabel(nextCase)}" fue reactivado correctamente.`
            );
            await loadDashboard();
        } catch {
            setCaseStatusActionError(
                nextStatus === 'archived'
                    ? 'No fue posible archivar el caso. Intenta nuevamente.'
                    : 'No fue posible reactivar el caso. Intenta nuevamente.'
            );
        } finally {
            setCaseStatusWorkingId(null);
        }
    };

    const handleGenerateFollowUpReport = async () => {
        setReportWorking(true);
        setReportError(null);
        try {
            const params =
                reportPeriod === 'custom'
                    ? {
                        date_from: reportDateFrom || undefined,
                        date_to: reportDateTo || undefined
                    }
                    : {
                        months: Number(reportPeriod)
                    };

            if (reportPeriod === 'custom' && (!reportDateFrom || !reportDateTo)) {
                setReportError('Selecciona un rango de fechas para el periodo personalizado.');
                setReportWorking(false);
                return;
            }

            const dashboardPayload = await getGuardianQuestionnaireDashboardV2({
                ...params,
                ...(reportCaseId ? { case_id: reportCaseId } : {})
            });

            const reportCases = reportCaseId
                ? cases.filter((item) => item.case_id === reportCaseId)
                : cases;

            const detailIds = reportCases.map((item) => item.case_id).filter(Boolean);
            const detailResults = await Promise.all(
                detailIds.map(async (nextCaseId) => caseDetailsById[nextCaseId] ?? await loadCaseDetail(nextCaseId, true))
            );

            downloadGuardianFollowUpReportPdf({
                dashboard: dashboardPayload,
                caseDetails: detailResults.filter((item): item is QuestionnaireCaseDetailDTO => Boolean(item)),
                options: {
                    months: reportPeriod === 'custom' ? null : Number(reportPeriod),
                    dateFrom: reportPeriod === 'custom' ? reportDateFrom : null,
                    dateTo: reportPeriod === 'custom' ? reportDateTo : null,
                    caseId: reportCaseId || null,
                    caseLabel: reportCaseId ? resolveCaseLabel(cases.find((item) => item.case_id === reportCaseId)) : 'Todos los casos',
                    includeRecentSessions: reportIncludeSessions,
                    includeDomainBreakdown: reportIncludeDomains,
                    includeCharts: reportIncludeCharts
                }
            });
            setReportModalOpen(false);
            setPageNotice('El reporte de seguimiento se descargó correctamente.');
        } catch {
            setReportError('No fue posible generar el reporte de seguimiento. Intenta nuevamente.');
        } finally {
            setReportWorking(false);
        }
    };

    const emptyTitle =
        caseStatusFilter === 'archived'
            ? 'No tienes casos archivados.'
            : caseStatusFilter === 'all'
                ? 'Aún no tienes casos creados.'
                : 'Aún no tienes casos activos.';
    const emptyCopy =
        caseStatusFilter === 'archived'
            ? 'Cuando archives un caso aparecerá aquí­, junto con sus cuestionarios y reportes disponibles.'
            : 'Cuando inicies un cuestionario podrás crear un caso para agrupar seguimientos.';

    return (
        <div className="plataforma-view">
            <section className="seguimiento-guardian" aria-label="Casos y seguimiento">
                <div className="seguimiento-header">
                    <div>
                        <span className="seguimiento-eyebrow">Seguimiento familiar</span>
                        <h1>Seguimiento familiar</h1>
                        <p>
                            Alertas, evolución y prioridades por caso en un solo panel.
                        </p>
                    </div>
                    <div className="seguimiento-header-actions">
                        <div className="seguimiento-header-button-row">
                            <button type="button" className="seguimiento-inline-btn ghost" onClick={() => loadDashboard().catch(() => undefined)} disabled={loading}>
                                Actualizar
                            </button>
                            <button type="button" className="seguimiento-inline-btn" onClick={openReportModal} disabled={loading || !hasCases}>
                                Descargar reporte de seguimiento
                            </button>
                            <button type="button" className="seguimiento-create-btn" onClick={openCreateCaseModal}>
                                Crear caso
                            </button>
                        </div>
                    </div>
                </div>

                {pageNotice ? <div className="seguimiento-alert success">{pageNotice}</div> : null}
                {createdCaseFollowUp ? (
                    <div className="seguimiento-next-step-card" aria-label="Siguientes pasos del caso creado">
                        <div>
                            <span>Nuevo caso creado</span>
                            <strong>{resolveCaseLabel(createdCaseFollowUp)}</strong>
                            <p>El caso quedó seleccionado. Puedes ver el detalle, asignar etiquetas complementarias o añadir un cuestionario asociado directamente al caso.</p>
                        </div>
                        <div className="seguimiento-next-step-actions">
                            <button type="button" className="seguimiento-inline-btn" onClick={() => selectCaseForDetail(createdCaseFollowUp.case_id)}>
                                Ver detalle
                            </button>
                            <button type="button" className="seguimiento-inline-btn ghost" onClick={() => navigate('/padre/historial')}>
                                Asignar etiqueta desde cuestionario
                            </button>
                            <button type="button" className="seguimiento-inline-btn ghost" onClick={() => navigate('/padre/cuestionario')}>
                                Añadir cuestionarios
                            </button>
                        </div>
                    </div>
                ) : null}
                {error ? <div className="seguimiento-alert error">{error}</div> : null}
                {caseStatusActionError ? <div className="seguimiento-alert error">{caseStatusActionError}</div> : null}
                {!loading && dashboardLoading && hasCases ? (
                    <div className="seguimiento-progressive-note" aria-live="polite">
                        Casos cargados. Estamos actualizando las gráficas sin bloquear la vista.
                    </div>
                ) : null}

                {loading ? <div className="seguimiento-empty">Cargando casos...</div> : null}

                {!loading && !hasCases ? (
                    <div className="seguimiento-empty-card">
                        <h2>{emptyTitle}</h2>
                        <p>{emptyCopy}</p>
                    </div>
                ) : null}

                {!loading && hasCases ? (
                    <>
                        <section className="seguimiento-hero-insight" aria-label="Resumen ejecutivo familiar">
                            <div>
                                <span>Resumen ejecutivo</span>
                                <h2>{`${alertsTotal || casesWithAlert} alertas visibles · ${casesWithAlert} casos con atención`}</h2>
                                <p>{insightCopy}</p>
                                <small className="seguimiento-period-chip">
                                    {months === '6' ? 'Mostrando últimos 6 meses' : `Mostrando últimos ${months} meses`}
                                </small>
                            </div>
                            <div className="seguimiento-hero-priority">
                                <strong>{topPriorityCase?.label ?? 'Sin caso prioritario'}</strong>
                                <span>{topPriorityCase ? `${topPriorityCase.alertLabel} · ${topPriorityCase.domainLabel}` : 'Sin alerta visible'}</span>
                            </div>
                        </section>

                        <div className="seguimiento-summary-grid">
                            <article className="seguimiento-summary-card">
                                <strong>Total de casos</strong>
                                <span>{summary?.total_cases ?? cases.length}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Cuestionarios</strong>
                                <span>{summary?.total_sessions ?? 0}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Cuestionarios procesados</strong>
                                <span>{summary?.processed_sessions ?? 0}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Casos con revisión profesional</strong>
                                <span>{summary?.cases_needing_professional_review ?? 0}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Casos con alerta</strong>
                                <span>{casesWithAlert}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Mayor alerta</strong>
                                <span>{normalizeAlertLevel(summary?.highest_alert_level)}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Dominio más frecuente</strong>
                                <span>{topDomain}</span>
                            </article>
                        </div>

                        <div className="seguimiento-dashboard-grid" aria-label="Gráficas principales del seguimiento familiar">
                            <DashboardSection
                                className="seguimiento-dashboard-main"
                                title={guardianVisuals.monthlyAlerts.title}
                                description={guardianVisuals.monthlyAlerts.description}
                            >
                                <AreaChart
                                    data={guardianVisuals.monthlyAlerts.data}
                                    ariaLabel={guardianVisuals.monthlyAlerts.ariaLabel}
                                    emptyMessage={guardianVisuals.monthlyAlerts.emptyMessage}
                                />
                            </DashboardSection>
                            <DashboardSection
                                title={guardianVisuals.domain.title}
                                description={guardianVisuals.domain.description}
                            >
                                <HorizontalBarChart
                                    data={guardianVisuals.domain.data}
                                    ariaLabel={guardianVisuals.domain.ariaLabel}
                                    emptyMessage={guardianVisuals.domain.emptyMessage}
                                    formatter={guardianVisuals.domain.formatter === 'percent' ? formatChartPercent : undefined}
                                    maxValue={guardianVisuals.domain.formatter === 'percent' ? 100 : undefined}
                                />
                            </DashboardSection>
                            <DashboardSection
                                title={guardianVisuals.level.title}
                                description={guardianVisuals.level.description}
                            >
                                <DonutChart
                                    data={guardianVisuals.level.data}
                                    ariaLabel={guardianVisuals.level.ariaLabel}
                                    emptyMessage={guardianVisuals.level.emptyMessage}
                                />
                            </DashboardSection>
                            <DashboardSection
                                className="seguimiento-dashboard-wide"
                                title={guardianVisuals.caseActivity.title || 'Cuestionarios por caso'}
                                description={guardianVisuals.caseActivity.description || 'Actividad disponible por caso según el agregado entregado por el backend.'}
                            >
                                <HorizontalBarChart
                                    data={guardianVisuals.caseActivity.data}
                                    ariaLabel={guardianVisuals.caseActivity.ariaLabel}
                                    emptyMessage={guardianVisuals.caseActivity.emptyMessage}
                                />
                            </DashboardSection>
                        </div>

                        <section className="seguimiento-priority-ranking" aria-label="Ranking de casos prioritarios">
                            <div className="seguimiento-section-title">
                                <span>Prioridades</span>
                                <h2>Qué revisar primero</h2>
                                <p>Top 3 por severidad, actividad y última actualización.</p>
                            </div>
                            <div className="seguimiento-priority-grid">
                                {guardianVisuals.priorityCases.slice(0, 3).map((item, index) => (
                                    <article className="seguimiento-priority-card" key={item.caseItem.case_id}>
                                        <span className="seguimiento-priority-index">{index + 1}</span>
                                        <div className="seguimiento-priority-main">
                                            <strong>{item.label}</strong>
                                            <span>{item.caseItem.case_public_id ?? 'Caso sin código público'} · {item.domainLabel}</span>
                                            <small>
                                                {item.sessions} cuestionarios · Última actividad: {formatActivityDate(item.lastActivity)}
                                            </small>
                                            <small>{item.reason}</small>
                                        </div>
                                        <div className="seguimiento-priority-side">
                                            <span className={`seguimiento-alert-pill is-${item.alertTone}`}>{item.alertLabel}</span>
                                            <button
                                                type="button"
                                                className="seguimiento-inline-btn ghost"
                                                onClick={() => selectCaseForDetail(item.caseItem.case_id)}
                                            >
                                                Ver detalle
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                        <section className="seguimiento-filter-panel" aria-label="Filtros compactos de seguimiento">
                            <div className="seguimiento-filter-panel__summary">
                                <div>
                                    <span className="seguimiento-eyebrow">Filtros compactos</span>
                                    <strong>{caseId ? 'Caso filtrado' : 'Todos los casos visibles'}</strong>
                                    <p>Periodo {months} meses - {caseStatusFilter === 'all' ? 'todos los estados' : normalizeCaseStatus(caseStatusFilter)}</p>
                                </div>
                                <button type="button" className="seguimiento-inline-btn ghost" onClick={() => { setMonths('6'); setCaseId(''); setCaseStatusFilter('all'); }}>
                                    Limpiar filtros
                                </button>
                            </div>
                            <div className="seguimiento-filters compact">
                                <label>
                                    Periodo
                                    <CustomSelect
                                        value={months}
                                        options={periodOptions}
                                        onChange={setMonths}
                                        ariaLabel="Filtrar casos por periodo"
                                    />
                                </label>
                                <label>
                                    Estado
                                    <CustomSelect
                                        value={caseStatusFilter}
                                        options={caseStatusOptions.map((item) => ({ value: item.value, label: item.label }))}
                                        onChange={(value) => setCaseStatusFilter(value as CaseStatusFilter)}
                                        ariaLabel="Filtrar por estado del caso"
                                    />
                                </label>
                                {cases.length > 0 ? (
                                    <label>
                                        Caso
                                        <CustomSelect
                                            value={caseId}
                                            options={caseOptions}
                                            onChange={setCaseId}
                                            ariaLabel="Filtrar por caso"
                                        />
                                    </label>
                                ) : null}
                            </div>
                        </section>

                        <div className="seguimiento-section-title seguimiento-section-title--list">
                            <span>Detalle bajo demanda</span>
                            <h2>Casos del seguimiento</h2>
                            <p>El listado queda al final; selecciona un solo caso para cargar cuestionarios, reportes y gráficas de detalle.</p>
                        </div>

                        <div className="seguimiento-case-list">
                            {visibleCases.map((caseItem) => {
                                const caseEntry = dashboardEntryMap.get(caseItem.case_id) ?? null;
                                const caseDetail = caseDetailsById[caseItem.case_id] ?? null;
                                const caseSessions = sortCaseSessions(caseDetail?.sessions ?? []);
                                const expandedSessionId =
                                    expandedSessionByCaseId[caseItem.case_id] ?? (caseSessions[0] ? resolveSessionKey(caseSessions[0]) : '');
                                const caseIsLoading = caseLoadingById[caseItem.case_id] === true;
                                const caseLoadError = caseErrorById[caseItem.case_id] ?? null;
                                const dashboardViewModel = buildGuardianCaseDashboardViewModel({
                                    caseItem,
                                    caseEntry,
                                    caseDetail,
                                    domainLabels: guardianDomainSeries.map((series) => series.label)
                                });
                                const showPeakProbability = dashboardViewModel.domains.some((item) => typeof item.maxPct === 'number');
                                const latestBars = dashboardViewModel.domains
                                    .filter((item) => typeof item.latestPct === 'number')
                                    .map((item) => ({ label: item.domainLabel, value: item.latestPct ?? 0 }));
                                const peakBars = dashboardViewModel.domains
                                    .filter((item) => typeof item.maxPct === 'number')
                                    .map((item) => ({ label: item.domainLabel, value: item.maxPct ?? 0 }));
                                const deltaBars = (dashboardViewModel.deltaByDomain ?? []).map((item) => ({
                                    label: item.domainLabel,
                                    value: item.delta,
                                    meta: `Anterior: ${formatChartPercent(item.previous)} · Actual: ${formatChartPercent(item.current)}`,
                                    raw: item
                                }));
                                const sessionsCount = dashboardViewModel.sessionsCount;
                                const isArchived = (caseItem.status ?? '').trim().toLowerCase() === 'archived';
                                const hasLoadedCaseDetail = loadedCaseDetailById[caseItem.case_id] === true;
                                const isCaseSelected = selectedCaseId === caseItem.case_id;
                                const isDashboardExpanded = expandedDashboardByCaseId[caseItem.case_id] ?? isCaseSelected;
                                const caseAlertTone = getAlertLevelMeta(caseItem.latest_alert_level).tone;
                                const caseLastActivity = formatActivityDate(
                                    dashboardViewModel.latestSessionAt,
                                    caseItem.latest_processed_at,
                                    caseItem.updated_at,
                                    caseItem.created_at
                                );

                                return (
                                    <article
                                        key={caseItem.case_id}
                                        id={isCaseSelected ? 'seguimiento-case-detail-panel' : undefined}
                                        className={`seguimiento-case-card ${isCaseSelected ? 'is-selected' : 'is-collapsed'}`}
                                    >
                                        <div className="seguimiento-case-top">
                                            <div>
                                                <h2>{resolveCaseLabel(caseItem)}</h2>
                                                <p>{caseItem.case_public_id ?? 'Sin código público disponible'}</p>
                                            </div>
                                            <div className="seguimiento-case-top-side">
                                                <div className="seguimiento-case-badges">
                                                    <span className={`seguimiento-case-badge ${isArchived ? 'is-archived' : ''}`}>
                                                        {normalizeCaseStatus(caseItem.status)}
                                                    </span>
                                                    <span className="seguimiento-case-badge">
                                                        {sessionsCount} {sessionsCount === 1 ? 'cuestionario' : 'cuestionarios'}
                                                    </span>
                                                    <span className={`seguimiento-alert-pill is-${caseAlertTone}`}>
                                                        {dashboardViewModel.highestAlertLabel}
                                                    </span>
                                                </div>
                                                <div className="seguimiento-case-actions">
                                                    <button
                                                        type="button"
                                                        className="seguimiento-inline-btn ghost"
                                                        onClick={() => {
                                                            if (isCaseSelected) {
                                                                setSelectedCaseId('');
                                                                return;
                                                            }
                                                            selectCaseForDetail(caseItem.case_id);
                                                        }}
                                                    >
                                                        {isCaseSelected ? 'Ocultar detalle' : 'Ver detalle'}
                                                    </button>
                                                    {isCaseSelected ? (
                                                        <button
                                                            type="button"
                                                            className="seguimiento-inline-btn ghost"
                                                            onClick={() =>
                                                                setExpandedDashboardByCaseId((previous) => ({
                                                                    ...previous,
                                                                    [caseItem.case_id]: !isDashboardExpanded
                                                                }))
                                                            }
                                                        >
                                                            {isDashboardExpanded ? 'Ocultar gráficas de seguimiento' : 'Ver gráficas de seguimiento'}
                                                        </button>
                                                    ) : null}
                                                    {isArchived ? (
                                                        <button
                                                            type="button"
                                                            className="seguimiento-inline-btn"
                                                            disabled={caseStatusWorkingId === caseItem.case_id}
                                                            onClick={() => {
                                                                handleCaseStatusChange(caseItem, 'active').catch(() => undefined);
                                                            }}
                                                        >
                                                            {caseStatusWorkingId === caseItem.case_id ? 'Guardando...' : 'Reactivar caso'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="seguimiento-inline-btn"
                                                            disabled={caseStatusWorkingId === caseItem.case_id}
                                                            onClick={() => setArchiveTargetCase(caseItem)}
                                                        >
                                                            Archivar caso
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="seguimiento-case-meta">
                                            <div>
                                                <strong>Estado del caso</strong>
                                                <span>{normalizeCaseStatus(caseItem.status)}</span>
                                            </div>
                                            <div>
                                                <strong>Último procesamiento</strong>
                                                <span>{caseLastActivity}</span>
                                            </div>
                                            <div>
                                                <strong>Alerta principal</strong>
                                                <span>{dashboardViewModel.highestAlertLabel}</span>
                                            </div>
                                            <div>
                                                <strong>Relación con historial</strong>
                                                <span>Caso asociado directamente</span>
                                            </div>
                                        </div>

                                        {!isCaseSelected ? (
                                            <p className="seguimiento-case-collapsed-copy">Selecciona este caso para ver dominios, cuestionarios y reportes.</p>
                                        ) : (
                                            <>
                                                <div className="seguimiento-domain-list">
                                            <h3>Última medición por dominio</h3>
                                            <p>
                                                Estos valores corresponden a el último cuestionario del caso dentro del periodo seleccionado. No representan un promedio histórico.
                                            </p>
                                            {dashboardViewModel.domains.length > 0 ? (
                                                <div className="seguimiento-domain-table">
                                                    <div className={`seguimiento-domain-row seguimiento-domain-head ${showPeakProbability ? 'has-peak' : ''}`}>
                                                        <strong>Dominio</strong>
                                                        <strong>Última medición</strong>
                                                        {showPeakProbability ? <strong>Mayor registrada</strong> : null}
                                                        <strong>Alerta actual</strong>
                                                    </div>
                                                    {dashboardViewModel.domains.map((domain) => (
                                                        <div
                                                            key={`${caseItem.case_id}-${domain.domainKey}`}
                                                            className={`seguimiento-domain-row ${showPeakProbability ? 'has-peak' : ''}`}
                                                        >
                                                            <span className="seguimiento-domain-cell heading">{domain.domainLabel}</span>
                                                            <span className="seguimiento-domain-cell">
                                                                {typeof domain.latestPct === 'number'
                                                                    ? `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(
                                                                        domain.latestPct
                                                                    )} %`
                                                                    : '--'}
                                                            </span>
                                                            {showPeakProbability ? (
                                                                <span className="seguimiento-domain-cell">
                                                                    {typeof domain.maxPct === 'number'
                                                                        ? `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(
                                                                            domain.maxPct
                                                                        )} %`
                                                                        : '-'}
                                                                </span>
                                                            ) : null}
                                                            <span className="seguimiento-domain-cell">{domain.latestAlertLabel}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p>No hay mediciones de dominio disponibles para este periodo.</p>
                                            )}
                                        </div>

                                        {isDashboardExpanded ? (
                                            <div className="case-dashboard-grid">
                                                <div className="seguimiento-dashboard-metrics case-dashboard-wide">
                                                    <DashboardMetricCard
                                                        label="Cuestionarios registrados"
                                                        value={dashboardViewModel.sessionsCount}
                                                        helper={dashboardViewModel.casePublicId || 'Caso sin código público'}
                                                        tone="info"
                                                    />
                                                    <DashboardMetricCard
                                                        label="Último cuestionario"
                                                        value={caseLastActivity}
                                                        helper="Fecha más reciente dentro del caso."
                                                        tone="neutral"
                                                    />
                                                    <DashboardMetricCard
                                                        label="Mayor alerta"
                                                        value={dashboardViewModel.highestAlertLabel}
                                                        helper="Nivel más alto visible para este caso."
                                                        tone="warning"
                                                    />
                                                    <DashboardMetricCard
                                                        label="Estado del caso"
                                                        value={dashboardViewModel.statusLabel}
                                                        helper="Datos calculados únicamente con este caso."
                                                        tone={isArchived ? 'neutral' : 'success'}
                                                    />
                                                </div>

                                                <DashboardSection
                                                    className="case-dashboard-wide case-dashboard-chart-large"
                                                    title="Evolución por dominio"
                                                    description="Permite observar cómo han variado los dominios evaluados a lo largo de los cuestionarios de este caso."
                                                >
                                                    <LineChart
                                                        data={dashboardViewModel.trendPoints}
                                                        series={[...guardianDomainSeries]}
                                                        ariaLabel={`Evolución por dominio de ${dashboardViewModel.caseLabel}`}
                                                        emptyMessage="No hay suficientes cuestionarios para mostrar evolución en el periodo seleccionado."
                                                        minY={0}
                                                        maxY={100}
                                                        formatter={formatChartPercent}
                                                        xLabelFormatter={formatGuardianTrendAxisLabel}
                                                        xTooltipFormatter={formatGuardianTrendTooltipLabel}
                                                        xAxisFontSize={8}
                                                    />
                                                </DashboardSection>

                                                <DashboardSection
                                                    title="Última medición por dominio"
                                                    description="Estos valores corresponden a el último cuestionario del caso dentro del periodo seleccionado. No representan un promedio histórico."
                                                >
                                                    <HorizontalBarChart
                                                        data={latestBars}
                                                        ariaLabel={`Última medición por dominio de ${dashboardViewModel.caseLabel}`}
                                                        emptyMessage="No hay datos suficientes para mostrar la última medición por dominio."
                                                        formatter={formatChartPercent}
                                                        minValue={0}
                                                        maxValue={100}
                                                    />
                                                </DashboardSection>

                                                <DashboardSection
                                                    title="Mayor medición registrada por dominio"
                                                    description="Identifica el mayor valor registrado para cada dominio dentro del periodo seleccionado."
                                                >
                                                    {peakBars.length > 0 ? (
                                                        <HorizontalBarChart
                                                            data={peakBars}
                                                            ariaLabel={`Mayor medición registrada por dominio de ${dashboardViewModel.caseLabel}`}
                                                            emptyMessage="No hay datos suficientes para mostrar la mayor medición registrada."
                                                            formatter={formatChartPercent}
                                                            minValue={0}
                                                            maxValue={100}
                                                        />
                                                    ) : (
                                                        <DashboardEmptyState message="Este caso no incluye valores máximos registrados por dominio para el periodo seleccionado." />
                                                    )}
                                                </DashboardSection>

                                                <DashboardSection
                                                    className="case-dashboard-wide"
                                                    title="Cambio frente al cuestionario anterior"
                                                    description="Muestra el aumento o disminución de cada dominio respecto al cuestionario anterior."
                                                >
                                                    {dashboardViewModel.deltaSummaryEnhanced ? (
                                                        <div className="dashboard-section-summary">
                                                            {dashboardViewModel.deltaSummaryEnhanced}
                                                        </div>
                                                    ) : null}
                                                    {dashboardViewModel.deltaSummary ? (
                                                        <div className="dashboard-section-summary" style={{ marginTop: 8 }}>
                                                            <small>{dashboardViewModel.deltaSummary}</small>
                                                        </div>
                                                    ) : null}
                                                    <DivergingDeltaChart
                                                        data={deltaBars}
                                                        ariaLabel={`Cambio por dominio frente al cuestionario anterior de ${dashboardViewModel.caseLabel}`}
                                                        emptyMessage="No hay suficientes cuestionarios para comparar cambios."
                                                        formatter={(v) => typeof v === 'number' ? `${v.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pp` : '--'}
                                                        helper="Valores positivos indican aumento frente al cuestionario anterior; valores negativos indican disminución."
                                                    />
                                                </DashboardSection>

                                                <DashboardSection
                                                    className="case-dashboard-wide case-dashboard-chart-large"
                                                    title="Línea de cuestionarios del caso"
                                                    description="Resume la secuencia de cuestionarios registrados para este caso."
                                                >
                                                    <TimelineChart
                                                        items={dashboardViewModel.timelineItems}
                                                        ariaLabel={`Secuencia de cuestionarios de ${dashboardViewModel.caseLabel}`}
                                                        emptyMessage="No hay cuestionarios suficientes para construir la línea temporal del caso."
                                                    />
                                                </DashboardSection>
                                            </div>
                                        ) : null}

                                        <div className="seguimiento-sessions">
                                            <div className="seguimiento-sessions-header">
                                                <h3>Cuestionarios del caso</h3>
                                                {!hasLoadedCaseDetail && !caseIsLoading ? (
                                                    <button
                                                        type="button"
                                                        className="seguimiento-inline-btn"
                                                        onClick={() => loadCaseDetail(caseItem.case_id).catch(() => undefined)}
                                                    >
                                                        Cargar cuestionarios
                                                    </button>
                                                ) : null}
                                                {caseLoadError ? (
                                                    <button
                                                        type="button"
                                                        className="seguimiento-inline-btn"
                                                        onClick={() => loadCaseDetail(caseItem.case_id, true).catch(() => undefined)}
                                                    >
                                                        Reintentar
                                                    </button>
                                                ) : null}
                                            </div>

                                            {!hasLoadedCaseDetail && !caseIsLoading ? (
                                                <p className="seguimiento-session-empty">Carga los cuestionarios para ver el detalle de este caso.</p>
                                            ) : null}
                                            {caseIsLoading ? <p className="seguimiento-session-empty">Cargando cuestionarios del caso...</p> : null}
                                            {!caseIsLoading && hasLoadedCaseDetail && caseLoadError ? <p className="seguimiento-session-empty error">{caseLoadError}</p> : null}
                                            {!caseIsLoading && hasLoadedCaseDetail && !caseLoadError && caseSessions.length === 0 ? (
                                                <p className="seguimiento-session-empty">Este caso aún no tiene cuestionarios asociados.</p>
                                            ) : null}

                                            {!caseIsLoading && hasLoadedCaseDetail && !caseLoadError && caseSessions.length > 0 ? (
                                                <div className="seguimiento-session-list">
                                                    {caseSessions.map((session) => {
                                                        const sessionKey = resolveSessionKey(session);
                                                        const isExpanded = expandedSessionId === sessionKey;
                                                        const sessionAlert = resolveSessionAlert(session);

                                                        return (
                                                            <div key={sessionKey} className={`seguimiento-session-card ${isExpanded ? 'is-expanded' : ''}`}>
                                                                <button
                                                                    type="button"
                                                                    className="seguimiento-session-summary"
                                                                    onClick={() => setExpandedSessionByCaseId((prev) => ({ ...prev, [caseItem.case_id]: sessionKey }))}
                                                                    aria-expanded={isExpanded}
                                                                >
                                                                    <span>{formatActivityDate(session.processed_at, session.updated_at, session.created_at)}</span>
                                                                    <span>{normalizeSessionStatus(session.status)}</span>
                                                                    <span>{normalizeQuestionnaireMode(session.mode)}</span>
                                                                    <span>{sessionAlert ? `${sessionAlert.domainLabel} - ${sessionAlert.alertLabel}` : 'Sin alerta visible'}</span>
                                                                </button>

                                                                <div className="seguimiento-session-details" aria-hidden={!isExpanded}>
                                                                    <div className="seguimiento-session-details-inner">
                                                                        <div className="seguimiento-session-grid">
                                                                            <div>
                                                                                <strong>Estado</strong>
                                                                                <span>{normalizeSessionStatus(session.status)}</span>
                                                                            </div>
                                                                            <div>
                                                                                <strong>Creada</strong>
                                                                                <span>{formatActivityDate(session.created_at)}</span>
                                                                            </div>
                                                                            <div>
                                                                                <strong>Procesada</strong>
                                                                                <span>{formatActivityDate(session.processed_at)}</span>
                                                                            </div>
                                                                            <div>
                                                                                <strong>Modo</strong>
                                                                                <span>{normalizeQuestionnaireMode(session.mode)}</span>
                                                                            </div>
                                                                            <div>
                                                                                <strong>Progreso</strong>
                                                                                <span>
                                                                                    {typeof (session.progress_percent ?? session.progress_pct) === 'number'
                                                                                        ? `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(
                                                                                            Number(session.progress_percent ?? session.progress_pct)
                                                                                        )} %`
                                                                                        : '--'}
                                                                                </span>
                                                                            </div>
                                                                            <div>
                                                                                <strong>Revisión profesional</strong>
                                                                                <span>{normalizeBooleanLabel(session.result?.needs_professional_review)}</span>
                                                                            </div>
                                                                        </div>

                                                                        {sessionAlert ? (
                                                                            <p className="seguimiento-session-alert">
                                                                                Alerta principal: {sessionAlert.domainLabel} - {sessionAlert.alertLabel} - {sessionAlert.probabilityLabel}
                                                                            </p>
                                                                        ) : null}

                                                                        {Array.isArray(session.domains) && session.domains.length > 0 ? (
                                                                            <div className="seguimiento-session-domains">
                                                                                {session.domains.map((domain) => (
                                                                                    <div key={`${sessionKey}-${domain.domain}`} className="seguimiento-domain-pill">
                                                                                        <strong>{normalizeDomainLabel(domain.domain)}</strong>
                                                                                        <span>
                                                                                            {typeof domainProbabilityToPercent(domain.probability) === 'number'
                                                                                                ? `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(
                                                                                                    domainProbabilityToPercent(domain.probability) ?? 0
                                                                                                )} %`
                                                                                                : '--'}
                                                                                        </span>
                                                                                        <small>{normalizeAlertLevel(domain.alert_level)}</small>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : null}

                                                                        {(() => {
                                                                            const review = resolveSessionReview(session);
                                                                            if (!review) return null;
                                                                            if (isNormalizedProfessionalReview(review)) {
                                                                                return (
                                                                                    <div className="seguimiento-session-review">
                                                                                        <strong>Revisión registrada</strong>
                                                                                        <div><span>Estado:</span>{review.reviewStatus}</div>
                                                                                        <div><span>Concepto inicial:</span>{review.initialConcept}</div>
                                                                                        <div><span>Recomendación profesional:</span>{review.recommendation}</div>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <div className="seguimiento-session-review">
                                                                                    <strong>Revisión registrada</strong>
                                                                                    <div><span>Estado:</span>{normalizeReviewStatus(review.review_status)}</div>
                                                                                    <div><span>Concepto inicial:</span>{normalizeBackendText(review.initial_concept, 'Sin concepto registrado')}</div>
                                                                                    <div><span>Recomendación profesional:</span>{normalizeBackendText(review.recommendation, 'Sin recomendación registrada')}</div>
                                                                                </div>
                                                                            );
                                                                        })()}

                                                                        <div
                                                                            className="seguimiento-session-actions"
                                                                            onClick={(event) => event.stopPropagation()}
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                className="seguimiento-inline-btn"
                                                                                onClick={(event) => handleOpenReport(event, sessionKey)}
                                                                                disabled={!isSessionProcessed(session)}
                                                                                title={isSessionProcessed(session) ? 'Ver reporte de cuestionario' : 'Reporte disponible cuando el cuestionario esté procesado.'}
                                                                            >
                                                                                Ver reporte
                                                                            </button>
                                                                            {!isSessionProcessed(session) ? (
                                                                                <span className="seguimiento-session-hint">Reporte disponible cuando el cuestionario esté procesado.</span>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}
                                        </div>
                                            </>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    </>
                ) : null}
            </section>

            <Modal isOpen={createCaseModalOpen} onClose={closeCreateCaseModal}>
                <div className="seguimiento-case-modal">
                    <h2>Crear caso</h2>
                    <p className="seguimiento-case-modal-description">
                        Un caso permite agrupar cuestionarios relacionados con una misma persona o situación para facilitar el seguimiento en el tiempo.
                    </p>
                    <label className="seguimiento-case-field">
                        <span>Etiqueta del caso</span>
                        <input
                            type="text"
                            value={createCaseLabel}
                            onChange={(event) => {
                                setCreateCaseLabel(event.target.value);
                                setCreateCaseError(null);
                            }}
                            placeholder="Ej. Hijo mayor, Seguimiento escolar, Caso ansiedad"
                            maxLength={CREATE_CASE_MAX_LENGTH}
                        />
                    </label>
                    {createCaseLabelError && createCaseLabel.trim().length > 0 ? (
                        <p className="seguimiento-case-helper error">{createCaseLabelError}</p>
                    ) : null}
                    {createCaseError ? <div className="seguimiento-alert error">{createCaseError}</div> : null}
                    <div className="seguimiento-case-actions">
                        <button type="button" className="seguimiento-inline-btn ghost" onClick={closeCreateCaseModal} disabled={createCaseWorking}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="seguimiento-create-btn"
                            onClick={() => handleCreateCase().catch(() => undefined)}
                            disabled={createCaseWorking || createCaseLabelError !== null}
                        >
                            {createCaseWorking ? 'Guardando...' : 'Crear caso'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={archiveTargetCase !== null} onClose={() => setArchiveTargetCase(null)}>
                <div className="seguimiento-case-modal">
                    <h2>¿Archivar este caso?</h2>
                    <p className="seguimiento-case-modal-description">
                        El caso dejará de mostrarse entre los casos activos, pero sus cuestionarios y reportes no se eliminarán.
                    </p>
                    {caseStatusActionError ? <div className="seguimiento-alert error">{caseStatusActionError}</div> : null}
                    <div className="seguimiento-case-actions">
                        <button
                            type="button"
                            className="seguimiento-inline-btn ghost"
                            onClick={() => setArchiveTargetCase(null)}
                            disabled={caseStatusWorkingId === archiveTargetCase?.case_id}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="seguimiento-create-btn"
                            disabled={caseStatusWorkingId === archiveTargetCase?.case_id}
                            onClick={() => {
                                if (!archiveTargetCase) return;
                                handleCaseStatusChange(archiveTargetCase, 'archived').catch(() => undefined);
                            }}
                        >
                            {caseStatusWorkingId === archiveTargetCase?.case_id ? 'Guardando...' : 'Archivar caso'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={reportModalOpen} onClose={closeReportModal}>
                <div className="seguimiento-report-modal">
                    <h2>Generar reporte de seguimiento</h2>
                    <p className="seguimiento-report-copy">
                        Configura el periodo y el alcance del reporte. El documento se generará desde los datos del seguimiento del padre o tutor sin salir de esta vista.
                    </p>
                    <div className="seguimiento-report-form">
                        <label className="seguimiento-case-field">
                            <span>Periodo</span>
                            <CustomSelect
                                value={reportPeriod}
                                options={reportPeriodOptions.map((item) => ({ value: item.value, label: item.label }))}
                                onChange={(value) => setReportPeriod(value as ReportPeriodValue)}
                                ariaLabel="Seleccionar periodo del reporte"
                            />
                        </label>
                        {reportPeriod === 'custom' ? (
                            <>
                                <label className="seguimiento-case-field">
                                    <span>Fecha inicial</span>
                                    <input type="date" value={reportDateFrom} onChange={(event) => setReportDateFrom(event.target.value)} />
                                </label>
                                <label className="seguimiento-case-field">
                                    <span>Fecha final</span>
                                    <input type="date" value={reportDateTo} onChange={(event) => setReportDateTo(event.target.value)} />
                                </label>
                            </>
                        ) : null}
                        <label className="seguimiento-case-field">
                            <span>Caso</span>
                            <CustomSelect
                                value={reportCaseId}
                                options={caseOptions}
                                onChange={setReportCaseId}
                                ariaLabel="Seleccionar caso del reporte"
                            />
                        </label>
                    </div>
                    <div className="seguimiento-report-toggles">
                        <label className="seguimiento-report-toggle">
                            <input type="checkbox" checked={reportIncludeSessions} onChange={(event) => setReportIncludeSessions(event.target.checked)} />
                            <span>Incluir cuestionarios recientes</span>
                        </label>
                        <label className="seguimiento-report-toggle">
                            <input type="checkbox" checked={reportIncludeDomains} onChange={(event) => setReportIncludeDomains(event.target.checked)} />
                            <span>Incluir desglose por dominio</span>
                        </label>
                        <label className="seguimiento-report-toggle">
                            <input type="checkbox" checked={reportIncludeCharts} onChange={(event) => setReportIncludeCharts(event.target.checked)} />
                            <span>Incluir gráficas</span>
                        </label>
                    </div>
                    {reportError ? <div className="seguimiento-alert error">{reportError}</div> : null}
                    <div className="seguimiento-case-actions">
                        <button type="button" className="seguimiento-inline-btn ghost" onClick={closeReportModal} disabled={reportWorking}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="seguimiento-create-btn"
                            onClick={() => handleGenerateFollowUpReport().catch(() => undefined)}
                            disabled={reportWorking}
                        >
                            {reportWorking ? 'Generando...' : 'Descargar reporte'}
                        </button>
                    </div>
                </div>
            </Modal>

            <QuestionnaireReportDetailModal
                isOpen={reportSessionId !== null}
                sessionId={reportSessionId}
                role="padre"
                onClose={() => setReportSessionId(null)}
            />
        </div>
    );
}
