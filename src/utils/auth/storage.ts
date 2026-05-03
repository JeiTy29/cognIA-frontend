export const ACCESS_TOKEN_KEY = 'cognia_access_token';
export const EXPIRES_AT_KEY = 'cognia_access_expires_at';

let inMemoryAccessToken: string | null = null;

function normalizeToken(token: string | null | undefined) {
    if (typeof token !== 'string') return null;
    const normalized = token.trim();
    if (!normalized) return null;

    const parts = normalized.split('.');
    if (parts.length !== 3) return null;

    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    if (!parts.every((part) => base64UrlPattern.test(part))) return null;

    return normalized;
}

export function getStoredToken() {
    if (inMemoryAccessToken) return inMemoryAccessToken;

    const persistedToken = normalizeToken(sessionStorage.getItem(ACCESS_TOKEN_KEY));
    if (!persistedToken) {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        return null;
    }

    // Keep the access token in memory and clear the persisted copy to reduce exposure in sessionStorage.
    inMemoryAccessToken = persistedToken;
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    return persistedToken;
}

export function setStoredToken(token: string) {
    const normalizedToken = normalizeToken(token);
    if (!normalizedToken) {
        removeStoredToken();
        return;
    }

    inMemoryAccessToken = normalizedToken;
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function removeStoredToken() {
    inMemoryAccessToken = null;
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getStoredExpiresAt() {
    const raw = sessionStorage.getItem(EXPIRES_AT_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

export function setStoredExpiresAt(value: number | null) {
    if (value == null) {
        sessionStorage.removeItem(EXPIRES_AT_KEY);
    } else {
        sessionStorage.setItem(EXPIRES_AT_KEY, String(value));
    }
}

export function removeStoredExpiresAt() {
    sessionStorage.removeItem(EXPIRES_AT_KEY);
}
