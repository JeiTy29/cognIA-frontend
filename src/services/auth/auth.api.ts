import { apiPost, ApiError } from '../api/httpClient';
import type {
    LoginRequest,
    LoginResponse,
    LoginErrorResponse,
    MFALoginRequest,
    MFALoginResponse,
    MFASetupResponse,
    MFAConfirmRequest,
    MFAConfirmResponse,
    MFADisableRequest,
    MFADisableResponse,
    LogoutResponse,
    LogoutErrorResponse,
    RegisterPayload,
    RegisterResponse
} from './auth.types';
import { getCsrfToken } from '../../utils/auth/csrf';

export function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
    return apiPost<RegisterResponse, RegisterPayload>('/api/auth/register', payload);
}

export async function login(payload: LoginRequest): Promise<LoginResponse | LoginErrorResponse> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);
    if (response.ok) {
        return data as LoginResponse;
    }

    if (response.status === 400 || response.status === 401) {
        return { error: 'invalid_credentials', status: response.status };
    }

    throw new ApiError(`Request failed with status ${response.status}`, response.status, data ?? undefined);
}

export function loginMfa(payload: MFALoginRequest): Promise<MFALoginResponse> {
    return apiPost<MFALoginResponse, MFALoginRequest>('/api/auth/login/mfa', payload, {
        credentials: 'include'
    });
}

export function mfaSetup(token: string): Promise<MFASetupResponse> {
    return apiPost<MFASetupResponse, Record<string, never>>('/api/mfa/setup', {}, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
}

export function mfaConfirm(token: string, payload: MFAConfirmRequest): Promise<MFAConfirmResponse> {
    return apiPost<MFAConfirmResponse, MFAConfirmRequest>('/api/mfa/confirm', payload, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
}

export function mfaDisable(accessToken: string, payload: MFADisableRequest): Promise<MFADisableResponse> {
    return apiPost<MFADisableResponse, MFADisableRequest>('/api/mfa/disable', payload, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
}

export async function logout(): Promise<LogoutResponse | LogoutErrorResponse> {
    const csrfToken = getCsrfToken();
    try {
        return await apiPost<LogoutResponse, Record<string, never>>('/api/auth/logout', {}, {
            headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
            credentials: 'include'
        });
    } catch (error) {
        if (error instanceof Error && 'status' in error) {
            const status = (error as { status?: number }).status;
            if (status === 401) {
                return { error: 'invalid_credentials', status: status ?? 401 };
            }
        }
        throw error;
    }
}
