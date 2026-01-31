export const ACCESS_TOKEN_KEY = 'cognia_access_token';
export const EXPIRES_AT_KEY = 'cognia_access_expires_at';

export function getStoredToken() {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredToken(token: string) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function removeStoredToken() {
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
