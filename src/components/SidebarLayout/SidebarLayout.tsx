import { useEffect, useState } from 'react';
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
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const role = resolveLayoutRole(primaryRole, location.pathname);
    const drawerId = 'app-sidebar-drawer';

    useEffect(() => {
        if (!mobileNavOpen) return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileNavOpen(false);
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => {
            globalThis.removeEventListener('keydown', handleKeyDown);
        };
    }, [mobileNavOpen]);

    return (
        <div className="app-shell">
            <button
                type="button"
                className="app-mobile-menu-btn"
                aria-label="Abrir menú de navegación"
                aria-controls={drawerId}
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen(true)}
            >
                <span className="app-mobile-menu-line" aria-hidden="true" />
                <span className="app-mobile-menu-line" aria-hidden="true" />
                <span className="app-mobile-menu-line" aria-hidden="true" />
            </button>

            {mobileNavOpen ? (
                <button
                    type="button"
                    className="app-mobile-overlay"
                    aria-label="Cerrar menú de navegación"
                    onClick={() => setMobileNavOpen(false)}
                />
            ) : null}

            <Sidebar
                role={role}
                drawerId={drawerId}
                mobileOpen={mobileNavOpen}
                onClose={() => setMobileNavOpen(false)}
            />
            <div className="app-main">
                <div className="app-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
