import type {
    DashboardAdoptionHistoryResponse,
    DashboardApiErrorShape,
    DashboardBlockError,
    DashboardFunnelResponse,
    DashboardMetricNode,
    DashboardSeriesPoint,
    DashboardSeriesResponse
} from './dashboard.types';
import { ApiError } from '../api/httpClient';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function asArray(value: unknown) {
    return Array.isArray(value) ? value : [];
}

function toNumberOrNull(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function toRawScalar(value: unknown): string | number | boolean | null {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    return null;
}

function sanitizeNode(value: unknown, depth = 0): DashboardMetricNode {
    if (depth >= 6) return null;
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeNode(item, depth + 1));
    }
    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return Object.entries(record).reduce<Record<string, DashboardMetricNode>>((acc, [key, itemValue]) => {
            acc[key] = sanitizeNode(itemValue, depth + 1);
            return acc;
        }, {});
    }
    return null;
}

export function normalizeSeriesResponse(payload: unknown): DashboardSeriesResponse {
    const root = asRecord(payload);
    const parsed: DashboardSeriesPoint[] = asArray(root?.series)
        .map((item, index) => {
            const row = asRecord(item);
            if (!row) return null;
            const rawPeriod = row.period;
            const period =
                typeof rawPeriod === 'string' && rawPeriod.trim().length > 0
                    ? rawPeriod.trim()
                    : `Periodo ${index + 1}`;
            const rawValue = toRawScalar(row.value);
            return {
                period,
                value: toNumberOrNull(row.value),
                raw_value: rawValue
            } as DashboardSeriesPoint;
        })
        .filter((row): row is DashboardSeriesPoint => Boolean(row));

    return {
        series: parsed
    };
}

export function normalizeFunnelResponse(payload: unknown): DashboardFunnelResponse {
    const root = asRecord(payload);
    return {
        created: toNumberOrNull(root?.created),
        submitted: toNumberOrNull(root?.submitted),
        processed: toNumberOrNull(root?.processed),
        conversion_created_to_processed: toNumberOrNull(root?.conversion_created_to_processed)
    };
}

export function normalizeAdoptionHistoryResponse(payload: unknown): DashboardAdoptionHistoryResponse {
    const root = asRecord(payload);
    const adoptionHistory = asRecord(root?.adoption_history);

    return {
        adoption_history: {
            volume_and_growth: sanitizeNode(adoptionHistory?.volume_and_growth),
            user_growth: sanitizeNode(adoptionHistory?.user_growth),
            conversion: sanitizeNode(adoptionHistory?.conversion),
            operational_capacity: sanitizeNode(adoptionHistory?.operational_capacity)
        }
    };
}

function resolveErrorMessage(status: number | null, payload: DashboardApiErrorShape | null) {
    if (typeof payload?.msg === 'string' && payload.msg.trim().length > 0) {
        return payload.msg.trim();
    }

    if (status === 400) return 'Solicitud invalida para este bloque de dashboard.';
    if (status === 401) return 'Sesion expirada o autenticacion invalida.';
    if (status === 403) return 'No tienes permisos para consultar este bloque.';
    if (status === 404) return 'Bloque no disponible en este entorno.';
    if (status === 429) return 'Demasiadas solicitudes. Intenta nuevamente en unos segundos.';
    if (status !== null && status >= 500) return 'Error interno del servicio de dashboard.';
    return 'No fue posible cargar este bloque del dashboard.';
}

export function normalizeDashboardError(error: unknown): DashboardBlockError {
    if (error instanceof ApiError) {
        const payload = asRecord(error.payload) as DashboardApiErrorShape | null;
        return {
            status: error.status,
            message: resolveErrorMessage(error.status, payload),
            code: typeof payload?.error === 'string' ? payload.error : null,
            details: payload?.details ?? null,
            errors: payload?.errors ?? null
        };
    }

    if (error instanceof Error) {
        return {
            status: null,
            message: error.message || 'No fue posible cargar este bloque del dashboard.',
            code: null,
            details: null,
            errors: null
        };
    }

    return {
        status: null,
        message: 'No fue posible cargar este bloque del dashboard.',
        code: null,
        details: null,
        errors: null
    };
}

export function isSeriesEmpty(payload: DashboardSeriesResponse | null) {
    return !payload || payload.series.length === 0;
}

export function isFunnelEmpty(payload: DashboardFunnelResponse | null) {
    if (!payload) return true;
    return (
        payload.created === null &&
        payload.submitted === null &&
        payload.processed === null &&
        payload.conversion_created_to_processed === null
    );
}

function isNodeEmpty(node: DashboardMetricNode): boolean {
    if (node === null) return true;
    if (typeof node === 'string') return node.trim().length === 0;
    if (typeof node === 'number' || typeof node === 'boolean') return false;
    if (Array.isArray(node)) {
        return node.length === 0 || node.every((item) => isNodeEmpty(item));
    }
    const entries = Object.entries(node);
    if (entries.length === 0) return true;
    return entries.every(([, value]) => isNodeEmpty(value));
}

export function isAdoptionHistoryEmpty(payload: DashboardAdoptionHistoryResponse | null) {
    if (!payload) return true;
    const adoption = payload.adoption_history;
    return (
        isNodeEmpty(adoption.volume_and_growth) &&
        isNodeEmpty(adoption.user_growth) &&
        isNodeEmpty(adoption.conversion) &&
        isNodeEmpty(adoption.operational_capacity)
    );
}
