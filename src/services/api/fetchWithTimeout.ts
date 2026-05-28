const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

export class RequestTimeoutError extends Error {
    constructor() {
        super('request_timeout');
        this.name = 'RequestTimeoutError';
    }
}

export async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
) {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => {
        controller.abort(new RequestTimeoutError());
    }, timeoutMs);

    try {
        return await fetch(input, {
            ...init,
            signal: init.signal ?? controller.signal
        });
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new RequestTimeoutError();
        }
        throw error;
    } finally {
        globalThis.clearTimeout(timeoutId);
    }
}
