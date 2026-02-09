import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import type { Role } from '../Sidebar/SidebarConfig';
import './SidebarLayout.css';
import { useAuth } from '../../hooks/auth/useAuth';

export default function SidebarLayout() {
    const location = useLocation();
    const { primaryRole } = useAuth();

    const role: Role = primaryRole === 'admin'
        ? 'admin'
        : primaryRole === 'psicologo'
            ? 'psicologo'
            : primaryRole === 'padre'
                ? 'padre'
                : location.pathname.startsWith('/admin')
                    ? 'admin'
                    : location.pathname.startsWith('/psicologo')
                        ? 'psicologo'
                        : 'padre';

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
