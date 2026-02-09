import type { AuthMeResponse } from '../../services/auth/auth.types';

const guardianKeys = ['guardian', 'padre', 'tutor'];
const psychologistKeys = ['psychologist', 'psicologo', 'psicólogo'];
const adminKeys = ['admin', 'administrador'];

function normalize(value?: string) {
    return value?.trim().toLowerCase() ?? '';
}

function hasRole(roles: string[] | undefined, candidates: string[]) {
    if (!roles || roles.length === 0) return false;
    return roles.some((role) => candidates.includes(normalize(role)));
}

export function isGuardianProfile(profile: AuthMeResponse | null) {
    if (!profile) return false;
    if (normalize(profile.user_type) === 'guardian') return true;
    return hasRole(profile.roles, guardianKeys);
}

export function isPsychologistProfile(profile: AuthMeResponse | null) {
    if (!profile) return false;
    if (normalize(profile.user_type) === 'psychologist') return true;
    return hasRole(profile.roles, psychologistKeys);
}

export function isAdminProfile(profile: AuthMeResponse | null) {
    if (!profile) return false;
    if (normalize(profile.user_type) === 'admin') return true;
    return hasRole(profile.roles, adminKeys) || hasRole(profile.roles, ['admin']);
}

export function getAccountTypeLabel(profile: AuthMeResponse | null) {
    if (isAdminProfile(profile)) return 'Administrador';
    if (isGuardianProfile(profile)) return 'Padre o tutor';
    if (isPsychologistProfile(profile)) return 'Psicólogo';
    return 'Cuenta';
}
