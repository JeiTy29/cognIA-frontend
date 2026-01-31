export type AppRole = 'padre' | 'psicologo';

export function getPrimaryRole(roles?: string[]): AppRole | null {
    if (!roles || roles.length === 0) return null;
    if (roles.includes('PSYCHOLOGIST')) return 'psicologo';
    if (roles.includes('GUARDIAN')) return 'padre';
    return null;
}

export function getDefaultRouteForRoles(roles?: string[]) {
    const primary = getPrimaryRole(roles);
    if (primary === 'psicologo') return '/psicologo/cuestionario';
    return '/padre/cuestionario';
}

export function hasAllowedRole(roles: string[] | undefined, allowed: AppRole[] | undefined) {
    if (!allowed || allowed.length === 0) return true;
    const primary = getPrimaryRole(roles);
    if (!primary) return false;
    return allowed.includes(primary);
}
