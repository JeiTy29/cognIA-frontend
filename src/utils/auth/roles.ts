export type AppRole = 'padre' | 'psicologo' | 'admin';

export function getPrimaryRole(roles?: string[]): AppRole | null {
    if (!roles || roles.length === 0) return null;
    const normalized = roles.map((role) => role.trim().toUpperCase());
    if (normalized.includes('ADMIN')) return 'admin';
    if (normalized.includes('PSYCHOLOGIST')) return 'psicologo';
    if (normalized.includes('GUARDIAN')) return 'padre';
    return null;
}

export function getDefaultRouteForRoles(roles?: string[]) {
    const primary = getPrimaryRole(roles);
    if (primary === 'admin') return '/admin/metricas';
    if (primary === 'psicologo') return '/psicologo/cuestionario';
    return '/padre/cuestionario';
}

export function hasAllowedRole(roles: string[] | undefined, allowed: AppRole[] | undefined) {
    if (!allowed || allowed.length === 0) return true;
    const primary = getPrimaryRole(roles);
    if (!primary) return false;
    return allowed.includes(primary);
}
