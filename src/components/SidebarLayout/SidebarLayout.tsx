import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import type { Role } from '../Sidebar/SidebarConfig';
import './SidebarLayout.css';
import { useAuth } from '../../hooks/auth/useAuth';

function resolveLayoutRole(primaryRole: string | null, pathname: string): Role {
    if (primaryRole === 'admin') return 'admin';
    if (primaryRole === 'psicologo') return 'psicologo';
    if (primaryRole === 'padre') return 'padre';
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/psicologo')) return 'psicologo';
    return 'padre';
}

function resolveProfileContextLabel({
    roles,
    primaryRole,
    userType
}: {
    roles: string[];
    primaryRole: string | null;
    userType: string | undefined;
}) {
    const normalizedRoles = new Set(roles.map((role) => role.trim().toUpperCase()));
    const normalizedUserType = String(userType ?? '').trim().toLowerCase();

    if (normalizedRoles.has('ADMIN') || primaryRole === 'admin') return 'ADMINISTRADOR';
    if (normalizedRoles.has('PSYCHOLOGIST') || primaryRole === 'psicologo' || normalizedUserType === 'psychologist') {
        return 'PSICÓLOGO';
    }
    if (normalizedRoles.has('GUARDIAN') || primaryRole === 'padre' || normalizedUserType === 'guardian') {
        return 'PADRE/TUTOR';
    }
    return null;
}

export default function SidebarLayout() {
    const location = useLocation();
    const { primaryRole, roles, profile, isAuthenticated } = useAuth();
    const role = resolveLayoutRole(primaryRole, location.pathname);
    const profileContextLabel = isAuthenticated
        ? resolveProfileContextLabel({
            roles,
            primaryRole,
            userType: profile?.user_type
        })
        : null;

    return (
        <div className="app-shell">
            <Sidebar role={role} />
            <div className="app-main">
                <div className="app-content">
                    <Outlet />
                </div>
                {profileContextLabel ? (
                    <div className="profile-context-indicator" aria-hidden="true">
                        <div className="profile-context-indicator__inner">{profileContextLabel}</div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
