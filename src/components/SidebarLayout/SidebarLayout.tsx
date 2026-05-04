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

export default function SidebarLayout() {
    const location = useLocation();
    const { primaryRole } = useAuth();

    const role = resolveLayoutRole(primaryRole, location.pathname);

    return (
        <div className="app-shell">
            <Sidebar role={role} />
            <div className="app-main">
                <div className="app-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
