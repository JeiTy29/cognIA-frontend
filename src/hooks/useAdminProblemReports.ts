import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getAdminProblemReportById,
    getAdminProblemReports,
    updateAdminProblemReport
} from '../services/problemReports/problemReports.api';
import type {
    ProblemReportItem,
    UpdateProblemReportPayload
} from '../services/problemReports/problemReports.types';
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
        const normalized = candidate.toLowerCase();
        if (normalized.includes('invalid_status')) return 'invalid_status';
        if (normalized.includes('invalid_report_id')) return 'invalid_report_id';
        if (normalized.includes('problem_report_not_found')) return 'problem_report_not_found';
        if (normalized.includes('validation_error')) return 'validation_error';
    }

    return null;
}

function mapErrorMessage(status: number, action: 'list' | 'detail' | 'update', businessCode: string | null) {
    if (action === 'update' && businessCode === 'invalid_status') {
        return 'El estado seleccionado no es válido para este entorno.';
    }
    if (businessCode === 'invalid_report_id') {
        return 'El identificador del reporte no es válido.';
    }
    if (businessCode === 'problem_report_not_found') {
        return 'No se encontró el reporte solicitado.';
    }
    if (action === 'update' && businessCode === 'validation_error') {
        return 'Debes enviar al menos un cambio válido.';
    }
    if (status === 401) return 'Sesión expirada o no autenticado. Inicia sesión nuevamente.';
    if (status === 403) return 'No tienes permisos para gestionar reportes.';
    if (status === 404) return action === 'list' ? 'No se encontraron reportes.' : 'No se encontró el reporte.';
    if (status >= 500) return 'Error del servidor. Intenta más tarde.';
    return action === 'list'
        ? 'No fue posible cargar los reportes.'
        : 'No fue posible completar la acción.';
}

export function useAdminProblemReports() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [items, setItems] = useState<ProblemReportItem[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);

    const [query, setQueryState] = useState('');
    const [statusFilter, setStatusFilterState] = useState('');
    const [issueTypeFilter, setIssueTypeFilterState] = useState('');
    const [reporterRoleFilter, setReporterRoleFilterState] = useState('');
    const [fromDateFilter, setFromDateFilterState] = useState('');
    const [toDateFilter, setToDateFilterState] = useState('');
    const [sort, setSort] = useState('created_at');
    const [order, setOrder] = useState<OrderDirection>('desc');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailItem, setDetailItem] = useState<ProblemReportItem | null>(null);
    const [submittingUpdate, setSubmittingUpdate] = useState(false);

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
            const response = await getAdminProblemReports({
                page,
                page_size: pageSize,
                q: query || undefined,
                status: statusFilter || undefined,
                issue_type: issueTypeFilter || undefined,
                reporter_role: reporterRoleFilter || undefined,
                from_date: fromDateFilter || undefined,
                to_date: toDateFilter || undefined,
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
        fromDateFilter,
        handleUnauthorized,
        issueTypeFilter,
        order,
        page,
        pageSize,
        query,
        reporterRoleFilter,
        sort,
        statusFilter,
        toDateFilter
    ]);

    useEffect(() => {
        const timeoutId = globalThis.setTimeout(() => {
            loadReports().catch(() => undefined);
        }, 150);
        return () => globalThis.clearTimeout(timeoutId);
    }, [loadReports]);

    const fetchDetail = useCallback(async (reportId: string) => {
        setLoadingDetail(true);
        setError(null);
        try {
            const response = await getAdminProblemReportById(reportId);
            setDetailItem(response.report);
            return response.report;
        } catch (detailError) {
            const status = extractStatus(detailError);
            setError(mapErrorMessage(status, 'detail', extractBusinessCode(detailError)));
            if (status === 401) {
                handleUnauthorized();
            }
            return null;
        } finally {
            setLoadingDetail(false);
        }
    }, [handleUnauthorized]);

    const updateReport = useCallback(async (
        reportId: string,
        payload: UpdateProblemReportPayload
    ) => {
        setSubmittingUpdate(true);
        setError(null);
        setNotice(null);
        try {
            const response = await updateAdminProblemReport(reportId, payload);
            setDetailItem(response.report);
            setNotice('Reporte actualizado correctamente.');
            await loadReports();
            return response.report;
        } catch (updateError) {
            const status = extractStatus(updateError);
            setError(mapErrorMessage(status, 'update', extractBusinessCode(updateError)));
            if (status === 401) {
                handleUnauthorized();
            }
            return null;
        } finally {
            setSubmittingUpdate(false);
        }
    }, [handleUnauthorized, loadReports]);

    const setQuery = useCallback((value: string) => {
        setPage(1);
        setQueryState(value);
    }, []);

    const setStatusFilter = useCallback((value: string) => {
        setPage(1);
        setStatusFilterState(value);
    }, []);

    const setIssueTypeFilter = useCallback((value: string) => {
        setPage(1);
        setIssueTypeFilterState(value);
    }, []);

    const setReporterRoleFilter = useCallback((value: string) => {
        setPage(1);
        setReporterRoleFilterState(value);
    }, []);

    const setFromDateFilter = useCallback((value: string) => {
        setPage(1);
        setFromDateFilterState(value);
    }, []);

    const setToDateFilter = useCallback((value: string) => {
        setPage(1);
        setToDateFilterState(value);
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

    const clearMessages = useCallback(() => {
        setError(null);
        setNotice(null);
    }, []);

    const clearDetail = useCallback(() => {
        setDetailItem(null);
    }, []);

    return {
        items,
        page,
        pageSize,
        total,
        pages,
        query,
        statusFilter,
        issueTypeFilter,
        reporterRoleFilter,
        fromDateFilter,
        toDateFilter,
        sort,
        order,
        loading,
        error,
        notice,
        loadingDetail,
        detailItem,
        submittingUpdate,
        setPage,
        setQuery,
        setStatusFilter,
        setIssueTypeFilter,
        setReporterRoleFilter,
        setFromDateFilter,
        setToDateFilter,
        setOrdering,
        changePageSize,
        fetchDetail,
        updateReport,
        clearMessages,
        clearDetail
    };
}
