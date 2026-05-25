import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import '../Plataforma.css';
import './SeguimientoGuardian.css';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import {
    DashboardEmptyState,
    DivergingDeltaChart,
    DashboardMetricCard,
    DashboardSection,
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
import {
    formatDateTime,
    normalizeAlertLevel,
    normalizeBooleanLabel,
    normalizeCaseStatus,
    normalizeDomainLabel,
    normalizeQuestionnaireMode,
    normalizeSessionStatus
} from '../../../utils/questionnaires/presentation';
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
    const label = item.display_label ?? item.private_label ?? 'Caso sin etiqueta';
    const publicId = item.case_public_id ? ` · ${item.case_public_id}` : '';
    return `${label}${publicId}`;
}

function resolveCaseLabel(item: QuestionnaireCaseDTO | null | undefined) {
    return item?.display_label ?? item?.private_label ?? item?.case_public_id ?? 'Caso sin etiqueta';
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

export default function SeguimientoGuardian() {
    const [months, setMonths] = useState('3');
    const [caseId, setCaseId] = useState('');
    const [caseStatusFilter, setCaseStatusFilter] = useState<CaseStatusFilter>('active');
    const [dashboard, setDashboard] = useState<GuardianDashboardDTO | null>(null);
    const [cases, setCases] = useState<QuestionnaireCaseDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pageNotice, setPageNotice] = useState<string | null>(null);

    const [createCaseModalOpen, setCreateCaseModalOpen] = useState(false);
    const [createCaseLabel, setCreateCaseLabel] = useState('');
    const [createCaseWorking, setCreateCaseWorking] = useState(false);
    const [createCaseError, setCreateCaseError] = useState<string | null>(null);

    const [caseDetailsById, setCaseDetailsById] = useState<Record<string, QuestionnaireCaseDetailDTO>>({});
    const [caseLoadingById, setCaseLoadingById] = useState<Record<string, boolean>>({});
    const [caseErrorById, setCaseErrorById] = useState<Record<string, string | null>>({});
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

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [casesResponse, dashboardResponse] = await Promise.all([
                getQuestionnaireCasesV2({
                    ...(caseStatusFilter === 'all' ? {} : { status: caseStatusFilter }),
                    page: 1,
                    page_size: 50
                }),
                getGuardianQuestionnaireDashboardV2({
                    months: Number(months),
                    ...(caseId ? { case_id: caseId } : {})
                })
            ]);
            setCases(casesResponse.items);
            setDashboard(dashboardResponse);
        } catch {
            setError('No fue posible cargar los casos. Intenta nuevamente.');
            setCases([]);
            setDashboard(null);
        } finally {
            setLoading(false);
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
                setExpandedSessionByCaseId((prev) => {
                    if (prev[nextCaseId] || sortedSessions.length === 0) return prev;
                    return { ...prev, [nextCaseId]: resolveSessionKey(sortedSessions[0]) };
                });
                return normalizedDetail;
            } catch {
                setCaseErrorById((prev) => ({ ...prev, [nextCaseId]: 'No fue posible cargar las sesiones de este caso.' }));
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
        visibleCases.forEach((item) => {
            if (item.case_id) {
                loadCaseDetail(item.case_id).catch(() => undefined);
            }
        });
    }, [loadCaseDetail, visibleCases]);

    useEffect(() => {
        setExpandedDashboardByCaseId((previous) => {
            if (visibleCases.length === 0) return previous;
            const nextState = { ...previous };
            visibleCases.forEach((item, index) => {
                if (!(item.case_id in nextState)) {
                    nextState[item.case_id] = visibleCases.length === 1 || index === 0;
                }
            });
            return nextState;
        });
    }, [visibleCases]);

    const summary = dashboard?.summary ?? null;
    const hasCases = cases.length > 0;
    const createCaseLabelError = validateCaseLabel(createCaseLabel);

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
            setCreateCaseModalOpen(false);
            setCreateCaseLabel('');
            setPageNotice(`El caso "${resolveCaseLabel(createdCase)}" se creó correctamente.`);
            await loadDashboard();
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
            ? 'Cuando archives un caso aparecerá aquí, junto con sus sesiones y reportes disponibles.'
            : 'Cuando inicies un cuestionario podrás crear un caso para agrupar seguimientos.';

    return (
        <div className="plataforma-view">
            <section className="seguimiento-guardian" aria-label="Casos y seguimiento">
                <div className="seguimiento-header">
                    <div>
                        <h1>Casos</h1>
                        <p>
                            Un caso permite agrupar cuestionarios relacionados con una misma persona o situación para facilitar el seguimiento en el tiempo.
                        </p>
                    </div>
                    <div className="seguimiento-header-actions">
                        <div className="seguimiento-filters">
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
                        <div className="seguimiento-header-button-row">
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
                {error ? <div className="seguimiento-alert error">{error}</div> : null}
                {caseStatusActionError ? <div className="seguimiento-alert error">{caseStatusActionError}</div> : null}

                {loading ? <div className="seguimiento-empty">Cargando casos...</div> : null}

                {!loading && !hasCases ? (
                    <div className="seguimiento-empty-card">
                        <h2>{emptyTitle}</h2>
                        <p>{emptyCopy}</p>
                    </div>
                ) : null}

                {!loading && hasCases ? (
                    <>
                        <div className="seguimiento-summary-grid">
                            <article className="seguimiento-summary-card">
                                <strong>Total de casos</strong>
                                <span>{summary?.total_cases ?? cases.length}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Total de sesiones</strong>
                                <span>{summary?.total_sessions ?? 0}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Sesiones procesadas</strong>
                                <span>{summary?.processed_sessions ?? 0}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Casos con revisión profesional</strong>
                                <span>{summary?.cases_needing_professional_review ?? 0}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Mayor nivel de alerta</strong>
                                <span>{normalizeAlertLevel(summary?.highest_alert_level)}</span>
                            </article>
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
                                const deltaBars = dashboardViewModel.domains
                                    .filter((item) => typeof item.deltaPct === 'number')
                                    .map((item) => ({ label: item.domainLabel, value: item.deltaPct ?? 0 }));
                                const sessionsCount = dashboardViewModel.sessionsCount;
                                const isArchived = (caseItem.status ?? '').trim().toLowerCase() === 'archived';
                                const isDashboardExpanded = expandedDashboardByCaseId[caseItem.case_id] ?? false;

                                return (
                                    <article key={caseItem.case_id} className="seguimiento-case-card">
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
                                                        {sessionsCount} {sessionsCount === 1 ? 'sesión' : 'sesiones'}
                                                    </span>
                                                </div>
                                                <div className="seguimiento-case-actions">
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
                                                <span>{formatDateTime(dashboardViewModel.latestSessionAt)}</span>
                                            </div>
                                            <div>
                                                <strong>Alerta principal</strong>
                                                <span>{dashboardViewModel.highestAlertLabel}</span>
                                            </div>
                                        </div>

                                        <div className="seguimiento-domain-list">
                                            <h3>Última medición por dominio</h3>
                                            <p>
                                                Estos valores corresponden a la última sesión del caso dentro del periodo seleccionado. No representan un promedio histórico.
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
                                                                        : '—'}
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
                                                        label="Sesiones registradas"
                                                        value={dashboardViewModel.sessionsCount}
                                                        helper={dashboardViewModel.casePublicId || 'Caso sin código público'}
                                                        tone="info"
                                                    />
                                                    <DashboardMetricCard
                                                        label="Última sesión"
                                                        value={formatDateTime(dashboardViewModel.latestSessionAt)}
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
                                                    description="Permite observar cómo han variado los dominios evaluados a lo largo de las sesiones de este caso."
                                                >
                                                    <LineChart
                                                        data={dashboardViewModel.trendPoints}
                                                        series={[...guardianDomainSeries]}
                                                        ariaLabel={`Evolución por dominio de ${dashboardViewModel.caseLabel}`}
                                                        emptyMessage="No hay suficientes sesiones para mostrar evolución en el periodo seleccionado."
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
                                                    description="Estos valores corresponden a la última sesión del caso dentro del periodo seleccionado. No representan un promedio histórico."
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
                                                    title="Cambio frente a la sesión anterior"
                                                    description="Muestra el aumento o disminución de cada dominio respecto a la sesión anterior."
                                                >
                                                    <DivergingDeltaChart
                                                        data={deltaBars}
                                                        ariaLabel={`Cambio por dominio frente a la sesión anterior de ${dashboardViewModel.caseLabel}`}
                                                        emptyMessage="No hay suficientes sesiones para comparar cambios."
                                                        formatter={formatChartPercent}
                                                        helper="Valores positivos indican aumento frente a la sesión anterior; valores negativos indican disminución."
                                                    />
                                                </DashboardSection>

                                                <DashboardSection
                                                    className="case-dashboard-wide case-dashboard-chart-large"
                                                    title="Línea de sesiones del caso"
                                                    description="Resume la secuencia de sesiones registradas para este caso."
                                                >
                                                    <TimelineChart
                                                        items={dashboardViewModel.timelineItems}
                                                        ariaLabel={`Secuencia de sesiones de ${dashboardViewModel.caseLabel}`}
                                                        emptyMessage="No hay sesiones suficientes para construir la línea temporal del caso."
                                                    />
                                                </DashboardSection>
                                            </div>
                                        ) : null}

                                        <div className="seguimiento-sessions">
                                            <div className="seguimiento-sessions-header">
                                                <h3>Sesiones del caso</h3>
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

                                            {caseIsLoading ? <p className="seguimiento-session-empty">Cargando sesiones del caso...</p> : null}
                                            {!caseIsLoading && caseLoadError ? <p className="seguimiento-session-empty error">{caseLoadError}</p> : null}
                                            {!caseIsLoading && !caseLoadError && caseSessions.length === 0 ? (
                                                <p className="seguimiento-session-empty">Este caso aún no tiene cuestionarios asociados.</p>
                                            ) : null}

                                            {!caseIsLoading && !caseLoadError && caseSessions.length > 0 ? (
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
                                                                    <span>{formatDateTime(session.processed_at ?? session.updated_at ?? session.created_at)}</span>
                                                                    <span>{normalizeSessionStatus(session.status)}</span>
                                                                    <span>{normalizeQuestionnaireMode(session.mode)}</span>
                                                                    <span>{sessionAlert ? `${sessionAlert.domainLabel} · ${sessionAlert.alertLabel}` : 'Sin alerta visible'}</span>
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
                                                                                <span>{formatDateTime(session.created_at)}</span>
                                                                            </div>
                                                                            <div>
                                                                                <strong>Procesada</strong>
                                                                                <span>{formatDateTime(session.processed_at)}</span>
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
                                                                                Alerta principal: {sessionAlert.domainLabel} · {sessionAlert.alertLabel} · {sessionAlert.probabilityLabel}
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

                                                                        <div
                                                                            className="seguimiento-session-actions"
                                                                            onClick={(event) => event.stopPropagation()}
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                className="seguimiento-inline-btn"
                                                                                onClick={(event) => handleOpenReport(event, sessionKey)}
                                                                                disabled={!isSessionProcessed(session)}
                                                                                title={isSessionProcessed(session) ? 'Ver reporte de sesión' : 'Reporte disponible cuando la sesión esté procesada.'}
                                                                            >
                                                                                Ver reporte
                                                                            </button>
                                                                            {!isSessionProcessed(session) ? (
                                                                                <span className="seguimiento-session-hint">Reporte disponible cuando la sesión esté procesada.</span>
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
                            <span>Incluir sesiones recientes</span>
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
