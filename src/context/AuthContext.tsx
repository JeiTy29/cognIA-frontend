import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { decodeJwtPayload, type JwtPayload } from '../utils/auth/jwt';
import { getPrimaryRole } from '../utils/auth/roles';
import { refreshAccessToken } from '../services/auth/auth.refresh';
import { getAuthMe, logout as requestLogout } from '../services/auth/auth.api';
import type { AuthMeErrorResponse, AuthMeResponse } from '../services/auth/auth.types';
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
import { getCsrfToken } from '../utils/auth/csrf';

type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

type AuthProviderProps = Readonly<{
    children: ReactNode;
}>;

const SESSION_TIMEOUT_MS = 10000;
const REFRESH_SKEW_MS = 60_000;

function debugAuth(label: string, payload?: unknown) {
    if (!import.meta.env.DEV) return;
    if (payload === undefined) {
        console.debug(`[auth] ${label}`);
        return;
    }
    console.debug(`[auth] ${label}`, payload);
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

function resolvePageShowRevalidation(event: PageTransitionEvent) {
    if (event.persisted) return true;
    const navigationEntries = globalThis.performance?.getEntriesByType('navigation') as PerformanceNavigationTiming[] | undefined;
    return navigationEntries?.[0]?.type === 'back_forward';
}

function isUnauthorizedMeResponse(response: AuthMeResponse | AuthMeErrorResponse) {
    return 'error' in response && (response.status === 401 || response.status === 403);
}

function timeoutPromise<T>(promise: Promise<T>, timeoutMs: number) {
    return new Promise<T>((resolve, reject) => {
        const timeoutId = globalThis.setTimeout(() => {
            reject(new Error('auth_timeout'));
        }, timeoutMs);

        promise.then(
            (value) => {
                globalThis.clearTimeout(timeoutId);
                resolve(value);
            },
            (error) => {
                globalThis.clearTimeout(timeoutId);
                reject(error);
            }
        );
    });
}

function isPublicAuthRoute(pathname: string) {
    return (
        pathname === '/' ||
        pathname === '/inicio-sesion' ||
        pathname === '/registro' ||
        pathname === '/bienvenida' ||
        pathname === '/mfa' ||
        pathname === '/restablecer-contrasena' ||
        pathname.startsWith('/cuestionario/compartido/') ||
        pathname === '/nuestro-sistema' ||
        pathname === '/sobre-nosotros' ||
        pathname === '/trastornos'
    );
}

export function AuthProvider({ children }: AuthProviderProps) {
    const location = useLocation();
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
    const [isSessionRefreshing, setIsSessionRefreshing] = useState(false);
    const [profile, setProfile] = useState<AuthMeResponse | null>(devAuthActive ? devProfile : null);
    const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(devAuthActive ? 'success' : 'idle');
    const [profileErrorStatus, setProfileErrorStatus] = useState<number | null>(null);

    const verificationPromiseRef = useRef<Promise<boolean> | null>(null);
    const authEpochRef = useRef(0);
    const isMountedRef = useRef(true);
    const authSnapshotRef = useRef({
        authStatus,
        sessionVerified,
        profileStatus
    });

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
        authEpochRef.current += 1;
        debugAuth('applyAnonymousState', { reason, epoch: authEpochRef.current });
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
        setIsSessionRefreshing(false);
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
        authEpochRef.current += 1;
        debugAuth('setSession', { expiresIn, epoch: authEpochRef.current });
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
        setIsSessionRefreshing(false);
        setProfileStatus('loading');
        setProfileErrorStatus(null);
        setStoredToken(token);
        setStoredExpiresAt(nextExpiresAt);
        clearManualLogoutFlag();
        clearAuthNotice();
    }, []);

    const applyRefreshedToken = useCallback((token: string, expiresIn?: number) => {
        const payload = decodeJwtPayload(token);
        const nextExpiresAt = computeExpiresAt(payload, expiresIn);
        debugAuth('token:apply-refreshed', { expiresIn, expiresAt: nextExpiresAt });
        setAccessToken(token);
        setExpiresAt(nextExpiresAt);
        if (Array.isArray(payload?.roles) && payload.roles.length > 0) {
            setRoles(payload.roles);
        }
        if (typeof payload?.sub === 'string' && payload.sub.trim().length > 0) {
            setUserId(payload.sub.trim());
        }
        setStoredToken(token);
        setStoredExpiresAt(nextExpiresAt);
        clearManualLogoutFlag();
        clearAuthNotice();
        setAuthStatus('authenticated');
        setSessionVerified(true);
        setIsAuthLoading(false);
        setIsSessionRefreshing(false);
        setProfileStatus((current) => (current === 'success' ? 'success' : current));
    }, []);

    const applyAuthenticatedProfile = useCallback((meResponse: AuthMeResponse, startedEpoch: number) => {
        if (hasManualLogoutFlag()) {
            applyAnonymousState('manual');
            return false;
        }
        if (authEpochRef.current !== startedEpoch || !isMountedRef.current) {
            return false;
        }

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
        setIsSessionRefreshing(false);
        clearManualLogoutFlag();
        return true;
    }, [applyAnonymousState]);

    const refreshSession = useCallback(async (options?: { silent?: boolean }) => {
        debugAuth('refreshSession:start', { options });
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

        const startedEpoch = authEpochRef.current;
        const snapshot = authSnapshotRef.current;
        const preserveAuthenticatedSession =
            snapshot.authStatus === 'authenticated' &&
            snapshot.sessionVerified;

        if (!options?.silent && !preserveAuthenticatedSession) {
            setIsAuthLoading(true);
        }
        if (preserveAuthenticatedSession) {
            setIsSessionRefreshing(true);
        }

        try {
            const response = await timeoutPromise(refreshAccessToken(), SESSION_TIMEOUT_MS);
            debugAuth('refreshSession:response', response);
            if (hasManualLogoutFlag()) {
                applyAnonymousState('manual');
                return false;
            }
            if (authEpochRef.current !== startedEpoch || !isMountedRef.current) {
                return false;
            }
            if ('error' in response) {
                applyAnonymousState('expired');
                return false;
            }

            if (preserveAuthenticatedSession) {
                applyRefreshedToken(response.access_token, response.expires_in);
                return true;
            }

            setSession(response.access_token, response.expires_in);
            return true;
        } catch {
            debugAuth('refreshSession:error');
            if (hasManualLogoutFlag()) {
                applyAnonymousState('manual');
                return false;
            }
            applyAnonymousState('expired');
            return false;
        } finally {
            setIsSessionRefreshing(false);
            if (!options?.silent && hasManualLogoutFlag()) {
                setIsAuthLoading(false);
            }
        }
    }, [applyAnonymousState, applyRefreshedToken, devAuthActive, setSession]);

    const verifySession = useCallback(async (options?: { silent?: boolean; allowRefresh?: boolean; force?: boolean }): Promise<boolean> => {
        if (verificationPromiseRef.current) {
            debugAuth('verifySession:reuse-promise', options);
            return verificationPromiseRef.current;
        }

        const verificationTask: Promise<boolean> = (async () => {
            try {
                const snapshot = authSnapshotRef.current;
                debugAuth('verifySession:start', {
                    options,
                    authStatus: snapshot.authStatus,
                    sessionVerified: snapshot.sessionVerified,
                    profileStatus: snapshot.profileStatus,
                    epoch: authEpochRef.current,
                    manualLogout: hasManualLogoutFlag()
                });

            if (
                !options?.force &&
                snapshot.authStatus === 'authenticated' &&
                snapshot.sessionVerified &&
                snapshot.profileStatus === 'success' &&
                !hasManualLogoutFlag()
            ) {
                debugAuth('verifySession:already-authenticated');
                return true;
            }

            if (devAuthActive) {
                if (devProfile) {
                    setProfile(devProfile);
                    setProfileStatus('success');
                    setProfileErrorStatus(null);
                }
                setAuthStatus('authenticated');
                setSessionVerified(true);
                setIsAuthLoading(false);
                setIsSessionRefreshing(false);
                return true;
            }

            if (hasManualLogoutFlag()) {
                applyAnonymousState('manual');
                return false;
            }

            let startedEpoch = authEpochRef.current;
            const allowRefresh = options?.allowRefresh ?? true;
            if (!options?.silent) {
                setIsAuthLoading(true);
            }

            setAuthStatus('checking');
            setSessionVerified(false);
            setProfileStatus('loading');
            setProfileErrorStatus(null);

            debugAuth('verifySession:me:first');
            let meResponse = await timeoutPromise(getAuthMe(), SESSION_TIMEOUT_MS);
            debugAuth('verifySession:me:first', meResponse);
            if (hasManualLogoutFlag()) {
                applyAnonymousState('manual');
                return false;
            }
            if (authEpochRef.current !== startedEpoch || !isMountedRef.current) {
                return false;
            }

            if ('error' in meResponse) {
                debugAuth('verifySession:me:error-state', {
                    allowRefresh,
                    manualLogout: hasManualLogoutFlag(),
                    csrfToken: getCsrfToken(),
                    isUnauthorized: isUnauthorizedMeResponse(meResponse),
                    status: meResponse.status
                });
                if (isUnauthorizedMeResponse(meResponse) && allowRefresh) {
                    debugAuth('verifySession:refresh-after-401:start', {
                        allowRefresh,
                        manualLogout: hasManualLogoutFlag()
                    });
                    const refreshed = await refreshSession({ silent: true });
                    if (!refreshed) {
                        debugAuth('verifySession:refresh-after-401:failed', meResponse);
                        applyAnonymousState('expired');
                        return false;
                    }

                    startedEpoch = authEpochRef.current;
                    meResponse = await timeoutPromise(getAuthMe(), SESSION_TIMEOUT_MS);
                    debugAuth('verifySession:me:after-refresh', meResponse);
                    if (hasManualLogoutFlag()) {
                        applyAnonymousState('manual');
                        return false;
                    }
                    if (authEpochRef.current !== startedEpoch || !isMountedRef.current) {
                        return false;
                    }
                }
            }

            if (!('error' in meResponse)) {
                debugAuth('verifySession:me:ok', meResponse);
                const authenticated = applyAuthenticatedProfile(meResponse, startedEpoch);
                if (authenticated) {
                    debugAuth('verifySession:authenticated', {
                        roles: meResponse.roles,
                        userId: meResponse.id,
                        epoch: startedEpoch
                    });
                }
                return authenticated;
            }

            debugAuth('verifySession:error', meResponse);
            setProfile(null);
            setProfileStatus('error');
            setProfileErrorStatus(meResponse.status);
            applyAnonymousState(meResponse.status === 401 || meResponse.status === 403 ? 'expired' : undefined);
                return false;
            } catch (error) {
                debugAuth('verifySession:unhandled-error', error);
                if (hasManualLogoutFlag()) {
                    applyAnonymousState('manual');
                    return false;
                }

                setProfile(null);
                setProfileStatus('error');
                setProfileErrorStatus(error instanceof Error && error.message === 'auth_timeout' ? 408 : 500);
                applyAnonymousState('expired');
                return false;
            }
        })();

        verificationPromiseRef.current = verificationTask;
        try {
            return await verificationTask;
        } finally {
            verificationPromiseRef.current = null;
        }
    }, [applyAnonymousState, applyAuthenticatedProfile, devAuthActive, devProfile, refreshSession]);

    const reloadProfile = useCallback(async () => {
        await verifySession({ silent: true, allowRefresh: true });
    }, [verifySession]);

    const devLogout = useCallback(() => {
        if (!devAuthBypassEnabled) return;
        authEpochRef.current += 1;
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
        setIsSessionRefreshing(false);
    }, [updateDevAuthActive]);

    const logoutAsync = useCallback(async (reason: LogoutReason = 'manual') => {
        authEpochRef.current += 1;
        debugAuth('logout:start', { reason, epoch: authEpochRef.current });
        const accessTokenSnapshot = getStoredToken() ?? accessToken;

        if (reason === 'manual') {
            markManualLogoutFlag();
        }

        applyAnonymousState(reason);

        if (reason !== 'manual' || devAuthActive) {
            return;
        }

        try {
            const response = await requestLogout(accessTokenSnapshot ?? undefined);
            debugAuth('logout:request:status', response);
        } catch (error) {
            if (import.meta.env.DEV) {
                const status = error instanceof Error && 'status' in error
                    ? (error as { status?: number }).status
                    : undefined;
                const payload = error instanceof Error && 'payload' in error
                    ? (error as { payload?: unknown }).payload
                    : undefined;
                console.debug('[auth] logout:request:error', { status, payload });
                console.warn('No fue posible completar /api/auth/logout en frontend.', { status, payload });
            }
        }
    }, [accessToken, applyAnonymousState, devAuthActive]);

    const logout = useCallback((reason: LogoutReason = 'manual') => {
        void logoutAsync(reason);
    }, [logoutAsync]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        authSnapshotRef.current = {
            authStatus,
            sessionVerified,
            profileStatus
        };
    }, [authStatus, profileStatus, sessionVerified]);

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
            setIsSessionRefreshing(false);
            return;
        }

        const isPublicRoute = isPublicAuthRoute(location.pathname);
        if (isPublicRoute) {
            debugAuth('bootstrap:skip-public-route', { pathname: location.pathname });
            setIsAuthLoading(false);
            if (authStatus === 'checking' && !accessToken && !hasManualLogoutFlag()) {
                setAuthStatus('anonymous');
                setSessionVerified(false);
            }
            return;
        }

        const alreadyVerified =
            authStatus === 'authenticated' &&
            sessionVerified &&
            profileStatus === 'success';

        if (alreadyVerified) {
            return;
        }

        debugAuth('bootstrap:verify-protected-context', { pathname: location.pathname });
        void verifySession({ allowRefresh: true }).catch(() => false);
    }, [accessToken, authStatus, devAuthActive, devProfile, location.pathname, profileStatus, sessionVerified, verifySession]);

    useEffect(() => {
        if (devAuthActive) return undefined;

        const handlePageShow = (event: PageTransitionEvent) => {
            if (!resolvePageShowRevalidation(event)) return;
            if (isPublicAuthRoute(location.pathname)) {
                debugAuth('bootstrap:skip-public-route', { pathname: location.pathname });
                return;
            }
            void verifySession({
                silent: true,
                allowRefresh: !hasManualLogoutFlag()
            }).catch(() => false);
        };

        globalThis.addEventListener('pageshow', handlePageShow);
        return () => {
            globalThis.removeEventListener('pageshow', handlePageShow);
        };
    }, [devAuthActive, location.pathname, verifySession]);

    useEffect(() => {
        if (devAuthActive) return undefined;

        return onAuthRefresh((detail) => {
            if (hasManualLogoutFlag()) return;
            const startedEpoch = authEpochRef.current;
            if (!isMountedRef.current || authEpochRef.current !== startedEpoch) return;
            debugAuth('onAuthRefresh', { expiresIn: detail.expiresIn, epoch: startedEpoch });
            applyRefreshedToken(detail.accessToken, detail.expiresIn);
        });
    }, [applyRefreshedToken, devAuthActive]);

    useEffect(() => {
        if (devAuthActive) return;
        if (!expiresAt || authStatus !== 'authenticated' || !sessionVerified || hasManualLogoutFlag()) return;
        if (isSessionRefreshing) return;

        const timeUntilRefresh = expiresAt - Date.now() - REFRESH_SKEW_MS;
        debugAuth('refresh:schedule', { expiresAt, timeUntilRefresh });

        if (timeUntilRefresh <= 0) {
            debugAuth('refresh:proactive:start');
            void refreshSession({ silent: true })
                .then((ok) => {
                    debugAuth(ok ? 'refresh:proactive:ok' : 'refresh:proactive:failed');
                })
                .catch(() => {
                    debugAuth('refresh:proactive:failed');
                });
            return;
        }

        const timeoutId = globalThis.setTimeout(() => {
            debugAuth('refresh:proactive:start');
            void refreshSession({ silent: true })
                .then((ok) => {
                    debugAuth(ok ? 'refresh:proactive:ok' : 'refresh:proactive:failed');
                })
                .catch(() => {
                    debugAuth('refresh:proactive:failed');
                });
        }, timeUntilRefresh);

        return () => globalThis.clearTimeout(timeoutId);
    }, [authStatus, devAuthActive, expiresAt, isSessionRefreshing, refreshSession, sessionVerified]);

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
        isSessionRefreshing,
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
        logoutAsync,
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
        isSessionRefreshing,
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
        logoutAsync,
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
