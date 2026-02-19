import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    createUser,
    deactivateUser,
    getUserById,
    getUsers,
    updateUser,
    type CreateUserRequest,
    type PaginatedUsersResponse,
    type UpdateUserRequest,
    type User
} from '../services/admin/users';
import { ApiError } from '../services/api/httpClient';
import { useAuth } from './auth/useAuth';

type ActionType = 'list' | 'create' | 'detail' | 'update' | 'delete';

function mapErrorMessage(status: number, action: ActionType) {
    if (status === 400) return 'Solicitud invalida. Revisa los datos e intenta de nuevo.';
    if (status === 401) return 'Sesion expirada o no autenticado. Inicia sesion nuevamente.';
    if (status === 403) return 'No tienes permisos para realizar esta accion.';
    if (status === 404) {
        if (action === 'detail' || action === 'update' || action === 'delete') {
            return 'Usuario no encontrado.';
        }
        return 'No se encontraron resultados.';
    }
    if (status === 409) return 'Conflicto: ya existe un usuario con esos datos (usuario/correo).';
    if (status === 500) return 'Error del servidor. Intenta mas tarde.';
    return 'Ocurrio un error inesperado.';
}

function extractStatus(error: unknown) {
    if (error instanceof ApiError) {
        return error.status;
    }
    return 0;
}

export function useUsers() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [items, setItems] = useState<User[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [loadingDetail, setLoadingDetail] = useState(false);
    const [submittingCreate, setSubmittingCreate] = useState(false);
    const [submittingUpdate, setSubmittingUpdate] = useState(false);
    const [submittingDeactivate, setSubmittingDeactivate] = useState(false);

    const handleUnauthorized = useCallback(() => {
        logout('expired');
        navigate('/inicio-sesion', {
            replace: true,
            state: { message: 'Sesion expirada o no autenticado. Inicia sesion nuevamente.' }
        });
    }, [logout, navigate]);

    const loadUsers = useCallback(async (nextPage: number, nextPageSize: number) => {
        setLoading(true);
        setError(null);
        try {
            const response: PaginatedUsersResponse = await getUsers({ page: nextPage, page_size: nextPageSize });
            setItems(response.items ?? []);
            setPage(response.page ?? nextPage);
            setPageSize(response.page_size ?? nextPageSize);
            setTotal(response.total ?? 0);
        } catch (loadError) {
            const status = extractStatus(loadError);
            setError(mapErrorMessage(status, 'list'));
            if (status === 401) {
                handleUnauthorized();
            }
        } finally {
            setLoading(false);
        }
    }, [handleUnauthorized]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadUsers(1, 10);
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadUsers]);

    const goToPage = useCallback(async (nextPage: number) => {
        await loadUsers(nextPage, pageSize);
    }, [loadUsers, pageSize]);

    const changePageSize = useCallback(async (nextPageSize: number) => {
        await loadUsers(1, nextPageSize);
    }, [loadUsers]);

    const fetchUserDetail = useCallback(async (userId: string) => {
        setLoadingDetail(true);
        setError(null);
        try {
            return await getUserById(userId);
        } catch (detailError) {
            const status = extractStatus(detailError);
            setError(mapErrorMessage(status, 'detail'));
            if (status === 401) {
                handleUnauthorized();
            }
            return null;
        } finally {
            setLoadingDetail(false);
        }
    }, [handleUnauthorized]);

    const createUserAction = useCallback(async (payload: CreateUserRequest) => {
        setSubmittingCreate(true);
        setError(null);
        setNotice(null);
        try {
            await createUser(payload);
            setNotice('Usuario creado correctamente.');
            await loadUsers(page, pageSize);
            return true;
        } catch (createError) {
            const status = extractStatus(createError);
            setError(mapErrorMessage(status, 'create'));
            if (status === 401) {
                handleUnauthorized();
            }
            return false;
        } finally {
            setSubmittingCreate(false);
        }
    }, [loadUsers, page, pageSize, handleUnauthorized]);

    const updateUserAction = useCallback(async (userId: string, payload: UpdateUserRequest) => {
        setSubmittingUpdate(true);
        setError(null);
        setNotice(null);
        try {
            await updateUser(userId, payload);
            setNotice('Usuario actualizado correctamente.');
            await loadUsers(page, pageSize);
            return true;
        } catch (updateError) {
            const status = extractStatus(updateError);
            setError(mapErrorMessage(status, 'update'));
            if (status === 401) {
                handleUnauthorized();
            }
            return false;
        } finally {
            setSubmittingUpdate(false);
        }
    }, [loadUsers, page, pageSize, handleUnauthorized]);

    const deactivateUserAction = useCallback(async (userId: string) => {
        setSubmittingDeactivate(true);
        setError(null);
        setNotice(null);
        try {
            await deactivateUser(userId);
            setNotice('Usuario desactivado correctamente.');
            await loadUsers(page, pageSize);
            return true;
        } catch (deleteError) {
            const status = extractStatus(deleteError);
            setError(mapErrorMessage(status, 'delete'));
            if (status === 401) {
                handleUnauthorized();
            }
            return false;
        } finally {
            setSubmittingDeactivate(false);
        }
    }, [loadUsers, page, pageSize, handleUnauthorized]);

    const clearMessages = useCallback(() => {
        setError(null);
        setNotice(null);
    }, []);

    return {
        items,
        page,
        pageSize,
        total,
        loading,
        error,
        notice,
        loadingDetail,
        submittingCreate,
        submittingUpdate,
        submittingDeactivate,
        loadUsers,
        goToPage,
        changePageSize,
        fetchUserDetail,
        createUser: createUserAction,
        updateUser: updateUserAction,
        deactivateUser: deactivateUserAction,
        clearMessages
    };
}
