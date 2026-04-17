import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyProblemReports } from '../services/problemReports/problemReports.api';
import type { ProblemReportItem } from '../services/problemReports/problemReports.types';
import { ApiError } from '../services/api/httpClient';
import { useAuth } from './auth/useAuth';

type OrderDirection = 'asc' | 'desc';

function extractStatus(error: unknown) {
    if (error instanceof ApiError) {
        return error.status;
    }
    return 0;
}

function mapErrorMessage(status: number) {
    if (status === 401) return 'Sesión expirada o no autenticado. Inicia sesión nuevamente.';
    if (status === 403) return 'Tu cuenta no tiene permisos para consultar reportes.';
    if (status === 404) return 'No se encontraron reportes.';
    if (status >= 500) return 'Error del servidor. Intenta más tarde.';
    return 'No fue posible cargar tus reportes.';
}

export function useMyProblemReports() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [items, setItems] = useState<ProblemReportItem[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);

    const [statusFilter, setStatusFilterState] = useState('');
    const [issueTypeFilter, setIssueTypeFilterState] = useState('');
    const [sort, setSort] = useState('created_at');
    const [order, setOrder] = useState<OrderDirection>('desc');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleUnauthorized = useCallback(() => {
        logout('expired');
        navigate('/inicio-sesion', {
            replace: true,
            state: { message: 'Sesión expirada o no autenticado. Inicia sesión nuevamente.' }
        });
    }, [logout, navigate]);

    const loadReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getMyProblemReports({
                page,
                page_size: pageSize,
                status: statusFilter || undefined,
                issue_type: issueTypeFilter || undefined,
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
            setError(mapErrorMessage(status));
            if (status === 401) {
                handleUnauthorized();
            }
        } finally {
            setLoading(false);
        }
    }, [handleUnauthorized, issueTypeFilter, order, page, pageSize, sort, statusFilter]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadReports();
        }, 150);
        return () => window.clearTimeout(timeoutId);
    }, [loadReports]);

    const setStatusFilter = useCallback((value: string) => {
        setPage(1);
        setStatusFilterState(value);
    }, []);

    const setIssueTypeFilter = useCallback((value: string) => {
        setPage(1);
        setIssueTypeFilterState(value);
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

    return {
        items,
        page,
        pageSize,
        total,
        pages,
        statusFilter,
        issueTypeFilter,
        sort,
        order,
        loading,
        error,
        setPage,
        setStatusFilter,
        setIssueTypeFilter,
        setOrdering,
        changePageSize
    };
}
