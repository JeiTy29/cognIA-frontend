function sanitizeFileName(value: string) {
    return value
        .replace(/[\\/:*?"<>|#]+/g, ' - ')
        .replace(/_/g, ' ')
        .replace(/\s+-\s+-\s+/g, ' - ')
        .replace(/\s+/g, ' ')
        .replace(/\s+\./g, '.')
        .trim();
}

function formatDateForFileName(date: Date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function resolveReportDate(session: { updated_at?: string | null; created_at?: string | null } | null | undefined) {
    const candidates = [session?.updated_at, session?.created_at];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            const parsed = new Date(candidate);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed;
            }
        }
    }

    return new Date();
}

function resolveModeLabel(mode: unknown) {
    const normalized = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
    if (normalized === 'short') return 'Modo corto';
    if (normalized === 'medium') return 'Modo medio';
    if (normalized === 'complete') return 'Modo completo';
    return '';
}

export function buildReportTitle(session?: { updated_at?: string | null; created_at?: string | null } | null) {
    const datePart = formatDateForFileName(resolveReportDate(session));
    return `Reporte CognIA - Resultados - ${datePart}`;
}

export function buildReportFileName(
    session?: {
        updated_at?: string | null;
        created_at?: string | null;
        mode?: string | null;
    } | null,
    extension = 'pdf'
) {
    const datePart = formatDateForFileName(resolveReportDate(session));
    const modeLabel = resolveModeLabel(session?.mode ?? '');
    const modePart = modeLabel ? ` - ${modeLabel}` : '';
    const normalizedExtension = extension.replace(/^\./, '') || 'pdf';

    return sanitizeFileName(`Reporte CognIA - Resultados${modePart} - ${datePart}.${normalizedExtension}`);
}
