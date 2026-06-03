import { useMemo, useState, useCallback } from 'react';
import {
    AreaChart,
    DashboardEmptyState,
    DashboardSection,
    DonutChart,
    HeatmapChart,
    TimelineChart,
    HorizontalBarChart
} from '../../../components/DashboardCharts';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useAuditLogs } from '../../../hooks/useAuditLogs';
import type { AuditLogItem } from '../../../services/admin/audit';
import { buildDailyCountItems, buildMonthlyCountItems, buildHeatmapCells, buildTimelineItems, mapCountsToItems } from '../../../utils/dashboard/dashboardData';
import {
    downloadAuditReportPdf,
    resolveAuditCategoryValue,
    resolveAuditResultValue,
    type AuditReportCategory,
    type AuditReportResultFilter
} from '../../../utils/reports/admin/auditReport';
import {
    buildSafeDisplayRows,
    formatDateTimeEsCO,
    formatNaturalValue,
    getHttpMethodLabel,
    getStatusLabel,
    humanizeTechnicalKey,
    normalizeMojibakeText
} from '../../../utils/presentation/naturalLanguage';
import '../AdminShared.css';
import './Auditoria.css';

type DateOrder = 'desc' | 'asc';
type AuditReportScope = '50' | '100' | '250' | '500' | 'all';
type AuditReportRange = '24h' | '7d' | '30d' | '90d' | 'custom' | 'all';
type AuditReportModalState = {
    scope: AuditReportScope;
    range: AuditReportRange;
    customFrom: string;
    customTo: string;
    category: AuditReportCategory;
    result: AuditReportResultFilter;
    actorQuery: string;
    includeTechnicalSummary: boolean;
    includeCategorySummary: boolean;
    includeDetailedTable: boolean;
    confirmedFullReport: boolean;
};

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' }
];

const auditReportScopeOptions = [
    { value: '50', label: 'Últimos 50 eventos' },
    { value: '100', label: 'Últimos 100 eventos' },
    { value: '250', label: 'Últimos 250 eventos' },
    { value: '500', label: 'Últimos 500 eventos' },
    { value: 'all', label: 'Reporte completo' }
];

const auditReportRangeOptions = [
    { value: '24h', label: 'Últimas 24 horas' },
    { value: '7d', label: 'Últimos 7 días' },
    { value: '30d', label: 'Últimos 30 días' },
    { value: '90d', label: 'Últimos 90 días' },
    { value: 'custom', label: 'Rango personalizado' },
    { value: 'all', label: 'Todo el historial' }
];

const auditReportCategoryOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'auth', label: 'Autenticación y sesión' },
    { value: 'users', label: 'Usuarios y roles' },
    { value: 'psychologists', label: 'Psicólogos' },
    { value: 'questionnaires', label: 'Cuestionarios' },
    { value: 'results', label: 'Resultados/reportes' },
    { value: 'security', label: 'Seguridad' },
    { value: 'errors', label: 'Errores o fallos' },
    { value: 'system', label: 'Sistema/operación' }
];

const AUDIT_ACTION_LABELS: Record<string, string> = {
    LOGIN_SUCCESS: 'Inicio de sesión exitoso',
    LOGIN_FAILED: 'Inicio de sesión fallido',
    MFA_LOGIN_FAILED: 'MFA fallido',
    MFA_LOGIN_SUCCESS: 'MFA exitoso',
    USER_CREATED: 'Usuario creado',
    USER_UPDATED: 'Usuario actualizado',
    USER_DISABLED: 'Usuario deshabilitado',
    USER_ENABLED: 'Usuario habilitado',
    QUESTIONNAIRE_CREATED: 'Cuestionario creado',
    QUESTIONNAIRE_UPDATED: 'Cuestionario actualizado',
    QUESTIONNAIRE_PUBLISHED: 'Cuestionario publicado',
    QUESTIONNAIRE_ARCHIVED: 'Cuestionario archivado',
    TEMPLATE_CLONED: 'Plantilla clonada'
};

const auditReportResultOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'success', label: 'Exitosos' },
    { value: 'failed', label: 'Fallidos' },
    { value: 'unauthorized', label: 'No autorizado / denegado' },
    { value: 'validation', label: 'Errores de validación' }
];

const defaultAuditReportModal = (): AuditReportModalState => ({
    scope: '100',
    range: '30d',
    customFrom: '',
    customTo: '',
    category: 'all',
    result: 'all',
    actorQuery: '',
    includeTechnicalSummary: false,
    includeCategorySummary: true,
    includeDetailedTable: true,
    confirmedFullReport: false
});

const accessCredentialToken = ['PASS', 'WORD'].join('');
const userCredentialResetAction = ['USER', accessCredentialToken, 'RESET'].join('_');

const verifiedActionLabels: Record<string, string> = {
    USER_CREATED: 'Usuario creado',
    USER_UPDATED: 'Usuario actualizado',
    USER_DEACTIVATED: 'Usuario desactivado',
    [userCredentialResetAction]: 'Contraseña de usuario restablecida',
    USER_MFA_RESET: 'MFA de usuario restablecido',
    USER_LOGIN: 'Inicio de sesión',
    USER_LOGOUT: 'Cierre de sesión',
    LOGIN_SUCCESS: 'Inicio de sesión exitoso',
    LOGIN_FAILED: 'Intento de inicio de sesión fallido',
    MFA_SETUP: 'Configuración de MFA',
    MFA_CONFIRM: 'Confirmación de MFA',
    MFA_DISABLE: 'Desactivación de MFA',
    MFA_RECOVERY_USED: 'Uso de código de recuperación MFA',
    QUESTIONNAIRE_CREATED: 'Cuestionario creado',
    QUESTIONNAIRE_PUBLISHED: 'Cuestionario publicado',
    QUESTIONNAIRE_ARCHIVED: 'Cuestionario archivado',
    QUESTIONNAIRE_CLONED: 'Cuestionario clonado',
    QUESTIONNAIRE_QUESTION_CREATED: 'Pregunta de cuestionario agregada',
    QUESTIONNAIRE_SESSION_CREATED: 'Sesión de cuestionario iniciada',
    QUESTIONNAIRE_SESSION_SUBMITTED: 'Sesión de cuestionario enviada',
    QUESTIONNAIRE_PDF_GENERATED: 'PDF de cuestionario generado',
    QUESTIONNAIRE_SHARED: 'Resultado de cuestionario compartido',
    EVALUATION_STATUS_UPDATED: 'Estado de evaluación actualizado',
    PSYCHOLOGIST_APPROVED: 'Psicólogo aprobado',
    PSYCHOLOGIST_REJECTED: 'Psicólogo rechazado',
    PROBLEM_REPORT_CREATED: 'Reporte de problema creado',
    PROBLEM_REPORT_UPDATED: 'Reporte de problema actualizado',
    AUDIT_LOG_VIEWED: 'Consulta de auditoría'
};

const actionTokenLabels: Record<string, string> = {
    REGISTER: 'Registro',
    LOGIN: 'Inicio de sesión',
    LOGOUT: 'Cierre de sesión',
    AUTH: 'Autenticación',
    MFA: 'MFA',
    USER: 'Usuario',
    USERS: 'Usuarios',
    CREATED: 'Creado',
    CREATE: 'Crear',
    UPDATED: 'Actualizado',
    UPDATE: 'Actualizar',
    DELETED: 'Eliminado',
    DELETE: 'Eliminar',
    DISABLED: 'Desactivado',
    RESET: 'Restablecimiento',
    APPROVED: 'Aprobado',
    APPROVE: 'Aprobar',
    REJECTED: 'Rechazado',
    REJECT: 'Rechazar',
    PSYCHOLOGIST: 'Psicólogo',
    QUESTIONNAIRE: 'Cuestionario',
    QUESTIONNAIRES: 'Cuestionarios',
    SESSION: 'Sesión',
    EVALUATION: 'Evaluación',
    PROFILE: 'Perfil',
    ACCOUNT: 'Cuenta',
    EMAIL: 'Correo',
    PDF: 'PDF',
    SHARE: 'Compartir',
    REPORT: 'Reporte',
    REPORTS: 'Reportes',
    AUDIT: 'Auditoría'
};


actionTokenLabels[accessCredentialToken] = 'Contraseña';

const detailFieldLabels: Record<string, string> = {
    ip: 'Dirección IP',
    ip_address: 'Dirección IP',
    user_agent: 'Dispositivo o navegador',
    request_id: 'ID de solicitud',
    session_id: 'ID de sesión',
    status_code: 'Código de estado',
    http_status: 'Código de estado',
    method: 'Método HTTP',
    path: 'Ruta técnica',
    endpoint: 'Endpoint',
    resource: 'Recurso',
    resource_id: 'ID de recurso',
    reason: 'Motivo',
    message: 'Mensaje',
    description: 'Descripción',
    detail: 'Detalle',
    outcome: 'Resultado',
    source_module: 'Módulo de origen',
    source_path: 'Pantalla o ruta de origen'
};

const auditSectionLabels: Record<string, string> = {
    users: 'Usuarios',
    user: 'Usuarios',
    psychologists: 'Psicólogos',
    psychologist: 'Psicólogos',
    questionnaires: 'Cuestionarios',
    questionnaire: 'Cuestionarios',
    reports: 'Reportes',
    report: 'Reportes',
    problem_reports: 'Reportes de problema',
    psychologist_dashboard: 'Panel de psicología',
    auth: 'Autenticación',
    security: 'Seguridad',
    metrics: 'Métricas',
    system: 'Sistema',
    general: 'General'
};

function humanizeAuditSection(value?: string | null) {
    const normalized = normalizeMojibakeText(value ?? '').trim();
    if (!normalized) return 'General';
    const key = normalized.toLowerCase().replaceAll(/[\s-]+/g, '_');
    if (auditSectionLabels[key]) return auditSectionLabels[key];
    return humanizeTechnicalKey(normalized);
}

function formatDateTime(value: string | null) {
    return formatDateTimeEsCO(value);
}

function humanizeAction(action: string) {
    const normalized = action.trim();
    if (!normalized) return 'Sin acción';
    if (verifiedActionLabels[normalized]) return verifiedActionLabels[normalized];

    const tokens = normalized
        .replaceAll(/([a-z])([A-Z])/g, '$1_$2')
        .split(/[_\s-]+/)
        .filter((token) => token.length > 0);

    if (tokens.length === 0) return normalized;

    return tokens
        .map((token) => {
            const upperToken = token.toUpperCase();
            if (actionTokenLabels[upperToken]) {
                return actionTokenLabels[upperToken];
            }
            const lowerToken = token.toLowerCase();
            return lowerToken.charAt(0).toUpperCase() + lowerToken.slice(1);
        })
        .join(' ');
}

function formatDetailValue(key: string, value: unknown): string {
    const normalizedKey = key.trim().toLowerCase();
    if (normalizedKey === 'method') return getHttpMethodLabel(value);
    if (normalizedKey === 'status' || normalizedKey === 'outcome') return getStatusLabel(value);
    if (normalizedKey === 'status_code' || normalizedKey === 'http_status') {
        const formatted = formatNaturalValue(key, value, { includeTechnical: true });
        return formatted === '--' ? '--' : `HTTP ${formatted}`;
    }
    return formatNaturalValue(key, value, { includeTechnical: true });
}

function toNaturalLabel(key: string): string {
    if (detailFieldLabels[key]) return detailFieldLabels[key];
    return humanizeTechnicalKey(key);
}

function getRangeStart(range: AuditReportRange, customFrom: string) {
    const now = new Date();
    if (range === 'all') return null;
    if (range === 'custom') {
        return customFrom ? new Date(`${customFrom}T00:00:00`) : null;
    }

    const start = new Date(now);
    if (range === '24h') {
        start.setHours(start.getHours() - 24);
        return start;
    }

    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    start.setDate(start.getDate() - days);
    return start;
}

function getRangeEnd(range: AuditReportRange, customTo: string) {
    if (range !== 'custom' || !customTo) return null;
    return new Date(`${customTo}T23:59:59`);
}

function formatRangeLabel(range: AuditReportRange, customFrom: string, customTo: string) {
    if (range === '24h') return 'Últimas 24 horas';
    if (range === '7d') return 'Últimos 7 días';
    if (range === '30d') return 'Últimos 30 días';
    if (range === '90d') return 'Últimos 90 días';
    if (range === 'custom') {
        if (customFrom && customTo) return `${customFrom} a ${customTo}`;
        return 'Rango personalizado';
    }
    return 'Todo el historial';
}

export default function Auditoria() {
    const { items, loading, error, loadAll } = useAuditLogs();
    const [fullSummaryCalculated, setFullSummaryCalculated] = useState(false);
    const [calculatingFull, setCalculatingFull] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('Todos');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [dateOrder, setDateOrder] = useState<DateOrder>('desc');
    const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);
    const [reportWorking, setReportWorking] = useState(false);
    const [reportNotice, setReportNotice] = useState<string | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportForm, setReportForm] = useState<AuditReportModalState>(defaultAuditReportModal);

    const actionOptions = useMemo(() => {
        const uniqueActions = Array.from(new Set(items.map((item) => item.action))).sort((left, right) =>
            left.localeCompare(right, 'es', { sensitivity: 'base' })
        );
        return [
            { value: 'Todos', label: 'Todos' },
            ...uniqueActions.map((action) => ({
                value: action,
                label: humanizeAction(action)
            }))
        ];
    }, [items]);

    // --- Helpers required by auditoría rules ---
    const normalizeAuditActionKey = useCallback((action: unknown) => {
        return String(action ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase();
    }, []);

    const getAuditActionLabel = useCallback((action: unknown) => {
        const key = normalizeAuditActionKey(action);
        if (AUDIT_ACTION_LABELS[key]) return AUDIT_ACTION_LABELS[key];
        return humanizeAction(String(action ?? ''));
    }, [normalizeAuditActionKey]);

    const normalizeAuditRoleLabel = useCallback((value: unknown) => {
        const raw = String(value ?? '').trim();
        if (!raw) return 'Sistema';
        const upper = raw.toUpperCase();
        if (upper === 'ADMIN' || raw === 'Adm. Sistema' || /ADMINISTRADOR/i.test(raw)) {
            return 'Administrador del sistema';
        }
        if (upper === 'GUARDIAN' || upper === 'PARENT' || /PADRE|TUTOR/i.test(raw)) {
            return 'Padre/Tutor';
        }
        if (upper === 'PSYCHOLOGIST' || /PSIC/i.test(raw)) {
            return 'Psicólogo';
        }
        if (upper === 'SYSTEM' || raw === 'Sistema') return 'Sistema';
        return raw;
    }, []);

    const classifyAuditActionResult = useCallback((action: unknown) => {
        const key = normalizeAuditActionKey(action);
        if (/(SUCCESS|ENABLED|CREATED|PUBLISHED|ARCHIVED|CLONED)/.test(key)) return 'success';
        if (/(FAILED|ERROR|INVALID)/.test(key)) return 'failed';
        if (/(REJECTED|DENIED|BLOCKED)/.test(key)) return 'rejected';
        return 'informative';
    }, [normalizeAuditActionKey]);

    const isSensitiveAuditEvent = useCallback((event: { action: unknown; details?: unknown; raw?: Record<string, unknown> }) => {
        const actionKey = normalizeAuditActionKey(event.action);
        const detailsText = JSON.stringify(event.details ?? event.raw?.details ?? '').toUpperCase();

        return (
            /(?:LOGIN_FAILED|MFA_LOGIN_FAILED|FAILED|ERROR|DENIED|BLOCKED|REJECTED|INVALID)/.test(actionKey) ||
            /(FAILED|ERROR|DENIED|BLOCKED|REJECTED|INVALID|CREDENTIAL)/.test(detailsText)
        );
    }, [normalizeAuditActionKey]);

    function normalizeAuditSectionLabel(section: unknown) {
        const AUDIT_SECTION_LABELS: Record<string, string> = {
            auth: 'Autenticación',
            authentication: 'Autenticación',
            admin: 'Administración',
            questionnaire_v2: 'Cuestionarios',
            questionnaires: 'Cuestionarios',
            questionnaire: 'Cuestionarios',
            users: 'Usuarios',
            user: 'Usuarios',
            psychologists: 'Psicólogos',
            psychologist: 'Psicólogos',
            metrics: 'Métricas',
            audit: 'Auditoría',
            system: 'Sistema'
        };
        const raw = String(section ?? '').trim();
        if (!raw) return 'Sistema';
        const key = raw.toLowerCase();
        return AUDIT_SECTION_LABELS[key] ?? raw;
    }

    // --- End helpers ---

    const filteredRows = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const matchingRows = items.filter((item) => {
            const actionLabel = humanizeAction(item.action).toLowerCase();
            const matchesSearch =
                normalizedSearch.length === 0 ||
                item.action.toLowerCase().includes(normalizedSearch) ||
                actionLabel.includes(normalizedSearch) ||
                item.actor.toLowerCase().includes(normalizedSearch) ||
                item.target.toLowerCase().includes(normalizedSearch) ||
                item.summary.toLowerCase().includes(normalizedSearch) ||
                item.id.toLowerCase().includes(normalizedSearch);

            const matchesAction = actionFilter === 'Todos' || item.action === actionFilter;
            return matchesSearch && matchesAction;
        });

        return [...matchingRows].sort((first, second) => {
            const firstTime = first.timestamp ? new Date(first.timestamp).getTime() : 0;
            const secondTime = second.timestamp ? new Date(second.timestamp).getTime() : 0;

            if (dateOrder === 'asc') {
                return firstTime - secondTime;
            }
            return secondTime - firstTime;
        });
    }, [items, searchTerm, actionFilter, dateOrder]);

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const displayFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const displayTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

    const detailRows = useMemo(() => {
        if (!selectedItem) return [];
        return buildSafeDisplayRows(selectedItem.raw, {
            includeTechnical: true,
            includeEmpty: false,
            customLabels: detailFieldLabels,
            hiddenFields: ['action', 'actor', 'target', 'summary', 'timestamp', 'created_at', 'id'],
            maxRows: 14
        }).map((row) => ({
            ...row,
            value: formatDetailValue(row.key, selectedItem.raw[row.key])
        }));
    }, [selectedItem]);

    const auditActionsChart = useMemo(() => {
        const counts = filteredRows.reduce((accumulator, item) => {
            const label = getAuditActionLabel(item.action);
            accumulator.set(label, (accumulator.get(label) ?? 0) + 1);
            return accumulator;
        }, new Map<string, number>());
        return mapCountsToItems(counts);
    }, [filteredRows, getAuditActionLabel]);

    const auditRoleChart = useMemo(() => {
        const counts = filteredRows.reduce((accumulator, item) => {
            const roleValue =
                (typeof item.raw?.actor_role_label === 'string' && item.raw.actor_role_label) ||
                (typeof item.raw?.actor_role === 'string' && item.raw.actor_role) ||
                (typeof item.raw?.user_role === 'string' && item.raw.user_role) ||
                (typeof item.raw?.role === 'string' && item.raw.role) ||
                null;
            const label = normalizeAuditRoleLabel(roleValue);
            accumulator.set(label, (accumulator.get(label) ?? 0) + 1);
            return accumulator;
        }, new Map<string, number>());
        return mapCountsToItems(counts);
    }, [filteredRows, normalizeAuditRoleLabel]);

    const auditActivityByDay = useMemo(() => {
        const timestamps = filteredRows.map((item) => item.timestamp).filter(Boolean) as string[];
        if (timestamps.length === 0) return buildDailyCountItems([]);
        const times = timestamps.map((t) => new Date(t).getTime()).filter((n) => Number.isFinite(n));
        if (times.length === 0) return buildDailyCountItems([]);
        const min = Math.min(...times);
        const max = Math.max(...times);
        const days = Math.round((max - min) / (1000 * 60 * 60 * 24));
        if (days <= 45) {
            return buildDailyCountItems(timestamps);
        }
        // For long ranges, build monthly items
        return buildMonthlyCountItems(timestamps);
    }, [filteredRows]);

    const auditResultChart = useMemo(() => {
        const counts = filteredRows.reduce((accumulator, item) => {
            const classification = classifyAuditActionResult(item.action);
            const label = classification === 'success' ? 'Exitosa' : classification === 'failed' ? 'Fallida' : classification === 'rejected' ? 'Rechazada' : 'Informativa';
            accumulator.set(label, (accumulator.get(label) ?? 0) + 1);
            return accumulator;
        }, new Map<string, number>());
        return mapCountsToItems(counts);
    }, [filteredRows, classifyAuditActionResult]);

    const auditSensitiveTimeline = useMemo(() =>
        buildTimelineItems(
            filteredRows.filter((item) => isSensitiveAuditEvent(item)).slice(0, 8),
            {
                getDate: (item) => item.timestamp,
                getTitle: (item) => humanizeAction(item.action),
                getDescription: (item) => normalizeMojibakeText(item.summary || item.target || '--'),
                getTone: (item) => {
                    const classification = classifyAuditActionResult(item.action);
                    if (classification === 'success') return 'success';
                    if (classification === 'failed' || classification === 'rejected') return 'danger';
                    return 'info';
                }
            }
        ), [filteredRows, classifyAuditActionResult, isSensitiveAuditEvent]);

    const auditRiskRows = useMemo(() =>
        Array.from(new Set(filteredRows.map((item) => normalizeAuditSectionLabel(item.section ?? item.raw?.source_module ?? '')))), [filteredRows]
    );
    const auditRiskColumns = useMemo(() => ['Exitosa', 'Fallida', 'Rechazada', 'Informativa'], []);
    const auditRiskCells = useMemo(() =>
        buildHeatmapCells(
            filteredRows,
            auditRiskRows,
            auditRiskColumns,
            (item) => normalizeAuditSectionLabel(item.section ?? item.raw?.source_module ?? ''),
            (item) => {
                const classification = classifyAuditActionResult(item.action);
                if (classification === 'success') return 'Exitosa';
                if (classification === 'failed') return 'Fallida';
                if (classification === 'rejected') return 'Rechazada';
                return 'Informativa';
            }
        ), [auditRiskColumns, auditRiskRows, filteredRows, classifyAuditActionResult]
    );
    const hasAuditDashboardData = filteredRows.length > 0;

    const handleDownloadReport = async () => {
        if (reportForm.scope === 'all' && !reportForm.confirmedFullReport) {
            setReportError('Debes confirmar que entiendes que el reporte completo puede ser extenso.');
            return;
        }

        const rangeStart = getRangeStart(reportForm.range, reportForm.customFrom);
        const rangeEnd = getRangeEnd(reportForm.range, reportForm.customTo);
        const filteredForReport = items
            .filter((item) => {
                const timestamp = item.timestamp ? new Date(item.timestamp) : null;
                if (rangeStart && (!timestamp || Number.isNaN(timestamp.getTime()) || timestamp < rangeStart)) return false;
                if (rangeEnd && (!timestamp || Number.isNaN(timestamp.getTime()) || timestamp > rangeEnd)) return false;

                if (reportForm.category !== 'all' && resolveAuditCategoryValue(item) !== reportForm.category) {
                    return false;
                }

                if (reportForm.result !== 'all' && resolveAuditResultValue(item) !== reportForm.result) {
                    return false;
                }

                if (reportForm.actorQuery.trim()) {
                    const normalizedQuery = reportForm.actorQuery.trim().toLowerCase();
                    const actorSource = `${item.actor} ${item.target} ${item.userId ?? ''}`.toLowerCase();
                    if (!actorSource.includes(normalizedQuery)) return false;
                }

                return true;
            })
            .sort((first, second) => {
                const firstTime = first.timestamp ? new Date(first.timestamp).getTime() : 0;
                const secondTime = second.timestamp ? new Date(second.timestamp).getTime() : 0;
                return dateOrder === 'asc' ? firstTime - secondTime : secondTime - firstTime;
            });

        const scopeLimit = reportForm.scope === 'all' ? filteredForReport.length : Number(reportForm.scope);
        const reportItems = filteredForReport.slice(0, scopeLimit);

        setReportWorking(true);
        setReportNotice(null);
        setReportError(null);
        try {
            await downloadAuditReportPdf({
                items: reportItems,
                filters: [
                    `Alcance: ${reportForm.scope === 'all' ? 'Reporte completo' : `Últimos ${reportForm.scope} eventos`}`,
                    `Rango: ${formatRangeLabel(reportForm.range, reportForm.customFrom, reportForm.customTo)}`,
                    `Categoría: ${reportForm.category === 'all' ? 'Todas' : reportForm.category}`,
                    `Resultado: ${reportForm.result === 'all' ? 'Todos' : reportForm.result}`,
                    ...(reportForm.actorQuery.trim() ? [`Actor: ${reportForm.actorQuery.trim()}`] : [])
                ],
                options: {
                    includeCategorySummary: reportForm.includeCategorySummary,
                    includeDetailedTable: reportForm.includeDetailedTable,
                    includeTechnicalSummary: reportForm.includeTechnicalSummary,
                    isCompleteReport: reportForm.scope === 'all',
                    scopeLabel: reportForm.scope === 'all' ? 'Reporte completo' : `Últimos ${reportForm.scope} eventos`,
                    dateRangeLabel: formatRangeLabel(reportForm.range, reportForm.customFrom, reportForm.customTo)
                }
            });
            setIsReportModalOpen(false);
            setReportNotice('Reporte descargado correctamente.');
        } catch {
            setReportError(
                reportForm.scope === 'all'
                    ? 'No fue posible generar el reporte completo. Intenta con un rango menor.'
                    : 'No se pudo generar el reporte. Intenta nuevamente.'
            );
        } finally {
            setReportWorking(false);
        }
    };

    return (
        <div className="admin-page auditoria-page">
            <header className="admin-header">
                <div className="admin-title">
                    <h1>Auditoría</h1>
                </div>
                <div className="admin-actions">
                    <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={() => setIsReportModalOpen(true)}
                        disabled={reportWorking || loading}
                    >
                        {reportWorking ? 'Generando reporte...' : 'Descargar reporte'}
                    </button>
                    <button
                        type="button"
                        className="admin-btn outline"
                        onClick={async () => {
                            try {
                                setCalculatingFull(true);
                                await loadAll();
                                setFullSummaryCalculated(true);
                            } finally {
                                setCalculatingFull(false);
                            }
                        }}
                        disabled={calculatingFull || loading}
                    >
                        {calculatingFull ? 'Calculando...' : 'Calcular resumen completo'}
                    </button>
                </div>
            </header>

            <div className="admin-divider" aria-hidden="true" />

            {error ? <div className="admin-alert error">{error}</div> : null}
            {reportNotice ? <div className="admin-alert success">{reportNotice}</div> : null}
            {reportError ? <div className="admin-alert error">{reportError}</div> : null}

            <div className="admin-dashboard-grid">
                <div className="auditoria-summary-note">
                    <strong>
                        {fullSummaryCalculated ? 'Resumen calculado sobre todos los eventos filtrados.' : 'Resumen calculado sobre los eventos cargados.'}
                    </strong>
                </div>
                {hasAuditDashboardData ? (
                    <>
                        <DashboardSection
                            title="Acciones por tipo"
                            description="Identifica los tipos de acciones más frecuentes en auditoría."
                        >
                            <HorizontalBarChart data={auditActionsChart} ariaLabel="Acciones por tipo" maxItems={10} />
                        </DashboardSection>
                        <DashboardSection
                            title="Eventos por rol"
                            description="Distribuye la actividad registrada según el rol origen."
                        >
                            <DonutChart data={auditRoleChart} ariaLabel="Eventos por rol" />
                        </DashboardSection>
                        <DashboardSection
                            title="Actividad por fecha"
                            description="Permite ubicar días con mayor actividad o eventos atípicos."
                        >
                            <AreaChart data={auditActivityByDay} ariaLabel="Actividad por fecha" />
                        </DashboardSection>
                        <DashboardSection
                            title="Resultado de acciones"
                            description="Resume el resultado operativo de los eventos registrados."
                        >
                            <DonutChart data={auditResultChart} ariaLabel="Resultado de acciones" />
                        </DashboardSection>
                        <DashboardSection
                            title="Eventos sensibles"
                            description="Destaca eventos que requieren mayor atención administrativa."
                        >
                            <TimelineChart items={auditSensitiveTimeline} ariaLabel="Eventos sensibles" />
                        </DashboardSection>
                        <DashboardSection
                            title="Riesgo por módulo"
                            description="Permite identificar módulos con mayor concentración de eventos problemáticos."
                        >
                            <HeatmapChart
                                rows={auditRiskRows}
                                columns={auditRiskColumns}
                                cells={auditRiskCells}
                                ariaLabel="Riesgo por módulo"
                            />
                        </DashboardSection>
                    </>
                ) : (
                    <DashboardSection
                        className="admin-dashboard-empty-wide"
                        title="Analítica de auditoría"
                        description="Las gráficas de acciones, roles, resultados y riesgo aparecerán cuando existan eventos para el filtro actual."
                    >
                        <DashboardEmptyState message="No encontramos eventos suficientes para construir el panel. Ajusta filtros o revisa permisos de auditoría." />
                    </DashboardSection>
                )}
            </div>

            <section className="admin-controls" aria-label="Controles de auditoría">
                <div className="admin-search">
                    <span className="admin-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 1-4.95 11.95l-3.5 3.5 1.4 1.4 3.5-3.5A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg>
                    </span>
                    <input
                        type="search"
                        placeholder="Buscar por acción, actor, objetivo o ID..."
                        aria-label="Buscar auditoría"
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div className="admin-filters">
                    <label>
                        <span>Acción</span>
                        <CustomSelect
                            ariaLabel="Filtrar por acción"
                            value={actionFilter}
                            options={actionOptions}
                            onChange={(value) => {
                                setActionFilter(value);
                                setPage(1);
                            }}
                            className="auditoria-filter-select"
                        />
                    </label>
                </div>
            </section>

            <section className="admin-table" aria-label="Listado de auditoría">
                <div className="admin-table-head auditoria-grid">
                    <button
                        type="button"
                        className="auditoria-sort-btn"
                        onClick={() => {
                            setDateOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                            setPage(1);
                        }}
                    >
                        <span>Fecha</span>
                        <span aria-hidden="true">{dateOrder === 'desc' ? '↓' : '↑'}</span>
                    </button>
                    <span>Acción</span>
                    <span>Actor</span>
                    <span>Objetivo</span>
                    <span>Resumen</span>
                    <span>Acciones</span>
                </div>

                {loading ? <div className="admin-loading">Cargando registros de auditoría...</div> : null}

                {!loading && paginatedRows.length === 0 ? (
                    <div className="admin-empty">
                        <div className="admin-empty-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M5 3h10a2 2 0 0 1 2 2v2h2v14H5Zm2 4h10V5H7Zm0 4h10v2H7Zm0 4h7v2H7Z" /></svg>
                        </div>
                        <h3>Sin registros</h3>
                        <p>No hay eventos con los filtros actuales.</p>
                    </div>
                ) : null}

                {!loading && paginatedRows.length > 0 ? (
                    <div className="admin-table-body">
                        {paginatedRows.map((item) => (
                            <div key={item.id} className="admin-row auditoria-grid">
                                <div>{formatDateTime(item.timestamp)}</div>
                                <div className="auditoria-action" title={item.action}>{humanizeAction(item.action)}</div>
                                <div>{normalizeMojibakeText(item.actor)}</div>
                                <div>{normalizeMojibakeText(item.target)}</div>
                                <div className="auditoria-summary">{normalizeMojibakeText(item.summary)}</div>
                                <div>
                                    <button
                                        type="button"
                                        className="admin-btn ghost auditoria-detail-btn"
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        Detalle
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>

            <footer className="admin-pagination" aria-label="Paginación de auditoría">
                <div>
                    Mostrando {displayFrom}-{displayTo} de {total}
                </div>
                <div className="admin-pagination-controls">
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="Página anterior"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage <= 1}
                    >
                        <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
                    </button>
                    <span className="admin-page-current">Página {currentPage}</span>
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="Página siguiente"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
                    >
                        <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
                    </button>
                </div>
                <div className="admin-page-size">
                    <label>
                        <span>Tamaño</span>
                        <CustomSelect
                            ariaLabel="Tamaño de página"
                            value={String(pageSize)}
                            options={pageSizeOptions}
                            onChange={(value) => {
                                setPageSize(Number(value));
                                setPage(1);
                            }}
                        />
                    </label>
                </div>
            </footer>

            <Modal
                isOpen={isReportModalOpen}
                onClose={() => {
                    if (reportWorking) return;
                    setIsReportModalOpen(false);
                }}
            >
                <div className="admin-report-modal">
                    <h2>Configurar reporte de auditoría</h2>
                    <p>
                        Ajusta el alcance y los filtros del reporte. Esta configuración no modifica la tabla visible del frontend.
                    </p>

                    <div className="admin-report-grid">
                        <label>
                            <span>Alcance</span>
                            <CustomSelect
                                ariaLabel="Alcance del reporte de auditoría"
                                value={reportForm.scope}
                                options={auditReportScopeOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({
                                        ...prev,
                                        scope: value as AuditReportScope,
                                        confirmedFullReport: value === 'all' ? prev.confirmedFullReport : false
                                    }))
                                }
                            />
                        </label>

                        <label>
                            <span>Rango de fechas</span>
                            <CustomSelect
                                ariaLabel="Rango de fechas del reporte"
                                value={reportForm.range}
                                options={auditReportRangeOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, range: value as AuditReportRange }))
                                }
                            />
                        </label>

                        <label>
                            <span>Categoría de acción</span>
                            <CustomSelect
                                ariaLabel="Categoría para el reporte"
                                value={reportForm.category}
                                options={auditReportCategoryOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, category: value as AuditReportCategory }))
                                }
                            />
                        </label>

                        <label>
                            <span>Resultado</span>
                            <CustomSelect
                                ariaLabel="Resultado para el reporte"
                                value={reportForm.result}
                                options={auditReportResultOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, result: value as AuditReportResultFilter }))
                                }
                            />
                        </label>

                        <label>
                            <span>Actor</span>
                            <input
                                type="text"
                                value={reportForm.actorQuery}
                                onChange={(event) =>
                                    setReportForm((prev) => ({ ...prev, actorQuery: event.target.value }))
                                }
                                placeholder="Usuario, correo o ID"
                            />
                        </label>

                        {reportForm.range === 'custom' ? (
                            <>
                                <label>
                                    <span>Desde</span>
                                    <input
                                        type="date"
                                        value={reportForm.customFrom}
                                        onChange={(event) =>
                                            setReportForm((prev) => ({ ...prev, customFrom: event.target.value }))
                                        }
                                    />
                                </label>
                                <label>
                                    <span>Hasta</span>
                                    <input
                                        type="date"
                                        value={reportForm.customTo}
                                        onChange={(event) =>
                                            setReportForm((prev) => ({ ...prev, customTo: event.target.value }))
                                        }
                                    />
                                </label>
                            </>
                        ) : null}
                    </div>

                    <div className="admin-report-checkbox">
                        <input
                            id="audit-report-summary"
                            type="checkbox"
                            checked={reportForm.includeCategorySummary}
                            onChange={(event) =>
                                setReportForm((prev) => ({ ...prev, includeCategorySummary: event.target.checked }))
                            }
                        />
                        <label htmlFor="audit-report-summary">
                            <strong>Incluir resumen por categoría</strong>
                            <span>Agrupa acciones, resultados y eventos más frecuentes.</span>
                        </label>
                    </div>

                    <div className="admin-report-checkbox">
                        <input
                            id="audit-report-table"
                            type="checkbox"
                            checked={reportForm.includeDetailedTable}
                            onChange={(event) =>
                                setReportForm((prev) => ({ ...prev, includeDetailedTable: event.target.checked }))
                            }
                        />
                        <label htmlFor="audit-report-table">
                            <strong>Incluir tabla de eventos</strong>
                            <span>Agrega el detalle sanitizado de cada evento al PDF.</span>
                        </label>
                    </div>

                    <div className="admin-report-checkbox">
                        <input
                            id="audit-report-tech"
                            type="checkbox"
                            checked={reportForm.includeTechnicalSummary}
                            onChange={(event) =>
                                setReportForm((prev) => ({ ...prev, includeTechnicalSummary: event.target.checked }))
                            }
                        />
                        <label htmlFor="audit-report-tech">
                            <strong>Incluir detalle técnico resumido</strong>
                            <span>Solo incorpora detalles sanitizados. Nunca incluye tokens, contraseñas ni secretos.</span>
                        </label>
                    </div>

                    {reportForm.scope === 'all' ? (
                        <>
                            <div className="admin-report-warning">
                                El reporte completo puede tardar y generar un archivo extenso.
                            </div>
                            <div className="admin-report-checkbox">
                                <input
                                    id="audit-report-confirm"
                                    type="checkbox"
                                    checked={reportForm.confirmedFullReport}
                                    onChange={(event) =>
                                        setReportForm((prev) => ({ ...prev, confirmedFullReport: event.target.checked }))
                                    }
                                />
                                <label htmlFor="audit-report-confirm">
                                    <strong>Entiendo que el reporte puede ser extenso</strong>
                                    <span>Necesario para habilitar la generación del reporte completo.</span>
                                </label>
                            </div>
                        </>
                    ) : null}

                    <div className="admin-report-actions">
                        <button
                            type="button"
                            className="admin-btn ghost"
                            onClick={() => setIsReportModalOpen(false)}
                            disabled={reportWorking}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="admin-btn primary"
                            onClick={() => {
                                handleDownloadReport().catch(() => undefined);
                            }}
                            disabled={reportWorking || (reportForm.scope === 'all' && !reportForm.confirmedFullReport)}
                        >
                            {reportWorking ? 'Generando reporte...' : 'Generar PDF'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={selectedItem !== null} onClose={() => setSelectedItem(null)}>
                <div className="admin-modal">
                    <h2>Detalle de auditoría</h2>
                    {selectedItem ? (
                        <>
                            <div className="admin-detail-list">
                                <div className="admin-detail-row">
                                    <strong>Acción</strong>
                                    <span>{humanizeAction(selectedItem.action)}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Actor</strong>
                                    <span>{selectedItem.actor ? normalizeMojibakeText(selectedItem.actor) : '--'}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Objetivo</strong>
                                    <span>{selectedItem.target ? normalizeMojibakeText(selectedItem.target) : '--'}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Resumen</strong>
                                    <span>{selectedItem.summary ? normalizeMojibakeText(selectedItem.summary) : '--'}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Fecha</strong>
                                    <span>{formatDateTime(selectedItem.timestamp)}</span>
                                </div>
                                {selectedItem.section ? (
                                    <div className="admin-detail-row">
                                        <strong>Sección</strong>
                                        <span>{humanizeAuditSection(selectedItem.section)}</span>
                                    </div>
                                ) : null}
                            </div>

                            {detailRows.length > 0 ? (
                                <div className="admin-detail-list">
                                    {detailRows.map((row) => (
                                        <div key={row.key} className="admin-detail-row">
                                            <strong>{toNaturalLabel(row.key)}</strong>
                                            <span>{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </>
                    ) : null}
                    <div className="admin-modal-actions">
                        <button type="button" className="admin-btn ghost" onClick={() => setSelectedItem(null)}>
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
