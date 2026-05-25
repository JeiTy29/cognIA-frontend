import { formatDate, formatDateTime, formatPercent, normalizeBackendText } from '../questionnaires/presentation';

export function formatChartCount(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '--';
    return new Intl.NumberFormat('es-CO').format(numeric);
}

export function formatChartPercent(value: unknown) {
    return formatPercent(value);
}

export function formatChartDate(value: unknown) {
    return formatDate(value);
}

export function formatChartDateTime(value: unknown) {
    return formatDateTime(value);
}

export function formatShortDate(value: unknown) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return 'Fecha no disponible';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible';
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short'
    }).format(parsed);
}

export function formatShortDateTime(value: unknown) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return 'Fecha no disponible';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible';
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).format(parsed);
}

export function formatMonthLabel(value: unknown) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return 'Sin fecha';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return normalizeBackendText(raw, 'Sin fecha');
    return new Intl.DateTimeFormat('es-CO', {
        month: 'short',
        year: '2-digit'
    }).format(parsed);
}

export function truncateChartLabel(value: string, limit = 28) {
    const normalized = normalizeBackendText(value, '');
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}
