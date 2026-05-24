function readText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

const BACKEND_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
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
    [/m?tricas/gi, 'métricas']
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

export function normalizeBackendText(value: unknown, fallback = '--') {
    const raw = readText(value);
    if (!raw) return fallback;
    return BACKEND_TEXT_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), raw);
}

export function normalizeDomainLabel(value: unknown) {
    const raw = readText(value).toLowerCase().replace(/[_-]+/g, '_');
    if (!raw) return 'General';
    if (DOMAIN_LABELS[raw]) return DOMAIN_LABELS[raw];
    return normalizeBackendText(raw.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), 'General');
}

export function normalizeAlertLevel(value: unknown) {
    const raw = readText(value).toLowerCase();
    if (!raw) return '--';
    return ALERT_LEVEL_LABELS[raw] ?? normalizeBackendText(raw.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()));
}

export function normalizeSessionStatus(value: unknown) {
    const raw = readText(value).toLowerCase();
    if (!raw) return '--';
    return SESSION_STATUS_LABELS[raw] ?? normalizeBackendText(raw.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()));
}

export function normalizeReviewStatus(value: unknown) {
    const raw = readText(value).toLowerCase();
    if (!raw) return '--';
    return REVIEW_STATUS_LABELS[raw] ?? normalizeBackendText(raw.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()));
}

export function normalizeCaseStatus(value: unknown) {
    const raw = readText(value).toLowerCase();
    if (!raw) return '--';
    return CASE_STATUS_LABELS[raw] ?? normalizeBackendText(raw.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()));
}

export function normalizeQuestionnaireMode(value: unknown) {
    const raw = readText(value).toLowerCase();
    if (!raw) return '--';
    return QUESTIONNAIRE_MODE_LABELS[raw] ?? normalizeBackendText(raw.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()));
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
