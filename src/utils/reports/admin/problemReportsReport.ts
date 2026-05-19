import type { ProblemReportItem } from '../../../services/problemReports/problemReports.types';
import {
    getProblemReportIssueTypeLabel,
    getProblemReportReporterRoleLabel,
    getProblemReportStatusLabel
} from '../../../services/problemReports/problemReports.types';
import { REPORT_SECTION_DESCRIPTIONS } from '../adminReportDescriptions';
import { drawBarChart, drawHorizontalBarChart, drawLineChart, type ReportChartPoint } from '../chartDrawing';
import {
    addBulletList,
    addDataTable,
    addNoticeBox,
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

function buildDistributionPoints(record: Record<string, number>): ReportChartPoint[] {
    return Object.entries(record)
        .filter(([, value]) => Number.isFinite(value) && value >= 0)
        .sort((left, right) => right[1] - left[1])
        .map(([label, value]) => ({ label, value }));
}

function buildMonthlyPoints(items: ProblemReportItem[]): ReportChartPoint[] {
    const monthMap = new Map<string, number>();

    for (const item of items) {
        if (!item.created_at || /^\d+$/.test(item.created_at.trim())) continue;
        const date = new Date(item.created_at);
        if (Number.isNaN(date.getTime())) continue;
        const year = date.getFullYear();
        const currentYear = new Date().getFullYear();
        if (year < 2020 || year > currentYear + 1) continue;
        const key = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    }

    return Array.from(monthMap.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([key, value]) => {
            const [year, month] = key.split('-');
            const date = new Date(`${year}-${month}-01T00:00:00Z`);
            const label = new Intl.DateTimeFormat('es-CO', {
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC'
            }).format(date);
            return { label, value };
        });
}

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
        const label = getProblemReportStatusLabel(item.status);
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
    }, {});
    const moduleCounts = payload.items.reduce<Record<string, number>>((acc, item) => {
        const module = sanitizeTechnicalValue(item.source_module, 'No disponible');
        acc[module] = (acc[module] ?? 0) + 1;
        return acc;
    }, {});
    const monthlyPoints = buildMonthlyPoints(payload.items);

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
    addBulletList(
        context,
        Object.entries(statusCounts).map(([status, count]) => `${status}: ${formatReportNumber(count)}.`)
    );

    if (monthlyPoints.length >= 3) {
        drawLineChart(context, {
            title: 'Reportes por periodo',
            description:
                'Esta gráfica muestra la cantidad de reportes registrados por mes cuando las fechas disponibles permiten agruparlos de forma consistente. Ayuda a detectar aumentos o concentraciones de incidentes en el tiempo.',
            points: monthlyPoints
        });
    }

    drawBarChart(context, {
        title: 'Distribución de reportes por estado',
        description:
            'Esta gráfica compara la cantidad de reportes por estado administrativo. Permite identificar si predominan casos abiertos, en proceso, resueltos o rechazados.',
        points: buildDistributionPoints(statusCounts)
    });

    addDataTable(context, {
        title: 'Distribución por estado',
        description: REPORT_SECTION_DESCRIPTIONS.problemReportsByStatus,
        head: ['Estado', 'Cantidad'],
        body: Object.entries(statusCounts)
            .sort((left, right) => right[1] - left[1])
            .map(([status, count]) => [status, formatReportNumber(count)])
    });

    drawHorizontalBarChart(context, {
        title: 'Distribución de reportes por módulo',
        description:
            'Esta gráfica compara los módulos donde se originaron los reportes incluidos. Las barras más largas indican áreas funcionales con mayor concentración de incidencias.',
        points: buildDistributionPoints(moduleCounts)
    });

    addDataTable(context, {
        title: 'Distribución por módulo',
        description: REPORT_SECTION_DESCRIPTIONS.problemReportsByModule,
        head: ['Módulo', 'Cantidad'],
        body: Object.entries(moduleCounts)
            .sort((left, right) => right[1] - left[1])
            .map(([module, count]) => [module, formatReportNumber(count)])
    });

    addDataTable(context, {
        title: 'Reportes incluidos',
        description: REPORT_SECTION_DESCRIPTIONS.problemReportsDetailedList,
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
        for (const [title, key, description] of [
            ['Salud de API', 'apiHealth', REPORT_SECTION_DESCRIPTIONS.problemReportsApiHealth],
            ['Calidad de datos', 'dataQuality', REPORT_SECTION_DESCRIPTIONS.problemReportsDataQuality]
        ] as const) {
            const block = data[key];
            if (!block) continue;
            addDataTable(context, {
                title,
                description,
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
