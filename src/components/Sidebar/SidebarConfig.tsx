import type { ReactNode } from 'react';

export type Role = 'padre' | 'psicologo';

interface SidebarItem {
    id: string;
    label: string;
    icon: ReactNode;
    roles: Role[];
    paths: Record<Role, string>;
}

const IconClipboard = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 2h6a2 2 0 0 1 2 2h2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4h2a2 2 0 0 1 2-2Zm0 4h6V4H9v2Zm0 4h6v2H9v-2Zm0 4h6v2H9v-2Z" />
    </svg>
);

const IconHistory = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5a7 7 0 1 1-6.32 4H3l3.5-3.5L10 9H7.68A5 5 0 1 0 12 7v2l3-3-3-3v2Z" />
    </svg>
);

const IconLightbulb = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 21h6v-1H9v1Zm3-20a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3.26A7 7 0 0 0 12 1Zm2 11.1-1 1V16h-2v-2.9l-1-1A5 5 0 1 1 14 12.1Z" />
    </svg>
);

const IconUser = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v2h16v-2c0-2.76-3.58-5-8-5Z" />
    </svg>
);

const IconSupport = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a8 8 0 0 0-8 8v4a2 2 0 0 0 2 2h3v-6H6a6 6 0 0 1 12 0h-3v6h3a2 2 0 0 0 2-2v-4a8 8 0 0 0-8-8Zm-1 18h2v-2h-2v2Z" />
    </svg>
);

export const sidebarItems: SidebarItem[] = [
    {
        id: 'cuestionario',
        label: 'Cuestionario',
        icon: IconClipboard,
        roles: ['padre', 'psicologo'],
        paths: {
            padre: '/padre/cuestionario',
            psicologo: '/psicologo/cuestionario'
        }
    },
    {
        id: 'historial',
        label: 'Historial',
        icon: IconHistory,
        roles: ['padre', 'psicologo'],
        paths: {
            padre: '/padre/historial',
            psicologo: '/psicologo/historial'
        }
    },
    {
        id: 'sugerencias',
        label: 'Sugerencias',
        icon: IconLightbulb,
        roles: ['psicologo'],
        paths: {
            padre: '/padre/cuestionario',
            psicologo: '/psicologo/sugerencias'
        }
    },
    {
        id: 'soporte',
        label: 'Soporte',
        icon: IconSupport,
        roles: ['padre', 'psicologo'],
        paths: {
            padre: '/padre/soporte',
            psicologo: '/psicologo/soporte'
        }
    },
    {
        id: 'cuenta',
        label: 'Cuenta',
        icon: IconUser,
        roles: ['padre', 'psicologo'],
        paths: {
            padre: '/padre/cuenta',
            psicologo: '/psicologo/cuenta'
        }
    }
];

export function getItemsForRole(role: Role) {
    return sidebarItems.filter((item) => item.roles.includes(role));
}

export function getDefaultPath(role: Role) {
    const items = getItemsForRole(role);
    return items.length > 0 ? items[0].paths[role] : '/';
}
