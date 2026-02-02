import { getCsrfToken } from '../../utils/auth/csrf';
import type { RefreshErrorResponse, RefreshResponse } from './auth.types';

export async function refreshAccessToken(): Promise<RefreshResponse | RefreshErrorResponse> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const csrfToken = getCsrfToken();
    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
        credentials: 'include'
    });

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
