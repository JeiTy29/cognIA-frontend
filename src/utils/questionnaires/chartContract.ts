import type {
    QuestionnaireDashboardChartDTO,
    QuestionnaireDashboardChartPointDTO,
    QuestionnaireDashboardChartRecordDTO,
    QuestionnaireDashboardChartSourceDTO
} from '../../services/questionnaires/questionnaires.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function getChartItems(source: QuestionnaireDashboardChartSourceDTO | null | undefined): QuestionnaireDashboardChartPointDTO[] {
    if (Array.isArray(source)) return source;
    if (source && Array.isArray(source.items)) return source.items;
    return [];
}

export function getChartUnit(source: QuestionnaireDashboardChartSourceDTO | null | undefined) {
    if (!source || Array.isArray(source)) return null;
    return nonEmptyString(source.unit ?? source.metric_unit);
}

export function getChartUnitLabel(source: QuestionnaireDashboardChartSourceDTO | null | undefined) {
    if (!source || Array.isArray(source)) return null;
    return nonEmptyString(source.unit_label ?? source.metric_label);
}

export function getChartEmptyState(source: QuestionnaireDashboardChartSourceDTO | null | undefined) {
    if (!source || Array.isArray(source)) return null;
    return nonEmptyString(source.empty_state);
}

export function getChartSource(
    charts: QuestionnaireDashboardChartRecordDTO | Record<string, unknown> | null | undefined,
    keys: string[]
): QuestionnaireDashboardChartSourceDTO | null {
    if (!charts) return null;
    for (const key of keys) {
        const candidate = (charts as Record<string, unknown>)[key];
        if (Array.isArray(candidate)) return candidate as QuestionnaireDashboardChartPointDTO[];
        const record = asRecord(candidate);
        if (record && Array.isArray(record.items)) {
            return {
                ...(record as QuestionnaireDashboardChartDTO),
                items: record.items as QuestionnaireDashboardChartPointDTO[]
            };
        }
    }
    return null;
}
