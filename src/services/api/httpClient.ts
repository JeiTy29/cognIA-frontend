import { refreshAccessToken } from '../auth/auth.refresh';
import type { RefreshResponse } from '../auth/auth.types';
import { emitAuthRefresh } from '../../utils/auth/events';
import { getStoredToken, setStoredExpiresAt, setStoredToken } from '../../utils/auth/storage';
import { buildAuthorizationHeader } from '../../utils/auth/authorization';
import {
    clearTransportKeyCache,
    encryptedJsonFetch
} from './encryptedTransport';
import {
    assertApiClientConfig,
    debugApiClient,
    joinApiUrl
} from './url';

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

type ApiRequestOptions = {
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
    auth?: boolean;
    retryAuth?: boolean;
};

let refreshPromise: Promise<RefreshResponse | { error: string }> | null = null;

function ensureApiClientConfig() {
    const assertion = assertApiClientConfig();
    if (!assertion.ok) {
        throw new Error(assertion.message ?? 'La configuracion del cliente API no es valida.');
    }
}

function getRequestCredentials(options?: ApiRequestOptions) {
    return options?.credentials ?? 'include';
}

async function parseJsonSafe(response: Response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

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

async function attemptRefresh() {
    refreshPromise ??= refreshAccessToken();
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

function toTransportApiError(error: unknown) {
    if (error instanceof ApiError) return error;

    if (error instanceof Error) {
        if (error.message === 'plaintext_not_allowed') {
            return new ApiError('Encrypted response required', 500, {
                error: 'plaintext_not_allowed',
                msg: 'encrypted_response_required'
            });
        }

        if (error.message === 'transport_key_failed') {
            clearTransportKeyCache();
            return new ApiError('Transport key failed', 500, {
                error: 'transport_key_failed',
                msg: 'transport_key_failed'
            });
        }

        return new ApiError(error.message, 500, {
            error: 'encrypted_payload_invalid',
            msg: error.message
        });
    }

    return new ApiError('Encrypted request failed', 500, {
        error: 'encrypted_payload_invalid',
        msg: 'encrypted_payload_invalid'
    });
}

async function handleFailedResponse(response: Response, options?: ApiRequestOptions) {
    if (response.status === 401 && options?.retryAuth !== false) {
        const refreshed = await attemptRefresh();
        if (refreshed) {
            return true;
        }
    }

    return false;
}

async function runStandardJsonRequest<T>(
    path: string,
    init: RequestInit,
    options: ApiRequestOptions | undefined,
    retry: () => Promise<T>
) {
    ensureApiClientConfig();
    debugApiClient(`request ${init.method ?? 'GET'} ${path}`);

    const response = await fetch(joinApiUrl(path), {
        ...init,
        credentials: getRequestCredentials(options)
    });

    if (!response.ok) {
        const shouldRetry = await handleFailedResponse(response, options);
        if (shouldRetry) {
            return retry();
        }

        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    return response.json() as Promise<T>;
}

async function runStandardBlobRequest(
    path: string,
    options: ApiRequestOptions | undefined,
    withMeta: boolean,
    retry: () => Promise<Blob | ApiBlobWithMeta>
) {
    ensureApiClientConfig();
    debugApiClient(`request GET ${path}`);

    const response = await fetch(joinApiUrl(path), {
        method: 'GET',
        headers: buildHeaders(options, false),
        credentials: getRequestCredentials(options)
    });

    if (!response.ok) {
        const shouldRetry = await handleFailedResponse(response, options);
        if (shouldRetry) {
            return retry();
        }

        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    if (withMeta) {
        return {
            blob: await response.blob(),
            headers: response.headers
        } satisfies ApiBlobWithMeta;
    }

    return response.blob();
}

async function runEncryptedJsonRequest<T>(
    path: string,
    method: 'POST' | 'PATCH' | 'PUT',
    body: unknown,
    options: ApiRequestOptions | undefined,
    retry: () => Promise<T>,
    requireEncryptedResponse = true
) {
    ensureApiClientConfig();

    try {
        const result = await encryptedJsonFetch<T>(joinApiUrl(path), {
            method,
            body,
            headers: buildHeaders(options, false),
            credentials: getRequestCredentials(options),
            requireEncryptedResponse
        });

        if (!result.response.ok) {
            const shouldRetry = await handleFailedResponse(result.response, options);
            if (shouldRetry) {
                return retry();
            }

            throw new ApiError(
                `Request failed with status ${result.response.status}`,
                result.response.status,
                result.data ?? undefined
            );
        }

        return result.data as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw toTransportApiError(error);
    }
}

export async function apiGet<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return runStandardJsonRequest<T>(
        path,
        {
            method: 'GET',
            headers: buildHeaders(options, false)
        },
        options,
        () => apiGet<T>(path, { ...options, retryAuth: false })
    );
}

export async function apiGetBlob(path: string, options?: ApiRequestOptions): Promise<Blob> {
    const result = await runStandardBlobRequest(
        path,
        options,
        false,
        () => apiGetBlob(path, { ...options, retryAuth: false })
    );

    return result as Blob;
}

export interface ApiBlobWithMeta {
    blob: Blob;
    headers: Headers;
}

export async function apiGetBlobWithMeta(path: string, options?: ApiRequestOptions): Promise<ApiBlobWithMeta> {
    const result = await runStandardBlobRequest(
        path,
        options,
        true,
        () => apiGetBlobWithMeta(path, { ...options, retryAuth: false })
    );

    return result as ApiBlobWithMeta;
}

export async function apiPost<T, B = unknown>(
    path: string,
    body: B,
    options?: ApiRequestOptions
): Promise<T> {
    return runStandardJsonRequest<T>(
        path,
        {
            method: 'POST',
            headers: buildHeaders(options, true),
            body: JSON.stringify(body)
        },
        options,
        () => apiPost<T, B>(path, body, { ...options, retryAuth: false })
    );
}

export async function apiPostNoBody<T>(
    path: string,
    options?: ApiRequestOptions
): Promise<T> {
    ensureApiClientConfig();
    debugApiClient(`request POST ${path}`);

    const response = await fetch(joinApiUrl(path), {
        method: 'POST',
        headers: buildHeaders(options, false),
        credentials: getRequestCredentials(options)
    });

    if (!response.ok) {
        const shouldRetry = await handleFailedResponse(response, options);
        if (shouldRetry) {
            return apiPostNoBody<T>(path, { ...options, retryAuth: false });
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
    ensureApiClientConfig();
    debugApiClient(`request POST ${path}`);

    const response = await fetch(joinApiUrl(path), {
        method: 'POST',
        headers: buildHeaders(options, false),
        body,
        credentials: getRequestCredentials(options)
    });

    if (!response.ok) {
        const shouldRetry = await handleFailedResponse(response, options);
        if (shouldRetry) {
            return apiPostFormData<T>(path, body, { ...options, retryAuth: false });
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
    return runStandardJsonRequest<T>(
        path,
        {
            method: 'PUT',
            headers: buildHeaders(options, true),
            body: JSON.stringify(body)
        },
        options,
        () => apiPut<T, B>(path, body, { ...options, retryAuth: false })
    );
}

export async function apiPatch<T, B = unknown>(
    path: string,
    body: B,
    options?: ApiRequestOptions
): Promise<T> {
    return runStandardJsonRequest<T>(
        path,
        {
            method: 'PATCH',
            headers: buildHeaders(options, true),
            body: JSON.stringify(body)
        },
        options,
        () => apiPatch<T, B>(path, body, { ...options, retryAuth: false })
    );
}

export async function apiDelete<T>(
    path: string,
    options?: ApiRequestOptions
): Promise<T> {
    ensureApiClientConfig();
    debugApiClient(`request DELETE ${path}`);

    const response = await fetch(joinApiUrl(path), {
        method: 'DELETE',
        headers: buildHeaders(options, false),
        credentials: getRequestCredentials(options)
    });

    if (!response.ok) {
        const shouldRetry = await handleFailedResponse(response, options);
        if (shouldRetry) {
            return apiDelete<T>(path, { ...options, retryAuth: false });
        }
        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    const payload = await parseJsonSafe(response);
    return (payload ?? {}) as T;
}

export async function apiSecurePost<T, B = unknown>(
    path: string,
    body: B,
    options?: ApiRequestOptions
): Promise<T> {
    return runEncryptedJsonRequest<T>(
        path,
        'POST',
        body,
        options,
        () => apiSecurePost<T, B>(path, body, { ...options, retryAuth: false })
    );
}

export async function apiSecurePostNoBody<T>(
    path: string,
    options?: ApiRequestOptions
): Promise<T> {
    return runEncryptedJsonRequest<T>(
        path,
        'POST',
        {},
        options,
        () => apiSecurePostNoBody<T>(path, { ...options, retryAuth: false })
    );
}

export async function apiSecurePatch<T, B = unknown>(
    path: string,
    body: B,
    options?: ApiRequestOptions
): Promise<T> {
    return runEncryptedJsonRequest<T>(
        path,
        'PATCH',
        body,
        options,
        () => apiSecurePatch<T, B>(path, body, { ...options, retryAuth: false })
    );
}
