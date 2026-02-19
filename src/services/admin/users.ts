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
    user_type: 'guardian' | 'psychologist' | 'admin';
    professional_card_number?: string;
    roles?: string[];
    is_active?: boolean;
}

export interface UpdateUserRequest {
    email?: string;
    password?: string;
    full_name?: string;
    user_type?: 'guardian' | 'teacher' | 'psychologist';
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
