import { useCallback, useEffect, useRef, useState } from 'react';
import { getEmailHealth, resolveEmailHealthBlockState, type EmailHealthBlockState } from '../../services/admin/emailHealth';
import { getAdminMetrics } from '../../services/admin/metrics';
import { ApiError } from '../../services/api/httpClient';
import { fetchWithTimeout } from '../../services/api/fetchWithTimeout';
import { joinBackendRootUrl } from '../../services/api/url';
import {
    getDemoMetricsHistory,
    getDemoMetricsSnapshot,
    isDevDashboardDemoEnabled
} from '../../utils/questionnaires/demoDashboardData';

export type ServerState = {
    status: 'loading' | 'ok' | 'error';
    message: string;
    detail: string;
};

export type DbState = {
    status: 'loading' | 'ready' | 'not_ready' | 'error';
    latency_ms: number | null;
};

export type StatusCounts = Record<string, number>;

export type MetricsSnapshot = {
    uptime_seconds: number;
    requests_total: number;
    latency_ms_avg: number;
    latency_ms_max: number;
    status_counts: StatusCounts;
};

interface UseMetricsOptions {
    enabled?: boolean;
}

interface UseMetricsResult {
    serverState: ServerState;
    dbState: DbState;
    emailState: EmailHealthBlockState;
    snapshot: MetricsSnapshot | null;
    metricsDisabled: boolean;
    errorMessage: string | null;
    isLoading: boolean;
    lastUpdated: Date | null;
    requestHistory: number[];
    latencyHistory: number[];
    reload: () => void;
    isRefreshing: boolean;
}

async function safeJson(response: Response) {
    const data = await response.json().catch(() => null);
    return { response, data };
}

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function asNumber(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeCountKey(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(Math.trunc(value));
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
    }
    return null;
}

function asStatusCounts(value: unknown): StatusCounts | null {
    const record = asObject(value);
    if (record) {
        const next: StatusCounts = {};
        for (const [key, rawValue] of Object.entries(record)) {
            const normalizedKey = normalizeCountKey(key);
            const numericValue = asNumber(rawValue);
            if (!normalizedKey || numericValue === null) continue;
            next[normalizedKey] = numericValue;
        }
        return next;
    }

    if (!Array.isArray(value)) return null;

    const next: StatusCounts = {};
    for (const entry of value) {
        const recordEntry = asObject(entry);
        if (!recordEntry) continue;

        const normalizedKey =
            normalizeCountKey(recordEntry.status) ??
            normalizeCountKey(recordEntry.code) ??
            normalizeCountKey(recordEntry.status_code);
        const numericValue =
            asNumber(recordEntry.count) ??
            asNumber(recordEntry.total) ??
            asNumber(recordEntry.value);

        if (!normalizedKey || numericValue === null) continue;
        next[normalizedKey] = numericValue;
    }

    return next;
}

function canRunMetricCycle(enabled: boolean, isMounted: boolean, isVisible: boolean) {
    return enabled && isMounted && isVisible;
}

function isDocumentVisible() {
    return typeof document !== 'object' || document.visibilityState === 'visible';
}

function isCoarsePointerDevice() {
    if (typeof globalThis.matchMedia !== 'function') return false;
    return globalThis.matchMedia('(pointer: coarse)').matches;
}

function resolvePollingDelay(isCoarsePointer: boolean, backoff: number) {
    if (backoff > 0) return backoff;
    return isCoarsePointer ? 10000 : 5000;
}

function resolveSnapshot(payload: unknown): MetricsSnapshot | null {
    const root = asObject(payload);
    if (!root) return null;

    const candidates = [
        root,
        asObject(root.snapshot),
        asObject(root.metrics),
        asObject(root.data)
    ].filter((candidate): candidate is Record<string, unknown> => candidate !== null);

    for (const candidate of candidates) {
        const uptimeSeconds = asNumber(candidate.uptime_seconds);
        const requestsTotal = asNumber(candidate.requests_total);
        const latencyAvg = asNumber(candidate.latency_ms_avg);
        const latencyMax = asNumber(candidate.latency_ms_max);
        const statusCounts = asStatusCounts(candidate.status_counts);

        if (
            uptimeSeconds !== null &&
            requestsTotal !== null &&
            latencyAvg !== null &&
            latencyMax !== null &&
            statusCounts
        ) {
            return {
                uptime_seconds: uptimeSeconds,
                requests_total: requestsTotal,
                latency_ms_avg: latencyAvg,
                latency_ms_max: latencyMax,
                status_counts: statusCounts
            };
        }
    }

    return null;
}

export function useMetrics({ enabled = true }: UseMetricsOptions): UseMetricsResult {
    const [serverState, setServerState] = useState<ServerState>({
        status: 'loading',
        message: 'Cargando',
        detail: ''
    });
    const [dbState, setDbState] = useState<DbState>({
        status: 'loading',
        latency_ms: null
    });
    const [emailState, setEmailState] = useState<EmailHealthBlockState>({
        status: 'loading',
        label: 'Cargando',
        detail: 'Consultando servicio',
        reason: null
    });
    const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
    const [metricsDisabled, setMetricsDisabled] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [requestHistory, setRequestHistory] = useState<number[]>([]);
    const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const pollingRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
    const backoffRef = useRef<number>(0);
    const errorCountRef = useRef<number>(0);
    const visibilityRef = useRef<boolean>(isDocumentVisible());
    const coarsePointerRef = useRef<boolean>(isCoarsePointerDevice());
    const isMountedRef = useRef(true);

    const fetchAllRef = useRef<() => Promise<void>>(async () => { });

    const scheduleNext = useCallback((delay: number) => {
        const shouldSchedule = canRunMetricCycle(enabled, isMountedRef.current, visibilityRef.current);
        if (!shouldSchedule) return;
        if (pollingRef.current) {
            globalThis.clearTimeout(pollingRef.current);
        }
        pollingRef.current = globalThis.setTimeout(() => {
            fetchAllRef.current().catch(() => undefined);
        }, delay);
    }, [enabled]);

    const pushHistory = useCallback((setter: React.Dispatch<React.SetStateAction<number[]>>, value: number) => {
        setter((prev) => {
            const next = [...prev, value];
            if (next.length > 30) {
                return next.slice(-30);
            }
            return next;
        });
    }, []);

    const handleBackoff = useCallback(() => {
        errorCountRef.current += 1;
        const backoff = Math.min(8000, 2000 * Math.pow(2, errorCountRef.current - 1));
        backoffRef.current = backoff;
    }, []);

    const resetBackoff = useCallback(() => {
        errorCountRef.current = 0;
        backoffRef.current = 0;
    }, []);

    const fetchHealth = useCallback(async () => {
        try {
            const response = await fetchWithTimeout(joinBackendRootUrl('/healthz'), { headers: { Accept: 'application/json' } });
            const data = await response.json().catch(() => null);
            if (response.ok && data?.status === 'ok') {
                setServerState({
                    status: 'ok',
                    message: 'OK',
                    detail: 'Servidor operativo'
                });
            } else {
                setServerState({
                    status: 'error',
                    message: 'No disponible',
                    detail: 'No se pudo obtener el estado'
                });
            }
        } catch {
            if (isDevDashboardDemoEnabled()) {
                setServerState({
                    status: 'ok',
                    message: 'OK',
                    detail: 'Servidor operativo en datos demo'
                });
                return;
            }
            setServerState({
                status: 'error',
                message: 'No disponible',
                detail: 'No se pudo obtener el estado'
            });
        }
    }, []);

    const fetchReady = useCallback(async () => {
        try {
            const response = await fetchWithTimeout(joinBackendRootUrl('/readyz'), { headers: { Accept: 'application/json' } });
            const { response: res, data } = await safeJson(response);
            if (res.ok && data?.status === 'ready') {
                setDbState({
                    status: 'ready',
                    latency_ms: typeof data.latency_ms === 'number' ? data.latency_ms : null
                });
            } else if (res.status === 503 || data?.status === 'not_ready') {
                setDbState({
                    status: 'not_ready',
                    latency_ms: typeof data?.latency_ms === 'number' ? data.latency_ms : null
                });
            } else {
                setDbState({
                    status: 'error',
                    latency_ms: null
                });
            }
        } catch {
            if (isDevDashboardDemoEnabled()) {
                setDbState({
                    status: 'ready',
                    latency_ms: 36
                });
                return;
            }
            setDbState({
                status: 'error',
                latency_ms: null
            });
        }
    }, []);

    const fetchMetrics = useCallback(async () => {
        try {
            const response = await getAdminMetrics();
            setMetricsDisabled(false);
            const resolved = resolveSnapshot(response);
            if (!resolved) {
                if (isDevDashboardDemoEnabled()) return getDemoMetricsSnapshot();
                setErrorMessage('La respuesta de metricas no tiene el formato esperado.');
                return null;
            }
            return resolved;
        } catch (error) {
            if (error instanceof ApiError) {
                if (error.status === 401 || error.status === 403) {
                    setErrorMessage('No estas autorizado para ver las metricas.');
                    return null;
                }
                if (error.status === 404) {
                    setMetricsDisabled(true);
                    return null;
                }
                if (error.status >= 500) {
                    throw error;
                }
            }
            if (isDevDashboardDemoEnabled()) return getDemoMetricsSnapshot();
            setErrorMessage('No se pudieron cargar las metricas.');
            return null;
        }
    }, []);

    const fetchEmail = useCallback(async () => {
        try {
            const response = await getEmailHealth();
            setEmailState(resolveEmailHealthBlockState(response));
        } catch (error) {
            if (isDevDashboardDemoEnabled()) {
                setEmailState({
                    status: 'ok',
                    label: 'Operativo',
                    detail: 'Servicio disponible en datos demo',
                    reason: 'Validacion local con dev auth activo.'
                });
                return;
            }
            if (error instanceof ApiError) {
                if (error.status === 404) {
                    setEmailState({
                        status: 'error',
                        label: 'No disponible',
                        detail: 'Servicio no expuesto',
                        reason: 'El endpoint de correo no esta disponible en este entorno.'
                    });
                    return;
                }
                if (error.status === 401 || error.status === 403) {
                    setEmailState({
                        status: 'error',
                        label: 'Sin acceso',
                        detail: 'Sin permisos',
                        reason: 'No tienes permisos para consultar el servicio de correo.'
                    });
                    return;
                }
            }

            setEmailState({
                status: 'error',
                label: 'No disponible',
                detail: 'Error de consulta',
                reason: 'No fue posible consultar la salud de correo.'
            });
        }
    }, []);

    const fetchAll = useCallback(async () => {
        const shouldRunCycle = enabled && isMountedRef.current;
        if (!shouldRunCycle) return;
        setIsRefreshing(true);
        await Promise.all([fetchHealth(), fetchReady(), fetchEmail()]);

        try {
            const result = await fetchMetrics();
            if (result) {
                setSnapshot(result);
                if (isDevDashboardDemoEnabled()) {
                    const history = getDemoMetricsHistory();
                    setRequestHistory(history.requestHistory);
                    setLatencyHistory(history.latencyHistory);
                } else {
                    pushHistory(setRequestHistory, result.requests_total);
                    pushHistory(setLatencyHistory, result.latency_ms_avg);
                }
                resetBackoff();
                setErrorMessage(null);
            }
            setLastUpdated(new Date());
        } catch {
            handleBackoff();
            setErrorMessage('No fue posible cargar metricas. Reintentando...');
        } finally {
            const canScheduleNext = isMountedRef.current && enabled;
            if (canScheduleNext) {
                setIsRefreshing(false);
                setIsLoading(false);
                const delay = resolvePollingDelay(coarsePointerRef.current, backoffRef.current);
                scheduleNext(delay);
            }
        }
    }, [enabled, fetchHealth, fetchReady, fetchEmail, fetchMetrics, pushHistory, resetBackoff, handleBackoff, scheduleNext]);

    const reload = useCallback(() => {
        fetchAll().catch(() => undefined);
    }, [fetchAll]);

    useEffect(() => {
        fetchAllRef.current = fetchAll;
    }, [fetchAll]);

    useEffect(() => {
        if (!enabled) return;
        fetchAll().catch(() => undefined);
        return () => {
            if (pollingRef.current) {
                globalThis.clearTimeout(pollingRef.current);
            }
        };
    }, [enabled, fetchAll]);

    useEffect(() => {
        if (!enabled) return;
        const handleVisibility = () => {
            visibilityRef.current = document.visibilityState === 'visible';
            if (visibilityRef.current) {
                scheduleNext(0);
            } else if (pollingRef.current) {
                globalThis.clearTimeout(pollingRef.current);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [enabled, scheduleNext]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (pollingRef.current) {
                globalThis.clearTimeout(pollingRef.current);
            }
        };
    }, []);

    return {
        serverState,
        dbState,
        emailState,
        snapshot,
        metricsDisabled,
        errorMessage,
        isLoading,
        lastUpdated,
        requestHistory,
        latencyHistory,
        reload,
        isRefreshing
    };
}
