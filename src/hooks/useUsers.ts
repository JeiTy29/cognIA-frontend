import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    adminResetUserMfa,
    adminResetUserPassword,
    deactivateUser,
    getUsers,
    updateUser,
    type PaginatedUsersResponse,
    type UpdateUserRequest,
    type User
} from '../services/admin/users';
import { ApiError } from '../services/api/httpClient';
import { useAuth } from './auth/useAuth';

type ActionType = 'list' | 'update' | 'delete' | 'passwordReset' | 'mfaReset';

function mapErrorMessage(status: number, action: ActionType) {
    if (status === 400) return 'Solicitud invalida. Revisa los datos e intenta de nuevo.';
    if (status === 401) return 'Sesion expirada o no autenticado. Inicia sesion nuevamente.';
    if (status === 403) return 'No tienes permisos para realizar esta accion.';
    if (status === 404) {
        if (action === 'update' || action === 'delete') {
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

    const [submittingUpdate, setSubmittingUpdate] = useState(false);
    const [submittingDeactivate, setSubmittingDeactivate] = useState(false);
    const [submittingPasswordReset, setSubmittingPasswordReset] = useState(false);
    const [submittingMfaReset, setSubmittingMfaReset] = useState(false);

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
            const pagination = response.pagination;
            setItems(response.items ?? []);
            setPage(pagination?.page ?? nextPage);
            setPageSize(pagination?.page_size ?? nextPageSize);
            setTotal(pagination?.total ?? 0);
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
        const timeoutId = globalThis.setTimeout(() => {
            loadUsers(1, 10).catch(() => undefined);
        }, 0);
        return () => globalThis.clearTimeout(timeoutId);
    }, [loadUsers]);

    const goToPage = useCallback(async (nextPage: number) => {
        await loadUsers(nextPage, pageSize);
    }, [loadUsers, pageSize]);

    const changePageSize = useCallback(async (nextPageSize: number) => {
        await loadUsers(1, nextPageSize);
    }, [loadUsers]);

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

    const resetPasswordAction = useCallback(async (userId: string) => {
        setSubmittingPasswordReset(true);
        setError(null);
        setNotice(null);
        try {
            const response = await adminResetUserPassword(userId);
            setNotice(
                response.email_sent === false
                    ? 'Restablecimiento de contrasena emitido.'
                    : 'Restablecimiento de contrasena enviado.'
            );
            return true;
        } catch (actionError) {
            const status = extractStatus(actionError);
            setError(mapErrorMessage(status, 'passwordReset'));
            if (status === 401) {
                handleUnauthorized();
            }
            return false;
        } finally {
            setSubmittingPasswordReset(false);
        }
    }, [handleUnauthorized]);

    const resetMfaAction = useCallback(async (userId: string) => {
        setSubmittingMfaReset(true);
        setError(null);
        setNotice(null);
        try {
            await adminResetUserMfa(userId);
            setNotice('MFA restablecido correctamente.');
            return true;
        } catch (actionError) {
            const status = extractStatus(actionError);
            setError(mapErrorMessage(status, 'mfaReset'));
            if (status === 401) {
                handleUnauthorized();
            }
            return false;
        } finally {
            setSubmittingMfaReset(false);
        }
    }, [handleUnauthorized]);

    return {
        items,
        page,
        pageSize,
        total,
        loading,
        error,
        notice,
        submittingUpdate,
        submittingDeactivate,
        submittingPasswordReset,
        submittingMfaReset,
        loadUsers,
        goToPage,
        changePageSize,
        updateUser: updateUserAction,
        deactivateUser: deactivateUserAction,
        resetUserPassword: resetPasswordAction,
        resetUserMfa: resetMfaAction,
        clearMessages
    };
}
