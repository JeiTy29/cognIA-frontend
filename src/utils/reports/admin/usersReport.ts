import type { User } from '../../../services/admin/users';
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
    formatRoleLabel,
    formatUserStatus
} from '../reportFormatting';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';

function getUserRoleLabel(user: User) {
    const role = user.roles.find((entry) => entry.trim().length > 0) ?? user.user_type;
    return formatRoleLabel(role);
}

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

    drawBarChart(context, {
        title: 'Gráfica de distribución por rol',
        description:
            'Esta gráfica compara la cantidad de usuarios agrupados por rol dentro del conjunto incluido en el reporte. Ayuda a identificar de forma rápida qué perfiles predominan en la plataforma.',
        points: buildDistributionPoints(
            Object.entries(roleCounts).sort((left, right) => right[1] - left[1])
        )
    });

    addDataTable(context, {
        title: 'Distribución por rol',
        description: REPORT_SECTION_DESCRIPTIONS.usersRoleDistribution,
        head: ['Rol', 'Cantidad'],
        body: Object.entries(roleCounts)
            .sort((left, right) => right[1] - left[1])
            .map(([label, count]) => [label, formatReportNumber(count)])
    });

    drawBarChart(context, {
        title: 'Gráfica de distribución por estado',
        description:
            'Esta gráfica muestra la relación entre usuarios activos e inactivos en el conjunto descargado. Permite interpretar de manera visual qué proporción de cuentas permanece habilitada.',
        points: buildDistributionPoints([
            ['Activos', activeCount],
            ['Inactivos', inactiveCount]
        ])
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

    if (payload.options.includeGrowthSummary) {
        const userGrowthBlock = data.userGrowth;
        if (userGrowthBlock) {
            const growthPoints = buildDashboardSeriesPoints(userGrowthBlock);
            if (growthPoints.length >= 3) {
                drawLineChart(context, {
                    title: 'Crecimiento mensual de usuarios',
                    description:
                        'Esta gráfica muestra la cantidad de usuarios registrados por mes a partir de información complementaria de dashboard. Permite observar si la adopción aumenta, disminuye o se mantiene estable durante el periodo consultado.',
                    points: growthPoints
                });
            } else if (growthPoints.length >= 2) {
                drawBarChart(context, {
                    title: 'Comparativo mensual de usuarios',
                    description:
                        'Esta gráfica compara los periodos disponibles de crecimiento de usuarios cuando la serie histórica es corta. Cada barra representa nuevas cuentas registradas en el mes indicado.',
                    points: growthPoints
                });
            }
        }
    }

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
