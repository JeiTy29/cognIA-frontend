import type { AuthMeResponse } from '../../services/auth/auth.types';

export const devAuthBypassEnabled =
    import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

type DevRole = 'guardian' | 'psychologist';

function normalizeRole(value?: string | null) {
    const cleaned = value?.trim().toLowerCase();
    if (cleaned === 'psychologist') return 'psychologist';
    if (cleaned === 'guardian') return 'guardian';
    return null;
}

function resolveRoleFromQuery() {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return normalizeRole(params.get('devRole'));
}

export function resolveDevRole(): DevRole {
    const fromQuery = devAuthBypassEnabled ? resolveRoleFromQuery() : null;
    if (fromQuery) return fromQuery;
    const fromEnv = normalizeRole(import.meta.env.VITE_DEV_ROLE);
    return fromEnv ?? 'guardian';
}

export function getDevProfile(role: DevRole): AuthMeResponse {
    if (role === 'psychologist') {
        return {
            id: 'dev-psychologist',
            username: 'dev_psychologist',
            email: 'dev_psychologist@example.com',
            full_name: 'Psicólogo Demo',
            user_type: 'psychologist',
            professional_card_number: 'DEV-12345',
            roles: ['PSYCHOLOGIST'],
            is_active: true,
            mfa_enabled: true,
            mfa_confirmed_at: '2026-02-01T00:00:00Z',
            mfa_method: 'totp',
            created_at: null,
            updated_at: null
        };
    }
    return {
        id: 'dev-guardian',
        username: 'dev_guardian',
        email: 'dev_guardian@example.com',
        full_name: null,
        user_type: 'guardian',
        professional_card_number: null,
        roles: ['GUARDIAN'],
        is_active: true,
        mfa_enabled: false,
        mfa_confirmed_at: null,
        mfa_method: null,
        created_at: null,
        updated_at: null
    };
}

export function getDevRoleLabel(role: DevRole) {
    return role === 'psychologist' ? 'Psicólogo' : 'Guardian';
}
