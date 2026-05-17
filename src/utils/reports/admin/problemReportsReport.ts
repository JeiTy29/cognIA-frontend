import type { ProblemReportItem } from '../../../services/problemReports/problemReports.types';
import { getProblemReportIssueTypeLabel, getProblemReportReporterRoleLabel, getProblemReportStatusLabel } from '../../../services/problemReports/problemReports.types';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';
import { addBulletList, addDataTable, addNoticeBox, addReportCover, addSectionTitle, createReportContext, saveReport } from '../pdfBase';
import { buildAdminReportFileName, buildAppliedFilters, formatReportDateTime, formatReportNumber, sanitizeTechnicalValue } from '../reportFormatting';

type ProblemReportsReportPayload = {
    items: ProblemReportItem[];
    total: number;
    page: number;
    pageSize: number;
    filters: {
        query: string;
        status: string;
        issueType: string;
        reporterRole: string;
        fromDate: string;
        toDate: string;
    };
};

export async function downloadProblemReportsReportPdf(payload: ProblemReportsReportPayload) {
    const context = createReportContext('Reporte CognIA - Reportes de problemas');
    const { data, failedKeys } = await loadDashboardBlocksForReport(['apiHealth', 'dataQuality'], 12);
    const statusCounts = payload.items.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
    }, {});
    const filters = buildAppliedFilters([
        ['Búsqueda', payload.filters.query],
        ['Estado', payload.filters.status],
        ['Tipo', payload.filters.issueType],
        ['Reportante', payload.filters.reporterRole],
        ['Desde', payload.filters.fromDate],
        ['Hasta', payload.filters.toDate]
    ]);

    addReportCover(context, {
        title: 'Reporte CognIA - Reportes de problemas',
        subtitle: 'Seguimiento administrativo de incidentes y observaciones registradas.',
        sectionLabel: 'Sección: Reportes de problemas',
        generatedAt: formatReportDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatReportDateTime(new Date()) },
            { label: 'Total filtrado', value: formatReportNumber(payload.total) },
            { label: 'Página visible', value: String(payload.page) },
            { label: 'Tamaño de página', value: String(payload.pageSize) }
        ]
    });

    if (filters.length > 0) addNoticeBox(context, 'Filtros aplicados', filters.join(' · '), 'info');

    addSectionTitle(context, 'Resumen de estado');
    addBulletList(
        context,
        Object.entries(statusCounts).map(([status, count]) => `${getProblemReportStatusLabel(status)}: ${formatReportNumber(count)}.`)
    );

    addDataTable(context, {
        title: 'Tabla de reportes',
        note: payload.total > payload.items.length ? 'La tabla corresponde a los registros visibles en la página actual.' : undefined,
        head: ['Fecha', 'Usuario', 'Módulo', 'Descripción resumida', 'Estado', 'Prioridad o tipo'],
        body: payload.items.map((item) => [
            formatReportDateTime(item.created_at),
            getProblemReportReporterRoleLabel(item.reporter_role),
            sanitizeTechnicalValue(item.source_module, 'No disponible'),
            item.description.length > 110 ? `${item.description.slice(0, 107)}...` : item.description,
            getProblemReportStatusLabel(item.status),
            getProblemReportIssueTypeLabel(item.issue_type)
        ])
    });

    for (const [title, key] of [
        ['Salud de API', 'apiHealth'],
        ['Calidad de datos', 'dataQuality']
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
        addNoticeBox(context, 'Información complementaria incompleta', 'No fue posible cargar información complementaria de dashboard para esta sección.', 'warning');
    }

    saveReport(context, buildAdminReportFileName('Reportes de problemas'));
}

