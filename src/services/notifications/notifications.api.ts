import { apiGet, apiPatch } from '../api/httpClient';
import type { NotificationDTO, NotificationsResponseDTO } from './notifications.types';

function toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function readText(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown, fallback: number) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
}

function normalizeNotification(value: unknown): NotificationDTO | null {
    const record = toRecord(value);
    if (!record) return null;
    const notificationId = readText(record.notification_id) ?? readText(record.id);
    if (!notificationId) return null;
    return {
        ...record,
        notification_id: notificationId,
        type: readText(record.type),
        title: readText(record.title),
        message: readText(record.message),
        case_public_id: readText(record.case_public_id),
        session_id: readText(record.session_id),
        grant_id: readText(record.grant_id),
        read_at: readText(record.read_at),
        created_at: readText(record.created_at)
    };
}

export async function getNotifications(params?: {
    unread_only?: boolean;
    type?: string;
    page?: number;
    page_size?: number;
}): Promise<NotificationsResponseDTO> {
    const search = new URLSearchParams();
    if (typeof params?.unread_only === 'boolean') search.set('unread_only', String(params.unread_only));
    if (params?.type) search.set('type', params.type);
    search.set('page', String(params?.page ?? 1));
    search.set('page_size', String(params?.page_size ?? 20));
    const payload = await apiGet<unknown>(`/api/v2/notifications?${search.toString()}`, {
        auth: true,
        credentials: 'include'
    });
    const record = toRecord(payload) ?? {};
    const pagination = toRecord(record.pagination) ?? {};
    return {
        items: Array.isArray(record.items)
            ? record.items.map(normalizeNotification).filter((item): item is NotificationDTO => Boolean(item))
            : [],
        summary: toRecord(record.summary),
        pagination: {
            page: readNumber(pagination.page, 1),
            page_size: readNumber(pagination.page_size, 20),
            total: readNumber(pagination.total, 0),
            pages: readNumber(pagination.pages, 1)
        }
    };
}

export async function markNotificationAsRead(notificationId: string) {
    const payload = await apiPatch<{ notification?: NotificationDTO }, Record<string, never>>(
        `/api/v2/notifications/${notificationId}/read`,
        {},
        {
            auth: true,
            credentials: 'include'
        }
    );
    return normalizeNotification(payload.notification);
}
