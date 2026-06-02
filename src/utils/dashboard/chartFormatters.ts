import { formatDate, formatDateTime, normalizeBackendText } from '../questionnaires/presentation';

export function formatChartCount(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '--';
    return new Intl.NumberFormat('es-CO').format(numeric);
}

export function formatChartPercent(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '--';
    return `${new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    }).format(numeric)} %`;
}

export function formatChartDate(value: unknown) {
    return formatDate(value);
}

export function formatChartDateTime(value: unknown) {
    return formatDateTime(value);
}

export function formatShortDate(value: unknown) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return 'Sin actividad registrada';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return 'Sin actividad registrada';
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short'
    }).format(parsed);
}

export function formatShortDateTime(value: unknown) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return 'Sin actividad registrada';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return 'Sin actividad registrada';
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).format(parsed);
}

function parseMonthValue(raw: string) {
    if (/^\d{4}-\d{2}$/.test(raw)) {
        const [year, month] = raw.split('-').map(Number);
        if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
            return new Date(year, month - 1, 1);
        }
        return null;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatMonthLabel(value: unknown) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return 'Sin fecha';
    const parsed = parseMonthValue(raw);
    if (!parsed) return normalizeBackendText(raw, 'Sin fecha');
    return new Intl.DateTimeFormat('es-CO', {
        month: 'short',
        year: 'numeric'
    }).format(parsed).replace(/\./g, '');
}

export function truncateChartLabel(value: string, limit = 28) {
    const normalized = normalizeBackendText(value, '');
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}
