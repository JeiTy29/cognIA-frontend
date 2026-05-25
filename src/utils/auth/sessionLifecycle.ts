import {
    ACCESS_TOKEN_KEY,
    EXPIRES_AT_KEY,
    removeStoredExpiresAt,
    removeStoredToken
} from './storage';

export const AUTH_NOTICE_KEY = 'cognia_auth_notice';
export const MANUAL_LOGOUT_KEY = 'cognia_manual_logout';

export function hasManualLogoutFlag() {
    return sessionStorage.getItem(MANUAL_LOGOUT_KEY) === 'true';
}

export function markManualLogoutFlag() {
    sessionStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
}

export function clearManualLogoutFlag() {
    sessionStorage.removeItem(MANUAL_LOGOUT_KEY);
}

export function setAuthNotice(value: string) {
    sessionStorage.setItem(AUTH_NOTICE_KEY, value);
}

export function clearAuthNotice() {
    sessionStorage.removeItem(AUTH_NOTICE_KEY);
}

export function clearAuthClientState() {
    removeStoredToken();
    removeStoredExpiresAt();
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
    clearAuthNotice();
}
