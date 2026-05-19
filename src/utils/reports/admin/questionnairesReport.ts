import type { AdminQuestionnaireItem } from '../../../services/admin/questionnaires';
import { REPORT_SECTION_DESCRIPTIONS } from '../adminReportDescriptions';
import { drawBarChart, drawHorizontalBarChart, drawLineChart, type ReportChartPoint } from '../chartDrawing';
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
    formatReportDateTime,
    formatReportNumber,
    formatUserStatus
} from '../reportFormatting';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';

function buildDashboardSeriesPoints(payload: unknown): ReportChartPoint[] {
    return extractDashboardSeries(payload)
        .filter((point) => point.periodLabel !== 'Periodo no válido')
        .map((point) => ({
            label: point.periodLabel,
            value: point.value
        }));
}

function buildFunnelPoints(payload: unknown): ReportChartPoint[] {
    if (!payload || typeof payload !== 'object') return [];
    const record = payload as Record<string, unknown>;
    const created = typeof record.created === 'number' ? record.created : Number(record.created ?? 0);
    const submitted = typeof record.submitted === 'number' ? record.submitted : Number(record.submitted ?? 0);
    const processed = typeof record.processed === 'number' ? record.processed : Number(record.processed ?? 0);

    return [
        { label: 'Creados', value: Number.isFinite(created) ? created : 0 },
        { label: 'Enviados', value: Number.isFinite(submitted) ? submitted : 0 },
        { label: 'Procesados', value: Number.isFinite(processed) ? processed : 0 }
    ];
}

export type QuestionnairesReportPayload = {
    items: AdminQuestionnaireItem[];
    totalIncluded: number;
    totalAvailable: number;
    filters: string[];
    options: {
        includeDashboardSummary: boolean;
        includeQuestionDetail: boolean;
        visibleOnly: boolean;
    };
};

export async function downloadQuestionnairesReportPdf(payload: QuestionnairesReportPayload) {
    const context = createReportContext('Reporte CognIA - Cuestionarios');
    const { data, failedKeys } = payload.options.includeDashboardSummary
        ? await loadDashboardBlocksForReport(
            ['questionnaireVolume', 'questionnaireQuality', 'funnel', 'adoptionHistory'],
            12
        )
        : { data: {}, failedKeys: [] as string[] };

    const activeCount = payload.items.filter((item) => item.is_active).length;
    const archivedCount = payload.items.filter((item) => item.is_archived).length;

    addReportCover(context, {
        title: 'Reporte CognIA - Cuestionarios',
        subtitle: 'Inventario administrativo de plantillas y contexto agregado de uso.',
        sectionLabel: 'Sección: Cuestionarios',
        generatedAt: formatReportDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatReportDateTime(new Date()) },
            { label: 'Total incluido', value: formatReportNumber(payload.totalIncluded) },
            { label: 'Total disponible', value: formatReportNumber(payload.totalAvailable) },
            { label: 'Origen de plantillas', value: payload.options.visibleOnly ? 'Solo visibles en la vista' : 'Todas las disponibles' }
        ]
    });

    if (payload.filters.length > 0) {
        addNoticeBox(context, 'Filtros aplicados', payload.filters.join(' · '), 'info');
    }

    addSectionTitle(context, 'Resumen de plantillas');
    addParagraph(context, REPORT_SECTION_DESCRIPTIONS.questionnairesSummary);
    addBulletList(context, [
        `Total de registros incluidos: ${formatReportNumber(payload.totalIncluded)}.`,
        `Plantillas activas: ${formatReportNumber(activeCount)}.`,
        `Plantillas archivadas: ${formatReportNumber(archivedCount)}.`
    ]);

    drawBarChart(context, {
        title: 'Gráfica de estado de plantillas',
        description:
            'Esta gráfica compara la cantidad de plantillas activas y archivadas dentro del reporte. Ayuda a visualizar el balance entre cuestionarios vigentes y registros fuera de circulación.',
        points: [
            { label: 'Activas', value: activeCount },
            { label: 'Archivadas', value: archivedCount }
        ]
    });

    addDataTable(context, {
        title: 'Plantillas incluidas',
        description: REPORT_SECTION_DESCRIPTIONS.questionnairesTemplatesTable,
        head: ['Nombre', 'Versión', 'Estado', 'Archivado', 'Última actualización'],
        body: payload.items.map((item) => [
            item.name,
            item.version,
            formatUserStatus(item.is_active),
            item.is_archived ? 'Sí' : 'No',
            item.updated_at ? formatReportDateTime(item.updated_at) : 'Sin fecha válida'
        ])
    });

    if (payload.options.includeQuestionDetail) {
        addNoticeBox(
            context,
            'Detalle de preguntas',
            'El detalle completo de preguntas por plantilla no está disponible con el contrato actual del listado administrativo.',
            'info'
        );
    }

    if (payload.options.includeDashboardSummary) {
        addParagraph(
            context,
            'Los endpoints agregados del dashboard se usan únicamente para complementar este PDF y no alteran la vista visible de administración.'
        );

        const volumePoints = data.questionnaireVolume ? buildDashboardSeriesPoints(data.questionnaireVolume) : [];
        if (volumePoints.length >= 3) {
            drawLineChart(context, {
                title: 'Volumen mensual de cuestionarios',
                description:
                    'Esta gráfica muestra la evolución del volumen mensual de cuestionarios a partir de datos agregados de dashboard. Cada punto corresponde a un mes calendario del periodo consultado.',
                points: volumePoints
            });
        } else if (volumePoints.length >= 2) {
            drawBarChart(context, {
                title: 'Comparativo de volumen de cuestionarios',
                description:
                    'Esta gráfica compara los periodos disponibles de volumen de cuestionarios cuando la serie histórica es corta. Permite observar diferencias rápidas entre meses consecutivos.',
                points: volumePoints
            });
        }

        const qualityPoints = data.questionnaireQuality ? buildDashboardSeriesPoints(data.questionnaireQuality) : [];
        if (qualityPoints.length >= 3) {
            drawLineChart(context, {
                title: 'Calidad de respuestas por periodo',
                description:
                    'Esta gráfica muestra la evolución de los indicadores de calidad de respuestas cuando el backend entrega una serie histórica válida. Los valores deben interpretarse como contexto complementario del reporte.',
                points: qualityPoints
            });
        } else if (qualityPoints.length >= 2) {
            drawBarChart(context, {
                title: 'Comparativo de calidad de respuestas',
                description:
                    'Esta gráfica compara los periodos disponibles de calidad de respuestas cuando la serie histórica es breve. Cada barra representa el valor agregado del periodo correspondiente.',
                points: qualityPoints
            });
        }

        const funnelPoints = data.funnel ? buildFunnelPoints(data.funnel) : [];
        if (funnelPoints.length > 0) {
            drawHorizontalBarChart(context, {
                title: 'Embudo de cuestionarios',
                description:
                    'Esta gráfica resume el flujo de cuestionarios creados, enviados y procesados. Ayuda a interpretar la conversión operativa entre cada etapa del proceso.',
                points: funnelPoints
            });
        }

        for (const [title, key, description] of [
            ['Volumen de cuestionarios', 'questionnaireVolume', REPORT_SECTION_DESCRIPTIONS.questionnairesVolumeSeries],
            ['Calidad de cuestionarios', 'questionnaireQuality', REPORT_SECTION_DESCRIPTIONS.questionnairesQualitySeries],
            ['Embudo de cuestionarios', 'funnel', REPORT_SECTION_DESCRIPTIONS.questionnairesFunnel],
            ['Adopción histórica', 'adoptionHistory', REPORT_SECTION_DESCRIPTIONS.questionnairesAdoptionHistory]
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

    saveReport(context, buildAdminReportFileName('Cuestionarios'));
}
