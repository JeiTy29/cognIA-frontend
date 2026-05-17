import type { PsychologistAdminItem } from '../../../hooks/usePsychologists';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';
import { addBulletList, addDataTable, addNoticeBox, addParagraph, addReportCover, addSectionTitle, createReportContext, saveReport } from '../pdfBase';
import { buildAdminReportFileName, formatReportDate, formatReportDateTime, formatReportNumber, formatUserStatus, formatVerificationStatus } from '../reportFormatting';

type ReportPsychologistItem = Omit<PsychologistAdminItem, 'reviewState'> & {
    reviewState: 'pending' | 'rejected' | 'approved';
};

type PsychologistsReportPayload = {
    items: ReportPsychologistItem[];
    summaryItems?: ReportPsychologistItem[];
    searchTerm: string;
    reviewFilter: string;
    currentPage: number;
    pageSize: number;
    total: number;
};

export async function downloadPsychologistsReportPdf(payload: PsychologistsReportPayload) {
    const context = createReportContext('Reporte CognIA - Psicólogos');
    const { data, failedKeys } = await loadDashboardBlocksForReport(['humanReview', 'userGrowth'], 12);
    const summaryItems = payload.summaryItems ?? payload.items;

    const pendingCount = summaryItems.filter((item) => item.reviewState === 'pending').length;
    const rejectedCount = summaryItems.filter((item) => item.reviewState === 'rejected').length;
    const approvedCount = summaryItems.filter((item) => item.reviewState === 'approved').length;
    const activeCount = summaryItems.filter((item) => item.is_active).length;
    const inactiveCount = summaryItems.length - activeCount;

    addReportCover(context, {
        title: 'Reporte CognIA - Psicólogos',
        subtitle: 'Seguimiento administrativo de perfiles profesionales y estado de verificación.',
        sectionLabel: 'Sección: Psicólogos',
        generatedAt: formatReportDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatReportDateTime(new Date()) },
            { label: 'Total visible', value: formatReportNumber(payload.total) },
            { label: 'Página', value: String(payload.currentPage) },
            { label: 'Filtro de revisión', value: payload.reviewFilter }
        ]
    });

    if (payload.searchTerm.trim()) {
        addNoticeBox(context, 'Filtro aplicado', `Búsqueda: ${payload.searchTerm.trim()}`, 'info');
    }

    addSectionTitle(context, 'Resumen de revisión');
    addBulletList(context, [
        `Aprobados: ${formatReportNumber(approvedCount)}.`,
        `Pendientes: ${formatReportNumber(pendingCount)}.`,
        `Rechazados: ${formatReportNumber(rejectedCount)}.`,
        `Activos: ${formatReportNumber(activeCount)}.`,
        `Inactivos: ${formatReportNumber(inactiveCount)}.`
    ]);

    addDataTable(context, {
        title: 'Tabla de psicólogos',
        note: payload.total > payload.items.length ? 'La tabla corresponde a los registros visibles en la página actual.' : undefined,
        head: ['Usuario', 'Correo', 'Nombre completo', 'Tarjeta profesional', 'Verificación', 'Estado', 'Creación'],
        body: payload.items.map((item) => [
            item.username,
            item.email,
            item.full_name?.trim() || 'Sin registrar',
            item.professional_card_number?.trim() || 'Sin registrar',
            formatVerificationStatus(item.reviewState),
            formatUserStatus(item.is_active),
            formatReportDate(item.created_at)
        ])
    });

    addParagraph(context, 'Si un perfil está inactivo, la reactivación administrativa no reemplaza el proceso de aprobación profesional cuando todavía esté pendiente.');

    for (const [title, key] of [
        ['Revisión humana', 'humanReview'],
        ['Crecimiento de usuarios profesionales', 'userGrowth']
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

    saveReport(context, buildAdminReportFileName('Psicólogos'));
}
