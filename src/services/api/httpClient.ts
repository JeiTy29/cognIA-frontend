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

export async function apiGet<T>(path: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'GET',
        headers: {
            Accept: 'application/json'
        }
    });

    if (!response.ok) {
        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    return response.json() as Promise<T>;
}

type ApiRequestOptions = {
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
};

export async function apiPost<T, B = unknown>(
    path: string,
    body: B,
    options?: ApiRequestOptions
): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(options?.headers ?? {})
        },
        body: JSON.stringify(body),
        credentials: options?.credentials
    });

    if (!response.ok) {
        const payload = await parseJsonSafe(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, payload ?? undefined);
    }

    return response.json() as Promise<T>;
}
