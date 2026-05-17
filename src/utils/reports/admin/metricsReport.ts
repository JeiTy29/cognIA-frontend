import type { DbState, ServerState, StatusCounts } from '../../../hooks/metrics/useMetrics';
import type { EmailHealthBlockState } from '../../../services/admin/emailHealth';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';
import { createReportContext, addReportCover, addSectionTitle, addParagraph, addBulletList, addDataTable, addNoticeBox, saveReport } from '../pdfBase';
import { buildAdminReportFileName, formatReportDateTime, formatReportNumber } from '../reportFormatting';

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

type MetricsReportPayload = {
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
};

export async function downloadMetricsReportPdf(payload: MetricsReportPayload) {
    if (!payload.snapshot) {
        throw new Error('No fue posible cargar los datos principales de métricas.');
    }

    const context = createReportContext('Reporte CognIA - Métricas');
    const { data, failedKeys } = await loadDashboardBlocksForReport(
        ['apiHealth', 'dataQuality', 'modelMonitoring', 'drift', 'equity'],
        12
    );

    addReportCover(context, {
        title: 'Reporte CognIA - Métricas',
        subtitle: 'Resumen operativo de la plataforma y señales complementarias del dashboard.',
        sectionLabel: 'Sección: Métricas',
        generatedAt: formatReportDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatReportDateTime(new Date()) },
            { label: 'Última actualización', value: formatReportDateTime(payload.lastUpdated) },
            { label: 'Servicio de correo', value: payload.emailState.label },
            { label: 'Estado del servidor', value: payload.serverState.message }
        ]
    });

    addSectionTitle(context, 'Resumen ejecutivo');
    addBulletList(context, [
        `Servidor: ${payload.serverState.message}. ${payload.serverState.detail}`,
        `Base de datos: ${payload.dbState.status === 'ready' ? 'Lista' : payload.dbState.status === 'not_ready' ? 'En espera' : payload.dbState.status === 'loading' ? 'Cargando' : 'Con error'}.`,
        `Servicio de correo: ${payload.emailState.label}. ${payload.emailState.detail}`,
        `Solicitudes acumuladas: ${formatReportNumber(payload.snapshot.requests_total)}.`,
        `Latencia promedio: ${formatReportNumber(payload.snapshot.latency_ms_avg)} ms.`,
        `Latencia máxima: ${formatReportNumber(payload.snapshot.latency_ms_max)} ms.`
    ]);

    const grouped = groupStatusCounts(payload.snapshot.status_counts);
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

    addSectionTitle(context, 'Señales complementarias de dashboard');
    addParagraph(context, 'Estas lecturas se usan únicamente para enriquecer el PDF y no se muestran como dashboard visible dentro del administrador.');

    for (const [title, key] of [
        ['Salud de API', 'apiHealth'],
        ['Calidad de datos', 'dataQuality'],
        ['Monitoreo de modelos', 'modelMonitoring'],
        ['Drift', 'drift'],
        ['Equidad', 'equity']
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
            'No fue posible cargar información complementaria de dashboard para esta sección.',
            'warning'
        );
    }

    saveReport(context, buildAdminReportFileName('Métricas'));
}
