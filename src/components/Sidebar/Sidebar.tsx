import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';
import type { Role } from './SidebarConfig';
import { getItemsForRole } from './SidebarConfig';
import { useEffect, useRef, useState } from 'react';

interface SidebarProps {
    role: Role;
}

export default function Sidebar({ role }: SidebarProps) {
    const items = getItemsForRole(role);
    const location = useLocation();
    const listRef = useRef<HTMLUListElement | null>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 });
    const [activeStyle, setActiveStyle] = useState({ top: 0, height: 0 });

    useEffect(() => {
        const list = listRef.current;
        if (!list) return;

        const activeItem = list.querySelector<HTMLAnchorElement>('.sidebar-item.active');
        if (!activeItem) return;

        const listRect = list.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        const top = itemRect.top - listRect.top;

        setIndicatorStyle({ top, height: itemRect.height });
        setActiveStyle({ top, height: itemRect.height });
    }, [location.pathname, role]);

    return (
        <aside className="sidebar" aria-label="Navegación principal">
            <nav className="sidebar-nav">
                <ul className="sidebar-list" ref={listRef}>
                    <span
                        className="sidebar-active-indicator"
                        style={{ transform: `translateY(${indicatorStyle.top}px)`, height: `${indicatorStyle.height}px` }}
                        aria-hidden="true"
                    />
                    <span
                        className="sidebar-active-bg"
                        style={{ transform: `translateY(${activeStyle.top}px)`, height: `${activeStyle.height}px` }}
                        aria-hidden="true"
                    />
                    {items.map((item) => (
                        <li key={item.id} className="sidebar-item-wrapper">
                            <NavLink
                                to={item.paths[role] ?? '/'}
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
