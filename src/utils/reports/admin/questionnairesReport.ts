import type { AdminQuestionnaireItem } from '../../../services/admin/questionnaires';
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
    formatUserStatus
} from '../reportFormatting';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';

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
