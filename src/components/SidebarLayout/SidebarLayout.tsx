import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import type { Role } from '../Sidebar/SidebarConfig';
import './SidebarLayout.css';
import { useAuth } from '../../hooks/auth/useAuth';
import { NotificationsBell } from '../Notifications/NotificationsBell';
import '../Notifications/NotificationsBell.css';

function resolveLayoutRole(primaryRole: string | null, pathname: string): Role {
    if (primaryRole === 'admin') return 'admin';
    if (primaryRole === 'psicologo') return 'psicologo';
    if (primaryRole === 'padre') return 'padre';
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/psicologo')) return 'psicologo';
    return 'padre';
}

function getRoleLabel(role: Role) {
    if (role === 'admin') return 'Administrador';
    if (role === 'psicologo') return 'Psicólogo';
    return 'Padre/Tutor';
}

export default function SidebarLayout() {
    const location = useLocation();
    const { primaryRole } = useAuth();
    const role = resolveLayoutRole(primaryRole, location.pathname);
    return (
        <div className="app-shell">
            <Sidebar role={role} />
            <div className="app-main">
                <div className="app-topbar">
                    <div className="app-current-role" aria-label={`Rol actual: ${getRoleLabel(role)}`}>
                        {getRoleLabel(role)}
                    </div>
                    <div className="app-topbar__actions">
                        <NotificationsBell />
                    </div>
                </div>
                <div className="app-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
