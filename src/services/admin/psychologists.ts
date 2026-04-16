import { apiPost } from '../api/httpClient';
import type { User } from './users';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

export type PsychologistReviewState = 'pending' | 'rejected' | 'approved';

type UserRecord = User & Record<string, unknown>;

function getStringField(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return null;
}

export function isPsychologistUser(user: User) {
    const normalizedType = user.user_type?.trim().toLowerCase() ?? '';
    if (normalizedType === 'psychologist') {
        return true;
    }
    return user.roles.some((role) => role.trim().toUpperCase() === 'PSYCHOLOGIST');
}

export function resolvePsychologistReviewState(user: User): PsychologistReviewState | null {
    const record = user as UserRecord;
    const rawStatus = getStringField(record, ['review_status', 'approval_status', 'psychologist_status', 'status']);
    const normalized = rawStatus?.toLowerCase() ?? '';

    if (normalized.includes('pending')) return 'pending';
    if (normalized.includes('reject')) return 'rejected';
    if (normalized.includes('approv')) return 'approved';

    const rejectionReason = getPsychologistRejectionReason(user);
    if (rejectionReason) {
        return 'rejected';
    }

    return null;
}

export function getPsychologistRejectionReason(user: User) {
    const record = user as UserRecord;
    return getStringField(record, ['rejection_reason', 'review_reason']);
}

export function approvePsychologist(userId: string) {
    return apiPost<unknown, Record<string, never>>(`/api/admin/psychologists/${userId}/approve`, {}, requestOptions);
}

export function rejectPsychologist(userId: string, reason: string) {
    return apiPost<unknown, { reason: string }>(
        `/api/admin/psychologists/${userId}/reject`,
        { reason },
        requestOptions
    );
}
