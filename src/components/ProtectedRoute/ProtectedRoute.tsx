import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/auth/useAuth';
import { getDefaultRouteForRoles, getPrimaryRole } from '../../utils/auth/roles';
import './ProtectedRoute.css';
import SupportContact from '../SupportContact/SupportContact';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

const roleMap: Record<string, string[]> = {
    PADRE: ['GUARDIAN'],
    GUARDIAN: ['GUARDIAN'],
    PSICOLOGO: ['PSYCHOLOGIST'],
    PSYCHOLOGIST: ['PSYCHOLOGIST'],
    ADMIN: ['ADMIN']
};

function normalizeRole(value: string) {
    return value.trim().toUpperCase();
}

function hasAnyRole(userRoles: string[] | undefined, allowedRoles: string[] | undefined) {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (allowedRoles.includes('*')) return true;
    if (!userRoles || userRoles.length === 0) return false;
    const normalizedUser = userRoles.map((role) => normalizeRole(role));
    return allowedRoles.some((role) => {
        const normalized = normalizeRole(role);
        const mapped = roleMap[normalized] ?? [normalized];
        return mapped.some((candidate) => normalizedUser.includes(candidate));
    });
}

function getRoleLabel(roles: string[] | undefined) {
    const primary = getPrimaryRole(roles);
    if (primary === 'admin') return 'Administrador';
    if (primary === 'psicologo') return 'Psicólogo';
    if (primary === 'padre') return 'Padre/Tutor';
    return 'Usuario';
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, roles, isAuthLoading, refreshSession, profileStatus } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const refreshAttemptedRef = useRef(false);

    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated && !refreshAttemptedRef.current) {
            refreshAttemptedRef.current = true;
            refreshSession({ silent: true }).catch(() => false);
        }
    }, [isAuthLoading, isAuthenticated, refreshSession]);

    const shouldShowLoader = isAuthLoading || (isAuthenticated && profileStatus === 'loading');
    const isRoleGuard = Array.isArray(allowedRoles) && allowedRoles.length > 0;

    if (shouldShowLoader) {
        if (isAuthenticated && !isRoleGuard) {
            return <Outlet />;
        }

        if (isAuthenticated && isRoleGuard) {
            return (
                <div className="auth-guard-content-loading" aria-live="polite">
                    <span className="auth-guard-content-loading-dot" aria-hidden="true"></span>
                    <p>Cargando vista...</p>
                </div>
            );
        }

        return null;
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/inicio-sesion"
                replace
                state={{ message: 'Debes iniciar sesión para acceder a esta sección.', from: location.pathname }}
            />
        );
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
