import { apiGet } from '../api/httpClient';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

export interface EmailHealthRow {
    key: string;
    label: string;
    value: string;
    comment: string;
}

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function humanizeKey(key: string) {
    return key
        .split('.')
        .map((segment) => segment.replace(/_/g, ' '))
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' / ');
}

function describeValue(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value === null) return 'null';
    if (Array.isArray(value)) {
        return value.map((entry) => describeValue(entry)).join(', ');
    }
    const record = asObject(value);
    if (record) {
        return Object.entries(record)
            .map(([key, entry]) => `${key}: ${describeValue(entry)}`)
            .join(' | ');
    }
    return '--';
}

function flattenObject(
    record: Record<string, unknown>,
    parentKey = '',
    depth = 0,
    rows: EmailHealthRow[] = []
) {
    for (const [key, value] of Object.entries(record)) {
        const nextKey = parentKey ? `${parentKey}.${key}` : key;
        const nested = asObject(value);

        if (nested && depth < 1) {
            flattenObject(nested, nextKey, depth + 1, rows);
            continue;
        }

        const normalizedValue = describeValue(value);
        rows.push({
            key: nextKey,
            label: humanizeKey(nextKey),
            value: normalizedValue || '--',
            comment: ''
        });
    }

    return rows;
}

export function resolveEmailHealthStatus(payload: unknown) {
    const record = asObject(payload);
    if (!record) return null;

    const candidates = [record.status, record.health, record.state];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }
    return null;
}

export function normalizeEmailHealth(payload: unknown) {
    const record = asObject(payload);
    if (!record) return [];
    return flattenObject(record);
}

export function getEmailHealth() {
    return apiGet<unknown>('/api/admin/email/health', requestOptions);
}
