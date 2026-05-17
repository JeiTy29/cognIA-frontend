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
    for (const key of ['month', 'period', 'date', 'label']) {
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

function formatMonthLabel(rawPeriod: string) {
    if (!rawPeriod || isLikelyNumericString(rawPeriod)) return null;
    const date = new Date(rawPeriod);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();
    if (year < 2020 || year > currentYear + 1) return null;

    return new Intl.DateTimeFormat('es-CO', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    }).format(date);
}

function formatPeriodLabel(rawPeriod: string | null, index: number) {
    if (rawPeriod) {
        const monthLabel = formatMonthLabel(rawPeriod);
        if (monthLabel) return monthLabel;

        const normalized = rawPeriod.trim();
        if (normalized.length > 0 && !isLikelyNumericString(normalized)) {
            return normalized;
        }
        return 'Periodo no válido';
    }
    return `Periodo ${index + 1}`;
}

function isSeriesItem(value: unknown) {
    const record = asRecord(value);
    if (!record) return false;
    const hasPeriodKey = ['month', 'period', 'date', 'label'].some((key) => typeof record[key] === 'string');
    const hasValueKey = ['count', 'value', 'total', 'amount'].some((key) => toNumber(record[key]) !== null);
    return hasPeriodKey || hasValueKey;
}

function findSeriesArrayInRecord(record: Record<string, unknown>, depth: number): unknown[] | null {
    if (depth > 5) return null;

    const directSeries = asArray(record.series);
    if (directSeries.length > 0 && directSeries.some(isSeriesItem)) {
        return directSeries;
    }

    for (const key of [
        'adoption_history',
        'volume_and_growth',
        'user_growth',
        'volume',
        'data',
        'result'
    ]) {
        const nested = asRecord(record[key]);
        if (!nested) continue;
        const found = findSeriesArrayInRecord(nested, depth + 1);
        if (found) return found;
    }

    for (const value of Object.values(record)) {
        if (Array.isArray(value) && value.length > 0 && value.some(isSeriesItem)) {
            return value;
        }

        const nested = asRecord(value);
        if (!nested) continue;
        const found = findSeriesArrayInRecord(nested, depth + 1);
        if (found) return found;
    }

    return null;
}

export type DashboardSeriesPoint = {
    periodLabel: string;
    rawPeriod: string | null;
    value: number;
};

export function extractDashboardSeries(payload: unknown): DashboardSeriesPoint[] {
    const rootArray = asArray(payload);
    const seriesSource = rootArray.some(isSeriesItem)
        ? rootArray
        : findSeriesArrayInRecord(asRecord(payload) ?? {}, 0) ?? [];

    return seriesSource
        .map((item, index) => {
            const record = asRecord(item);
            if (!record) return null;
            const rawPeriod = getRawPeriod(record);
            return {
                rawPeriod,
                periodLabel: formatPeriodLabel(rawPeriod, index),
                value: getSeriesValue(record)
            } satisfies DashboardSeriesPoint;
        })
        .filter((item): item is DashboardSeriesPoint => item !== null);
}
