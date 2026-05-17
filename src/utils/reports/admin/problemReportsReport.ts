import type { ProblemReportItem } from '../../../services/problemReports/problemReports.types';
import {
    getProblemReportIssueTypeLabel,
    getProblemReportReporterRoleLabel,
    getProblemReportStatusLabel
} from '../../../services/problemReports/problemReports.types';
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
    sanitizeTechnicalValue
} from '../reportFormatting';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';

export type ProblemReportsReportPayload = {
    items: ProblemReportItem[];
    totalIncluded: number;
    totalAvailable: number;
    filters: string[];
    options: {
        quantityLabel: string;
        orderLabel: string;
        includeDashboardSummary: boolean;
    };
};

export async function downloadProblemReportsReportPdf(payload: ProblemReportsReportPayload) {
    const context = createReportContext('Reporte CognIA - Reportes de problemas');
    const { data, failedKeys } = payload.options.includeDashboardSummary
        ? await loadDashboardBlocksForReport(['apiHealth', 'dataQuality'], 12)
        : { data: {}, failedKeys: [] as string[] };

    const statusCounts = payload.items.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
    }, {});

    addReportCover(context, {
        title: 'Reporte CognIA - Reportes de problemas',
        subtitle: 'Seguimiento administrativo de incidentes y observaciones registradas.',
        sectionLabel: 'Sección: Reportes de problemas',
        generatedAt: formatReportDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatReportDateTime(new Date()) },
            { label: 'Total incluido', value: formatReportNumber(payload.totalIncluded) },
            { label: 'Total disponible', value: formatReportNumber(payload.totalAvailable) },
            { label: 'Orden', value: payload.options.orderLabel }
        ]
    });

    if (payload.filters.length > 0) {
        addNoticeBox(context, 'Filtros aplicados', payload.filters.join(' · '), 'info');
    }

    addSectionTitle(context, 'Resumen de estado');
    addParagraph(context, REPORT_SECTION_DESCRIPTIONS.problemReportsStatus);
    addBulletList(
        context,
        Object.entries(statusCounts).map(([status, count]) => `${getProblemReportStatusLabel(status)}: ${formatReportNumber(count)}.`)
    );

    addSectionTitle(context, 'Tabla de reportes');
    addParagraph(context, REPORT_SECTION_DESCRIPTIONS.problemReportsTable);
    addDataTable(context, {
        title: 'Reportes incluidos',
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

    if (payload.options.includeDashboardSummary) {
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
    }

    if (failedKeys.length > 0) {
        addNoticeBox(
            context,
            'Información complementaria incompleta',
            REPORT_SECTION_DESCRIPTIONS.dashboardUnavailable,
            'warning'
        );
    }

    saveReport(context, buildAdminReportFileName('Reportes de problemas'));
}
