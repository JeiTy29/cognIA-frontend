import { apiGet, apiPost } from '../api/httpClient';
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
    ChangePasswordRequest,
    ChangePasswordResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    VerifyResetTokenResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    LogoutResponse,
    LogoutErrorResponse,
    RegisterPayload,
    RegisterResponse,
    AuthMeResponse,
    AuthMeErrorResponse
} from './auth.types';
import { getCsrfToken } from '../../utils/auth/csrf';
import { getStoredToken } from '../../utils/auth/storage';
import { buildAuthorizationHeader } from '../../utils/auth/authorization';

export function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
    return apiPost<RegisterResponse, RegisterPayload>('/api/auth/register', payload);
}

export async function login(payload: LoginRequest): Promise<LoginResponse | LoginErrorResponse> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    try {
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

        return { error: 'request_failed', status: response.status };
    } catch {
        return { error: 'request_failed', status: 0 };
    }
}

export function loginMfa(payload: MFALoginRequest): Promise<MFALoginResponse> {
    return apiPost<MFALoginResponse, MFALoginRequest>('/api/auth/login/mfa', payload, {
        credentials: 'include'
    });
}

export function mfaSetup(token: string): Promise<MFASetupResponse> {
    const authorization = buildAuthorizationHeader(token);
    return apiPost<MFASetupResponse, Record<string, never>>('/api/mfa/setup', {}, {
        headers: {
            ...(authorization ? { Authorization: authorization } : {})
        }
    });
}

export function mfaConfirm(token: string, payload: MFAConfirmRequest): Promise<MFAConfirmResponse> {
    const authorization = buildAuthorizationHeader(token);
    return apiPost<MFAConfirmResponse, MFAConfirmRequest>('/api/mfa/confirm', payload, {
        headers: {
            ...(authorization ? { Authorization: authorization } : {})
        }
    });
}

export function mfaDisable(accessToken: string, payload: MFADisableRequest): Promise<MFADisableResponse> {
    const authorization = buildAuthorizationHeader(accessToken);
    return apiPost<MFADisableResponse, MFADisableRequest>('/api/mfa/disable', payload, {
        headers: {
            ...(authorization ? { Authorization: authorization } : {})
        }
    });
}

export function changePassword(payload: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    return apiPost<ChangePasswordResponse, ChangePasswordRequest>('/api/auth/password/change', payload, {
        auth: true,
        credentials: 'include'
    });
}

export function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
    const payload: ForgotPasswordRequest = { email };
    return apiPost<ForgotPasswordResponse, ForgotPasswordRequest>('/api/auth/password/forgot', payload, {
        credentials: 'include'
    });
}

export function verifyResetToken(token: string): Promise<VerifyResetTokenResponse> {
    const encodedToken = encodeURIComponent(token);
    return apiGet<VerifyResetTokenResponse>(`/api/auth/password/reset/verify?token=${encodedToken}`, {
        credentials: 'include'
    });
}

export function resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    return apiPost<ResetPasswordResponse, ResetPasswordRequest>('/api/auth/password/reset', payload, {
        credentials: 'include'
    });
}

export async function getAuthMe(): Promise<AuthMeResponse | AuthMeErrorResponse> {
    const token = getStoredToken();
    if (!token) {
        return { error: 'missing_token', status: 401 };
    }
    try {
        return await apiGet<AuthMeResponse>('/api/auth/me', {
            auth: true,
            credentials: 'include'
        });
    } catch (error) {
        if (error instanceof Error && 'status' in error) {
            const status = (error as { status?: number }).status ?? 401;
            return { error: 'unauthorized', status };
        }
        return { error: 'unauthorized', status: 500 };
    }
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
