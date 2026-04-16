import { useCallback, useEffect, useRef, useState } from 'react';
import { getEmailHealth, resolveEmailHealthBlockState, type EmailHealthBlockState } from '../../services/admin/emailHealth';
import { getAdminMetrics } from '../../services/admin/metrics';
import { ApiError } from '../../services/api/httpClient';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type ServerState = {
    status: 'loading' | 'ok' | 'error';
    message: string;
    detail: string;
};

export type DbState = {
    status: 'loading' | 'ready' | 'not_ready' | 'error';
    latency_ms: number | null;
};

export type StatusCounts = Record<'200' | '401' | '500', number>;

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

function asStatusCounts(value: unknown): StatusCounts | null {
    const record = asObject(value);
    if (!record) return null;

    return {
        '200': asNumber(record['200']) ?? 0,
        '401': asNumber(record['401']) ?? 0,
        '500': asNumber(record['500']) ?? 0
    };
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

    const pollingRef = useRef<number | null>(null);
    const backoffRef = useRef<number>(0);
    const errorCountRef = useRef<number>(0);
    const visibilityRef = useRef<boolean>(typeof document !== 'undefined' ? document.visibilityState === 'visible' : true);
    const isMountedRef = useRef(true);

    const fetchAllRef = useRef<() => Promise<void>>(async () => {});

    const scheduleNext = useCallback((delay: number) => {
        if (!enabled || !isMountedRef.current) return;
        if (!visibilityRef.current) return;
        if (pollingRef.current) {
            window.clearTimeout(pollingRef.current);
        }
        pollingRef.current = window.setTimeout(() => {
            void fetchAllRef.current();
        }, delay);
    }, [enabled]);

    const pushHistory = useCallback((setter: React.Dispatch<React.SetStateAction<number[]>>, value: number) => {
        setter((prev) => {
            const next = [...prev, value];
            if (next.length > 30) {
                return next.slice(next.length - 30);
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
            const response = await fetch(`${BASE_URL}/healthz`, { headers: { Accept: 'application/json' } });
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
            setServerState({
                status: 'error',
                message: 'No disponible',
                detail: 'No se pudo obtener el estado'
            });
        }
    }, []);

    const fetchReady = useCallback(async () => {
        try {
            const response = await fetch(`${BASE_URL}/readyz`, { headers: { Accept: 'application/json' } });
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
                setErrorMessage('La respuesta de métricas no tiene el formato esperado.');
                return null;
            }
            return resolved;
        } catch (error) {
            if (error instanceof ApiError) {
                if (error.status === 401 || error.status === 403) {
                    setErrorMessage('No estás autorizado para ver las métricas.');
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
            setErrorMessage('No se pudieron cargar las métricas.');
            return null;
        }
    }, []);

    const fetchEmail = useCallback(async () => {
        try {
            const response = await getEmailHealth();
            setEmailState(resolveEmailHealthBlockState(response));
        } catch (error) {
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
        if (!enabled || !isMountedRef.current) return;
        setIsRefreshing(true);
        await Promise.all([fetchHealth(), fetchReady(), fetchEmail()]);

        try {
            const result = await fetchMetrics();
            if (result) {
                setSnapshot(result);
                pushHistory(setRequestHistory, result.requests_total);
                pushHistory(setLatencyHistory, result.latency_ms_avg);
                resetBackoff();
                setErrorMessage(null);
            }
            setLastUpdated(new Date());
        } catch {
            handleBackoff();
            setErrorMessage('No fue posible cargar métricas. Reintentando...');
        } finally {
            const canScheduleNext = isMountedRef.current && enabled;
            if (canScheduleNext) {
                setIsRefreshing(false);
                setIsLoading(false);
                const delay = backoffRef.current > 0 ? backoffRef.current : 5000;
                scheduleNext(delay);
            }
        }
    }, [enabled, fetchHealth, fetchReady, fetchEmail, fetchMetrics, pushHistory, resetBackoff, handleBackoff, scheduleNext]);

    const reload = useCallback(() => {
        void fetchAll();
    }, [fetchAll]);

    useEffect(() => {
        fetchAllRef.current = fetchAll;
    }, [fetchAll]);

    useEffect(() => {
        if (!enabled) return;
        void fetchAll();
        return () => {
            if (pollingRef.current) {
                window.clearTimeout(pollingRef.current);
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
                window.clearTimeout(pollingRef.current);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [enabled, scheduleNext]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (pollingRef.current) {
                window.clearTimeout(pollingRef.current);
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
