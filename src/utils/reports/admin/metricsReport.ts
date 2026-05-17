import type { DbState, ServerState, StatusCounts } from '../../../hooks/metrics/useMetrics';
import type { EmailHealthBlockState } from '../../../services/admin/emailHealth';
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
import { buildAdminReportFileName, formatReportDateTime, formatReportNumber } from '../reportFormatting';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';

function groupStatusCounts(counts: Record<string, number>) {
    const grouped = { success: 0, redirect: 0, clientError: 0, serverError: 0, other: 0 };
    for (const [key, value] of Object.entries(counts)) {
        const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
        if (numericValue <= 0) continue;
        const code = Number.parseInt(key, 10);
        if (!Number.isFinite(code)) {
            grouped.other += numericValue;
        } else if (code >= 200 && code < 300) {
            grouped.success += numericValue;
        } else if (code >= 300 && code < 400) {
            grouped.redirect += numericValue;
        } else if (code >= 400 && code < 500) {
            grouped.clientError += numericValue;
        } else if (code >= 500 && code < 600) {
            grouped.serverError += numericValue;
        } else {
            grouped.other += numericValue;
        }
    }
    return grouped;
}

export type MetricsReportPayload = {
    serverState: ServerState;
    dbState: DbState;
    emailState: EmailHealthBlockState;
    snapshot: {
        uptime_seconds: number;
        requests_total: number;
        latency_ms_avg: number;
        latency_ms_max: number;
        status_counts: StatusCounts;
    } | null;
    lastUpdated: Date | null;
    options: {
        months: number;
        includeEmailHealth: boolean;
        includeHttpDistribution: boolean;
        includeModelMonitoring: boolean;
        includeDataQuality: boolean;
    };
};

export async function downloadMetricsReportPdf(payload: MetricsReportPayload) {
    if (!payload.snapshot) {
        throw new Error('No fue posible cargar los datos principales de métricas.');
    }

    const dashboardKeys: Array<'apiHealth' | 'dataQuality' | 'modelMonitoring' | 'drift' | 'equity'> = ['apiHealth'];
    if (payload.options.includeDataQuality) dashboardKeys.push('dataQuality');
    if (payload.options.includeModelMonitoring) {
        dashboardKeys.push('modelMonitoring', 'drift', 'equity');
    }

    const context = createReportContext('Reporte CognIA - Métricas');
    const { data, failedKeys } = await loadDashboardBlocksForReport(dashboardKeys, payload.options.months);

    addReportCover(context, {
        title: 'Reporte CognIA - Métricas',
        subtitle: 'Resumen operativo de la plataforma y señales complementarias de dashboard para el periodo seleccionado.',
        sectionLabel: 'Sección: Métricas',
        generatedAt: formatReportDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatReportDateTime(new Date()) },
            { label: 'Última actualización', value: formatReportDateTime(payload.lastUpdated) },
            { label: 'Servicio de correo', value: payload.emailState.label },
            { label: 'Periodo dashboard', value: `${payload.options.months} meses` }
        ]
    });

    addSectionTitle(context, 'Resumen ejecutivo');
    addParagraph(context, REPORT_SECTION_DESCRIPTIONS.metricsSummary);
    addBulletList(context, [
        `Servidor: ${payload.serverState.message}. ${payload.serverState.detail}`,
        `Base de datos: ${payload.dbState.status === 'ready' ? 'Lista' : payload.dbState.status === 'not_ready' ? 'En espera' : payload.dbState.status === 'loading' ? 'Cargando' : 'Con error'}.`,
        ...(payload.options.includeEmailHealth ? [`Servicio de correo: ${payload.emailState.label}. ${payload.emailState.detail}`] : []),
        `Solicitudes acumuladas: ${formatReportNumber(payload.snapshot.requests_total)}.`,
        `Latencia promedio: ${formatReportNumber(payload.snapshot.latency_ms_avg)} ms.`,
        `Latencia máxima: ${formatReportNumber(payload.snapshot.latency_ms_max)} ms.`
    ]);

    if (payload.options.includeHttpDistribution) {
        const grouped = groupStatusCounts(payload.snapshot.status_counts);
        addSectionTitle(context, 'Distribución HTTP');
        addParagraph(context, REPORT_SECTION_DESCRIPTIONS.metricsHttpDistribution);
        addDataTable(context, {
            title: 'Distribución de requests por familia HTTP',
            head: ['Familia', 'Total'],
            body: [
                ['2xx exitosas', formatReportNumber(grouped.success)],
                ['3xx redirecciones', formatReportNumber(grouped.redirect)],
                ['4xx cliente/autorización', formatReportNumber(grouped.clientError)],
                ['5xx servidor', formatReportNumber(grouped.serverError)],
                ['Otros', formatReportNumber(grouped.other)]
            ]
        });
    }

    addSectionTitle(context, 'Señales complementarias de dashboard');
    addParagraph(context, REPORT_SECTION_DESCRIPTIONS.metricsDashboard);

    for (const [title, key] of [
        ['Salud de API', 'apiHealth'],
        ['Calidad de datos', 'dataQuality'],
        ['Monitoreo de modelos', 'modelMonitoring'],
        ['Drift', 'drift'],
        ['Equidad', 'equity']
    ] as const) {
        if ((key === 'dataQuality' && !payload.options.includeDataQuality) ||
            ((key === 'modelMonitoring' || key === 'drift' || key === 'equity') && !payload.options.includeModelMonitoring)) {
            continue;
        }

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

    saveReport(context, buildAdminReportFileName('Métricas'));
}
