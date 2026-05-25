import {
    normalizeAlertLevel,
    normalizeBooleanLabel,
    normalizeCaseStatus,
    normalizeDomainLabel,
    normalizeModeLabel,
    normalizeRequestStatus,
    normalizeReviewStatus,
    normalizeSessionStatus,
    safeDisplayText
} from '../questionnaires/presentation';
import {
    daysBetween,
    normalizeMaybeNegativePercentValue,
    normalizePercentValue,
    toFiniteNumber,
    toPositiveNumber
} from './chartScales';

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
        { label: '0–2 días', min: 0, max: 2 },
        { label: '3–7 días', min: 3, max: 7 },
        { label: '8–14 días', min: 8, max: 14 },
        { label: '15–30 días', min: 15, max: 30 },
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
