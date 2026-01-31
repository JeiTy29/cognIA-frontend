import { apiPost } from '../api/httpClient';
import type {
    LoginRequest,
    LoginResponse,
    MFALoginRequest,
    MFALoginResponse,
    MFASetupResponse,
    MFAConfirmRequest,
    MFAConfirmResponse,
    MFADisableRequest,
    MFADisableResponse,
    RegisterPayload,
    RegisterResponse
} from './auth.types';

export function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
    return apiPost<RegisterResponse, RegisterPayload>('/api/auth/register', payload);
}

export function login(payload: LoginRequest): Promise<LoginResponse> {
    return apiPost<LoginResponse, LoginRequest>('/api/auth/login', payload, {
        credentials: 'include'
    });
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
