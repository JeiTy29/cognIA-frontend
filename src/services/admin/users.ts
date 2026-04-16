import { apiDelete, apiGet, apiPost, apiPut } from '../api/httpClient';

export interface User {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    user_type: string;
    professional_card_number: string | null;
    is_active: boolean;
    roles: string[];
    created_at: string;
    updated_at: string;
    review_status?: string | null;
    approval_status?: string | null;
    psychologist_status?: string | null;
    rejection_reason?: string | null;
    review_reason?: string | null;
}

export interface PaginatedUsersResponse {
    items: User[];
    page: number;
    page_size: number;
    total: number;
}

export interface CreateUserRequest {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    user_type: 'guardian' | 'psychologist';
    professional_card_number?: string;
    roles?: string[];
    is_active?: boolean;
}

export interface UpdateUserRequest {
    email?: string;
    password?: string;
    full_name?: string;
    user_type?: 'guardian' | 'psychologist';
    professional_card_number?: string;
    roles?: string[];
    is_active?: boolean;
}

interface UsersListParams {
    page: number;
    page_size: number;
}

interface DeleteUserResponse {
    msg: string;
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

export function getUsers(params: UsersListParams) {
    const search = new URLSearchParams({
        page: String(params.page),
        page_size: String(params.page_size)
    });
    return apiGet<PaginatedUsersResponse>(`/api/v1/users?${search.toString()}`, requestOptions);
}

export async function getAllUsers() {
    const pageSize = 100;
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    const collected: User[] = [];

    while (collected.length < total) {
        const response = await getUsers({ page, page_size: pageSize });
        const items = response.items ?? [];
        total = response.total ?? items.length;
        collected.push(...items);

        if (items.length === 0 || collected.length >= total) {
            break;
        }

        page += 1;
    }

    return collected;
}

export function createUser(payload: CreateUserRequest) {
    return apiPost<User, CreateUserRequest>('/api/v1/users', payload, requestOptions);
}

export function getUserById(userId: string) {
    return apiGet<User>(`/api/v1/users/${userId}`, requestOptions);
}

export function updateUser(userId: string, payload: UpdateUserRequest) {
    return apiPut<User, UpdateUserRequest>(`/api/v1/users/${userId}`, payload, requestOptions);
}

export function deactivateUser(userId: string) {
    return apiDelete<DeleteUserResponse>(`/api/v1/users/${userId}`, requestOptions);
}

export function adminResetUserPassword(userId: string) {
    return apiPost<AdminPasswordResetResponse, Record<string, never>>(
        `/api/admin/users/${userId}/password-reset`,
        {},
        requestOptions
    );
}

export function adminResetUserMfa(userId: string) {
    return apiPost<AdminMfaResetResponse, Record<string, never>>(
        `/api/admin/users/${userId}/mfa/reset`,
        {},
        requestOptions
    );
}
