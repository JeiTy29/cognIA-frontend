import { apiGet } from '../api/httpClient';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

export interface AuditLogItem {
    id: string;
    timestamp: string | null;
    action: string;
    actor: string;
    target: string;
    summary: string;
    raw: Record<string, unknown>;
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
    const direct = pickString(record, ['actor_username', 'username', 'actor', 'user', 'email', 'actor_id', 'user_id']);
    if (direct) return direct;

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
    const direct = pickString(record, ['description', 'message', 'detail', 'details']);
    if (direct) return direct;

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

export function normalizeAuditLogs(payload: unknown) {
    const logs = findLogsCollection(payload);

    return logs
        .map((entry, index) => {
            const record = asObject(entry);
            if (!record) return null;

            const id = pickString(record, ['id', 'event_id', 'audit_id']) ?? `audit-${index + 1}`;
            const timestamp = pickString(record, ['created_at', 'timestamp', 'occurred_at', 'logged_at', 'date']);
            const action = pickString(record, ['action', 'event', 'event_type', 'operation']) ?? 'Sin acción';
            const actor = resolveActor(record);
            const target = resolveTarget(record);
            const summary = resolveSummary(record);

            return {
                id,
                timestamp,
                action,
                actor,
                target,
                summary,
                raw: record
            } satisfies AuditLogItem;
        })
        .filter((item): item is AuditLogItem => item !== null);
}

export function getAuditLogs() {
    return apiGet<unknown>('/api/admin/audit-logs', requestOptions);
}
