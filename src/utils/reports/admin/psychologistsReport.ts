import type { ReportPsychologistRecord } from '../../../services/admin/adminReportData';
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
    formatReportDate,
    formatReportDateTime,
    formatReportNumber,
    formatUserStatus,
    formatVerificationStatus
} from '../reportFormatting';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';

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
    addParagraph(context, REPORT_SECTION_DESCRIPTIONS.psychologistsVerification);
    addBulletList(context, [
        `Aprobados: ${formatReportNumber(approvedCount)}.`,
        `Pendientes: ${formatReportNumber(pendingCount)}.`,
        `Rechazados: ${formatReportNumber(rejectedCount)}.`,
        `Activos: ${formatReportNumber(activeCount)}.`,
        `Inactivos: ${formatReportNumber(inactiveCount)}.`
    ]);

    addSectionTitle(context, 'Tabla de psicólogos');
    addParagraph(context, REPORT_SECTION_DESCRIPTIONS.psychologistsTable);
    addDataTable(context, {
        title: 'Psicólogos incluidos',
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
