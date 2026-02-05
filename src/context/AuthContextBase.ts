import { createContext } from 'react';
import type { AppRole } from '../utils/auth/roles';
import type { AuthMeResponse } from '../services/auth/auth.types';

export interface AuthContextValue {
    accessToken: string | null;
    roles: string[];
    userId: string | null;
    expiresAt: number | null;
    isAuthenticated: boolean;
    isAuthLoading: boolean;
    primaryRole: AppRole | null;
    profile: AuthMeResponse | null;
    profileStatus: 'idle' | 'loading' | 'success' | 'error';
    profileErrorStatus: number | null;
    devBypassEnabled: boolean;
    devAuthActive: boolean;
    devBypassLabel: string | null;
    setDevAuthActive: (active: boolean) => void;
    setSession: (token: string, expiresIn?: number) => void;
    logout: (reason?: LogoutReason) => void;
    devLogout: () => void;
    refreshSession: (options?: { silent?: boolean }) => Promise<boolean>;
    reloadProfile: () => Promise<void>;
}

export type LogoutReason = 'expired' | 'manual';

export const AuthContext = createContext<AuthContextValue | null>(null);
