import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/auth/useAuth';
import { getDefaultRouteForRoles, hasAllowedRole, type AppRole } from '../../utils/auth/roles';
import './ProtectedRoute.css';

interface ProtectedRouteProps {
    allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, roles, isAuthLoading, refreshSession, devBypassEnabled } = useAuth();
    const location = useLocation();
    const refreshAttemptedRef = useRef(false);

    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated && !refreshAttemptedRef.current) {
            refreshAttemptedRef.current = true;
            void refreshSession({ silent: true });
        }
    }, [isAuthLoading, isAuthenticated, refreshSession]);

    if (devBypassEnabled) {
        return <Outlet />;
    }

    if (isAuthLoading) {
        return (
            <div className="auth-guard">
                <p>Cargando sesión...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/inicio-sesion"
                replace
                state={{ reason: 'unauthenticated', from: location.pathname }}
            />
        );
    }

    if (!hasAllowedRole(roles, allowedRoles)) {
        return <Navigate to={getDefaultRouteForRoles(roles)} replace />;
    }

    return <Outlet />;
}
