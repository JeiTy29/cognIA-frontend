import { useCallback, useEffect, useMemo, useState } from 'react';
import { getQuestionnaireHistoryV2 } from '../../services/questionnaires/questionnaires.api';
import type {
    QuestionnaireDashboardChartPointDTO,
    QuestionnaireHistoryFiltersV2,
    QuestionnaireHistoryItemV2DTO
} from '../../services/questionnaires/questionnaires.types';
import { ApiError } from '../../services/api/httpClient';

interface UseQuestionnaireHistoryV2Options {
    enabled?: boolean;
    initialFilters?: QuestionnaireHistoryFiltersV2;
}

function mapError(error: unknown) {
    if (!(error instanceof ApiError)) return 'No fue posible cargar el historial.';
    if (error.status === 401) return 'Sesión expirada o no autenticado.';
    if (error.status === 403) return 'No tienes permisos para consultar historial.';
    if (error.status === 404) return 'No se encontró historial.';
    if (error.status >= 500) return 'Error del servidor. Intenta nuevamente.';
    return 'No fue posible cargar el historial.';
}

function buildDefaultFilters(initialFilters?: QuestionnaireHistoryFiltersV2): QuestionnaireHistoryFiltersV2 {
    return {
        page: 1,
        page_size: 10,
        ...initialFilters
    };
}

export function useQuestionnaireHistoryV2(options?: UseQuestionnaireHistoryV2Options) {
    const enabled = options?.enabled ?? true;
    const [filters, setFilters] = useState<QuestionnaireHistoryFiltersV2>(() =>
        buildDefaultFilters(options?.initialFilters)
    );
    const [items, setItems] = useState<QuestionnaireHistoryItemV2DTO[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [serverFilters, setServerFilters] = useState<Record<string, unknown> | null>(null);
    const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
    const [charts, setCharts] = useState<Record<string, QuestionnaireDashboardChartPointDTO[]> | null>(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);

    const page = filters.page ?? 1;
    const pageSize = filters.page_size ?? 10;

    const loadHistory = useCallback(async () => {
        if (!enabled) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await getQuestionnaireHistoryV2(filters);
            setItems(response.items ?? []);
            setTotal(response.pagination.total ?? 0);
            setPages(response.pagination.pages ?? 1);
            setServerFilters(response.filters ?? null);
            setSummary(response.summary ?? null);
            setCharts(response.charts ?? null);
        } catch (loadError) {
            setError(mapError(loadError));
        } finally {
            setLoading(false);
        }
    }, [enabled, filters]);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }
        const timeoutId = globalThis.setTimeout(() => {
            loadHistory().catch(() => undefined);
        }, 0);
        return () => globalThis.clearTimeout(timeoutId);
    }, [enabled, loadHistory]);

    const patchFilters = useCallback((patch: Partial<QuestionnaireHistoryFiltersV2>) => {
        setFilters((previous) => ({
            ...previous,
            ...patch
        }));
    }, []);

    const setPage = useCallback((nextPage: number) => {
        setFilters((previous) => ({
            ...previous,
            page: Math.max(1, nextPage)
        }));
    }, []);

    const changePageSize = useCallback((nextPageSize: number) => {
        setFilters((previous) => ({
            ...previous,
            page_size: nextPageSize,
            page: 1
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(buildDefaultFilters(options?.initialFilters));
    }, [options?.initialFilters]);

    const reload = useCallback(async () => {
        await loadHistory();
    }, [loadHistory]);

    return {
        items,
        total,
        pages,
        page,
        pageSize,
        filters,
        serverFilters,
        summary,
        charts,
        loading,
        error,
        patchFilters,
        setPage,
        changePageSize,
        resetFilters,
        reload
    };
}

export type UseQuestionnaireHistoryV2Return = ReturnType<typeof useQuestionnaireHistoryV2>;

export function useHistoryHasActiveFilters(filters: QuestionnaireHistoryFiltersV2) {
    return useMemo(() => {
        const keys: Array<keyof QuestionnaireHistoryFiltersV2> = [
            'status',
            'case_id',
            'case_public_id',
            'case_label',
            'tag',
            'q',
            'date_from',
            'date_to',
            'domain',
            'alert_level',
            'needs_professional_review'
        ];
        return keys.some((key) => {
            const value = filters[key];
            if (typeof value === 'boolean') return true;
            if (typeof value === 'number') return true;
            return typeof value === 'string' && value.trim().length > 0;
        });
    }, [filters]);
}
