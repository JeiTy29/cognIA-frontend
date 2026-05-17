import type { User } from '../../../services/admin/users';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';
import { addBulletList, addDataTable, addNoticeBox, addParagraph, addReportCover, addSectionTitle, createReportContext, saveReport } from '../pdfBase';
import { buildAdminReportFileName, buildAppliedFilters, formatReportDate, formatReportDateTime, formatReportNumber, formatRoleLabel, formatUserStatus } from '../reportFormatting';

function getUserRoleLabel(user: User) {
    const role = user.roles.find((entry) => entry.trim().length > 0) ?? user.user_type;
    return formatRoleLabel(role);
}

type UsersReportPayload = {
    items: User[];
    total: number;
    page: number;
    pageSize: number;
    filters: {
        q: string;
        role: string;
        is_active: string;
    };
};

export async function downloadUsersReportPdf(payload: UsersReportPayload) {
    if (!payload.items) {
        throw new Error('No fue posible cargar los datos principales de usuarios.');
    }

    const context = createReportContext('Reporte CognIA - Usuarios');
    const { data, failedKeys } = await loadDashboardBlocksForReport(['userGrowth', 'adoptionHistory', 'retention'], 12);
    const activeCount = payload.items.filter((item) => item.is_active).length;
    const inactiveCount = payload.items.length - activeCount;
    const roleCounts = payload.items.reduce<Record<string, number>>((acc, item) => {
        const label = getUserRoleLabel(item);
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
    }, {});
    const filters = buildAppliedFilters([
        ['Búsqueda', payload.filters.q],
        ['Rol', payload.filters.role === 'all' ? '' : formatRoleLabel(payload.filters.role)],
        ['Estado', payload.filters.is_active === 'all' ? '' : payload.filters.is_active === 'active' ? 'Activos' : 'Inactivos']
    ]);

    addReportCover(context, {
        title: 'Reporte CognIA - Usuarios',
        subtitle: 'Relación administrativa de usuarios con filtros aplicados y contexto agregado de crecimiento.',
        sectionLabel: 'Sección: Usuarios',
        generatedAt: formatReportDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatReportDateTime(new Date()) },
            { label: 'Total filtrado', value: formatReportNumber(payload.total) },
            { label: 'Página visible', value: `${payload.page}` },
            { label: 'Tamaño de página', value: `${payload.pageSize}` }
        ]
    });

    if (filters.length > 0) {
        addNoticeBox(context, 'Filtros aplicados', filters.join(' · '), 'info');
    }

    addSectionTitle(context, 'Resumen de usuarios');
    addBulletList(context, [
        `Total de registros visibles en la consulta: ${formatReportNumber(payload.total)}.`,
        `Usuarios activos en la página actual: ${formatReportNumber(activeCount)}.`,
        `Usuarios inactivos en la página actual: ${formatReportNumber(inactiveCount)}.`,
        ...Object.entries(roleCounts).map(([label, count]) => `${label}: ${formatReportNumber(count)}.`)
    ]);

    addDataTable(context, {
        title: 'Tabla de usuarios',
        note: payload.total > payload.items.length ? 'La tabla corresponde a los registros visibles en la página actual.' : undefined,
        head: ['Usuario', 'Correo', 'Rol', 'Estado', 'Fecha de creación'],
        body: payload.items.map((item) => [
            item.username,
            item.email,
            getUserRoleLabel(item),
            formatUserStatus(item.is_active),
            formatReportDate(item.created_at)
        ])
    });

    addSectionTitle(context, 'Contexto agregado');
    addParagraph(context, 'Los siguientes indicadores provienen de endpoints agregados del dashboard y solo se usan como complemento del PDF.');

    for (const [title, key] of [
        ['Crecimiento de usuarios', 'userGrowth'],
        ['Adopción histórica', 'adoptionHistory'],
        ['Retención', 'retention']
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

    saveReport(context, buildAdminReportFileName('Usuarios'));
}

