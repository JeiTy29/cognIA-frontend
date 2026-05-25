import { apiGet, apiPatch, apiPost, apiPostNoBody } from '../api/httpClient';

export interface User {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    user_type: string;
    professional_card_number: string | null;
    colpsic_verified?: boolean;
    is_active: boolean;
    roles: string[];
    created_at: string | null;
    updated_at: string | null;
    review_status?: string | null;
    approval_status?: string | null;
    psychologist_status?: string | null;
    rejection_reason?: string | null;
    review_reason?: string | null;
}

export interface PaginatedUsersResponse {
    items: User[];
    pagination: {
        page: number;
        page_size: number;
        total: number;
        pages: number;
    };
}

export interface UpdateUserRequest {
    is_active?: boolean;
    roles?: string[];
    user_type?: 'guardian' | 'psychologist' | 'admin';
    professional_card_number?: string | null;
}

export interface UsersListParams {
    page: number;
    page_size: number;
    q?: string;
    email?: string;
    username?: string;
    role?: string;
    user_type?: string;
    is_active?: boolean;
    colpsic_verified?: boolean;
    sort?: string;
    order?: 'asc' | 'desc';
}

export interface CreateUserRequest {
    username: string;
    email: string;
    password: string;
    full_name?: string | null;
    user_type: 'guardian' | 'psychologist';
    professional_card_number?: string | null;
    roles?: string[];
    is_active?: boolean;
}

export interface AdminPasswordResetResponse {
    msg?: string;
    email_sent?: boolean;
}

export interface AdminMfaResetResponse {
    msg?: string;
    user_id?: string;
}

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

function appendStringParam(search: URLSearchParams, key: string, value: string | undefined) {
    if (value && value.trim().length > 0) {
        search.set(key, value.trim());
    }
}

function appendBooleanParam(search: URLSearchParams, key: string, value: boolean | undefined) {
    if (typeof value === 'boolean') {
        search.set(key, String(value));
    }
}

export function getUsers(params: UsersListParams) {
    const search = new URLSearchParams({
        page: String(params.page),
        page_size: String(params.page_size)
    });

    appendStringParam(search, 'q', params.q);
    appendStringParam(search, 'email', params.email);
    appendStringParam(search, 'username', params.username);
    appendStringParam(search, 'role', params.role);
    appendStringParam(search, 'user_type', params.user_type);
    appendBooleanParam(search, 'is_active', params.is_active);
    appendBooleanParam(search, 'colpsic_verified', params.colpsic_verified);
    appendStringParam(search, 'sort', params.sort);
    appendStringParam(search, 'order', params.order);

    return apiGet<PaginatedUsersResponse>(`/api/admin/users?${search.toString()}`, requestOptions);
}

export async function getAllUsers() {
    const pageSize = 100;
    let page = 1;
    let pages = 1;
    const collected: User[] = [];

    while (page <= pages) {
        const response = await getUsers({ page, page_size: pageSize });
        const items = response.items ?? [];
        const pagination = response.pagination;

        collected.push(...items);

        if (!pagination) {
            break;
        }

        pages = pagination.pages ?? 1;
        if (page >= pages || items.length === 0) {
            break;
        }

        page += 1;
    }

    return collected;
}

export function createUser(payload: CreateUserRequest) {
    return apiPost<User, CreateUserRequest>('/api/v1/users', payload, requestOptions);
}

export function updateUser(userId: string, payload: UpdateUserRequest) {
    return apiPatch<User, UpdateUserRequest>(`/api/admin/users/${userId}`, payload, requestOptions);
}

export function deactivateUser(userId: string) {
    return apiPatch<User, UpdateUserRequest>(
        `/api/admin/users/${userId}`,
        { is_active: false },
        requestOptions
    );
}

export function reactivateUser(userId: string) {
    return apiPatch<User, UpdateUserRequest>(
        `/api/admin/users/${userId}`,
        { is_active: true },
        requestOptions
    );
}

export function adminResetUserPassword(userId: string) {
    return apiPostNoBody<AdminPasswordResetResponse>(
        `/api/admin/users/${userId}/password-reset`,
        requestOptions
    );
}

export function adminResetUserMfa(userId: string) {
    return apiPostNoBody<AdminMfaResetResponse>(
        `/api/admin/users/${userId}/mfa/reset`,
        requestOptions
    );
}
