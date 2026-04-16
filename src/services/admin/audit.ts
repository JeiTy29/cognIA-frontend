import { apiGet } from '../api/httpClient';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

export interface AuditLogItem {
    id: string;
    timestamp: string | null;
    action: string;
    userId: string | null;
    section: string | null;
    actor: string;
    target: string;
    summary: string;
    raw: Record<string, unknown>;
}

interface AuditPagination {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
}

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function asArray(value: unknown) {
    return Array.isArray(value) ? value : null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return null;
}

function describeValue(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
        return value
            .map((entry) => describeValue(entry))
            .filter((entry) => entry.length > 0)
            .join(', ');
    }
    const record = asObject(value);
    if (record) {
        return Object.entries(record)
            .map(([key, entry]) => `${key}: ${describeValue(entry)}`)
            .join(' | ');
    }
    return '';
}

function resolveActor(record: Record<string, unknown>): string {
    const direct = pickString(record, ['actor_username', 'username', 'actor', 'user', 'email', 'actor_id']);
    if (direct) return direct;

    const userId = pickString(record, ['user_id']);
    if (userId) return userId;

    const actorObject = asObject(record.actor_info) ?? asObject(record.actor_user);
    if (!actorObject) return '--';
    const described = pickString(actorObject, ['username', 'email', 'id', 'name']) ?? describeValue(actorObject);
    return described || '--';
}

function resolveTarget(record: Record<string, unknown>): string {
    const direct = pickString(record, ['target_username', 'target_id', 'target', 'resource', 'entity', 'subject']);
    if (direct) return direct;

    const targetObject = asObject(record.target_info) ?? asObject(record.target_user);
    if (!targetObject) return '--';
    const described = pickString(targetObject, ['username', 'email', 'id', 'name']) ?? describeValue(targetObject);
    return described || '--';
}

function resolveSummary(record: Record<string, unknown>): string {
    const direct = pickString(record, ['description', 'message', 'detail']);
    if (direct) return direct;

    const details = record.details;
    if (details !== undefined) {
        const describedDetails = describeValue(details);
        if (describedDetails) return describedDetails;
    }

    const metadata = asObject(record.metadata) ?? asObject(record.context) ?? asObject(record.extra);
    if (metadata) {
        const described = describeValue(metadata);
        if (described) return described;
    }

    return '--';
}

function findLogsCollection(payload: unknown): unknown[] {
    const rootArray = asArray(payload);
    if (rootArray) return rootArray;

    const root = asObject(payload);
    if (!root) return [];

    const collections = [
        root.items,
        root.logs,
        root.audit_logs,
        root.results,
        root.data
    ];

    for (const candidate of collections) {
        const value = asArray(candidate);
        if (value) return value;
    }

    return [];
}

function resolvePagination(payload: unknown): AuditPagination | null {
    const root = asObject(payload);
    if (!root) return null;

    const pagination = asObject(root.pagination);
    if (!pagination) return null;

    const page = typeof pagination.page === 'number' ? pagination.page : 1;
    const pageSize = typeof pagination.page_size === 'number' ? pagination.page_size : 100;
    const total = typeof pagination.total === 'number' ? pagination.total : 0;
    const pages = typeof pagination.pages === 'number'
        ? pagination.pages
        : Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

    return {
        page,
        pageSize,
        total,
        pages
    };
}

export function normalizeAuditLogs(payload: unknown) {
    const logs = findLogsCollection(payload);

    return logs
        .map((entry, index) => {
            const record = asObject(entry);
            if (!record) return null;

            const id = pickString(record, ['id', 'event_id', 'audit_id']) ?? `audit-${index + 1}`;
            const timestamp = pickString(record, ['created_at', 'timestamp', 'occurred_at', 'logged_at', 'date']);
            const action = pickString(record, ['action', 'event', 'event_type', 'operation']) ?? 'Sin accion';
            const userId = pickString(record, ['user_id', 'actor_id']);
            const section = pickString(record, ['section']);
            const actor = resolveActor(record);
            const target = resolveTarget(record);
            const summary = resolveSummary(record);

            return {
                id,
                timestamp,
                action,
                userId,
                section,
                actor,
                target,
                summary,
                raw: record
            } satisfies AuditLogItem;
        })
        .filter((item): item is AuditLogItem => item !== null);
}

export function getAuditLogs(page: number, pageSize: number) {
    const search = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize)
    });
    return apiGet<unknown>(`/api/admin/audit-logs?${search.toString()}`, requestOptions);
}

export async function getAllAuditLogs() {
    const pageSize = 100;
    let page = 1;
    let pages = 1;
    const collected: AuditLogItem[] = [];

    while (page <= pages) {
        const payload = await getAuditLogs(page, pageSize);
        collected.push(...normalizeAuditLogs(payload));

        const pagination = resolvePagination(payload);
        if (!pagination) {
            break;
        }

        pages = pagination.pages;
        if (page >= pages) {
            break;
        }

        page += 1;
    }

    return collected;
}
