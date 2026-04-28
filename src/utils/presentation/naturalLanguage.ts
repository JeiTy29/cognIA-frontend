import { ApiError } from '../../services/api/httpClient';

export interface SafeDisplayRow {
    key: string;
    label: string;
    value: string;
    technical: boolean;
}

interface FormatNumberOptions {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}

interface FormatPercentOptions {
    mode?: 'auto' | 'fraction' | 'percent';
    maximumFractionDigits?: number;
}

interface BuildSafeRowsOptions {
    includeTechnical?: boolean;
    includeEmpty?: boolean;
    hiddenFields?: string[];
    prioritizedFields?: string[];
    customLabels?: Record<string, string>;
    maxRows?: number;
}

const FALLBACK_VALUE = '--';

const MODE_LABELS: Record<string, string> = {
    short: 'Corto',
    medium: 'Intermedio',
    complete: 'Completo'
};

const ROLE_LABELS: Record<string, string> = {
    guardian: 'Padre o tutor',
    caregiver: 'Padre o tutor',
    psychologist: 'Psicólogo',
    admin: 'Administrador',
    guardian_upper: 'Padre o tutor',
    psychologist_upper: 'Psicólogo',
    admin_upper: 'Administrador'
};

const STATUS_LABELS: Record<string, string> = {
    draft: 'Borrador',
    in_progress: 'En progreso',
    submitted: 'Enviado',
    processed: 'Procesado',
    failed: 'Fallido',
    archived: 'Archivado',
    open: 'Abierto',
    triaged: 'Triagado',
    resolved: 'Resuelto',
    rejected: 'Rechazado',
    pending: 'Pendiente',
    completed: 'Completado'
};

const RESPONSE_TYPE_LABELS: Record<string, string> = {
    text: 'Texto',
    integer: 'Número entero',
    number: 'Número decimal',
    boolean: 'Sí / No',
    likert: 'Escala Likert'
};

const DOMAIN_LABELS: Record<string, string> = {
    adhd: 'TDAH',
    conduct: 'Conducta',
    elimination: 'Eliminación',
    anxiety: 'Ansiedad',
    depression: 'Depresión'
};

const ALERT_LEVEL_LABELS: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    moderate: 'Media',
    high: 'Alta',
    severe: 'Alta',
    limited: 'Limitada',
    unknown: 'No disponible'
};

const CONFIDENCE_BAND_LABELS: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    moderate: 'Media',
    high: 'Alta',
    limited: 'Limitada',
    uncertain: 'Incierta'
};

const COEXISTENCE_LEVEL_LABELS: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    moderate: 'Media',
    high: 'Alta'
};

const OPERATIONAL_CLASS_LABELS: Record<string, string> = {
    active_high_confidence: 'Activa con alta confianza',
    active_moderate_confidence: 'Activa con confianza moderada',
    active_low_confidence: 'Activa con confianza baja',
    review_required: 'Requiere revisión profesional',
    insufficient_data: 'Datos insuficientes'
};

const MIME_LABELS: Record<string, string> = {
    'image/png': 'Imagen PNG',
    'image/jpeg': 'Imagen JPEG',
    'image/jpg': 'Imagen JPEG',
    'image/webp': 'Imagen WebP'
};

const SOURCE_MODULE_LABELS: Record<string, string> = {
    questionnaire: 'Cuestionario',
    history: 'Historial',
    dashboard: 'Dashboard',
    metrics: 'Métricas',
    account: 'Mi cuenta',
    audit: 'Auditoría',
    reports: 'Reportes',
    admin_users: 'Administración de usuarios',
    admin_evaluations: 'Administración de evaluaciones',
    admin_questionnaires: 'Administración de cuestionarios',
    help: 'Ayuda'
};

const HTTP_METHOD_LABELS: Record<string, string> = {
    get: 'GET (consulta)',
    post: 'POST (creación)',
    put: 'PUT (actualización)',
    patch: 'PATCH (actualización parcial)',
    delete: 'DELETE (eliminación)'
};

const KEY_LABELS: Record<string, string> = {
    summary: 'Resumen',
    operational_recommendation: 'Recomendación operativa',
    completion_quality_score: 'Calidad de completitud',
    missingness_score: 'Datos faltantes',
    needs_professional_review: 'Requiere valoración profesional',
    probability: 'Probabilidad estimada',
    alert_level: 'Nivel de alerta',
    confidence_pct: 'Nivel de confianza',
    confidence_band: 'Banda de confianza',
    domain: 'Dominio',
    domains: 'Dominios relacionados',
    coexistence_key: 'Relación entre dominios',
    coexistence_level: 'Nivel de coexistencia',
    combined_risk_score: 'Riesgo combinado',
    result_summary: 'Resultado orientativo',
    operational_class: 'Clasificación operativa',
    operational_caveat: 'Aclaración operativa',
    mode: 'Modo',
    role: 'Rol',
    status: 'Estado',
    response_type: 'Tipo de respuesta',
    source_module: 'Módulo de origen',
    source_path: 'Pantalla o ruta de origen',
    page_size: 'Tamaño de página',
    created_at: 'Fecha de creación',
    updated_at: 'Fecha de actualización',
    generated_at: 'Fecha de generación',
    resolved_at: 'Fecha de resolución',
    expires_at: 'Vigencia',
    uses: 'Usos realizados',
    max_uses: 'Usos máximos',
    mime_type: 'Tipo de archivo',
    size_bytes: 'Tamaño del archivo',
    method: 'Método HTTP',
    path: 'Ruta técnica',
    endpoint: 'Endpoint',
    status_code: 'Código de estado',
    http_status: 'Código de estado',
    resource_id: 'ID de recurso',
    report_code: 'Código de reporte',
    issue_type: 'Tipo de reporte',
    actor: 'Actor',
    target: 'Objetivo',
    action: 'Acción',
    section: 'Sección',
    detail: 'Detalle'
};

const TECHNICAL_FIELDS = new Set([
    'id',
    'session_id',
    'questionnaire_id',
    'questionnaire_template_id',
    'questionnaire_session_id',
    'template_id',
    'mode_key',
    'model_id',
    'model_version',
    'raw',
    'payload',
    'metadata',
    'download_url',
    'file_id',
    'share_code',
    'link',
    'url',
    'shared_url',
    'shared_path',
    'public_url',
    'artifact_path',
    'request_id'
]);

const DATE_LIKE_KEYS = [
    '_at',
    'date',
    'timestamp',
    'updated',
    'created',
    'expires'
];

const PERCENT_KEYS = [
    'probability',
    'confidence_pct',
    'completion_quality_score',
    'missingness_score',
    'combined_risk_score',
    'progress_pct',
    'conversion',
    'rate',
    'score'
];

function normalizeKey(value: string) {
    return value.trim().toLowerCase();
}

function toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function toFiniteNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function isDateLikeKey(key: string) {
    const normalized = normalizeKey(key);
    return DATE_LIKE_KEYS.some((token) => normalized.includes(token));
}

function isPercentLikeKey(key: string) {
    const normalized = normalizeKey(key);
    return PERCENT_KEYS.some((token) => normalized.includes(token));
}

function isDateString(value: string) {
    if (!value || value.trim().length < 8) return false;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
}

function humanizeEnumValue(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;

    const isAllCapsEnum = /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(trimmed);
    const isSnakeCaseEnum = /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(trimmed);
    if (!isAllCapsEnum && !isSnakeCaseEnum) return trimmed;

    const tokens = trimmed
        .toLowerCase()
        .split('_')
        .map((token) => token.trim())
        .filter((token) => token.length > 0);

    if (tokens.length === 0) return trimmed;

    const sentence = tokens.join(' ');
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export function formatDateTimeEsCO(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string' || !value.trim()) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return `${parsed.toLocaleDateString('es-CO')} ${parsed.toLocaleTimeString('es-CO')}`;
}

export function formatDateEsCO(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string' || !value.trim()) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed.toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

export function formatBooleanEs(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'boolean') return fallback;
    return value ? 'Sí' : 'No';
}

export function formatNumberEs(value: unknown, options: FormatNumberOptions = {}, fallback = FALLBACK_VALUE) {
    const number = toFiniteNumber(value);
    if (number === null) return fallback;
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: options.minimumFractionDigits ?? 0,
        maximumFractionDigits: options.maximumFractionDigits ?? 2
    }).format(number);
}

export function formatPercentEs(value: unknown, options: FormatPercentOptions = {}, fallback = FALLBACK_VALUE) {
    const number = toFiniteNumber(value);
    if (number === null) return fallback;
    const mode = options.mode ?? 'auto';
    const base =
        mode === 'fraction'
            ? number
            : mode === 'percent'
                ? number / 100
                : number <= 1
                    ? number
                    : number / 100;
    return new Intl.NumberFormat('es-CO', {
        style: 'percent',
        maximumFractionDigits: options.maximumFractionDigits ?? 1
    }).format(base);
}

export function formatFileSizeEs(value: unknown, fallback = FALLBACK_VALUE) {
    const bytes = toFiniteNumber(value);
    if (bytes === null || bytes < 0) return fallback;
    if (bytes < 1024) return `${Math.trunc(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getModeLabel(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string') return fallback;
    const normalized = normalizeKey(value);
    return MODE_LABELS[normalized] ?? value;
}

export function getRoleLabel(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string') return fallback;
    const normalized = normalizeKey(value);
    const uppercaseMapKey = `${normalized}_upper`;
    return ROLE_LABELS[normalized] ?? ROLE_LABELS[uppercaseMapKey] ?? value;
}

export function getStatusLabel(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string') return fallback;
    const normalized = normalizeKey(value);
    return STATUS_LABELS[normalized] ?? value;
}

export function getResponseTypeLabel(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string') return fallback;
    const normalized = normalizeKey(value);
    return RESPONSE_TYPE_LABELS[normalized] ?? value;
}

export function getDomainLabel(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string') return fallback;
    const normalized = normalizeKey(value);
    return DOMAIN_LABELS[normalized] ?? value;
}

export function getAlertLevelLabel(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string') return fallback;
    const normalized = normalizeKey(value);
    return ALERT_LEVEL_LABELS[normalized] ?? value;
}

export function getConfidenceBandLabel(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string') return fallback;
    const normalized = normalizeKey(value);
    return CONFIDENCE_BAND_LABELS[normalized] ?? value;
}

export function getCoexistenceLevelLabel(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string') return fallback;
    const normalized = normalizeKey(value);
    return COEXISTENCE_LEVEL_LABELS[normalized] ?? humanizeEnumValue(value);
}

export function getOperationalClassLabel(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string') return fallback;
    const normalized = normalizeKey(value);
    return OPERATIONAL_CLASS_LABELS[normalized] ?? humanizeEnumValue(value);
}

export function getMimeTypeLabel(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string') return fallback;
    const normalized = normalizeKey(value);
    return MIME_LABELS[normalized] ?? value;
}

export function getSourceModuleLabel(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string' || !value.trim()) return fallback;
    const normalized = normalizeKey(value);
    return SOURCE_MODULE_LABELS[normalized] ?? value;
}

export function getHttpMethodLabel(value: unknown, fallback = FALLBACK_VALUE) {
    if (typeof value !== 'string' || !value.trim()) return fallback;
    const normalized = normalizeKey(value);
    return HTTP_METHOD_LABELS[normalized] ?? value.toUpperCase();
}

export function humanizeTechnicalKey(key: string) {
    const normalized = normalizeKey(key);
    if (KEY_LABELS[normalized]) return KEY_LABELS[normalized];
    const prepared = key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_\-.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!prepared) return key;
    return prepared.charAt(0).toUpperCase() + prepared.slice(1);
}

export function shouldHideTechnicalField(key: string, extraHiddenFields: string[] = []) {
    const normalized = normalizeKey(key);
    if (TECHNICAL_FIELDS.has(normalized)) return true;
    if (extraHiddenFields.some((field) => normalizeKey(field) === normalized)) return true;
    return false;
}

export function formatNaturalValue(
    key: string,
    value: unknown,
    options: { fallback?: string; includeTechnical?: boolean; depth?: number } = {}
): string {
    const fallback = options.fallback ?? FALLBACK_VALUE;
    const depth = options.depth ?? 0;

    if (value === null || value === undefined) return fallback;
    if (typeof value === 'boolean') return formatBooleanEs(value, fallback);

    const normalizedKey = normalizeKey(key);

    if (normalizedKey === 'mode') return getModeLabel(value, fallback);
    if (normalizedKey === 'role' || normalizedKey === 'reporter_role') return getRoleLabel(value, fallback);
    if (normalizedKey === 'status') return getStatusLabel(value, fallback);
    if (normalizedKey === 'response_type') return getResponseTypeLabel(value, fallback);
    if (normalizedKey === 'domain') return getDomainLabel(value, fallback);
    if (normalizedKey === 'alert_level') return getAlertLevelLabel(value, fallback);
    if (normalizedKey === 'confidence_band') return getConfidenceBandLabel(value, fallback);
    if (normalizedKey === 'coexistence_level') return getCoexistenceLevelLabel(value, fallback);
    if (normalizedKey === 'operational_class') return getOperationalClassLabel(value, fallback);
    if (normalizedKey === 'mime_type') return getMimeTypeLabel(value, fallback);
    if (normalizedKey === 'source_module') return getSourceModuleLabel(value, fallback);
    if (normalizedKey === 'method') return getHttpMethodLabel(value, fallback);
    if (normalizedKey === 'size_bytes') return formatFileSizeEs(value, fallback);
    if (normalizedKey === 'source_path') return typeof value === 'string' && value.trim() ? value.trim() : fallback;
    if (normalizedKey === 'probability') return formatPercentEs(value, { mode: 'auto' }, fallback);
    if (normalizedKey === 'combined_risk_score') return formatPercentEs(value, { mode: 'auto' }, fallback);
    if (normalizedKey === 'confidence_pct') return formatPercentEs(value, { mode: 'percent' }, fallback);
    if (normalizedKey === 'completion_quality_score') return formatPercentEs(value, { mode: 'auto' }, fallback);
    if (normalizedKey === 'missingness_score') return formatPercentEs(value, { mode: 'auto' }, fallback);
    if (normalizedKey === 'progress_pct') return formatPercentEs(value, { mode: 'percent' }, fallback);
    if (normalizedKey.includes('conversion')) return formatPercentEs(value, { mode: 'auto' }, fallback);

    if (typeof value === 'number') {
        if (isPercentLikeKey(normalizedKey)) return formatPercentEs(value, { mode: 'auto' }, fallback);
        return formatNumberEs(value, { maximumFractionDigits: 2 }, fallback);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return fallback;
        if (isDateLikeKey(normalizedKey) || isDateString(trimmed)) {
            const dateTime = formatDateTimeEsCO(trimmed, '');
            if (dateTime) return dateTime;
        }
        if (normalizedKey === 'needs_professional_review') {
            const asBool = normalizeKey(trimmed);
            if (asBool === 'true' || asBool === 'false') return asBool === 'true' ? 'Sí' : 'No';
        }
        if (normalizedKey === 'domain') return getDomainLabel(trimmed, fallback);
        if (normalizedKey === 'alert_level') return getAlertLevelLabel(trimmed, fallback);
        if (normalizedKey === 'confidence_band') return getConfidenceBandLabel(trimmed, fallback);
        if (normalizedKey === 'coexistence_level') return getCoexistenceLevelLabel(trimmed, fallback);
        if (normalizedKey === 'operational_class') return getOperationalClassLabel(trimmed, fallback);
        if (normalizedKey === 'coexistence_key') {
            return trimmed
                .split('+')
                .map((segment) => getDomainLabel(segment, segment))
                .join(' + ');
        }
        if (
            (trimmed.includes('_') || /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(trimmed)) &&
            !normalizedKey.includes('id') &&
            !normalizedKey.includes('path') &&
            !normalizedKey.includes('url') &&
            !normalizedKey.includes('code')
        ) {
            return humanizeEnumValue(trimmed);
        }
        return trimmed;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return fallback;
        const mapped = value
            .map((item) => formatNaturalValue(key, item, { ...options, depth: depth + 1 }))
            .filter((item) => item !== fallback);
        if (mapped.length === 0) return fallback;
        return mapped.join(', ');
    }

    const record = toRecord(value);
    if (!record) return fallback;
    if (depth >= 2) return 'Información disponible';

    const nestedRows = buildSafeDisplayRows(record, {
        includeTechnical: Boolean(options.includeTechnical),
        includeEmpty: false,
        maxRows: 3
    });

    if (nestedRows.length === 0) return 'Información disponible';

    return nestedRows
        .map((row) => `${row.label}: ${row.value}`)
        .join(' · ');
}

function sortedEntries(record: Record<string, unknown>, prioritizedFields: string[]) {
    if (prioritizedFields.length === 0) return Object.entries(record);
    const ranking = new Map(prioritizedFields.map((field, index) => [normalizeKey(field), index]));
    return Object.entries(record).sort(([left], [right]) => {
        const leftRank = ranking.get(normalizeKey(left));
        const rightRank = ranking.get(normalizeKey(right));
        if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
        if (leftRank !== undefined) return -1;
        if (rightRank !== undefined) return 1;
        return left.localeCompare(right);
    });
}

export function buildSafeDisplayRows(
    value: unknown,
    options: BuildSafeRowsOptions = {}
): SafeDisplayRow[] {
    const record = toRecord(value);
    if (!record) return [];

    const includeTechnical = options.includeTechnical ?? false;
    const includeEmpty = options.includeEmpty ?? false;
    const prioritizedFields = options.prioritizedFields ?? [];
    const customLabels = options.customLabels ?? {};

    const rows = sortedEntries(record, prioritizedFields)
        .filter(([key]) => includeTechnical || !shouldHideTechnicalField(key, options.hiddenFields))
        .map(([key, entryValue]) => {
            const normalized = normalizeKey(key);
            const valueText = formatNaturalValue(normalized, entryValue, {
                includeTechnical
            });
            const label = customLabels[key] ?? customLabels[normalized] ?? humanizeTechnicalKey(normalized);
            return {
                key,
                label,
                value: valueText,
                technical: shouldHideTechnicalField(key)
            } satisfies SafeDisplayRow;
        })
        .filter((row) => includeEmpty || row.value !== FALLBACK_VALUE);

    if (typeof options.maxRows === 'number' && options.maxRows > 0) {
        return rows.slice(0, options.maxRows);
    }

    return rows;
}

function extractApiErrorPayloadValue(payload: unknown, keys: string[]) {
    const record = toRecord(payload);
    if (!record) return null;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return null;
}

export function mapApiErrorToUserMessage(
    error: unknown,
    fallbackMessage: string,
    customStatusMessages: Partial<Record<number, string>> = {}
) {
    if (!(error instanceof ApiError)) return fallbackMessage;

    const status = error.status;
    const byStatus: Record<number, string> = {
        400: 'La solicitud no se pudo procesar. Verifica la información ingresada.',
        401: 'Tu sesión expiró. Inicia sesión de nuevo para continuar.',
        403: 'No tienes permisos para realizar esta acción.',
        404: 'No se encontró la información solicitada.',
        410: 'Este recurso ya no está disponible.',
        429: 'Hay demasiadas solicitudes en este momento. Intenta nuevamente en unos segundos.',
        500: 'Ocurrió un error interno del servicio. Intenta nuevamente más tarde.'
    };

    if (customStatusMessages[status]) return customStatusMessages[status] as string;
    if (byStatus[status]) return byStatus[status];
    if (status >= 500) return byStatus[500];

    const fallbackFromPayload = extractApiErrorPayloadValue(error.payload, ['msg', 'message', 'detail']);
    if (fallbackFromPayload && !['validation_error', 'request_failed', 'error'].includes(normalizeKey(fallbackFromPayload))) {
        return fallbackFromPayload;
    }

    return fallbackMessage;
}

export function getApiErrorTechnicalDetail(error: unknown) {
    if (!(error instanceof ApiError)) return null;
    const message = extractApiErrorPayloadValue(error.payload, ['error', 'code', 'msg', 'message', 'detail']);
    return message ? `Código técnico: ${message}` : `Código técnico: HTTP ${error.status}`;
}

export function buildReferenceLabel(value: unknown, prefix: string) {
    if (typeof value !== 'string' || !value.trim()) return FALLBACK_VALUE;
    return `${prefix}: ${value.trim()}`;
}
