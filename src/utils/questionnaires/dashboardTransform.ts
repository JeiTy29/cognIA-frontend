import type {
    QuestionnaireDashboardChartPointDTO,
    QuestionnaireHistoryFiltersV2,
    QuestionnaireHistoryItemV2DTO
} from '../../services/questionnaires/questionnaires.types';
import { getAlertLevelMeta, normalizeAlertLevel } from '../dashboard/alerts';
import { getDashboardDomainLabel } from './dashboardLabels';

export interface DashboardChartDatum {
    id: string;
    label: string;
    value: number;
    tone: ReturnType<typeof normalizeAlertLevel>;
}

export interface HistoryKpis {
    total: number;
    processed: number;
    withAlert: number;
    needsReview: number;
    withoutCase: number;
}

export interface ActiveFilterChip {
    key: string;
    label: string;
    value: string;
}

function toNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function resolveLabel(point: QuestionnaireDashboardChartPointDTO, index: number) {
    const label = point.label ?? point.name ?? point.key ?? point.date ?? point.month;
    if (!label && point.domain) return getDashboardDomainLabel(point.domain);
    if (!label && point.alert_level) return getAlertLevelMeta(point.alert_level).label;
    if (!label || !String(label).trim()) return `Dato ${index + 1}`;
    const normalized = String(label).trim();
    const domainLabel = getDashboardDomainLabel(normalized);
    if (domainLabel !== normalized) return domainLabel;
    const alertMeta = getAlertLevelMeta(normalized);
    if (alertMeta.tone !== 'unknown') return alertMeta.label;
    return normalized;
}

export function normalizeChartSeries(points: QuestionnaireDashboardChartPointDTO[] | null | undefined): DashboardChartDatum[] {
    if (!Array.isArray(points) || points.length === 0) return [];
    return points.map((point, index) => {
        const value = toNumber(point.value ?? point.count ?? point.total ?? point.sessions);
        const alertCandidate = typeof point.alert_level === 'string' ? point.alert_level : null;
        return {
            id: String(point.key ?? point.label ?? index),
            label: resolveLabel(point, index),
            value,
            tone: normalizeAlertLevel(alertCandidate)
        };
    });
}

export function buildHistoryKpis(
    items: QuestionnaireHistoryItemV2DTO[],
    summary: Record<string, unknown> | null,
    totalFromPagination: number
): HistoryKpis {
    const total = toNumber(summary?.total ?? summary?.total_records) || totalFromPagination;
    const processed =
        toNumber(summary?.processed ?? summary?.processed_sessions) ||
        items.filter((item) => String(item.status ?? '').toLowerCase() === 'processed').length;
    const withAlert =
        toNumber(summary?.with_alert ?? summary?.sessions_with_alert) ||
        items.filter((item) => normalizeAlertLevel(item.latest_alert_level ?? null) !== 'unknown').length;
    const needsReview =
        toNumber(summary?.needs_professional_review ?? summary?.sessions_needs_review) ||
        items.filter((item) => item.needs_professional_review === true).length;
    const withoutCase =
        toNumber(summary?.without_case ?? summary?.sessions_without_case) ||
        items.filter((item) => !item.case_id).length;

    return {
        total,
        processed,
        withAlert,
        needsReview,
        withoutCase
    };
}

export function buildActiveFilterChips(filters: QuestionnaireHistoryFiltersV2): ActiveFilterChip[] {
    const entries: Array<{ key: keyof QuestionnaireHistoryFiltersV2; label: string }> = [
        { key: 'status', label: 'Estado' },
        { key: 'case_label', label: 'Caso/etiqueta' },
        { key: 'case_public_id', label: 'Caso público' },
        { key: 'tag', label: 'Tag' },
        { key: 'q', label: 'Buscar' },
        { key: 'domain', label: 'Dominio' },
        { key: 'alert_level', label: 'Alerta' },
        { key: 'date_from', label: 'Desde' },
        { key: 'date_to', label: 'Hasta' },
        { key: 'needs_professional_review', label: 'Revisión' }
    ];

    return entries
        .map(({ key, label }) => {
            const value = filters[key];
            if (typeof value === 'boolean') {
                return {
                    key: String(key),
                    label,
                    value: value ? 'Si' : 'No'
                };
            }
            if (typeof value === 'number') {
                return {
                    key: String(key),
                    label,
                    value: String(value)
                };
            }
            if (typeof value !== 'string' || value.trim().length === 0) return null;
            const normalizedValue =
                key === 'domain'
                    ? getDashboardDomainLabel(value)
                    : key === 'alert_level'
                        ? getAlertLevelMeta(value).label
                        : value.trim();
            return {
                key: String(key),
                label,
                value: normalizedValue
            };
        })
        .filter((item): item is ActiveFilterChip => Boolean(item));
}
