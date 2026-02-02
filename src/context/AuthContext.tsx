import { createContext, useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';
import { decodeJwtPayload, isJwtExpired, type JwtPayload } from '../utils/auth/jwt';
import { getPrimaryRole, type AppRole } from '../utils/auth/roles';
import { refreshAccessToken } from '../services/auth/auth.refresh';
import { onAuthRefresh } from '../utils/auth/events';
import {
    getStoredToken,
    getStoredExpiresAt,
    removeStoredExpiresAt,
    removeStoredToken,
    setStoredExpiresAt,
    setStoredToken
} from '../utils/auth/storage';
const AUTH_NOTICE_KEY = 'cognia_auth_notice';

type LogoutReason = 'expired' | 'manual';

interface AuthContextValue {
    accessToken: string | null;
    roles: string[];
    userId: string | null;
    expiresAt: number | null;
    isAuthenticated: boolean;
    isAuthLoading: boolean;
    primaryRole: AppRole | null;
    setSession: (token: string, expiresIn?: number) => void;
    logout: (reason?: LogoutReason) => void;
    refreshSession: (options?: { silent?: boolean }) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

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
    const storedToken = getStoredToken();
    const storedPayload = useMemo(() => (storedToken ? decodeJwtPayload(storedToken) : null), [storedToken]);
    const storedExpiresAt = getStoredExpiresAt();

    const [accessToken, setAccessToken] = useState<string | null>(storedToken);
    const [roles, setRoles] = useState<string[]>(storedPayload?.roles ?? []);
    const [userId, setUserId] = useState<string | null>(storedPayload?.sub ?? null);
    const [expiresAt, setExpiresAt] = useState<number | null>(storedExpiresAt ?? computeExpiresAt(storedPayload, undefined));
    const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

    const logout = useCallback((reason?: LogoutReason) => {
        setAccessToken(null);
        setRoles([]);
        setUserId(null);
        setExpiresAt(null);
        setIsAuthLoading(false);
        removeStoredToken();
        removeStoredExpiresAt();
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
        setIsAuthLoading(false);
        setStoredToken(token);
        setStoredExpiresAt(nextExpiresAt);
        sessionStorage.removeItem(AUTH_NOTICE_KEY);
    }, []);

    const refreshSession = useCallback(async (options?: { silent?: boolean }) => {
        if (!options?.silent) {
            setIsAuthLoading(true);
        }
        try {
            const response = await refreshAccessToken();
            if ('error' in response) {
                logout('expired');
                return false;
            }
            setSession(response.access_token, response.expires_in);
            return true;
        } catch {
            logout('expired');
            return false;
        }
    }, [logout, setSession]);

    useEffect(() => {
        const invalidToken = !!storedToken && !storedPayload;
        const expired = invalidToken
            ? true
            : storedPayload?.exp
                ? isJwtExpired(storedPayload.exp)
                : storedExpiresAt
                    ? Date.now() >= storedExpiresAt
                    : false;

        if (invalidToken || expired) {
            removeStoredToken();
            removeStoredExpiresAt();
            setAccessToken(null);
            setRoles([]);
            setUserId(null);
            setExpiresAt(null);
        }

        if (!storedToken || invalidToken || expired) {
            const timeoutId = window.setTimeout(() => {
                void refreshSession();
            }, 0);
            return () => window.clearTimeout(timeoutId);
        }

        setIsAuthLoading(false);
        return undefined;
    }, [storedToken, storedPayload, storedExpiresAt, refreshSession]);

    useEffect(() => {
        return onAuthRefresh((detail) => {
            setSession(detail.accessToken, detail.expiresIn);
        });
    }, [setSession]);

    useEffect(() => {
        if (!expiresAt) return;
        const timeLeft = expiresAt - Date.now();
        if (timeLeft <= 0) {
            void refreshSession({ silent: true });
            return;
        }
        const timeoutId = window.setTimeout(() => {
            void refreshSession({ silent: true });
        }, timeLeft);
        return () => window.clearTimeout(timeoutId);
    }, [expiresAt, refreshSession]);

    const isAuthenticated = !!accessToken;
    const primaryRole = getPrimaryRole(roles);

    const value = useMemo<AuthContextValue>(() => ({
        accessToken,
        roles,
        userId,
        expiresAt,
        isAuthenticated,
        isAuthLoading,
        primaryRole,
        setSession,
        logout,
        refreshSession
    }), [accessToken, roles, userId, expiresAt, isAuthenticated, isAuthLoading, primaryRole, setSession, logout, refreshSession]);

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
