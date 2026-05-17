import type { AuditLogItem } from '../../../services/admin/audit';
import { REPORT_SECTION_DESCRIPTIONS } from '../adminReportDescriptions';
import {
    addBulletList,
    addDataTable,
    addNoticeBox,
    addParagraph,
    addReportCover,
    addSectionTitle,
    createReportContext,
    saveReport
} from '../pdfBase';
import {
    buildAdminReportFileName,
    formatReportDateTime,
    formatReportNumber,
    humanizeDashboardLabel,
    sanitizeAuditDetails,
    sanitizeTechnicalValue
} from '../reportFormatting';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';

export type AuditReportCategory =
    | 'all'
    | 'auth'
    | 'users'
    | 'psychologists'
    | 'questionnaires'
    | 'results'
    | 'security'
    | 'errors'
    | 'system';

export type AuditReportResultFilter = 'all' | 'success' | 'failed' | 'unauthorized' | 'validation';

function getStringValue(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return '';
}

function getNumericValue(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string' && value.trim().length > 0) {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
    }
    return null;
}

export function resolveAuditCategoryValue(item: AuditLogItem): Exclude<AuditReportCategory, 'all'> {
    const action = item.action.toLowerCase();
    const section = (item.section ?? '').toLowerCase();
    const summary = item.summary.toLowerCase();
    const combined = `${action} ${section} ${summary}`;

    if (/(login|logout|auth|mfa|session|sesion)/.test(combined)) return 'auth';
    if (/(role|usuario|user_created|user_updated|users)/.test(combined)) return 'users';
    if (/(psychologist|psicologo|colpsic)/.test(combined)) return 'psychologists';
    if (/(questionnaire|cuestionario|template|evaluation)/.test(combined)) return 'questionnaires';
    if (/(report|resultado|pdf|share|historial)/.test(combined)) return 'results';
    if (/(forbidden|unauthorized|security|token|csrf|secure|encrypt)/.test(combined)) return 'security';
    if (/(error|failed|exception|trace|validation)/.test(combined)) return 'errors';
    return 'system';
}

export function resolveAuditCategoryLabel(value: AuditReportCategory) {
    if (value === 'auth') return 'Autenticación y sesión';
    if (value === 'users') return 'Usuarios y roles';
    if (value === 'psychologists') return 'Psicólogos';
    if (value === 'questionnaires') return 'Cuestionarios';
    if (value === 'results') return 'Resultados/reportes';
    if (value === 'security') return 'Seguridad';
    if (value === 'errors') return 'Errores o fallos';
    if (value === 'system') return 'Sistema/operación';
    return 'Todas';
}

export function resolveAuditResultValue(item: AuditLogItem): Exclude<AuditReportResultFilter, 'all'> | 'other' {
    const record = item.raw;
    const statusCode = getNumericValue(record, ['status_code', 'http_status']);
    const outcome = getStringValue(record, ['status', 'outcome', 'result', 'message']);
    const combined = `${outcome} ${item.summary}`.toLowerCase();

    if (statusCode === 401 || statusCode === 403 || /(forbidden|unauthorized|denied|denegado)/.test(combined)) {
        return 'unauthorized';
    }
    if (statusCode === 400 || statusCode === 422 || /validation|invalid|invalido/.test(combined)) {
        return 'validation';
    }
    if ((statusCode !== null && statusCode >= 200 && statusCode < 300) || /(success|ok|completed|completado|aprobado)/.test(combined)) {
        return 'success';
    }
    if ((statusCode !== null && statusCode >= 400) || /(error|failed|fallido|rechazado)/.test(combined)) {
        return 'failed';
    }
    return 'other';
}

export function resolveAuditResultLabel(value: AuditReportResultFilter | 'other') {
    if (value === 'success') return 'Exitosos';
    if (value === 'failed') return 'Fallidos';
    if (value === 'unauthorized') return 'No autorizado / denegado';
    if (value === 'validation') return 'Errores de validación';
    if (value === 'other') return 'Otros';
    return 'Todos';
}

function getAuditActor(item: AuditLogItem) {
    return item.actor || item.userId || 'No disponible';
}

function getAuditDetailSummary(item: AuditLogItem, includeTechnicalSummary: boolean) {
    if (!includeTechnicalSummary) {
        return sanitizeAuditDetails(item.summary);
    }

    const detailCandidate =
        (typeof item.raw.details === 'object' && item.raw.details) ||
        item.raw.metadata ||
        item.raw.context ||
        item.summary;
    return sanitizeAuditDetails(detailCandidate);
}

export type AuditReportPayload = {
    items: AuditLogItem[];
    filters: string[];
    options: {
        includeCategorySummary: boolean;
        includeDetailedTable: boolean;
        includeTechnicalSummary: boolean;
        isCompleteReport: boolean;
        scopeLabel: string;
        dateRangeLabel: string;
    };
};

export async function downloadAuditReportPdf(payload: AuditReportPayload) {
    if (!payload.items) {
        throw new Error('No fue posible cargar los datos principales de auditoría.');
    }

    const context = createReportContext('Reporte CognIA - Auditoría');
    const { data, failedKeys } = await loadDashboardBlocksForReport(['apiHealth', 'executiveSummary'], 12);
    const actionCounts = payload.items.reduce<Record<string, number>>((acc, item) => {
        const label = humanizeDashboardLabel(item.action);
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
    }, {});
    const topActions = Object.entries(actionCounts)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([action, count]) => `${action}: ${formatReportNumber(count)}.`);

    const categoryCounts = payload.items.reduce<Record<string, number>>((acc, item) => {
        const label = resolveAuditCategoryLabel(resolveAuditCategoryValue(item));
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
    }, {});
    const resultCounts = payload.items.reduce<Record<string, number>>((acc, item) => {
        const label = resolveAuditResultLabel(resolveAuditResultValue(item));
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
    }, {});

    addReportCover(context, {
        title: 'Reporte CognIA - Auditoría',
        subtitle: 'Consulta administrativa de eventos registrados según el alcance configurado para el reporte.',
        sectionLabel: 'Sección: Auditoría',
        generatedAt: formatReportDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatReportDateTime(new Date()) },
            { label: 'Eventos incluidos', value: formatReportNumber(payload.items.length) },
            { label: 'Alcance', value: payload.options.scopeLabel },
            { label: 'Rango', value: payload.options.dateRangeLabel }
        ]
    });

    addParagraph(
        context,
        'Este reporte administrativo resume eventos de auditoría según la configuración elegida para apoyar el seguimiento operativo y de seguridad.'
    );

    if (payload.filters.length > 0) {
        addNoticeBox(context, 'Filtros aplicados', payload.filters.join(' · '), 'info');
    }

    if (payload.options.isCompleteReport) {
        addNoticeBox(
            context,
            'Reporte completo',
            'Se solicitó un reporte amplio de auditoría. Dependiendo del volumen histórico, este documento puede ser extenso.',
            'warning'
        );
    }

    addSectionTitle(context, 'Resumen de actividad');
    addParagraph(context, REPORT_SECTION_DESCRIPTIONS.auditEvents);
    addBulletList(context, [
        `Total de eventos incluidos: ${formatReportNumber(payload.items.length)}.`,
        ...topActions
    ]);

    if (payload.options.includeCategorySummary) {
        addSectionTitle(context, 'Distribución por categoría');
        addParagraph(context, REPORT_SECTION_DESCRIPTIONS.auditActionDistribution);
        addDataTable(context, {
            title: 'Categorías frecuentes',
            head: ['Categoría', 'Total'],
            body: Object.entries(categoryCounts)
                .sort((left, right) => right[1] - left[1])
                .map(([label, count]) => [label, formatReportNumber(count)])
        });

        addDataTable(context, {
            title: 'Resultado de eventos',
            head: ['Resultado', 'Total'],
            body: Object.entries(resultCounts)
                .sort((left, right) => right[1] - left[1])
                .map(([label, count]) => [label, formatReportNumber(count)])
        });
    }

    if (payload.options.includeDetailedTable) {
        addSectionTitle(context, 'Tabla de auditoría');
        addParagraph(context, REPORT_SECTION_DESCRIPTIONS.auditTable);
        addDataTable(context, {
            title: 'Eventos incluidos',
            head: ['Fecha', 'Actor', 'Acción', 'Categoría', 'Resultado', 'Dirección IP', 'Resumen del detalle'],
            body: payload.items.map((item) => {
                const ipField =
                    typeof item.raw.ip_address === 'string'
                        ? item.raw.ip_address
                        : typeof item.raw.ip === 'string'
                            ? item.raw.ip
                            : 'No disponible';

                return [
                    formatReportDateTime(item.timestamp),
                    getAuditActor(item),
                    humanizeDashboardLabel(item.action),
                    resolveAuditCategoryLabel(resolveAuditCategoryValue(item)),
                    resolveAuditResultLabel(resolveAuditResultValue(item)),
                    sanitizeTechnicalValue(ipField, 'No disponible'),
                    getAuditDetailSummary(item, payload.options.includeTechnicalSummary)
                ];
            })
        });
    }

    for (const [title, key] of [
        ['Salud de API', 'apiHealth'],
        ['Resumen ejecutivo', 'executiveSummary']
    ] as const) {
        const block = data[key];
        if (!block) continue;
        addDataTable(context, {
            title,
            head: ['Indicador', 'Valor'],
            body: summarizeDashboardBlock(title, block)
        });
    }

    if (failedKeys.length > 0) {
        addNoticeBox(
            context,
            'Información complementaria incompleta',
            REPORT_SECTION_DESCRIPTIONS.dashboardUnavailable,
            'warning'
        );
    }

    saveReport(context, buildAdminReportFileName('Auditoría'));
}
