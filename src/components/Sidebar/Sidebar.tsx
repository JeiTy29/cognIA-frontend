import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import type { Role } from './SidebarConfig';
import { getItemsForRole } from './SidebarConfig';

interface SidebarProps {
    role: Role;
}

export default function Sidebar({ role }: SidebarProps) {
    const items = getItemsForRole(role);

    return (
        <aside className="sidebar" aria-label="Navegación principal">
            <nav className="sidebar-nav">
                <ul className="sidebar-list">
                    {items.map((item) => (
                        <li key={item.id} className="sidebar-item-wrapper">
                            <NavLink
                                to={item.paths[role]}
                                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                                aria-label={item.label}
                            >
                                <span className="sidebar-icon" aria-hidden="true">
                                    {item.icon}
                                </span>
                                <span className="sidebar-label">{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}
