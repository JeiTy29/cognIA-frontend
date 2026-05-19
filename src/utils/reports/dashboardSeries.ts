type SeriesAggregationMode = 'sum' | 'max' | 'latest';

type ExtractDashboardSeriesOptions = {
    preferredPath?: string;
    aggregateDuplicatePeriods?: boolean;
    aggregator?: SeriesAggregationMode;
};

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function getSeriesValue(record: Record<string, unknown>) {
    return toNumber(record.count) ?? toNumber(record.value) ?? toNumber(record.total) ?? toNumber(record.amount) ?? 0;
}

function getRawPeriod(record: Record<string, unknown>) {
    for (const key of ['month', 'bucket', 'period', 'date', 'label']) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return null;
}

function isLikelyNumericString(value: string) {
    return /^[0-9]+(?:\.[0-9]+)?$/.test(value.trim());
}

function isValidDateYear(date: Date) {
    const year = date.getUTCFullYear();
    const currentYear = new Date().getUTCFullYear();
    return year >= 2020 && year <= currentYear + 1;
}

function looksLikeIsoDate(value: string) {
    return /^\d{4}-\d{2}(?:-\d{2})?(?:T.*)?$/.test(value.trim());
}

function tryParseDate(rawPeriod: string | null) {
    if (!rawPeriod || isLikelyNumericString(rawPeriod) || !looksLikeIsoDate(rawPeriod)) return null;
    const parsed = new Date(rawPeriod);
    if (Number.isNaN(parsed.getTime()) || !isValidDateYear(parsed)) return null;
    return parsed;
}

function formatLongMonth(date: Date) {
    return new Intl.DateTimeFormat('es-CO', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    }).format(date);
}

const SHORT_MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatShortMonth(date: Date) {
    return `${SHORT_MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function resolvePeriodMeta(rawPeriod: string | null, index: number) {
    if (!rawPeriod) {
        return {
            periodKey: `period-${index + 1}`,
            periodLabel: `Periodo ${index + 1}`,
            axisLabel: `P${index + 1}`,
            sortableDateKey: null as number | null
        };
    }

    const parsedDate = tryParseDate(rawPeriod);
    if (parsedDate) {
        const monthKey = `${parsedDate.getUTCFullYear()}-${String(parsedDate.getUTCMonth() + 1).padStart(2, '0')}`;
        return {
            periodKey: monthKey,
            periodLabel: formatLongMonth(parsedDate),
            axisLabel: formatShortMonth(parsedDate),
            sortableDateKey: parsedDate.getTime()
        };
    }

    if (looksLikeIsoDate(rawPeriod)) {
        return {
            periodKey: `invalid-${index + 1}`,
            periodLabel: 'Periodo no válido',
            axisLabel: 'Periodo',
            sortableDateKey: null as number | null
        };
    }

    const normalized = rawPeriod.trim();
    if (!normalized || isLikelyNumericString(normalized)) {
        return {
            periodKey: `invalid-${index + 1}`,
            periodLabel: 'Periodo no válido',
            axisLabel: 'Periodo',
            sortableDateKey: null as number | null
        };
    }

    return {
        periodKey: normalized.toLowerCase(),
        periodLabel: normalized,
        axisLabel: normalized,
        sortableDateKey: null as number | null
    };
}

function isSeriesItem(value: unknown) {
    const record = asRecord(value);
    if (!record) return false;
    const hasPeriodKey = ['month', 'bucket', 'period', 'date', 'label'].some((key) => typeof record[key] === 'string');
    const hasValueKey = ['count', 'value', 'total', 'amount'].some((key) => toNumber(record[key]) !== null);
    return hasPeriodKey || hasValueKey;
}

function findSeriesArrayInRecord(record: Record<string, unknown>, depth: number): unknown[] | null {
    if (depth > 5) return null;

    const directSeries = asArray(record.series);
    if (directSeries.length > 0 && directSeries.some(isSeriesItem)) {
        return directSeries;
    }

    for (const value of Object.values(record)) {
        const nested = asRecord(value);
        if (!nested) continue;
        const found = findSeriesArrayInRecord(nested, depth + 1);
        if (found) return found;
    }

    return null;
}

function resolvePreferredSeries(payload: unknown, preferredPath?: string) {
    if (!preferredPath) return null;
    const parts = preferredPath.split('.').filter(Boolean);
    let cursor: unknown = payload;

    for (const part of parts) {
        const record = asRecord(cursor);
        if (!record) return null;
        cursor = record[part];
    }

    const preferredArray = asArray(cursor);
    if (preferredArray.length > 0 && preferredArray.some(isSeriesItem)) {
        return preferredArray;
    }
    return null;
}

function aggregateValues(existing: number, next: number, mode: SeriesAggregationMode) {
    if (mode === 'max') return Math.max(existing, next);
    if (mode === 'latest') return next;
    return existing + next;
}

export type DashboardSeriesPoint = {
    periodKey: string;
    rawPeriod: string | null;
    periodLabel: string;
    axisLabel: string;
    value: number;
};

export function extractDashboardSeries(payload: unknown, options: ExtractDashboardSeriesOptions = {}): DashboardSeriesPoint[] {
    const rootArray = asArray(payload);
    const seriesSource =
        resolvePreferredSeries(payload, options.preferredPath) ??
        (rootArray.some(isSeriesItem)
            ? rootArray
            : findSeriesArrayInRecord(asRecord(payload) ?? {}, 0) ?? []);

    const points = seriesSource
        .map((item, index) => {
            const record = asRecord(item);
            if (!record) return null;
            const rawPeriod = getRawPeriod(record);
            const meta = resolvePeriodMeta(rawPeriod, index);
            return {
                rawPeriod,
                periodKey: meta.periodKey,
                periodLabel: meta.periodLabel,
                axisLabel: meta.axisLabel,
                value: getSeriesValue(record),
                sortableDateKey: meta.sortableDateKey,
                originalIndex: index
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .filter((item) => item.periodLabel !== 'Periodo no válido' && item.axisLabel !== 'Periodo');

    const shouldAggregate = options.aggregateDuplicatePeriods ?? true;
    const aggregator = options.aggregator ?? 'sum';

    const normalized = shouldAggregate
        ? Array.from(
            points.reduce((acc, point) => {
                const existing = acc.get(point.periodKey);
                if (!existing) {
                    acc.set(point.periodKey, point);
                    return acc;
                }
                acc.set(point.periodKey, {
                    ...existing,
                    value: aggregateValues(existing.value, point.value, aggregator),
                    rawPeriod: existing.rawPeriod ?? point.rawPeriod,
                    sortableDateKey: existing.sortableDateKey ?? point.sortableDateKey
                });
                return acc;
            }, new Map<string, (typeof points)[number]>()).values()
        )
        : points;

    return normalized
        .sort((left, right) => {
            if (left.sortableDateKey !== null && right.sortableDateKey !== null) {
                return left.sortableDateKey - right.sortableDateKey;
            }
            if (left.sortableDateKey !== null) return -1;
            if (right.sortableDateKey !== null) return 1;
            return left.originalIndex - right.originalIndex;
        })
        .map((point) => ({
            periodKey: point.periodKey,
            rawPeriod: point.rawPeriod,
            periodLabel: point.periodLabel,
            axisLabel: point.axisLabel,
            value: point.value
        }));
}
