import { useCallback, useMemo, useState, useEffect, useRef, type ReactNode } from 'react';
import { decodeJwtPayload, isJwtExpired, type JwtPayload } from '../utils/auth/jwt';
import { getPrimaryRole } from '../utils/auth/roles';
import { refreshAccessToken } from '../services/auth/auth.refresh';
import { getAuthMe } from '../services/auth/auth.api';
import type { AuthMeResponse } from '../services/auth/auth.types';
import { onAuthRefresh } from '../utils/auth/events';
import {
    devAuthBypassEnabled,
    getDevProfile,
    getDevRoleLabel,
    resolveDevAuthActive,
    resolveDevRole,
    setDevAuthActive as persistDevAuthActive,
    clearDevAuthActive
} from '../utils/auth/devBypass';
import { AuthContext, type AuthContextValue, type LogoutReason } from './AuthContextBase';
import {
    getStoredToken,
    getStoredExpiresAt,
    removeStoredExpiresAt,
    removeStoredToken,
    setStoredExpiresAt,
    setStoredToken
} from '../utils/auth/storage';
const AUTH_NOTICE_KEY = 'cognia_auth_notice';

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
    const refreshAttemptedRef = useRef(false);
    const [devAuthActive, setDevAuthActive] = useState(() => (
        devAuthBypassEnabled ? resolveDevAuthActive() : false
    ));
    const devRole = useMemo(() => (devAuthBypassEnabled ? resolveDevRole() : null), []);
    const devProfile = useMemo(
        () => (devAuthActive && devRole ? getDevProfile(devRole) : null),
        [devAuthActive, devRole]
    );

    const [accessToken, setAccessToken] = useState<string | null>(storedToken);
    const [roles, setRoles] = useState<string[]>(storedPayload?.roles ?? []);
    const [userId, setUserId] = useState<string | null>(storedPayload?.sub ?? null);
    const [expiresAt, setExpiresAt] = useState<number | null>(storedExpiresAt ?? computeExpiresAt(storedPayload, undefined));
    const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
    const [profile, setProfile] = useState<AuthMeResponse | null>(null);
    const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [profileErrorStatus, setProfileErrorStatus] = useState<number | null>(null);

    const updateDevAuthActive = useCallback((active: boolean) => {
        if (!devAuthBypassEnabled) return;
        setDevAuthActive(active);
        if (active) {
            persistDevAuthActive(true);
        } else {
            clearDevAuthActive();
        }
    }, []);

    const devLogout = useCallback(() => {
        if (!devAuthBypassEnabled) return;
        updateDevAuthActive(false);
        setProfile(null);
        setProfileStatus('idle');
        setProfileErrorStatus(null);
        setIsAuthLoading(false);
    }, [updateDevAuthActive]);

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
        if (devAuthActive) {
            setIsAuthLoading(false);
            return true;
        }
        if (!options?.silent) {
            setIsAuthLoading(true);
        }
        try {
            const response = await refreshAccessToken();
            if ('error' in response) {
                if (!accessToken) {
                    logout('expired');
                } else {
                    setIsAuthLoading(false);
                }
                return false;
            }
            setSession(response.access_token, response.expires_in);
            return true;
        } catch {
            if (!accessToken) {
                logout('expired');
            } else {
                setIsAuthLoading(false);
            }
            return false;
        }
    }, [devAuthActive, logout, setSession, accessToken]);

    const reloadProfile = useCallback(async () => {
        if (devAuthActive && devProfile) {
            setProfile(devProfile);
            setProfileStatus('success');
            setProfileErrorStatus(null);
            return;
        }
        if (!getStoredToken()) {
            setProfile(null);
            setProfileStatus('idle');
            setProfileErrorStatus(401);
            return;
        }
        setProfileStatus('loading');
        setProfileErrorStatus(null);
        const response = await getAuthMe();
        if ('error' in response) {
            setProfile(null);
            setProfileStatus('error');
            setProfileErrorStatus(response.status);
            if (response.status === 401) {
                logout('expired');
            }
            return;
        }
        setProfile(response);
        setProfileStatus('success');
        setProfileErrorStatus(null);
    }, [logout, devProfile, devAuthActive]);

    useEffect(() => {
        if (devAuthActive) {
            const timeoutId = window.setTimeout(() => {
                setIsAuthLoading(false);
            }, 0);
            return () => window.clearTimeout(timeoutId);
        }
        const invalidToken = !!storedToken && !storedPayload;
        const expired = invalidToken
            ? true
            : storedPayload?.exp
                ? isJwtExpired(storedPayload.exp)
                : storedExpiresAt
                    ? Date.now() >= storedExpiresAt
                    : true;

        if (invalidToken || expired) {
            removeStoredToken();
            removeStoredExpiresAt();
            const timeoutId = window.setTimeout(() => {
                                setAccessToken(null);
                                setRoles([]);
                                setUserId(null);
                                setExpiresAt(null);
            }, 0);
            return () => window.clearTimeout(timeoutId);
        }

        if (!storedToken || invalidToken || expired) {
            if (!refreshAttemptedRef.current) {
                refreshAttemptedRef.current = true;
                const timeoutId = window.setTimeout(() => {
                    void refreshSession();
                }, 0);
                return () => window.clearTimeout(timeoutId);
            }
            const timeoutId = window.setTimeout(() => {
                setIsAuthLoading(false);
            }, 0);
            return () => window.clearTimeout(timeoutId);
        }

        const timeoutId = window.setTimeout(() => {
            setIsAuthLoading(false);
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [devAuthActive, storedToken, storedPayload, storedExpiresAt, refreshSession]);

    useEffect(() => {
        if (devAuthActive) {
            if (devProfile) {
                const timeoutId = window.setTimeout(() => {
                    setProfile(devProfile);
                    setProfileStatus('success');
                    setProfileErrorStatus(null);
                }, 0);
                return () => window.clearTimeout(timeoutId);
            }
            return;
        }
        if (!accessToken) {
            const timeoutId = window.setTimeout(() => {
                setProfile(null);
                setProfileStatus('idle');
                setProfileErrorStatus(null);
            }, 0);
            return () => window.clearTimeout(timeoutId);
        }
        if (isAuthLoading) return;
        if (expiresAt && Date.now() >= expiresAt) return;
        const timeoutId = window.setTimeout(() => {
            void reloadProfile();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [accessToken, isAuthLoading, expiresAt, reloadProfile, devProfile, devAuthActive]);

    useEffect(() => {
        if (devAuthActive) return;
        return onAuthRefresh((detail) => {
            setSession(detail.accessToken, detail.expiresIn);
        });
    }, [setSession, devAuthActive]);

    useEffect(() => {
        if (devAuthActive) return;
        if (!expiresAt) return;
        const timeLeft = expiresAt - Date.now();
        if (timeLeft <= 0) {
            const timeoutId = window.setTimeout(() => {
                void refreshSession({ silent: true });
            }, 0);
            return () => window.clearTimeout(timeoutId);
        }
        const timeoutId = window.setTimeout(() => {
            void refreshSession({ silent: true });
        }, timeLeft);
        return () => window.clearTimeout(timeoutId);
    }, [expiresAt, refreshSession, devAuthActive]);

    const effectiveRoles = devAuthActive && devProfile?.roles ? devProfile.roles : roles;
    const isAuthenticated = devAuthActive ? true : !!accessToken;
    const primaryRole = getPrimaryRole(effectiveRoles);
    const effectiveProfile = devAuthActive ? devProfile : profile;
    const devBypassLabel = devAuthActive && devRole ? getDevRoleLabel(devRole) : null;

    const value = useMemo<AuthContextValue>(() => ({
        accessToken,
        roles: effectiveRoles,
        userId,
        expiresAt,
        isAuthenticated,
        isAuthLoading,
        primaryRole,
        profile: effectiveProfile,
        profileStatus,
        profileErrorStatus,
        devBypassEnabled: devAuthBypassEnabled,
        devAuthActive,
        devBypassLabel,
        setDevAuthActive: updateDevAuthActive,
        setSession,
        logout,
        devLogout,
        refreshSession,
        reloadProfile
    }), [
        accessToken,
        effectiveRoles,
        userId,
        expiresAt,
        isAuthenticated,
        isAuthLoading,
        primaryRole,
        effectiveProfile,
        profileStatus,
        profileErrorStatus,
        devAuthActive,
        devBypassLabel,
        updateDevAuthActive,
        setSession,
        logout,
        devLogout,
        refreshSession,
        reloadProfile
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
