import { apiDelete, apiGet, apiPatch, apiPost } from '../api/httpClient';

export interface User {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    user_type: 'guardian' | 'psychologist';
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
    is_active?: boolean;
    roles?: string[];
    user_type?: 'guardian' | 'psychologist';
    professional_card_number?: string | null;
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

export function getUserById(userId: string) {
    return apiGet<User>(`/api/v1/users/${userId}`, requestOptions);
}

export function updateUser(userId: string, payload: UpdateUserRequest) {
    return apiPatch<User, UpdateUserRequest>(`/api/admin/users/${userId}`, payload, requestOptions);
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
