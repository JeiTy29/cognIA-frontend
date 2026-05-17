import type { AdminQuestionnaireItem } from '../../../services/admin/questionnaires';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';
import { addBulletList, addDataTable, addNoticeBox, addParagraph, addReportCover, addSectionTitle, createReportContext, saveReport } from '../pdfBase';
import { buildAdminReportFileName, buildAppliedFilters, formatReportDateTime, formatReportNumber, formatUserStatus } from '../reportFormatting';

type QuestionnairesReportPayload = {
    items: AdminQuestionnaireItem[];
    total: number;
    page: number;
    pageSize: number;
    filters: {
        nameFilter: string;
        versionFilter: string;
        activeFilter: string;
        archivedFilter: string;
        sort: string;
        order: string;
    };
};

export async function downloadQuestionnairesReportPdf(payload: QuestionnairesReportPayload) {
    const context = createReportContext('Reporte CognIA - Cuestionarios');
    const { data, failedKeys } = await loadDashboardBlocksForReport(
        ['questionnaireVolume', 'questionnaireQuality', 'funnel', 'adoptionHistory'],
        12
    );

    const activeCount = payload.items.filter((item) => item.is_active).length;
    const archivedCount = payload.items.filter((item) => item.is_archived).length;
    const filters = buildAppliedFilters([
        ['Nombre', payload.filters.nameFilter],
        ['Versión', payload.filters.versionFilter],
        ['Estado', payload.filters.activeFilter === 'all' ? '' : payload.filters.activeFilter === 'true' ? 'Activos' : 'Inactivos'],
        ['Archivado', payload.filters.archivedFilter === 'all' ? '' : payload.filters.archivedFilter === 'true' ? 'Archivados' : 'No archivados'],
        ['Orden', `${payload.filters.sort} ${payload.filters.order}`]
    ]);

    addReportCover(context, {
        title: 'Reporte CognIA - Cuestionarios',
        subtitle: 'Inventario administrativo de plantillas y contexto agregado de uso.',
        sectionLabel: 'Sección: Cuestionarios',
        generatedAt: formatReportDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatReportDateTime(new Date()) },
            { label: 'Total visible', value: formatReportNumber(payload.total) },
            { label: 'Plantillas activas en página', value: formatReportNumber(activeCount) },
            { label: 'Plantillas archivadas en página', value: formatReportNumber(archivedCount) }
        ]
    });

    if (filters.length > 0) {
        addNoticeBox(context, 'Filtros aplicados', filters.join(' · '), 'info');
    }

    addSectionTitle(context, 'Resumen de plantillas');
    addBulletList(context, [
        `Total de registros visibles: ${formatReportNumber(payload.total)}.`,
        `Activas en la página actual: ${formatReportNumber(activeCount)}.`,
        `Archivadas en la página actual: ${formatReportNumber(archivedCount)}.`
    ]);

    addDataTable(context, {
        title: 'Tabla de cuestionarios',
        note: payload.total > payload.items.length ? 'La tabla corresponde a los registros visibles en la página actual.' : undefined,
        head: ['Nombre', 'Versión', 'Estado', 'Archivado', 'Última actualización'],
        body: payload.items.map((item) => [
            item.name,
            item.version,
            formatUserStatus(item.is_active),
            item.is_archived ? 'Sí' : 'No',
            item.updated_at ? formatReportDateTime(item.updated_at) : 'Sin fecha válida'
        ])
    });

    addParagraph(context, 'Los endpoints agregados del dashboard se usan únicamente para complementar este PDF y no alteran la vista visible de administración.');

    for (const [title, key] of [
        ['Volumen de cuestionarios', 'questionnaireVolume'],
        ['Calidad de cuestionarios', 'questionnaireQuality'],
        ['Embudo de cuestionarios', 'funnel'],
        ['Adopción histórica', 'adoptionHistory']
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

    saveReport(context, buildAdminReportFileName('Cuestionarios'));
}

