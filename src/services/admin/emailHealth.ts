import { apiGet } from '../api/httpClient';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

export type EmailHealthBlockState = {
    status: 'loading' | 'ok' | 'error';
    label: string;
    detail: string;
    reason: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function firstText(candidates: unknown[]) {
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }
    return null;
}

function normalizeStatus(value: unknown): 'ok' | 'error' {
    if (typeof value !== 'string') return 'error';
    const normalized = value.trim().toLowerCase();
    if (normalized === 'ok' || normalized === 'healthy' || normalized === 'up' || normalized === 'ready') {
        return 'ok';
    }
    return 'error';
}

export function resolveEmailHealthBlockState(payload: unknown): EmailHealthBlockState {
    const root = asRecord(payload);
    if (!root) {
        return {
            status: 'error',
            label: 'No disponible',
            detail: 'Sin respuesta valida',
            reason: null
        };
    }

    const nested =
        asRecord(root.health) ??
        asRecord(root.data) ??
        asRecord(root.result) ??
        root;
    const status = normalizeStatus(nested.status ?? root.status);

    if (status === 'ok') {
        return {
            status: 'ok',
            label: 'OK',
            detail: firstText([nested.provider, nested.service, nested.message, 'Servicio operativo']) ?? 'Servicio operativo',
            reason: firstText([nested.reason, nested.details, root.reason])
        };
    }

    return {
        status: 'error',
        label: 'No disponible',
        detail: firstText([nested.message, root.message, 'Servicio no disponible']) ?? 'Servicio no disponible',
        reason: firstText([nested.reason, nested.error, root.error, root.msg])
    };
}

export function getEmailHealth() {
    return apiGet<unknown>('/api/admin/email/health', requestOptions);
}
