import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { decodeJwtPayload, isJwtExpired, type JwtPayload } from '../utils/auth/jwt';
import { getPrimaryRole } from '../utils/auth/roles';
import { refreshAccessToken } from '../services/auth/auth.refresh';
import { getAuthMe, logout as requestLogout } from '../services/auth/auth.api';
import type { AuthMeResponse } from '../services/auth/auth.types';
import { onAuthRefresh } from '../utils/auth/events';
import {
    devAuthBypassEnabled,
    getDevProfile,
    getDevRoleLabel,
    resolveDevAuthActive,
    resolveDevRole,
    setDevAuthActive as persistDevAuthActive,
    setDevRole as persistDevRole,
    clearDevAuthActive
} from '../utils/auth/devBypass';
import { AuthContext, type AuthContextValue, type LogoutReason } from './AuthContextBase';
import type { DevRole } from '../utils/auth/devBypass';
import {
    getStoredExpiresAt,
    getStoredToken,
    setStoredExpiresAt,
    setStoredToken
} from '../utils/auth/storage';
import {
    clearAuthClientState,
    clearAuthNotice,
    clearManualLogoutFlag,
    hasManualLogoutFlag,
    markManualLogoutFlag,
    setAuthNotice
} from '../utils/auth/sessionLifecycle';

type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

type AuthProviderProps = Readonly<{
    children: ReactNode;
}>;

function computeExpiresAt(payload: JwtPayload | null, expiresIn?: number) {
    if (payload?.exp) {
        return payload.exp * 1000;
    }
    if (expiresIn) {
        return Date.now() + expiresIn * 1000;
    }
    return null;
}

function isTokenExpired(
    storedToken: string | null,
    storedPayload: JwtPayload | null,
    storedExpiresAt: number | null
) {
    const invalidToken = Boolean(storedToken) && !storedPayload;
    if (invalidToken) {
        return true;
    }
    if (storedPayload?.exp) {
        return isJwtExpired(storedPayload.exp);
    }
    if (storedExpiresAt) {
        return Date.now() >= storedExpiresAt;
    }
    return true;
}

function resolvePageShowRevalidation(event: PageTransitionEvent) {
    if (event.persisted) return true;
    const navigationEntries = globalThis.performance?.getEntriesByType('navigation') as PerformanceNavigationTiming[] | undefined;
    return navigationEntries?.[0]?.type === 'back_forward';
}

export function AuthProvider({ children }: AuthProviderProps) {
    const initialToken = getStoredToken();
    const initialPayload = initialToken ? decodeJwtPayload(initialToken) : null;
    const initialExpiresAt = getStoredExpiresAt() ?? computeExpiresAt(initialPayload);
    const manualLogoutActive = hasManualLogoutFlag();

    const [devAuthActive, setDevAuthActive] = useState(() => (
        devAuthBypassEnabled ? resolveDevAuthActive() : false
    ));
    const [devRole, setDevRole] = useState<DevRole | null>(() => (
        devAuthBypassEnabled ? resolveDevRole() : null
    ));
    const devProfile = useMemo(
        () => (devAuthActive && devRole ? getDevProfile(devRole) : null),
        [devAuthActive, devRole]
    );

    const [accessToken, setAccessToken] = useState<string | null>(manualLogoutActive ? null : initialToken);
    const [roles, setRoles] = useState<string[]>(manualLogoutActive ? [] : (initialPayload?.roles ?? []));
    const [userId, setUserId] = useState<string | null>(manualLogoutActive ? null : (initialPayload?.sub ?? null));
    const [expiresAt, setExpiresAt] = useState<number | null>(manualLogoutActive ? null : initialExpiresAt);
    const [authStatus, setAuthStatus] = useState<AuthStatus>(devAuthActive ? 'authenticated' : (manualLogoutActive ? 'anonymous' : 'checking'));
    const [sessionVerified, setSessionVerified] = useState<boolean>(devAuthActive);
    const [isAuthLoading, setIsAuthLoading] = useState<boolean>(!manualLogoutActive && !devAuthActive);
    const [profile, setProfile] = useState<AuthMeResponse | null>(devAuthActive ? devProfile : null);
    const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(devAuthActive ? 'success' : 'idle');
    const [profileErrorStatus, setProfileErrorStatus] = useState<number | null>(null);

    const verificationPromiseRef = useRef<Promise<boolean> | null>(null);

    const updateDevAuthActive = useCallback((active: boolean) => {
        if (!devAuthBypassEnabled) return;
        setDevAuthActive(active);
        if (active) {
            persistDevAuthActive(true);
        } else {
            clearDevAuthActive();
        }
    }, []);

    const updateDevRole = useCallback((role: DevRole) => {
        if (!devAuthBypassEnabled) return;
        setDevRole(role);
        persistDevRole(role);
    }, []);

    const applyAnonymousState = useCallback((reason?: LogoutReason) => {
        setAccessToken(null);
        setRoles([]);
        setUserId(null);
        setExpiresAt(null);
        setProfile(null);
        setProfileStatus('idle');
        setProfileErrorStatus(reason === 'expired' ? 401 : null);
        setAuthStatus('anonymous');
        setSessionVerified(false);
        setIsAuthLoading(false);
        verificationPromiseRef.current = null;
        clearAuthClientState();

        if (reason === 'manual') {
            markManualLogoutFlag();
        } else {
            clearManualLogoutFlag();
        }

        if (reason === 'expired') {
            setAuthNotice('expired');
        } else {
            clearAuthNotice();
        }
    }, []);

    const setSession = useCallback((token: string, expiresIn?: number) => {
        const payload = decodeJwtPayload(token);
        const nextExpiresAt = computeExpiresAt(payload, expiresIn);
        setAccessToken(token);
        setRoles(payload?.roles ?? []);
        setUserId(payload?.sub ?? null);
        setExpiresAt(nextExpiresAt);
        setProfile(null);
        setAuthStatus('checking');
        setSessionVerified(false);
        setIsAuthLoading(true);
        setProfileStatus('loading');
        setProfileErrorStatus(null);
        setStoredToken(token);
        setStoredExpiresAt(nextExpiresAt);
        clearManualLogoutFlag();
        clearAuthNotice();
    }, []);

    const refreshSession = useCallback(async (options?: { silent?: boolean }) => {
        if (devAuthActive) {
            setAuthStatus('authenticated');
            setSessionVerified(true);
            setIsAuthLoading(false);
            return true;
        }

        if (hasManualLogoutFlag()) {
            applyAnonymousState('manual');
            return false;
        }

        if (!options?.silent) {
            setIsAuthLoading(true);
        }

        try {
            const response = await refreshAccessToken();
            if ('error' in response) {
                applyAnonymousState('expired');
                return false;
            }

            setSession(response.access_token, response.expires_in);
            return true;
        } catch {
            applyAnonymousState('expired');
            return false;
        } finally {
            if (!options?.silent && hasManualLogoutFlag()) {
                setIsAuthLoading(false);
            }
        }
    }, [applyAnonymousState, devAuthActive, setSession]);

    const verifySession = useCallback(async (options?: { silent?: boolean; allowRefresh?: boolean }): Promise<boolean> => {
        if (verificationPromiseRef.current) {
            return verificationPromiseRef.current;
        }

        const verificationTask: Promise<boolean> = (async (): Promise<boolean> => {
            if (devAuthActive) {
                if (devProfile) {
                    setProfile(devProfile);
                    setProfileStatus('success');
                    setProfileErrorStatus(null);
                }
                setAuthStatus('authenticated');
                setSessionVerified(true);
                setIsAuthLoading(false);
                return true;
            }

            if (hasManualLogoutFlag()) {
                applyAnonymousState('manual');
                return false;
            }

            const allowRefresh = options?.allowRefresh ?? true;
            if (!options?.silent) {
                setIsAuthLoading(true);
            }

            setAuthStatus('checking');
            setSessionVerified(false);
            setProfileStatus('loading');
            setProfileErrorStatus(null);

            const currentToken = getStoredToken();
            const currentPayload = currentToken ? decodeJwtPayload(currentToken) : null;
            const currentExpiresAt = getStoredExpiresAt() ?? computeExpiresAt(currentPayload);

            if (!currentToken || isTokenExpired(currentToken, currentPayload, currentExpiresAt)) {
                clearAuthClientState();
                if (!allowRefresh) {
                    applyAnonymousState(currentToken ? 'expired' : undefined);
                    return false;
                }

                const refreshed = await refreshSession({ silent: true });
                if (!refreshed) {
                    return false;
                }
            }

            const meResponse = await getAuthMe();
            if (!('error' in meResponse)) {
                setProfile(meResponse);
                setProfileStatus('success');
                setProfileErrorStatus(null);
                if (Array.isArray(meResponse.roles) && meResponse.roles.length > 0) {
                    setRoles(meResponse.roles);
                }
                if (typeof meResponse.id === 'string' && meResponse.id.trim().length > 0) {
                    setUserId(meResponse.id.trim());
                }
                setAuthStatus('authenticated');
                setSessionVerified(true);
                setIsAuthLoading(false);
                clearManualLogoutFlag();
                return true;
            }

            if ((meResponse.status === 401 || meResponse.status === 403) && allowRefresh) {
                const refreshed = await refreshSession({ silent: true });
                if (refreshed) {
                    return verifySession({ silent: true, allowRefresh: false });
                }
            }

            setProfile(null);
            setProfileStatus('error');
            setProfileErrorStatus(meResponse.status);
            applyAnonymousState(meResponse.status === 401 || meResponse.status === 403 ? 'expired' : undefined);
            return false;
        })();

        verificationPromiseRef.current = verificationTask;
        try {
            return await verificationTask;
        } finally {
            verificationPromiseRef.current = null;
        }
    }, [applyAnonymousState, devAuthActive, devProfile, refreshSession]);

    const reloadProfile = useCallback(async () => {
        await verifySession({ silent: true, allowRefresh: true });
    }, [verifySession]);

    const devLogout = useCallback(() => {
        if (!devAuthBypassEnabled) return;
        updateDevAuthActive(false);
        clearManualLogoutFlag();
        clearAuthNotice();
        clearAuthClientState();
        setProfile(null);
        setProfileStatus('idle');
        setProfileErrorStatus(null);
        setAuthStatus('anonymous');
        setSessionVerified(false);
        setIsAuthLoading(false);
    }, [updateDevAuthActive]);

    const logout = useCallback((reason: LogoutReason = 'manual') => {
        if (reason === 'manual' && !devAuthActive) {
            markManualLogoutFlag();
            void requestLogout().catch(() => undefined);
        }
        applyAnonymousState(reason);
    }, [applyAnonymousState, devAuthActive]);

    useEffect(() => {
        if (devAuthActive) {
            if (devProfile) {
                setProfile(devProfile);
                setProfileStatus('success');
                setProfileErrorStatus(null);
            }
            setAuthStatus('authenticated');
            setSessionVerified(true);
            setIsAuthLoading(false);
            return;
        }

        void verifySession({ allowRefresh: true }).catch(() => false);
    }, [devAuthActive, devProfile, verifySession]);

    useEffect(() => {
        if (devAuthActive) return undefined;

        const handlePageShow = (event: PageTransitionEvent) => {
            if (!resolvePageShowRevalidation(event)) return;
            void verifySession({
                silent: true,
                allowRefresh: !hasManualLogoutFlag()
            }).catch(() => false);
        };

        globalThis.addEventListener('pageshow', handlePageShow);
        return () => {
            globalThis.removeEventListener('pageshow', handlePageShow);
        };
    }, [devAuthActive, verifySession]);

    useEffect(() => {
        if (devAuthActive) return undefined;

        return onAuthRefresh((detail) => {
            setSession(detail.accessToken, detail.expiresIn);
            void verifySession({ silent: true, allowRefresh: false }).catch(() => false);
        });
    }, [setSession, verifySession, devAuthActive]);

    useEffect(() => {
        if (devAuthActive) return;
        if (!expiresAt || authStatus !== 'authenticated' || hasManualLogoutFlag()) return;

        const timeLeft = expiresAt - Date.now();
        if (timeLeft <= 0) {
            void refreshSession({ silent: true }).catch(() => false);
            return;
        }

        const timeoutId = globalThis.setTimeout(() => {
            void refreshSession({ silent: true }).catch(() => false);
        }, timeLeft);

        return () => globalThis.clearTimeout(timeoutId);
    }, [authStatus, expiresAt, refreshSession, devAuthActive]);

    const effectiveRoles = devAuthActive && devProfile?.roles ? devProfile.roles : roles;
    const isAuthenticated = devAuthActive ? true : authStatus === 'authenticated' && sessionVerified;
    const primaryRole = getPrimaryRole(effectiveRoles);
    const effectiveProfile = devAuthActive ? devProfile : profile;
    const devBypassLabel = devAuthActive && devRole ? getDevRoleLabel(devRole) : null;

    const value = useMemo<AuthContextValue>(() => ({
        accessToken,
        roles: effectiveRoles,
        userId,
        expiresAt,
        authStatus,
        sessionVerified,
        isAuthenticated,
        isAuthLoading,
        primaryRole,
        profile: effectiveProfile,
        profileStatus,
        profileErrorStatus,
        devBypassEnabled: devAuthBypassEnabled,
        devAuthActive,
        devBypassLabel,
        devRole,
        setDevAuthActive: updateDevAuthActive,
        setDevRole: updateDevRole,
        setSession,
        logout,
        devLogout,
        refreshSession,
        verifySession,
        reloadProfile
    }), [
        accessToken,
        effectiveRoles,
        userId,
        expiresAt,
        authStatus,
        sessionVerified,
        isAuthenticated,
        isAuthLoading,
        primaryRole,
        effectiveProfile,
        profileStatus,
        profileErrorStatus,
        devAuthActive,
        devBypassLabel,
        devRole,
        updateDevAuthActive,
        updateDevRole,
        setSession,
        logout,
        devLogout,
        refreshSession,
        verifySession,
        reloadProfile
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
