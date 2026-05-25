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

function getBooleanFlag(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        if (typeof record[key] === 'boolean') {
            return record[key] as boolean;
        }
    }
    return null;
}

function normalizeStatus(value: unknown): 'ok' | 'error' {
    if (typeof value !== 'string') return 'error';
    const normalized = value.trim().toLowerCase();
    if ([
        'ok',
        'healthy',
        'up',
        'ready',
        'available',
        'enabled',
        'configured',
        'connected',
        'active',
        'operational',
        'success',
        'online'
    ].includes(normalized)) {
        return 'ok';
    }
    if ([
        'error',
        'unavailable',
        'disabled',
        'not_available',
        'not_configured',
        'disconnected',
        'down',
        'failed',
        'offline'
    ].includes(normalized)) {
        return 'error';
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

    if (import.meta.env.DEV) {
        console.debug('[metrics] email-health:payload', payload);
    }

    const nested =
        asRecord(root.health) ??
        asRecord(root.data) ??
        asRecord(root.result) ??
        asRecord(root.email) ??
        asRecord(root.mail) ??
        asRecord(root.smtp) ??
        root;
    const flagKeys = [
        'available',
        'enabled',
        'configured',
        'smtp_configured',
        'email_enabled',
        'mail_enabled',
        'can_send',
        'send_enabled',
        'healthy',
        'ready',
        'ok'
    ];
    const directStatus = normalizeStatus(nested.status ?? root.status);
    const nestedFlag = getBooleanFlag(nested, flagKeys);
    const rootFlag = getBooleanFlag(root, flagKeys);
    const status: 'ok' | 'error' =
        directStatus === 'ok'
            ? 'ok'
            : nestedFlag === true || rootFlag === true
                ? 'ok'
                : 'error';

    const resolved: EmailHealthBlockState = status === 'ok'
        ? {
            status: 'ok',
            label: 'OK',
            detail: firstText([nested.provider, nested.service, nested.message, root.message, 'Servicio operativo']) ?? 'Servicio operativo',
            reason:
                firstText([nested.reason, nested.details, root.reason, root.details]) ??
                'Configuración de correo disponible'
        }
        : {
            status: 'error',
            label: 'No disponible',
            detail: firstText([nested.message, root.message, 'Servicio no disponible']) ?? 'Servicio no disponible',
            reason: firstText([nested.reason, nested.error, root.error, root.msg, root.details])
        };

    if (import.meta.env.DEV) {
        console.debug('[metrics] email-health:resolved', resolved);
    }

    return resolved;
}

export function getEmailHealth() {
    return apiGet<unknown>('/api/admin/email/health', requestOptions);
}
