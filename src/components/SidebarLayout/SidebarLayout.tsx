import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import type { Role } from '../Sidebar/SidebarConfig';
import './SidebarLayout.css';

export default function SidebarLayout() {
    const location = useLocation();

    const role: Role = location.pathname.startsWith('/psicologo') ? 'psicologo' : 'padre';

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
