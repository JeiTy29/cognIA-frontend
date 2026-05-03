import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getAdminEvaluations,
    updateEvaluationStatus,
    type AdminEvaluationItem
} from '../services/admin/evaluations';
import { ApiError } from '../services/api/httpClient';
import { useAuth } from './auth/useAuth';

type OrderDirection = 'asc' | 'desc';

function extractStatus(error: unknown) {
    if (error instanceof ApiError) {
        return error.status;
    }
    return 0;
}

function extractPayloadField(payload: unknown, keys: string[]) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return null;
    }

    const record = payload as Record<string, unknown>;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return null;
}

function extractBusinessCode(error: unknown) {
    if (!(error instanceof ApiError)) {
        return null;
    }

    const candidates = [
        extractPayloadField(error.payload, ['error', 'code', 'type']),
        extractPayloadField(error.payload, ['msg', 'message', 'detail'])
    ].filter((value): value is string => Boolean(value));

    for (const candidate of candidates) {
        if (candidate.toLowerCase().includes('invalid_status')) {
            return 'invalid_status';
        }
    }

    return null;
}

function mapErrorMessage(status: number, action: 'list' | 'status', businessCode: string | null) {
    if (action === 'status' && businessCode === 'invalid_status') {
        return 'El estado seleccionado no es valido para este entorno.';
    }
    if (status === 400) return 'Solicitud invalida. Revisa los datos e intenta de nuevo.';
    if (status === 401) return 'Sesion expirada o no autenticado. Inicia sesion nuevamente.';
    if (status === 403) return 'No tienes permisos para realizar esta accion.';
    if (status === 404) {
        return action === 'list'
            ? 'No se encontraron evaluaciones.'
            : 'No se encontro la evaluacion seleccionada.';
    }
    if (status === 409) return 'No fue posible completar la accion por conflicto de estado.';
    if (status >= 500) return 'Error del servidor. Intenta mas tarde.';
    return 'Ocurrio un error inesperado.';
}

function parseNumberFilter(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function useAdminEvaluations() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [items, setItems] = useState<AdminEvaluationItem[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);

    const [statusFilter, setStatusFilterState] = useState('');
    const [ageMinFilter, setAgeMinFilterState] = useState('');
    const [ageMaxFilter, setAgeMaxFilterState] = useState('');
    const [dateFromFilter, setDateFromFilterState] = useState('');
    const [dateToFilter, setDateToFilterState] = useState('');
    const [sort, setSort] = useState('created_at');
    const [order, setOrder] = useState<OrderDirection>('desc');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [submittingStatus, setSubmittingStatus] = useState(false);

    const handleUnauthorized = useCallback(() => {
        logout('expired');
        navigate('/inicio-sesion', {
            replace: true,
            state: { message: 'Sesion expirada o no autenticado. Inicia sesion nuevamente.' }
        });
    }, [logout, navigate]);

    const loadEvaluations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAdminEvaluations({
                page,
                page_size: pageSize,
                status: statusFilter || undefined,
                age_min: parseNumberFilter(ageMinFilter),
                age_max: parseNumberFilter(ageMaxFilter),
                date_from: dateFromFilter || undefined,
                date_to: dateToFilter || undefined,
                sort,
                order
            });

            setItems(response.items ?? []);
            setPage(response.pagination?.page ?? page);
            setPageSize(response.pagination?.page_size ?? pageSize);
            setTotal(response.pagination?.total ?? 0);
            setPages(response.pagination?.pages ?? 1);
        } catch (loadError) {
            const status = extractStatus(loadError);
            setError(mapErrorMessage(status, 'list', extractBusinessCode(loadError)));
            if (status === 401) {
                handleUnauthorized();
            }
        } finally {
            setLoading(false);
        }
    }, [
        ageMaxFilter,
        ageMinFilter,
        dateFromFilter,
        dateToFilter,
        handleUnauthorized,
        order,
        page,
        pageSize,
        sort,
        statusFilter
    ]);

    useEffect(() => {
        const timeoutId = globalThis.setTimeout(() => {
            loadEvaluations().catch(() => undefined);
        }, 200);
        return () => globalThis.clearTimeout(timeoutId);
    }, [loadEvaluations]);

    const setStatusFilter = useCallback((value: string) => {
        setPage(1);
        setStatusFilterState(value);
    }, []);

    const setAgeMinFilter = useCallback((value: string) => {
        setPage(1);
        setAgeMinFilterState(value);
    }, []);

    const setAgeMaxFilter = useCallback((value: string) => {
        setPage(1);
        setAgeMaxFilterState(value);
    }, []);

    const setDateFromFilter = useCallback((value: string) => {
        setPage(1);
        setDateFromFilterState(value);
    }, []);

    const setDateToFilter = useCallback((value: string) => {
        setPage(1);
        setDateToFilterState(value);
    }, []);

    const setOrdering = useCallback((nextSort: string, nextOrder: OrderDirection) => {
        setPage(1);
        setSort(nextSort);
        setOrder(nextOrder);
    }, []);

    const changePageSize = useCallback((nextPageSize: number) => {
        setPage(1);
        setPageSize(nextPageSize);
    }, []);

    const changeStatusAction = useCallback(async (evaluationId: string, statusValue: string) => {
        setSubmittingStatus(true);
        setError(null);
        setNotice(null);
        try {
            const response = await updateEvaluationStatus(evaluationId, { status: statusValue });
            setNotice(`Estado actualizado a ${response.status}.`);
            await loadEvaluations();
            return true;
        } catch (actionError) {
            const status = extractStatus(actionError);
            setError(mapErrorMessage(status, 'status', extractBusinessCode(actionError)));
            if (status === 401) {
                handleUnauthorized();
            }
            return false;
        } finally {
            setSubmittingStatus(false);
        }
    }, [handleUnauthorized, loadEvaluations]);

    const clearMessages = useCallback(() => {
        setError(null);
        setNotice(null);
    }, []);

    return {
        items,
        page,
        pageSize,
        total,
        pages,
        statusFilter,
        ageMinFilter,
        ageMaxFilter,
        dateFromFilter,
        dateToFilter,
        sort,
        order,
        loading,
        error,
        notice,
        submittingStatus,
        setPage,
        setStatusFilter,
        setAgeMinFilter,
        setAgeMaxFilter,
        setDateFromFilter,
        setDateToFilter,
        setOrdering,
        changePageSize,
        changeEvaluationStatus: changeStatusAction,
        clearMessages
    };
}
