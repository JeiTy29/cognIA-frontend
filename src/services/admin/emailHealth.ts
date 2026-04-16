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

export interface EmailHealthBlockState {
    status: 'loading' | 'ok' | 'error';
    label: string;
    detail: string;
    reason: string | null;
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

function pickFirstString(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return null;
}

export function resolveEmailHealthBlockState(payload: unknown): EmailHealthBlockState {
    const record = asObject(payload);
    if (!record) {
        return {
            status: 'error',
            label: 'No disponible',
            detail: 'Sin respuesta',
            reason: 'El backend no devolvio datos de correo.'
        };
    }

    const explicitReason = pickFirstString(record, ['error', 'message', 'detail', 'reason']);
    const explicitStatus = pickFirstString(record, ['status', 'health', 'state']);
    const normalizedStatus = explicitStatus?.toLowerCase() ?? '';

    if (normalizedStatus.includes('ok') || normalizedStatus.includes('healthy')) {
        return {
            status: 'ok',
            label: 'OK',
            detail: 'Servicio operativo',
            reason: explicitReason
        };
    }

    if (normalizedStatus.includes('error') || normalizedStatus.includes('fail') || normalizedStatus.includes('down')) {
        return {
            status: 'error',
            label: 'No disponible',
            detail: 'Servicio con errores',
            reason: explicitReason
        };
    }

    const emailEnabled = record.email_enabled;
    const smtpHostConfigured = record.smtp_host_configured;
    const smtpUserConfigured = record.smtp_user_configured;

    if (emailEnabled === true && smtpHostConfigured === true && smtpUserConfigured === true) {
        return {
            status: 'ok',
            label: 'OK',
            detail: 'Configuracion valida',
            reason: explicitReason
        };
    }

    const reasons: string[] = [];
    if (emailEnabled === false) reasons.push('Correo deshabilitado');
    if (smtpHostConfigured === false) reasons.push('Host SMTP no configurado');
    if (smtpUserConfigured === false) reasons.push('Usuario SMTP no configurado');

    return {
        status: 'error',
        label: 'Revisar',
        detail: 'Configuracion incompleta',
        reason: explicitReason ?? (reasons.length > 0 ? reasons.join('. ') : null)
    };
}

export function getEmailHealth() {
    return apiGet<unknown>('/api/admin/email/health', requestOptions);
}
