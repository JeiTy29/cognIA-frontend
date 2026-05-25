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
    [/ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡/g, 'á'],
    [/ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©/g, 'é'],
    [/ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­/g, 'í'],
    [/ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³/g, 'ó'],
    [/ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âº/g, 'ú'],
    [/ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â/g, 'Á'],
    [/ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°/g, 'É'],
    [/ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â/g, 'Í'],
    [/ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ/g, 'Ó'],
    [/ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â¡/g, 'Ú'],
    [/ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±/g, 'ñ'],
    [/ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“/g, 'Ñ'],
    [/ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿/g, '¿'],
    [/ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡/g, '¡'],
    [/ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·/g, '·'],
    [/ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ/g, '–'],
    [/ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â/g, '—'],
    [/ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦/g, '…'],
    [/ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢/g, '•'],
    [/ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“|ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â/g, '"'],
    [/ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œ|ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢/g, '\''],
    [/psic\?logo/gi, 'psicólogo'],
    [/ubicaci\?n/gi, 'ubicación'],
    [/revisi\?n/gi, 'revisión'],
    [/evaluaci\?n/gi, 'evaluación'],
    [/informaci\?n/gi, 'información'],
    [/sesi\?n/gi, 'sesión'],
    [/contrase\?a/gi, 'contraseña'],
    [/aprobaci\?n/gi, 'aprobación'],
    [/notificaci\?n/gi, 'notificación'],
    [/diagnostico/gi, 'diagnóstico'],
    [/clinico/gi, 'clínico'],
    [/evaluacion/gi, 'evaluación'],
    [/informacion/gi, 'información'],
    [/psicologica/gi, 'psicológica'],
    [/medica/gi, 'médica'],
    [/senales/gi, 'señales'],
    [/patron/gi, 'patrón'],
    [/sesion/gi, 'sesión'],
    [/seccion/gi, 'sección'],
    [/recomendacion/gi, 'recomendación'],
    [/orientacion/gi, 'orientación'],
    [/observacion/gi, 'observación'],
    [/reevaluacion/gi, 'reevaluación'],
    [/simulacion/gi, 'simulación'],
    [/estadisticos/gi, 'estadísticos'],
    [/clinicas/gi, 'clínicas'],
    [/terapeuticas/gi, 'terapéuticas'],
    [/pagina/gi, 'página'],
    [/metricas/gi, 'métricas']
];

const DOMAIN_LABELS: Record<string, string> = {
    adhd: 'TDAH',
    conduct: 'Conducta',
    elimination: 'Eliminación',
    anxiety: 'Ansiedad',
    depression: 'Depresión',
    general: 'General'
};

const ALERT_LEVEL_LABELS: Record<string, string> = {
    low: 'Bajo',
    moderate: 'Moderado',
    elevated: 'Elevado',
    high: 'Alto',
    critical_review: 'Revisión prioritaria'
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
    in_review: 'En revisión',
    reviewed: 'Revisado',
    orientation_recommended: 'Orientación recomendada',
    closed: 'Cerrado'
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    rejected: 'Rechazada'
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
    questionnaire_share_requested: 'Nueva solicitud de revisión',
    questionnaire_share_accepted: 'Solicitud aceptada',
    questionnaire_share_rejected: 'Solicitud rechazada',
    professional_review_created: 'Nueva revisión profesional',
    professional_review_updated: 'Revisión profesional actualizada'
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
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    const raw = readText(value).toLowerCase();
    if (!raw) return fallback;
    if (raw === 'true') return 'Sí';
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

export function safeDisplayText(value: unknown, fallback = 'Información protegida no disponible para visualización.') {
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
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
        return 'Depresión';
    }
    if (
        raw.includes('adhd') ||
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
        return 'Eliminación';
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
    if (!raw) return 'Notificación';
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
