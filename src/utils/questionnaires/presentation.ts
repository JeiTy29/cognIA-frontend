function readText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUrlLike(value: string) {
    return /^https?:\/\//i.test(value);
}

function titleCaseWords(value: string) {
    return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const BACKEND_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
    [/\u00c3\u00a1/g, '\u00e1'],
    [/\u00c3\u00a9/g, '\u00e9'],
    [/\u00c3\u00ad/g, '\u00ed'],
    [/\u00c3\u00b3/g, '\u00f3'],
    [/\u00c3\u00ba/g, '\u00fa'],
    [/\u00c3\u0081/g, '\u00c1'],
    [/\u00c3\u0089/g, '\u00c9'],
    [/\u00c3\u008d/g, '\u00cd'],
    [/\u00c3\u0093/g, '\u00d3'],
    [/\u00c3\u009a/g, '\u00da'],
    [/\u00c3\u00b1/g, '\u00f1'],
    [/\u00c3\u0091/g, '\u00d1'],
    [/\u00c2\u00bf/g, '\u00bf'],
    [/\u00c2\u00a1/g, '\u00a1'],
    [/\u00c2\u00b7/g, '\u00b7'],
    [/\u00e2\u20ac\u201c/g, '\u2013'],
    [/\u00e2\u20ac\u009d/g, '\u2014'],
    [/\u00e2\u20ac\u00a6/g, '\u2026'],
    [/\u00e2\u20ac\u00a2/g, '\u2022'],
    [/psic\?logo/gi, 'psic\u00f3logo'],
    [/ubicaci\?n/gi, 'ubicaci\u00f3n'],
    [/revisi\?n/gi, 'revisi\u00f3n'],
    [/evaluaci\?n/gi, 'evaluaci\u00f3n'],
    [/informaci\?n/gi, 'informaci\u00f3n'],
    [/sesi\?n/gi, 'sesi\u00f3n'],
    [/contrase\?a/gi, 'contrase\u00f1a'],
    [/aprobaci\?n/gi, 'aprobaci\u00f3n'],
    [/notificaci\?n/gi, 'notificaci\u00f3n'],
    [/diagnostico/gi, 'diagn\u00f3stico'],
    [/clinico/gi, 'cl\u00ednico'],
    [/evaluacion/gi, 'evaluaci\u00f3n'],
    [/informacion/gi, 'informaci\u00f3n'],
    [/psicologica/gi, 'psicol\u00f3gica'],
    [/medica/gi, 'm\u00e9dica'],
    [/senales/gi, 'se\u00f1ales'],
    [/patron/gi, 'patr\u00f3n'],
    [/sesion/gi, 'sesi\u00f3n'],
    [/seccion/gi, 'secci\u00f3n'],
    [/recomendacion/gi, 'recomendaci\u00f3n'],
    [/orientacion/gi, 'orientaci\u00f3n'],
    [/observacion/gi, 'observaci\u00f3n'],
    [/reevaluacion/gi, 'reevaluaci\u00f3n'],
    [/simulacion/gi, 'simulaci\u00f3n'],
    [/estadisticos/gi, 'estad\u00edsticos'],
    [/clinicas/gi, 'cl\u00ednicas'],
    [/terapeuticas/gi, 'terap\u00e9uticas'],
    [/pagina/gi, 'p\u00e1gina'],
    [/metricas/gi, 'm\u00e9tricas']
];

const DOMAIN_LABELS: Record<string, string> = {
    adhd: 'TDAH',
    conduct: 'Conducta',
    elimination: 'Eliminaci\u00f3n',
    anxiety: 'Ansiedad',
    depression: 'Depresi\u00f3n',
    general: 'General'
};

const ALERT_LEVEL_LABELS: Record<string, string> = {
    low: 'Baja',
    moderate: 'Moderada',
    elevated: 'Elevada',
    high: 'Alta',
    critical_review: 'Revisi\u00f3n prioritaria'
};

const SESSION_STATUS_LABELS: Record<string, string> = {
    draft: 'Borrador',
    in_progress: 'En progreso',
    submitted: 'Enviado',
    processed: 'Procesado',
    failed: 'Fallido',
    archived: 'Archivado'
};

const CASE_STATUS_LABELS: Record<string, string> = {
    active: 'Activo',
    archived: 'Archivado'
};

const QUESTIONNAIRE_MODE_LABELS: Record<string, string> = {
    short: 'Corto',
    medium: 'Medio',
    complete: 'Completo'
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    in_review: 'En revisi\u00f3n',
    reviewed: 'Revisado',
    orientation_recommended: 'Orientaci\u00f3n recomendada',
    closed: 'Cerrado'
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    rejected: 'Rechazada'
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
    questionnaire_share_requested: 'Nueva solicitud de revisi\u00f3n',
    questionnaire_share_accepted: 'Solicitud aceptada',
    questionnaire_share_rejected: 'Solicitud rechazada',
    professional_review_created: 'Nueva revisi\u00f3n profesional',
    professional_review_updated: 'Revisi\u00f3n profesional actualizada'
};

const ENCRYPTED_FIELD_STRING_MARKERS = [
    '__cognia_field_encrypted__',
    'field_encryption_v1',
    'AES-256-GCM',
    '"ciphertext"',
    '"nonce"',
    '"key_id"',
    '"algorithm"',
    '"purpose"',
    '"version"'
];

const ENCRYPTED_FIELD_KEYS = [
    '__cognia_field_encrypted__',
    'key_id',
    'nonce',
    'ciphertext',
    'algorithm',
    'purpose',
    'version'
];

function formatFallbackLabel(value: string) {
    return normalizeBackendText(titleCaseWords(value.replace(/[_-]+/g, ' ')), '--');
}

function normalizeKnownWords(value: string) {
    return BACKEND_TEXT_REPLACEMENTS.reduce(
        (current, [pattern, replacement]) => current.replace(pattern, replacement),
        value
    );
}

export function normalizeBooleanLabel(value: unknown, fallback = '--') {
    if (typeof value === 'boolean') return value ? 'S\u00ed' : 'No';
    const raw = readText(value).toLowerCase();
    if (!raw) return fallback;
    if (raw === 'true') return 'S\u00ed';
    if (raw === 'false') return 'No';
    return fallback;
}

export function isEncryptedField(value: unknown) {
    if (!isRecordLike(value)) return false;
    if (value.__cognia_field_encrypted__ === true) return true;
    return ENCRYPTED_FIELD_KEYS.some((key) => key in value);
}

export function isEncryptedFieldString(value: unknown) {
    const raw = readText(value);
    if (!raw) return false;

    if (ENCRYPTED_FIELD_STRING_MARKERS.some((marker) => raw.includes(marker))) {
        return true;
    }

    if (!(raw.startsWith('{') || raw.startsWith('['))) {
        return false;
    }

    try {
        const parsed = JSON.parse(raw);
        return isEncryptedField(parsed);
    } catch {
        return false;
    }
}

export function safeDisplayText(value: unknown, fallback = 'Informaci\u00f3n protegida no disponible para visualizaci\u00f3n.') {
    if (typeof value === 'boolean') return value ? 'S\u00ed' : 'No';
    if (isEncryptedField(value) || isEncryptedFieldString(value)) return fallback;
    if (isRecordLike(value) || Array.isArray(value)) return fallback;

    const raw = readText(value);
    if (!raw || raw === 'null' || raw === 'undefined' || raw === 'NaN' || raw === '[object Object]') {
        return fallback;
    }

    if (isUrlLike(raw)) return raw;

    const normalized = normalizeKnownWords(raw)
        .replace(/\s+/g, ' ')
        .trim();

    return normalized || fallback;
}

export function normalizeBackendText(value: unknown, fallback = '--') {
    return safeDisplayText(value, fallback);
}

export function normalizeDomainLabel(value: unknown) {
    const raw = readText(value).toLowerCase().replace(/[_-]+/g, '_');
    if (!raw) return 'General';
    if (
        raw.includes('gad') ||
        raw.includes('agor') ||
        raw.includes('worry') ||
        raw.includes('panic') ||
        raw.includes('separation') ||
        raw.includes('social')
    ) {
        return 'Ansiedad';
    }
    if (
        raw.includes('mdd') ||
        raw.includes('pdd') ||
        raw.includes('depressive') ||
        raw.includes('mood')
    ) {
        return 'Depresi\u00f3n';
    }
    if (
        raw.includes('adhd') ||
        raw.includes('tdah') ||
        raw.includes('inatt') ||
        raw.includes('hypimp')
    ) {
        return 'TDAH';
    }
    if (
        raw.includes('conduct') ||
        raw.includes('odd') ||
        raw.includes('dmdd') ||
        raw.includes('outburst')
    ) {
        return 'Conducta';
    }
    if (
        raw.includes('elimination') ||
        raw.includes('enuresis') ||
        raw.includes('encopresis')
    ) {
        return 'Eliminaci\u00f3n';
    }
    return DOMAIN_LABELS[raw] ?? formatFallbackLabel(raw);
}

export function normalizeAlertLevel(value: unknown) {
    const raw = readText(value).toLowerCase();
    if (!raw) return '--';
    return ALERT_LEVEL_LABELS[raw] ?? formatFallbackLabel(raw);
}

export function normalizeSessionStatus(value: unknown) {
    const raw = readText(value).toLowerCase();
    if (!raw) return '--';
    return SESSION_STATUS_LABELS[raw] ?? formatFallbackLabel(raw);
}

export function normalizeReviewStatus(value: unknown) {
    const raw = readText(value).toLowerCase();
    if (!raw) return '--';
    return REVIEW_STATUS_LABELS[raw] ?? formatFallbackLabel(raw);
}

export function normalizeRequestStatus(value: unknown) {
    const raw = readText(value).toLowerCase();
    if (!raw) return '--';
    return REQUEST_STATUS_LABELS[raw] ?? formatFallbackLabel(raw);
}

export function normalizeCaseStatus(value: unknown) {
    const raw = readText(value).toLowerCase();
    if (!raw) return '--';
    return CASE_STATUS_LABELS[raw] ?? formatFallbackLabel(raw);
}

export function normalizeQuestionnaireMode(value: unknown) {
    const raw = readText(value).toLowerCase();
    if (!raw) return '--';
    return QUESTIONNAIRE_MODE_LABELS[raw] ?? formatFallbackLabel(raw);
}

export const normalizeModeLabel = normalizeQuestionnaireMode;

export function normalizeNotificationType(value: unknown) {
    const raw = readText(value).toLowerCase();
    if (!raw) return 'Notificaci\u00f3n';
    return NOTIFICATION_TYPE_LABELS[raw] ?? formatFallbackLabel(raw);
}

export function formatPercent(value: unknown, maximumFractionDigits = 1) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '--';
    const normalized = numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric;
    return `${new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits
    }).format(normalized)} %`;
}

export function formatDate(value: unknown, fallback = 'Fecha no disponible') {
    const raw = readText(value);
    if (!raw) return fallback;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(parsed);
}

export function formatDateTime(value: unknown, fallback = 'Fecha no disponible') {
    const raw = readText(value);
    if (!raw) return fallback;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(parsed);
}
