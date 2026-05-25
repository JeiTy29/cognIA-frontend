export function clamp(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
}

export function toFiniteNumber(value: unknown, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

export function toPositiveNumber(value: unknown, fallback = 0) {
    const numeric = toFiniteNumber(value, fallback);
    return numeric > 0 ? numeric : fallback;
}

export function normalizePercentValue(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    const scaled = numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric;
    return clamp(scaled, 0, 100);
}

export function normalizeMaybeNegativePercentValue(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    const scaled = numeric >= -1 && numeric <= 1 ? numeric * 100 : numeric;
    return clamp(scaled, -100, 100);
}

export function createLinearTicks(min: number, max: number, count = 5) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || count <= 1) {
        return [0, 25, 50, 75, 100];
    }

    if (min === max) return [min];

    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, index) => min + step * index);
}

export function getLabelStride(length: number, maxLabels = 6) {
    if (length <= maxLabels) return 1;
    return Math.ceil(length / maxLabels);
}

export function getSymmetricExtent(values: number[], fallback = 100) {
    const sanitized = values.filter((value) => Number.isFinite(value)).map((value) => Math.abs(value));
    if (sanitized.length === 0) return fallback;
    const maxValue = Math.max(...sanitized);
    if (maxValue <= 5) return 10;
    if (maxValue <= 10) return 20;
    if (maxValue <= 25) return 30;
    if (maxValue <= 50) return 60;
    return 100;
}

export function sumValues(values: Array<number | null | undefined>) {
    return values.reduce<number>((sum, value) => sum + (Number.isFinite(value) ? Number(value) : 0), 0);
}

export function daysBetween(from: Date, to = new Date()) {
    const diff = to.getTime() - from.getTime();
    if (!Number.isFinite(diff)) return null;
    return Math.max(0, Math.floor(diff / 86400000));
}
