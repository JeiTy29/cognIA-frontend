import { apiPost } from '../api/httpClient';
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
    try {
        return await apiPost<LoginResponse, LoginRequest>('/api/auth/login', payload, {
            credentials: 'include'
        });
    } catch (error) {
        if (error instanceof Error && 'status' in error) {
            const status = (error as { status?: number }).status;
            if (status === 400 || status === 401) {
                return { error: 'invalid_credentials', status: status ?? 400 };
            }
        }
        throw error;
    }
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
