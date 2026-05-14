import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/auth/useAuth';
import { getDefaultRouteForRoles, getPrimaryRole } from '../../utils/auth/roles';
import { hasManualLogoutFlag } from '../../utils/auth/sessionLifecycle';
import Sidebar from '../Sidebar/Sidebar';
import type { Role } from '../Sidebar/SidebarConfig';
import SupportContact from '../SupportContact/SupportContact';
import './ProtectedRoute.css';

type ProtectedRouteProps = Readonly<{
    allowedRoles?: string[];
    preserveShell?: boolean;
}>;

const roleMap: Record<string, string[]> = {
    PADRE: ['GUARDIAN'],
    GUARDIAN: ['GUARDIAN'],
    PSICOLOGO: ['PSYCHOLOGIST'],
    PSYCHOLOGIST: ['PSYCHOLOGIST'],
    ADMIN: ['ADMIN']
};

const LOADER_TIMEOUT_MS = 9000;

function normalizeRole(value: string) {
    return value.trim().toUpperCase();
}

function hasAnyRole(userRoles: string[] | undefined, allowedRoles: string[] | undefined) {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (allowedRoles.includes('*')) return true;
    if (!userRoles || userRoles.length === 0) return false;

    const normalizedUser = new Set(userRoles.map((role) => normalizeRole(role)));
    return allowedRoles.some((role) => {
        const normalized = normalizeRole(role);
        const mapped = roleMap[normalized] ?? [normalized];
        return mapped.some((candidate) => normalizedUser.has(candidate));
    });
}

function getRoleLabel(roles: string[] | undefined) {
    const primary = getPrimaryRole(roles);
    if (primary === 'admin') return 'Administrador';
    if (primary === 'psicologo') return 'Psicólogo';
    if (primary === 'padre') return 'Padre/Tutor';
    return 'Usuario';
}

function resolveShellRole(primaryRole: string | null, pathname: string): Role {
    if (primaryRole === 'admin') return 'admin';
    if (primaryRole === 'psicologo') return 'psicologo';
    if (primaryRole === 'padre') return 'padre';
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/psicologo')) return 'psicologo';
    return 'padre';
}

type ProtectedRouteLoaderProps = Readonly<{
    onResetSession: () => void;
    preserveShell?: boolean;
    shellRole: Role;
}>;

function ProtectedRouteLoader({ onResetSession, preserveShell = false, shellRole }: ProtectedRouteLoaderProps) {
    const [loaderTimedOut, setLoaderTimedOut] = useState(false);

    useEffect(() => {
        const timeoutId = globalThis.setTimeout(() => {
            setLoaderTimedOut(true);
        }, LOADER_TIMEOUT_MS);

        return () => {
            globalThis.clearTimeout(timeoutId);
        };
    }, []);

    const loaderContent = (
        <div className="auth-guard-content-loading" aria-live="polite">
            <span className="auth-guard-content-loading-dot" aria-hidden="true"></span>
            <p>{loaderTimedOut ? 'No se pudo completar la validación de sesión.' : 'Cargando vista...'}</p>
            {loaderTimedOut ? (
                <button
                    type="button"
                    className="auth-guard-retry"
                    onClick={onResetSession}
                >
                    Volver a iniciar sesión
                </button>
            ) : null}
        </div>
    );

    if (!preserveShell) {
        return loaderContent;
    }

    return (
        <div className="app-shell auth-guard-shell">
            <Sidebar role={shellRole} />
            <div className="app-main">
                <div className="app-content auth-guard-shell-content">
                    {loaderContent}
                </div>
            </div>
        </div>
    );
}

export default function ProtectedRoute({ allowedRoles, preserveShell = false }: ProtectedRouteProps) {
    const {
        authStatus,
        sessionVerified,
        roles,
        isAuthLoading,
        isSessionRefreshing,
        profileStatus,
        verifySession,
        logoutAsync,
        primaryRole
    } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const shellRole = resolveShellRole(primaryRole, location.pathname);

    useEffect(() => {
        const alreadyVerified =
            authStatus === 'authenticated' &&
            sessionVerified &&
            profileStatus === 'success';

        if (alreadyVerified) {
            return;
        }

        const allowRefresh = !hasManualLogoutFlag();
        void verifySession({ silent: true, allowRefresh }).catch(() => false);
    }, [authStatus, location.key, profileStatus, sessionVerified, verifySession]);

    const shouldShowLoader =
        (isAuthLoading || authStatus === 'checking') &&
        !(authStatus === 'authenticated' && sessionVerified && isSessionRefreshing);

    if (shouldShowLoader) {
        return (
            <ProtectedRouteLoader
                key={location.key}
                preserveShell={preserveShell}
                shellRole={shellRole}
                onResetSession={() => {
                    void logoutAsync('manual').finally(() => {
                        navigate('/inicio-sesion', { replace: true });
                    });
                }}
            />
        );
    }

    if (authStatus !== 'authenticated' || !sessionVerified) {
        const nextState = hasManualLogoutFlag()
            ? { message: 'Debes iniciar sesión para acceder a esta sección.' }
            : { message: 'Debes iniciar sesión para acceder a esta sección.', from: location.pathname };

        return <Navigate to="/inicio-sesion" replace state={nextState} />;
    }

    const isAllowed = hasAnyRole(roles, allowedRoles);
    if (!isAllowed) {
        const destination = getDefaultRouteForRoles(roles) || '/';
        const roleLabel = getRoleLabel(roles);
        return (
            <div className="no-auth">
                <div className="no-auth-content">
                    <h1>Acceso denegado</h1>
                    <p className="no-auth-main">
                        No tienes los permisos necesarios para acceder a esta sección.
                    </p>
                    <p className="no-auth-sub">
                        Parece que intentaste acceder a una sección que no corresponde a tu rol. Serás redirigido a la vista
                        principal de tu rol. Si crees que esto es un error, contacta soporte.
                    </p>
                    <button
                        type="button"
                        className="no-auth-primary"
                        onClick={() => navigate(destination)}
                    >
                        Ir a mi área
                    </button>
                </div>
                <div className="no-auth-support">
                    <h2>Soporte</h2>
                    <p>
                        Si accediste por error o encontraste una forma de entrar a una vista que no te corresponde,
                        por favor contacta soporte.
                    </p>
                    <SupportContact roleLabel={roleLabel} moduleLabel="Acceso" />
                </div>
            </div>
        );
    }

    return <Outlet />;
}
