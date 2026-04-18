import { useCallback, useEffect, useState } from 'react';
import { getQuestionnaireHistoryV2 } from '../../services/questionnaires/questionnaires.api';
import type {
    QuestionnaireHistoryItemV2DTO,
    QuestionnaireV2Status
} from '../../services/questionnaires/questionnaires.types';
import { ApiError } from '../../services/api/httpClient';

interface UseQuestionnaireHistoryV2Options {
    enabled?: boolean;
}

function mapError(error: unknown) {
    if (!(error instanceof ApiError)) return 'No fue posible cargar el historial.';
    if (error.status === 401) return 'Sesión expirada o no autenticado.';
    if (error.status === 403) return 'No tienes permisos para consultar historial.';
    if (error.status === 404) return 'No se encontró historial.';
    if (error.status >= 500) return 'Error del servidor. Intenta nuevamente.';
    return 'No fue posible cargar el historial.';
}

export function useQuestionnaireHistoryV2(options?: UseQuestionnaireHistoryV2Options) {
    const enabled = options?.enabled ?? true;

    const [items, setItems] = useState<QuestionnaireHistoryItemV2DTO[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);

    const [statusFilter, setStatusFilterState] = useState<QuestionnaireV2Status | ''>('');
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);

    const loadHistory = useCallback(async () => {
        if (!enabled) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await getQuestionnaireHistoryV2({
                status: statusFilter === '' ? undefined : (statusFilter as 'draft' | 'submitted' | 'processed'),
                page,
                page_size: pageSize
            });
            setItems(response.items ?? []);
            setPage(response.pagination.page);
            setPageSize(response.pagination.page_size);
            setTotal(response.pagination.total);
            setPages(response.pagination.pages);
        } catch (loadError) {
            setError(mapError(loadError));
        } finally {
            setLoading(false);
        }
    }, [enabled, page, pageSize, statusFilter]);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }
        const timeoutId = window.setTimeout(() => {
            void loadHistory();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [enabled, loadHistory]);

    const setStatusFilter = useCallback((value: string) => {
        setStatusFilterState(value as QuestionnaireV2Status | '');
        setPage(1);
    }, []);

    const changePageSize = useCallback((nextPageSize: number) => {
        setPageSize(nextPageSize);
        setPage(1);
    }, []);

    const reload = useCallback(async () => {
        await loadHistory();
    }, [loadHistory]);

    return {
        items,
        page,
        pageSize,
        total,
        pages,
        statusFilter,
        loading,
        error,
        setPage,
        setStatusFilter,
        changePageSize,
        reload
    };
}
