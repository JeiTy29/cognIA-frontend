import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import type { Role } from '../Sidebar/SidebarConfig';
import { getDefaultPath, getItemsForRole } from '../Sidebar/SidebarConfig';
import './SidebarLayout.css';

const ROLE_STORAGE_KEY = 'cogniaRole';

export default function SidebarLayout() {
    const [role, setRole] = useState<Role>(() => {
        const stored = localStorage.getItem(ROLE_STORAGE_KEY);
        return stored === 'psicologo' ? 'psicologo' : 'padre';
    });
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        localStorage.setItem(ROLE_STORAGE_KEY, role);
    }, [role]);

    const handleRoleChange = (nextRole: Role) => {
        if (nextRole === role) return;
        setRole(nextRole);

        const items = getItemsForRole(nextRole);
        const currentSegment = location.pathname.split('/')[2];
        const available = items.find((item) => item.paths[nextRole].includes(`/${currentSegment}`));
        const target = available ? available.paths[nextRole] : getDefaultPath(nextRole);
        navigate(target, { replace: true });
    };

    return (
        <div className="app-shell">
            <Sidebar role={role} />
            <div className="app-main">
                <div className="role-toggle" aria-label="Selector temporal de rol">
                    <button
                        type="button"
                        className={`role-toggle-btn ${role === 'padre' ? 'active' : ''}`}
                        onClick={() => handleRoleChange('padre')}
                    >
                        Padre/Tutor
                    </button>
                    <button
                        type="button"
                        className={`role-toggle-btn ${role === 'psicologo' ? 'active' : ''}`}
                        onClick={() => handleRoleChange('psicologo')}
                    >
                        Psicólogo
                    </button>
                </div>
                <div className="app-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
