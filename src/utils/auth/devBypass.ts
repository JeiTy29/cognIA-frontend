import type { AuthMeResponse } from '../../services/auth/auth.types';

export const devAuthBypassEnabled =
    import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

export type DevRole = 'guardian' | 'psychologist' | 'admin';
const DEV_AUTH_ACTIVE_KEY = 'cognia_dev_auth_active';
const DEV_ROLE_KEY = 'cognia_dev_role';

function normalizeRole(value?: string | null) {
    const cleaned = value?.trim().toLowerCase();
    if (cleaned === 'psychologist') return 'psychologist';
    if (cleaned === 'guardian') return 'guardian';
    if (cleaned === 'admin') return 'admin';
    return null;
}

function resolveRoleFromQuery() {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return normalizeRole(params.get('devRole'));
}

function resolveAuthFromQuery() {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const value = params.get('devAuth');
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'on') return true;
    if (normalized === 'off') return false;
    return null;
}

function readStoredDevAuthActive() {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(DEV_AUTH_ACTIVE_KEY) === 'true';
}

function readStoredDevRole() {
    if (typeof window === 'undefined') return null;
    return normalizeRole(sessionStorage.getItem(DEV_ROLE_KEY));
}

function writeStoredDevAuthActive(active: boolean) {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(DEV_AUTH_ACTIVE_KEY, active ? 'true' : 'false');
}

function writeStoredDevRole(role: DevRole) {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(DEV_ROLE_KEY, role);
}

export function resolveDevRole(): DevRole {
    const fromQuery = devAuthBypassEnabled ? resolveRoleFromQuery() : null;
    if (fromQuery) return fromQuery;
    const fromStorage = readStoredDevRole();
    if (fromStorage) return fromStorage;
    const fromEnv = normalizeRole(import.meta.env.VITE_DEV_ROLE);
    return fromEnv ?? 'guardian';
}

export function resolveDevAuthActive(): boolean {
    if (!devAuthBypassEnabled) return false;
    const fromQuery = resolveAuthFromQuery();
    if (fromQuery !== null) {
        writeStoredDevAuthActive(fromQuery);
        return fromQuery;
    }
    return readStoredDevAuthActive();
}

export function setDevAuthActive(active: boolean) {
    if (!devAuthBypassEnabled) return;
    writeStoredDevAuthActive(active);
}

export function setDevRole(role: DevRole) {
    if (!devAuthBypassEnabled) return;
    writeStoredDevRole(role);
}

export function clearDevAuthActive() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(DEV_AUTH_ACTIVE_KEY);
}

export function getDevProfile(role: DevRole): AuthMeResponse {
    if (role === 'admin') {
        return {
            id: 'dev-admin',
            username: 'dev_admin',
            email: 'dev_admin@example.com',
            full_name: null,
            user_type: 'admin',
            professional_card_number: null,
            roles: ['ADMIN'],
            is_active: true,
            mfa_enabled: false,
            mfa_confirmed_at: null,
            mfa_method: null,
            created_at: null,
            updated_at: null
        };
    }
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
    if (role === 'psychologist') return 'Psicólogo';
    if (role === 'admin') return 'Administrador';
    return 'Guardian';
}
