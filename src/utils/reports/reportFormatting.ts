const DOMAIN_LABELS: Record<string, string> = {
    adhd: 'TDAH',
    conduct: 'Conducta',
    conduct_disorder: 'Conducta',
    conduct_problem: 'Conducta',
    elimination: 'Eliminación',
    elimination_disorder: 'Eliminación',
    anxiety: 'Ansiedad',
    anxiety_disorder: 'Ansiedad',
    depression: 'Depresión',
    depressive_disorder: 'Depresión'
};

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    guardian: 'Padre o tutor',
    psychologist: 'Psicólogo',
    teacher: 'Docente (legacy)'
};

const STATUS_LABELS: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    resolved: 'Resuelto',
    open: 'Abierto',
    in_progress: 'En proceso',
    triaged: 'Triagado',
    draft: 'Borrador',
    submitted: 'Enviado',
    processed: 'Procesado',
    archived: 'Archivado',
    failed: 'Fallido'
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
    likert_0_4: 'Escala Likert 0 a 4',
    likert_1_5: 'Escala Likert 1 a 5',
    boolean: 'Sí/No',
    frequency_0_3: 'Frecuencia 0 a 3',
    intensity_0_10: 'Intensidad 0 a 10',
    count: 'Conteo',
    ordinal: 'Opción ordinal',
    text_context: 'Texto contextual'
};

const HIDDEN_TECHNICAL_FIELDS = new Set([
    'id',
    'uuid',
    'jti',
    'token',
    'access_token',
    'refresh_token',
    'password',
    'password_hash',
    'secret',
    'secret_key',
    'mfa_secret',
    'recovery_code',
    'hash',
    'session_id',
    'questionnaire_id',
    'model_id',
    'activation_id',
    'artifact_path',
    'fallback_artifact_path',
    'feature',
    'feature_key',
    'feature_columns',
    'raw',
    'raw_value',
    'metadata_json',
    'payload',
    'stack',
    'traceback',
    'sql',
    'query'
]);

function normalizeKey(value: string) {
    return value.trim().toLowerCase();
}

function toFiniteNumber(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function capitalizeSentence(value: string) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatReportDate(value: unknown, fallback = 'Sin fecha válida') {
    if (typeof value !== 'string' && !(value instanceof Date)) return fallback;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    const year = parsed.getFullYear();
    const currentYear = new Date().getFullYear();
    if (year < 2020 || year > currentYear + 1) return fallback;
    return parsed.toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

export function formatReportDateTime(value: unknown, fallback = 'Sin fecha válida') {
    if (typeof value !== 'string' && !(value instanceof Date)) return fallback;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    const year = parsed.getFullYear();
    const currentYear = new Date().getFullYear();
    if (year < 2020 || year > currentYear + 1) return fallback;
    return parsed.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatReportNumber(value: unknown, fallback = 'No disponible') {
    const number = toFiniteNumber(value);
    if (number === null) return fallback;
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(number);
}

export function formatReportPercent(value: unknown, fallback = 'No disponible') {
    const number = toFiniteNumber(value);
    if (number === null) return fallback;
    const normalized = number <= 1 ? number : number / 100;
    return new Intl.NumberFormat('es-CO', {
        style: 'percent',
        maximumFractionDigits: 1
    }).format(normalized);
}

export function formatDomainLabel(value: unknown, fallback = 'No disponible') {
    if (typeof value !== 'string' || value.trim().length === 0) return fallback;
    const normalized = normalizeKey(value).replace(/-/g, '_');
    if (DOMAIN_LABELS[normalized]) return DOMAIN_LABELS[normalized];
    const readable = normalized.replace(/_/g, ' ');
    return capitalizeSentence(readable);
}

export function formatRoleLabel(value: unknown, fallback = 'No disponible') {
    if (typeof value !== 'string' || value.trim().length === 0) return fallback;
    const normalized = normalizeKey(value);
    return ROLE_LABELS[normalized] ?? ROLE_LABELS[normalized.toLowerCase()] ?? capitalizeSentence(normalized);
}

export function formatUserStatus(value: unknown, fallback = 'No disponible') {
    if (typeof value === 'boolean') return value ? 'Activo' : 'Inactivo';
    if (typeof value !== 'string' || value.trim().length === 0) return fallback;
    const normalized = normalizeKey(value);
    return STATUS_LABELS[normalized] ?? capitalizeSentence(normalized.replace(/_/g, ' '));
}

export function formatVerificationStatus(value: unknown, fallback = 'No disponible') {
    if (typeof value === 'boolean') return value ? 'Aprobado' : 'Pendiente';
    return formatUserStatus(value, fallback);
}

export function formatHttpStatusFamily(value: unknown, fallback = 'Otros') {
    const number = toFiniteNumber(value);
    if (number === null) return fallback;
    if (number >= 200 && number < 300) return '2xx exitosas';
    if (number >= 300 && number < 400) return '3xx redirecciones';
    if (number >= 400 && number < 500) return '4xx cliente/autorización';
    if (number >= 500 && number < 600) return '5xx servidor';
    return 'Otros';
}

export function formatQuestionType(value: unknown, fallback = 'No disponible') {
    if (typeof value !== 'string' || value.trim().length === 0) return fallback;
    const normalized = normalizeKey(value);
    return QUESTION_TYPE_LABELS[normalized] ?? capitalizeSentence(normalized.replace(/_/g, ' '));
}

export function humanizeDashboardLabel(key: string) {
    const normalized = normalizeKey(key);
    if (DOMAIN_LABELS[normalized]) return DOMAIN_LABELS[normalized];
    const readable = normalized
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return capitalizeSentence(readable);
}

export function sanitizeTechnicalValue(value: unknown, fallback = 'No disponible'): string {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') return formatReportNumber(value, fallback);
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return fallback;
        if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(trimmed)) {
            return formatReportDateTime(trimmed, formatReportDate(trimmed, trimmed));
        }
        if (/^[a-z0-9]+(?:_[a-z0-9]+){2,}$/i.test(trimmed)) {
            return humanizeDashboardLabel(trimmed);
        }
        return trimmed;
    }
    if (Array.isArray(value)) {
        const parts = value
            .map((item) => sanitizeTechnicalValue(item, ''))
            .filter((item) => item.length > 0);
        return parts.length > 0 ? parts.join(', ') : fallback;
    }
    return fallback;
}

export function shouldHideTechnicalField(key: string) {
    return HIDDEN_TECHNICAL_FIELDS.has(normalizeKey(key));
}

export function buildAppliedFilters(filters: Array<[string, string | null | undefined]>) {
    return filters
        .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
        .map(([label, value]) => `${label}: ${value?.trim()}`);
}

export function buildAdminReportFileName(sectionLabel: string, extension = 'pdf') {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const sanitizedExtension = extension.replace(/^\./, '') || 'pdf';
    const raw = `Reporte CognIA - ${sectionLabel} - ${yyyy}-${mm}-${dd}.${sanitizedExtension}`;
    return raw
        .replace(/[\\/:*?"<>|]+/g, ' - ')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\s+\./g, '.')
        .trim();
}

