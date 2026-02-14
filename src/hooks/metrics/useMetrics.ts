import { useCallback, useEffect, useRef, useState } from 'react';
import { refreshAccessToken } from '../../services/auth/auth.refresh';
import { buildAuthorizationHeader } from '../../utils/auth/authorization';
import { getStoredToken } from '../../utils/auth/storage';
import type { RefreshResponse } from '../../services/auth/auth.types';

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
    accessToken: string | null;
    setSession: (token: string, expiresIn?: number) => void;
}

interface UseMetricsResult {
    serverState: ServerState;
    dbState: DbState;
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

export function useMetrics({ accessToken, setSession }: UseMetricsOptions): UseMetricsResult {
    const [serverState, setServerState] = useState<ServerState>({
        status: 'loading',
        message: 'Cargando',
        detail: ''
    });
    const [dbState, setDbState] = useState<DbState>({
        status: 'loading',
        latency_ms: null
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

    const fetchAllRef = useRef<() => Promise<void>>(async () => {});

    const scheduleNext = useCallback((delay: number) => {
        if (!visibilityRef.current) return;
        if (pollingRef.current) {
            window.clearTimeout(pollingRef.current);
        }
        pollingRef.current = window.setTimeout(() => {
            void fetchAllRef.current();
        }, delay);
    }, []);

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

    const fetchMetrics = useCallback(async (token: string, allowRefresh: boolean) => {
        const headers: Record<string, string> = {
            Accept: 'application/json'
        };
        const authHeader = buildAuthorizationHeader(token);
        if (authHeader) {
            headers.Authorization = authHeader;
        }

        const response = await fetch(`${BASE_URL}/metrics`, {
            headers,
            credentials: 'include'
        });
        const { response: res, data } = await safeJson(response);

        if (res.status === 401) {
            if (allowRefresh) {
                const refreshed = await refreshAccessToken();
                if ('access_token' in refreshed) {
                    const refreshedToken = refreshed as RefreshResponse;
                    setSession(refreshedToken.access_token, refreshedToken.expires_in);
                    return fetchMetrics(refreshedToken.access_token, false);
                }
            }
            setErrorMessage('No estás autorizado para ver las métricas.');
            return null;
        }

        if (res.status === 404) {
            setMetricsDisabled(true);
            return null;
        }

        if (!res.ok) {
            if (res.status >= 500) {
                throw new Error('Server error');
            }
            setErrorMessage('No se pudieron cargar las métricas.');
            return null;
        }

        setMetricsDisabled(false);
        return data as MetricsSnapshot;
    }, [setSession]);

    const fetchAll = useCallback(async () => {
        setIsRefreshing(true);
        await Promise.all([fetchHealth(), fetchReady()]);

        const effectiveToken = accessToken ?? getStoredToken();

        if (!effectiveToken) {
            setErrorMessage('Necesitas iniciar sesión para ver métricas protegidas.');
            setIsRefreshing(false);
            setIsLoading(false);
            scheduleNext(5000);
            return;
        }

        try {
            const result = await fetchMetrics(effectiveToken, true);
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
            setIsRefreshing(false);
            setIsLoading(false);
            const delay = backoffRef.current > 0 ? backoffRef.current : 5000;
            scheduleNext(delay);
        }
    }, [accessToken, fetchHealth, fetchReady, fetchMetrics, pushHistory, resetBackoff, handleBackoff, scheduleNext]);

    const reload = useCallback(() => {
        void fetchAll();
    }, [fetchAll]);

    useEffect(() => {
        fetchAllRef.current = fetchAll;
    }, [fetchAll]);

    useEffect(() => {
        void fetchAll();
        return () => {
            if (pollingRef.current) {
                window.clearTimeout(pollingRef.current);
            }
        };
    }, [fetchAll]);

    useEffect(() => {
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
    }, [scheduleNext]);

    return {
        serverState,
        dbState,
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
