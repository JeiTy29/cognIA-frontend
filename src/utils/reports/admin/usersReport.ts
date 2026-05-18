import type { User } from '../../../services/admin/users';
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
    formatRoleLabel,
    formatUserStatus
} from '../reportFormatting';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';

function getUserRoleLabel(user: User) {
    const role = user.roles.find((entry) => entry.trim().length > 0) ?? user.user_type;
    return formatRoleLabel(role);
}

export type UsersReportPayload = {
    items: User[];
    totalIncluded: number;
    totalAvailable: number;
    truncated?: boolean;
    filters: string[];
    options: {
        includeGrowthSummary: boolean;
        includeDetailedTable: boolean;
        limitLabel: string;
        orderLabel: string;
    };
};

export async function downloadUsersReportPdf(payload: UsersReportPayload) {
    if (!payload.items) {
        throw new Error('No fue posible cargar los datos principales de usuarios.');
    }

    const context = createReportContext('Reporte CognIA - Usuarios');
    const { data, failedKeys } = payload.options.includeGrowthSummary
        ? await loadDashboardBlocksForReport(['userGrowth', 'adoptionHistory', 'retention'], 12)
        : { data: {}, failedKeys: [] as string[] };

    const activeCount = payload.items.filter((item) => item.is_active).length;
    const inactiveCount = payload.items.length - activeCount;
    const roleCounts = payload.items.reduce<Record<string, number>>((acc, item) => {
        const label = getUserRoleLabel(item);
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
    }, {});

    addReportCover(context, {
        title: 'Reporte CognIA - Usuarios',
        subtitle:
            'Relación administrativa de usuarios con filtros aplicados y contexto agregado de crecimiento cuando está disponible.',
        sectionLabel: 'Sección: Usuarios',
        generatedAt: formatReportDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatReportDateTime(new Date()) },
            { label: 'Total incluido', value: formatReportNumber(payload.totalIncluded) },
            { label: 'Total disponible', value: formatReportNumber(payload.totalAvailable) },
            { label: 'Cantidad solicitada', value: payload.options.limitLabel },
            { label: 'Orden', value: payload.options.orderLabel }
        ]
    });

    addParagraph(
        context,
        'Este documento consolida usuarios según la configuración elegida al momento de descargar el reporte, sin alterar la tabla visible en pantalla.'
    );

    if (payload.filters.length > 0) {
        addNoticeBox(context, 'Filtros aplicados', payload.filters.join(' · '), 'info');
    }

    if (payload.truncated) {
        addNoticeBox(
            context,
            'Alcance acotado',
            'El reporte alcanzó el límite de seguridad de registros descargables y podría no incluir la totalidad del universo disponible.',
            'warning'
        );
    }

    addSectionTitle(context, 'Resumen de usuarios');
    addParagraph(context, REPORT_SECTION_DESCRIPTIONS.usersSummary);
    addBulletList(context, [
        `Total de registros incluidos en el PDF: ${formatReportNumber(payload.totalIncluded)}.`,
        `Usuarios activos: ${formatReportNumber(activeCount)}.`,
        `Usuarios inactivos: ${formatReportNumber(inactiveCount)}.`
    ]);

    addDataTable(context, {
        title: 'Distribución por rol',
        description: REPORT_SECTION_DESCRIPTIONS.usersRoleDistribution,
        head: ['Rol', 'Cantidad'],
        body: Object.entries(roleCounts)
            .sort((left, right) => right[1] - left[1])
            .map(([label, count]) => [label, formatReportNumber(count)])
    });

    addDataTable(context, {
        title: 'Distribución por estado',
        description: REPORT_SECTION_DESCRIPTIONS.usersStatusDistribution,
        head: ['Estado', 'Cantidad'],
        body: [
            ['Activos', formatReportNumber(activeCount)],
            ['Inactivos', formatReportNumber(inactiveCount)]
        ]
    });

    if (payload.options.includeDetailedTable) {
        addDataTable(context, {
            title: 'Usuarios incluidos',
            description: REPORT_SECTION_DESCRIPTIONS.usersDetailedList,
            head: ['Usuario', 'Correo', 'Rol', 'Estado', 'Fecha de creación'],
            body: payload.items.map((item) => [
                item.username,
                item.email,
                getUserRoleLabel(item),
                formatUserStatus(item.is_active),
                formatReportDate(item.created_at)
            ])
        });
    }

    if (payload.options.includeGrowthSummary) {
        addSectionTitle(context, 'Contexto agregado');
        addParagraph(context, 'Los siguientes bloques provienen de endpoints agregados de dashboard y solo enriquecen el contenido del PDF.');

        for (const [title, key] of [
            ['Crecimiento de usuarios', 'userGrowth'],
            ['Adopción histórica', 'adoptionHistory'],
            ['Retención', 'retention']
        ] as const) {
            const block = data[key];
            if (!block) continue;
            addDataTable(context, {
                title,
                description:
                    key === 'userGrowth'
                        ? REPORT_SECTION_DESCRIPTIONS.usersGrowthSeries
                        : key === 'adoptionHistory'
                            ? REPORT_SECTION_DESCRIPTIONS.usersAdoptionHistory
                            : REPORT_SECTION_DESCRIPTIONS.usersRetention,
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

    saveReport(context, buildAdminReportFileName('Usuarios'));
}
