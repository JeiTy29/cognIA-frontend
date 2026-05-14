import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    adminResetUserMfa,
    adminResetUserPassword,
    createUser,
    deactivateUser,
    getUsers,
    updateUser,
    type CreateUserRequest,
    type PaginatedUsersResponse,
    type UpdateUserRequest,
    type User,
    type UsersListParams
} from '../services/admin/users';
import { ApiError } from '../services/api/httpClient';
import { useAuth } from './auth/useAuth';

type ActionType = 'list' | 'create' | 'update' | 'delete' | 'passwordReset' | 'mfaReset';
type UserFilters = Readonly<{
    q: string;
    role: string;
    user_type: string;
    is_active: 'all' | 'active' | 'inactive';
}>;

const DEFAULT_FILTERS: UserFilters = {
    q: '',
    role: 'all',
    user_type: 'all',
    is_active: 'all'
};

function extractStatus(error: unknown) {
    if (error instanceof ApiError) {
        return error.status;
    }
    return 0;
}

function extractBusinessCode(error: unknown) {
    if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== 'object') {
        return null;
    }

    const payload = error.payload as Record<string, unknown>;
    const candidates = [payload.error, payload.code, payload.msg];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim().toLowerCase();
        }
    }

    return null;
}

function mapCreateErrorMessage(status: number, businessCode: string | null) {
    if (businessCode === 'invalid_username') return 'El usuario no tiene un formato válido.';
    if (businessCode === 'invalid_email') return 'El correo no tiene un formato válido.';
    if (businessCode === 'weak_password') return 'La contraseña no cumple los requisitos mínimos.';
    if (businessCode === 'invalid_user_type') return 'El tipo de usuario no es válido.';
    if (businessCode === 'missing_professional_card') {
        return 'La tarjeta profesional es obligatoria para psicólogos.';
    }
    if (businessCode === 'user_exists') {
        return 'Ya existe un usuario con ese usuario o correo.';
    }
    if (businessCode === 'professional_card_exists') {
        return 'Ya existe un psicólogo con esa tarjeta profesional.';
    }
    if (businessCode === 'db_error') {
        return 'Error del servidor. Intenta más tarde.';
    }

    if (status === 400) return 'Revisa los datos ingresados para crear el usuario.';
    if (status === 401) return 'Sesión expirada o no autenticado. Inicia sesión nuevamente.';
    if (status === 403) return 'No tienes permisos para crear usuarios.';
    if (status === 409) return 'Ya existe un usuario con ese usuario o correo.';
    if (status >= 500) return 'Error del servidor. Intenta más tarde.';
    return 'No se pudo crear el usuario.';
}

function mapErrorMessage(status: number, action: ActionType, businessCode: string | null) {
    if (action === 'create') {
        return mapCreateErrorMessage(status, businessCode);
    }

    if (status === 400) return 'Solicitud inválida. Revisa los datos e intenta de nuevo.';
    if (status === 401) return 'Sesión expirada o no autenticado. Inicia sesión nuevamente.';
    if (status === 403) return 'No tienes permisos para realizar esta acción.';
    if (status === 404) {
        if (action === 'update' || action === 'delete') {
            return 'Usuario no encontrado.';
        }
        return 'No se encontraron resultados.';
    }
    if (status === 409) return 'Conflicto: ya existe un usuario con esos datos (usuario/correo).';
    if (status === 500) return 'Error del servidor. Intenta más tarde.';
    return 'Ocurrió un error inesperado.';
}

function normalizeRoleFilter(value: string) {
    return value === 'all' ? undefined : value;
}

function normalizeTypeFilter(value: string) {
    return value === 'all' ? undefined : value;
}

function normalizeStatusFilter(value: UserFilters['is_active']) {
    if (value === 'active') return true;
    if (value === 'inactive') return false;
    return undefined;
}

function buildListParams(page: number, pageSize: number, filters: UserFilters): UsersListParams {
    return {
        page,
        page_size: pageSize,
        q: filters.q || undefined,
        role: normalizeRoleFilter(filters.role),
        user_type: normalizeTypeFilter(filters.user_type),
        is_active: normalizeStatusFilter(filters.is_active)
    };
}

export function useUsers() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [items, setItems] = useState<User[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [submittingCreate, setSubmittingCreate] = useState(false);
    const [submittingUpdate, setSubmittingUpdate] = useState(false);
    const [submittingDeactivate, setSubmittingDeactivate] = useState(false);
    const [submittingPasswordReset, setSubmittingPasswordReset] = useState(false);
    const [submittingMfaReset, setSubmittingMfaReset] = useState(false);

    const handleUnauthorized = useCallback(() => {
        logout('expired');
        navigate('/inicio-sesion', {
            replace: true,
            state: { message: 'Sesión expirada o no autenticado. Inicia sesión nuevamente.' }
        });
    }, [logout, navigate]);

    const loadUsers = useCallback(
        async (nextPage: number, nextPageSize: number, nextFilters: UserFilters) => {
            setLoading(true);
            setError(null);
            try {
                const response: PaginatedUsersResponse = await getUsers(
                    buildListParams(nextPage, nextPageSize, nextFilters)
                );
                const pagination = response.pagination;
                setItems(response.items ?? []);
                setPage(pagination?.page ?? nextPage);
                setPageSize(pagination?.page_size ?? nextPageSize);
                setTotal(pagination?.total ?? 0);
            } catch (loadError) {
                const status = extractStatus(loadError);
                const businessCode = extractBusinessCode(loadError);
                setError(mapErrorMessage(status, 'list', businessCode));
                if (status === 401) {
                    handleUnauthorized();
                }
            } finally {
                setLoading(false);
            }
        },
        [handleUnauthorized]
    );

    useEffect(() => {
        void loadUsers(page, pageSize, filters).catch(() => undefined);
    }, [filters, loadUsers, page, pageSize]);

    const refreshUsers = useCallback(async () => {
        await loadUsers(page, pageSize, filters);
    }, [filters, loadUsers, page, pageSize]);

    const goToPage = useCallback(async (nextPage: number) => {
        setPage(nextPage);
    }, []);

    const changePageSize = useCallback(async (nextPageSize: number) => {
        setPageSize(nextPageSize);
        setPage(1);
    }, []);

    const setSearchQuery = useCallback((value: string) => {
        setFilters((prev) => ({ ...prev, q: value.trim() }));
        setPage(1);
    }, []);

    const setRoleFilter = useCallback((value: string) => {
        setFilters((prev) => ({ ...prev, role: value }));
        setPage(1);
    }, []);

    const setTypeFilter = useCallback((value: string) => {
        setFilters((prev) => ({ ...prev, user_type: value }));
        setPage(1);
    }, []);

    const setStatusFilter = useCallback((value: UserFilters['is_active']) => {
        setFilters((prev) => ({ ...prev, is_active: value }));
        setPage(1);
    }, []);

    const createUserAction = useCallback(
        async (payload: CreateUserRequest) => {
            setSubmittingCreate(true);
            setError(null);
            setNotice(null);
            try {
                await createUser(payload);
                setNotice('Usuario creado correctamente.');
                await loadUsers(1, pageSize, filters);
                setPage(1);
                return true;
            } catch (createError) {
                const status = extractStatus(createError);
                const businessCode = extractBusinessCode(createError);
                setError(mapErrorMessage(status, 'create', businessCode));
                if (status === 401) {
                    handleUnauthorized();
                }
                return false;
            } finally {
                setSubmittingCreate(false);
            }
        },
        [filters, handleUnauthorized, loadUsers, pageSize]
    );

    const updateUserAction = useCallback(
        async (userId: string, payload: UpdateUserRequest) => {
            setSubmittingUpdate(true);
            setError(null);
            setNotice(null);
            try {
                await updateUser(userId, payload);
                setNotice('Usuario actualizado correctamente.');
                await refreshUsers();
                return true;
            } catch (updateError) {
                const status = extractStatus(updateError);
                const businessCode = extractBusinessCode(updateError);
                setError(mapErrorMessage(status, 'update', businessCode));
                if (status === 401) {
                    handleUnauthorized();
                }
                return false;
            } finally {
                setSubmittingUpdate(false);
            }
        },
        [handleUnauthorized, refreshUsers]
    );

    const deactivateUserAction = useCallback(
        async (userId: string) => {
            setSubmittingDeactivate(true);
            setError(null);
            setNotice(null);
            try {
                await deactivateUser(userId);
                setNotice('Usuario desactivado correctamente.');
                await refreshUsers();
                return true;
            } catch (deleteError) {
                const status = extractStatus(deleteError);
                const businessCode = extractBusinessCode(deleteError);
                setError(mapErrorMessage(status, 'delete', businessCode));
                if (status === 401) {
                    handleUnauthorized();
                }
                return false;
            } finally {
                setSubmittingDeactivate(false);
            }
        },
        [handleUnauthorized, refreshUsers]
    );

    const clearMessages = useCallback(() => {
        setError(null);
        setNotice(null);
    }, []);

    const resetPasswordAction = useCallback(
        async (userId: string) => {
            setSubmittingPasswordReset(true);
            setError(null);
            setNotice(null);
            try {
                const response = await adminResetUserPassword(userId);
                setNotice(
                    response.email_sent === false
                        ? 'Restablecimiento de contraseña emitido.'
                        : 'Restablecimiento de contraseña enviado.'
                );
                return true;
            } catch (actionError) {
                const status = extractStatus(actionError);
                const businessCode = extractBusinessCode(actionError);
                setError(mapErrorMessage(status, 'passwordReset', businessCode));
                if (status === 401) {
                    handleUnauthorized();
                }
                return false;
            } finally {
                setSubmittingPasswordReset(false);
            }
        },
        [handleUnauthorized]
    );

    const resetMfaAction = useCallback(
        async (userId: string) => {
            setSubmittingMfaReset(true);
            setError(null);
            setNotice(null);
            try {
                await adminResetUserMfa(userId);
                setNotice('MFA restablecido correctamente.');
                return true;
            } catch (actionError) {
                const status = extractStatus(actionError);
                const businessCode = extractBusinessCode(actionError);
                setError(mapErrorMessage(status, 'mfaReset', businessCode));
                if (status === 401) {
                    handleUnauthorized();
                }
                return false;
            } finally {
                setSubmittingMfaReset(false);
            }
        },
        [handleUnauthorized]
    );

    const visibleCount = useMemo(() => items.length, [items]);

    return {
        items,
        page,
        pageSize,
        total,
        visibleCount,
        filters,
        loading,
        error,
        notice,
        submittingCreate,
        submittingUpdate,
        submittingDeactivate,
        submittingPasswordReset,
        submittingMfaReset,
        refreshUsers,
        goToPage,
        changePageSize,
        setSearchQuery,
        setRoleFilter,
        setTypeFilter,
        setStatusFilter,
        createUser: createUserAction,
        updateUser: updateUserAction,
        deactivateUser: deactivateUserAction,
        resetUserPassword: resetPasswordAction,
        resetUserMfa: resetMfaAction,
        clearMessages
    };
}
