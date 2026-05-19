import type { ReportPsychologistRecord } from '../../../services/admin/adminReportData';
import { REPORT_SECTION_DESCRIPTIONS } from '../adminReportDescriptions';
import { drawBarChart, drawLineChart, type ReportChartPoint } from '../chartDrawing';
import { extractDashboardSeries } from '../dashboardSeries';
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
    formatReportDate,
    formatReportDateTime,
    formatReportNumber,
    formatUserStatus,
    formatVerificationStatus
} from '../reportFormatting';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';

function buildDistributionPoints(entries: Array<[string, number]>): ReportChartPoint[] {
    return entries
        .filter(([, value]) => Number.isFinite(value) && value >= 0)
        .map(([label, value]) => ({ label, value }));
}

function buildDashboardSeriesPoints(payload: unknown): ReportChartPoint[] {
    return extractDashboardSeries(payload)
        .filter((point) => point.periodLabel !== 'Periodo no válido')
        .map((point) => ({
            label: point.periodLabel,
            value: point.value
        }));
}

export type PsychologistsReportPayload = {
    items: ReportPsychologistRecord[];
    totalIncluded: number;
    totalAvailable: number;
    filters: string[];
    options: {
        includeDashboardSummary: boolean;
        quantityLabel: string;
    };
};

export async function downloadPsychologistsReportPdf(payload: PsychologistsReportPayload) {
    const context = createReportContext('Reporte CognIA - Psicólogos');
    const { data, failedKeys } = payload.options.includeDashboardSummary
        ? await loadDashboardBlocksForReport(['humanReview', 'userGrowth'], 12)
        : { data: {}, failedKeys: [] as string[] };

    const pendingCount = payload.items.filter((item) => item.reviewState === 'pending').length;
    const rejectedCount = payload.items.filter((item) => item.reviewState === 'rejected').length;
    const approvedCount = payload.items.filter((item) => item.reviewState === 'approved').length;
    const activeCount = payload.items.filter((item) => item.is_active).length;
    const inactiveCount = payload.items.length - activeCount;

    addReportCover(context, {
        title: 'Reporte CognIA - Psicólogos',
        subtitle: 'Seguimiento administrativo de perfiles profesionales y estado de verificación.',
        sectionLabel: 'Sección: Psicólogos',
        generatedAt: formatReportDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatReportDateTime(new Date()) },
            { label: 'Total incluido', value: formatReportNumber(payload.totalIncluded) },
            { label: 'Total disponible', value: formatReportNumber(payload.totalAvailable) },
            { label: 'Cantidad solicitada', value: payload.options.quantityLabel }
        ]
    });

    if (payload.filters.length > 0) {
        addNoticeBox(context, 'Filtros aplicados', payload.filters.join(' · '), 'info');
    }

    addSectionTitle(context, 'Resumen de verificación');
    addParagraph(context, REPORT_SECTION_DESCRIPTIONS.psychologistsSummary);
    addBulletList(context, [
        `Aprobados: ${formatReportNumber(approvedCount)}.`,
        `Pendientes: ${formatReportNumber(pendingCount)}.`,
        `Rechazados: ${formatReportNumber(rejectedCount)}.`,
        `Activos: ${formatReportNumber(activeCount)}.`,
        `Inactivos: ${formatReportNumber(inactiveCount)}.`
    ]);

    drawBarChart(context, {
        title: 'Gráfica de verificación profesional',
        description:
            'Esta gráfica compara la cantidad de perfiles aprobados, pendientes y rechazados. Permite identificar rápidamente el estado general del proceso de validación profesional.',
        points: buildDistributionPoints([
            ['Aprobados', approvedCount],
            ['Pendientes', pendingCount],
            ['Rechazados', rejectedCount]
        ])
    });

    drawBarChart(context, {
        title: 'Gráfica de estado de cuenta',
        description:
            'Esta gráfica muestra la proporción entre psicólogos con cuenta activa e inactiva. Es útil para contrastar disponibilidad administrativa frente al estado de verificación.',
        points: buildDistributionPoints([
            ['Activos', activeCount],
            ['Inactivos', inactiveCount]
        ])
    });

    addDataTable(context, {
        title: 'Distribución por verificación',
        description: REPORT_SECTION_DESCRIPTIONS.psychologistsVerificationDistribution,
        head: ['Estado', 'Cantidad'],
        body: [
            ['Aprobados', formatReportNumber(approvedCount)],
            ['Pendientes', formatReportNumber(pendingCount)],
            ['Rechazados', formatReportNumber(rejectedCount)],
            ['Activos', formatReportNumber(activeCount)],
            ['Inactivos', formatReportNumber(inactiveCount)]
        ]
    });

    addDataTable(context, {
        title: 'Psicólogos incluidos',
        description: REPORT_SECTION_DESCRIPTIONS.psychologistsDetailedList,
        head: ['Usuario', 'Correo', 'Nombre completo', 'Tarjeta profesional', 'Verificación', 'Estado', 'Motivo de rechazo', 'Creación'],
        body: payload.items.map((item) => [
            item.username,
            item.email,
            item.full_name?.trim() || 'Sin registrar',
            item.professional_card_number?.trim() || 'Sin registrar',
            formatVerificationStatus(item.reviewState),
            formatUserStatus(item.is_active),
            item.reviewReason?.trim() || 'No aplica',
            formatReportDate(item.created_at)
        ])
    });

    if (payload.options.includeDashboardSummary) {
        addParagraph(
            context,
            'Si un perfil está inactivo, la reactivación administrativa no reemplaza el proceso de aprobación profesional cuando todavía está pendiente.'
        );

        const growthPoints = data.userGrowth ? buildDashboardSeriesPoints(data.userGrowth) : [];
        if (growthPoints.length >= 3) {
            drawLineChart(context, {
                title: 'Crecimiento de usuarios profesionales',
                description:
                    'Esta gráfica muestra la evolución mensual de usuarios profesionales cuando la información agregada de dashboard está disponible. Cada punto representa nuevas cuentas registradas en el mes indicado.',
                points: growthPoints
            });
        }

        for (const [title, key] of [
            ['Revisión humana', 'humanReview'],
            ['Crecimiento de usuarios profesionales', 'userGrowth']
        ] as const) {
            const block = data[key];
            if (!block) continue;
            addDataTable(context, {
                title,
                description:
                    key === 'humanReview'
                        ? REPORT_SECTION_DESCRIPTIONS.psychologistsHumanReview
                        : REPORT_SECTION_DESCRIPTIONS.psychologistsGrowth,
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

    saveReport(context, buildAdminReportFileName('Psicólogos'));
}
