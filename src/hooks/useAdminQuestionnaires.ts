import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    archiveQuestionnaire,
    cloneQuestionnaire,
    createQuestionnaireTemplate,
    getAdminQuestionnaires,
    publishQuestionnaire,
    type AdminQuestionnaireItem,
    type CloneQuestionnairePayload,
    type CreateQuestionnaireTemplatePayload
} from '../services/admin/questionnaires';
import { ApiError } from '../services/api/httpClient';
import { useAuth } from './auth/useAuth';

type ActionType = 'list' | 'publish' | 'archive' | 'clone' | 'create';
type OrderDirection = 'asc' | 'desc';
type ToggleFilter = 'all' | 'true' | 'false';

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
        if (normalized.includes('template_empty')) return 'template_empty';
        if (normalized.includes('template_archived')) return 'template_archived';
    }

    return null;
}

function mapErrorMessage(status: number, action: ActionType, businessCode: string | null) {
    if (action === 'publish' && businessCode === 'template_empty') {
        return 'No es posible publicar un cuestionario vacio.';
    }
    if (action === 'publish' && businessCode === 'template_archived') {
        return 'No es posible publicar un cuestionario archivado.';
    }
    if (status === 400 && action === 'clone') {
        return 'Debes ingresar una version valida para clonar.';
    }
    if (status === 400 && action === 'create') {
        return 'Debes completar nombre y version para crear la plantilla.';
    }
    if (status === 400) return 'Solicitud invalida. Revisa los datos e intenta de nuevo.';
    if (status === 401) return 'Sesion expirada o no autenticado. Inicia sesion nuevamente.';
    if (status === 403) return 'No tienes permisos para realizar esta accion.';
    if (status === 404) {
        return action === 'list'
            ? 'No se encontraron cuestionarios.'
            : 'No se encontro el cuestionario seleccionado.';
    }
    if (status === 409) return 'No fue posible completar la accion por conflicto de estado.';
    if (status >= 500) return 'Error del servidor. Intenta mas tarde.';
    return 'Ocurrio un error inesperado.';
}

function parseToggleFilter(value: ToggleFilter): boolean | undefined {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
}

export function useAdminQuestionnaires() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [items, setItems] = useState<AdminQuestionnaireItem[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);

    const [nameFilter, setNameFilterState] = useState('');
    const [versionFilter, setVersionFilterState] = useState('');
    const [activeFilter, setActiveFilterState] = useState<ToggleFilter>('all');
    const [archivedFilter, setArchivedFilterState] = useState<ToggleFilter>('all');
    const [sort, setSort] = useState('updated_at');
    const [order, setOrder] = useState<OrderDirection>('desc');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [submittingPublish, setSubmittingPublish] = useState(false);
    const [submittingArchive, setSubmittingArchive] = useState(false);
    const [submittingClone, setSubmittingClone] = useState(false);
    const [submittingCreate, setSubmittingCreate] = useState(false);

    const handleUnauthorized = useCallback(() => {
        logout('expired');
        navigate('/inicio-sesion', {
            replace: true,
            state: { message: 'Sesion expirada o no autenticado. Inicia sesion nuevamente.' }
        });
    }, [logout, navigate]);

    const loadQuestionnaires = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAdminQuestionnaires({
                page,
                page_size: pageSize,
                name: nameFilter,
                version: versionFilter,
                is_active: parseToggleFilter(activeFilter),
                is_archived: parseToggleFilter(archivedFilter),
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
    }, [activeFilter, archivedFilter, handleUnauthorized, nameFilter, order, page, pageSize, sort, versionFilter]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadQuestionnaires();
        }, 200);
        return () => window.clearTimeout(timeoutId);
    }, [loadQuestionnaires]);

    const setNameFilter = useCallback((value: string) => {
        setPage(1);
        setNameFilterState(value);
    }, []);

    const setVersionFilter = useCallback((value: string) => {
        setPage(1);
        setVersionFilterState(value);
    }, []);

    const setActiveFilter = useCallback((value: ToggleFilter) => {
        setPage(1);
        setActiveFilterState(value);
    }, []);

    const setArchivedFilter = useCallback((value: ToggleFilter) => {
        setPage(1);
        setArchivedFilterState(value);
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

    const reload = useCallback(async () => {
        await loadQuestionnaires();
    }, [loadQuestionnaires]);

    const publishAction = useCallback(async (templateId: string) => {
        setSubmittingPublish(true);
        setError(null);
        setNotice(null);
        try {
            await publishQuestionnaire(templateId);
            setNotice('Cuestionario publicado correctamente.');
            await loadQuestionnaires();
            return true;
        } catch (actionError) {
            const status = extractStatus(actionError);
            setError(mapErrorMessage(status, 'publish', extractBusinessCode(actionError)));
            if (status === 401) {
                handleUnauthorized();
            }
            return false;
        } finally {
            setSubmittingPublish(false);
        }
    }, [handleUnauthorized, loadQuestionnaires]);

    const archiveAction = useCallback(async (templateId: string) => {
        setSubmittingArchive(true);
        setError(null);
        setNotice(null);
        try {
            await archiveQuestionnaire(templateId);
            setNotice('Cuestionario archivado correctamente.');
            await loadQuestionnaires();
            return true;
        } catch (actionError) {
            const status = extractStatus(actionError);
            setError(mapErrorMessage(status, 'archive', extractBusinessCode(actionError)));
            if (status === 401) {
                handleUnauthorized();
            }
            return false;
        } finally {
            setSubmittingArchive(false);
        }
    }, [handleUnauthorized, loadQuestionnaires]);

    const cloneAction = useCallback(async (templateId: string, payload: CloneQuestionnairePayload) => {
        setSubmittingClone(true);
        setError(null);
        setNotice(null);
        try {
            const response = await cloneQuestionnaire(templateId, payload);
            setNotice(`Cuestionario clonado a la version ${response.version}.`);
            await loadQuestionnaires();
            return true;
        } catch (actionError) {
            const status = extractStatus(actionError);
            setError(mapErrorMessage(status, 'clone', extractBusinessCode(actionError)));
            if (status === 401) {
                handleUnauthorized();
            }
            return false;
        } finally {
            setSubmittingClone(false);
        }
    }, [handleUnauthorized, loadQuestionnaires]);

    const createAction = useCallback(async (payload: CreateQuestionnaireTemplatePayload) => {
        setSubmittingCreate(true);
        setError(null);
        setNotice(null);
        try {
            const response = await createQuestionnaireTemplate(payload);
            const createdName = typeof response.name === 'string' && response.name.trim().length > 0
                ? response.name.trim()
                : payload.name;
            setNotice(`Plantilla "${createdName}" creada correctamente.`);
            await loadQuestionnaires();
            return true;
        } catch (actionError) {
            const status = extractStatus(actionError);
            setError(mapErrorMessage(status, 'create', extractBusinessCode(actionError)));
            if (status === 401) {
                handleUnauthorized();
            }
            return false;
        } finally {
            setSubmittingCreate(false);
        }
    }, [handleUnauthorized, loadQuestionnaires]);

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
        nameFilter,
        versionFilter,
        activeFilter,
        archivedFilter,
        sort,
        order,
        loading,
        error,
        notice,
        submittingPublish,
        submittingArchive,
        submittingClone,
        submittingCreate,
        setPage,
        setNameFilter,
        setVersionFilter,
        setActiveFilter,
        setArchivedFilter,
        setOrdering,
        changePageSize,
        publishQuestionnaire: publishAction,
        archiveQuestionnaire: archiveAction,
        cloneQuestionnaire: cloneAction,
        createQuestionnaireTemplate: createAction,
        reload,
        clearMessages
    };
}
