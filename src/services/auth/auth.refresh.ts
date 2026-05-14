import { joinApiUrl } from '../api/url';
import { getCsrfToken } from '../../utils/auth/csrf';
import type { RefreshErrorResponse, RefreshResponse } from './auth.types';
import { hasManualLogoutFlag } from '../../utils/auth/sessionLifecycle';

export async function refreshAccessToken(): Promise<RefreshResponse | RefreshErrorResponse> {
    if (hasManualLogoutFlag()) {
        if (import.meta.env.DEV) {
            console.debug('[auth] refresh:blocked:manual-logout');
        }
        return { error: 'invalid_session', status: 401 };
    }

    const csrfToken = getCsrfToken();
    if (!csrfToken) {
        if (import.meta.env.DEV) {
            console.debug('[auth] refresh:blocked:csrf-missing');
        }
        return { error: 'invalid_session', status: 401 };
    }

    if (import.meta.env.DEV) {
        console.debug('[auth] refresh:request:start');
    }
    const response = await fetch(joinApiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
        credentials: 'include'
    });
    if (import.meta.env.DEV) {
        console.debug('[auth] refresh:request:status', response.status);
    }

    const data = await response.json().catch(() => null);
    if (response.ok) {
        return data as RefreshResponse;
    }

    if (response.status === 401) {
        return { error: 'invalid_session', status: 401 };
    }

    const error = new Error(`Request failed with status ${response.status}`);
    (error as { status?: number; payload?: unknown }).status = response.status;
    (error as { status?: number; payload?: unknown }).payload = data ?? undefined;
    throw error;
}
