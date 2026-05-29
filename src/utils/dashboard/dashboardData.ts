import {
    normalizeBackendText,
    normalizeAlertLevel,
    normalizeBooleanLabel,
    normalizeCaseStatus,
    normalizeDomainLabel,
    normalizeModeLabel,
    normalizeRequestStatus,
    normalizeReviewStatus,
    normalizeSessionStatus,
    safeDisplayText,
    formatDateTime
} from '../questionnaires/presentation';
import {
    daysBetween,
    domainProbabilityToPercent,
    normalizeDashboardDelta,
    normalizeDashboardProbability,
    normalizeMaybeNegativePercentValue,
    normalizePercentValue,
    toFiniteNumber,
    toPositiveNumber
} from './chartScales';
import type {
    GuardianDashboardCaseDTO,
    QuestionnaireCaseDTO,
    QuestionnaireCaseDetailDTO,
    QuestionnaireCaseDomainSummaryDTO,
    QuestionnaireCaseTrendPointDTO,
    QuestionnaireEvaluationDomainDTO,
    QuestionnaireHistoryItemV2DTO,
    QuestionnaireReportPreviewDTO,
    QuestionnaireSecureResultsV2DTO,
    QuestionnaireSessionV2DTO
} from '../../services/questionnaires/questionnaires.types';

export type DashboardCountItem = {
    label: string;
    value: number;
    rawKey?: string;
    color?: string;
    meta?: string;
};

type CountBuilderOptions = {
    fallbackLabel?: string;
};

function normalizeGenericLabel(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return 'No disponible';

    const lower = trimmed.toLowerCase();
    if (lower === 'true' || lower === 'false') {
        return normalizeBooleanLabel(lower, 'No disponible');
    }
    if (lower === 'pending' || lower === 'accepted' || lower === 'rejected') {
        return normalizeRequestStatus(lower);
    }
    if (lower === 'in_review' || lower === 'reviewed' || lower === 'orientation_recommended' || lower === 'closed') {
        return normalizeReviewStatus(lower);
    }
    if (lower === 'draft' || lower === 'in_progress' || lower === 'submitted' || lower === 'processed' || lower === 'failed' || lower === 'archived') {
        return normalizeSessionStatus(lower);
    }
    if (lower === 'active') return normalizeCaseStatus(lower);
    if (lower === 'short' || lower === 'medium' || lower === 'complete') {
        return normalizeModeLabel(lower);
    }
    if (lower === 'low' || lower === 'moderate' || lower === 'elevated' || lower === 'high' || lower === 'critical_review') {
        return normalizeAlertLevel(lower);
    }
    return safeDisplayText(trimmed, 'No disponible');
}

export function normalizeDashboardDomain(value: unknown) {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!raw) return 'General';
    if (
        raw.includes('gad') ||
        raw.includes('agor') ||
        raw.includes('worry') ||
        raw.includes('panic') ||
        raw.includes('separation') ||
        raw.includes('social') ||
        raw.includes('anxiety')
    ) {
        return 'Ansiedad';
    }
    if (
        raw.includes('mdd') ||
        raw.includes('pdd') ||
        raw.includes('depressive') ||
        raw.includes('mood') ||
        raw.includes('depression')
    ) {
        return 'Depresión';
    }
    if (
        raw.includes('adhd') ||
        raw.includes('inatt') ||
        raw.includes('hypimp')
    ) {
        return 'TDAH';
    }
    if (
        raw.includes('conduct') ||
        raw.includes('odd') ||
        raw.includes('dmdd') ||
        raw.includes('outburst')
    ) {
        return 'Conducta';
    }
    if (
        raw.includes('elimination') ||
        raw.includes('enuresis') ||
        raw.includes('encopresis')
    ) {
        return 'Eliminación';
    }
    return normalizeDomainLabel(raw);
}

export function buildCountsMap(
    values: unknown[],
    mapLabel: (value: unknown) => string = (value) =>
        normalizeGenericLabel(typeof value === 'string' ? value : String(value ?? '')),
    options?: CountBuilderOptions
) {
    const counts = new Map<string, number>();
    values.forEach((value) => {
        const label = mapLabel(value) || options?.fallbackLabel || 'No disponible';
        counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return counts;
}

export function mapCountsToItems(counts: Map<string, number>) {
    return [...counts.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, 'es-CO'));
}

export function buildMonthlyCountItems(values: Array<string | null | undefined>) {
    const counts = new Map<string, number>();
    values.forEach((value) => {
        if (!value) return;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return;
        const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-01`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return [...counts.entries()]
        .sort((left, right) => new Date(left[0]).getTime() - new Date(right[0]).getTime())
        .map(([label, value]) => ({ label, value }));
}

export function buildDailyCountItems(values: Array<string | null | undefined>) {
    const counts = new Map<string, number>();
    values.forEach((value) => {
        if (!value) return;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return;
        const key = parsed.toISOString().slice(0, 10);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return [...counts.entries()]
        .sort((left, right) => new Date(left[0]).getTime() - new Date(right[0]).getTime())
        .map(([label, value]) => ({ label, value }));
}

export function buildHistogramItems(
    values: Array<number | null | undefined>,
    buckets: Array<{ label: string; min: number; max?: number }>
) {
    return buckets.map((bucket) => ({
        label: bucket.label,
        value: values.filter((value) => {
            if (!Number.isFinite(value)) return false;
            const numeric = Number(value);
            if (numeric < bucket.min) return false;
            if (typeof bucket.max === 'number' && numeric > bucket.max) return false;
            return true;
        }).length
    }));
}

export function buildHeatmapCells<TItem>(
    items: TItem[],
    rows: string[],
    columns: string[],
    getRow: (item: TItem) => string,
    getColumn: (item: TItem) => string
) {
    const counts = new Map<string, number>();
    items.forEach((item) => {
        const row = getRow(item);
        const column = getColumn(item);
        if (!row || !column) return;
        const key = `${row}__${column}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return rows.flatMap((row) =>
        columns.map((column) => ({
            row,
            column,
            value: counts.get(`${row}__${column}`) ?? 0
        }))
    );
}

export function getDominantDomain(
    domains: Array<{ domain?: unknown; probability?: unknown }> | null | undefined
) {
    if (!Array.isArray(domains) || domains.length === 0) return null;
    const sorted = [...domains].sort((left, right) => toFiniteNumber(right.probability, -1) - toFiniteNumber(left.probability, -1));
    return sorted[0] ? normalizeDashboardDomain(sorted[0].domain) : null;
}

export function getHighestAlertLevel(
    domains: Array<{ alert_level?: unknown; probability?: unknown }> | null | undefined
) {
    if (!Array.isArray(domains) || domains.length === 0) return '--';
    const sorted = [...domains].sort((left, right) => toFiniteNumber(right.probability, -1) - toFiniteNumber(left.probability, -1));
    return normalizeAlertLevel(sorted[0]?.alert_level);
}

export function getCaseOrEvaluationTitle(casePublicId: unknown, questionnaireId: unknown, fallback = 'Sin caso') {
    const caseCode = safeDisplayText(casePublicId, '');
    if (caseCode) return `Caso ${caseCode}`;
    const questionnaireCode = safeDisplayText(questionnaireId, '');
    if (questionnaireCode) return `Evaluación ${questionnaireCode}`;
    return fallback;
}

export function buildTimelineItems<TItem>(
    items: TItem[],
    options: {
        getDate: (item: TItem) => string | null | undefined;
        getTitle: (item: TItem) => string;
        getDescription?: (item: TItem) => string;
        getTone?: (item: TItem) => 'neutral' | 'info' | 'success' | 'warning' | 'danger';
    }
) {
    return items
        .map((item) => {
            const date = options.getDate(item);
            if (!date) return null;
            const parsed = new Date(date);
            if (Number.isNaN(parsed.getTime())) return null;
            return {
                date,
                timestamp: parsed.getTime(),
                title: options.getTitle(item),
                description: options.getDescription ? options.getDescription(item) : '',
                tone: options.getTone ? options.getTone(item) : 'neutral'
            };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((left, right) => left.timestamp - right.timestamp);
}

export function buildPercentItems(items: Array<{ label: string; value: unknown }>) {
    return items
        .map((item) => ({
            label: item.label,
            value: normalizePercentValue(item.value)
        }))
        .filter((item): item is { label: string; value: number } => typeof item.value === 'number');
}

export function buildDeltaItems(items: Array<{ label: string; value: unknown }>) {
    return items
        .map((item) => ({
            label: item.label,
            value: normalizeMaybeNegativePercentValue(item.value)
        }))
        .filter((item): item is { label: string; value: number } => typeof item.value === 'number');
}

export function buildProbabilityItems(
    items: Array<{ label: string; value: unknown; meta?: string }>,
    options?: { scale?: 'ratio' | 'percent' | 'auto' }
) {
    return items
        .map((item) => ({
            label: item.label,
            value: normalizeDashboardProbability(item.value, { scale: options?.scale ?? 'auto' }),
            meta: item.meta
        }))
        .filter((item) => typeof item.value === 'number') as Array<{ label: string; value: number; meta?: string }>;
}

export function buildProbabilityDeltaItems(
    items: Array<{ label: string; value: unknown; meta?: string }>,
    options?: { scale?: 'ratio' | 'percent' | 'auto' }
) {
    return items
        .map((item) => ({
            label: item.label,
            value: normalizeDashboardDelta(item.value, { scale: options?.scale ?? 'auto' }),
            meta: item.meta
        }))
        .filter((item) => typeof item.value === 'number') as Array<{ label: string; value: number; meta?: string }>;
}

export function resolveSessionTimelineDate(session: QuestionnaireSessionV2DTO | null | undefined) {
    const record = session as Record<string, unknown> | null | undefined;
    const submittedAt = typeof record?.submitted_at === 'string' ? record.submitted_at : null;
    return (
        session?.processed_at ??
        submittedAt ??
        session?.updated_at ??
        session?.created_at ??
        null
    );
}

export function resolveHistorySessionDate(item: QuestionnaireHistoryItemV2DTO | null | undefined) {
    if (!item) return null;
    const record = item as Record<string, unknown>;
    return (
        safeDisplayText(record.submitted_at, '') ||
        safeDisplayText(record.processed_at, '') ||
        safeDisplayText(item.created_at, '') ||
        safeDisplayText(item.updated_at, '') ||
        null
    );
}

export const resolveHistoryTimelineDate = resolveHistorySessionDate;

function resolveSessionDomains(session: QuestionnaireSessionV2DTO | null | undefined) {
    if (Array.isArray(session?.domains) && session.domains.length > 0) return session.domains;
    if (Array.isArray(session?.result?.domains) && session.result.domains.length > 0) return session.result.domains;
    return [];
}

function resolveTrendTimestamp(
    point: QuestionnaireCaseTrendPointDTO | null | undefined,
    sessionById: Map<string, QuestionnaireSessionV2DTO>
) {
    const sessionId = safeDisplayText(point?.session_id, '');
    if (sessionId) {
        const matchingSession = sessionById.get(sessionId);
        const matchingTimestamp = resolveSessionTimelineDate(matchingSession);
        if (matchingTimestamp) return matchingTimestamp;
    }
    return safeDisplayText(point?.date, '');
}

function mapDomainsToSeriesValues(
    domains: Array<{ domain?: unknown; probability?: unknown }> | null | undefined,
    domainLabels: string[]
) {
    return domainLabels.reduce<Record<string, number | null>>((accumulator, label) => {
        const match = (domains ?? []).find((domainItem) => normalizeDashboardDomain(domainItem.domain) === label);
        accumulator[label] = normalizeDashboardProbability(match?.probability, { scale: 'ratio' });
        return accumulator;
    }, {});
}

type GuardianDomainSummaryRow = {
    label: string;
    latestValue: number | null;
    latestAlertLabel: string;
    peakValue: number | null;
    sessionsWithAlert: number;
};

export type GuardianCaseDashboardDomainRow = {
    domainKey: string;
    domainLabel: string;
    latestPct: number | null;
    maxPct: number | null;
    previousPct: number | null;
    currentPct: number | null;
    deltaPct: number | null;
    latestAlertLabel: string;
    sessionsWithAlert: number;
};

export type GuardianCaseDashboardViewModel = {
    caseId: string;
    caseLabel: string;
    casePublicId: string;
    statusLabel: string;
    sessionsSortedAsc: QuestionnaireSessionV2DTO[];
    sessionsSortedDesc: QuestionnaireSessionV2DTO[];
    domains: GuardianCaseDashboardDomainRow[];
    trendPoints: Array<{ label: string; timestamp: number; values: Record<string, number | null>; meta: string }>;
    timelineItems: Array<{
        date: string;
        title: string;
        description?: string;
        tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
    }>;
    latestSessionAt: string | null;
    sessionsCount: number;
    highestAlertLabel: string;
};

function compareDateAsc(left: string | null | undefined, right: string | null | undefined) {
    const leftValue = Date.parse(left ?? '');
    const rightValue = Date.parse(right ?? '');
    const safeLeft = Number.isFinite(leftValue) ? leftValue : 0;
    const safeRight = Number.isFinite(rightValue) ? rightValue : 0;
    return safeLeft - safeRight;
}

function formatProbabilityLabel(value: number | null) {
    if (typeof value !== 'number') return '--';
    return `${value.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    })} %`;
}

function formatDashboardDateTime(value: string | null | undefined) {
    const parsed = value ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return 'Fecha no disponible';
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).format(parsed);
}

export function buildGuardianCaseDomainSummary(options: {
    sessions?: QuestionnaireSessionV2DTO[] | null;
    domainBreakdown?: QuestionnaireCaseDomainSummaryDTO[] | null;
    domainLabels?: string[];
}) {
    const fallbackBreakdown = Array.isArray(options.domainBreakdown) ? options.domainBreakdown : [];
    const configuredLabels = Array.isArray(options.domainLabels) ? options.domainLabels.filter(Boolean) : [];
    const fallbackLabels = fallbackBreakdown.map((item) => normalizeDashboardDomain(item.domain));
    const sessionLabels = (options.sessions ?? []).flatMap((session) =>
        resolveSessionDomains(session).map((domainItem) => normalizeDashboardDomain(domainItem.domain))
    );
    const labels = [...new Set([...configuredLabels, ...fallbackLabels, ...sessionLabels])];

    const sessionsAsc = [...(options.sessions ?? [])]
        .map((session) => {
            const timestamp = resolveSessionTimelineDate(session);
            return {
                session,
                timestamp: typeof timestamp === 'string' ? timestamp : ''
            };
        })
        .filter((item) => item.timestamp.length > 0 && resolveSessionDomains(item.session).length > 0)
        .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));

    if (sessionsAsc.length > 0) {
        const latestSession = sessionsAsc[sessionsAsc.length - 1]?.session;

        return labels
            .map((label): GuardianDomainSummaryRow => {
                const latestDomain = resolveSessionDomains(latestSession).find(
                    (domainItem) => normalizeDashboardDomain(domainItem.domain) === label
                );
                const values = sessionsAsc
                    .map((entry) =>
                        normalizeDashboardProbability(
                            resolveSessionDomains(entry.session).find(
                                (domainItem) => normalizeDashboardDomain(domainItem.domain) === label
                            )?.probability,
                            { scale: 'ratio' }
                        )
                    )
                    .filter((value): value is number => typeof value === 'number');

                return {
                    label,
                    latestValue: normalizeDashboardProbability(latestDomain?.probability, { scale: 'ratio' }),
                    latestAlertLabel: normalizeAlertLevel(latestDomain?.alert_level),
                    peakValue: values.length > 0 ? Math.max(...values) : null,
                    sessionsWithAlert: sessionsAsc.filter((entry) => {
                        const currentDomain = resolveSessionDomains(entry.session).find(
                            (domainItem) => normalizeDashboardDomain(domainItem.domain) === label
                        );
                        return normalizeAlertLevel(currentDomain?.alert_level) !== '--';
                    }).length
                };
            })
            .filter((item) => item.latestValue !== null || item.peakValue !== null || item.sessionsWithAlert > 0);
    }

    return labels
        .map((label): GuardianDomainSummaryRow => {
            const breakdownItem = fallbackBreakdown.find(
                (domainItem) => normalizeDashboardDomain(domainItem.domain) === label
            );
            return {
                label,
                latestValue: normalizeDashboardProbability(breakdownItem?.latest_probability, { scale: 'ratio' }),
                latestAlertLabel: normalizeAlertLevel(breakdownItem?.latest_alert_level),
                peakValue: normalizeDashboardProbability(breakdownItem?.max_probability, { scale: 'ratio' }),
                sessionsWithAlert: toPositiveNumber(breakdownItem?.sessions_with_alert)
            };
        })
        .filter((item) => item.latestValue !== null || item.peakValue !== null || item.sessionsWithAlert > 0);
}

export function buildGuardianCaseDomainTrend(options: {
    caseEntry?: GuardianDashboardCaseDTO | null;
    caseDetail?: QuestionnaireCaseDetailDTO | null;
    sessions?: QuestionnaireSessionV2DTO[] | null;
    domainLabels: string[];
}): Array<{ label: string; timestamp: number; values: Record<string, number | null>; meta: string }> {
    const sessions = Array.isArray(options.sessions) ? options.sessions : [];
    const sessionById = new Map(
        sessions
            .map((session) => [safeDisplayText(session.session_id ?? session.id, ''), session] as const)
            .filter(([sessionId]) => sessionId.length > 0)
    );

    const sessionPoints = sessions
        .map((session) => {
            const timestamp = resolveSessionTimelineDate(session);
            const timestampLabel = typeof timestamp === 'string' ? timestamp : '';
            const parsed = timestampLabel ? Date.parse(timestampLabel) : Number.NaN;
            const domains = Array.isArray(session.domains)
                ? session.domains
                : Array.isArray(session.result?.domains)
                    ? session.result?.domains
                    : [];
            if (!timestampLabel || Number.isNaN(parsed) || domains.length === 0) return null;
            return {
                label: timestampLabel,
                timestamp: parsed,
                values: mapDomainsToSeriesValues(domains, options.domainLabels),
                meta: normalizeBackendText(session.questionnaire_id ?? session.session_id ?? session.id, '')
            };
        })
        .filter((point): point is NonNullable<typeof point> => Boolean(point))
        .sort((left, right) => left.timestamp - right.timestamp);

    if (sessionPoints.length > 0) {
        return sessionPoints;
    }

    const trendSource = (options.caseEntry?.trend?.length ? options.caseEntry.trend : options.caseDetail?.trend) ?? [];
    return trendSource
        .map((point) => {
            const timestamp = resolveTrendTimestamp(point, sessionById);
            const timestampLabel = typeof timestamp === 'string' ? timestamp : '';
            const parsed = timestampLabel ? Date.parse(timestampLabel) : Number.NaN;
            if (!timestampLabel || Number.isNaN(parsed) || !Array.isArray(point?.domains) || point.domains.length === 0) {
                return null;
            }
            return {
                label: timestampLabel,
                timestamp: parsed,
                values: mapDomainsToSeriesValues(point.domains, options.domainLabels),
                meta: safeDisplayText(point?.session_id, '')
            };
        })
        .filter((point): point is NonNullable<typeof point> => Boolean(point))
        .sort((left, right) => left.timestamp - right.timestamp);
}

export function buildGuardianCaseDashboardViewModel(options: {
    caseItem: QuestionnaireCaseDTO;
    caseEntry?: GuardianDashboardCaseDTO | null;
    caseDetail?: QuestionnaireCaseDetailDTO | null;
    domainLabels: string[];
}) : GuardianCaseDashboardViewModel {
    const allSessionsAsc = [...(options.caseDetail?.sessions ?? [])]
        .sort((left, right) => compareDateAsc(resolveSessionTimelineDate(left), resolveSessionTimelineDate(right)));
    const sessionsAsc = allSessionsAsc
        .filter((session) => resolveSessionDomains(session).length > 0)
        .sort((left, right) => compareDateAsc(resolveSessionTimelineDate(left), resolveSessionTimelineDate(right)));
    const allSessionsDesc = [...allSessionsAsc].reverse();
    const domainBreakdown = Array.isArray(options.caseEntry?.domain_breakdown) && options.caseEntry.domain_breakdown.length > 0
        ? options.caseEntry.domain_breakdown
        : options.caseDetail?.domain_summary ?? [];
    const trendPoints = buildGuardianCaseDomainTrend({
        caseEntry: options.caseEntry,
        caseDetail: options.caseDetail,
        sessions: sessionsAsc,
        domainLabels: options.domainLabels
    });
    const latestPoint = trendPoints[trendPoints.length - 1] ?? null;
    const previousPoint = trendPoints.length >= 2 ? trendPoints[trendPoints.length - 2] : null;

    const labels = [...new Set([
        ...options.domainLabels,
        ...domainBreakdown.map((item) => normalizeDashboardDomain(item.domain)),
        ...sessionsAsc.flatMap((session) => resolveSessionDomains(session).map((domain) => normalizeDashboardDomain(domain.domain)))
    ])];

    const domains = labels
        .map((domainLabel): GuardianCaseDashboardDomainRow => {
            const summaryMatch = domainBreakdown.find((item) => normalizeDashboardDomain(item.domain) === domainLabel);
            const sessionValues = sessionsAsc
                .map((session) => {
                    const domainMatch = resolveSessionDomains(session).find(
                        (domainItem) => normalizeDashboardDomain(domainItem.domain) === domainLabel
                    );
                    return domainProbabilityToPercent(domainMatch?.probability);
                })
                .filter((value): value is number => typeof value === 'number');
            const latestSessionDomain = sessionsAsc.length > 0
                ? resolveSessionDomains(sessionsAsc[sessionsAsc.length - 1]).find(
                    (domainItem) => normalizeDashboardDomain(domainItem.domain) === domainLabel
                )
                : null;
            const latestPct = latestPoint?.values[domainLabel]
                ?? domainProbabilityToPercent(latestSessionDomain?.probability)
                ?? domainProbabilityToPercent(summaryMatch?.latest_probability);
            const maxPct = sessionValues.length > 0
                ? Math.max(...sessionValues)
                : domainProbabilityToPercent(summaryMatch?.max_probability);
            const previousPct = previousPoint?.values[domainLabel] ?? null;
            const currentPct = latestPoint?.values[domainLabel] ?? latestPct;
            const deltaPct =
                typeof currentPct === 'number' && typeof previousPct === 'number'
                    ? currentPct - previousPct
                    : null;

            return {
                domainKey: domainLabel,
                domainLabel,
                latestPct: typeof latestPct === 'number' ? latestPct : null,
                maxPct: typeof maxPct === 'number' ? maxPct : null,
                previousPct: typeof previousPct === 'number' ? previousPct : null,
                currentPct: typeof currentPct === 'number' ? currentPct : null,
                deltaPct,
                latestAlertLabel:
                    normalizeAlertLevel(latestSessionDomain?.alert_level) !== '--'
                        ? normalizeAlertLevel(latestSessionDomain?.alert_level)
                        : normalizeAlertLevel(summaryMatch?.latest_alert_level),
                sessionsWithAlert:
                    sessionsAsc.filter((session) => {
                        const domainMatch = resolveSessionDomains(session).find(
                            (domainItem) => normalizeDashboardDomain(domainItem.domain) === domainLabel
                        );
                        return normalizeAlertLevel(domainMatch?.alert_level) !== '--';
                    }).length || toPositiveNumber(summaryMatch?.sessions_with_alert)
            };
        })
        .filter((domain) =>
            domain.latestPct !== null ||
            domain.maxPct !== null ||
            domain.currentPct !== null ||
            domain.previousPct !== null ||
            domain.sessionsWithAlert > 0
        );

    const timelineItems = buildTimelineItems(allSessionsAsc, {
        getDate: (session) => resolveSessionTimelineDate(session),
        getTitle: (session) => `${normalizeModeLabel(session.mode)} - ${normalizeSessionStatus(session.status)}`,
        getDescription: (session) => {
            const alert = resolveAlertFromDomains(resolveSessionDomains(session));
            const alertDescription = alert
                ? `${alert.domainLabel}: ${alert.alertLabel} (${formatProbabilityLabel(alert.probabilityValue)})`
                : 'Sin alerta principal disponible';
            return `${formatDashboardDateTime(resolveSessionTimelineDate(session))} - ${alertDescription}`;
        },
        getTone: (session) => {
            const alert = resolveAlertFromDomains(resolveSessionDomains(session))?.alertLabel.toLowerCase() ?? '';
            if (alert.includes('alto') || alert.includes('prioritaria')) return 'danger';
            if (alert.includes('elevado') || alert.includes('moderado')) return 'warning';
            if (alert.includes('bajo')) return 'success';
            return 'info';
        }
    });

    const highestAlertLabel =
        domains.find((domain) => domain.latestAlertLabel !== '--')?.latestAlertLabel ??
        normalizeAlertLevel(
            options.caseItem.latest_alert_level ??
            options.caseEntry?.latest_session?.domains?.[0]?.alert_level ??
            domainBreakdown[0]?.latest_alert_level
        );

    return {
        caseId: options.caseItem.case_id,
        caseLabel: normalizeBackendText(
            options.caseItem.display_label ??
            options.caseItem.private_label ??
            options.caseItem.case_public_id ??
            'Caso sin etiqueta',
            'Caso sin etiqueta'
        ),
        casePublicId: safeDisplayText(options.caseItem.case_public_id, ''),
        statusLabel: normalizeCaseStatus(options.caseItem.status),
        sessionsSortedAsc: allSessionsAsc,
        sessionsSortedDesc: allSessionsDesc,
        domains,
        trendPoints,
        timelineItems,
        latestSessionAt:
            resolveSessionTimelineDate(allSessionsDesc[0]) ??
            safeDisplayText(options.caseItem.latest_processed_at, '') ??
            safeDisplayText(options.caseEntry?.latest_session?.processed_at, ''),
        sessionsCount: options.caseItem.sessions_count ?? options.caseEntry?.sessions_count ?? allSessionsAsc.length,
        highestAlertLabel
    };
}

function resolveAlertFromDomains(
    domains: Array<{ domain?: unknown; probability?: unknown; alert_level?: unknown }> | null | undefined
) {
    if (!Array.isArray(domains) || domains.length === 0) return null;
    const sorted = [...domains].sort((left, right) => toFiniteNumber(right.probability, -1) - toFiniteNumber(left.probability, -1));
    const topDomain = sorted[0];
    if (!topDomain) return null;
    return {
        domainLabel: normalizeDashboardDomain(topDomain.domain),
        alertLabel: normalizeAlertLevel(topDomain.alert_level),
        probabilityValue: normalizeDashboardProbability(topDomain.probability, { scale: 'ratio' }),
        probabilityLabel:
            normalizeDashboardProbability(topDomain.probability, { scale: 'ratio' }) !== null
                ? `${normalizeDashboardProbability(topDomain.probability, { scale: 'ratio' })?.toLocaleString('es-CO', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1
                })} %`
                : '--'
    };
}

export function resolveHistoryItemAlert(
    item: QuestionnaireHistoryItemV2DTO,
    source?: QuestionnaireSecureResultsV2DTO | QuestionnaireReportPreviewDTO | null
) {
    const directAlert = normalizeAlertLevel(
        (item as Record<string, unknown>).highest_alert_level ??
        (item as Record<string, unknown>).latest_alert_level ??
        (item as Record<string, unknown>).alert_level
    );
    if (directAlert && directAlert !== '--') {
        return {
            alertLabel: directAlert,
            domainLabel: getDominantDomain((item as Record<string, unknown>).domains as Array<{ domain?: unknown; probability?: unknown }> | undefined) ?? 'General',
            probabilityLabel: '--',
            probabilityValue: null
        };
    }

    const candidateDomainSources = [
        (item as Record<string, unknown>).domains,
        (item as Record<string, unknown>).result && typeof (item as Record<string, unknown>).result === 'object'
            ? ((item as Record<string, unknown>).result as Record<string, unknown>).domains
            : null,
        source?.domains,
        source?.result?.domains
    ];

    for (const candidate of candidateDomainSources) {
        const resolved = resolveAlertFromDomains(candidate as QuestionnaireEvaluationDomainDTO[] | null | undefined);
        if (resolved) return resolved;
    }

    return null;
}

export function formatHistoryTimelineDescription(options: {
    item: QuestionnaireHistoryItemV2DTO;
    alert: ReturnType<typeof resolveHistoryItemAlert>;
}) {
    const caseLabel = getCaseOrEvaluationTitle(
        options.item.case_public_id ?? options.item.case?.case_public_id,
        options.item.questionnaire_id,
        'Cuestionario sin caso'
    );
    if (!options.alert) {
        return `${caseLabel} - ${normalizeSessionStatus(options.item.status)} - Sin alerta visible`;
    }
    return `${caseLabel} - ${options.alert.domainLabel}: ${options.alert.alertLabel} (${options.alert.probabilityLabel})`;
}

export function formatGuardianTrendAxisLabel(value: string) {
    const raw = safeDisplayText(value, '');
    if (!raw) return 'Fecha no disponible';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    const day = new Intl.DateTimeFormat('es-CO', { day: '2-digit' }).format(parsed);
    const month = new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(parsed).replace('.', '');
    const hour = new Intl.DateTimeFormat('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(parsed);
    return `${day} ${month} ${hour}`;
}

export function formatGuardianTrendTooltipLabel(value: string) {
    return formatDateTime(value);
}

export function buildAgingBuckets(
    values: Array<string | null | undefined>,
    referenceDate = new Date()
) {
    const days = values
        .map((value) => {
            if (!value) return null;
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) return null;
            return daysBetween(parsed, referenceDate);
        })
        .filter((value): value is number => typeof value === 'number');

    return buildHistogramItems(days, [
        { label: '0-2 días', min: 0, max: 2 },
        { label: '3-7 días', min: 3, max: 7 },
        { label: '8-14 días', min: 8, max: 14 },
        { label: '15-30 días', min: 15, max: 30 },
        { label: 'Más de 30 días', min: 31 }
    ]);
}

export function summarizeRole(value: unknown) {
    const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (raw === 'GUARDIAN' || raw === 'PADRE' || raw === 'TUTOR') return 'Padre/Tutor';
    if (raw === 'PSYCHOLOGIST') return 'Psicólogo';
    if (raw === 'ADMIN') return 'Administrador';
    if (raw === 'SYSTEM') return 'Sistema';
    return 'No definido';
}

export function summarizeActiveState(value: unknown) {
    if (typeof value === 'boolean') return value ? 'Activos' : 'Inactivos';
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (raw === 'active' || raw === 'true') return 'Activos';
    if (raw === 'inactive' || raw === 'false') return 'Inactivos';
    if (raw === 'pending') return 'Pendientes';
    return 'No definido';
}

export function buildRequestStateItems(summary?: { pending_count?: number | null; accepted_count?: number | null; rejected_count?: number | null } | null) {
    return [
        { label: 'Pendiente', value: toPositiveNumber(summary?.pending_count) },
        { label: 'Aceptada', value: toPositiveNumber(summary?.accepted_count) },
        { label: 'Rechazada', value: toPositiveNumber(summary?.rejected_count) }
    ].filter((item) => item.value > 0);
}
