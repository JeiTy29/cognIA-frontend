import type { AuditLogItem } from '../../../services/admin/audit';
import { loadDashboardBlocksForReport, summarizeDashboardBlock } from './dashboardDataForReports';
import { addBulletList, addDataTable, addNoticeBox, addReportCover, addSectionTitle, createReportContext, saveReport } from '../pdfBase';
import { buildAdminReportFileName, buildAppliedFilters, formatReportDateTime, formatReportNumber, sanitizeTechnicalValue, shouldHideTechnicalField } from '../reportFormatting';

function sanitizeAuditSummary(item: AuditLogItem) {
    return item.summary
        .split('|')
        .map((segment) => segment.trim())
        .filter((segment) => {
            const [key] = segment.split(':');
            return key ? !shouldHideTechnicalField(key.trim()) : true;
        })
        .slice(0, 3)
        .map((segment) => sanitizeTechnicalValue(segment, ''))
        .filter(Boolean)
        .join(' · ') || 'Sin resumen adicional';
}

type AuditReportPayload = {
    items: AuditLogItem[];
    searchTerm: string;
    actionFilter: string;
    dateOrder: 'desc' | 'asc';
};

export async function downloadAuditReportPdf(payload: AuditReportPayload) {
    const context = createReportContext('Reporte CognIA - Auditoría');
    const { data, failedKeys } = await loadDashboardBlocksForReport(['apiHealth', 'executiveSummary'], 12);
    const actionCounts = payload.items.reduce<Record<string, number>>((acc, item) => {
        acc[item.action] = (acc[item.action] ?? 0) + 1;
        return acc;
    }, {});
    const topActions = Object.entries(actionCounts)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([action, count]) => `${action}: ${formatReportNumber(count)}.`);
    const filters = buildAppliedFilters([
        ['Búsqueda', payload.searchTerm],
        ['Acción', payload.actionFilter === 'Todos' ? '' : payload.actionFilter],
        ['Orden', payload.dateOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero']
    ]);

    addReportCover(context, {
        title: 'Reporte CognIA - Auditoría',
        subtitle: 'Consulta administrativa de eventos registrados con filtros visibles en la página.',
        sectionLabel: 'Sección: Auditoría',
        generatedAt: formatReportDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatReportDateTime(new Date()) },
            { label: 'Eventos visibles', value: formatReportNumber(payload.items.length) },
            { label: 'Orden', value: payload.dateOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero' }
        ]
    });

    if (filters.length > 0) addNoticeBox(context, 'Filtros aplicados', filters.join(' · '), 'info');

    addSectionTitle(context, 'Resumen de actividad');
    addBulletList(context, [
        `Total de eventos visibles: ${formatReportNumber(payload.items.length)}.`,
        ...topActions
    ]);

    addDataTable(context, {
        title: 'Tabla de auditoría',
        head: ['Fecha', 'Usuario o actor', 'Acción', 'Sección', 'Resultado', 'Dirección IP o resumen'],
        body: payload.items.map((item) => {
            const ipField = typeof item.raw.ip_address === 'string' ? item.raw.ip_address : typeof item.raw.ip === 'string' ? item.raw.ip : sanitizeAuditSummary(item);
            return [
                formatReportDateTime(item.timestamp),
                item.actor || 'No disponible',
                item.action,
                item.section || 'No disponible',
                sanitizeTechnicalValue(item.raw.status ?? item.raw.outcome ?? item.raw.result, 'No disponible'),
                sanitizeTechnicalValue(ipField, 'No disponible')
            ];
        })
    });

    for (const [title, key] of [
        ['Salud de API', 'apiHealth'],
        ['Resumen ejecutivo', 'executiveSummary']
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

    saveReport(context, buildAdminReportFileName('Auditoría'));
}

