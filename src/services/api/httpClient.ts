import { refreshAccessToken } from '../auth/auth.refresh';
import type { RefreshResponse } from '../auth/auth.types';
import { emitAuthRefresh } from '../../utils/auth/events';
import { getStoredToken, setStoredExpiresAt, setStoredToken } from '../../utils/auth/storage';
import { buildAuthorizationHeader } from '../../utils/auth/authorization';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!BASE_URL) {
    throw new Error('VITE_API_BASE_URL no esta configurado.');
}

type ApiErrorPayload = unknown;

export class ApiError extends Error {
    status: number;
    payload?: ApiErrorPayload;

    constructor(message: string, status: number, payload?: ApiErrorPayload) {
        super(message);
        this.status = status;
        this.payload = payload;
    }
}

async function parseJsonSafe(response: Response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

export async function apiGet<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'GET',
        headers: buildHeaders(options, false),
        credentials: options?.credentials
    });

    if (!response.ok) {
        if (response.status === 401 && options?.retryAuth !== false) {
            const refreshed = await attemptRefresh();
            if (refreshed) {
                return apiGet<T>(path, { ...options, retryAuth: false });
            }
        }
        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    return response.json() as Promise<T>;
}

export async function apiGetBlob(path: string, options?: ApiRequestOptions): Promise<Blob> {
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'GET',
        headers: buildHeaders(options, false),
        credentials: options?.credentials
    });

    if (!response.ok) {
        if (response.status === 401 && options?.retryAuth !== false) {
            const refreshed = await attemptRefresh();
            if (refreshed) {
                return apiGetBlob(path, { ...options, retryAuth: false });
            }
        }
        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    return response.blob();
}

export interface ApiBlobWithMeta {
    blob: Blob;
    headers: Headers;
}

export async function apiGetBlobWithMeta(path: string, options?: ApiRequestOptions): Promise<ApiBlobWithMeta> {
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'GET',
        headers: buildHeaders(options, false),
        credentials: options?.credentials
    });

    if (!response.ok) {
        if (response.status === 401 && options?.retryAuth !== false) {
            const refreshed = await attemptRefresh();
            if (refreshed) {
                return apiGetBlobWithMeta(path, { ...options, retryAuth: false });
            }
        }
        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    return {
        blob: await response.blob(),
        headers: response.headers
    };
}

type ApiRequestOptions = {
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
    auth?: boolean;
    retryAuth?: boolean;
};

function buildHeaders(options: ApiRequestOptions | undefined, includeJson: boolean) {
    const headers: Record<string, string> = {
        Accept: 'application/json'
    };
    if (includeJson) {
        headers['Content-Type'] = 'application/json';
    }
    if (options?.headers) {
        Object.assign(headers, options.headers);
    }
    if (options?.auth) {
        const token = getStoredToken();
        if (token) {
            const authHeader = buildAuthorizationHeader(token);
            if (authHeader) {
                headers.Authorization = authHeader;
            }
        }
    }
    return headers;
}

let refreshPromise: Promise<RefreshResponse | { error: string }> | null = null;

async function attemptRefresh() {
    if (!refreshPromise) {
        refreshPromise = refreshAccessToken();
    }
    const result = await refreshPromise;
    refreshPromise = null;
    if ('access_token' in result) {
        setStoredToken(result.access_token);
        setStoredExpiresAt(Date.now() + result.expires_in * 1000);
        emitAuthRefresh({ accessToken: result.access_token, expiresIn: result.expires_in });
        return true;
    }
    return false;
}

export async function apiPost<T, B = unknown>(
    path: string,
    body: B,
    options?: ApiRequestOptions
): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: buildHeaders(options, true),
        body: JSON.stringify(body),
        credentials: options?.credentials
    });

    if (!response.ok) {
        if (response.status === 401 && options?.retryAuth !== false) {
            const refreshed = await attemptRefresh();
            if (refreshed) {
                return apiPost<T, B>(path, body, { ...options, retryAuth: false });
            }
        }
        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    return response.json() as Promise<T>;
}

export async function apiPostNoBody<T>(
    path: string,
    options?: ApiRequestOptions
): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: buildHeaders(options, false),
        credentials: options?.credentials
    });

    if (!response.ok) {
        if (response.status === 401 && options?.retryAuth !== false) {
            const refreshed = await attemptRefresh();
            if (refreshed) {
                return apiPostNoBody<T>(path, { ...options, retryAuth: false });
            }
        }
        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    const payload = await parseJsonSafe(response);
    return (payload ?? {}) as T;
}

export async function apiPostFormData<T>(
    path: string,
    body: FormData,
    options?: ApiRequestOptions
): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: buildHeaders(options, false),
        body,
        credentials: options?.credentials
    });

    if (!response.ok) {
        if (response.status === 401 && options?.retryAuth !== false) {
            const refreshed = await attemptRefresh();
            if (refreshed) {
                return apiPostFormData<T>(path, body, { ...options, retryAuth: false });
            }
        }
        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    return response.json() as Promise<T>;
}

export async function apiPut<T, B = unknown>(
    path: string,
    body: B,
    options?: ApiRequestOptions
): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'PUT',
        headers: buildHeaders(options, true),
        body: JSON.stringify(body),
        credentials: options?.credentials
    });

    if (!response.ok) {
        if (response.status === 401 && options?.retryAuth !== false) {
            const refreshed = await attemptRefresh();
            if (refreshed) {
                return apiPut<T, B>(path, body, { ...options, retryAuth: false });
            }
        }
        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    return response.json() as Promise<T>;
}

export async function apiPatch<T, B = unknown>(
    path: string,
    body: B,
    options?: ApiRequestOptions
): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'PATCH',
        headers: buildHeaders(options, true),
        body: JSON.stringify(body),
        credentials: options?.credentials
    });

    if (!response.ok) {
        if (response.status === 401 && options?.retryAuth !== false) {
            const refreshed = await attemptRefresh();
            if (refreshed) {
                return apiPatch<T, B>(path, body, { ...options, retryAuth: false });
            }
        }
        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    return response.json() as Promise<T>;
}

export async function apiDelete<T>(
    path: string,
    options?: ApiRequestOptions
): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'DELETE',
        headers: buildHeaders(options, false),
        credentials: options?.credentials
    });

    if (!response.ok) {
        if (response.status === 401 && options?.retryAuth !== false) {
            const refreshed = await attemptRefresh();
            if (refreshed) {
                return apiDelete<T>(path, { ...options, retryAuth: false });
            }
        }
        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    const payload = await parseJsonSafe(response);
    return (payload ?? {}) as T;
}
