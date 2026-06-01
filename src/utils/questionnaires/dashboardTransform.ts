import type {
    QuestionnaireDashboardChartSourceDTO,
    QuestionnaireDashboardChartPointDTO,
    QuestionnaireHistoryFiltersV2
} from '../../services/questionnaires/questionnaires.types';
import { getAlertLevelMeta, normalizeAlertLevel } from '../dashboard/alerts';
import { getChartItems } from './chartContract';
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

function toChartNumber(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function looksLikeTechnicalId(value: string) {
    const compact = value.replace(/[-_]/g, '');
    return compact.length >= 16 && /^[a-f0-9]+$/i.test(compact);
}

function resolveLabel(point: QuestionnaireDashboardChartPointDTO, index: number) {
    const label = point.label ?? point.name ?? point.key ?? point.date ?? point.month;
    if (!label && point.domain) return getDashboardDomainLabel(point.domain);
    if (!label && point.alert_level) return getAlertLevelMeta(point.alert_level).label;
    if (!label || !String(label).trim()) return `Dato ${index + 1}`;
    const normalized = String(label).trim();
    if (looksLikeTechnicalId(normalized)) return `Caso ${index + 1}`;
    const domainLabel = getDashboardDomainLabel(normalized);
    if (domainLabel !== normalized) return domainLabel;
    const alertMeta = getAlertLevelMeta(normalized);
    if (alertMeta.tone !== 'unknown') return alertMeta.label;
    return normalized;
}

export function normalizeChartSeries(points: QuestionnaireDashboardChartSourceDTO | null | undefined): DashboardChartDatum[] {
    const items = getChartItems(points);
    if (items.length === 0) return [];
    return items.map((point, index) => {
        const record = point as QuestionnaireDashboardChartPointDTO & Record<string, unknown>;
        const value = toChartNumber(point.value ?? point.count ?? point.total ?? point.sessions ?? record.sessions_with_alert);
        const alertCandidate = typeof point.alert_level === 'string' ? point.alert_level : null;
        if (value === null) return null;
        return {
            id: String(point.key ?? point.label ?? index),
            label: resolveLabel(point, index),
            value,
            tone: normalizeAlertLevel(alertCandidate)
        };
    }).filter((item): item is DashboardChartDatum => Boolean(item));
}

export function buildHistoryKpis(
    summary: Record<string, unknown> | null,
    totalFromPagination: number
): HistoryKpis {
    const total = toNumber(summary?.total ?? summary?.total_records) || totalFromPagination;
    const processed = toNumber(summary?.processed ?? summary?.processed_sessions);
    const withAlert = toNumber(summary?.with_alert ?? summary?.sessions_with_alert);
    const needsReview = toNumber(summary?.needs_professional_review ?? summary?.sessions_needs_review);
    const withoutCase = toNumber(summary?.without_case ?? summary?.sessions_without_case);

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
