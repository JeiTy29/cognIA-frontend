import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/auth/useAuth';
import { getDefaultRouteForRoles, hasAllowedRole, type AppRole } from '../../utils/auth/roles';

interface ProtectedRouteProps {
    allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, roles } = useAuth();
    const location = useLocation();

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
