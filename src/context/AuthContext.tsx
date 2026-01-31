import { createContext, useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';
import { decodeJwtPayload, isJwtExpired, type JwtPayload } from '../utils/auth/jwt';
import { getPrimaryRole, type AppRole } from '../utils/auth/roles';

const ACCESS_TOKEN_KEY = 'cognia_access_token';
const EXPIRES_AT_KEY = 'cognia_access_expires_at';
const AUTH_NOTICE_KEY = 'cognia_auth_notice';

type LogoutReason = 'expired' | 'manual';

interface AuthContextValue {
    accessToken: string | null;
    roles: string[];
    userId: string | null;
    expiresAt: number | null;
    isAuthenticated: boolean;
    primaryRole: AppRole | null;
    setSession: (token: string, expiresIn?: number) => void;
    logout: (reason?: LogoutReason) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredExpiresAt() {
    const raw = localStorage.getItem(EXPIRES_AT_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

function computeExpiresAt(payload: JwtPayload | null, expiresIn?: number) {
    if (payload?.exp) {
        return payload.exp * 1000;
    }
    if (expiresIn) {
        return Date.now() + expiresIn * 1000;
    }
    return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedPayload = storedToken ? decodeJwtPayload(storedToken) : null;
    const storedExpiresAt = getStoredExpiresAt();
    const invalidToken = !!storedToken && !storedPayload;
    const initialExpired = invalidToken
        ? true
        : storedPayload?.exp
            ? isJwtExpired(storedPayload.exp)
            : storedExpiresAt
                ? Date.now() >= storedExpiresAt
                : false;

    const [accessToken, setAccessToken] = useState<string | null>(initialExpired ? null : storedToken);
    const [roles, setRoles] = useState<string[]>(initialExpired ? [] : storedPayload?.roles ?? []);
    const [userId, setUserId] = useState<string | null>(initialExpired ? null : storedPayload?.sub ?? null);
    const [expiresAt, setExpiresAt] = useState<number | null>(initialExpired ? null : storedExpiresAt ?? computeExpiresAt(storedPayload, undefined));

    useEffect(() => {
        if (initialExpired) {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(EXPIRES_AT_KEY);
        }
    }, [initialExpired]);

    const logout = useCallback((reason?: LogoutReason) => {
        setAccessToken(null);
        setRoles([]);
        setUserId(null);
        setExpiresAt(null);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(EXPIRES_AT_KEY);
        if (reason === 'expired') {
            sessionStorage.setItem(AUTH_NOTICE_KEY, 'expired');
        }
    }, []);

    const setSession = useCallback((token: string, expiresIn?: number) => {
        const payload = decodeJwtPayload(token);
        const nextExpiresAt = computeExpiresAt(payload, expiresIn);
        setAccessToken(token);
        setRoles(payload?.roles ?? []);
        setUserId(payload?.sub ?? null);
        setExpiresAt(nextExpiresAt);
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        if (nextExpiresAt) {
            localStorage.setItem(EXPIRES_AT_KEY, String(nextExpiresAt));
        } else {
            localStorage.removeItem(EXPIRES_AT_KEY);
        }
        sessionStorage.removeItem(AUTH_NOTICE_KEY);
    }, []);

    useEffect(() => {
        if (!expiresAt) return;
        const timeLeft = expiresAt - Date.now();
        if (timeLeft <= 0) {
            logout('expired');
            return;
        }
        const timeoutId = window.setTimeout(() => {
            logout('expired');
        }, timeLeft);
        return () => window.clearTimeout(timeoutId);
    }, [expiresAt, logout]);

    const isAuthenticated = !!accessToken;
    const primaryRole = getPrimaryRole(roles);

    const value = useMemo<AuthContextValue>(() => ({
        accessToken,
        roles,
        userId,
        expiresAt,
        isAuthenticated,
        primaryRole,
        setSession,
        logout
    }), [accessToken, roles, userId, expiresAt, isAuthenticated, primaryRole, setSession, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function consumeAuthNotice() {
    const notice = sessionStorage.getItem(AUTH_NOTICE_KEY);
    if (notice) {
        sessionStorage.removeItem(AUTH_NOTICE_KEY);
    }
    return notice;
}
