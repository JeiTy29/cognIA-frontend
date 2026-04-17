import type { ReactNode } from 'react';

export type Role = 'padre' | 'psicologo' | 'admin';

interface SidebarItem {
    id: string;
    label: string;
    icon: ReactNode;
    roles: Role[];
    paths: Partial<Record<Role, string>>;
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

const IconMetrics = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19h16v2H2V3h2v16Zm4-6h3v5H8v-5Zm5-5h3v10h-3V8Zm5-3h3v13h-3V5Z" />
    </svg>
);

const IconAdminQuestionnaires = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v14h12V5H6Zm2 3h8v2H8V8Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z" />
    </svg>
);

const IconEvaluations = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h14v16H5V4Zm2 2v12h10V6H7Zm2 2h6v2H9V8Zm0 4h6v2H9v-2Zm0 4h4v2H9v-2Z" />
    </svg>
);

const IconUsers = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 12a4 4 0 1 1 4-4 4 4 0 0 1-4 4Zm8 0a3 3 0 1 1 3-3 3 3 0 0 1-3 3ZM4 20a6 6 0 0 1 12 0v1H4Zm12 1v-1a6 6 0 0 0-2-4.47 5 5 0 0 1 8 4.47v1Z" />
    </svg>
);

const IconPsychologists = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h10v-1c0-1.38.64-2.64 1.72-3.66A9.68 9.68 0 0 0 12 14Zm8.71 1.29-1-1-2.12 2.12-1.29-1.29-1 1 2.29 2.29 3.12-3.12Z" />
    </svg>
);

const IconAudit = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 3h10a2 2 0 0 1 2 2v2h2v14H5Zm2 4h10V5H7Zm0 4h10v2H7Zm0 4h7v2H7Z" />
    </svg>
);

const IconReports = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h14v16H5V4Zm2 2v12h10V6H7Zm2 2h6v2H9V8Zm0 4h6v2H9v-2Zm0 4h4v2H9v-2Z" />
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
            psicologo: '/psicologo/sugerencias'
        }
    },
    {
        id: 'ayuda',
        label: 'Ayuda',
        icon: IconSupport,
        roles: ['padre', 'psicologo'],
        paths: {
            padre: '/padre/ayuda',
            psicologo: '/psicologo/ayuda'
        }
    },
    {
        id: 'reportes',
        label: 'Reportes',
        icon: IconReports,
        roles: ['padre', 'psicologo'],
        paths: {
            padre: '/padre/reportes',
            psicologo: '/psicologo/reportes'
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

const adminItems: SidebarItem[] = [
    {
        id: 'metricas',
        label: 'Métricas',
        icon: IconMetrics,
        roles: ['admin'],
        paths: {
            admin: '/admin/metricas'
        }
    },
    {
        id: 'cuestionarios-admin',
        label: 'Cuestionarios',
        icon: IconAdminQuestionnaires,
        roles: ['admin'],
        paths: {
            admin: '/admin/cuestionarios'
        }
    },
    {
        id: 'evaluaciones-admin',
        label: 'Evaluaciones',
        icon: IconEvaluations,
        roles: ['admin'],
        paths: {
            admin: '/admin/evaluaciones'
        }
    },
    {
        id: 'usuarios',
        label: 'Usuarios',
        icon: IconUsers,
        roles: ['admin'],
        paths: {
            admin: '/admin/usuarios'
        }
    },
    {
        id: 'psicologos',
        label: 'Psicólogos',
        icon: IconPsychologists,
        roles: ['admin'],
        paths: {
            admin: '/admin/psicologos'
        }
    },
    {
        id: 'auditoria',
        label: 'Auditoría',
        icon: IconAudit,
        roles: ['admin'],
        paths: {
            admin: '/admin/auditoria'
        }
    },
    {
        id: 'reportes-admin',
        label: 'Reportes',
        icon: IconReports,
        roles: ['admin'],
        paths: {
            admin: '/admin/reportes'
        }
    },
    {
        id: 'cuenta-admin',
        label: 'Cuenta',
        icon: IconUser,
        roles: ['admin'],
        paths: {
            admin: '/admin/cuenta'
        }
    }
];

export function getItemsForRole(role: Role) {
    const source = role === 'admin' ? adminItems : sidebarItems;
    return source.filter((item) => item.roles.includes(role) && item.paths[role]);
}

export function getDefaultPath(role: Role) {
    const items = getItemsForRole(role);
    return items.length > 0 ? (items[0].paths[role] ?? '/') : '/';
}
